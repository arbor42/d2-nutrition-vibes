#!/usr/bin/env python3
"""
Process Mining Analysis for D2 Nutrition Vibes
Analyzes FAO agricultural data to extract process insights for food systems
"""

import pandas as pd
import numpy as np
import json
from datetime import datetime
from collections import defaultdict, Counter
import os

def load_fao_data():
    """Load FAO data from the slim CSV file"""
    try:
        df = pd.read_csv('fao_slim.csv')
        print(f"Loaded {len(df)} records from FAO dataset")
        return df
    except FileNotFoundError:
        print("FAO slim data not found, creating sample data")
        return create_sample_data()

def create_sample_data():
    """Create sample agricultural process data for demonstration"""
    countries = ['United States', 'China', 'India', 'Brazil', 'Russia', 'Germany', 'France', 'Spain']
    items = ['Wheat', 'Rice', 'Maize', 'Soybeans', 'Potatoes', 'Tomatoes', 'Apples', 'Beef', 'Milk']
    elements = ['Production', 'Import Quantity', 'Export Quantity', 'Domestic supply quantity', 
                'Food supply quantity (kg/capita/yr)', 'Processing', 'Other uses (non-food)', 'Losses']
    
    data = []
    for year in range(2010, 2022):
        for country in countries:
            for item in items:
                for element in elements:
                    value = np.random.exponential(1000) * np.random.uniform(0.5, 2.0)
                    data.append({
                        'Area': country,
                        'Item': item,
                        'Element': element,
                        'Year': year,
                        'Unit': 'tonnes' if 'Quantity' in element or element == 'Production' else 'kg/capita/yr',
                        'Value': round(value, 2),
                        'Flag': 'E' if np.random.random() > 0.8 else 'A'
                    })
    
    return pd.DataFrame(data)

def analyze_agricultural_processes(df):
    """Analyze agricultural data to identify process patterns"""
    
    # Group data by country and item for process analysis
    processes = defaultdict(list)
    
    # Define process stages based on FAO elements
    process_stages = {
        'Production': 1,
        'Import Quantity': 2,
        'Export Quantity': 2,
        'Domestic supply quantity': 3,
        'Processing': 4,
        'Food supply quantity (kg/capita/yr)': 5,
        'Other uses (non-food)': 6,
        'Losses': 7
    }
    
    results = {
        'process_flows': [],
        'conformance_analysis': {},
        'enhancement_opportunities': [],
        'process_statistics': {}
    }
    
    # Analyze process flows for each country-item combination
    for (country, item), group in df.groupby(['Area', 'Item']):
        if len(group) < 3:  # Skip if insufficient data
            continue
            
        # Create process trace
        process_trace = []
        for _, row in group.iterrows():
            if row['Element'] in process_stages:
                stage = process_stages[row['Element']]
                process_trace.append({
                    'activity': row['Element'],
                    'timestamp': f"{row['Year']}-01-01",
                    'resource': country,
                    'value': row['Value'],
                    'unit': row['Unit'],
                    'stage': stage
                })
        
        # Sort by stage and year
        process_trace.sort(key=lambda x: (x['stage'], x['timestamp']))
        
        if process_trace:
            processes[f"{country}_{item}"].append({
                'trace_id': f"{country}_{item}",
                'activities': process_trace,
                'duration': len(set(row['Year'] for _, row in group.iterrows())),
                'total_value': group['Value'].sum()
            })
    
    # Calculate process statistics
    all_activities = []
    all_traces = []
    
    for process_id, traces in processes.items():
        for trace in traces:
            all_traces.append(trace)
            all_activities.extend([act['activity'] for act in trace['activities']])
    
    activity_counts = Counter(all_activities)
    
    results['process_statistics'] = {
        'total_traces': len(all_traces),
        'total_activities': len(all_activities),
        'unique_activities': len(activity_counts),
        'most_common_activities': dict(activity_counts.most_common(10)),
        'average_trace_length': np.mean([len(trace['activities']) for trace in all_traces]) if all_traces else 0,
        'process_variants': len(processes)
    }
    
    # Create process flows
    for process_id, traces in processes.items():
        for trace in traces:
            flow_data = {
                'process_id': process_id,
                'trace_id': trace['trace_id'],
                'activities': [
                    {
                        'name': act['activity'],
                        'stage': act['stage'],
                        'value': act['value'],
                        'unit': act['unit'],
                        'timestamp': act['timestamp']
                    } for act in trace['activities']
                ],
                'duration_years': trace['duration'],
                'total_value': trace['total_value']
            }
            results['process_flows'].append(flow_data)
    
    return results

