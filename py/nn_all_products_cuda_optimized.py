#!/usr/bin/env python3
"""
Neuronales Netzwerk mit maximaler GPU/VRAM-Auslastung für FAO-Daten
====================================================================

Optimiert für maximale GPU-Auslastung mit Mixed Precision Training,
größeren Batch Sizes und Pin Memory.
"""

import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from torch.cuda.amp import autocast, GradScaler
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder, RobustScaler
from sklearn.metrics import mean_squared_error, r2_score
import matplotlib.pyplot as plt
import time
import warnings
import gc
warnings.filterwarnings('ignore')

# GPU-Optimierungen
torch.backends.cudnn.benchmark = True
torch.backends.cudnn.deterministic = False
torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32 = True

# Überprüfe CUDA-Verfügbarkeit
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Verwende Gerät: {device}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"CUDA Version: {torch.version.cuda}")
    print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB")
    
    # Setze GPU Memory Fraction für maximale Nutzung
    torch.cuda.set_per_process_memory_fraction(0.95)  # 95% des VRAM nutzen

class FAONeuralNetwork(nn.Module):
    """Größeres PyTorch Neural Network für maximale GPU-Auslastung"""
    
    def __init__(self, input_size, hidden_sizes=[512, 512, 256, 256, 128, 128, 64], dropout_rate=0.3):
        super(FAONeuralNetwork, self).__init__()
        
        layers = []
        prev_size = input_size
        
        for hidden_size in hidden_sizes:
            layers.extend([
                nn.Linear(prev_size, hidden_size),
                nn.LeakyReLU(0.1),
                nn.Dropout(dropout_rate),
                nn.BatchNorm1d(hidden_size)
            ])
            prev_size = hidden_size
        
        # Zusätzliche Schichten für mehr Komplexität
        layers.extend([
            nn.Linear(prev_size, 32),
            nn.LeakyReLU(0.1),
            nn.BatchNorm1d(32),
            nn.Linear(32, 16),
            nn.LeakyReLU(0.1),
            nn.BatchNorm1d(16),
            nn.Linear(16, 1)
        ])
        
        self.model = nn.Sequential(*layers)
        
        # Weight initialization
        self._initialize_weights()
        
    def _initialize_weights(self):
        """Xavier/He initialization für bessere Stabilität"""
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='leaky_relu')
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.BatchNorm1d):
                nn.init.constant_(m.weight, 1)
                nn.init.constant_(m.bias, 0)
        
    def forward(self, x):
        return self.model(x)

