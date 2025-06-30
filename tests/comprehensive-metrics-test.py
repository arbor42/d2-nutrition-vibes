#!/usr/bin/env python3
"""
Comprehensive Test for D2 Nutrition Vibes Metrics
=================================================

This test verifies that all metrics are working correctly by examining the actual data structure
and checking what data is available in the timeseries data. It cross-references the metrics
defined in the UI with the actual data available in the FAO dataset.

Test Coverage:
- Verifies all defined metrics in ProductSelector.vue
- Checks data availability in timeseries.json 
- Tests data structure consistency
- Validates metric mappings between UI and data
- Analyzes data completeness and coverage
- Provides detailed reporting on issues found
"""

import json
import csv
import sys
import os
from collections import defaultdict, Counter
from typing import Dict, List, Set, Any, Optional
from dataclasses import dataclass
from pathlib import Path

@dataclass
class MetricInfo:
    """Information about a metric including its availability and mapping"""
    ui_name: str
    ui_label: str
    ui_description: str
    data_field: Optional[str] = None
    available_in_data: bool = False
    sample_values: List[float] = None
    coverage_percentage: float = 0.0
    issues: List[str] = None

    def __post_init__(self):
        if self.sample_values is None:
            self.sample_values = []
        if self.issues is None:
            self.issues = []

