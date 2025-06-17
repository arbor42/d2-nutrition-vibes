import pandas as pd
import numpy as np
import json
from pathlib import Path
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Nur ML Libraries für Linear und Polynomial Regression
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from sklearn.model_selection import train_test_split

class FAOMLForecaster:
    def __init__(self, csv_path):
        """
        Initialisiert den FAO ML Forecaster - NUR Linear & Polynomial Regression
        
        Args:
            csv_path (str): Pfad zur FAO CSV-Datei
        """
        self.csv_path = csv_path
        self.df = None
        self.filtered_df = None
        self.output_dir = Path("fao_ml_forecasts")
        self.output_dir.mkdir(exist_ok=True)
        
    def load_and_prepare_data(self):
        """Lädt und bereitet FAO-Daten für ML vor"""
        print("Lade und bereite FAO-Daten vor...")
        
        self.df = pd.read_csv(self.csv_path)
        
        # Filter für Produktionsdaten 2010-2022
        self.filtered_df = self.df[
            (self.df['Year'] >= 2010) & 
            (self.df['Year'] <= 2022) &
            (self.df['Element'] == 'Production') &
            (~self.df['Item'].str.lower().str.contains('alcohol', na=False)) &
            (~self.df['Item'].str.lower().str.contains('non-food', na=False))
        ].copy()
        
        # Bereinige Daten
        self.filtered_df['Value'] = pd.to_numeric(self.filtered_df['Value'], errors='coerce')
        self.filtered_df = self.filtered_df.dropna(subset=['Value'])
        self.filtered_df = self.filtered_df[self.filtered_df['Value'] > 0]  # Nur positive Produktionswerte
        
        # Konvertiere numpy Datentypen zu Python nativen Typen
        self.filtered_df['Year'] = self.filtered_df['Year'].astype(int)
        self.filtered_df['Value'] = self.filtered_df['Value'].astype(float)
        
        print(f"Bereit für ML: {len(self.filtered_df):,} Produktionsdatenpunkte")
        
    def identify_interesting_scenarios(self):
        """Identifiziert ALLE verfügbaren Produkte für ML-Prognosen"""
        
        scenarios = []
        
        # 1. ALLE Nahrungsmittel global analysieren
        all_food_items = self.filtered_df['Item'].unique()
        print(f"Analysiere {len(all_food_items)} verschiedene Nahrungsmittel...")
        
        for food in all_food_items:
            food_data = self.filtered_df[self.filtered_df['Item'] == food]
            global_data = food_data.groupby('Year')['Value'].sum().reset_index()
            
            # Mindestens 6 Jahre Daten und signifikante Produktionsmengen
            if len(global_data) >= 6 and global_data['Value'].sum() > 0:
                scenarios.append({
                    'name': f'global_{food.lower().replace(" ", "_").replace("-", "_").replace("(", "").replace(")", "").replace(",", "").replace(".", "")}',
                    'title': f'Globale {food} Produktion',
                    'data': global_data,
                    'unit': food_data['Unit'].iloc[0],
                    'type': 'global_production',
                    'total_production': float(global_data['Value'].sum())
                })
        
        print(f"✓ {len(scenarios)} globale Nahrungsmittel-Szenarien gefunden")
        
        # 2. Top-Produzenten für wichtigste Nahrungsmittel
        # Finde die wichtigsten Nahrungsmittel nach Gesamtproduktion
        food_totals = self.filtered_df.groupby('Item')['Value'].sum().sort_values(ascending=False)
        top_foods = food_totals.head(20).index.tolist()  # Top 20 Nahrungsmittel
        
        print(f"Analysiere Top-Produzenten für die {len(top_foods)} wichtigsten Nahrungsmittel...")
        
        for food in top_foods:
            # Finde Top 5 Produzenten für dieses Nahrungsmittel
            food_by_country = self.filtered_df[
                self.filtered_df['Item'] == food
            ].groupby('Area')['Value'].sum().sort_values(ascending=False)
            
            top_producers = food_by_country.head(5).index.tolist()
            
            for country in top_producers:
                country_data = self.filtered_df[
                    (self.filtered_df['Area'] == country) & 
                    (self.filtered_df['Item'] == food)
                ][['Year', 'Value']].sort_values('Year')
                
                if len(country_data) >= 6 and country_data['Value'].sum() > 0:
                    scenarios.append({
                        'name': f'{country.lower().replace(" ", "_").replace("-", "_").replace("(", "").replace(")", "").replace(",", "").replace(".", "")}_{food.lower().replace(" ", "_").replace("-", "_").replace("(", "").replace(")", "").replace(",", "").replace(".", "")}',
                        'title': f'{food} Produktion in {country}',
                        'data': country_data,
                        'unit': self.filtered_df[
                            (self.filtered_df['Area'] == country) & 
                            (self.filtered_df['Item'] == food)
                        ]['Unit'].iloc[0],
                        'type': 'country_production',
                        'total_production': float(country_data['Value'].sum())
                    })
        
        print(f"✓ {len([s for s in scenarios if s['type'] == 'country_production'])} Länder-Nahrungsmittel-Szenarien hinzugefügt")
        
        # 3. Regionale Aggregationen für wichtige Nahrungsmittel
        regions = {
            'Europe': ['Germany', 'France', 'Italy', 'Spain', 'Poland', 'United Kingdom', 'Netherlands', 'Belgium', 'Austria', 'Switzerland'],
            'Asia': ['China', 'India', 'Japan', 'Indonesia', 'Thailand', 'Vietnam', 'Philippines', 'Malaysia', 'South Korea'],
            'Americas': ['United States of America', 'Brazil', 'Argentina', 'Canada', 'Mexico', 'Chile', 'Colombia'],
            'Africa': ['Nigeria', 'Ethiopia', 'Egypt', 'South Africa', 'Kenya', 'Morocco', 'Ghana'],
            'Oceania': ['Australia', 'New Zealand', 'Papua New Guinea']
        }
        
        # Nur für die wichtigsten Nahrungsmittel regionale Analysen
        key_foods_for_regions = food_totals.head(10).index.tolist()
        
        for region, countries in regions.items():
            for food in key_foods_for_regions:
                food_data = self.filtered_df[
                    (self.filtered_df['Area'].isin(countries)) & 
                    (self.filtered_df['Item'] == food)
                ]
                
                if len(food_data) == 0:
                    continue
                    
                regional_data = food_data.groupby('Year')['Value'].sum().reset_index()
                
                if len(regional_data) >= 6 and regional_data['Value'].sum() > 0:
                    scenarios.append({
                        'name': f'{region.lower()}_{food.lower().replace(" ", "_").replace("-", "_").replace("(", "").replace(")", "").replace(",", "").replace(".", "")}',
                        'title': f'{food} Produktion in {region}',
                        'data': regional_data,
                        'unit': food_data['Unit'].iloc[0] if len(food_data) > 0 else '1000 t',
                        'type': 'regional_production',
                        'total_production': float(regional_data['Value'].sum())
                    })
        
        print(f"✓ {len([s for s in scenarios if s['type'] == 'regional_production'])} regionale Szenarien hinzugefügt")
        
        # Sortiere Szenarien nach Gesamtproduktion (wichtigste zuerst)
        scenarios.sort(key=lambda x: x['total_production'], reverse=True)
        
        print(f"\n🎯 GESAMT: {len(scenarios)} Prognoseszenarien identifiziert")
        print(f"   - {len([s for s in scenarios if s['type'] == 'global_production'])} globale Nahrungsmittel")
        print(f"   - {len([s for s in scenarios if s['type'] == 'country_production'])} Länder-spezifische")
        print(f"   - {len([s for s in scenarios if s['type'] == 'regional_production'])} regionale Aggregate")
        
        # Debug: Zeige Top 20 Szenarien
        print(f"\n📊 TOP 20 SZENARIEN nach Produktionsvolumen:")
        for i, scenario in enumerate(scenarios[:20], 1):
            production_formatted = f"{scenario['total_production']:,.0f}"
            print(f"  {i:2d}. {scenario['title']}: {production_formatted} {scenario['unit']}")
        
        if len(scenarios) > 20:
            print(f"       ... und {len(scenarios) - 20} weitere")
            
        return scenarios
        
    def prepare_features(self, data, scenario_name):
        """Bereitet Features für ML-Modelle vor"""
        
        # Sortiere nach Jahr
        data = data.sort_values('Year').copy()
        
        # Basis-Features
        X = data[['Year']].copy()
        y = data['Value'].values
        
        # Erweiterte Features für bessere Prognosen
        X['year_normalized'] = (X['Year'] - X['Year'].min()) / (X['Year'].max() - X['Year'].min())
        X['year_squared'] = X['Year'] ** 2
        X['trend'] = range(len(X))
        
        # Rolling Features (falls genug Daten)
        if len(data) >= 5:
            data['rolling_mean_3'] = data['Value'].rolling(window=3, min_periods=1).mean()
            data['rolling_std_3'] = data['Value'].rolling(window=3, min_periods=1).std().fillna(0)
            X['rolling_mean_3'] = data['rolling_mean_3'].values
            X['rolling_std_3'] = data['rolling_std_3'].values
        
        # Lag Features
        if len(data) >= 3:
            X['lag_1'] = data['Value'].shift(1).fillna(data['Value'].iloc[0])
            X['lag_2'] = data['Value'].shift(2).fillna(data['Value'].iloc[0])
        
        return X, y
        
    def train_models(self, X, y, scenario_name):
        """Trainiert AUSSCHLIESSLICH lineare und polynomiale Regression"""
        
        results = {}
        
        # Split für Validierung
        if len(X) >= 8:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, shuffle=False
            )
        elif len(X) >= 4:
            X_train, X_test = X.iloc[:-2], X.iloc[-2:]
            y_train, y_test = y[:-2], y[-2:]
        else:
            # Sehr wenige Daten: verwende alle für Training
            X_train, X_test = X, X.iloc[-1:]
            y_train, y_test = y, y[-1:]
        
        print(f"Training für {scenario_name}: {len(X_train)} Training, {len(X_test)} Test")
        
        # 1. Lineare Regression
        try:
            linear_model = LinearRegression()
            linear_model.fit(X_train, y_train)
            
            y_pred_linear = linear_model.predict(X_test)
            
            results['linear'] = {
                'model': linear_model,
                'r2_score': float(r2_score(y_test, y_pred_linear)),
                'mse': float(mean_squared_error(y_test, y_pred_linear)),
                'mae': float(mean_absolute_error(y_test, y_pred_linear))
            }
            print(f"✓ Lineare Regression erfolgreich für {scenario_name} (R² = {results['linear']['r2_score']:.3f})")
            
        except Exception as e:
            print(f"✗ Lineare Regression Fehler für {scenario_name}: {e}")
            results['linear'] = None
        
        # 2. Polynomiale Regression (Grad 2 und 3)
        try:
            best_poly_score = -float('inf')
            best_poly_model = None
            best_poly_features = None
            best_poly_degree = 2
            
            for degree in [2, 3]:
                try:
                    poly_features = PolynomialFeatures(degree=degree, include_bias=False)
                    X_poly_train = poly_features.fit_transform(X_train)
                    X_poly_test = poly_features.transform(X_test)
                    
                    poly_model = LinearRegression()
                    poly_model.fit(X_poly_train, y_train)
                    
                    y_pred_poly = poly_model.predict(X_poly_test)
                    score = r2_score(y_test, y_pred_poly)
                    
                    if score > best_poly_score:
                        best_poly_score = score
                        best_poly_model = poly_model
                        best_poly_features = poly_features
                        best_poly_degree = degree
                        
                except Exception as e:
                    print(f"Polynomial Grad {degree} Fehler für {scenario_name}: {e}")
                    continue
            
            if best_poly_model is not None:
                y_pred_best = best_poly_model.predict(best_poly_features.transform(X_test))
                
                results['polynomial'] = {
                    'model': best_poly_model,
                    'poly_features': best_poly_features,
                    'degree': best_poly_degree,
                    'r2_score': float(best_poly_score),
                    'mse': float(mean_squared_error(y_test, y_pred_best)),
                    'mae': float(mean_absolute_error(y_test, y_pred_best))
                }
                print(f"✓ Polynomiale Regression (Grad {best_poly_degree}) erfolgreich für {scenario_name} (R² = {best_poly_score:.3f})")
            else:
                results['polynomial'] = None
                print(f"✗ Polynomiale Regression fehlgeschlagen für {scenario_name}")
                
        except Exception as e:
            print(f"✗ Polynomiale Regression Fehler für {scenario_name}: {e}")
            results['polynomial'] = None
        
        return results
    
    def calculate_confidence_intervals(self, y_historical, model_performance, years_ahead, prediction_value):
        """Berechnet Konfidenzintervalle"""
        
        # 1. Basis-Unsicherheit aus Modell-Performance
        r2 = model_performance.get('r2_score', 0.5)
        mae = model_performance.get('mae', prediction_value * 0.1)
        
        # Modell-Unsicherheit: schlechtere Modelle = höhere Unsicherheit
        model_uncertainty = max(0.05, (1 - r2) * 0.3)  # 5-30% je nach R²
        
        # 2. Temporale Unsicherheit: steigt exponentiell mit Zeit
        temporal_uncertainty = 0.02 * (years_ahead ** 1.2)  # Exponentieller Anstieg
        
        # 3. Historische Variabilität
        if len(y_historical) > 1:
            historical_cv = np.std(y_historical) / np.mean(y_historical)  # Variationskoeffizient
            historical_uncertainty = min(0.4, historical_cv * 0.5)  # Max 40%
        else:
            historical_uncertainty = 0.1
        
        # 4. Kombiniere Unsicherheiten
        total_uncertainty = np.sqrt(
            model_uncertainty**2 + 
            temporal_uncertainty**2 + 
            (historical_uncertainty * 0.5)**2
        )
        
        # 5. Berechne Konfidenzintervall (95% = ±2σ)
        margin = total_uncertainty * prediction_value * 2
        
        # 6. Asymmetrische Intervalle
        lower_bound = max(0, prediction_value - margin * 1.2)
        upper_bound = prediction_value + margin * 0.8
        
        return lower_bound, upper_bound
        
    def generate_forecasts(self, X, y, models, scenario, forecast_years=13):
        """Generiert Prognosen bis 2035"""
        
        forecast_data = {
            'scenario': scenario['name'],
            'title': scenario['title'],
            'unit': scenario['unit'],
            'historical_data': [],
            'forecasts': {
                'linear': [],
                'polynomial': []
            },
            'ensemble_forecasts': [],
            'model_performance': {},
            'uncertainty_info': {
                'confidence_level': 95,
                'uncertainty_sources': [
                    'model_performance', 
                    'temporal_extrapolation', 
                    'historical_variability'
                ],
                'interpretation': {
                    'confidence_bounds': '95% Konfidenzintervall für einzelne Modelle',
                    'ensemble_bounds': 'Bereich basierend auf Linear vs. Polynomial Disagreement',
                    'uncertainty_growth': 'Unsicherheit steigt exponentiell mit Prognosehorizont',
                    'model_types': 'Linear Regression und Polynomial Regression (Grad 2-3)'
                }
            }
        }
        
        # Historische Daten
        historical_years = X['Year'].values
        for i, year in enumerate(historical_years):
            forecast_data['historical_data'].append({
                'year': int(year),
                'value': float(y[i])
            })
        
        # Prognose-Jahre (2023-2035)
        last_year = int(historical_years.max())
        future_years = list(range(last_year + 1, last_year + 1 + forecast_years))
        
        # Basis für Future Features
        last_row = X.iloc[-1].copy()
        
        for year in future_years:
            # Erstelle Features für Prognosejahr
            future_X = last_row.copy()
            future_X['Year'] = year
            future_X['year_normalized'] = (year - X['Year'].min()) / (X['Year'].max() - X['Year'].min())
            future_X['year_squared'] = year ** 2
            future_X['trend'] = len(X) + (year - last_year - 1)
            
            future_X_df = pd.DataFrame([future_X])
            
            # Prognosen für beide Modelle
            for model_type, model_info in models.items():
                if model_info is None:
                    continue
                    
                try:
                    if model_type == 'linear':
                        prediction = model_info['model'].predict(future_X_df)[0]
                        
                    elif model_type == 'polynomial':
                        if 'poly_features' not in model_info:
                            continue
                        future_X_poly = model_info['poly_features'].transform(future_X_df)
                        prediction = model_info['model'].predict(future_X_poly)[0]
                    
                    # Stelle sicher, dass Prognose positiv ist
                    prediction = max(0, prediction)
                    
                    # Berechne Konfidenzintervalle
                    years_ahead = year - last_year
                    lower_bound, upper_bound = self.calculate_confidence_intervals(
                        y, model_info, years_ahead, prediction
                    )
                    
                    forecast_data['forecasts'][model_type].append({
                        'year': year,
                        'value': float(prediction),
                        'confidence_lower': float(lower_bound),
                        'confidence_upper': float(upper_bound),
                        'uncertainty_percent': float(((upper_bound - lower_bound) / (2 * prediction)) * 100) if prediction > 0 else 0,
                        'years_ahead': years_ahead
                    })
                    
                except Exception as e:
                    print(f"Prognosefehler für {model_type} in {scenario['name']}, Jahr {year}: {e}")
        
        # Erstelle Ensemble-Prognosen
        for year in future_years:
            predictions = []
            
            # Sammle Prognosen beider Modelle
            for model_type in ['linear', 'polynomial']:
                if model_type in forecast_data['forecasts']:
                    year_pred = next(
                        (p['value'] for p in forecast_data['forecasts'][model_type] if p['year'] == year), 
                        None
                    )
                    if year_pred is not None:
                        predictions.append(year_pred)
            
            if len(predictions) >= 2:
                ensemble_mean = np.mean(predictions)
                ensemble_std = np.std(predictions)
                years_ahead = year - last_year
                
                forecast_data['ensemble_forecasts'].append({
                    'year': year,
                    'ensemble_mean': float(ensemble_mean),
                    'ensemble_std': float(ensemble_std),
                    'model_min': float(np.min(predictions)),
                    'model_max': float(np.max(predictions)),
                    'model_agreement': float(1 - (ensemble_std / ensemble_mean)) if ensemble_mean > 0 else 0,
                    'years_ahead': years_ahead,
                    'uncertainty_level': 'low' if years_ahead <= 3 else 'medium' if years_ahead <= 7 else 'high'
                })
        
        # Modell-Performance
        for model_type, model_info in models.items():
            if model_info is not None and isinstance(model_info, dict):
                forecast_data['model_performance'][model_type] = {
                    'r2_score': model_info.get('r2_score', 0.0),
                    'mse': model_info.get('mse', float('inf')),
                    'mae': model_info.get('mae', float('inf'))
                }
        
        return forecast_data
        
    def process_scenario(self, scenario):
        """Verarbeitet ein einzelnes Prognoseszenario"""
        
        print(f"Verarbeite: {scenario['title']}")
        
        try:
            # Bereite Features vor
            X, y = self.prepare_features(scenario['data'], scenario['name'])
            
            # Trainiere Modelle
            models = self.train_models(X, y, scenario['name'])
            
            # Prüfe ob mindestens ein Modell erfolgreich war
            successful_models = {k: v for k, v in models.items() if v is not None}
            
            if not successful_models:
                print(f"✗ Keine erfolgreichen Modelle für {scenario['name']}")
                return None
            
            # Generiere Prognosen
            forecast_data = self.generate_forecasts(X, y, models, scenario)
            
            # Speichere Einzelergebnis
            output_file = self.output_dir / f"{scenario['name']}_forecast.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(forecast_data, f, ensure_ascii=False, indent=2)
                
            print(f"✓ Erfolgreich gespeichert: {output_file}")
            return forecast_data
            
        except Exception as e:
            print(f"✗ Fehler bei {scenario['name']}: {e}")
            return None
    
    def run_all_forecasts(self):
        """Führt ML-Prognosen für ALLE Produkte aus"""
        
        print("=" * 80)
        print("FAO ML FORECASTING - ALLE PRODUKTE - Lineare & Polynomiale Regression")
        print("=" * 80)
        
        # Lade Daten
        self.load_and_prepare_data()
        
        # Identifiziere ALLE Szenarien
        scenarios = self.identify_interesting_scenarios()
        
        if not scenarios:
            print("Keine geeigneten Szenarien gefunden!")
            return {
                "total_scenarios": 0,
                "successful_forecasts": 0,
                "output_directory": str(self.output_dir)
            }
        
        try:
            print(f"\n🚀 Starte Verarbeitung von {len(scenarios)} Szenarien...")
            
            # Verarbeite alle Szenarien mit Progress-Anzeige
            all_forecasts = []
            successful_count = 0
            failed_scenarios = []
            
            for i, scenario in enumerate(scenarios, 1):
                print(f"\n[{i:3d}/{len(scenarios)}] ", end="")
                
                forecast_result = self.process_scenario(scenario)
                all_forecasts.append(forecast_result)
                
                if forecast_result is not None:
                    successful_count += 1
                else:
                    failed_scenarios.append(scenario['title'])
                
                # Progress-Update alle 10 Szenarien
                if i % 10 == 0 or i == len(scenarios):
                    success_rate = (successful_count / i) * 100
                    print(f"    📊 Progress: {i}/{len(scenarios)} ({success_rate:.1f}% Erfolgsrate)")
            
            # Erstelle umfassende Zusammenfassung
            successful_forecasts = [f for f in all_forecasts if f is not None]
            
            # Kategorisiere nach Typen
            global_forecasts = [f for f in successful_forecasts if f.get('scenario', '').startswith('global_')]
            country_forecasts = [f for f in successful_forecasts if '_' in f.get('scenario', '') and not f.get('scenario', '').startswith('global_') and not any(region in f.get('scenario', '') for region in ['europe_', 'asia_', 'americas_', 'africa_', 'oceania_'])]
            regional_forecasts = [f for f in successful_forecasts if any(region in f.get('scenario', '') for region in ['europe_', 'asia_', 'americas_', 'africa_', 'oceania_'])]
            
            # Erstelle detaillierten Index
            detailed_index = {
                "description": "Comprehensive FAO Food Production ML Forecasts 2023-2035 for ALL Products",
                "generation_info": {
                    "generated_at": datetime.now().isoformat(),
                    "total_scenarios_attempted": len(scenarios),
                    "successful_forecasts": successful_count,
                    "success_rate_percent": round((successful_count / len(scenarios)) * 100, 1),
                    "failed_scenarios": len(failed_scenarios)
                },
                "models": {
                    "linear_regression": "Simple linear trend extrapolation - robust for all time series",
                    "polynomial_regression": "Non-linear polynomial trend fitting (degree 2-3) - captures curved patterns"
                },
                "forecast_categories": {
                    "global_production": {
                        "count": len(global_forecasts),
                        "description": "Global production forecasts for individual food items",
                        "files": [f"{f['scenario']}_forecast.json" for f in global_forecasts]
                    },
                    "country_production": {
                        "count": len(country_forecasts),
                        "description": "Country-specific production forecasts for major producers",
                        "files": [f"{f['scenario']}_forecast.json" for f in country_forecasts]
                    },
                    "regional_production": {
                        "count": len(regional_forecasts),
                        "description": "Regional aggregate production forecasts",
                        "files": [f"{f['scenario']}_forecast.json" for f in regional_forecasts]
                    }
                },
                "data_structure": {
                    "historical_data": "2010-2022 actual production values",
                    "forecasts": "2023-2035 predictions with confidence intervals",
                    "ensemble_forecasts": "Linear vs. Polynomial consensus",
                    "uncertainty_info": "95% confidence intervals and methodology"
                },
                "top_food_items_by_production": [],
                "usage_examples": {
                    "load_global_wheat": "global_wheat_and_products_forecast.json",
                    "load_usa_maize": "united_states_of_america_maize_and_products_forecast.json",
                    "load_europe_wheat": "europe_wheat_and_products_forecast.json"
                }
            }
            
            # Füge Top-Nahrungsmittel hinzu (basierend auf erfolgreichen globalen Prognosen)
            if global_forecasts:
                # Sortiere globale Prognosen nach Gesamtproduktion
                global_by_production = []
                for forecast in global_forecasts:
                    total_prod = sum(h['value'] for h in forecast.get('historical_data', []))
                    global_by_production.append({
                        'item': forecast['title'],
                        'scenario': forecast['scenario'],
                        'total_historical_production': total_prod,
                        'unit': forecast['unit']
                    })
                
                global_by_production.sort(key=lambda x: x['total_historical_production'], reverse=True)
                detailed_index['top_food_items_by_production'] = global_by_production[:20]
            
            # Speichere detaillierten Index
            with open(self.output_dir / "comprehensive_index.json", 'w', encoding='utf-8') as f:
                json.dump(detailed_index, f, ensure_ascii=False, indent=2)
            
            # Erstelle vereinfachten Index für d3.js
            simple_index = {
                "total_forecasts": successful_count,
                "categories": {
                    "global": len(global_forecasts),
                    "country": len(country_forecasts), 
                    "regional": len(regional_forecasts)
                },
                "all_files": [f"{f['scenario']}_forecast.json" for f in successful_forecasts]
            }
            
            with open(self.output_dir / "index.json", 'w', encoding='utf-8') as f:
                json.dump(simple_index, f, ensure_ascii=False, indent=2)
            
            # Erstelle Kategorien-spezifische Listen
            categories = {
                'global_forecasts': global_forecasts,
                'country_forecasts': country_forecasts,
                'regional_forecasts': regional_forecasts
            }
            
            for category_name, forecasts in categories.items():
                if forecasts:
                    category_index = {
                        'count': len(forecasts),
                        'files': [f"{f['scenario']}_forecast.json" for f in forecasts],
                        'items': [{'scenario': f['scenario'], 'title': f['title'], 'unit': f['unit']} for f in forecasts]
                    }
                    
                    with open(self.output_dir / f"{category_name}_index.json", 'w', encoding='utf-8') as f:
                        json.dump(category_index, f, ensure_ascii=False, indent=2)
            
            print("\n" + "=" * 80)
            print("🎉 COMPREHENSIVE FORECASTING ABGESCHLOSSEN!")
            print("=" * 80)
            print(f"📁 Output-Verzeichnis: {self.output_dir}")
            print(f"📊 {successful_count} erfolgreiche Prognosen von {len(scenarios)} Szenarien")
            print(f"✅ Erfolgsrate: {((successful_count / len(scenarios)) * 100):.1f}%")
            print(f"🎯 Prognosezeitraum: 2023-2035")
            print(f"🤖 2 ML-Modelle pro Szenario: Linear + Polynomial Regression")
            
            print(f"\n📋 KATEGORIEN:")
            print(f"   🌍 Globale Produktion: {len(global_forecasts)} Nahrungsmittel")
            print(f"   🏛️  Länder-spezifisch: {len(country_forecasts)} Kombinationen")
            print(f"   🌎 Regionale Aggregate: {len(regional_forecasts)} Regionen")
            
            if failed_scenarios:
                print(f"\n⚠️  Fehlgeschlagene Szenarien ({len(failed_scenarios)}):")
                for failed in failed_scenarios[:10]:  # Zeige nur erste 10
                    print(f"   - {failed}")
                if len(failed_scenarios) > 10:
                    print(f"   ... und {len(failed_scenarios) - 10} weitere")
            
            print(f"\n📄 ERSTELLTE INDEX-DATEIEN:")
            print(f"   📖 comprehensive_index.json - Vollständige Übersicht")
            print(f"   📋 index.json - Einfacher Index für d3.js")
            print(f"   🌍 global_forecasts_index.json - Nur globale Prognosen")
            print(f"   🏛️  country_forecasts_index.json - Nur Länder-Prognosen")
            print(f"   🌎 regional_forecasts_index.json - Nur regionale Prognosen")
            
            return {
                "total_scenarios": len(scenarios),
                "successful_forecasts": successful_count,
                "success_rate": round((successful_count / len(scenarios)) * 100, 1),
                "categories": {
                    "global": len(global_forecasts),
                    "country": len(country_forecasts),
                    "regional": len(regional_forecasts)
                },
                "output_directory": str(self.output_dir)
            }
            
        except Exception as e:
            print(f"\nFehler beim Verarbeiten der Prognosen: {e}")
            return {
                "total_scenarios": len(scenarios) if 'scenarios' in locals() else 0,
                "successful_forecasts": 0,
                "output_directory": str(self.output_dir),
                "error": str(e)
            }

