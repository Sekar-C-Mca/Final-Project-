"""
Simple dataset manager for ML training
"""

import os
import json
from typing import Dict, List, Optional
from datetime import datetime


class DatasetManager:
    """Simple dataset manager for ML training"""
    
    def __init__(self, dataset_dir: str = "app/datasets"):
        self.dataset_dir = dataset_dir
        os.makedirs(dataset_dir, exist_ok=True)
    
    def get_available_datasets(self) -> Dict:
        """Get list of available datasets"""
        return {
            'synthetic': {
                'name': 'Synthetic Code Metrics',
                'description': 'Generated code quality metrics',
                'samples': 800,
                'features': 9
            }
        }
    
    def list_local_datasets(self) -> List[str]:
        """List all locally available datasets"""
        datasets = []
        if os.path.exists(self.dataset_dir):
            for file in os.listdir(self.dataset_dir):
                if file.endswith(('.csv', '.npz', '.json')):
                    datasets.append(file)
        return datasets
    
    def get_dataset_info(self, dataset_name: str) -> Dict:
        """Get information about a specific dataset"""
        available = self.get_available_datasets()
        return available.get(dataset_name, {})
