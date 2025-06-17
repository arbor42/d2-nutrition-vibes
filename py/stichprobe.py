import pandas as pd
import os

def create_fao_sample(filepath, target_mb=25):
    df = pd.read_csv(filepath)
    
    print(f"Original: {len(df):,} Zeilen")
    print(f"Länder: {df['Area'].nunique()}")
    print(f"Items: {df['Item'].nunique()}")
    print(f"Jahre: {df['Year'].min()}-{df['Year'].max()}")
    
    # Strategie 1: Zuerst temporal reduzieren (jedes 2. Jahr)
    years = sorted(df['Year'].unique())
    selected_years = years[::2]  # Jedes 2. Jahr
    df_reduced = df[df['Year'].isin(selected_years)]
    
    # Strategie 2: Dann stratifiziert nach Area/Item sampeln
    sample_frac = 0.3  # Startpunkt
    
    while True:
        sample_df = df_reduced.groupby(['Area', 'Item'], group_keys=False).apply(
            lambda x: x.sample(frac=min(sample_frac, 1.0), random_state=42)
        )
        
        # Größe prüfen
        temp_file = 'temp_fao_sample.csv'
        sample_df.to_csv(temp_file, index=False)
        size_mb = os.path.getsize(temp_file) / (1024**2)
        
        print(f"Sample-Test: {len(sample_df):,} Zeilen, {size_mb:.2f} MB")
        
        if size_mb <= target_mb:
            os.rename(temp_file, 'fao_stichprobe_final.csv')
            break
        
        sample_frac *= 0.8
        os.remove(temp_file)
    
    print(f"\nFinale Stichprobe:")
    print(f"Zeilen: {len(sample_df):,}")
    print(f"Größe: {size_mb:.2f} MB")
    print(f"Länder: {sample_df['Area'].nunique()}")
    print(f"Items: {sample_df['Item'].nunique()}")
    print(f"Jahre: {sample_df['Year'].min()}-{sample_df['Year'].max()}")
    
    return sample_df

# Verwendung
sample = create_fao_sample("fao.csv", target_mb=25)