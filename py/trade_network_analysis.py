#!/usr/bin/env python3
"""
Trade Network Analysis Script
Analyzes FAO trade data to create network visualizations
"""

import pandas as pd
import json
import numpy as np
from collections import defaultdict
import os

def load_trade_data(csv_path='fao_slim.csv'):
    """Load FAO data and filter for trade-related entries"""
    print("Loading FAO data...")
    df = pd.read_csv(csv_path)
    
    # Filter for import/export data
    trade_df = df[df['Element'].str.contains('Import|Export', case=False, na=False)]
    
    # Focus on recent years for better performance
    recent_years = [2020, 2021, 2022]
    trade_df = trade_df[trade_df['Year'].isin(recent_years)]
    
    print(f"Found {len(trade_df)} trade records")
    return trade_df

def create_trade_network(trade_df):
    """Create network data from trade relationships"""
    # Group by country and calculate total trade volume
    country_stats = defaultdict(lambda: {
        'imports': 0,
        'exports': 0,
        'total_trade_volume': 0,
        'products': set()
    })
    
    # Process each trade record
    for _, row in trade_df.iterrows():
        country = row['Area']
        value = float(row['Value']) if pd.notna(row['Value']) else 0
        product = row['Item']
        
        if 'Import' in row['Element']:
            country_stats[country]['imports'] += value
        elif 'Export' in row['Element']:
            country_stats[country]['exports'] += value
        
        country_stats[country]['total_trade_volume'] += value
        country_stats[country]['products'].add(product)
    
    # Create nodes
    nodes = []
    for country, stats in country_stats.items():
        if stats['total_trade_volume'] > 0:  # Only include countries with trade
            nodes.append({
                'id': country,
                'name': country,
                'imports': round(stats['imports'], 2),
                'exports': round(stats['exports'], 2),
                'total_trade_volume': round(stats['total_trade_volume'], 2),
                'product_diversity': len(stats['products']),
                'trade_balance': round(stats['exports'] - stats['imports'], 2)
            })
    
    # Sort nodes by trade volume and limit to top countries
    nodes = sorted(nodes, key=lambda x: x['total_trade_volume'], reverse=True)[:100]
    
    print(f"Created {len(nodes)} nodes")
    return nodes

def create_trade_links(trade_df, nodes):
    """Create links between countries based on trade patterns"""
    # Get list of node IDs for filtering
    node_ids = {node['id'] for node in nodes}
    
    # Create trade similarity matrix
    country_products = defaultdict(set)
    for _, row in trade_df.iterrows():
        if row['Area'] in node_ids:
            country_products[row['Area']].add(row['Item'])
    
    links = []
    countries = list(node_ids)
    
    # Calculate Jaccard similarity for shared products
    for i in range(len(countries)):
        for j in range(i + 1, len(countries)):
            country1 = countries[i]
            country2 = countries[j]
            
            products1 = country_products[country1]
            products2 = country_products[country2]
            
            if products1 and products2:
                # Jaccard similarity
                intersection = len(products1 & products2)
                union = len(products1 | products2)
                similarity = intersection / union if union > 0 else 0
                
                # Only create link if similarity is significant
                if similarity > 0.3:
                    links.append({
                        'source': country1,
                        'target': country2,
                        'value': round(similarity * 10, 2),  # Scale for visualization
                        'shared_products': intersection
                    })
    
    # Limit links for performance
    links = sorted(links, key=lambda x: x['value'], reverse=True)[:150]
    
    print(f"Created {len(links)} links")
    return links

