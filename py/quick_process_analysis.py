#!/usr/bin/env python3
"""
Quick Process Mining Analysis for D2 Nutrition Vibes
"""

import pandas as pd
import numpy as np
import json
from datetime import datetime
import os

def create_sample_process_data():
    """Create sample process mining data for the application"""
    
    # Sample countries and items
    countries = ['United States', 'China', 'Germany', 'Brazil', 'India']
    items = ['Wheat', 'Rice', 'Maize', 'Soybeans', 'Apples']
    
    # Process stages for agricultural supply chain
    process_stages = [
        'Production',
        'Domestic supply quantity',
        'Processing', 
        'Food supply quantity (kg/capita/yr)',
        'Losses'
    ]
    
    # Generate process mining results
    results = {
        'timestamp': datetime.now().isoformat(),
        'data_summary': {
            'total_records': 1250,
            'countries': len(countries),
            'items': len(items),
            'elements': len(process_stages),
            'year_range': [2010, 2021]
        },
        'process_flows': [],
        'process_statistics': {
            'total_traces': 25,
            'total_activities': 125,
            'unique_activities': 5,
            'most_common_activities': {
                'Production': 25,
                'Domestic supply quantity': 23,
                'Processing': 20,
                'Food supply quantity (kg/capita/yr)': 22,
                'Losses': 18
            },
            'average_trace_length': 4.2,
            'process_variants': 12
        },
        'conformance_analysis': {
            'fitness_score': 0.78,
            'precision': 0.82,
            'compliance_rate': 0.76,
            'deviations': []
        },
        'enhancement_opportunities': [],
        'network_analysis': {
            'nodes': [],
            'links': []
        }
    }
    
    # Generate process flows
    for country in countries:
        for item in items:
            activities = []
            for i, stage in enumerate(process_stages):
                if np.random.random() > 0.1:  # 90% chance of having each stage
                    activities.append({
                        'name': stage,
                        'stage': i + 1,
                        'value': round(np.random.exponential(1000) * np.random.uniform(0.5, 2.0), 2),
                        'unit': 'tonnes' if stage != 'Food supply quantity (kg/capita/yr)' else 'kg/capita/yr',
                        'timestamp': f"2020-{i+1:02d}-01"
                    })
            
            results['process_flows'].append({
                'process_id': f"{country}_{item}",
                'trace_id': f"{country}_{item}",
                'activities': activities,
                'duration_years': 1,
                'total_value': sum(act['value'] for act in activities)
            })
    
    # Generate conformance deviations
    deviation_types = [
        'Missing Processing stage',
        'Excessive Losses detected',
        'Irregular supply chain sequence',
        'Missing quality control checkpoints'
    ]
    
    for i in range(8):
        results['conformance_analysis']['deviations'].append({
            'trace_id': f"{np.random.choice(countries)}_{np.random.choice(items)}",
            'missing_activities': [np.random.choice(process_stages)] if np.random.random() > 0.5 else [],
            'extra_activities': ['Quality Control'] if np.random.random() > 0.7 else [],
            'severity': np.random.choice(['low', 'medium', 'high'])
        })
    
    # Generate enhancement opportunities
    opportunities = [
        {
            'type': 'Loss Reduction',
            'description': 'Reduce post-harvest losses in grain storage',
            'impact': 'High',
            'current_loss': 15.2,
            'potential_savings': '4.6 tonnes/year',
            'implementation': 'Improve storage infrastructure'
        },
        {
            'type': 'Production Optimization',
            'description': 'Optimize irrigation efficiency',
            'impact': 'Medium',
            'current_avg': 2.3,
            'benchmark_avg': 3.1,
            'potential_improvement': '34.8%',
            'implementation': 'Implement precision agriculture'
        },
        {
            'type': 'Supply Chain Enhancement',
            'description': 'Streamline distribution networks',
            'impact': 'Medium',
            'current_efficiency': 67,
            'target_efficiency': 85,
            'time_savings': '2.3 days',
            'implementation': 'Digital supply chain management'
        }
    ]
    
    results['enhancement_opportunities'] = opportunities
    
    # Generate network data
    for country in countries:
        results['network_analysis']['nodes'].append({
            'id': country,
            'name': country,
            'type': 'country',
            'production': round(np.random.exponential(10000), 0),
            'size': np.random.randint(10, 50)
        })
    
    # Generate trade links
    for i, country1 in enumerate(countries):
        for country2 in countries[i+1:]:
            if np.random.random() > 0.4:  # 60% chance of trade relationship
                results['network_analysis']['links'].append({
                    'source': country1,
                    'target': country2,
                    'weight': round(np.random.exponential(500), 0),
                    'type': 'trade'
                })
    
    return results

def main():
    """Generate and save process mining data"""
    print("Generating Process Mining Analysis for D2 Nutrition Vibes...")
    
    results = create_sample_process_data()
    
    # Ensure output directory exists
    output_dir = '../public/data/fao_data'
    os.makedirs(output_dir, exist_ok=True)
    
    # Save results
    with open(f'{output_dir}/process_mining_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    # Save network data separately
    with open(f'{output_dir}/process_network.json', 'w') as f:
        json.dump(results['network_analysis'], f, indent=2)
    
    print(f"Process mining results saved to {output_dir}")
    print(f"- Generated {len(results['process_flows'])} process flows")
    print(f"- Identified {len(results['enhancement_opportunities'])} enhancement opportunities")
    print(f"- Conformance fitness score: {results['conformance_analysis']['fitness_score']:.2%}")
    
    return results

if __name__ == "__main__":
    main()