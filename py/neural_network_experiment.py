#!/usr/bin/env python3
"""
Neuronales Netzwerk Experiment für FAO Ernährungsdaten
======================================================

Dieses Experiment zeigt, wie neuronale Netzwerke für die Analyse von 
Ernährungsdaten verwendet werden können. Wir werden verschiedene Ansätze
demonstrieren:

1. Vorhersage von Ernährungswerten basierend auf anderen Faktoren
2. Clustering von Ländern basierend auf Ernährungsmustern
3. Zeitreihenanalyse für Trendvorhersagen
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.neural_network import MLPRegressor, MLPClassifier
from sklearn.metrics import mean_squared_error, r2_score, classification_report
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime

# Setze Seed für Reproduzierbarkeit
np.random.seed(42)

def load_and_explore_data():
    """Lade und erkunde die FAO Daten"""
    print("=== Lade FAO Daten ===")
    df = pd.read_csv('fao.csv')
    
    print(f"\nDatenform: {df.shape}")
    print(f"\nSpalten: {list(df.columns)}")
    print(f"\nDatentypen:\n{df.dtypes}")
    print(f"\nEinzigartige Items: {df['Item'].nunique()}")
    print(f"\nEinzigartige Länder: {df['Area'].nunique()}")
    print(f"\nJahresbereich: {df['Year'].min()} - {df['Year'].max()}")
    
    # Bereinige die Daten
    df['Value'] = pd.to_numeric(df['Value'], errors='coerce')
    df = df.dropna(subset=['Value'])
    
    return df

def experiment_1_value_prediction(df):
    """
    Experiment 1: Vorhersage von Ernährungswerten
    
    Ziel: Vorhersage des Wertes basierend auf Land, Item, Jahr und Element
    """
    print("\n=== Experiment 1: Wertvorhersage ===")
    
    # Filtere auf häufigste Items für bessere Performance
    top_items = df['Item'].value_counts().head(20).index
    df_filtered = df[df['Item'].isin(top_items)].copy()
    
    # Feature Engineering
    le_area = LabelEncoder()
    le_item = LabelEncoder()
    le_element = LabelEncoder()
    
    df_filtered['Area_encoded'] = le_area.fit_transform(df_filtered['Area'])
    df_filtered['Item_encoded'] = le_item.fit_transform(df_filtered['Item'])
    df_filtered['Element_encoded'] = le_element.fit_transform(df_filtered['Element'])
    
    # Features und Target
    features = ['Area_encoded', 'Item_encoded', 'Element_encoded', 'Year']
    X = df_filtered[features]
    y = df_filtered['Value']
    
    # Train-Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Skalierung
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Neuronales Netzwerk
    print("\nTrainiere neuronales Netzwerk...")
    nn_model = MLPRegressor(
        hidden_layer_sizes=(100, 50, 25),  # 3 versteckte Schichten
        activation='relu',
        solver='adam',
        max_iter=500,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.1
    )
    
    nn_model.fit(X_train_scaled, y_train)
    
    # Vorhersagen
    y_pred = nn_model.predict(X_test_scaled)
    
    # Evaluation
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"\nModell-Performance:")
    print(f"MSE: {mse:.2f}")
    print(f"R² Score: {r2:.3f}")
    print(f"RMSE: {np.sqrt(mse):.2f}")
    
    # Visualisierung
    plt.figure(figsize=(10, 6))
    plt.scatter(y_test, y_pred, alpha=0.5)
    plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2)
    plt.xlabel('Tatsächliche Werte')
    plt.ylabel('Vorhergesagte Werte')
    plt.title('Neuronales Netzwerk: Vorhersage vs. Tatsächliche Werte')
    plt.tight_layout()
    plt.savefig('nn_prediction_results.png')
    plt.close()
    
    return nn_model, scaler, le_area, le_item, le_element

def experiment_2_country_clustering(df):
    """
    Experiment 2: Länder-Clustering basierend auf Ernährungsmustern
    
    Ziel: Gruppierung von Ländern mit ähnlichen Ernährungsprofilen
    """
    print("\n=== Experiment 2: Länder-Clustering ===")
    
    # Pivotiere Daten für Länderprofile
    # Nehme nur das neueste Jahr
    latest_year = df['Year'].max()
    df_latest = df[df['Year'] == latest_year]
    
    # Erstelle Länder-Item Matrix
    pivot_df = df_latest.pivot_table(
        index='Area', 
        columns='Item', 
        values='Value', 
        aggfunc='mean'
    )
    
    # Fülle NaN mit 0
    pivot_df = pivot_df.fillna(0)
    
    # Filtere Länder mit zu vielen fehlenden Werten
    threshold = 0.5
    pivot_df = pivot_df[pivot_df.columns[(pivot_df != 0).sum() > len(pivot_df) * threshold]]
    pivot_df = pivot_df[(pivot_df != 0).sum(axis=1) > len(pivot_df.columns) * threshold]
    
    if len(pivot_df) < 10:
        print("Zu wenige Daten für Clustering")
        return
    
    # Skalierung
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(pivot_df)
    
    # Autoencoder für Dimensionsreduktion
    from sklearn.decomposition import PCA
    
    # Erst PCA für bessere Initialisierung
    pca = PCA(n_components=10)
    pca_features = pca.fit_transform(scaled_data)
    
    # Neuronales Netzwerk für Clustering (als Autoencoder)
    print("\nTrainiere Autoencoder...")
    autoencoder = MLPRegressor(
        hidden_layer_sizes=(50, 20, 10, 20, 50),  # Bottleneck-Architektur
        activation='relu',
        solver='adam',
        max_iter=1000,
        random_state=42
    )
    
    autoencoder.fit(scaled_data, scaled_data)
    
    # Extrahiere Bottleneck-Features (mittlere Schicht)
    # Für Demonstration verwenden wir PCA-Features für Clustering
    
    from sklearn.cluster import KMeans
    
    # K-Means Clustering
    n_clusters = 5
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    clusters = kmeans.fit_predict(pca_features)
    
    # Füge Cluster zu DataFrame hinzu
    pivot_df['Cluster'] = clusters
    
    print(f"\nCluster-Verteilung:")
    for i in range(n_clusters):
        countries = pivot_df[pivot_df['Cluster'] == i].index.tolist()[:5]  # Top 5 Länder
        print(f"Cluster {i}: {', '.join(countries)}...")
    
    # Visualisierung
    plt.figure(figsize=(12, 8))
    scatter = plt.scatter(pca_features[:, 0], pca_features[:, 1], 
                         c=clusters, cmap='viridis', alpha=0.6)
    plt.xlabel('PCA Komponente 1')
    plt.ylabel('PCA Komponente 2')
    plt.title('Länder-Clustering basierend auf Ernährungsmustern')
    plt.colorbar(scatter, label='Cluster')
    
    # Füge Labels für einige Länder hinzu
    for idx, country in enumerate(pivot_df.index[:20]):  # Erste 20 Länder
        plt.annotate(country, (pca_features[idx, 0], pca_features[idx, 1]), 
                    fontsize=8, alpha=0.7)
    
    plt.tight_layout()
    plt.savefig('nn_country_clustering.png')
    plt.close()

def experiment_3_time_series_prediction(df):
    """
    Experiment 3: Zeitreihenvorhersage mit neuronalen Netzwerken
    
    Ziel: Vorhersage zukünftiger Trends für spezifische Ernährungsindikatoren
    """
    print("\n=== Experiment 3: Zeitreihenvorhersage ===")
    
    # Wähle ein spezifisches Item und Land für Zeitreihenanalyse
    # Nehme Population als Beispiel
    population_df = df[df['Item'] == 'Population'].copy()
    
    # Wähle Länder mit vollständigen Daten
    country_counts = population_df.groupby('Area')['Year'].count()
    complete_countries = country_counts[country_counts == country_counts.max()].index
    
    if len(complete_countries) == 0:
        print("Keine Länder mit vollständigen Daten gefunden")
        return
    
    selected_country = complete_countries[0]
    country_data = population_df[population_df['Area'] == selected_country].sort_values('Year')
    
    print(f"\nAnalysiere Zeitreihe für: {selected_country}")
    
    # Erstelle Sequenzen für RNN-ähnliches Training
    def create_sequences(data, n_steps):
        X, y = [], []
        for i in range(len(data) - n_steps):
            X.append(data[i:i+n_steps])
            y.append(data[i+n_steps])
        return np.array(X), np.array(y)
    
    # Normalisiere Daten
    values = country_data['Value'].values.reshape(-1, 1)
    scaler = StandardScaler()
    scaled_values = scaler.fit_transform(values).flatten()
    
    # Erstelle Sequenzen
    n_steps = 3  # Verwende 3 Jahre für Vorhersage
    X, y = create_sequences(scaled_values, n_steps)
    
    if len(X) < 10:
        print("Zu wenige Datenpunkte für Zeitreihenanalyse")
        return
    
    # Train-Test Split
    split_idx = int(0.8 * len(X))
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    
    # Neuronales Netzwerk für Zeitreihen
    print("\nTrainiere Zeitreihen-NN...")
    ts_model = MLPRegressor(
        hidden_layer_sizes=(50, 30, 20),
        activation='relu',
        solver='adam',
        max_iter=1000,
        random_state=42
    )
    
    ts_model.fit(X_train, y_train)
    
    # Vorhersagen
    y_pred = ts_model.predict(X_test)
    
    # Rücktransformation
    y_test_original = scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()
    y_pred_original = scaler.inverse_transform(y_pred.reshape(-1, 1)).flatten()
    
    # Evaluation
    mse = mean_squared_error(y_test_original, y_pred_original)
    print(f"\nZeitreihen MSE: {mse:.2f}")
    print(f"RMSE: {np.sqrt(mse):.2f}")
    
    # Visualisierung
    plt.figure(figsize=(12, 6))
    
    # Plot historische Daten
    years = country_data['Year'].values
    plt.plot(years, country_data['Value'].values, 'b-', label='Historische Daten', linewidth=2)
    
    # Plot Vorhersagen
    test_years = years[-len(y_test):]
    plt.plot(test_years, y_test_original, 'g--', label='Test-Daten', linewidth=2)
    plt.plot(test_years, y_pred_original, 'r-', label='NN-Vorhersagen', linewidth=2)
    
    plt.xlabel('Jahr')
    plt.ylabel('Bevölkerung (1000)')
    plt.title(f'Zeitreihenvorhersage für {selected_country}')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('nn_time_series_prediction.png')
    plt.close()

def main():
    """Hauptfunktion für das Experiment"""
    print("Starte Neuronales Netzwerk Experiment für FAO Daten")
    print("=" * 50)
    
    # Lade Daten
    df = load_and_explore_data()
    
    # Führe Experimente durch
    model1, scaler1, le_area, le_item, le_element = experiment_1_value_prediction(df)
    experiment_2_country_clustering(df)
    experiment_3_time_series_prediction(df)
    
    print("\n=== Zusammenfassung ===")
    print("\nNeuronale Netzwerke können in Ernährungsdaten verwendet werden für:")
    print("1. Vorhersage von fehlenden Werten")
    print("2. Identifikation von Ländergruppen mit ähnlichen Ernährungsmustern")
    print("3. Zeitreihenvorhersagen für Trendanalysen")
    print("4. Anomalieerkennung in Ernährungsdaten")
    print("5. Empfehlungssysteme für Ernährungsinterventionen")
    
    print("\nAlle Visualisierungen wurden gespeichert!")

if __name__ == "__main__":
    main()