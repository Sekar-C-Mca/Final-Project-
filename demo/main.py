#!/usr/bin/env python3
"""
Demo Python application for testing monitoring
"""

import os
import sys
import json
import datetime

class DataProcessor:
    """Class for processing data with some complexity"""
    
    def __init__(self, data_source):
        self.data_source = data_source
        self.processed_count = 0
        self.cache = {}
        
    def load_data(self):
        """Load data from source"""
        try:
            with open(self.data_source, 'r') as f:
                data = json.load(f)
            return data
        except Exception as e:
            print(f"Error loading data: {e}")
            return None
            
    def process_item(self, item):
        """Process a single data item with enhanced validation"""
        # Enhanced validation and error handling
        if not isinstance(item, dict):
            raise ValueError("Item must be a dictionary")
            
        # Some complex processing logic
        if 'timestamp' in item:
            item['processed_at'] = datetime.datetime.now().isoformat()
        
        # Cache expensive calculations
        key = str(hash(str(item)))
        if key in self.cache:
            return self.cache[key]
            
        result = self._complex_calculation(item)
        self.cache[key] = result
        self.processed_count += 1
        return result
        
    def _complex_calculation(self, item):
        """Complex calculation with nested loops"""
        total = 0
        for i in range(10):
            for j in range(10):
                if 'value' in item:
                    total += item['value'] * i * j
                else:
                    total += i * j
        return total

def main():
    """Main entry point with enhanced functionality"""
    processor = DataProcessor('data.json')
    data = processor.load_data()
    
    if data:
        results = []
        for item in data:
            result = processor.process_item(item)
            results.append(result)
            
        # Enhanced reporting
        print(f"Processed {len(results)} items")
        print(f"Total processed: {processor.processed_count}")
        print(f"Cache size: {len(processor.cache)}")
    else:
        print("No data to process")

if __name__ == "__main__":
    main()