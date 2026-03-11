"""
Dataset downloader and manager
Downloads datasets from online sources and stores them locally
"""

import os
import json
import requests
from typing import Dict, List, Optional
from datetime import datetime
import pandas as pd
from pathlib import Path


class DatasetManager:
    """Manage and download datasets for ML training"""
    
    def __init__(self, dataset_dir: str = "app/datasets"):
        self.dataset_dir = dataset_dir
        os.makedirs(dataset_dir, exist_ok=True)
        self.metadata_file = os.path.join(dataset_dir, "metadata.json")
        self._load_metadata()
    
    def _load_metadata(self):
        """Load dataset metadata"""
        if os.path.exists(self.metadata_file):
            with open(self.metadata_file, 'r') as f:
                self.metadata = json.load(f)
        else:
            self.metadata = {"datasets": {}}
    
    def _save_metadata(self):
        """Save dataset metadata"""
        with open(self.metadata_file, 'w') as f:
            json.dump(self.metadata, f, indent=2)
    
    def get_available_datasets(self) -> Dict:
        """Get list of available datasets"""
        return {
            'iris': {
                'name': 'Iris Dataset',
                'source': 'UCI Machine Learning Repository',
                'samples': 150,
                'features': 4,
                'classes': 3,
                'description': 'Classic flower classification dataset'
            },
            'wine': {
                'name': 'Wine Dataset',
                'source': 'UCI Machine Learning Repository',
                'samples': 178,
                'features': 13,
                'classes': 3,
                'description': 'Wine classification dataset'
            },
            'breast_cancer': {
                'name': 'Breast Cancer Dataset',
                'source': 'UCI Machine Learning Repository',
                'samples': 569,
                'features': 30,
                'classes': 2,
                'description': 'Breast cancer diagnosis classification'
            },
            'digits': {
                'name': 'Digits Dataset',
                'source': 'Scikit-learn',
                'samples': 1797,
                'features': 64,
                'classes': 10,
                'description': 'Handwritten digit recognition'
            },
            'credit_card': {
                'name': 'Credit Card Fraud Detection',
                'source': 'Kaggle',
                'samples': 284807,
                'features': 30,
                'classes': 2,
                'description': 'Credit card fraud detection dataset'
            }
        }
    
    def download_dataset(self, dataset_name: str) -> Optional[str]:
        """
        Download a dataset from online source
        
        Args:
            dataset_name: Name of the dataset to download
            
        Returns:
            Path to the downloaded dataset file
        """
        try:
            if dataset_name == 'iris':
                return self._download_iris()
            elif dataset_name == 'wine':
                return self._download_wine()
            elif dataset_name == 'breast_cancer':
                return self._download_breast_cancer()
            elif dataset_name == 'digits':
                return self._download_digits()
            elif dataset_name == 'credit_card':
                return self._download_credit_card()
            else:
                raise ValueError(f"Unknown dataset: {dataset_name}")
        
        except Exception as e:
            print(f"❌ Error downloading dataset {dataset_name}: {e}")
            return None
    
    def _download_iris(self) -> str:
        """Download Iris dataset from UCI"""
        filepath = os.path.join(self.dataset_dir, 'iris.csv')
        
        if os.path.exists(filepath):
            print(f"✅ Iris dataset already exists at {filepath}")
            return filepath
        
        try:
            url = "https://archive.ics.uci.edu/ml/machine-learning-databases/iris/iris.data"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                
                self._update_metadata('iris', filepath)
                print(f"✅ Iris dataset downloaded to {filepath}")
                return filepath
        except Exception as e:
            print(f"❌ Failed to download Iris dataset: {e}")
        
        return None
    
    def _download_wine(self) -> str:
        """Download Wine dataset from UCI"""
        filepath = os.path.join(self.dataset_dir, 'wine.csv')
        
        if os.path.exists(filepath):
            print(f"✅ Wine dataset already exists at {filepath}")
            return filepath
        
        try:
            url = "https://archive.ics.uci.edu/ml/machine-learning-databases/wine/wine.data"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                
                self._update_metadata('wine', filepath)
                print(f"✅ Wine dataset downloaded to {filepath}")
                return filepath
        except Exception as e:
            print(f"❌ Failed to download Wine dataset: {e}")
        
        return None
    
    def _download_breast_cancer(self) -> str:
        """Download Breast Cancer dataset from sklearn"""
        filepath = os.path.join(self.dataset_dir, 'breast_cancer.csv')
        
        if os.path.exists(filepath):
            print(f"✅ Breast Cancer dataset already exists at {filepath}")
            return filepath
        
        try:
            from sklearn.datasets import load_breast_cancer
            
            data = load_breast_cancer()
            df = pd.DataFrame(data.data, columns=data.feature_names)
            df['target'] = data.target
            df.to_csv(filepath, index=False)
            
            self._update_metadata('breast_cancer', filepath)
            print(f"✅ Breast Cancer dataset downloaded to {filepath}")
            return filepath
        except Exception as e:
            print(f"❌ Failed to download Breast Cancer dataset: {e}")
        
        return None
    
    def _download_digits(self) -> str:
        """Download Digits dataset from sklearn"""
        filepath = os.path.join(self.dataset_dir, 'digits.csv')
        
        if os.path.exists(filepath):
            print(f"✅ Digits dataset already exists at {filepath}")
            return filepath
        
        try:
            from sklearn.datasets import load_digits
            
            data = load_digits()
            df = pd.DataFrame(data.data, columns=[f'pixel_{i}' for i in range(data.data.shape[1])])
            df['target'] = data.target
            df.to_csv(filepath, index=False)
            
            self._update_metadata('digits', filepath)
            print(f"✅ Digits dataset downloaded to {filepath}")
            return filepath
        except Exception as e:
            print(f"❌ Failed to download Digits dataset: {e}")
        
        return None
    
    def _download_credit_card(self) -> str:
        """Download Credit Card Fraud dataset from Kaggle"""
        filepath = os.path.join(self.dataset_dir, 'credit_card_fraud.csv')
        
        if os.path.exists(filepath):
            print(f"✅ Credit Card dataset already exists at {filepath}")
            return filepath
        
        print("ℹ️ Credit Card Fraud dataset requires Kaggle API")
        print("Download manually from: https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud")
        print(f"Place the downloaded file at: {filepath}")
        
        return None
    
    def _update_metadata(self, dataset_name: str, filepath: str):
        """Update metadata for downloaded dataset"""
        self.metadata['datasets'][dataset_name] = {
            'path': filepath,
            'downloaded_at': datetime.now().isoformat(),
            'file_size': os.path.getsize(filepath)
        }
        self._save_metadata()
    
    def list_local_datasets(self) -> Dict:
        """List all locally available datasets"""
        return self.metadata.get('datasets', {})
    
    def load_dataset(self, dataset_name: str) -> Optional[pd.DataFrame]:
        """Load a dataset"""
        try:
            # First check if it's already downloaded
            local_datasets = self.list_local_datasets()
            
            if dataset_name in local_datasets:
                filepath = local_datasets[dataset_name]['path']
                if os.path.exists(filepath):
                    df = pd.read_csv(filepath)
                    print(f"✅ Loaded {dataset_name} from {filepath}")
                    return df
            
            # Otherwise download it
            filepath = self.download_dataset(dataset_name)
            if filepath and os.path.exists(filepath):
                df = pd.read_csv(filepath)
                return df
        
        except Exception as e:
            print(f"❌ Error loading dataset {dataset_name}: {e}")
        
        return None
