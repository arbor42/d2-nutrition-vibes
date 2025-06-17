import pandas as pd
import json
import numpy as np
from pathlib import Path
from datetime import datetime

class FAODataProcessor:
    def __init__(self, csv_path):
        """
        Initialisiert den FAO Data Processor
        
        Args:
            csv_path (str): Pfad zur FAO CSV-Datei
        """
        self.csv_path = csv_path
        self.df = None
        self.filtered_df = None
        self.output_dir = Path("fao_json_output")
        self.output_dir.mkdir(exist_ok=True)
        
    def load_and_filter_data(self):
        """Lädt und filtert die FAO-Daten"""
        print("Lade FAO-Daten...")
        self.df = pd.read_csv(self.csv_path)
        
        # Filter für 2010-2022, relevante Elemente und Nahrungsmittel
        relevant_elements = [
            'Import quantity',
            'Export quantity', 
            'Production',
            'Domestic supply quantity'
        ]
        
        # Filtere Daten
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
        
        # Konvertiere numpy Datentypen zu Python nativen Typen
        self.filtered_df['Year'] = self.filtered_df['Year'].astype(int)
        self.filtered_df['Value'] = self.filtered_df['Value'].astype(float)
        
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
                    "Domestic supply quantity": "Total domestic supply"
                }
            }
        }
        
        # Speichere Metadaten
        with open(self.output_dir / "metadata.json", 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
            
        return metadata
    
    def create_country_timeseries(self):
        """Erstellt Zeitreihen-Daten pro Land und Nahrungsmittel"""
        print("Erstelle Zeitreihen-Daten...")
        
        timeseries_data = []
        
        # Gruppiere nach Land und Item
        for (country, item), group in self.filtered_df.groupby(['Area', 'Item']):
            
            # Erstelle Zeitreihen-Struktur
            country_item_data = {
                "country": str(country),
                "item": str(item),
                "unit": str(group['Unit'].iloc[0]) if len(group) > 0 else "1000 t",
                "data": []
            }
            
            # Gruppiere nach Jahr
            for year, year_group in group.groupby('Year'):
                year_data = {"year": int(year)}
                
                # Füge alle verfügbaren Elemente hinzu
                for _, row in year_group.iterrows():
                    element_key = self._normalize_element_name(row['Element'])
                    year_data[element_key] = float(row['Value']) if pd.notna(row['Value']) else 0.0
                
                country_item_data["data"].append(year_data)
            
            # Sortiere nach Jahr
            country_item_data["data"].sort(key=lambda x: x['year'])
            
            timeseries_data.append(country_item_data)
        
        # Speichere Zeitreihen-Daten
        with open(self.output_dir / "timeseries.json", 'w', encoding='utf-8') as f:
            json.dump(timeseries_data, f, ensure_ascii=False, indent=2)
            
        print(f"Zeitreihen für {len(timeseries_data)} Land-Nahrungsmittel-Kombinationen erstellt")
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
        # (Für echte Handelsflüsse bräuchten wir bilaterale Handelsdaten)
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
            'Domestic supply quantity': 'domestic_supply'
        }
        return mapping.get(element, element.lower().replace(' ', '_'))
    
    def process_all(self):
        """Führt alle Verarbeitungsschritte aus"""
        print("=" * 50)
        print("FAO Datenverarbeitung für d3.js gestartet")
        print("=" * 50)
        
        # Lade und filtere Daten
        self.load_and_filter_data()
        
        # Erstelle alle JSON-Ausgaben
        metadata = self.create_metadata()
        timeseries = self.create_country_timeseries()
        rankings = self.create_production_rankings()
        trade_balance = self.create_trade_balance()
        summary = self.create_aggregated_summaries()
        network = self.create_network_data()
        
        print("\n" + "=" * 50)
        print("Verarbeitung abgeschlossen!")
        print("=" * 50)
        print(f"Output-Verzeichnis: {self.output_dir}")
        print("\nErstelle JSON-Dateien:")
        print("✓ metadata.json - Datenstruktur und Metadaten")
        print("✓ timeseries.json - Zeitreihen pro Land/Nahrungsmittel")
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
            "description": "FAO food data processed for d3.js visualization",
            "usage": {
                "timeseries": "Use for line charts showing trends over time",
                "rankings": "Use for bar charts showing top producers",
                "trade": "Use for trade balance visualizations",
                "summary": "Use for overview dashboards",
                "network": "Use for network/flow diagrams"
            }
        }
        
        with open(self.output_dir / "index.json", 'w', encoding='utf-8') as f:
            json.dump(index_data, f, ensure_ascii=False, indent=2)
        
        print("✓ index.json - Übersicht aller verfügbaren Dateien")
        
        return {
            "metadata": metadata,
            "timeseries_count": len(timeseries),
            "rankings_count": len(rankings),
            "trade_balance_count": len(trade_balance),
            "output_dir": str(self.output_dir)
        }

# Verwendung des Processors
if __name__ == "__main__":
    # Pfad zu Ihrer FAO CSV-Datei
    csv_file = "fao.csv"  # Passen Sie den Pfad an
    
    # Erstelle und führe Processor aus
    processor = FAODataProcessor(csv_file)
    results = processor.process_all()
    
    print(f"\n🎉 Fertig! {results['timeseries_count']} Zeitreihen und {results['rankings_count']} Rankings erstellt.")
    print(f"📁 Alle Dateien wurden in '{results['output_dir']}' gespeichert.")