import pickle
import os
import numpy as np
import json
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from typing import Tuple, Dict, Any, Optional
from datetime import datetime

class ModelTrainer:
    """Train and manage ML models for code optimization prediction"""
    
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
        self.scaler = StandardScaler()
        self.feature_names = [
            'LOC', 'Complexity', 'Dependencies', 'Functions', 'Classes',
            'Comments', 'Complexity/LOC', 'Comment Ratio', 'Functions/Class'
        ]
    
    def _get_default_params(self, algorithm: str) -> Dict[str, Any]:
        """Get default hyperparameters for each algorithm"""
        params = {
            'random_forest': {
                'n_estimators': 200,
                'max_depth': 15,
                'min_samples_split': 5,
                'min_samples_leaf': 2,
                'random_state': 42,
                'n_jobs': -1,
                'class_weight': 'balanced'
            },
            'gradient_boosting': {
                'n_estimators': 150,
                'learning_rate': 0.1,
                'max_depth': 5,
                'min_samples_split': 5,
                'min_samples_leaf': 2,
                'random_state': 42
            },
            'svm': {
                'kernel': 'rbf',
                'C': 1.0,
                'gamma': 'scale',
                'random_state': 42
            },
            'logistic_regression': {
                'max_iter': 1000,
                'random_state': 42,
                'solver': 'lbfgs'
            }
        }
        return params.get(algorithm, {})
    
    def train(self, X_train: np.ndarray, y_train: np.ndarray, 
              algorithm: str = 'random_forest', 
              hyperparameters: Optional[Dict[str, Any]] = None,
              scale_features: bool = True) -> None:
        """Train a new model"""
        if algorithm not in self.ALGORITHMS:
            raise ValueError(f"Unknown algorithm: {algorithm}. Choose from {list(self.ALGORITHMS.keys())}")
        
        # Scale features for SVM and Logistic Regression
        if scale_features and algorithm in ['svm', 'logistic_regression']:
            print(f"Scaling features...")
            X_train = self.scaler.fit_transform(X_train)
        
        # Default hyperparameters
        default_params = self._get_default_params(algorithm)
        if hyperparameters:
            default_params.update(hyperparameters)
        
        # Initialize and train model
        ModelClass = self.ALGORITHMS[algorithm]
        self.model = ModelClass(**default_params)
        self.algorithm_name = algorithm
        
        print(f"Training {algorithm} model with {len(X_train)} samples...")
        self.model.fit(X_train, y_train)
        print(f"✓ {algorithm} model training completed")
    
    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, float]:
        """Evaluate model performance"""
        if self.model is None:
            raise ValueError("No model trained. Call train() first.")
        
        # Scale test features if needed
        if self.algorithm_name in ['svm', 'logistic_regression']:
            X_test = self.scaler.transform(X_test)
        
        y_pred = self.model.predict(X_test)
        
        # Calculate metrics
        metrics = {
            'accuracy': float(accuracy_score(y_test, y_pred)),
            'precision': float(precision_score(y_test, y_pred, average='weighted', zero_division=0)),
            'recall': float(recall_score(y_test, y_pred, average='weighted', zero_division=0)),
            'f1_score': float(f1_score(y_test, y_pred, average='weighted', zero_division=0)),
        }
        
        # Add AUC-ROC if model supports probability prediction
        if hasattr(self.model, 'predict_proba'):
            try:
                y_proba = self.model.predict_proba(X_test)
                metrics['auc_roc'] = float(roc_auc_score(y_test, y_proba[:, 1]))
            except:
                pass
        
        return metrics
    
    def predict(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Make predictions with probability scores"""
        if self.model is None:
            raise ValueError("No model trained. Call train() first.")
        
        # Scale features if needed
        if self.algorithm_name in ['svm', 'logistic_regression']:
            X = self.scaler.transform(X)
        
        predictions = self.model.predict(X)
        
        if hasattr(self.model, 'predict_proba'):
            probabilities = self.model.predict_proba(X)[:, 1]  # Get probability for positive class
        else:
            probabilities = predictions.astype(float)
        
        return predictions, probabilities
    
    def get_feature_importance(self) -> Optional[Dict[str, float]]:
        """Get feature importance for tree-based models"""
        if not hasattr(self.model, 'feature_importances_'):
            return None
        
        importances = self.model.feature_importances_
        return {name: float(importance) for name, importance in zip(self.feature_names, importances)}
    
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