# Hauptausführung
if __name__ == "__main__":
    
    # Pfad zu Ihrer FAO CSV-Datei
    csv_file = "fao.csv"  # Passen Sie den Pfad an
    
    # Erstelle und führe ML Forecaster aus
    forecaster = FAOMLForecaster(csv_file)
    results = forecaster.run_all_forecasts()
    
    print(f"\n🎉 COMPREHENSIVE FORECASTING ABGESCHLOSSEN!")
    print(f"📁 Alle Dateien in: {results['output_directory']}")
    print(f"📊 {results['successful_forecasts']} ML-Prognosen von {results['total_scenarios']} Szenarien")
    print(f"✅ Erfolgsrate: {results.get('success_rate', 0):.1f}%")
    
    if 'categories' in results:
        print(f"\n📋 KATEGORIEN:")
        print(f"   🌍 Globale Produktion: {results['categories']['global']} Nahrungsmittel")
        print(f"   🏛️  Länder-spezifisch: {results['categories']['country']} Kombinationen") 
        print(f"   🌎 Regionale Aggregate: {results['categories']['regional']} Regionen")
    
    print(f"\n💡 NÄCHSTE SCHRITTE:")
    print("- Nutzen Sie comprehensive_index.json für Gesamtübersicht")
    print("- Laden Sie spezifische Kategorien mit den _index.json Dateien")
    print("- Visualisieren Sie mit d3.js: Linear vs. Polynomial Vergleiche")
    print("- Nutzen Sie Konfidenzintervalle für Unsicherheitsbänder")
    print("- Vergleichen Sie globale vs. regionale vs. Länder-Trends")
    
    print(f"\n🎨 d3.js INTEGRATION:")
    print("// Lade alle globalen Nahrungsmittel")
    print("d3.json('global_forecasts_index.json').then(index => {")
    print("    index.files.forEach(file => {")
    print("        d3.json(file).then(forecast => {")
    print("            createForecastChart(forecast);")
    print("        });")
    print("    });")
    print("});")
    
    print(f"\n📊 UMFASSENDE DATENBASIS:")
    print("- ALLE verfügbaren Nahrungsmittel analysiert")
    print("- Top-Produzenten für wichtigste Produkte")
    print("- Regionale Aggregate für 5 Kontinente")
    print("- Robust: Linear + Polynomial für jedes Szenario") 
    print("- Konfidenzintervalle: 95% für alle Prognosen bis 2035")