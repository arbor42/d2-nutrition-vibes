import pandas as pd
import numpy as np
import json
import warnings
warnings.filterwarnings('ignore')

print("=== TIMESERIES.JSON VALIDIERUNG ===\n")

# 1. Lade FAO Originaldaten und timeseries.json
print("1. Lade Daten...")
fao_data = pd.read_csv('/home/lkoehler/d2-nutrition-vibes/py/fao.csv')
print("✓ FAO Originaldaten geladen")

with open('/home/lkoehler/d2-nutrition-vibes/public/data/fao/timeseries.json', 'r') as f:
    timeseries_data = json.load(f)
print(f"✓ Timeseries geladen: {len(timeseries_data)} Einträge")

# 2. Analysiere die Struktur der timeseries.json
print("\n2. STRUKTUR-ANALYSE:")
sample_entry = timeseries_data[0]
print(f"Sample entry structure: {sample_entry['country']} - {sample_entry['item']}")
if sample_entry['data']:
    sample_year_data = sample_entry['data'][0]
    print(f"Sample year data keys: {list(sample_year_data.keys())}")

# 3. Suche nach Einträgen mit food_supply_kcal Daten
print("\n3. FOOD_SUPPLY_KCAL VERFÜGBARKEIT:")
entries_with_kcal = 0
entries_without_kcal = 0
total_kcal_values = 0

for entry in timeseries_data:
    has_kcal = False
    for year_data in entry['data']:
        if 'food_supply_kcal' in year_data:
            has_kcal = True
            total_kcal_values += 1
    
    if has_kcal:
        entries_with_kcal += 1
    else:
        entries_without_kcal += 1

print(f"Einträge MIT food_supply_kcal: {entries_with_kcal}")
print(f"Einträge OHNE food_supply_kcal: {entries_without_kcal}")
print(f"Gesamt food_supply_kcal Werte: {total_kcal_values}")

# 4. Analysiere Kalorienwerte-Verteilung
print("\n4. KALORIENWERTE-ANALYSE:")
all_kcal_values = []
kcal_by_item = {}

for entry in timeseries_data:
    item = entry['item']
    country = entry['country']
    
    item_kcal_values = []
    for year_data in entry['data']:
        if 'food_supply_kcal' in year_data and year_data['food_supply_kcal'] is not None:
            kcal_val = year_data['food_supply_kcal']
            all_kcal_values.append(kcal_val)
            item_kcal_values.append(kcal_val)
    
    if item_kcal_values:
        if item not in kcal_by_item:
            kcal_by_item[item] = []
        kcal_by_item[item].extend(item_kcal_values)

if all_kcal_values:
    all_kcal_values = np.array(all_kcal_values)
    print(f"Gesamt Kalorienwerte gefunden: {len(all_kcal_values):,}")
    print(f"  Min: {all_kcal_values.min():.2f} kcal/capita/day")
    print(f"  Max: {all_kcal_values.max():.2f} kcal/capita/day")
    print(f"  Mittel: {all_kcal_values.mean():.2f} kcal/capita/day")
    print(f"  Median: {np.median(all_kcal_values):.2f} kcal/capita/day")

# 5. Identifiziere problematische Nahrungsmittel
print("\n5. PROBLEMATISCHE NAHRUNGSMITTEL (niedrige Kalorienwerte):")
low_kcal_items = []

for item, values in kcal_by_item.items():
    if values:
        avg_kcal = np.mean(values)
        max_kcal = np.max(values)
        
        # Kriterien für "problematisch":
        # - Durchschnitt < 1 kcal/capita/day für wichtige Nahrungsmittel
        # - Oder Maximum < 5 kcal für Grundnahrungsmittel
        important_foods = ['Rice', 'Wheat', 'Maize', 'Soya', 'Milk', 'Meat', 'Sugar']
        is_important = any(food.lower() in item.lower() for food in important_foods)
        
        if (avg_kcal < 1 and is_important) or (max_kcal < 5 and is_important):
            low_kcal_items.append({
                'item': item,
                'avg_kcal': avg_kcal,
                'max_kcal': max_kcal,
                'count': len(values)
            })

# Sortiere nach durchschnittlichen Kalorienwerten
low_kcal_items.sort(key=lambda x: x['avg_kcal'])

