import os
import numpy as np
from typing import Optional
from app.models.trainer import ModelTrainer
from app.preprocessing.feature_extraction import FeatureExtractor
from app.api.schemas import CodeMetrics, RiskLevel, AnalysisResponse
from datetime import datetime

class RiskPredictor:
    """Predict risk level for code modules"""
    
    def __init__(self, model_path: Optional[str] = None):
        self.trainer = ModelTrainer()
        self.feature_extractor = FeatureExtractor()
        
        # Load default model or specified model
        if model_path:
            self.trainer.load_model(model_path)
        else:
            # Try to load the latest model
            self._load_latest_model()
    
    def _load_latest_model(self):
        """Load the most recent trained model"""
        model_dir = self.trainer.model_dir
        if os.path.exists(model_dir):
            models = [f for f in os.listdir(model_dir) if f.endswith('.pkl')]
            if models:
                latest_model = sorted(models)[-1]
                self.trainer.load_model(latest_model)
                return
        
        print("⚠ No trained model found. Please train a model first.")
    
    def predict(self, code: str, language: str, module_name: str, file_path: str) -> AnalysisResponse:
        """Predict risk for a code module"""
        # Extract features
        metrics = self.feature_extractor.extract_features(code, language, file_path)
        
        # Convert to feature vector
        feature_vector = self.feature_extractor.metrics_to_feature_vector(metrics)
        
        # Reshape for prediction
        X = np.array([feature_vector])
        
        # Predict risk
        if self.trainer.model is None:
            # Fallback to heuristic-based prediction if no model
            risk_level, risk_score = self._heuristic_prediction(metrics)
        else:
            # Normalize features (assuming trainer has scaler)
            prediction = self.trainer.model.predict(X)[0]
            
            # Get probability scores if available
            if hasattr(self.trainer.model, 'predict_proba'):
                probabilities = self.trainer.model.predict_proba(X)[0]
                risk_score = max(probabilities)
            else:
                risk_score = 0.8  # Default confidence
            
            # Map prediction to risk level
            risk_level = self._map_prediction_to_risk(prediction)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(metrics, risk_level)
        
        return AnalysisResponse(
            module_name=module_name,
            file_path=file_path,
            risk_level=risk_level,
            risk_score=risk_score,
            metrics=metrics,
            recommendations=recommendations,
            timestamp=datetime.utcnow()
        )
    
    def _map_prediction_to_risk(self, prediction: int) -> RiskLevel:
        """Map numeric prediction to risk level"""
        risk_map = {
            0: RiskLevel.LOW,
            1: RiskLevel.MEDIUM,
            2: RiskLevel.HIGH
        }
        return risk_map.get(prediction, RiskLevel.MEDIUM)
    
    def _heuristic_prediction(self, metrics: CodeMetrics) -> tuple[RiskLevel, float]:
        """Fallback heuristic-based risk prediction"""
        score = 0
        
        # High complexity
        if metrics.complexity > 10:
            score += 3
        elif metrics.complexity > 5:
            score += 1
        
        # Large file
        if metrics.loc > 500:
            score += 2
        elif metrics.loc > 200:
            score += 1
        
        # Low test coverage (inferred from comments)
        comment_ratio = metrics.comments / max(metrics.loc, 1)
        if comment_ratio < 0.1:
            score += 1
        
        # Many dependencies
        if metrics.dependencies > 20:
            score += 2
        elif metrics.dependencies > 10:
            score += 1
        
        # Determine risk level
        if score >= 5:
            return RiskLevel.HIGH, 0.85
        elif score >= 3:
            return RiskLevel.MEDIUM, 0.60
        else:
            return RiskLevel.LOW, 0.30
    
    def _generate_recommendations(self, metrics: CodeMetrics, risk_level: RiskLevel) -> list[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        if risk_level == RiskLevel.HIGH:
            if metrics.complexity > 10:
                recommendations.append("⚠️ High cyclomatic complexity - consider refactoring into smaller functions")
            if metrics.loc > 500:
                recommendations.append("⚠️ Large file size - consider splitting into multiple modules")
            if metrics.dependencies > 20:
                recommendations.append("⚠️ Too many dependencies - review and reduce coupling")
            recommendations.append("🔴 Priority: Add comprehensive unit tests")
            recommendations.append("🔴 Priority: Conduct thorough code review")
        
        elif risk_level == RiskLevel.MEDIUM:
            if metrics.complexity > 5:
                recommendations.append("⚡ Moderate complexity - review complex functions")
            if metrics.comments / max(metrics.loc, 1) < 0.1:
                recommendations.append("💬 Add more documentation and comments")
            recommendations.append("🟡 Recommended: Increase test coverage")
        
        else:
            recommendations.append("✅ Code quality looks good")
            recommendations.append("💡 Maintain current testing and documentation practices")
        
        return recommendations
