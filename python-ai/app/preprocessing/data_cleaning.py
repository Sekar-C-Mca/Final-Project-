import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from typing import Tuple, Optional

class DataPreprocessor:
    """Handle data cleaning and preprocessing for ML training"""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.feature_names = [
            'loc', 'complexity', 'dependencies', 'functions', 
            'classes', 'comments', 'complexity_per_loc', 
            'comment_ratio', 'functions_per_class'
        ]
    
    def clean_dataset(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and prepare dataset for training"""
        cleaned = df.copy()
        
        # Remove duplicates
        cleaned = cleaned.drop_duplicates()
        
        # Handle missing values
        cleaned = cleaned.fillna(cleaned.median(numeric_only=True))
        
        # Remove outliers using IQR method
        for col in cleaned.select_dtypes(include=[np.number]).columns:
            Q1 = cleaned[col].quantile(0.25)
            Q3 = cleaned[col].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            cleaned = cleaned[(cleaned[col] >= lower_bound) & (cleaned[col] <= upper_bound)]
        
        return cleaned
    
    def prepare_features(self, df: pd.DataFrame, fit: bool = False) -> np.ndarray:
        """Prepare features for ML model"""
        # Select only feature columns
        feature_cols = [col for col in self.feature_names if col in df.columns]
        X = df[feature_cols].values
        
        # Normalize features
        if fit:
            X_scaled = self.scaler.fit_transform(X)
        else:
            X_scaled = self.scaler.transform(X)
        
        return X_scaled
    
    def prepare_labels(self, df: pd.DataFrame, label_col: str = 'defects') -> np.ndarray:
        """Prepare labels for classification"""
        # Convert to binary or multi-class based on defect count
        if label_col in df.columns:
            labels = df[label_col].values
            # Create risk categories: 0 defects = low, 1-2 = medium, 3+ = high
            risk_labels = np.where(labels == 0, 0, 
                                  np.where(labels <= 2, 1, 2))
            return risk_labels
        else:
            raise ValueError(f"Label column '{label_col}' not found in dataset")
    
    def split_data(self, X: np.ndarray, y: np.ndarray, 
                   test_size: float = 0.2, random_state: int = 42) -> Tuple:
        """Split data into train and test sets"""
        from sklearn.model_selection import train_test_split
        return train_test_split(X, y, test_size=test_size, 
                               random_state=random_state, stratify=y)
    
    def balance_dataset(self, X: np.ndarray, y: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Balance dataset using SMOTE for minority class"""
        try:
            from imblearn.over_sampling import SMOTE
            smote = SMOTE(random_state=42)
            X_balanced, y_balanced = smote.fit_resample(X, y)
            return X_balanced, y_balanced
        except ImportError:
            print("Warning: imbalanced-learn not installed. Skipping SMOTE.")
            return X, y