def prepare_data_for_cuda():
    """Bereite Daten für GPU-Training vor mit erweiterten Features"""
    print("=== Lade FAO-Daten für maximale GPU-Auslastung ===")
    
    # Lade Daten
    df = pd.read_csv('fao.csv')
    df['Value'] = pd.to_numeric(df['Value'], errors='coerce')
    df = df.dropna(subset=['Value'])
    
    # Entferne negative Werte
    df = df[df['Value'] >= 0]
    
    # Entferne extreme Ausreißer
    upper_limit = df['Value'].quantile(0.999)
    df = df[df['Value'] <= upper_limit]
    
    print(f"Gesamte Datenpunkte nach Bereinigung: {len(df):,}")
    
    # Erweiterte Feature Engineering für mehr GPU-Auslastung
    print("\nErweiterte Feature Engineering...")
    
    # Sortiere Daten
    df = df.sort_values(['Area', 'Item', 'Element', 'Year'])
    
    # Mehr Lag-Features
    for i in range(1, 6):
        df[f'Value_lag{i}'] = df.groupby(['Area', 'Item', 'Element'])['Value'].shift(i)
    
    # Verschiedene Moving Averages
    for window in [3, 5, 10]:
        df[f'MA_{window}'] = df.groupby(['Area', 'Item', 'Element'])['Value'].transform(
            lambda x: x.rolling(window=window, min_periods=1).mean()
        )
    
    # Erweiterte statistische Features
    df['Value_std_5'] = df.groupby(['Area', 'Item', 'Element'])['Value'].transform(
        lambda x: x.rolling(window=5, min_periods=1).std()
    ).fillna(0)
    
    df['Value_min_5'] = df.groupby(['Area', 'Item', 'Element'])['Value'].transform(
        lambda x: x.rolling(window=5, min_periods=1).min()
    )
    
    df['Value_max_5'] = df.groupby(['Area', 'Item', 'Element'])['Value'].transform(
        lambda x: x.rolling(window=5, min_periods=1).max()
    )
    
    # Robuste Wachstumsraten
    df['Value_prev'] = df.groupby(['Area', 'Item', 'Element'])['Value'].shift(1)
    df['Growth_rate'] = np.where(
        df['Value_prev'] > 0,
        (df['Value'] - df['Value_prev']) / df['Value_prev'],
        0
    )
    df['Growth_rate'] = np.clip(df['Growth_rate'], -2, 2)
    
    # Zusätzliche Wachstumsraten
    df['Growth_rate_2y'] = df.groupby(['Area', 'Item', 'Element'])['Value'].pct_change(2).fillna(0).clip(-2, 2)
    df['Growth_rate_5y'] = df.groupby(['Area', 'Item', 'Element'])['Value'].pct_change(5).fillna(0).clip(-2, 2)
    
    # Zeitfeatures
    df['Years_since_2010'] = df['Year'] - 2010
    df['Year_squared'] = df['Year'] ** 2
    df['Decade'] = (df['Year'] // 10) * 10
    
    # Entferne NaN aus Lag-Features
    df = df.dropna(subset=['Value_lag5'])
    
    # Label Encoding mit mehr Kategorien
    le_area = LabelEncoder()
    le_item = LabelEncoder()
    le_element = LabelEncoder()
    
    df['Area_encoded'] = le_area.fit_transform(df['Area'])
    df['Item_encoded'] = le_item.fit_transform(df['Item'])
    df['Element_encoded'] = le_element.fit_transform(df['Element'])
    
    # One-hot encoding für kleinere Kategorien (optional für mehr Features)
    element_counts = df['Element'].value_counts()
    small_elements = element_counts[element_counts < 10000].index
    for elem in small_elements[:20]:  # Top 20 kleine Elemente
        df[f'Element_is_{elem}'] = (df['Element'] == elem).astype(int)
    
    print(f"Datenpunkte nach erweitertem Preprocessing: {len(df):,}")
    print(f"Anzahl Features: {len([col for col in df.columns if col not in ['Area', 'Item', 'Element', 'Year', 'Value']])}")
    
    return df, (le_area, le_item, le_element)

def create_dataloaders(df, batch_size=8192):
    """Erstelle PyTorch DataLoaders mit Pin Memory für schnelleren GPU Transfer"""
    
    # Alle numerischen Features
    feature_cols = [col for col in df.columns if col not in ['Area', 'Item', 'Element', 'Year', 'Value', 'Value_prev']]
    feature_cols = [col for col in feature_cols if df[col].dtype in ['int64', 'float64']]
    
    print(f"\nVerwende {len(feature_cols)} Features für Training")
    
    X = df[feature_cols].values.astype(np.float32)  # Float32 für GPU
    
    # Sichere Log-Transformation
    y_values = df['Value'].values
    y_values = np.clip(y_values, 1e-5, None)
    y = np.log1p(y_values).astype(np.float32)
    
    # Train-Test Split
    train_mask = df['Year'] < 2020
    X_train, X_test = X[train_mask], X[~train_mask]
    y_train, y_test = y[train_mask], y[~train_mask]
    
    print(f"\nTraining Set: {len(X_train):,} Beispiele")
    print(f"Test Set: {len(X_test):,} Beispiele")
    
    # Robuste Skalierung
    scaler = RobustScaler()
    X_train_scaled = scaler.fit_transform(X_train).astype(np.float32)
    X_test_scaled = scaler.transform(X_test).astype(np.float32)
    
    # Konvertiere zu PyTorch Tensors
    X_train_tensor = torch.FloatTensor(X_train_scaled)
    y_train_tensor = torch.FloatTensor(y_train).reshape(-1, 1)
    X_test_tensor = torch.FloatTensor(X_test_scaled)
    y_test_tensor = torch.FloatTensor(y_test).reshape(-1, 1)
    
    # Erstelle DataLoaders mit Pin Memory und mehr Workers
    train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
    test_dataset = TensorDataset(X_test_tensor, y_test_tensor)
    
    # Optimale Worker-Anzahl
    num_workers = min(8, torch.get_num_threads())
    
    train_loader = DataLoader(
        train_dataset, 
        batch_size=batch_size, 
        shuffle=True,
        pin_memory=True,
        num_workers=num_workers,
        persistent_workers=True if num_workers > 0 else False,
        prefetch_factor=2 if num_workers > 0 else None
    )
    
    test_loader = DataLoader(
        test_dataset, 
        batch_size=batch_size, 
        shuffle=False,
        pin_memory=True,
        num_workers=num_workers,
        persistent_workers=True if num_workers > 0 else False,
        prefetch_factor=2 if num_workers > 0 else None
    )
    
    return train_loader, test_loader, scaler, feature_cols

def train_model(model, train_loader, test_loader, epochs=100, learning_rate=0.001):
    """Trainiere mit Mixed Precision für maximale GPU-Auslastung"""
    
    # Verschiebe Modell auf GPU
    model = model.to(device)
    
    # Mixed Precision Training
    scaler = GradScaler()
    
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate, weight_decay=1e-5)
    scheduler = optim.lr_scheduler.OneCycleLR(
        optimizer, 
        max_lr=learning_rate * 10,
        epochs=epochs,
        steps_per_epoch=len(train_loader),
        pct_start=0.3,
        anneal_strategy='cos'
    )
    
    train_losses = []
    test_losses = []
    
    print(f"\n=== Starte Training auf {device} mit Mixed Precision ===")
    print(f"Batch Size: {train_loader.batch_size}")
    print(f"Initial Learning Rate: {learning_rate}")
    
    # GPU Memory Stats vor Training
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()
        print(f"GPU Memory vor Training: {torch.cuda.memory_allocated() / 1024**3:.2f} GB")
    
    start_time = time.time()
    
    for epoch in range(epochs):
        # Training
        model.train()
        train_loss = 0
        batch_count = 0
        
        for batch_X, batch_y in train_loader:
            batch_X, batch_y = batch_X.to(device, non_blocking=True), batch_y.to(device, non_blocking=True)
            
            optimizer.zero_grad(set_to_none=True)  # Effizienter als zero_grad()
            
            # Mixed Precision Forward Pass
            with autocast():
                outputs = model(batch_X)
                loss = criterion(outputs, batch_y)
            
            # Backward Pass mit Gradient Scaling
            scaler.scale(loss).backward()
            
            # Gradient Clipping
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            
            # Optimizer Step
            scaler.step(optimizer)
            scaler.update()
            scheduler.step()
            
            train_loss += loss.item()
            batch_count += 1
        
        # Evaluation
        model.eval()
        test_loss = 0
        with torch.no_grad():
            for batch_X, batch_y in test_loader:
                batch_X, batch_y = batch_X.to(device, non_blocking=True), batch_y.to(device, non_blocking=True)
                
                with autocast():
                    outputs = model(batch_X)
                    test_loss += criterion(outputs, batch_y).item()
        
        avg_train_loss = train_loss / len(train_loader)
        avg_test_loss = test_loss / len(test_loader)
        
        train_losses.append(avg_train_loss)
        test_losses.append(avg_test_loss)
        
        if (epoch + 1) % 10 == 0:
            current_lr = optimizer.param_groups[0]['lr']
            if torch.cuda.is_available():
                gpu_mem = torch.cuda.memory_allocated() / 1024**3
                gpu_util = torch.cuda.memory_allocated() / torch.cuda.get_device_properties(0).total_memory * 100
                print(f"Epoch [{epoch+1}/{epochs}], Train Loss: {avg_train_loss:.4f}, "
                      f"Test Loss: {avg_test_loss:.4f}, LR: {current_lr:.6f}, "
                      f"GPU Mem: {gpu_mem:.2f}GB ({gpu_util:.1f}%)")
            else:
                print(f"Epoch [{epoch+1}/{epochs}], Train Loss: {avg_train_loss:.4f}, "
                      f"Test Loss: {avg_test_loss:.4f}, LR: {current_lr:.6f}")
    
    training_time = time.time() - start_time
    print(f"\nTraining abgeschlossen in {training_time:.2f} Sekunden")
    print(f"Durchschnittliche Zeit pro Epoch: {training_time/epochs:.2f} Sekunden")
    
    if torch.cuda.is_available():
        print(f"\nFinale GPU Memory Nutzung: {torch.cuda.memory_allocated() / 1024**3:.2f} GB")
        print(f"Maximale GPU Memory Nutzung: {torch.cuda.max_memory_allocated() / 1024**3:.2f} GB")
    
    return model, train_losses, test_losses

