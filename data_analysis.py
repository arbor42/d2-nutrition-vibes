import pandas as pd
import numpy as np
import json
import warnings
warnings.filterwarnings('ignore')

print("=== FAO DATENANALYSE: FOOD_SUPPLY_KCAL PROBLEME ===\n")

# 1. Lade FAO Originaldaten
print("1. Lade FAO Originaldatensatz...")
fao_data = pd.read_csv('/home/lkoehler/d2-nutrition-vibes/py/fao.csv')
print(f"✓ Geladen: {fao_data.shape[0]:,} Zeilen, {fao_data.shape[1]} Spalten")

# 2. Analysiere verfügbare Elemente
print("\n2. Verfügbare Datentypen (Elemente):")
elements = fao_data['Element'].value_counts()
for element, count in elements.head(15).items():
    print(f"  - {element}: {count:,} Einträge")

# 3. Fokus auf food_supply_kcal Daten
print("\n3. Analysiere Food Supply Kaloriendaten...")
kcal_data = fao_data[fao_data['Element'] == 'Food supply (kcal/capita/day)'].copy()
print(f"✓ Food supply kcal Einträge: {len(kcal_data):,}")

print("\nVerfügbare Jahre für Kaloriendaten:")
years = sorted(kcal_data['Year'].unique())
print(f"  {years}")

print("\nAnzahl Länder pro Jahr:")
for year in [2020, 2021, 2022]:
    if year in years:
        countries_year = kcal_data[kcal_data['Year'] == year]['Area'].nunique()
        print(f"  {year}: {countries_year} Länder")

# 4. Analysiere Sojabohnen spezifisch
print("\n4. SOJABOHNEN-ANALYSE:")
soybean_data = kcal_data[kcal_data['Item'].str.contains('Soya', case=False, na=False)]
print(f"✓ Sojabohnen Kaloriendaten gefunden: {len(soybean_data)} Einträge")

if len(soybean_data) > 0:
    print("\nSojabohnen Items gefunden:")
    for item in soybean_data['Item'].unique():
        print(f"  - {item}")
    
    print("\nSojabohnen 2022 Daten (erste 10 Länder):")
    soy_2022 = soybean_data[soybean_data['Year'] == 2022].head(10)
    for _, row in soy_2022.iterrows():
        print(f"  {row['Area']}: {row['Value']:.2f} kcal/capita/day")

# 5. Vergleiche mit aktueller timeseries.json
print("\n5. Vergleiche mit aktueller timeseries.json...")
try:
    with open('/home/lkoehler/d2-nutrition-vibes/public/data/fao/timeseries.json', 'r') as f:
        timeseries_data = json.load(f)
    
    print(f"✓ Timeseries geladen: {len(timeseries_data)} Einträge")
    
    # Suche nach Sojabohnen in timeseries
    soy_timeseries = [item for item in timeseries_data if 'soya' in item['item'].lower()]
    print(f"✓ Sojabohnen in timeseries gefunden: {len(soy_timeseries)}")
    
    if soy_timeseries:
        for soy_item in soy_timeseries[:3]:  # Erste 3 anzeigen
            print(f"\n  Item: {soy_item['item']} ({soy_item['country']})")
            
            # Finde 2022 Daten
            data_2022 = [d for d in soy_item['data'] if d['year'] == 2022]
            if data_2022:
                d = data_2022[0]
                kcal_val = d.get('food_supply_kcal', 'N/A')
                print(f"    2022 food_supply_kcal: {kcal_val}")
                
                # Zeige auch andere Metriken
                for key in ['production', 'imports', 'domestic_supply']:
                    if key in d:
                        print(f"    2022 {key}: {d[key]}")

except Exception as e:
    print(f"❌ Fehler beim Laden der timeseries.json: {e}")

# 6. Analysiere alle Nahrungsmittel mit extrem niedrigen Kalorienwerten
print("\n6. ANOMALE KALORIENWERTE ANALYSE:")
kcal_2022 = kcal_data[kcal_data['Year'] == 2022].copy()

# Filtere nach Items (nicht Grand Total oder Aggregate)
individual_items = kcal_2022[~kcal_2022['Item'].isin(['Grand Total', 'Total'])].copy()

if len(individual_items) > 0:
    print(f"✓ Einzelprodukte 2022: {len(individual_items)} Einträge")
    
    # Finde extrem niedrige Werte (< 5 kcal/capita/day für ganze Produktkategorien)
    low_kcal = individual_items[individual_items['Value'] < 5]
    print(f"✓ Produkte mit < 5 kcal/capita/day: {len(low_kcal)}")
    
    if len(low_kcal) > 0:
        print("\nProdukte mit verdächtig niedrigen Kalorienwerten 2022:")
        for item, group in low_kcal.groupby('Item'):
            avg_value = group['Value'].mean()
            count = len(group)
            print(f"  - {item}: {avg_value:.2f} kcal/capita/day (in {count} Ländern)")

print("\n=== ANALYSE ABGESCHLOSSEN ===")