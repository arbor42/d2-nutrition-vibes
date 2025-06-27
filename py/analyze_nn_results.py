#!/usr/bin/env python3
"""
Analyse der Neuronalen Netzwerk Ergebnisse
==========================================

Dieses Skript analysiert warum die NN-Ergebnisse schlecht sind und 
zeigt Verbesserungsmöglichkeiten auf.
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.neural_network import MLPRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import matplotlib.pyplot as plt

def analyze_problems():
    """Analysiere die Probleme mit den aktuellen NN-Modellen"""
    
    print("=== Analyse der NN-Probleme ===\n")
    
    # 1. Problem mit dem einfachen Modell
    print("1. PROBLEM: Zu wenige Features")
    print("   - Nur Land und Jahr als Input ist zu wenig Information")
    print("   - Bevölkerungswachstum ist nicht linear und variiert stark zwischen Ländern")
    print("   - R² Score von -0.000 bedeutet: Modell ist schlechter als der Durchschnitt!\n")
    
    # 2. Problem mit der Datenverteilung
    print("2. PROBLEM: Extreme Werteunterschiede")
    print("   - Bevölkerungswerte reichen von kleinen Inseln (< 100k) bis China/Indien (> 1 Mrd)")
    print("   - Diese extremen Unterschiede machen das Training schwierig\n")
    
    # 3. Problem mit der Zeitreihe
    print("3. PROBLEM: Zeitreihen-Struktur ignoriert")
    print("   - Bevölkerungswachstum folgt Trends")
    print("   - Einfaches NN behandelt Jahre als unabhängige Werte\n")

def improved_model():
    """Verbessertes Modell mit mehr Features und besserer Vorverarbeitung"""
    
    print("\n=== Verbessertes NN-Modell ===\n")
    
    # Lade Daten
    df = pd.read_csv('fao.csv')
    df['Value'] = pd.to_numeric(df['Value'], errors='coerce')
    df = df.dropna(subset=['Value'])
    
    # Fokus auf Population mit mehr Context
    pop_df = df[df['Item'] == 'Population'].copy()
    
    # Feature Engineering
    # 1. Füge historische Daten hinzu
    pop_df = pop_df.sort_values(['Area', 'Year'])
    pop_df['Value_lag1'] = pop_df.groupby('Area')['Value'].shift(1)
    pop_df['Value_lag2'] = pop_df.groupby('Area')['Value'].shift(2)
    pop_df['Growth_rate'] = pop_df.groupby('Area')['Value'].pct_change()
    
    # 2. Füge Kontinent/Region Information hinzu (vereinfacht)
    def get_continent(country):
        africa = ['Angola', 'Algeria', 'Egypt', 'Ethiopia', 'Kenya', 'Nigeria', 'South Africa']
        asia = ['Afghanistan', 'China', 'India', 'Indonesia', 'Japan', 'Pakistan']
        europe = ['Albania', 'Austria', 'Belgium', 'Germany', 'France', 'Italy', 'Spain']
        
        if country in africa: return 'Africa'
        elif country in asia: return 'Asia'
        elif country in europe: return 'Europe'
        else: return 'Other'
    
    pop_df['Continent'] = pop_df['Area'].apply(get_continent)
    
    # Entferne Zeilen mit NaN (durch lag features)
    pop_df = pop_df.dropna()
    
    # Encode kategorische Variablen
    le_area = LabelEncoder()
    le_cont = LabelEncoder()
    pop_df['Area_encoded'] = le_area.fit_transform(pop_df['Area'])
    pop_df['Continent_encoded'] = le_cont.fit_transform(pop_df['Continent'])
    
    # Features und Target
    feature_cols = ['Area_encoded', 'Continent_encoded', 'Year', 
                   'Value_lag1', 'Value_lag2', 'Growth_rate']
    X = pop_df[feature_cols]
    y = pop_df['Value']
    
    # Log-Transformation für Target (wegen extremer Werte)
    y_log = np.log1p(y)
    
    # Train-Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y_log, test_size=0.2, random_state=42)
    
    # Skalierung
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Verbessertes NN
    print("Trainiere verbessertes NN mit mehr Features...")
    nn_improved = MLPRegressor(
        hidden_layer_sizes=(100, 50, 25),
        activation='relu',
        solver='adam',
        max_iter=1000,
        early_stopping=True,
        validation_fraction=0.1,
        random_state=42
    )
    
    nn_improved.fit(X_train_scaled, y_train)
    
    # Vorhersagen
    y_pred_log = nn_improved.predict(X_test_scaled)
    y_pred = np.expm1(y_pred_log)  # Zurück-Transformation
    y_test_original = np.expm1(y_test)
    
    # Evaluation
    mse = mean_squared_error(y_test_original, y_pred)
    r2 = r2_score(y_test_original, y_pred)
    
    print(f"\nVerbesserte Modell-Performance:")
    print(f"R² Score: {r2:.3f}")
    print(f"RMSE: {np.sqrt(mse):.2f}")
    
    # Vergleich mit Random Forest
    print("\nVergleich mit Random Forest...")
    rf = RandomForestRegressor(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)
    y_pred_rf_log = rf.predict(X_test)
    y_pred_rf = np.expm1(y_pred_rf_log)
    r2_rf = r2_score(y_test_original, y_pred_rf)
    print(f"Random Forest R² Score: {r2_rf:.3f}")
    
    # Visualisierung
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
    
    # NN Vorhersagen
    ax1.scatter(y_test_original, y_pred, alpha=0.5)
    ax1.plot([y_test_original.min(), y_test_original.max()], 
             [y_test_original.min(), y_test_original.max()], 'r--', lw=2)
    ax1.set_xlabel('Tatsächliche Bevölkerung')
    ax1.set_ylabel('Vorhergesagte Bevölkerung')
    ax1.set_title(f'Verbessertes NN (R² = {r2:.3f})')
    ax1.set_xscale('log')
    ax1.set_yscale('log')
    
    # Feature Importance (approximiert durch RF)
    ax2.barh(feature_cols, rf.feature_importances_)
    ax2.set_xlabel('Feature Importance')
    ax2.set_title('Wichtigkeit der Features (Random Forest)')
    
    plt.tight_layout()
    plt.savefig('nn_improved_analysis.png')
    print("\nVisualisierung gespeichert als 'nn_improved_analysis.png'")
    
    return nn_improved, scaler, le_area

def recommendations():
    """Empfehlungen für bessere NN-Performance"""
    
    print("\n=== Empfehlungen für bessere NN-Performance ===\n")
    
    print("1. DATENVORVERARBEITUNG:")
    print("   - Log-Transformation für extreme Werte")
    print("   - Feature Engineering (Lag-Features, Wachstumsraten)")
    print("   - Normalisierung/Standardisierung ist essentiell\n")
    
    print("2. ARCHITEKTUR-ANPASSUNGEN:")
    print("   - LSTM/GRU für Zeitreihen statt Standard-NN")
    print("   - Dropout-Layer gegen Overfitting")
    print("   - Batch Normalization für stabileres Training\n")
    
    print("3. PROBLEM-SPEZIFISCHE ANSÄTZE:")
    print("   - Separate Modelle für verschiedene Ländergruppen")
    print("   - Transfer Learning von ähnlichen Datensätzen")
    print("   - Ensemble-Methoden (NN + traditionelle Modelle)\n")
    
    print("4. ALTERNATIVE ANWENDUNGEN:")
    print("   - Statt absolute Werte: Vorhersage von Wachstumsraten")
    print("   - Anomalieerkennung (Autoencoder)")
    print("   - Klassifikation statt Regression (z.B. Ernährungssicherheit)\n")

def main():
    """Hauptfunktion"""
    analyze_problems()
    improved_model()
    recommendations()
    
    print("\n=== Fazit ===")
    print("\nDie schlechten Ergebnisse sind NORMAL für erste Versuche!")
    print("Neuronale Netzwerke brauchen:")
    print("- Sorgfältige Datenvorverarbeitung")
    print("- Durchdachtes Feature Engineering") 
    print("- Problem-angepasste Architekturen")
    print("- Viel Experimentieren und Feintuning")

if __name__ == "__main__":
    main()