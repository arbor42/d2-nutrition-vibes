import pandas as pd
import os
from pathlib import Path

def create_fao_slim_csv(input_path="fao.csv", output_path="fao_slim.csv"):
    """
    Erstellt eine schlanke Version der FAO CSV durch Entfernen irrelevanter Spalten
    
    Args:
        input_path (str): Pfad zur Original-FAO CSV
        output_path (str): Pfad für die schlanke Output-CSV
    
    Returns:
        dict: Statistiken über die Optimierung
    """
    
    print("🔍 Analysiere FAO CSV-Struktur...")
    
    # Original CSV laden
    df_original = pd.read_csv(input_path)
    original_size_mb = os.path.getsize(input_path) / (1024**2)
    
    print(f"📊 Original-Datei:")
    print(f"   Zeilen: {len(df_original):,}")
    print(f"   Spalten: {len(df_original.columns)}")
    print(f"   Größe: {original_size_mb:.2f} MB")
    print(f"   Spalten: {list(df_original.columns)}")
    
    # Definiere relevante Spalten (nur die essentiellen)
    relevant_columns = [
        'Area',        # Ländername
        'Item',        # Nahrungsmittel/Produktname  
        'Element',     # Metrik (Production, Import, Export, etc.)
        'Year',        # Kalenderjahr
        'Unit',        # Maßeinheit
        'Value',       # Messwert
        'Flag'         # Datenqualitäts-Flag (optional aber nützlich)
    ]
    
    # Prüfe ob alle relevanten Spalten existieren
    missing_columns = [col for col in relevant_columns if col not in df_original.columns]
    if missing_columns:
        print(f"⚠️  Warnung: Fehlende Spalten: {missing_columns}")
        relevant_columns = [col for col in relevant_columns if col in df_original.columns]
    
    # Irrelevante Spalten identifizieren
    irrelevant_columns = [col for col in df_original.columns if col not in relevant_columns]
    
    print(f"\n✅ Relevante Spalten ({len(relevant_columns)}):")
    for col in relevant_columns:
        print(f"   - {col}")
    
    print(f"\n❌ Irrelevante Spalten ({len(irrelevant_columns)}) - werden gedroppt:")
    for col in irrelevant_columns:
        print(f"   - {col}")
    
    # Erstelle schlanken DataFrame
    df_slim = df_original[relevant_columns].copy()
    
    # Datentypen optimieren für bessere Performance
    print(f"\n🔧 Optimiere Datentypen...")
    
    # Year zu int16 (reicht für Jahre 2010-2035)
    if 'Year' in df_slim.columns:
        df_slim['Year'] = df_slim['Year'].astype('int16')
    
    # Value zu float32 (reicht für FAO-Daten, spart 50% Speicher)
    if 'Value' in df_slim.columns:
        df_slim['Value'] = pd.to_numeric(df_slim['Value'], errors='coerce').astype('float32')
    
    # String-Spalten zu category für bessere Speichereffizienz
    string_columns = ['Area', 'Item', 'Element', 'Unit', 'Flag']
    for col in string_columns:
        if col in df_slim.columns:
            df_slim[col] = df_slim[col].astype('category')
    
    # Speichere schlanke Version
    print(f"\n💾 Speichere schlanke Version nach '{output_path}'...")
    df_slim.to_csv(output_path, index=False)
    
    # Berechne neue Größe
    slim_size_mb = os.path.getsize(output_path) / (1024**2)
    
    # Statistiken
    reduction_percent = ((original_size_mb - slim_size_mb) / original_size_mb) * 100
    
    print(f"\n📈 Optimierungs-Ergebnisse:")
    print(f"   Original: {original_size_mb:.2f} MB")
    print(f"   Optimiert: {slim_size_mb:.2f} MB")
    print(f"   Reduzierung: {reduction_percent:.1f}%")
    print(f"   Gesparte Spalten: {len(irrelevant_columns)}")
    print(f"   Verbleibende Spalten: {len(relevant_columns)}")
    
    # Zusätzliche Analyse
    print(f"\n🔍 Inhaltliche Analyse der schlanken Version:")
    print(f"   Länder: {df_slim['Area'].nunique() if 'Area' in df_slim.columns else 'N/A'}")
    print(f"   Produkte: {df_slim['Item'].nunique() if 'Item' in df_slim.columns else 'N/A'}")
    print(f"   Metriken: {df_slim['Element'].nunique() if 'Element' in df_slim.columns else 'N/A'}")
    print(f"   Jahre: {df_slim['Year'].min() if 'Year' in df_slim.columns else 'N/A'}-{df_slim['Year'].max() if 'Year' in df_slim.columns else 'N/A'}")
    print(f"   Datenpunkte: {len(df_slim):,}")
    
    # Zeige Beispiel der Daten
    print(f"\n📋 Beispiel-Daten (erste 5 Zeilen):")
    print(df_slim.head())
    
    # Memory usage comparison
    original_memory = df_original.memory_usage(deep=True).sum() / 1024**2
    slim_memory = df_slim.memory_usage(deep=True).sum() / 1024**2
    memory_reduction = ((original_memory - slim_memory) / original_memory) * 100
    
    print(f"\n🧠 Speicher-Verbrauch:")
    print(f"   Original: {original_memory:.2f} MB")
    print(f"   Optimiert: {slim_memory:.2f} MB") 
    print(f"   Speicher-Reduzierung: {memory_reduction:.1f}%")
    
    return {
        'original_size_mb': original_size_mb,
        'slim_size_mb': slim_size_mb,
        'reduction_percent': reduction_percent,
        'columns_dropped': len(irrelevant_columns),
        'columns_kept': len(relevant_columns),
        'irrelevant_columns': irrelevant_columns,
        'relevant_columns': relevant_columns,
        'memory_reduction_percent': memory_reduction
    }

