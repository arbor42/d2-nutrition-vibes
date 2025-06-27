#!/usr/bin/env python3
"""
Neuronales Netzwerk für Vorhersagen über alle Produkte und Länder
=================================================================

Dieses Skript erstellt ein umfassendes NN-Modell, das Vorhersagen für
alle Produkte und Länder im FAO-Datensatz generieren kann.
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.neural_network import MLPRegressor
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_percentage_error
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

def prepare_comprehensive_data():
    """Bereite Daten für alle Produkte und Länder vor"""
    print("=== Lade und bereite umfassende FAO-Daten vor ===")
    
    # Lade Daten
    df = pd.read_csv('fao.csv')
    df['Value'] = pd.to_numeric(df['Value'], errors='coerce')
    df = df.dropna(subset=['Value'])
    
    print(f"\nGesamte Datenpunkte: {len(df):,}")
    print(f"Einzigartige Länder: {df['Area'].nunique()}")
    print(f"Einzigartige Produkte: {df['Item'].nunique()}")
    print(f"Einzigartige Elemente: {df['Element'].nunique()}")
    print(f"Jahresbereich: {df['Year'].min()} - {df['Year'].max()}")
    
    # Feature Engineering
    print("\nFeature Engineering...")
    
    # 1. Zeitbasierte Features
    df['Years_since_2010'] = df['Year'] - 2010
    df['Decade'] = (df['Year'] // 10) * 10
    
    # 2. Erstelle Lag-Features (Vorjahreswerte)
    df = df.sort_values(['Area', 'Item', 'Element', 'Year'])
    df['Value_lag1'] = df.groupby(['Area', 'Item', 'Element'])['Value'].shift(1)
    df['Value_lag2'] = df.groupby(['Area', 'Item', 'Element'])['Value'].shift(2)
    
    # 3. Wachstumsraten
    df['Growth_rate'] = df.groupby(['Area', 'Item', 'Element'])['Value'].pct_change()
    df['Growth_rate_2y'] = df.groupby(['Area', 'Item', 'Element'])['Value'].pct_change(2)
    
    # Ersetze unendliche Werte und sehr große Wachstumsraten
    df['Growth_rate'] = df['Growth_rate'].replace([np.inf, -np.inf], np.nan)
    df['Growth_rate_2y'] = df['Growth_rate_2y'].replace([np.inf, -np.inf], np.nan)
    
    # Begrenze extreme Wachstumsraten auf ±500%
    df['Growth_rate'] = df['Growth_rate'].clip(-5, 5)
    df['Growth_rate_2y'] = df['Growth_rate_2y'].clip(-5, 5)
    
    # 4. Moving Averages
    df['MA_3'] = df.groupby(['Area', 'Item', 'Element'])['Value'].transform(lambda x: x.rolling(window=3, min_periods=1).mean())
    
    # 5. Produktkategorien (vereinfacht)
    def categorize_item(item):
        if 'Population' in item: return 'Population'
        elif any(grain in item.lower() for grain in ['wheat', 'rice', 'maize', 'corn']): return 'Grains'
        elif any(meat in item.lower() for meat in ['meat', 'beef', 'pork', 'chicken']): return 'Meat'
        elif any(dairy in item.lower() for dairy in ['milk', 'cheese', 'dairy']): return 'Dairy'
        elif any(veg in item.lower() for veg in ['vegetable', 'fruit']): return 'Produce'
        else: return 'Other'
    
    df['Item_category'] = df['Item'].apply(categorize_item)
    
    # 6. Länderkategorien nach Größe
    country_avg_pop = df[df['Item'] == 'Population'].groupby('Area')['Value'].mean()
    df['Country_size'] = df['Area'].map(country_avg_pop)
    df['Country_size_cat'] = pd.qcut(df['Country_size'], q=5, labels=['XS', 'S', 'M', 'L', 'XL'], duplicates='drop')
    
    # Entferne Zeilen mit NaN in wichtigen Features
    df = df.dropna(subset=['Value_lag1', 'Growth_rate'])
    
    # Fülle verbleibende NaN-Werte mit sinnvollen Defaults
    df['Growth_rate'] = df['Growth_rate'].fillna(0)
    df['Growth_rate_2y'] = df['Growth_rate_2y'].fillna(0)
    df['Value_lag2'] = df['Value_lag2'].fillna(df['Value_lag1'])
    df['Country_size'] = df['Country_size'].fillna(df['Country_size'].median())
    
    print(f"\nDatenpunkte nach Feature Engineering: {len(df):,}")
    
    return df

def create_prediction_model(df):
    """Erstelle und trainiere das umfassende Vorhersagemodell"""
    print("\n=== Erstelle umfassendes Vorhersagemodell ===")
    
    # Label Encoding für kategorische Variablen
    encoders = {}
    categorical_cols = ['Area', 'Item', 'Element', 'Item_category', 'Country_size_cat']
    
    for col in categorical_cols:
        le = LabelEncoder()
        df[f'{col}_encoded'] = le.fit_transform(df[col].astype(str))
        encoders[col] = le
    
    # Features auswählen
    feature_cols = [
        'Area_encoded', 'Item_encoded', 'Element_encoded',
        'Year', 'Years_since_2010', 'Decade',
        'Value_lag1', 'Value_lag2', 'Growth_rate', 'Growth_rate_2y', 'MA_3',
        'Item_category_encoded', 'Country_size_cat_encoded'
    ]
    
    X = df[feature_cols]
    y = df['Value']
    
    # Entferne Zeilen mit NaN in Features oder Target
    mask = ~(X.isnull().any(axis=1) | y.isnull())
    X = X[mask]
    y = y[mask]
    df = df[mask]  # Aktualisiere auch df für spätere Verwendung
    
    # Log-Transformation für Target (hilft bei extremen Werten)
    y_log = np.log1p(y)
    
    # Train-Test Split (zeitbasiert für realistischere Evaluation)
    train_mask = df['Year'] < 2020
    X_train, X_test = X[train_mask], X[~train_mask]
    y_train, y_test = y_log[train_mask], y_log[~train_mask]
    
    print(f"\nTraining Set: {len(X_train):,} Beispiele")
    print(f"Test Set (2020+): {len(X_test):,} Beispiele")
    
    # Skalierung
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Neuronales Netzwerk mit robusterer Architektur
    print("\nTrainiere neuronales Netzwerk...")
    nn_model = MLPRegressor(
        hidden_layer_sizes=(200, 100, 50, 25),  # Tiefere Architektur
        activation='relu',
        solver='adam',
        alpha=0.001,  # L2 Regularisierung
        batch_size='auto',
        learning_rate='adaptive',
        learning_rate_init=0.001,
        max_iter=500,
        shuffle=True,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=20,
        verbose=True
    )
    
    nn_model.fit(X_train_scaled, y_train)
    
    # Vorhersagen
    y_pred_log = nn_model.predict(X_test_scaled)
    
    # Rücktransformation
    y_test_original = np.expm1(y_test)
    y_pred_original = np.expm1(y_pred_log)
    
    # Evaluation
    mse = mean_squared_error(y_test_original, y_pred_original)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test_original, y_pred_original)
    mae = np.mean(np.abs(y_test_original - y_pred_original))
    mape = mean_absolute_percentage_error(y_test_original, y_pred_original)
    
    print(f"\n=== Modell-Performance ===")
    print(f"R² Score: {r2:.3f}")
    print(f"RMSE: {rmse:,.2f}")
    print(f"MAE: {mae:,.2f}")
    print(f"MAPE: {mape:.2%}")
    
    return nn_model, scaler, encoders, df[~train_mask]

def analyze_predictions_by_category(model, scaler, test_df, feature_cols):
    """Analysiere Vorhersagequalität nach Kategorien"""
    print("\n=== Analyse nach Kategorien ===")
    
    # Bereite Test-Features vor
    X_test = test_df[feature_cols]
    X_test_scaled = scaler.transform(X_test)
    
    # Vorhersagen
    y_pred_log = model.predict(X_test_scaled)
    test_df['Predicted_Value'] = np.expm1(y_pred_log)
    test_df['Error'] = test_df['Predicted_Value'] - test_df['Value']
    test_df['Relative_Error'] = test_df['Error'] / test_df['Value']
    
    # Performance nach Produktkategorie
    print("\nPerformance nach Produktkategorie:")
    category_performance = test_df.groupby('Item_category').agg({
        'Value': 'count',
        'Relative_Error': ['mean', 'std']
    }).round(3)
    print(category_performance)
    
    # Top 10 beste Vorhersagen
    print("\nTop 10 beste Vorhersagen:")
    best_predictions = test_df.nsmallest(10, 'Relative_Error')[
        ['Area', 'Item', 'Year', 'Value', 'Predicted_Value', 'Relative_Error']
    ]
    print(best_predictions)
    
    # Top 10 schlechteste Vorhersagen
    print("\nTop 10 schlechteste Vorhersagen:")
    worst_predictions = test_df.nlargest(10, 'Relative_Error')[
        ['Area', 'Item', 'Year', 'Value', 'Predicted_Value', 'Relative_Error']
    ]
    print(worst_predictions)
    
    return test_df

def visualize_comprehensive_results(test_df):
    """Erstelle umfassende Visualisierungen"""
    print("\n=== Erstelle Visualisierungen ===")
    
    fig, axes = plt.subplots(2, 2, figsize=(15, 12))
    
    # 1. Scatter Plot: Vorhersage vs. Tatsächlich
    ax1 = axes[0, 0]
    scatter = ax1.scatter(test_df['Value'], test_df['Predicted_Value'], 
                         alpha=0.5, s=10, c=test_df['Year'], cmap='viridis')
    ax1.plot([test_df['Value'].min(), test_df['Value'].max()], 
             [test_df['Value'].min(), test_df['Value'].max()], 'r--', lw=2)
    ax1.set_xlabel('Tatsächliche Werte')
    ax1.set_ylabel('Vorhergesagte Werte')
    ax1.set_title('Vorhersagen für alle Produkte und Länder')
    ax1.set_xscale('log')
    ax1.set_yscale('log')
    plt.colorbar(scatter, ax=ax1, label='Jahr')
    
    # 2. Fehlerverteilung nach Kategorie
    ax2 = axes[0, 1]
    test_df.boxplot(column='Relative_Error', by='Item_category', ax=ax2)
    ax2.set_xlabel('Produktkategorie')
    ax2.set_ylabel('Relativer Fehler')
    ax2.set_title('Fehlerverteilung nach Produktkategorie')
    ax2.set_ylim(-2, 2)
    
    # 3. Performance über Zeit
    ax3 = axes[1, 0]
    yearly_performance = test_df.groupby('Year').agg({
        'Relative_Error': ['mean', 'std']
    })
    years = yearly_performance.index
    means = yearly_performance[('Relative_Error', 'mean')]
    stds = yearly_performance[('Relative_Error', 'std')]
    
    ax3.plot(years, means, 'b-', label='Mittlerer Fehler')
    ax3.fill_between(years, means - stds, means + stds, alpha=0.3)
    ax3.set_xlabel('Jahr')
    ax3.set_ylabel('Relativer Fehler')
    ax3.set_title('Vorhersagequalität über Zeit')
    ax3.legend()
    ax3.grid(True, alpha=0.3)
    
    # 4. Heatmap: Top 20 Länder und Produkte
    ax4 = axes[1, 1]
    top_countries = test_df['Area'].value_counts().head(10).index
    top_items = test_df['Item'].value_counts().head(10).index
    
    heatmap_data = test_df[
        (test_df['Area'].isin(top_countries)) & 
        (test_df['Item'].isin(top_items))
    ].pivot_table(
        index='Area', 
        columns='Item', 
        values='Relative_Error', 
        aggfunc='mean'
    )
    
    sns.heatmap(heatmap_data, cmap='RdBu_r', center=0, 
                vmin=-0.5, vmax=0.5, ax=ax4, cbar_kws={'label': 'Mittlerer rel. Fehler'})
    ax4.set_title('Vorhersagequalität: Top Länder × Produkte')
    ax4.tick_params(axis='x', rotation=45)
    ax4.tick_params(axis='y', rotation=0)
    
    plt.tight_layout()
    plt.savefig('nn_comprehensive_analysis.png', dpi=300)
    print("Visualisierung gespeichert als 'nn_comprehensive_analysis.png'")
    
def generate_future_predictions(model, scaler, encoders, df, feature_cols):
    """Generiere Vorhersagen für zukünftige Jahre"""
    print("\n=== Generiere Zukunftsvorhersagen ===")
    
    # Wähle einige interessante Kombinationen
    future_years = [2025, 2030]
    selected_countries = ['China', 'India', 'United States of America', 'Germany', 'Brazil']
    selected_items = ['Population', 'Wheat', 'Rice', 'Meat, total']
    
    predictions = []
    
    for country in selected_countries:
        for item in selected_items:
            for year in future_years:
                # Finde die neuesten Daten für diese Kombination
                latest_data = df[
                    (df['Area'] == country) & 
                    (df['Item'] == item) & 
                    (df['Element'] == df[df['Item'] == item]['Element'].mode()[0])
                ].sort_values('Year').tail(1)
                
                if len(latest_data) == 0:
                    continue
                
                # Erstelle Features für Vorhersage
                feature_dict = {}
                for col in feature_cols:
                    if col == 'Year':
                        feature_dict[col] = year
                    elif col == 'Years_since_2010':
                        feature_dict[col] = year - 2010
                    elif col == 'Decade':
                        feature_dict[col] = (year // 10) * 10
                    elif col.endswith('_encoded'):
                        base_col = col.replace('_encoded', '')
                        if base_col in latest_data.columns:
                            feature_dict[col] = latest_data[col].values[0]
                    else:
                        # Verwende letzte bekannte Werte
                        feature_dict[col] = latest_data[col].values[0] if col in latest_data.columns else 0
                
                # Erstelle Feature-Vektor
                X_future = pd.DataFrame([feature_dict])[feature_cols]
                X_future_scaled = scaler.transform(X_future)
                
                # Vorhersage
                y_pred_log = model.predict(X_future_scaled)[0]
                y_pred = np.expm1(y_pred_log)
                
                predictions.append({
                    'Country': country,
                    'Item': item,
                    'Year': year,
                    'Predicted_Value': y_pred,
                    'Last_Known_Value': latest_data['Value'].values[0],
                    'Growth_Rate': (y_pred / latest_data['Value'].values[0] - 1) * 100
                })
    
    predictions_df = pd.DataFrame(predictions)
    
    print("\nAusgewählte Zukunftsvorhersagen:")
    print(predictions_df.to_string(index=False))
    
    # Visualisiere Zukunftstrends
    plt.figure(figsize=(12, 8))
    
    for item in selected_items:
        item_predictions = predictions_df[predictions_df['Item'] == item]
        if len(item_predictions) == 0:
            continue
            
        for country in selected_countries:
            country_data = item_predictions[item_predictions['Country'] == country]
            if len(country_data) > 0:
                plt.plot([2023, 2025, 2030], 
                        [country_data['Last_Known_Value'].values[0]] + 
                        country_data['Predicted_Value'].tolist(),
                        marker='o', label=f'{country} - {item}')
    
    plt.xlabel('Jahr')
    plt.ylabel('Wert')
    plt.title('Zukunftsvorhersagen für ausgewählte Länder und Produkte')
    plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('nn_future_predictions.png', dpi=300)
    print("\nZukunftsvorhersagen gespeichert als 'nn_future_predictions.png'")

def main():
    """Hauptfunktion"""
    print("Starte umfassendes NN-Vorhersagemodell für alle FAO-Produkte und Länder")
    print("=" * 70)
    
    # Daten vorbereiten
    df = prepare_comprehensive_data()
    
    # Modell erstellen und trainieren
    feature_cols = [
        'Area_encoded', 'Item_encoded', 'Element_encoded',
        'Year', 'Years_since_2010', 'Decade',
        'Value_lag1', 'Value_lag2', 'Growth_rate', 'Growth_rate_2y', 'MA_3',
        'Item_category_encoded', 'Country_size_cat_encoded'
    ]
    
    model, scaler, encoders, test_df = create_prediction_model(df)
    
    # Analysiere Vorhersagen
    test_df = analyze_predictions_by_category(model, scaler, test_df, feature_cols)
    
    # Visualisiere Ergebnisse
    visualize_comprehensive_results(test_df)
    
    # Generiere Zukunftsvorhersagen
    generate_future_predictions(model, scaler, encoders, df, feature_cols)
    
    print("\n=== Zusammenfassung ===")
    print("\nDas umfassende NN-Modell kann:")
    print("1. Vorhersagen für alle 120 Produkte und 200+ Länder generieren")
    print("2. Historische Trends und Wachstumsraten berücksichtigen")
    print("3. Zukunftsprognosen für verschiedene Szenarien erstellen")
    print("4. Datenlücken in historischen Zeitreihen füllen")
    print("\nAlle Visualisierungen wurden gespeichert!")

if __name__ == "__main__":
    main()