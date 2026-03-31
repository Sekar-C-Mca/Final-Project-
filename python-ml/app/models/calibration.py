"""
Confidence Score Calibration Module
Implements Platt Scaling and ensemble voting for reliable confidence scores
"""

import numpy as np
from typing import Tuple, Dict, List
from sklearn.preprocessing import StandardScaler
import pickle
import os
from datetime import datetime


class ConfidenceCalibrator:
    """Calibrate model predictions using Platt Scaling for true probability estimates"""
    
    def __init__(self, model_dir: str = "app/models/saved_models"):
        self.model_dir = model_dir
        self.platt_scaler = StandardScaler()
        self.calibration_params = None
        self.is_calibrated = False
    
    def platt_scale(self, raw_predictions: np.ndarray, 
                   calibration_data: Tuple[np.ndarray, np.ndarray] = None) -> np.ndarray:
        """
        Apply Platt Scaling to calibrate raw model outputs to probabilities
        
        Platt Scaling: P(y=1|f) = 1 / (1 + exp(A*f + B))
        where f is the raw model output
        """
        if calibration_data is not None:
            # Train calibration using validation data
            raw_preds, labels = calibration_data
            
            # Fit logistic regression on calibration data
            from sklearn.linear_model import LogisticRegression
            
            # Reshape for sklearn
            raw_preds_2d = raw_preds.reshape(-1, 1)
            
            # Fit calibration model
            calibration_model = LogisticRegression()
            calibration_model.fit(raw_preds_2d, labels)
            
            # Store parameters (A, B for Platt Scaling)
            self.calibration_params = {
                'A': float(calibration_model.coef_[0][0]),
                'B': float(calibration_model.intercept_[0]),
                'method': 'platt_scaling'
            }
            self.is_calibrated = True
            
            return calibration_model.predict_proba(raw_preds_2d)[:, 1]
        
        elif self.is_calibrated and self.calibration_params:
            # Apply pre-trained calibration
            A = self.calibration_params['A']
            B = self.calibration_params['B']
            
            # Platt formula: P = 1 / (1 + exp(A*f + B))
            calibrated = 1.0 / (1.0 + np.exp(A * raw_predictions + B))
            return np.clip(calibrated, 0, 1)
        
        else:
            # No calibration available, return as-is
            return np.clip(raw_predictions, 0, 1)
    
    def save_calibration(self, algorithm_name: str) -> str:
        """Save calibration parameters to disk"""
        if not self.is_calibrated:
            raise ValueError("No calibration data to save")
        
        filepath = os.path.join(self.model_dir, f"{algorithm_name}_calibration.pkl")
        
        with open(filepath, 'wb') as f:
            pickle.dump({
                'calibration_params': self.calibration_params,
                'is_calibrated': self.is_calibrated,
                'timestamp': datetime.now().isoformat()
            }, f)
        
        print(f"✅ Calibration saved to {filepath}")
        return filepath
    
    def load_calibration(self, algorithm_name: str) -> bool:
        """Load calibration parameters from disk"""
        filepath = os.path.join(self.model_dir, f"{algorithm_name}_calibration.pkl")
        
        if not os.path.exists(filepath):
            return False
        
        try:
            with open(filepath, 'rb') as f:
                data = pickle.load(f)
                self.calibration_params = data['calibration_params']
                self.is_calibrated = data['is_calibrated']
            
            print(f"✅ Calibration loaded from {filepath}")
            return True
        except Exception as e:
            print(f"⚠️ Error loading calibration: {e}")
            return False