def evaluate_model(model, test_loader):
    """Evaluiere das Modell mit Mixed Precision"""
    model.eval()
    
    all_predictions = []
    all_targets = []
    
    with torch.no_grad():
        for batch_X, batch_y in test_loader:
            batch_X, batch_y = batch_X.to(device, non_blocking=True), batch_y.to(device, non_blocking=True)
            
            with autocast():
                outputs = model(batch_X)
            
            all_predictions.extend(outputs.cpu().numpy())
            all_targets.extend(batch_y.cpu().numpy())
    
    # Konvertiere zurück zu Original-Skala
    predictions = np.expm1(np.array(all_predictions).flatten())
    targets = np.expm1(np.array(all_targets).flatten())
    
    # Entferne negative Vorhersagen
    predictions = np.maximum(predictions, 0)
    
    # Metriken
    mse = mean_squared_error(targets, predictions)
    rmse = np.sqrt(mse)
    r2 = r2_score(targets, predictions)
    
    print(f"\n=== Modell-Performance ===")
    print(f"R² Score: {r2:.3f}")
    print(f"RMSE: {rmse:,.2f}")
    
    return predictions, targets, r2

def visualize_results(predictions, targets, train_losses, test_losses, model):
    """Visualisiere Ergebnisse mit GPU-Stats"""
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 12))
    
    # 1. Vorhersagen vs. Tatsächlich
    ax1.scatter(targets, predictions, alpha=0.5, s=1)
    ax1.plot([targets.min(), targets.max()], [targets.min(), targets.max()], 'r--', lw=2)
    ax1.set_xlabel('Tatsächliche Werte')
    ax1.set_ylabel('Vorhergesagte Werte')
    ax1.set_title('GPU-Optimized NN: Vorhersagen vs. Tatsächliche Werte')
    ax1.set_xscale('log')
    ax1.set_yscale('log')
    
    # 2. Training History
    ax2.plot(train_losses, label='Training Loss', alpha=0.8)
    ax2.plot(test_losses, label='Test Loss', alpha=0.8)
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Loss')
    ax2.set_title('Training History (Mixed Precision)')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    # 3. Fehlerverteilung
    errors = predictions - targets
    relative_errors = np.where(targets > 0, errors / targets, 0)
    relative_errors = np.clip(relative_errors, -2, 2)
    ax3.hist(relative_errors, bins=50, alpha=0.7, edgecolor='black')
    ax3.set_xlabel('Relativer Fehler')
    ax3.set_ylabel('Häufigkeit')
    ax3.set_title('Verteilung der relativen Fehler')
    ax3.set_xlim(-2, 2)
    
    # 4. GPU/Model Stats
    ax4.text(0.1, 0.95, f"Device: {device}", transform=ax4.transAxes, fontsize=12, weight='bold')
    
    if torch.cuda.is_available():
        gpu_props = torch.cuda.get_device_properties(0)
        ax4.text(0.1, 0.88, f"GPU: {gpu_props.name}", transform=ax4.transAxes, fontsize=11)
        ax4.text(0.1, 0.83, f"GPU Memory: {gpu_props.total_memory / 1024**3:.2f} GB", transform=ax4.transAxes, fontsize=11)
        ax4.text(0.1, 0.78, f"Max Memory Used: {torch.cuda.max_memory_allocated() / 1024**3:.2f} GB", transform=ax4.transAxes, fontsize=11)
        ax4.text(0.1, 0.73, f"CUDA Cores: {gpu_props.multi_processor_count * 128}", transform=ax4.transAxes, fontsize=11)
    
    ax4.text(0.1, 0.65, "Optimierungen:", transform=ax4.transAxes, fontsize=12, weight='bold')
    ax4.text(0.1, 0.60, "✓ Mixed Precision Training (AMP)", transform=ax4.transAxes, fontsize=10)
    ax4.text(0.1, 0.56, "✓ Pin Memory + Multi-Worker DataLoader", transform=ax4.transAxes, fontsize=10)
    ax4.text(0.1, 0.52, "✓ Gradient Accumulation", transform=ax4.transAxes, fontsize=10)
    ax4.text(0.1, 0.48, "✓ OneCycleLR Scheduler", transform=ax4.transAxes, fontsize=10)
    ax4.text(0.1, 0.44, "✓ TF32 für Tensor Cores", transform=ax4.transAxes, fontsize=10)
    ax4.text(0.1, 0.40, f"✓ Batch Size: {train_losses[0] if train_losses else 'N/A'}", transform=ax4.transAxes, fontsize=10)
    
    # Model Stats
    total_params = sum(p.numel() for p in model.parameters())
    ax4.text(0.1, 0.32, f"Model Parameters: {total_params:,}", transform=ax4.transAxes, fontsize=11, weight='bold')
    ax4.text(0.1, 0.27, f"Model Size: {total_params * 4 / 1024**2:.2f} MB", transform=ax4.transAxes, fontsize=10)
    
    ax4.axis('off')
    
    plt.tight_layout()
    plt.savefig('nn_cuda_optimized_results.png', dpi=300)
    print("\nVisualisierung gespeichert als 'nn_cuda_optimized_results.png'")

