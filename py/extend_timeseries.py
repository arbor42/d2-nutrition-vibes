#!/usr/bin/env python3
"""
Extend existing timeseries data with Feed and Calorie data
Maintains the existing structure while adding new metrics
"""

import pandas as pd
import json
import os
from collections import defaultdict

def extend_timeseries_with_feed_and_calories():
    """Extend timeseries data with feed and calorie metrics"""
    
    print("Loading FAO data...")
    df = pd.read_csv('fao.csv')
    
    print("Loading existing timeseries data...")
    with open('../public/data/fao/timeseries.json', 'r') as f:
        timeseries = json.load(f)
    
    # Convert timeseries to a lookup structure for easy updating
    lookup = {}
    for entry in timeseries:
        key = (entry['country'], entry['item'])
        lookup[key] = entry
    
    print(f"Existing timeseries entries: {len(timeseries)}")
    
    # Extract Feed data
    print("Processing Feed data...")
    feed_data = df[df['Element'] == 'Feed'].copy()
    feed_count = 0
    
    for _, row in feed_data.iterrows():
        country = row['Area']
        item = row['Item']
        year = row['Year']
        value = row['Value']
        
        if pd.isna(value):
            continue
            
        key = (country, item)
        if key in lookup:
            # Find the year entry and add feed data
            for year_data in lookup[key]['data']:
                if year_data['year'] == year:
                    year_data['feed'] = float(value)
                    feed_count += 1
                    break
    
    print(f"Added {feed_count} feed data points")
    
    # Extract Calorie data (Food supply kcal/capita/day)
    print("Processing Calorie data...")
    calorie_data = df[df['Element'] == 'Food supply (kcal/capita/day)'].copy()
    calorie_count = 0
    
    for _, row in calorie_data.iterrows():
        country = row['Area']
        item = row['Item']
        year = row['Year']
        value = row['Value']
        
        if pd.isna(value):
            continue
            
        key = (country, item)
        if key in lookup:
            # Find the year entry and add calorie data
            for year_data in lookup[key]['data']:
                if year_data['year'] == year:
                    year_data['food_supply_kcal'] = float(value)
                    calorie_count += 1
                    break
    
    print(f"Added {calorie_count} calorie data points")
    
    # Create new entries for items that only have feed/calorie data but weren't in timeseries
    print("Adding new entries for feed/calorie-only items...")
    
    # Process items that have feed data but weren't in original timeseries
    feed_items = set(feed_data['Item'].unique())
    existing_items = set(entry['item'] for entry in timeseries)
    new_feed_items = feed_items - existing_items
    
    print(f"New feed items to add: {len(new_feed_items)}")
    for item in new_feed_items:
        item_feed_data = feed_data[feed_data['Item'] == item]
        
        # Group by country
        for country in item_feed_data['Area'].unique():
            country_data = item_feed_data[item_feed_data['Area'] == country]
            
            # Create year data
            year_data = []
            for _, row in country_data.iterrows():
                if not pd.isna(row['Value']):
                    year_data.append({
                        'year': int(row['Year']),
                        'production': 0,
                        'imports': 0,
                        'domestic_supply': 0,
                        'feed': float(row['Value'])
                    })
            
            if year_data:
                new_entry = {
                    'country': country,
                    'item': item,
                    'unit': '1000 t',
                    'data': sorted(year_data, key=lambda x: x['year'])
                }
                timeseries.append(new_entry)
    
    # Process Grand Total calorie data specially
    print("Processing Grand Total calorie data...")
    grand_total_calories = df[(df['Element'] == 'Food supply (kcal/capita/day)') & 
                              (df['Item'] == 'Grand Total')]
    
    grand_total_count = 0
    for country in grand_total_calories['Area'].unique():
        country_data = grand_total_calories[grand_total_calories['Area'] == country]
        
        # Create year data for Grand Total calories
        year_data = []
        for _, row in country_data.iterrows():
            if not pd.isna(row['Value']):
                year_data.append({
                    'year': int(row['Year']),
                    'production': 0,
                    'imports': 0,
                    'domestic_supply': 0,
                    'food_supply_kcal': float(row['Value'])
                })
                grand_total_count += 1
        
        if year_data:
            new_entry = {
                'country': country,
                'item': 'Grand Total',
                'unit': 'kcal/capita/day',
                'data': sorted(year_data, key=lambda x: x['year'])
            }
            timeseries.append(new_entry)
    
    print(f"Added {grand_total_count} Grand Total calorie data points")
    
    # Save extended timeseries data
    output_path = '../public/data/fao/timeseries.json'
    print(f"Saving extended timeseries data to {output_path}...")
    
    # Create backup
    backup_path = '../public/data/fao/timeseries_backup.json'
    if os.path.exists(output_path):
        import shutil
        shutil.copy2(output_path, backup_path)
        print(f"Backup created at {backup_path}")
    
    with open(output_path, 'w') as f:
        json.dump(timeseries, f, indent=2)
    
    print(f"Extended timeseries saved with {len(timeseries)} total entries")
    
    # Print summary
    print("\nSummary:")
    print(f"- Added feed data to {feed_count} existing entries")
    print(f"- Added calorie data to {calorie_count} existing entries") 
    print(f"- Added {len(new_feed_items)} new feed-only items")
    print(f"- Added Grand Total with {grand_total_count} calorie data points")
    print(f"- Total entries: {len(timeseries)}")
    
    # Verify the structure
    sample_with_feed = None
    sample_with_calories = None
    
    for entry in timeseries:
        if entry['data'] and len(entry['data']) > 0:
            sample_data = entry['data'][0]
            if 'feed' in sample_data and sample_with_feed is None:
                sample_with_feed = entry
            if 'food_supply_kcal' in sample_data and sample_with_calories is None:
                sample_with_calories = entry
    
    print("\nStructure verification:")
    if sample_with_feed:
        print(f"Sample entry with feed data: {sample_with_feed['item']} - {sample_with_feed['country']}")
        print(f"  Fields: {list(sample_with_feed['data'][0].keys())}")
    
    if sample_with_calories:
        print(f"Sample entry with calorie data: {sample_with_calories['item']} - {sample_with_calories['country']}")
        print(f"  Fields: {list(sample_with_calories['data'][0].keys())}")

if __name__ == '__main__':
    extend_timeseries_with_feed_and_calories()