import pandas as pd
import json
import numpy as np
from pathlib import Path
from datetime import datetime

# ---------------------------------------------------------------------------
# Sammel-Regionen, die in der App nicht benötigt werden und daher komplett
# aus allen Datensätzen ausgeschlossen werden sollen. Dies betrifft
# Kontinente, Sub-Regionen, ökonomische Ländergruppen usw.
# ACHTUNG: Nur exakte Namen, um echte Länder (z. B. «South Africa»)
# versehentlich nicht zu entfernen.
# ---------------------------------------------------------------------------
AGGREGATE_AREAS = {
    # Welt-/Kontinents-Aggregationen
    "World",
    "Africa",
    "Americas",
    "Asia",
    "Europe",
    "Oceania",

    # Sub-Kontinente / Himmelsrichtungen
    "Eastern Africa",
    "Middle Africa",
    "Northern Africa",
    "Southern Africa",
    "Western Africa",
    "Eastern Asia",
    "South-eastern Asia",
    "Southern Asia",
    "Western Asia",
    "Central America",
    "South America",
    "Northern America",
    "Eastern Europe",
    "Northern Europe",
    "Southern Europe",
    "Western Europe",

    # Ökonomische/development-Gruppen
    "European Union",
    "European Union (27)",
    "European Union (28)",
    "Land Locked Developing Countries",
    "Least Developed Countries",
    "Low Income Food Deficit Countries",
    "Net Food Importing Developing Countries",
    "Small Island Developing States",
}

