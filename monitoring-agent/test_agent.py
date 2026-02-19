#!/usr/bin/env python3
"""
Test script for Risk Monitoring Agent
Tests API connectivity, file analysis, and monitoring functionality
"""

import os
import sys
import json
import tempfile
import time
from pathlib import Path
from api_client import RiskAPIClient
from code_analyzer import CodeAnalyzer

class AgentTester:
    """Test the monitoring agent functionality"""
    
    def __init__(self):
        # Load configuration
        config_path = Path(__file__).parent / 'config.json'
        with open(config_path, 'r') as f:
            self.config = json.load(f)
        
        self.api_url = os.getenv('API_URL', self.config['api_url'])
        self.project_id = os.getenv('PROJECT_ID', 'test_project')
        self.api_client = RiskAPIClient(self.api_url, self.project_id)
        self.analyzer = CodeAnalyzer()
    
    def test_backend_connection(self):
        """Test connection to ML backend"""
        print("🔍 Testing ML Backend Connection")
        print("-" * 40)
        
        try:
            if self.api_client.health_check():
                print("✅ Backend is healthy and accessible")
                return True
            else:
                print("❌ Backend is not responding")
                print(f"   URL: {self.api_url}")
                print("   Make sure the Python ML backend is running")
                return False
        except Exception as e:
            print(f"❌ Connection test failed: {e}")
            return False
    
    def test_file_analysis(self):
        """Test file analysis with sample code"""
        print("\n🧪 Testing File Analysis")
        print("-" * 40)
        
        # Create sample Python code
        sample_codes = {
            "simple.py": """
def hello_world():
    print("Hello, World!")
    return True

if __name__ == "__main__":
    hello_world()
""",
            "complex.py": """
import os
import sys
import json
from typing import Dict, List, Any, Optional

class ComplexClass:
    def __init__(self, data: Dict[str, Any]):
        self.data = data
        self.cache = {}
        self.nested_dict = {}
    
    def process_data(self, items: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        result = {}
        for item in items:
            if 'id' in item:
                if item['id'] not in self.cache:
                    # Complex nested logic
                    if 'type' in item:
                        if item['type'] == 'A':
                            if 'value' in item:
                                if item['value'] > 100:
                                    result[item['id']] = self._process_type_a(item)
                                else:
                                    result[item['id']] = self._fallback_process(item)
                            else:
                                result[item['id']] = None
                        elif item['type'] == 'B':
                            if 'config' in item and 'settings' in item['config']:
                                result[item['id']] = self._process_type_b(item)
                        else:
                            result[item['id']] = self._unknown_type_handler(item)
                    else:
                        result[item['id']] = self._default_process(item)
                    
                    self.cache[item['id']] = result[item['id']]
                else:
                    result[item['id']] = self.cache[item['id']]
        
        return result if result else None
    
    def _process_type_a(self, item):
        # More complex logic
        pass
    
    def _process_type_b(self, item):
        # More complex logic
        pass
    
    def _unknown_type_handler(self, item):
        # Complex error handling
        pass
    
    def _fallback_process(self, item):
        # Fallback logic
        pass
    
    def _default_process(self, item):
        # Default processing
        pass
""",
            "sample.js": """
function calculateComplexMetric(data, options = {}) {
    const { threshold = 100, mode = 'default' } = options;
    let result = 0;
    
    for (let i = 0; i < data.length; i++) {
        if (data[i].value > threshold) {
            if (mode === 'complex') {
                result += data[i].value * 2.5 + Math.sqrt(data[i].secondary || 0);
            } else if (mode === 'simple') {
                result += data[i].value;
            } else {
                result += data[i].value * 1.5;
            }
        }
    }
    
    return result;
}

class DataProcessor {
    constructor(config) {
        this.config = config;
        this.cache = new Map();
    }
    
    process(items) {
        return items.map(item => {
            if (this.cache.has(item.id)) {
                return this.cache.get(item.id);
            }
            
            const processed = this.transformItem(item);
            this.cache.set(item.id, processed);
            return processed;
        });
    }
    
    transformItem(item) {
        // Complex transformation logic
        if (item.type === 'numeric') {
            return item.value * this.config.multiplier;
        } else if (item.type === 'string') {
            return item.value.toUpperCase().trim();
        }
        return item.value;
    }
}
"""
        }
        
        success_count = 0
        total_count = len(sample_codes)
        
        for filename, code in sample_codes.items():
            print(f"\n🔍 Analyzing {filename}...")
            
            try:
                language = self.analyzer.get_language(filename)
                result = self.api_client.analyze_code(
                    module_name=filename,
                    file_path=f"/test/{filename}",
                    code_content=code,
                    language=language
                )
                
                if result:
                    risk_level = result.get('risk_level', 'unknown')
                    risk_score = result.get('risk_score', 0)
                    
                    risk_emoji = {"low": "🟢", "medium": "🟡", "high": "🔴"}
                    emoji = risk_emoji.get(risk_level, "⚪")
                    
                    print(f"   ✅ {emoji} Risk: {risk_level.upper()} ({risk_score:.1%})")
                    
                    if 'metrics' in result:
                        metrics = result['metrics']
                        print(f"   📊 LOC: {metrics.get('loc', 0)} | "
                              f"Complexity: {metrics.get('complexity', 0)} | "
                              f"Functions: {metrics.get('functions', 0)}")
                    
                    success_count += 1
                else:
                    print("   ❌ Analysis failed")
                    
            except Exception as e:
                print(f"   ❌ Error: {e}")
        
        print(f"\n📊 Analysis Results: {success_count}/{total_count} successful")
        return success_count == total_count
    
    def test_file_watcher(self):
        """Test file watching functionality"""
        print("\n👁️  Testing File Watcher")
        print("-" * 40)
        
        # Test pattern matching
        test_files = [
            ("/test/app.py", True),
            ("/test/script.js", True), 
            ("/test/component.jsx", True),
            ("/test/main.cpp", True),
            ("/test/node_modules/lib.js", False),
            ("/test/.git/config", False),
            ("/test/__pycache__/module.pyc", False),
            ("/test/README.md", False),
        ]
        
        patterns = self.config['watch_patterns']
        ignore_patterns = self.config['ignore_patterns']
        
        correct_matches = 0
        total_tests = len(test_files)
        
        for file_path, should_match in test_files:
            result = self.analyzer.should_analyze(file_path, patterns, ignore_patterns)
            
            if result == should_match:
                status = "✅" if should_match else "⏭️"
                action = "WATCH" if should_match else "IGNORE"
                print(f"   {status} {Path(file_path).name} → {action}")
                correct_matches += 1
            else:
                status = "❌"
                expected = "WATCH" if should_match else "IGNORE"
                actual = "WATCH" if result else "IGNORE"
                print(f"   {status} {Path(file_path).name} → Expected {expected}, got {actual}")
        
        print(f"\n📊 Pattern Matching: {correct_matches}/{total_tests} correct")
        return correct_matches == total_tests
    
    def test_configuration(self):
        """Test configuration loading and validation"""
        print("\n⚙️  Testing Configuration")
        print("-" * 40)
        
        required_keys = ['api_url', 'project_id', 'watch_patterns', 'ignore_patterns']
        missing_keys = [key for key in required_keys if key not in self.config]
        
        if missing_keys:
            print(f"❌ Missing required configuration keys: {missing_keys}")
            return False
        
        print("✅ All required configuration keys present")
        print(f"   API URL: {self.config['api_url']}")
        print(f"   Watch patterns: {len(self.config['watch_patterns'])} patterns")
        print(f"   Ignore patterns: {len(self.config['ignore_patterns'])} patterns")
        
        return True
    
    def run_all_tests(self):
        """Run complete test suite"""
        print("🧪 Risk Monitoring Agent Test Suite")
        print("=" * 50)
        
        tests = [
            ("Configuration", self.test_configuration),
            ("Backend Connection", self.test_backend_connection),
            ("File Analysis", self.test_file_analysis),
            ("File Watcher", self.test_file_watcher)
        ]
        
        results = []
        for test_name, test_func in tests:
            try:
                result = test_func()
                results.append((test_name, result))
            except Exception as e:
                print(f"\n❌ {test_name} test failed with error: {e}")
                results.append((test_name, False))
        
        # Summary
        print("\n" + "=" * 50)
        print("📋 TEST SUMMARY")
        print("=" * 50)
        
        passed = 0
        for test_name, result in results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status} {test_name}")
            if result:
                passed += 1
        
        total = len(results)
        print(f"\n🎯 Overall: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! The agent is ready to use.")
        else:
            print("⚠️  Some tests failed. Please check the configuration and backend.")
        
        return passed == total

def main():
    """Main test function"""
    if len(sys.argv) > 1 and sys.argv[1] in ['--help', '-h']:
        print("Risk Monitoring Agent Test Suite")
        print("\nUsage:")
        print("  python3 test_agent.py")
        print("\nEnvironment variables:")
        print("  API_URL      - ML backend URL (default: http://localhost:8000/api)")
        print("  PROJECT_ID   - Project identifier (default: test_project)")
        return
    
    tester = AgentTester()
    success = tester.run_all_tests()
    
    if not success:
        print("\n💡 Troubleshooting tips:")
        print("  1. Make sure the ML backend is running:")
        print("     cd ../python-ai && python -m app.main")
        print("  2. Check the API URL in config.json")
        print("  3. Verify all dependencies are installed")
        
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()