import pickle
import os
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from typing import Tuple, Dict, Any
from datetime import datetime

class ModelTrainer:
    """Train and manage ML models for risk prediction"""
    
    ALGORITHMS = {
        'random_forest': RandomForestClassifier,
        'gradient_boosting': GradientBoostingClassifier,
        'svm': SVC,
        'logistic_regression': LogisticRegression
    }
    
    def __init__(self, model_dir: str = "app/models/saved_models"):
        self.model_dir = model_dir
        os.makedirs(model_dir, exist_ok=True)
        self.model = None
        self.algorithm_name = None
    
    def train(self, X_train: np.ndarray, y_train: np.ndarray, 
              algorithm: str = 'random_forest', 
              hyperparameters: Dict[str, Any] = None) -> None:
        """Train a new model"""
        if algorithm not in self.ALGORITHMS:
            raise ValueError(f"Unknown algorithm: {algorithm}. Choose from {list(self.ALGORITHMS.keys())}")
        
        # Default hyperparameters
        default_params = self._get_default_params(algorithm)
        if hyperparameters:
            default_params.update(hyperparameters)
        
        # Initialize and train model
        ModelClass = self.ALGORITHMS[algorithm]
        self.model = ModelClass(**default_params)
        self.algorithm_name = algorithm
        
        print(f"Training {algorithm} model...")
        self.model.fit(X_train, y_train)
        print("✓ Model training completed")
    
    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, float]:
        """Evaluate model performance"""
        if self.model is None:
            raise ValueError("No model trained. Call train() first.")
        
        y_pred = self.model.predict(X_test)
        
        # Calculate metrics
        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred, average='weighted'),
            'recall': recall_score(y_test, y_pred, average='weighted'),
            'f1_score': f1_score(y_test, y_pred, average='weighted'),
        }
        
        # Add AUC-ROC if model supports probability prediction
        if hasattr(self.model, 'predict_proba'):
            try:
                y_proba = self.model.predict_proba(X_test)
                metrics['auc_roc'] = roc_auc_score(y_test, y_proba, multi_class='ovr', average='weighted')
            except:
                pass
        
        return metrics
    
    def save_model(self, filename: str = None) -> str:
        """Save trained model to disk"""
        if self.model is None:
            raise ValueError("No model to save. Train a model first.")
        
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{self.algorithm_name}_{timestamp}.pkl"
        
        filepath = os.path.join(self.model_dir, filename)
        
        with open(filepath, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'algorithm': self.algorithm_name,
                'timestamp': datetime.now()
            }, f)
        
        print(f"✓ Model saved to {filepath}")
        return filepath
    
    def load_model(self, filename: str) -> None:
        """Load a trained model from disk"""
        filepath = os.path.join(self.model_dir, filename)
        
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Model file not found: {filepath}")
        
        with open(filepath, 'rb') as f:
            data = pickle.load(f)
            self.model = data['model']
            self.algorithm_name = data['algorithm']
        
        print(f"✓ Model loaded from {filepath}")
    
    def _get_default_params(self, algorithm: str) -> Dict[str, Any]:
        """Get default hyperparameters for each algorithm"""
        defaults = {
            'random_forest': {
                'n_estimators': 100,
                'max_depth': 10,
                'random_state': 42,
                'n_jobs': -1
            },
            'gradient_boosting': {
                'n_estimators': 100,
                'learning_rate': 0.1,
                'max_depth': 5,
                'random_state': 42
            },
            'svm': {
                'kernel': 'rbf',
                'C': 1.0,
                'probability': True,
                'random_state': 42
            },
            'logistic_regression': {
                'max_iter': 1000,
                'random_state': 42,
                'n_jobs': -1
            }
        }
        return defaults.get(algorithm, {})