def analyze_column_importance(df):
    """
    Zusätzliche Analyse der Spalten-Wichtigkeit
    """
    print("\n🔬 Erweiterte Spalten-Analyse:")
    
    for col in df.columns:
        unique_count = df[col].nunique()
        null_count = df[col].isnull().sum()
        null_percent = (null_count / len(df)) * 100
        
        print(f"   {col:20} | Unique: {unique_count:8,} | Nulls: {null_percent:5.1f}%")

# Hauptausführung
if __name__ == "__main__":
    # Prüfe ob Original-Datei existiert
    input_files = ["fao.csv"]
    
    input_file = None
    for file in input_files:
        if os.path.exists(file):
            input_file = file
            break
    
    if input_file is None:
        print("❌ Keine FAO CSV-Datei gefunden!")
        print("   Erwartet: fao.csv, py/fao.csv oder fao_stichprobe_final.csv")
        exit(1)
    
    print(f"✅ Verwende Input-Datei: {input_file}")
    
    # Erstelle schlanke Version
    results = create_fao_slim_csv(input_file, "fao_slim.csv")
    
    # Zusätzliche Analyse falls gewünscht
    # df = pd.read_csv("fao_slim.csv") 
    # analyze_column_importance(df)
    
    print(f"\n🎉 Fertig! Schlanke FAO-Datei erstellt:")
    print(f"   📁 fao_slim.csv")
    print(f"   📉 {results['reduction_percent']:.1f}% kleiner")
    print(f"   🗂️  {results['columns_kept']} von {results['columns_kept'] + results['columns_dropped']} Spalten behalten")
    print(f"   🧠 {results['memory_reduction_percent']:.1f}% weniger Speicherverbrauch")
    
    print(f"\n💡 Nächste Schritte:")
    print("   1. Verwende fao_slim.csv für weitere Analysen")
    print("   2. Teste die ML-Pipeline mit der schlanken Version")
    print("   3. Prüfe ob alle d3.js Features noch funktionieren")