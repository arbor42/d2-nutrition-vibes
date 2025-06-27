#!/usr/bin/env python3
"""
Neuronales Netzwerk mit CUDA/GPU-Unterstützung für FAO-Daten
===========================================================

Verwendet PyTorch für GPU-beschleunigtes Training.
"""

import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score
import matplotlib.pyplot as plt
import time
import warnings
warnings.filterwarnings('ignore')

# Überprüfe CUDA-Verfügbarkeit
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Verwende Gerät: {device}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"CUDA Version: {torch.version.cuda}")

class FAONeuralNetwork(nn.Module):
    """PyTorch Neural Network für FAO-Daten"""
    
    def __init__(self, input_size, hidden_sizes=[200, 100, 50, 25], dropout_rate=0.2):
        super(FAONeuralNetwork, self).__init__()
        
        layers = []
        prev_size = input_size
        
        for hidden_size in hidden_sizes:
            layers.extend([
                nn.Linear(prev_size, hidden_size),
                nn.ReLU(),
                nn.BatchNorm1d(hidden_size),
                nn.Dropout(dropout_rate)
            ])
            prev_size = hidden_size
        
        # Output layer
        layers.append(nn.Linear(prev_size, 1))
        
        self.model = nn.Sequential(*layers)
        
    def forward(self, x):
        return self.model(x)

def prepare_data_for_cuda():
    """Bereite Daten für GPU-Training vor"""
    print("=== Lade FAO-Daten für CUDA-Training ===")
    
    # Lade Daten
    df = pd.read_csv('fao.csv')
    df['Value'] = pd.to_numeric(df['Value'], errors='coerce')
    df = df.dropna(subset=['Value'])
    
    print(f"Gesamte Datenpunkte: {len(df):,}")
    
    # Vereinfachtes Feature Engineering für schnelleres Training
    print("\nFeature Engineering...")
    
    # Sortiere und erstelle Lag-Features
    df = df.sort_values(['Area', 'Item', 'Element', 'Year'])
    df['Value_lag1'] = df.groupby(['Area', 'Item', 'Element'])['Value'].shift(1)
    df['Value_lag2'] = df.groupby(['Area', 'Item', 'Element'])['Value'].shift(2)
    
    # Wachstumsraten
    df['Growth_rate'] = df.groupby(['Area', 'Item', 'Element'])['Value'].pct_change()
    df['Growth_rate'] = df['Growth_rate'].replace([np.inf, -np.inf], np.nan).clip(-5, 5).fillna(0)
    
    # Moving Average
    df['MA_3'] = df.groupby(['Area', 'Item', 'Element'])['Value'].transform(
        lambda x: x.rolling(window=3, min_periods=1).mean()
    )
    
    # Zeitfeatures
    df['Years_since_2010'] = df['Year'] - 2010
    
    # Entferne NaN
    df = df.dropna(subset=['Value_lag1'])
    
    # Label Encoding
    le_area = LabelEncoder()
    le_item = LabelEncoder()
    le_element = LabelEncoder()
    
    df['Area_encoded'] = le_area.fit_transform(df['Area'])
    df['Item_encoded'] = le_item.fit_transform(df['Item'])
    df['Element_encoded'] = le_element.fit_transform(df['Element'])
    
    print(f"Datenpunkte nach Preprocessing: {len(df):,}")
    
    return df, (le_area, le_item, le_element)

def create_dataloaders(df, batch_size=1024):
    """Erstelle PyTorch DataLoaders"""
    
    # Features
    feature_cols = [
        'Area_encoded', 'Item_encoded', 'Element_encoded',
        'Year', 'Years_since_2010',
        'Value_lag1', 'Value_lag2', 'Growth_rate', 'MA_3'
    ]
    
    X = df[feature_cols].values
    y = np.log1p(df['Value'].values)  # Log-Transformation
    
    # Train-Test Split
    train_mask = df['Year'] < 2020
    X_train, X_test = X[train_mask], X[~train_mask]
    y_train, y_test = y[train_mask], y[~train_mask]
    
    print(f"\nTraining Set: {len(X_train):,} Beispiele")
    print(f"Test Set: {len(X_test):,} Beispiele")
    
    # Skalierung
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Konvertiere zu PyTorch Tensors
    X_train_tensor = torch.FloatTensor(X_train_scaled)
    y_train_tensor = torch.FloatTensor(y_train).reshape(-1, 1)
    X_test_tensor = torch.FloatTensor(X_test_scaled)
    y_test_tensor = torch.FloatTensor(y_test).reshape(-1, 1)
    
    # Erstelle DataLoaders
    train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
    test_dataset = TensorDataset(X_test_tensor, y_test_tensor)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)
    
    return train_loader, test_loader, scaler, feature_cols

def train_model(model, train_loader, test_loader, epochs=50, learning_rate=0.001):
    """Trainiere das Modell auf GPU"""
    
    # Verschiebe Modell auf GPU
    model = model.to(device)
    
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)
    
    train_losses = []
    test_losses = []
    
    print(f"\n=== Starte Training auf {device} ===")
    start_time = time.time()
    
    for epoch in range(epochs):
        # Training
        model.train()
        train_loss = 0
        for batch_X, batch_y in train_loader:
            batch_X, batch_y = batch_X.to(device), batch_y.to(device)
            
            optimizer.zero_grad()
            outputs = model(batch_X)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
        
        # Evaluation
        model.eval()
        test_loss = 0
        with torch.no_grad():
            for batch_X, batch_y in test_loader:
                batch_X, batch_y = batch_X.to(device), batch_y.to(device)
                outputs = model(batch_X)
                test_loss += criterion(outputs, batch_y).item()
        
        avg_train_loss = train_loss / len(train_loader)
        avg_test_loss = test_loss / len(test_loader)
        
        train_losses.append(avg_train_loss)
        test_losses.append(avg_test_loss)
        
        scheduler.step(avg_test_loss)
        
        if (epoch + 1) % 10 == 0:
            print(f"Epoch [{epoch+1}/{epochs}], Train Loss: {avg_train_loss:.4f}, Test Loss: {avg_test_loss:.4f}")
    
    training_time = time.time() - start_time
    print(f"\nTraining abgeschlossen in {training_time:.2f} Sekunden")
    
    return model, train_losses, test_losses