def analyze_conformance(df):
    """Analyze conformance against standard agricultural processes"""
    
    # Define reference process model for agricultural supply chain
    reference_model = [
        'Production',
        'Domestic supply quantity', 
        'Processing',
        'Food supply quantity (kg/capita/yr)'
    ]
    
    conformance_results = {
        'fitness_score': 0.0,
        'precision': 0.0,
        'deviations': [],
        'compliance_rate': 0.0
    }
    
    # Analyze each country-item combination
    total_traces = 0
    conformant_traces = 0
    all_deviations = []
    
    for (country, item), group in df.groupby(['Area', 'Item']):
        if len(group) < 2:
            continue
            
        total_traces += 1
        trace_activities = group['Element'].unique()
        
        # Check conformance with reference model
        conformant = True
        missing_activities = []
        extra_activities = []
        
        for ref_activity in reference_model:
            if ref_activity not in trace_activities:
                missing_activities.append(ref_activity)
                conformant = False
        
        for activity in trace_activities:
            if activity not in reference_model:
                extra_activities.append(activity)
        
        if conformant and len(extra_activities) == 0:
            conformant_traces += 1
        
        # Record deviations
        if missing_activities or extra_activities:
            deviation = {
                'trace_id': f"{country}_{item}",
                'missing_activities': missing_activities,
                'extra_activities': extra_activities,
                'severity': 'high' if len(missing_activities) > 2 else 'medium' if missing_activities else 'low'
            }
            all_deviations.append(deviation)
    
    # Calculate metrics
    conformance_results['fitness_score'] = conformant_traces / total_traces if total_traces > 0 else 0
    conformance_results['precision'] = 1.0 - (len(all_deviations) / total_traces) if total_traces > 0 else 0
    conformance_results['deviations'] = all_deviations[:20]  # Limit to top 20
    conformance_results['compliance_rate'] = conformant_traces / total_traces if total_traces > 0 else 0
    
    return conformance_results

def identify_enhancement_opportunities(df):
    """Identify process enhancement opportunities"""
    
    opportunities = []
    
    # Analyze losses and inefficiencies
    loss_data = df[df['Element'] == 'Losses']
    if not loss_data.empty:
        high_loss_countries = loss_data.groupby('Area')['Value'].mean().sort_values(ascending=False).head(10)
        
        for country, avg_loss in high_loss_countries.items():
            opportunities.append({
                'type': 'Loss Reduction',
                'description': f'Reduce food losses in {country}',
                'impact': 'High',
                'current_loss': round(avg_loss, 2),
                'potential_savings': f"{round(avg_loss * 0.3, 2)} tonnes/year",
                'implementation': 'Improve storage and distribution infrastructure'
            })
    
    # Analyze production efficiency
    production_data = df[df['Element'] == 'Production']
    if not production_data.empty:
        prod_efficiency = production_data.groupby(['Area', 'Item'])['Value'].mean().reset_index()
        
        # Identify low-efficiency producers
        for item in prod_efficiency['Item'].unique()[:5]:  # Top 5 items
            item_data = prod_efficiency[prod_efficiency['Item'] == item]
            if len(item_data) > 5:
                low_producers = item_data.nsmallest(3, 'Value')
                high_producers = item_data.nlargest(3, 'Value')
                
                if not low_producers.empty and not high_producers.empty:
                    avg_high = high_producers['Value'].mean()
                    avg_low = low_producers['Value'].mean()
                    
                    opportunities.append({
                        'type': 'Production Optimization',
                        'description': f'Improve {item} production efficiency',
                        'impact': 'Medium',
                        'current_avg': round(avg_low, 2),
                        'benchmark_avg': round(avg_high, 2),
                        'potential_improvement': f"{round((avg_high - avg_low) / avg_low * 100, 1)}%",
                        'implementation': 'Technology transfer and best practice sharing'
                    })
    
    return opportunities[:10]  # Return top 10 opportunities