class EnsembleVotingPredictor:
    """
    Ensemble voting system that combines multiple models for robust predictions
    with calibrated confidence scores based on model agreement
    """
    
    def __init__(self, models_dir: str = "app/models/saved_models"):
        self.models_dir = models_dir
        self.loaded_models = {}
        self.calibrators = {}
    
    def load_model(self, algorithm_name: str, trainer) -> bool:
        """Load a trained model into the ensemble"""
        try:
            model_filename = f"{algorithm_name}_model.pkl"
            model_path = os.path.join(self.models_dir, model_filename)
            
            if not os.path.exists(model_path):
                print(f"⚠️ Model not found: {model_filename}")
                return False
            
            # Load the model
            import pickle
            with open(model_path, 'rb') as f:
                model_data = pickle.load(f)
            
            self.loaded_models[algorithm_name] = {
                'model': model_data['model'],
                'algorithm': model_data['algorithm'],
                'scaler': model_data.get('scaler'),
                'feature_names': model_data.get('feature_names')
            }
            
            # Load calibration if available
            calibrator = ConfidenceCalibrator(self.models_dir)
            if calibrator.load_calibration(algorithm_name):
                self.calibrators[algorithm_name] = calibrator
            
            print(f"✅ Loaded {algorithm_name} into ensemble")
            return True
        
        except Exception as e:
            print(f"❌ Error loading {algorithm_name}: {e}")
            return False
    
    def ensemble_predict(self, X: np.ndarray, 
                        selected_algorithm: str = None) -> Tuple[bool, float, Dict]:
        """
        Make predictions using ensemble voting
        
        Returns:
            - prediction (bool): True = optimized, False = unoptimized
            - calibrated_confidence (float): 0-1 confidence score
            - voting_details (dict): Details of all model votes
        """
        if not self.loaded_models:
            raise ValueError("No models loaded in ensemble")
        
        # Collect votes from all loaded models
        votes = {}  # algorithm -> prediction (0 or 1)
        probabilities = {}  # algorithm -> probability
        
        for algorithm_name, model_data in self.loaded_models.items():
            try:
                model = model_data['model']
                scaler = model_data.get('scaler')
                
                # Scale input if needed
                X_input = X.copy()
                if algorithm_name in ['svm', 'logistic_regression'] and scaler:
                    X_input = scaler.transform(X)
                
                # Get prediction
                pred = model.predict(X_input)[0]
                votes[algorithm_name] = int(pred)
                
                # Get probability
                if hasattr(model, 'predict_proba'):
                    prob = model.predict_proba(X_input)[0, 1]  # Probability of class 1 (optimized)
                else:
                    prob = float(pred)
                
                # Apply calibration if available
                if algorithm_name in self.calibrators:
                    calibrator = self.calibrators[algorithm_name]
                    prob = calibrator.platt_scale(np.array([prob]))[0]
                
                probabilities[algorithm_name] = float(prob)
            
            except Exception as e:
                print(f"⚠️ Error predicting with {algorithm_name}: {e}")
                continue
        
        # Calculate ensemble prediction (majority vote)
        if not votes:
            raise ValueError("No models could make predictions")
        
        vote_counts = {0: 0, 1: 0}
        for vote in votes.values():
            vote_counts[vote] += 1
        
        # Ensemble prediction
        ensemble_pred = max(vote_counts, key=vote_counts.get)
        num_models = len(votes)
        
        # Calculate calibrated confidence based on:
        # 1. Agreement among models
        # 2. Average probability from models
        agreement_ratio = max(vote_counts.values()) / num_models
        avg_probability = np.mean(list(probabilities.values()))
        
        # Confidence calculation:
        # - If all models agree and probability is extreme (near 0 or 1) → HIGH confidence
        # - If models partially agree (60-80%) and probability is moderate → MEDIUM confidence
        # - If models disagree (50/50) or probability is uncertain → LOW confidence
        
        if agreement_ratio >= 0.8:  # 80%+ agreement
            # High agreement, use probability confidence
            if ensemble_pred == 1:
                # Code is optimized
                calibrated_confidence = avg_probability * 0.95  # Slightly dampened
            else:
                # Code is unoptimized
                calibrated_confidence = (1 - avg_probability) * 0.95
        
        elif agreement_ratio >= 0.6:  # 60-80% agreement
            # Moderate agreement, reduce confidence
            if ensemble_pred == 1:
                calibrated_confidence = avg_probability * 0.60
            else:
                calibrated_confidence = (1 - avg_probability) * 0.60
        
        else:  # Less than 60% agreement
            # Low agreement, very low confidence
            if ensemble_pred == 1:
                calibrated_confidence = avg_probability * 0.30
            else:
                calibrated_confidence = (1 - avg_probability) * 0.30
        
        # Ensure confidence is in valid range
        calibrated_confidence = np.clip(calibrated_confidence, 0.2, 0.95)
        
        # Voting details
        voting_details = {
            "votes": votes,
            "probabilities": probabilities,
            "agreement_ratio": float(agreement_ratio),
            "ensemble_prediction": int(ensemble_pred),
            "num_models": num_models,
            "model_agreement_percentage": f"{agreement_ratio*100:.1f}%"
        }
        
        return bool(ensemble_pred), calibrated_confidence, voting_details
    
    def single_model_predict(self, X: np.ndarray, 
                           algorithm_name: str) -> Tuple[bool, float, Dict]:
        """
        Make prediction using a single model with calibrated confidence
        
        Returns:
            - prediction (bool)
            - calibrated_confidence (float)
            - details (dict)
        """
        if algorithm_name not in self.loaded_models:
            raise ValueError(f"Model {algorithm_name} not loaded in ensemble")
        
        model_data = self.loaded_models[algorithm_name]
        model = model_data['model']
        scaler = model_data.get('scaler')
        
        # Scale input if needed
        X_input = X.copy()
        if algorithm_name in ['svm', 'logistic_regression'] and scaler:
            X_input = scaler.transform(X)
        
        # Get prediction and probability
        pred = model.predict(X_input)[0]
        
        if hasattr(model, 'predict_proba'):
            prob = model.predict_proba(X_input)[0, 1]  # Probability of class 1
        else:
            prob = float(pred)
        
        # Apply calibration if available
        if algorithm_name in self.calibrators:
            calibrator = self.calibrators[algorithm_name]
            prob = calibrator.platt_scale(np.array([prob]))[0]
        
        # Calibrated confidence based on probability
        if pred == 1:
            # Optimized code
            calibrated_confidence = prob * 0.90  # Slightly dampened
        else:
            # Unoptimized code
            calibrated_confidence = (1 - prob) * 0.90
        
        # Ensure confidence is in valid range
        calibrated_confidence = np.clip(calibrated_confidence, 0.25, 0.95)
        
        details = {
            "algorithm": algorithm_name,
            "raw_probability": float(prob),
            "calibrated_confidence": float(calibrated_confidence),
            "prediction_class": "Optimized" if pred == 1 else "Unoptimized"
        }
        
        return bool(pred), calibrated_confidence, details


def calculate_confidence_level(confidence_score: float) -> str:
    """
    Convert confidence score (0-1) to human-readable confidence level
    """
    if confidence_score >= 0.80:
        return "Very High"
    elif confidence_score >= 0.65:
        return "High"
    elif confidence_score >= 0.50:
        return "Medium"
    elif confidence_score >= 0.35:
        return "Low"
    else:
        return "Very Low"