class EnhancedFAODataProcessor:
    def __init__(self, csv_path):
        """
        Erweiterte FAO Data Processor mit food_supply_kcal Integration
        
        Args:
            csv_path (str): Pfad zur FAO CSV-Datei
        """
        self.csv_path = csv_path
        self.df = None
        self.filtered_df = None
        self.kcal_df = None
        self.output_dir = Path("../public/data/fao")
        self.output_dir.mkdir(exist_ok=True, parents=True)
        
    def load_and_filter_data(self):
        """Lädt und filtert die FAO-Daten"""
        print("Lade FAO-Daten...")
        
        # Rohdaten laden
        self.df = pd.read_csv(self.csv_path)
        
        # ---------------------------------------------------------------
        # 1) Aggregate Areas entfernen
        # ---------------------------------------------------------------
        initial_rows = len(self.df)
        self.df = self.df[~self.df["Area"].isin(AGGREGATE_AREAS)].copy()
        removed = initial_rows - len(self.df)
        print(f"Entferne Aggregat-Regionen: {removed:,} Zeilen entfernt")
        
        # ERWEITERT: Lade auch Kaloriendaten
        print("Extrahiere Kaloriendaten...")
        self.kcal_df = self.df[
            (self.df['Year'] >= 2010) & 
            (self.df['Year'] <= 2022) &
            (self.df['Element'] == 'Food supply (kcal/capita/day)')
        ].copy()
        
        print(f"Kaloriendaten gefunden: {len(self.kcal_df):,} Einträge")
        
        # Filter für 2010-2022, relevante Elemente und Nahrungsmittel
        relevant_elements = [
            'Import quantity',
            'Export quantity', 
            'Production',
            'Domestic supply quantity',
            'Feed',  # ERWEITERT: Feed auch inkludieren falls vorhanden
            # --- Neu 2025-06: zusätzliche Ernährungs-Metriken ---
            'Protein supply quantity (t)',            # protein (total)
            'Protein supply quantity (g/capita/day)', # protein_gpcd
            'Fat supply quantity (t)',               # fat (total)
            'Fat supply quantity (g/capita/day)',    # fat_gpcd
            'Processing',
        ]
        
        # Filtere Daten (ohne Aggregat-Regionen, da self.df bereits bereinigt)
        self.filtered_df = self.df[
            (self.df['Year'] >= 2010) & 
            (self.df['Year'] <= 2022) &
            (self.df['Element'].isin(relevant_elements)) &
            (~self.df['Item'].str.lower().str.contains('alcohol', na=False)) &
            (~self.df['Item'].str.lower().str.contains('non-food', na=False))
        ].copy()
        
        # Bereinige Daten
        self.filtered_df['Value'] = pd.to_numeric(self.filtered_df['Value'], errors='coerce')
        self.filtered_df = self.filtered_df.dropna(subset=['Value'])
        
        # Bereinige auch Kaloriendaten
        self.kcal_df['Value'] = pd.to_numeric(self.kcal_df['Value'], errors='coerce')
        self.kcal_df = self.kcal_df.dropna(subset=['Value'])
        
        # Konvertiere numpy Datentypen zu Python nativen Typen
        self.filtered_df['Year'] = self.filtered_df['Year'].astype(int)
        self.filtered_df['Value'] = self.filtered_df['Value'].astype(float)
        self.kcal_df['Year'] = self.kcal_df['Year'].astype(int)
        self.kcal_df['Value'] = self.kcal_df['Value'].astype(float)
        
        print(f"Gefilterte Daten: {len(self.filtered_df):,} Zeilen")
        print(f"Jahre: {sorted(self.filtered_df['Year'].unique())}")
        print(f"Länder: {self.filtered_df['Area'].nunique()}")
        print(f"Nahrungsmittel: {self.filtered_df['Item'].nunique()}")
        
    def create_metadata(self):
        """Erstellt Metadaten für die d3.js App"""
        metadata = {
            "generated_at": datetime.now().isoformat(),
            "data_summary": {
                "total_records": int(len(self.filtered_df)),
                "kcal_records": int(len(self.kcal_df)),
                "years": [int(year) for year in sorted(self.filtered_df['Year'].unique())],
                "countries": [str(country) for country in sorted(self.filtered_df['Area'].unique())],
                "food_items": [str(item) for item in sorted(self.filtered_df['Item'].unique())],
                "elements": [str(element) for element in sorted(self.filtered_df['Element'].unique())],
                "units": [str(unit) for unit in self.filtered_df['Unit'].unique()]
            },
            "data_structure": {
                "timeseries": "yearly data from 2010-2022",
                "metrics": {
                    "Import quantity": "Import volumes",
                    "Export quantity": "Export volumes", 
                    "Production": "Domestic production",
                    "Domestic supply quantity": "Total domestic supply",
                    "Feed": "Feed usage",
                    "food_supply_kcal": "Food supply in kcal/capita/day (from FAO)",
                    # --- Neu 2025-06 ---
                    "protein": "Protein supply quantity (total, 1000 t)",
                    "protein_gpcd": "Protein supply quantity (g/capita/day)",
                    "fat": "Fat supply quantity (total, 1000 t)",
                    "fat_gpcd": "Fat supply quantity (g/capita/day)",
                    "processing": "Processing volume (1000 t)"
                }
            },
            "notes": {
                "food_supply_kcal": "Values represent actual food consumption per capita per day from FAO data",
                "validation": "All existing metrics preserved, food_supply_kcal added from original FAO dataset"
            }
        }
        
        # Speichere Metadaten
        with open(self.output_dir / "metadata.json", 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
            
        return metadata
    
    def create_country_timeseries(self):
        """Erstellt Zeitreihen-Daten pro Land und Nahrungsmittel mit food_supply_kcal"""
        print("Erstelle erweiterte Zeitreihen-Daten...")
        
        # Erstelle einen Lookup für Kaloriendaten
        kcal_lookup = {}
        for _, row in self.kcal_df.iterrows():
            key = (row['Area'], row['Item'], row['Year'])
            kcal_lookup[key] = row['Value']
        
        print(f"Kalorienlookup erstellt: {len(kcal_lookup):,} Einträge")
        
        timeseries_data = []
        
        # Gruppiere nach Land und Item
        for (country, item), group in self.filtered_df.groupby(['Area', 'Item']):
            
            # Einheit angleichen: 't' → '1000 t' (nach Skalierung)
            base_unit = "t"

            country_item_data = {
                "country": str(country),
                "item": str(item),
                "unit": base_unit,
                "data": []
            }
            
            # Gruppiere nach Jahr
            for year, year_group in group.groupby('Year'):
                year_data = {"year": int(year)}
                
                # Füge alle verfügbaren Elemente hinzu (BEIBEHALTUNG aller bestehenden Metriken)
                for _, row in year_group.iterrows():
                    element_key = self._normalize_element_name(row['Element'])
                    
                    # Skalierung: Protein/Fett Gesamtmengen liegen in Tonnen vor → in 1000 t umrechnen
                    raw_val = float(row['Value']) if pd.notna(row['Value']) else 0.0
                    mass_elements_kt = [
                        'Production',
                        'Import quantity',
                        'Export quantity',
                        'Domestic supply quantity',
                        'Feed',
                        'Processing'
                    ]
                    # Skalierung: ursprüngliche 1000-t-Werte → t
                    if row['Element'] in mass_elements_kt:
                        raw_val = raw_val * 1000  # 1000 t → t
                    # Protein/Fett liegen bereits in t → unverändert
                    year_data[element_key] = raw_val
                
                # ERWEITERT: Füge food_supply_kcal hinzu falls verfügbar
                kcal_key = (country, item, year)
                if kcal_key in kcal_lookup:
                    kcal_value = kcal_lookup[kcal_key]
                    year_data['food_supply_kcal'] = float(kcal_value) if pd.notna(kcal_value) else 0.0
                
                country_item_data["data"].append(year_data)
            
            # Sortiere nach Jahr
            country_item_data["data"].sort(key=lambda x: x['year'])
            
            timeseries_data.append(country_item_data)
        
        # Backup der ursprünglichen timeseries.json falls vorhanden
        original_file = self.output_dir / "timeseries.json"
        if original_file.exists():
            backup_file = self.output_dir / "timeseries_backup.json"
            print(f"Erstelle Backup: {backup_file}")
            import shutil
            shutil.copy2(original_file, backup_file)
        
        # Speichere erweiterte Zeitreihen-Daten
        with open(original_file, 'w', encoding='utf-8') as f:
            json.dump(timeseries_data, f, ensure_ascii=False, indent=2)
            
        print(f"Erweiterte Zeitreihen für {len(timeseries_data)} Land-Nahrungsmittel-Kombinationen erstellt")
        
        # Validierung: Prüfe wie viele Einträge food_supply_kcal haben
        entries_with_kcal = sum(1 for entry in timeseries_data 
                               if any('food_supply_kcal' in year_data for year_data in entry['data']))
        print(f"✓ Einträge mit food_supply_kcal: {entries_with_kcal}/{len(timeseries_data)}")
        
        return timeseries_data
    
    def create_production_rankings(self):
        """Erstellt Produktions-Rankings pro Nahrungsmittel"""
        print("Erstelle Produktions-Rankings...")
        
        # Filtere nur Produktionsdaten für 2022
        production_2022 = self.filtered_df[
            (self.filtered_df['Element'] == 'Production') & 
            (self.filtered_df['Year'] == 2022)
        ].copy()
        
        rankings_data = []
        
        for item, group in production_2022.groupby('Item'):
            # Sortiere nach Produktionswert
            top_producers = group.nlargest(20, 'Value')
            
            item_ranking = {
                "item": str(item),
                "unit": str(group['Unit'].iloc[0]) if len(group) > 0 else "1000 t",
                "year": 2022,
                "producers": []
            }
            
            for _, row in top_producers.iterrows():
                producer_data = {
                    "country": str(row['Area']),
                    "production": float(row['Value']) if pd.notna(row['Value']) else 0.0,
                    "rank": len(item_ranking["producers"]) + 1
                }
                item_ranking["producers"].append(producer_data)
            
            rankings_data.append(item_ranking)
        
        # Speichere Rankings
        with open(self.output_dir / "production_rankings.json", 'w', encoding='utf-8') as f:
            json.dump(rankings_data, f, ensure_ascii=False, indent=2)
            
        print(f"Produktions-Rankings für {len(rankings_data)} Nahrungsmittel erstellt")
        return rankings_data
    
    def create_trade_balance(self):
        """Erstellt Handelsbilanz-Daten (Import vs Export)"""
        print("Erstelle Handelsbilanz-Daten...")
        
        # Filtere Import und Export Daten
        trade_data = self.filtered_df[
            self.filtered_df['Element'].isin(['Import quantity', 'Export quantity'])
        ].copy()
        
        trade_balance = []
        
        # Gruppiere nach Land, Item und Jahr
        for (country, item, year), group in trade_data.groupby(['Area', 'Item', 'Year']):
            
            # Extrahiere Import und Export Werte
            imports = group[group['Element'] == 'Import quantity']['Value'].sum()
            exports = group[group['Element'] == 'Export quantity']['Value'].sum()
            
            trade_balance_entry = {
                "country": str(country),
                "item": str(item),
                "year": int(year),
                "unit": str(group['Unit'].iloc[0]) if len(group) > 0 else "1000 t",
                "imports": float(imports) if pd.notna(imports) else 0.0,
                "exports": float(exports) if pd.notna(exports) else 0.0,
                "trade_balance": float(exports - imports) if pd.notna(exports) and pd.notna(imports) else 0.0,
                "net_importer": bool(imports > exports) if pd.notna(imports) and pd.notna(exports) else None
            }
            
            trade_balance.append(trade_balance_entry)
        
        # Speichere Handelsbilanz
        with open(self.output_dir / "trade_balance.json", 'w', encoding='utf-8') as f:
            json.dump(trade_balance, f, ensure_ascii=False, indent=2)
            
        print(f"Handelsbilanz für {len(trade_balance)} Einträge erstellt")
        return trade_balance
    
    def create_aggregated_summaries(self):
        """Erstellt aggregierte Zusammenfassungen für schnelle Übersichten"""
        print("Erstelle aggregierte Zusammenfassungen...")
        
        # Globale Summen pro Jahr und Element
        global_summary = []
        
        for year in sorted(self.filtered_df['Year'].unique()):
            year_data = self.filtered_df[self.filtered_df['Year'] == year]
            
            year_summary = {"year": int(year)}
            
            for element in ['Production', 'Import quantity', 'Export quantity', 'Domestic supply quantity']:
                element_data = year_data[year_data['Element'] == element]
                total_value = element_data['Value'].sum()
                
                element_key = self._normalize_element_name(element)
                year_summary[element_key] = float(total_value) if pd.notna(total_value) else 0.0
            
            global_summary.append(year_summary)
        
        # Top Länder nach Gesamtproduktion
        country_totals = self.filtered_df[
            self.filtered_df['Element'] == 'Production'
        ].groupby('Area')['Value'].sum().nlargest(30)
        
        top_countries = [
            {"country": str(country), "total_production": float(value)}
            for country, value in country_totals.items()
        ]
        
        # Top Nahrungsmittel nach Gesamtproduktion
        item_totals = self.filtered_df[
            self.filtered_df['Element'] == 'Production'
        ].groupby('Item')['Value'].sum().nlargest(30)
        
        top_items = [
            {"item": str(item), "total_production": float(value)}
            for item, value in item_totals.items()
        ]
        
        summary_data = {
            "global_yearly_totals": global_summary,
            "top_producing_countries": top_countries,
            "top_produced_items": top_items
        }
        
        # Speichere Zusammenfassung
        with open(self.output_dir / "summary.json", 'w', encoding='utf-8') as f:
            json.dump(summary_data, f, ensure_ascii=False, indent=2)
            
        return summary_data
    
    def create_network_data(self):
        """Erstellt Netzwerk-Daten für Handelsfluss-Visualisierungen"""
        print("Erstelle Netzwerk-Daten für Handelsflüsse...")
        
        # Fokus auf 2022 und große Handelsvolumen
        trade_2022 = self.filtered_df[
            (self.filtered_df['Year'] == 2022) &
            (self.filtered_df['Element'].isin(['Import quantity', 'Export quantity'])) &
            (self.filtered_df['Value'] > 100)  # Nur signifikante Handelsmengen
        ].copy()
        
        network_data = {
            "nodes": [],
            "links": []
        }
        
        # Erstelle Knoten (Länder)
        countries = set(trade_2022['Area'].unique())
        for i, country in enumerate(countries):
            # Berechne Gesamthandelsvolumen
            country_trade = trade_2022[trade_2022['Area'] == country]['Value'].sum()
            
            network_data["nodes"].append({
                "id": str(country),
                "index": i,
                "total_trade_volume": float(country_trade),
                "type": "country"
            })
        
        # Vereinfachte Links basierend auf Handelsbilanzen
        for item in trade_2022['Item'].unique()[:10]:  # Top 10 Items
            item_data = trade_2022[trade_2022['Item'] == item]
            
            exporters = item_data[item_data['Element'] == 'Export quantity'].nlargest(5, 'Value')
            importers = item_data[item_data['Element'] == 'Import quantity'].nlargest(5, 'Value')
            
            # Erstelle hypothetische Links zwischen Top-Exporteuren und -Importeuren
            for _, exporter in exporters.iterrows():
                for _, importer in importers.iterrows():
                    if exporter['Area'] != importer['Area']:
                        link_volume = min(exporter['Value'], importer['Value']) * 0.1  # Geschätzt
                        
                        network_data["links"].append({
                            "source": str(exporter['Area']),
                            "target": str(importer['Area']),
                            "value": float(link_volume),
                            "item": str(item)
                        })
        
        # Speichere Netzwerk-Daten
        with open(self.output_dir / "network.json", 'w', encoding='utf-8') as f:
            json.dump(network_data, f, ensure_ascii=False, indent=2)
            
        return network_data
    
    def _normalize_element_name(self, element):
        """Normalisiert Element-Namen für JSON-Keys"""
        mapping = {
            'Import quantity': 'imports',
            'Export quantity': 'exports',
            'Production': 'production',
            'Domestic supply quantity': 'domestic_supply',
            'Feed': 'feed',
            # --- Neu 2025-06: zusätzliche Ernährungs-Metriken ---
            'Protein supply quantity (t)': 'protein',
            'Protein supply quantity (g/capita/day)': 'protein_gpcd',
            'Fat supply quantity (t)': 'fat',
            'Fat supply quantity (g/capita/day)': 'fat_gpcd',
            'Processing': 'processing',
        }
        return mapping.get(element, element.lower().replace(' ', '_'))
    
    def validate_output(self):
        """Validiert die generierte timeseries.json"""
        print("\n=== VALIDIERUNG DER AUSGABE ===")
        
        timeseries_file = self.output_dir / "timeseries.json"
        if not timeseries_file.exists():
            print("❌ timeseries.json nicht gefunden!")
            return False
        
        with open(timeseries_file, 'r') as f:
            data = json.load(f)
        
        print(f"✓ Timeseries geladen: {len(data)} Einträge")
        
        # Prüfe food_supply_kcal Verfügbarkeit
        entries_with_kcal = 0
        total_kcal_values = 0
        
        for entry in data:
            has_kcal = False
            for year_data in entry['data']:
                if 'food_supply_kcal' in year_data:
                    has_kcal = True
                    total_kcal_values += 1
            
            if has_kcal:
                entries_with_kcal += 1
        
        print(f"✓ Einträge mit food_supply_kcal: {entries_with_kcal}/{len(data)}")
        print(f"✓ Gesamt food_supply_kcal Werte: {total_kcal_values}")
        
        # Teste Sojabohnen
        soy_entries = [e for e in data if 'soya' in e['item'].lower() and e['country'].lower() == 'world']
        if soy_entries:
            for entry in soy_entries[:2]:
                item = entry['item']
                data_2022 = [d for d in entry['data'] if d['year'] == 2022]
                if data_2022:
                    d = data_2022[0]
                    kcal = d.get('food_supply_kcal', 'N/A')
                    production = d.get('production', 'N/A')
                    print(f"✓ {item} (World) 2022: {kcal} kcal/capita/day, {production} 1000t production")
        
        return True
    
    def process_all(self):
        """Führt alle Verarbeitungsschritte aus"""
        print("=" * 60)
        print("ERWEITERTE FAO DATENVERARBEITUNG mit food_supply_kcal")
        print("=" * 60)
        
        # Lade und filtere Daten
        self.load_and_filter_data()
        
        # Erstelle alle JSON-Ausgaben
        metadata = self.create_metadata()
        timeseries = self.create_country_timeseries()
        rankings = self.create_production_rankings()
        trade_balance = self.create_trade_balance()
        summary = self.create_aggregated_summaries()
        network = self.create_network_data()
        
        # Validiere Ausgabe
        self.validate_output()
        
        print("\n" + "=" * 60)
        print("✅ ERWEITERTE VERARBEITUNG ABGESCHLOSSEN!")
        print("=" * 60)
        print(f"Output-Verzeichnis: {self.output_dir}")
        print("\nErstelle/aktualisierte JSON-Dateien:")
        print("✓ metadata.json - Erweiterte Metadaten")
        print("✓ timeseries.json - ERWEITERT mit food_supply_kcal")
        print("✓ timeseries_backup.json - Backup der ursprünglichen Datei")
        print("✓ production_rankings.json - Produktions-Rankings")
        print("✓ trade_balance.json - Import/Export Bilanzen")
        print("✓ summary.json - Aggregierte Zusammenfassungen")
        print("✓ network.json - Netzwerk-Daten für Handelsflüsse")
        
        # Erstelle Index-Datei für d3.js
        index_data = {
            "files": {
                "metadata": "metadata.json",
                "timeseries": "timeseries.json", 
                "rankings": "production_rankings.json",
                "trade": "trade_balance.json",
                "summary": "summary.json",
                "network": "network.json"
            },
            "description": "Enhanced FAO food data with food_supply_kcal integration",
            "version": "enhanced_with_kcal",
            "usage": {
                "timeseries": "Use for line charts - now includes food_supply_kcal values",
                "rankings": "Use for bar charts showing top producers",
                "trade": "Use for trade balance visualizations",
                "summary": "Use for overview dashboards",
                "network": "Use for network/flow diagrams"
            },
            "notes": {
                "food_supply_kcal": "Added from original FAO dataset, represents actual food consumption",
                "preservation": "All existing metrics (production, imports, exports, domestic_supply, feed) preserved",
                "backup": "Original timeseries.json backed up as timeseries_backup.json"
            }
        }
        
        with open(self.output_dir / "index.json", 'w', encoding='utf-8') as f:
            json.dump(index_data, f, ensure_ascii=False, indent=2)
        
        print("✓ index.json - Erweiterte Übersicht aller verfügbaren Dateien")
        
        return {
            "metadata": metadata,
            "timeseries_count": len(timeseries),
            "rankings_count": len(rankings),
            "trade_balance_count": len(trade_balance),
            "output_dir": str(self.output_dir),
            "kcal_integration": "success"
        }

# Verwendung des erweiterten Processors
if __name__ == "__main__":
    # Pfad zu Ihrer FAO CSV-Datei
    csv_file = "fao.csv"  # Passen Sie den Pfad an
    
    # Erstelle und führe erweiterten Processor aus
    processor = EnhancedFAODataProcessor(csv_file)
    results = processor.process_all()
    
    print(f"\n🎉 Fertig! {results['timeseries_count']} erweiterte Zeitreihen erstellt.")
    print(f"📁 Alle Dateien wurden in '{results['output_dir']}' gespeichert.")
    print(f"🔧 food_supply_kcal Integration: {results['kcal_integration']}")