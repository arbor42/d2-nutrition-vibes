#!/bin/bash

# D2 Nutrition Vibes - Run All Tests
# ==================================
# This script runs all available tests for the metrics functionality

echo "🧪 D2 Nutrition Vibes - Running All Tests"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "public/data/fao/timeseries.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Expected to find: public/data/fao/timeseries.json"
    exit 1
fi

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is required but not found"
    exit 1
fi

echo "📁 Working directory: $(pwd)"
echo "🐍 Python version: $(python3 --version)"
echo ""

# Test 1: Quick Metrics Test
echo "🔍 Running Quick Metrics Test..."
echo "--------------------------------"
if python3 tests/quick-metrics-test.py; then
    echo "✅ Quick test passed"
    QUICK_TEST=true
else
    echo "❌ Quick test failed"
    QUICK_TEST=false
fi
echo ""

# Test 2: Visualization Test
echo "📊 Running Visualization Test..."
echo "--------------------------------"
if python3 tests/test-metric-visualization.py; then
    echo "✅ Visualization test passed"
    VIZ_TEST=true
else
    echo "❌ Visualization test failed"
    VIZ_TEST=false
fi
echo ""

# Test 3: Comprehensive Test (optional, as it's verbose)
if [ "$1" = "--comprehensive" ] || [ "$1" = "-c" ]; then
    echo "📋 Running Comprehensive Test..."
    echo "--------------------------------"
    if python3 tests/comprehensive-metrics-test.py; then
        echo "✅ Comprehensive test passed"
        COMP_TEST=true
    else
        echo "❌ Comprehensive test failed"
        COMP_TEST=false
    fi
    echo ""
fi

# Summary
echo "🎯 TEST SUMMARY"
echo "==============="

if [ "$QUICK_TEST" = true ] && [ "$VIZ_TEST" = true ]; then
    echo "🎉 All core tests passed!"
    echo "✅ Metrics functionality is working correctly"
    
    if [ "$1" = "--comprehensive" ] || [ "$1" = "-c" ]; then
        if [ "$COMP_TEST" = true ]; then
            echo "✅ Comprehensive test also passed"
        else
            echo "⚠️  Comprehensive test had some issues (see above)"
        fi
    fi
    
    echo ""
    echo "📖 For detailed analysis, run:"
    echo "   python3 tests/comprehensive-metrics-test.py"
    echo ""
    echo "📊 See METRICS_TEST_RESULTS.md for complete report"
    
    exit 0
else
    echo "💥 Some tests failed!"
    echo "❌ Please check the output above for details"
    
    if [ "$QUICK_TEST" = false ]; then
        echo "   - Quick test failed: Core metrics may not be available"
    fi
    
    if [ "$VIZ_TEST" = false ]; then
        echo "   - Visualization test failed: Data may not be suitable for charts"
    fi
    
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   1. Check that data files exist in public/data/fao/"
    echo "   2. Verify timeseries.json is valid and contains data"
    echo "   3. Run comprehensive test for detailed analysis:"
    echo "      python3 tests/comprehensive-metrics-test.py"
    
    exit 1
fi