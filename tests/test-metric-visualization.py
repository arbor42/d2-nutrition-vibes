#!/usr/bin/env python3
"""
Metric Visualization Test
========================

Tests that the available metrics can be properly used for visualization
by simulating the data transformations that the Vue components would perform.
"""

import json
import sys
from pathlib import Path
from collections import defaultdict

def load_test_data():
    """Load sample data for testing"""
    project_root = Path(__file__).parent.parent
    timeseries_file = project_root / "public" / "data" / "fao" / "timeseries.json"
    
    try:
        with open(timeseries_file, 'r') as f:
            data = json.load(f)
        return data
    except Exception as e:
        print(f"❌ Could not load test data: {e}")
        return None

def test_metric_data_extraction(data, metric_field, test_name):
    """Test extracting data for a specific metric"""
    print(f"\n--- Testing {test_name} ({metric_field}) ---")
    
    extracted_data = []
    countries_with_data = set()
    years_with_data = set()
    
    for entry in data[:100]:  # Test first 100 entries
        country = entry.get('country')
        item = entry.get('item')
        
        for year_data in entry.get('data', []):
            year = year_data.get('year')
            value = year_data.get(metric_field)
            
            if value is not None and value != 0:  # Exclude null and zero values for this test
                extracted_data.append({
                    'country': country,
                    'item': item,
                    'year': year,
                    'value': value
                })
                countries_with_data.add(country)
                years_with_data.add(year)
    
    if extracted_data:
        print(f"✅ Successfully extracted {len(extracted_data)} data points")
        print(f"   Countries with data: {len(countries_with_data)}")
        print(f"   Years with data: {sorted(years_with_data)}")
        print(f"   Sample values: {[d['value'] for d in extracted_data[:5]]}")
        return True
    else:
        print(f"❌ No usable data found for {metric_field}")
        return False

def test_calculated_metric(data):
    """Test feed percentage calculation"""
    print(f"\n--- Testing Feed Percentage Calculation ---")
    
    calculated_data = []
    
    for entry in data[:50]:  # Test first 50 entries
        country = entry.get('country')
        item = entry.get('item')
        
        for year_data in entry.get('data', []):
            year = year_data.get('year')
            production = year_data.get('production')
            feed = year_data.get('feed')
            
            if production is not None and feed is not None and production > 0:
                feed_percentage = (feed / production) * 100
                calculated_data.append({
                    'country': country,
                    'item': item,
                    'year': year,
                    'production': production,
                    'feed': feed,
                    'feed_percentage': feed_percentage
                })
    
    if calculated_data:
        print(f"✅ Successfully calculated {len(calculated_data)} feed percentages")
        for calc in calculated_data[:3]:
            print(f"   {calc['country']} - {calc['item']} ({calc['year']}): {calc['feed_percentage']:.1f}%")
        return True
    else:
        print(f"❌ Could not calculate feed percentages")
        return False

def test_timeseries_aggregation(data):
    """Test aggregating data for timeseries visualization"""
    print(f"\n--- Testing Timeseries Aggregation ---")
    
    # Aggregate global production by year
    global_production_by_year = defaultdict(float)
    
    for entry in data:
        country = entry.get('country')
        if country and 'world' not in country.lower():  # Exclude world totals to avoid double counting
            for year_data in entry.get('data', []):
                year = year_data.get('year')
                production = year_data.get('production')
                
                if year and production is not None:
                    global_production_by_year[year] += production
    
    if global_production_by_year:
        years = sorted(global_production_by_year.keys())
        print(f"✅ Successfully aggregated production data for {len(years)} years")
        print(f"   Year range: {min(years)} - {max(years)}")
        print(f"   Sample totals: {dict(list(global_production_by_year.items())[:3])}")
        return True
    else:
        print(f"❌ Could not aggregate timeseries data")
        return False

def test_geographic_aggregation(data):
    """Test aggregating data for geographic visualization"""
    print(f"\n--- Testing Geographic Aggregation ---")
    
    # Aggregate production by country for latest year
    latest_year = 2022
    country_production = defaultdict(float)
    
    for entry in data:
        country = entry.get('country')
        if country and 'world' not in country.lower() and len(country) < 50:  # Exclude world/regional totals
            for year_data in entry.get('data', []):
                year = year_data.get('year')
                production = year_data.get('production')
                
                if year == latest_year and production is not None:
                    country_production[country] += production
    
    if country_production:
        top_countries = sorted(country_production.items(), key=lambda x: x[1], reverse=True)[:5]
        print(f"✅ Successfully aggregated geographic data for {len(country_production)} countries")
        print(f"   Top producers in {latest_year}:")
        for country, production in top_countries:
            print(f"     {country}: {production:,.0f}")
        return True
    else:
        print(f"❌ Could not aggregate geographic data")
        return False

def main():
    """Run visualization tests"""
    print("D2 Nutrition Vibes - Metric Visualization Test")
    print("=" * 50)
    
    data = load_test_data()
    if not data:
        return 1
    
    print(f"Loaded {len(data)} data entries for testing")
    
    # Test core metrics
    tests_passed = 0
    total_tests = 0
    
    # Test individual metrics
    core_metrics = [
        ('production', 'Production'),
        ('imports', 'Imports'),
        ('exports', 'Exports'),
        ('domestic_supply', 'Domestic Supply'),
        ('food_supply_kcal', 'Food Supply (kcal)'),
        ('feed', 'Feed Usage')
    ]
    
    for metric_field, test_name in core_metrics:
        total_tests += 1
        if test_metric_data_extraction(data, metric_field, test_name):
            tests_passed += 1
    
    # Test calculated metrics
    total_tests += 1
    if test_calculated_metric(data):
        tests_passed += 1
    
    # Test aggregations
    total_tests += 1
    if test_timeseries_aggregation(data):
        tests_passed += 1
    
    total_tests += 1
    if test_geographic_aggregation(data):
        tests_passed += 1
    
    # Summary
    print(f"\n" + "=" * 50)
    print(f"VISUALIZATION TEST SUMMARY")
    print(f"=" * 50)
    print(f"Tests passed: {tests_passed}/{total_tests}")
    
    if tests_passed == total_tests:
        print("🎉 All visualization tests passed!")
        print("✅ Metrics are ready for use in visualizations")
        return 0
    else:
        print(f"⚠️  {total_tests - tests_passed} test(s) failed")
        print("❌ Some metrics may not work properly in visualizations")
        return 1

if __name__ == "__main__":
    sys.exit(main())