class MetricsTestSuite:
    """Comprehensive test suite for metrics validation"""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.public_data_dir = self.project_root / "public" / "data"
        self.fao_data_dir = self.public_data_dir / "fao"
        
        # UI-defined metrics from ProductSelector.vue
        self.ui_metrics = {
            'production': MetricInfo(
                ui_name='production',
                ui_label='Produktion',
                ui_description='Gesamte inländische Produktion in 1000 Tonnen',
                data_field='production'
            ),
            'import_quantity': MetricInfo(
                ui_name='import_quantity',
                ui_label='Import',
                ui_description='Importierte Menge in 1000 Tonnen',
                data_field='imports'  # Note: UI uses 'import_quantity' but data uses 'imports'
            ),
            'export_quantity': MetricInfo(
                ui_name='export_quantity',
                ui_label='Export',
                ui_description='Exportierte Menge in 1000 Tonnen',
                data_field='exports'  # Note: UI uses 'export_quantity' but data uses 'exports'
            ),
            'domestic_supply_quantity': MetricInfo(
                ui_name='domestic_supply_quantity',
                ui_label='Inlandsversorgung',
                ui_description='Verfügbare Menge für den inländischen Verbrauch in 1000 Tonnen',
                data_field='domestic_supply'  # Note: UI uses 'domestic_supply_quantity' but data uses 'domestic_supply'
            ),
            'food_supply_kcal': MetricInfo(
                ui_name='food_supply_kcal',
                ui_label='Kalorienversorgung',
                ui_description='Verfügbare Kalorien pro Person pro Tag in kcal/Tag',
                data_field='food_supply_kcal'
            ),
            'feed': MetricInfo(
                ui_name='feed',
                ui_label='Tierfutter',
                ui_description='Menge die als Tierfutter verwendet wird in 1000 Tonnen',
                data_field='feed'
            ),
            'stock_variation': MetricInfo(
                ui_name='stock_variation',
                ui_label='Lagerbestandsänderung',
                ui_description='Änderung der Lagerbestände in 1000 Tonnen',
                data_field='stock_variation'
            ),
            'protein_supply': MetricInfo(
                ui_name='protein_supply',
                ui_label='Proteinversorgung',
                ui_description='Verfügbare Proteinmenge in g/Person/Tag',
                data_field='protein_supply'  # Not expected in current data
            ),
            'fat_supply': MetricInfo(
                ui_name='fat_supply',
                ui_label='Fettversorgung',
                ui_description='Verfügbare Fettmenge in g/Person/Tag',
                data_field='fat_supply'  # Not expected in current data
            ),
            'processing': MetricInfo(
                ui_name='processing',
                ui_label='Verarbeitung',
                ui_description='Menge die zur Weiterverarbeitung verwendet wird in 1000 Tonnen',
                data_field='processing'  # Not expected in current data
            ),
            'feed_percentage': MetricInfo(
                ui_name='feed_percentage',
                ui_label='Futteranteil',
                ui_description='Prozentualer Anteil der Produktion, der als Tierfutter verwendet wird (%)',
                data_field=None  # Calculated field
            )
        }
        
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'warnings': 0,
            'issues': []
        }
        
    def log_issue(self, level: str, message: str, details: str = None):
        """Log an issue with the test"""
        issue = {
            'level': level,
            'message': message,
            'details': details
        }
        self.test_results['issues'].append(issue)
        
        if level == 'ERROR':
            self.test_results['failed'] += 1
        elif level == 'WARNING':
            self.test_results['warnings'] += 1
        else:
            self.test_results['passed'] += 1
            
        print(f"[{level}] {message}")
        if details:
            print(f"  Details: {details}")

    def test_data_files_exist(self) -> bool:
        """Test that all required data files exist"""
        print("\n=== Testing Data File Existence ===")
        
        required_files = [
            self.fao_data_dir / "metadata.json",
            self.fao_data_dir / "timeseries.json",
            self.fao_data_dir / "index.json"
        ]
        
        all_exist = True
        for file_path in required_files:
            if file_path.exists():
                self.log_issue('INFO', f"✓ Found required file: {file_path.name}")
            else:
                self.log_issue('ERROR', f"✗ Missing required file: {file_path}")
                all_exist = False
                
        return all_exist

    def load_timeseries_data(self) -> Optional[List[Dict]]:
        """Load and parse timeseries data"""
        print("\n=== Loading Timeseries Data ===")
        
        timeseries_file = self.fao_data_dir / "timeseries.json"
        if not timeseries_file.exists():
            self.log_issue('ERROR', f"Timeseries file not found: {timeseries_file}")
            return None
            
        try:
            with open(timeseries_file, 'r') as f:
                data = json.load(f)
            
            self.log_issue('INFO', f"✓ Loaded timeseries data with {len(data)} entries")
            
            # Analyze structure
            if data and len(data) > 0:
                sample_entry = data[0]
                self.log_issue('INFO', f"Sample entry structure: {list(sample_entry.keys())}")
                if 'data' in sample_entry and sample_entry['data']:
                    sample_year_data = sample_entry['data'][0]
                    self.log_issue('INFO', f"Sample year data fields: {list(sample_year_data.keys())}")
            
            return data
            
        except Exception as e:
            self.log_issue('ERROR', f"Failed to load timeseries data: {e}")
            return None

    def load_metadata(self) -> Optional[Dict]:
        """Load and parse metadata"""
        print("\n=== Loading Metadata ===")
        
        metadata_file = self.fao_data_dir / "metadata.json"
        if not metadata_file.exists():
            self.log_issue('ERROR', f"Metadata file not found: {metadata_file}")
            return None
            
        try:
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
                
            self.log_issue('INFO', f"✓ Loaded metadata generated at: {metadata.get('generated_at', 'Unknown')}")
            
            # Log data summary
            if 'data_summary' in metadata:
                summary = metadata['data_summary']
                self.log_issue('INFO', f"Total records: {summary.get('total_records', 'Unknown')}")
                self.log_issue('INFO', f"Years: {len(summary.get('years', []))} ({min(summary.get('years', []))} - {max(summary.get('years', []))})")
                self.log_issue('INFO', f"Countries: {len(summary.get('countries', []))}")
                self.log_issue('INFO', f"Food items: {len(summary.get('food_items', []))}")
                self.log_issue('INFO', f"Elements: {summary.get('elements', [])}")
                
            return metadata
            
        except Exception as e:
            self.log_issue('ERROR', f"Failed to load metadata: {e}")
            return None

    def analyze_data_fields(self, timeseries_data: List[Dict]) -> Set[str]:
        """Analyze what data fields are actually available in the timeseries data"""
        print("\n=== Analyzing Available Data Fields ===")
        
        all_fields = set()
        field_counts = Counter()
        
        for entry in timeseries_data:
            if 'data' in entry:
                for year_data in entry['data']:
                    for field in year_data.keys():
                        if field != 'year':  # Exclude year field
                            all_fields.add(field)
                            field_counts[field] += 1
        
        total_data_points = sum(len(entry.get('data', [])) for entry in timeseries_data)
        
        print(f"Found {len(all_fields)} unique data fields across {total_data_points} data points:")
        for field in sorted(all_fields):
            coverage = (field_counts[field] / total_data_points) * 100 if total_data_points > 0 else 0
            self.log_issue('INFO', f"  {field}: {field_counts[field]} occurrences ({coverage:.1f}% coverage)")
            
        return all_fields

    def test_metric_data_availability(self, timeseries_data: List[Dict], available_fields: Set[str]) -> Dict[str, MetricInfo]:
        """Test which metrics have data available"""
        print("\n=== Testing Metric Data Availability ===")
        
        field_stats = defaultdict(lambda: {'count': 0, 'values': []})
        
        # Collect statistics for each field
        for entry in timeseries_data:
            if 'data' in entry:
                for year_data in entry['data']:
                    for field_name, value in year_data.items():
                        if field_name != 'year' and value is not None:
                            field_stats[field_name]['count'] += 1
                            if isinstance(value, (int, float)) and len(field_stats[field_name]['values']) < 10:
                                field_stats[field_name]['values'].append(float(value))
        
        total_possible_data_points = sum(len(entry.get('data', [])) for entry in timeseries_data)
        
        # Update metric info with availability data
        for metric_name, metric_info in self.ui_metrics.items():
            data_field = metric_info.data_field
            
            if data_field is None:
                if metric_name == 'feed_percentage':
                    # Special case: calculated field
                    metric_info.available_in_data = True
                    metric_info.issues.append("Calculated field - depends on production and feed data")
                    self.log_issue('INFO', f"✓ {metric_name} ({metric_info.ui_label}): Calculated field")
                else:
                    metric_info.available_in_data = False
                    metric_info.issues.append("No data field mapping defined")
                    self.log_issue('WARNING', f"⚠ {metric_name} ({metric_info.ui_label}): No data field mapping")
            elif data_field in available_fields:
                stats = field_stats[data_field]
                metric_info.available_in_data = True
                metric_info.sample_values = stats['values']
                metric_info.coverage_percentage = (stats['count'] / total_possible_data_points) * 100 if total_possible_data_points > 0 else 0
                
                self.log_issue('INFO', f"✓ {metric_name} ({metric_info.ui_label}): Available ({metric_info.coverage_percentage:.1f}% coverage)")
                if metric_info.sample_values:
                    self.log_issue('INFO', f"  Sample values: {metric_info.sample_values[:5]}")
            else:
                metric_info.available_in_data = False
                metric_info.issues.append(f"Data field '{data_field}' not found in timeseries data")
                self.log_issue('ERROR', f"✗ {metric_name} ({metric_info.ui_label}): Data field '{data_field}' not available")
                
        return self.ui_metrics

    def test_metric_calculations(self, timeseries_data: List[Dict]) -> bool:
        """Test calculated metrics like feed_percentage"""
        print("\n=== Testing Calculated Metrics ===")
        
        # Test feed_percentage calculation
        feed_percentage_testable = False
        sample_calculations = []
        
        for entry in timeseries_data[:10]:  # Test first 10 entries
            if 'data' in entry:
                for year_data in entry['data']:
                    production = year_data.get('production')
                    feed = year_data.get('feed')
                    
                    if production is not None and feed is not None and production > 0:
                        feed_percentage = (feed / production) * 100
                        sample_calculations.append({
                            'country': entry.get('country'),
                            'item': entry.get('item'),
                            'year': year_data.get('year'),
                            'production': production,
                            'feed': feed,
                            'feed_percentage': feed_percentage
                        })
                        feed_percentage_testable = True
                        
                        if len(sample_calculations) >= 5:
                            break
            if len(sample_calculations) >= 5:
                break
        
        if feed_percentage_testable:
            self.log_issue('INFO', f"✓ feed_percentage calculation test passed")
            for calc in sample_calculations:
                self.log_issue('INFO', f"  {calc['country']} - {calc['item']} ({calc['year']}): {calc['feed']}/{calc['production']} = {calc['feed_percentage']:.1f}%")
        else:
            self.log_issue('WARNING', f"⚠ Could not test feed_percentage calculation - insufficient data")
            
        return feed_percentage_testable

    def test_data_consistency(self, timeseries_data: List[Dict]) -> bool:
        """Test data consistency and structure"""
        print("\n=== Testing Data Consistency ===")
        
        issues_found = []
        
        # Test structure consistency
        expected_top_level_keys = {'country', 'item', 'unit', 'data'}
        expected_year_keys = {'year'}
        
        for i, entry in enumerate(timeseries_data[:100]):  # Test first 100 entries
            # Check top-level structure
            entry_keys = set(entry.keys())
            missing_keys = expected_top_level_keys - entry_keys
            if missing_keys:
                issues_found.append(f"Entry {i}: Missing keys {missing_keys}")
                
            # Check year data structure
            if 'data' in entry and isinstance(entry['data'], list):
                for j, year_data in enumerate(entry['data']):
                    if not isinstance(year_data, dict):
                        issues_found.append(f"Entry {i}, year {j}: Year data is not a dictionary")
                        continue
                        
                    if 'year' not in year_data:
                        issues_found.append(f"Entry {i}, year {j}: Missing 'year' field")
                        
                    # Check for reasonable year values
                    year = year_data.get('year')
                    if isinstance(year, int) and (year < 2000 or year > 2030):
                        issues_found.append(f"Entry {i}, year {j}: Suspicious year value {year}")
        
        if issues_found:
            for issue in issues_found[:10]:  # Show first 10 issues
                self.log_issue('WARNING', f"⚠ Data consistency issue: {issue}")
            if len(issues_found) > 10:
                self.log_issue('WARNING', f"⚠ ... and {len(issues_found) - 10} more issues")
        else:
            self.log_issue('INFO', f"✓ Data consistency test passed")
            
        return len(issues_found) == 0

    def test_production_data_files(self) -> bool:
        """Test production data files availability"""
        print("\n=== Testing Production Data Files ===")
        
        geo_dir = self.fao_data_dir / "geo"
        if not geo_dir.exists():
            self.log_issue('ERROR', f"Production data directory not found: {geo_dir}")
            return False
            
        production_files = list(geo_dir.glob("*_production_*.json"))
        
        if not production_files:
            self.log_issue('ERROR', f"No production data files found in {geo_dir}")
            return False
            
        self.log_issue('INFO', f"✓ Found {len(production_files)} production data files")
        
        # Test a sample file
        sample_file = production_files[0]
        try:
            with open(sample_file, 'r') as f:
                sample_data = json.load(f)
                
            sample_country = next(iter(sample_data.keys()))
            sample_country_data = sample_data[sample_country]
            
            expected_keys = {'value', 'unit', 'item', 'year', 'element'}
            if set(sample_country_data.keys()) >= expected_keys:
                self.log_issue('INFO', f"✓ Production file structure is correct")
                self.log_issue('INFO', f"  Sample: {sample_country} - {sample_country_data}")
            else:
                missing_keys = expected_keys - set(sample_country_data.keys())
                self.log_issue('ERROR', f"✗ Production file missing keys: {missing_keys}")
                return False
                
        except Exception as e:
            self.log_issue('ERROR', f"Failed to load sample production file: {e}")
            return False
            
        return True

    def generate_report(self) -> Dict:
        """Generate a comprehensive test report"""
        print("\n" + "="*60)
        print("COMPREHENSIVE METRICS TEST REPORT")
        print("="*60)
        
        # Summary statistics
        available_metrics = sum(1 for m in self.ui_metrics.values() if m.available_in_data)
        total_metrics = len(self.ui_metrics)
        
        print(f"\nSUMMARY:")
        print(f"  Total UI Metrics: {total_metrics}")
        print(f"  Available in Data: {available_metrics}")
        print(f"  Missing from Data: {total_metrics - available_metrics}")
        print(f"  Test Results: {self.test_results['passed']} passed, {self.test_results['failed']} failed, {self.test_results['warnings']} warnings")
        
        # Detailed metric analysis
        print(f"\nDETAILED METRIC ANALYSIS:")
        print("-" * 50)
        
        for metric_name, metric_info in self.ui_metrics.items():
            status = "✓ AVAILABLE" if metric_info.available_in_data else "✗ MISSING"
            coverage = f"({metric_info.coverage_percentage:.1f}% coverage)" if metric_info.coverage_percentage > 0 else ""
            
            print(f"\n{status} {metric_info.ui_label} ({metric_name}) {coverage}")
            print(f"  Description: {metric_info.ui_description}")
            print(f"  Data Field: {metric_info.data_field or 'N/A'}")
            
            if metric_info.sample_values:
                print(f"  Sample Values: {metric_info.sample_values[:5]}")
                
            if metric_info.issues:
                for issue in metric_info.issues:
                    print(f"  Issue: {issue}")
        
        # Recommendations
        print(f"\nRECOMMENDATIONS:")
        print("-" * 50)
        
        missing_metrics = [m for m in self.ui_metrics.values() if not m.available_in_data]
        if missing_metrics:
            print("1. Missing Metrics:")
            for metric in missing_metrics:
                if metric.data_field and metric.data_field not in ['protein_supply', 'fat_supply', 'processing']:
                    print(f"   • {metric.ui_label}: Check data field mapping '{metric.data_field}'")
                else:
                    print(f"   • {metric.ui_label}: Consider removing from UI or adding to data pipeline")
        
        print("\n2. Data Quality:")
        low_coverage_metrics = [m for m in self.ui_metrics.values() if m.available_in_data and m.coverage_percentage < 50]
        if low_coverage_metrics:
            print("   • Low coverage metrics (< 50%):")
            for metric in low_coverage_metrics:
                print(f"     - {metric.ui_label}: {metric.coverage_percentage:.1f}%")
        else:
            print("   • All available metrics have good coverage (≥ 50%)")
            
        print("\n3. Implementation:")
        print("   • Review metric name mappings between UI and data")
        print("   • Consider implementing missing calculated fields")
        print("   • Add data validation for metric availability")
        
        # Return structured report
        return {
            'summary': {
                'total_metrics': total_metrics,
                'available_metrics': available_metrics,
                'missing_metrics': total_metrics - available_metrics,
                'test_results': self.test_results
            },
            'metrics': {name: {
                'available': info.available_in_data,
                'coverage': info.coverage_percentage,
                'issues': info.issues,
                'sample_values': info.sample_values
            } for name, info in self.ui_metrics.items()},
            'recommendations': {
                'missing_metrics': [m.ui_name for m in missing_metrics],
                'low_coverage_metrics': [m.ui_name for m in low_coverage_metrics]
            }
        }

    def run_all_tests(self) -> Dict:
        """Run all tests and return comprehensive report"""
        print("Starting Comprehensive Metrics Test Suite")
        print("="*60)
        
        # Test 1: Data files exist
        if not self.test_data_files_exist():
            print("❌ Critical: Data files missing. Cannot continue tests.")
            return self.generate_report()
        
        # Test 2: Load data
        timeseries_data = self.load_timeseries_data()
        metadata = self.load_metadata()
        
        if not timeseries_data:
            print("❌ Critical: Cannot load timeseries data. Cannot continue tests.")
            return self.generate_report()
        
        # Test 3: Analyze available fields
        available_fields = self.analyze_data_fields(timeseries_data)
        
        # Test 4: Test metric availability
        self.test_metric_data_availability(timeseries_data, available_fields)
        
        # Test 5: Test calculated metrics
        self.test_metric_calculations(timeseries_data)
        
        # Test 6: Test data consistency
        self.test_data_consistency(timeseries_data)
        
        # Test 7: Test production data files
        self.test_production_data_files()
        
        # Generate final report
        return self.generate_report()

def main():
    """Main function to run the comprehensive metrics test"""
    
    # Determine project root
    current_dir = Path(__file__).parent
    project_root = current_dir.parent  # Assuming test is in tests/ directory
    
    if not (project_root / "public" / "data").exists():
        print("❌ Error: Could not find project data directory")
        print(f"Looking for: {project_root / 'public' / 'data'}")
        print("Please run this test from the project root or adjust the path.")
        sys.exit(1)
    
    # Run tests
    test_suite = MetricsTestSuite(str(project_root))
    report = test_suite.run_all_tests()
    
    # Exit with appropriate code
    if report['summary']['test_results']['failed'] > 0:
        print(f"\n❌ Test suite completed with {report['summary']['test_results']['failed']} failures")
        sys.exit(1)
    elif report['summary']['test_results']['warnings'] > 0:
        print(f"\n⚠️  Test suite completed with {report['summary']['test_results']['warnings']} warnings")
        sys.exit(0)
    else:
        print(f"\n✅ Test suite completed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    main()