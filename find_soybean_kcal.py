import json

print("=== SUCHE SOJABOHNEN KALORIENWERTE 2022 ===\n")

# Lade timeseries.json
with open('/home/lkoehler/d2-nutrition-vibes/public/data/fao/timeseries.json', 'r') as f:
    timeseries_data = json.load(f)

print(f"Timeseries geladen: {len(timeseries_data)} Einträge")

# Suche nach Sojabohnen
soy_entries = [entry for entry in timeseries_data if 'soya' in entry['item'].lower()]
print(f"Sojabohnen-Einträge gefunden: {len(soy_entries)}")

print("\n=== SOJABOHNEN 2022 KALORIENWERTE ===")

for entry in soy_entries:
    if 'soyabeans' in entry['item'].lower():  # Nur Soyabeans, nicht Soyabean Oil
        # Finde 2022 Daten
        data_2022 = [d for d in entry['data'] if d['year'] == 2022]
        if data_2022:
            d = data_2022[0]
            if 'food_supply_kcal' in d:
                kcal_val = d['food_supply_kcal']
                country = entry['country']
                
                # Zeige alle Werte für bessere Analyse
                print(f"\n{country} - Soyabeans 2022:")
                print(f"  food_supply_kcal: {kcal_val}")
                if 'production' in d:
                    print(f"  production: {d['production']} {entry['unit']}")
                if 'domestic_supply' in d:
                    print(f"  domestic_supply: {d['domestic_supply']} {entry['unit']}")
                
                # Prüfe, ob das der "~1700 kcal" Wert sein könnte
                if isinstance(kcal_val, (int, float)) and 1500 <= kcal_val <= 2000:
                    print(f"  ⚠️  MÖGLICHER KANDIDAT für das 1700 kcal Problem!")

print("\n=== ZUSAMMENFASSUNG DER SOJABOHNEN KALORIENWERTE ===")

# Sammle alle Sojabohnen food_supply_kcal Werte für 2022
all_soy_kcal_2022 = []

for entry in soy_entries:
    if 'soyabeans' in entry['item'].lower():
        for year_data in entry['data']:
            if year_data['year'] == 2022 and 'food_supply_kcal' in year_data:
                kcal_val = year_data['food_supply_kcal']
                if isinstance(kcal_val, (int, float)) and kcal_val > 0:
                    all_soy_kcal_2022.append({
                        'country': entry['country'],
                        'kcal': kcal_val
                    })

# Sortiere nach Kalorienwerten
all_soy_kcal_2022.sort(key=lambda x: x['kcal'], reverse=True)

print(f"\nAlle Sojabohnen food_supply_kcal Werte für 2022 (Top 20):")
for i, item in enumerate(all_soy_kcal_2022[:20]):
    print(f"  {i+1:2d}. {item['country']}: {item['kcal']:.2f} kcal/capita/day")

# Suche nach Werten um 1700
candidates_1700 = [item for item in all_soy_kcal_2022 if 1500 <= item['kcal'] <= 2000]
if candidates_1700:
    print(f"\nMögliche Kandidaten für '~1700 kcal' Problem:")
    for item in candidates_1700:
        print(f"  - {item['country']}: {item['kcal']:.2f} kcal/capita/day")
else:
    print(f"\nKeine Sojabohnen-Werte zwischen 1500-2000 kcal/capita/day gefunden.")
    print("Das '1700 kcal' Problem bezieht sich wahrscheinlich auf eine andere Metrik oder Aggregation.")

print("\n=== FERTIG ===")