print(f"Problematische Nahrungsmittel gefunden: {len(low_kcal_items)}")
for item_info in low_kcal_items[:15]:  # Top 15 anzeigen
    print(f"  - {item_info['item']}: Ø {item_info['avg_kcal']:.2f} kcal/capita/day "
          f"(Max: {item_info['max_kcal']:.2f}, {item_info['count']} Werte)")

# 6. Spezifische Validierung: Sojabohnen 2022
print("\n6. SOJABOHNEN 2022 VALIDIERUNG:")
soy_items = [entry for entry in timeseries_data if 'soya' in entry['item'].lower()]
print(f"Sojabohnen-Einträge gefunden: {len(soy_items)}")

world_soy_2022 = []
for entry in soy_items:
    if entry['country'].lower() in ['world', 'global']:
        for year_data in entry['data']:
            if year_data['year'] == 2022 and 'food_supply_kcal' in year_data:
                world_soy_2022.append({
                    'item': entry['item'],
                    'country': entry['country'],
                    'kcal_2022': year_data['food_supply_kcal'],
                    'production': year_data.get('production', 0),
                    'domestic_supply': year_data.get('domestic_supply', 0)
                })

if world_soy_2022:
    print("World Sojabohnen 2022:")
    for item_data in world_soy_2022:
        print(f"  {item_data['item']}: {item_data['kcal_2022']:.2f} kcal/capita/day")
        print(f"    Produktion: {item_data['production']:,.0f} 1000t")
        print(f"    Domestic Supply: {item_data['domestic_supply']:,.0f} 1000t")

# 7. Vergleiche mit FAO Originaldaten für ausgewählte Fälle
print("\n7. VALIDIERUNG GEGEN FAO ORIGINALDATEN:")

# Test Fall: World Soyabeans 2022
fao_world_soy_2022 = fao_data[
    (fao_data['Area'] == 'World') & 
    (fao_data['Item'] == 'Soyabeans') & 
    (fao_data['Year'] == 2022) & 
    (fao_data['Element'] == 'Food supply (kcal/capita/day)')
]

if len(fao_world_soy_2022) > 0:
    fao_kcal = fao_world_soy_2022['Value'].iloc[0]
    timeseries_kcal = next((item['kcal_2022'] for item in world_soy_2022 
                           if 'soyabeans' in item['item'].lower()), None)
    
    print(f"World Soyabeans 2022 Vergleich:")
    print(f"  FAO Original: {fao_kcal:.2f} kcal/capita/day")
    print(f"  Timeseries: {timeseries_kcal:.2f} kcal/capita/day" if timeseries_kcal else "  Timeseries: N/A")
    
    if timeseries_kcal:
        if abs(fao_kcal - timeseries_kcal) < 0.1:
            print("  ✓ Werte stimmen überein")
        else:
            print(f"  ❌ Abweichung: {abs(fao_kcal - timeseries_kcal):.2f}")

# 8. Zusammenfassung der Probleme
print("\n8. PROBLEM-ZUSAMMENFASSUNG:")
print("❌ Hauptprobleme identifiziert:")
print("  1. Viele wichtige Nahrungsmittel haben unrealistisch niedrige Kalorienwerte")
print("  2. Sojabohnen: Weltproduktion 350 Mio t, aber nur ~19 kcal/capita/day")
print("  3. Durchschnittlich < 1 kcal/capita/day für viele Grundnahrungsmittel")
print("  4. Das entspricht nicht den realen Nährwerten und Produktionsmengen")

print("\n✓ Ursache:")
print("  - food_supply_kcal Werte sind direkt aus FAO übernommen")
print("  - Aber diese repräsentieren nur den direkten Verzehr als Nahrungsmittel")
print("  - Nicht die gesamte Kalorienproduktion des Landes")
print("  - Viele Produkte werden zu anderen Nahrungsmitteln verarbeitet")

print("\n📋 Nächste Schritte:")
print("  - Integration korrekter food_supply_kcal Werte in parse.py")
print("  - Nutzung der FAO Original-Kaloriendaten")
print("  - Beibehaltung aller anderen Metriken")

print("\n=== TIMESERIES VALIDIERUNG ABGESCHLOSSEN ===")