#!/usr/bin/env python3
"""
Extract calorie supply data from FAO dataset
Saves to JSON format for use in the D2 Nutrition Vibes app
"""

import pandas as pd
import json
import os

def extract_calorie_data():
    """Extract calorie data from FAO CSV and save to JSON"""
    
    print("Loading FAO data...")
    df = pd.read_csv('fao.csv')
    
    # Filter for calorie data - only Grand Total to get total calories per country
    kcal_data = df[(df['Element'] == 'Food supply (kcal/capita/day)') & 
                   (df['Item'] == 'Grand Total')].copy()
    
    # Get unique years
    years = sorted(kcal_data['Year'].unique())
    print(f"Available years: {years}")
    
    # Create output structure
    output = {
        'metadata': {
            'element': 'Food supply (kcal/capita/day)',
            'unit': 'kcal/capita/day',
            'years': [int(y) for y in years]  # Convert numpy int64 to regular int
        },
        'data': {}
    }
    
    # Process data by year
    for year in years:
        year_data = kcal_data[kcal_data['Year'] == year]
        
        # Create dictionary for this year
        year_dict = {}
        for _, row in year_data.iterrows():
            country = row['Area']
            value = row['Value']
            if pd.notna(value):
                year_dict[country] = round(float(value), 0)
        
        output['data'][str(year)] = year_dict
    
    # Save to JSON
    output_path = '../data/processed/calorie_supply.json'
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"Calorie data saved to {output_path}")
    
    # Also create a simplified version for the current year (2022)
    current_year_data = []
    for country, value in output['data']['2022'].items():
        current_year_data.append({
            'country': country,
            'value': value,
            'metric': 'food_supply_kcal',
            'year': 2022,
            'unit': 'kcal/capita/day'
        })
    
    # Sort by value descending
    current_year_data.sort(key=lambda x: x['value'], reverse=True)
    
    # Save current year data
    current_year_path = '../data/processed/calorie_supply_2022.json'
    with open(current_year_path, 'w') as f:
        json.dump(current_year_data, f, indent=2)
    
    print(f"2022 calorie data saved to {current_year_path}")
    
    # Print summary statistics
    values_2022 = [d['value'] for d in current_year_data]
    print(f"\n2022 Summary:")
    print(f"Countries: {len(current_year_data)}")
    print(f"Max: {max(values_2022)} kcal/capita/day")
    print(f"Min: {min(values_2022)} kcal/capita/day")
    print(f"Average: {sum(values_2022)/len(values_2022):.0f} kcal/capita/day")
    
    # Print top and bottom countries
    print("\nTop 5 countries:")
    for item in current_year_data[:5]:
        print(f"  {item['country']}: {item['value']} kcal/capita/day")
    
    print("\nBottom 5 countries:")
    for item in current_year_data[-5:]:
        print(f"  {item['country']}: {item['value']} kcal/capita/day")

if __name__ == '__main__':
    extract_calorie_data()