def evaluate_model(model, test_loader):
    """Evaluiere das Modell"""
    model.eval()
    
    all_predictions = []
    all_targets = []
    
    with torch.no_grad():
        for batch_X, batch_y in test_loader:
            batch_X, batch_y = batch_X.to(device), batch_y.to(device)
            outputs = model(batch_X)
            
            all_predictions.extend(outputs.cpu().numpy())
            all_targets.extend(batch_y.cpu().numpy())
    
    # Konvertiere zurück zu Original-Skala
    predictions = np.expm1(np.array(all_predictions).flatten())
    targets = np.expm1(np.array(all_targets).flatten())
    
    # Metriken
    mse = mean_squared_error(targets, predictions)
    rmse = np.sqrt(mse)
    r2 = r2_score(targets, predictions)
    
    print(f"\n=== Modell-Performance ===")
    print(f"R² Score: {r2:.3f}")
    print(f"RMSE: {rmse:,.2f}")
    
    return predictions, targets, r2

def visualize_results(predictions, targets, train_losses, test_losses):
    """Visualisiere Ergebnisse"""
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 12))
    
    # 1. Vorhersagen vs. Tatsächlich
    ax1.scatter(targets, predictions, alpha=0.5, s=1)
    ax1.plot([targets.min(), targets.max()], [targets.min(), targets.max()], 'r--', lw=2)
    ax1.set_xlabel('Tatsächliche Werte')
    ax1.set_ylabel('Vorhergesagte Werte')
    ax1.set_title('CUDA NN: Vorhersagen vs. Tatsächliche Werte')
    ax1.set_xscale('log')
    ax1.set_yscale('log')
    
    # 2. Training History
    ax2.plot(train_losses, label='Training Loss')
    ax2.plot(test_losses, label='Test Loss')
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Loss')
    ax2.set_title('Training History')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    # 3. Fehlerverteilung
    errors = predictions - targets
    relative_errors = errors / targets
    ax3.hist(relative_errors, bins=50, alpha=0.7, edgecolor='black')
    ax3.set_xlabel('Relativer Fehler')
    ax3.set_ylabel('Häufigkeit')
    ax3.set_title('Verteilung der relativen Fehler')
    ax3.set_xlim(-2, 2)
    
    # 4. GPU/CUDA Info
    ax4.text(0.1, 0.9, f"Device: {device}", transform=ax4.transAxes, fontsize=12)
    if torch.cuda.is_available():
        ax4.text(0.1, 0.8, f"GPU: {torch.cuda.get_device_name(0)}", transform=ax4.transAxes, fontsize=12)
        ax4.text(0.1, 0.7, f"CUDA Version: {torch.version.cuda}", transform=ax4.transAxes, fontsize=12)
        ax4.text(0.1, 0.6, f"PyTorch Version: {torch.__version__}", transform=ax4.transAxes, fontsize=12)
        
        # GPU Memory Info
        allocated = torch.cuda.memory_allocated() / 1024**2  # MB
        reserved = torch.cuda.memory_reserved() / 1024**2  # MB
        ax4.text(0.1, 0.5, f"GPU Memory Allocated: {allocated:.2f} MB", transform=ax4.transAxes, fontsize=12)
        ax4.text(0.1, 0.4, f"GPU Memory Reserved: {reserved:.2f} MB", transform=ax4.transAxes, fontsize=12)
    else:
        ax4.text(0.1, 0.7, "CUDA nicht verfügbar - Training auf CPU", transform=ax4.transAxes, fontsize=12)
    
    ax4.axis('off')
    
    plt.tight_layout()
    plt.savefig('nn_cuda_results.png', dpi=300)
    print("\nVisualisierung gespeichert als 'nn_cuda_results.png'")

def main():
    """Hauptfunktion"""
    print("Starte CUDA-beschleunigtes NN-Training für FAO-Daten")
    print("=" * 60)
    
    # Bereite Daten vor
    df, encoders = prepare_data_for_cuda()
    
    # Erstelle DataLoaders
    batch_size = 2048 if torch.cuda.is_available() else 512
    train_loader, test_loader, scaler, feature_cols = create_dataloaders(df, batch_size)
    
    # Erstelle Modell
    input_size = len(feature_cols)
    model = FAONeuralNetwork(input_size, hidden_sizes=[256, 128, 64, 32])
    
    print(f"\nModell-Architektur:")
    print(f"Input Size: {input_size}")
    print(f"Hidden Layers: [256, 128, 64, 32]")
    print(f"Total Parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    # Trainiere Modell
    model, train_losses, test_losses = train_model(model, train_loader, test_loader, epochs=50)
    
    # Evaluiere Modell
    predictions, targets, r2 = evaluate_model(model, test_loader)
    
    # Visualisiere Ergebnisse
    visualize_results(predictions, targets, train_losses, test_losses)
    
    # Speichere Modell
    torch.save({
        'model_state_dict': model.state_dict(),
        'scaler': scaler,
        'encoders': encoders,
        'feature_cols': feature_cols,
        'r2_score': r2
    }, 'fao_nn_cuda_model.pth')
    
    print("\nModell gespeichert als 'fao_nn_cuda_model.pth'")
    print("\n=== Fertig! ===")

if __name__ == "__main__":
    main()