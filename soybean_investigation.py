import pandas as pd
import numpy as np
import json
import warnings
warnings.filterwarnings('ignore')

print("=== SOJABOHNEN 2022 SPEZIAL-INVESTIGATION ===\n")

# 1. Lade Daten
fao_data = pd.read_csv('/home/lkoehler/d2-nutrition-vibes/py/fao.csv')
print("✓ FAO Daten geladen")

# 2. Analysiere alle Sojabohnen-relevanten Daten für 2022
print("\n1. SOJABOHNEN ORIGINALDATEN 2022:")
soy_items = ['Soyabeans', 'Soyabean Oil']

for item in soy_items:
    print(f"\n--- {item} ---")
    item_data = fao_data[(fao_data['Item'] == item) & (fao_data['Year'] == 2022)]
    
    if len(item_data) > 0:
        print(f"Einträge gefunden: {len(item_data)}")
        
        # Analysiere nach Element
        elements = item_data['Element'].value_counts()
        print("Verfügbare Elemente:")
        for element, count in elements.items():
            print(f"  - {element}: {count} Länder")
        
        # Spezifisch food_supply_kcal
        kcal_data = item_data[item_data['Element'] == 'Food supply (kcal/capita/day)']
        if len(kcal_data) > 0:
            print(f"\nKaloriendaten für {len(kcal_data)} Länder:")
            
            # Statistiken
            values = kcal_data['Value'].dropna()
            if len(values) > 0:
                print(f"  Min: {values.min():.2f} kcal/capita/day")
                print(f"  Max: {values.max():.2f} kcal/capita/day") 
                print(f"  Mittel: {values.mean():.2f} kcal/capita/day")
                print(f"  Median: {values.median():.2f} kcal/capita/day")
                
                # Top 10 Länder
                top_countries = kcal_data.nlargest(10, 'Value')
                print(f"\n  Top 10 Länder für {item}:")
                for _, row in top_countries.iterrows():
                    print(f"    {row['Area']}: {row['Value']:.2f} kcal/capita/day")
        
        # Produktionsdaten
        prod_data = item_data[item_data['Element'] == 'Production']
        if len(prod_data) > 0:
            print(f"\nProduktionsdaten für {len(prod_data)} Länder:")
            values = prod_data['Value'].dropna()
            if len(values) > 0:
                print(f"  Gesamt-Weltproduktion: {values.sum():,.0f} {prod_data['Unit'].iloc[0]}")
                
                # Top 5 Produzenten
                top_producers = prod_data.nlargest(5, 'Value')
                print(f"  Top 5 Produzenten:")
                for _, row in top_producers.iterrows():
                    print(f"    {row['Area']}: {row['Value']:,.0f} {row['Unit']}")

# 3. Vergleiche mit timeseries.json
print("\n\n2. VERGLEICH MIT TIMESERIES.JSON:")
with open('/home/lkoehler/d2-nutrition-vibes/public/data/fao/timeseries.json', 'r') as f:
    timeseries_data = json.load(f)

soy_timeseries = [item for item in timeseries_data if 'soya' in item['item'].lower()]
print(f"✓ Sojabohnen Einträge in timeseries: {len(soy_timeseries)}")

# Analysiere die World/Global Sojabohnen Einträge
world_soy = [item for item in soy_timeseries if item['country'] in ['World', 'Global']]
print(f"✓ Welt-Sojabohnen Einträge: {len(world_soy)}")

for item in world_soy[:5]:  # Erste 5 anzeigen
    print(f"\n--- {item['item']} (World) ---")
    
    # Finde 2022 Daten
    data_2022 = [d for d in item['data'] if d['year'] == 2022]
    if data_2022:
        d = data_2022[0]
        print(f"2022 Daten:")
        for key, value in d.items():
            if key != 'year':
                print(f"  {key}: {value}")
    
    # Vergleiche mit 2021 um Trend zu sehen
    data_2021 = [d for d in item['data'] if d['year'] == 2021]
    if data_2021:
        d = data_2021[0]
        kcal_2021 = d.get('food_supply_kcal', 0)
        kcal_2022 = data_2022[0].get('food_supply_kcal', 0) if data_2022 else 0
        print(f"Kalorien-Änderung 2021->2022: {kcal_2021:.2f} -> {kcal_2022:.2f}")

# 4. Spezifische Länder-Analyse für bekannte Soja-Produzenten
print("\n\n3. TOP SOJA-PRODUZENTEN ANALYSE:")
major_producers = ['Brazil', 'United States of America', 'Argentina', 'China', 'India']

for country in major_producers:
    print(f"\n--- {country} ---")
    
    country_soy = [item for item in soy_timeseries 
                   if item['country'] == country and 'soyabeans' in item['item'].lower()]
    
    if country_soy:
        item = country_soy[0]  # Nimm den ersten Eintrag
        
        # 2022 Daten
        data_2022 = [d for d in item['data'] if d['year'] == 2022]
        if data_2022:
            d = data_2022[0]
            production = d.get('production', 0)
            kcal = d.get('food_supply_kcal', 0)
            domestic_supply = d.get('domestic_supply', 0)
            
            print(f"  Produktion 2022: {production:,.0f} {item['unit']}")
            print(f"  Domestic Supply 2022: {domestic_supply:,.0f} {item['unit']}")
            print(f"  Kalorien 2022: {kcal:.2f} kcal/capita/day")
            
            # Berechne theoretische Kalorien pro Tonne
            if production > 0 and kcal > 0:
                # Annahme: Sojabohnen haben etwa 4000 kcal/kg = 4,000,000 kcal/t
                theoretical_kcal_per_t = 4000000  # kcal pro Tonne
                
                # Berechne was die Kalorien bei der Produktion bedeuten würden
                # kcal/capita/day * Population * 365 days = total kcal/year
                # Das dann durch production = kcal pro Tonne in der Realität
                print(f"  [Diagnose: Diese Werte werden unten analysiert]")

# 5. Berechne das Problem: Das Verhältnis von Produktionsmengen zu Kalorien
print("\n\n4. PROBLEM-DIAGNOSE:")
print("Das Problem liegt wahrscheinlich in der Umrechnung von Produktionsmengen")
print("zu pro-Kopf-Kalorienwerten.")
print("\nTypische Nährwerte:")
print("  - Sojabohnen: ~4000 kcal/kg = 4,000,000 kcal/t")
print("  - Bei Weltproduktion von ~350 Mio t und 8 Mrd Menschen:")
print("  - Theoretisch verfügbar: ~175,000 kcal/capita/year") 
print("  - Das sind ~480 kcal/capita/day nur von Sojabohnen")
print("\nAber in timeseries.json sehen wir nur ~1-5 kcal/capita/day")
print("-> Faktor 100-500 zu niedrig!")

print("\n=== SOJABOHNEN INVESTIGATION ABGESCHLOSSEN ===")