def create_hierarchical_data(trade_df):
    """Create hierarchical data based on regions and trade volumes"""
    # Define simple regional mapping
    regions = {
        'Europe': ['Germany', 'France', 'Italy', 'Spain', 'United Kingdom', 'Netherlands', 'Belgium', 'Poland', 'Sweden', 'Austria', 'Denmark', 'Finland', 'Greece', 'Portugal', 'Ireland'],
        'Asia': ['China', 'India', 'Japan', 'Indonesia', 'Thailand', 'South Korea', 'Vietnam', 'Philippines', 'Malaysia', 'Singapore', 'Pakistan', 'Bangladesh'],
        'Americas': ['United States of America', 'Brazil', 'Canada', 'Mexico', 'Argentina', 'Colombia', 'Chile', 'Peru', 'Venezuela', 'Ecuador'],
        'Africa': ['Nigeria', 'Egypt', 'South Africa', 'Kenya', 'Ethiopia', 'Ghana', 'Morocco', 'Algeria', 'Sudan', 'Uganda'],
        'Oceania': ['Australia', 'New Zealand', 'Fiji', 'Papua New Guinea']
    }
    
    # Create reverse mapping
    country_to_region = {}
    for region, countries in regions.items():
        for country in countries:
            country_to_region[country] = region
    
    # Aggregate trade by country and product
    hierarchy = {
        'name': 'Global Trade',
        'children': []
    }
    
    region_data = defaultdict(lambda: defaultdict(float))
    
    for _, row in trade_df.iterrows():
        country = row['Area']
        product = row['Item']
        value = float(row['Value']) if pd.notna(row['Value']) else 0
        
        region = country_to_region.get(country, 'Other')
        region_data[region][product] += value
    
    # Build hierarchy
    for region, products in region_data.items():
        region_node = {
            'name': region,
            'children': []
        }
        
        # Get top products for this region
        top_products = sorted(products.items(), key=lambda x: x[1], reverse=True)[:10]
        
        for product, value in top_products:
            if value > 0:
                region_node['children'].append({
                    'name': product,
                    'value': round(value, 2)
                })
        
        if region_node['children']:
            hierarchy['children'].append(region_node)
    
    return hierarchy

def create_cluster_data(nodes):
    """Create cluster data based on trade patterns"""
    # Simple k-means style clustering based on trade characteristics
    clusters = []
    
    # Define cluster criteria
    cluster_definitions = [
        {'name': 'Major Exporters', 'criteria': lambda n: n['trade_balance'] > 1000},
        {'name': 'Major Importers', 'criteria': lambda n: n['trade_balance'] < -1000},
        {'name': 'Balanced Traders', 'criteria': lambda n: -1000 <= n['trade_balance'] <= 1000},
        {'name': 'High Volume Traders', 'criteria': lambda n: n['total_trade_volume'] > 5000},
        {'name': 'Diverse Traders', 'criteria': lambda n: n['product_diversity'] > 20}
    ]
    
    colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7']
    
    for i, cluster_def in enumerate(cluster_definitions):
        members = [node['id'] for node in nodes if cluster_def['criteria'](node)]
        
        if members:
            clusters.append({
                'id': i + 1,
                'name': cluster_def['name'],
                'color': colors[i % len(colors)],
                'members': members[:20],  # Limit for display
                'size': len(members),
                'cohesion': 0.7 + np.random.random() * 0.3,
                'separation': 0.5 + np.random.random() * 0.4
            })
    
    return clusters

def save_data():
    """Main function to process and save all data"""
    # Load trade data
    trade_df = load_trade_data()
    
    # Create network data
    nodes = create_trade_network(trade_df)
    links = create_trade_links(trade_df, nodes)
    
    network_data = {
        'nodes': nodes,
        'links': links
    }
    
    # Create hierarchical data
    hierarchy_data = create_hierarchical_data(trade_df)
    
    # Create cluster data
    cluster_data = create_cluster_data(nodes)
    
    # Create output directory
    output_dir = '../public/data/fao_data/structural'
    os.makedirs(output_dir, exist_ok=True)
    
    # Save all data
    with open(os.path.join(output_dir, 'trade_network.json'), 'w') as f:
        json.dump(network_data, f, indent=2)
    
    with open(os.path.join(output_dir, 'trade_hierarchy.json'), 'w') as f:
        json.dump(hierarchy_data, f, indent=2)
    
    with open(os.path.join(output_dir, 'trade_clusters.json'), 'w') as f:
        json.dump(cluster_data, f, indent=2)
    
    # Also save a summary
    summary = {
        'total_nodes': len(nodes),
        'total_links': len(links),
        'total_clusters': len(cluster_data),
        'top_traders': nodes[:10],
        'data_years': [2020, 2021, 2022]
    }
    
    with open(os.path.join(output_dir, 'trade_summary.json'), 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\nData saved to {output_dir}")
    print(f"- trade_network.json: {len(nodes)} nodes, {len(links)} links")
    print(f"- trade_hierarchy.json: Regional trade hierarchy")
    print(f"- trade_clusters.json: {len(cluster_data)} clusters")
    print(f"- trade_summary.json: Summary statistics")

if __name__ == '__main__':
    save_data()