def generate_network_analysis(df):
    """Generate trade network analysis for process mining"""
    
    # Analyze import/export relationships
    trade_data = df[df['Element'].isin(['Import Quantity', 'Export Quantity'])]
    
    network_nodes = []
    network_links = []
    
    # Create nodes for countries
    countries = df['Area'].unique()
    for country in countries[:20]:  # Limit to top 20 countries
        country_data = df[df['Area'] == country]
        total_production = country_data[country_data['Element'] == 'Production']['Value'].sum()
        
        network_nodes.append({
            'id': country,
            'name': country,
            'type': 'country',
            'production': total_production,
            'size': min(max(total_production / 1000, 5), 50)  # Scale size
        })
    
    # Create simplified trade links (mock data for demonstration)
    for i, country1 in enumerate(countries[:10]):
        for country2 in countries[i+1:min(i+6, len(countries))]:
            if country1 != country2:
                # Mock trade volume
                trade_volume = np.random.exponential(1000)
                
                network_links.append({
                    'source': country1,
                    'target': country2,
                    'weight': trade_volume,
                    'type': 'trade'
                })
    
    return {
        'nodes': network_nodes,
        'links': network_links
    }

def save_results(results, output_dir='../public/data/fao_data'):
    """Save process mining results to JSON files"""
    
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Save main results
    with open(f'{output_dir}/process_mining_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    # Save network data separately
    if 'network_analysis' in results:
        with open(f'{output_dir}/process_network.json', 'w') as f:
            json.dump(results['network_analysis'], f, indent=2)
    
    print(f"Process mining results saved to {output_dir}")

def main():
    """Main analysis function"""
    print("Starting Process Mining Analysis for D2 Nutrition Vibes...")
    
    # Load data
    df = load_fao_data()
    
    # Perform analyses
    print("Analyzing agricultural processes...")
    process_results = analyze_agricultural_processes(df)
    
    print("Analyzing conformance...")
    conformance_results = analyze_conformance(df)
    
    print("Identifying enhancement opportunities...")
    enhancement_results = identify_enhancement_opportunities(df)
    
    print("Generating network analysis...")
    network_results = generate_network_analysis(df)
    
    # Combine all results
    final_results = {
        'timestamp': datetime.now().isoformat(),
        'data_summary': {
            'total_records': len(df),
            'countries': len(df['Area'].unique()),
            'items': len(df['Item'].unique()),
            'elements': len(df['Element'].unique()),
            'year_range': [int(df['Year'].min()), int(df['Year'].max())] if 'Year' in df.columns else [2010, 2021]
        },
        'process_flows': process_results['process_flows'][:50],  # Limit for performance
        'process_statistics': process_results['process_statistics'],
        'conformance_analysis': conformance_results,
        'enhancement_opportunities': enhancement_results,
        'network_analysis': network_results
    }
    
    # Save results
    save_results(final_results)
    
    print("Process Mining Analysis Complete!")
    print(f"- Analyzed {final_results['data_summary']['total_records']} records")
    print(f"- Generated {len(final_results['process_flows'])} process flows")
    print(f"- Identified {len(enhancement_results)} enhancement opportunities")
    print(f"- Conformance fitness score: {conformance_results['fitness_score']:.2%}")
    
    return final_results

if __name__ == "__main__":
    main()