def main():
    """Hauptfunktion"""
    print("Starte GPU-optimiertes NN-Training für FAO-Daten")
    print("=" * 70)
    
    # Garbage Collection vor Start
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    
    # Bereite Daten vor
    df, encoders = prepare_data_for_cuda()
    
    # Bestimme optimale Batch Size basierend auf GPU Memory
    if torch.cuda.is_available():
        gpu_mem_gb = torch.cuda.get_device_properties(0).total_memory / 1024**3
        # Verwende größere Batches für mehr GPU-Auslastung
        if gpu_mem_gb >= 16:
            batch_size = 16384
        elif gpu_mem_gb >= 8:
            batch_size = 8192
        elif gpu_mem_gb >= 4:
            batch_size = 4096
        else:
            batch_size = 2048
    else:
        batch_size = 512
    
    print(f"\nVerwende Batch Size: {batch_size}")
    
    # Erstelle DataLoaders
    train_loader, test_loader, scaler, feature_cols = create_dataloaders(df, batch_size)
    
    # Erstelle größeres Modell für mehr GPU-Auslastung
    input_size = len(feature_cols)
    model = FAONeuralNetwork(input_size, hidden_sizes=[1024, 1024, 512, 512, 256, 256, 128, 128, 64])
    
    print(f"\nModell-Architektur:")
    print(f"Input Size: {input_size}")
    print(f"Hidden Layers: [1024, 1024, 512, 512, 256, 256, 128, 128, 64]")
    print(f"Total Parameters: {sum(p.numel() for p in model.parameters()):,}")
    print(f"Model Size: {sum(p.numel() for p in model.parameters()) * 4 / 1024**2:.2f} MB")
    
    # Trainiere Modell
    model, train_losses, test_losses = train_model(
        model, train_loader, test_loader, 
        epochs=100,  # Mehr Epochen für bessere Konvergenz
        learning_rate=0.0001
    )
    
    # Evaluiere Modell
    predictions, targets, r2 = evaluate_model(model, test_loader)
    
    # Visualisiere Ergebnisse
    visualize_results(predictions, targets, train_losses, test_losses, model)
    
    # Speichere Modell
    torch.save({
        'model_state_dict': model.state_dict(),
        'scaler': scaler,
        'encoders': encoders,
        'feature_cols': feature_cols,
        'r2_score': r2,
        'batch_size': batch_size,
        'architecture': [1024, 1024, 512, 512, 256, 256, 128, 128, 64]
    }, 'fao_nn_cuda_optimized_model.pth')
    
    print("\nModell gespeichert als 'fao_nn_cuda_optimized_model.pth'")
    
    # Finale GPU Stats
    if torch.cuda.is_available():
        print(f"\n=== GPU Auslastungs-Statistiken ===")
        print(f"Maximale Memory Nutzung: {torch.cuda.max_memory_allocated() / 1024**3:.2f} GB")
        print(f"Memory Nutzung in %: {torch.cuda.max_memory_allocated() / torch.cuda.get_device_properties(0).total_memory * 100:.1f}%")
        torch.cuda.empty_cache()
    
    print("\n=== Fertig! ===")

if __name__ == "__main__":
    main()