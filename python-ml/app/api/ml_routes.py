"""
ML API routes for code optimization prediction
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.models.trainer import ModelTrainer
from app.models.dataset_generator import DatasetGenerator
from datetime import datetime
from typing import Dict, List
import numpy as np
import os
import json

router = APIRouter(prefix="/ml", tags=["ML Optimization"])

# Initialize trainer
trainer = ModelTrainer()

# Load pre-trained model if available
MODEL_PATH = "app/models/saved_models/random_forest_model.pkl"
MODEL_LOADED = False

try:
    if os.path.exists(MODEL_PATH):
        trainer.load_model("random_forest_model.pkl")
        MODEL_LOADED = True
except:
    pass


@router.post("/predict", tags=["Prediction"])
async def predict_code_optimization(code_metrics: Dict):
    """
    Predict if code is optimized based on code metrics.
    
    Input: Dictionary with 9 code metrics:
    - loc: Lines of code
    - complexity: Cyclomatic complexity
    - dependencies: Number of dependencies
    - functions: Number of functions
    - classes: Number of classes
    - comments: Number of comment lines
    - complexity_per_loc: Complexity / LOC
    - comment_ratio: Comments / LOC
    - functions_per_class: Functions / Classes
    
    Output: Prediction (optimized/unoptimized) with confidence score
    """
    try:
        if not MODEL_LOADED:
            raise HTTPException(status_code=503, detail="ML model not loaded. Train model first.")
        
        # Validate input
        required_fields = ['loc', 'complexity', 'dependencies', 'functions', 'classes', 
                         'comments', 'complexity_per_loc', 'comment_ratio', 'functions_per_class']
        
        for field in required_fields:
            if field not in code_metrics:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Convert to numpy array in correct order
        metrics_array = np.array([[
            float(code_metrics['loc']),
            float(code_metrics['complexity']),
            float(code_metrics['dependencies']),
            float(code_metrics['functions']),
            float(code_metrics['classes']),
            float(code_metrics['comments']),
            float(code_metrics['complexity_per_loc']),
            float(code_metrics['comment_ratio']),
            float(code_metrics['functions_per_class'])
        ]])
        
        # Make prediction
        prediction, probability = trainer.predict(metrics_array)
        
        # Get feature importance
        feature_importance = trainer.get_feature_importance()
        
        # Determine optimization status
        is_optimized = bool(prediction[0] == 1)
        confidence = float(probability[0]) if is_optimized else float(1 - probability[0])
        
        # Generate recommendations
        recommendations = generate_recommendations(code_metrics, is_optimized)
        
        return JSONResponse(content={
            "timestamp": datetime.utcnow().isoformat(),
            "is_optimized": is_optimized,
            "optimization_status": "Optimized" if is_optimized else "Unoptimized",
            "confidence": f"{confidence:.2%}",
            "confidence_score": float(confidence),
            "input_metrics": code_metrics,
            "feature_importance": feature_importance,
            "recommendations": recommendations
        })
    
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/batch-predict", tags=["Prediction"])
async def batch_predict(code_samples: List[Dict]):
    """
    Predict optimization for multiple code samples.
    
    Input: List of code metrics dictionaries
    Output: List of predictions with scores
    """
    try:
        if not MODEL_LOADED:
            raise HTTPException(status_code=503, detail="ML model not loaded.")
        
        results = []
        for i, sample in enumerate(code_samples):
            prediction = await predict_code_optimization(sample)
            results.append({
                "sample_index": i,
                "result": prediction.body.decode() if hasattr(prediction, 'body') else prediction
            })
        
        return JSONResponse(content={
            "total_samples": len(code_samples),
            "predictions": results
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")


@router.get("/model-info", tags=["Model Management"])
async def get_model_info():
    """Get information about the loaded model"""
    try:
        results_file = "app/models/saved_models/training_results.json"
        
        if not os.path.exists(results_file):
            return JSONResponse(content={
                "model_loaded": MODEL_LOADED,
                "algorithm": trainer.algorithm_name,
                "status": "No training data available"
            })
        
        with open(results_file, 'r') as f:
            training_results = json.load(f)
        
        return JSONResponse(content={
            "model_loaded": MODEL_LOADED,
            "algorithm": trainer.algorithm_name,
            "training_timestamp": training_results.get('timestamp'),
            "metrics": training_results.get('metrics'),
            "dataset_info": training_results.get('dataset'),
            "feature_names": training_results.get('feature_names'),
            "feature_importance": training_results.get('feature_importance')
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model info: {str(e)}")


@router.post("/retrain", tags=["Model Management"])
async def retrain_model(dataset_size: int = 800):
    """
    Retrain the Random Forest model with new synthetic data.
    
    - **dataset_size**: Total number of samples (split 50-50)
    """
    try:
        global trainer
        
        print(f"Retraining model with {dataset_size} samples...")
        
        # Generate new dataset
        generator = DatasetGenerator()
        X_train, X_test, y_train, y_test = generator.generate_dataset(
            optimized_count=dataset_size // 2,
            unoptimized_count=dataset_size // 2
        )
        
        # Train new model
        trainer = ModelTrainer()
        trainer.train(X_train, y_train, algorithm='random_forest')
        
        # Evaluate
        metrics = trainer.evaluate(X_test, y_test)
        
        # Save model
        model_path = trainer.save_model("random_forest_model.pkl")
        
        # Save training results
        feature_importance = trainer.get_feature_importance()
        results = {
            "timestamp": datetime.utcnow().isoformat(),
            "algorithm": "random_forest",
            "dataset": {
                "total_samples": dataset_size,
                "optimized_samples": dataset_size // 2,
                "unoptimized_samples": dataset_size // 2,
                "train_size": len(X_train),
                "test_size": len(X_test)
            },
            "metrics": metrics,
            "feature_importance": feature_importance,
            "feature_names": trainer.feature_names
        }
        
        results_file = "app/models/saved_models/training_results.json"
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        return JSONResponse(content={
            "message": "Model retrained successfully",
            "model_path": model_path,
            "metrics": metrics,
            "dataset_info": {
                "training_samples": len(X_train),
                "testing_samples": len(X_test)
            }
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")


@router.get("/health", tags=["System"])
async def health_check():
    """ML service health check"""
    return {
        "status": "healthy",
        "service": "ML Optimization Prediction",
        "model_loaded": MODEL_LOADED,
        "model_algorithm": trainer.algorithm_name if MODEL_LOADED else "none",
        "timestamp": datetime.utcnow().isoformat()
    }


def generate_recommendations(metrics: Dict, is_optimized: bool) -> List[str]:
    """Generate optimization recommendations based on metrics"""
    recommendations = []
    
    loc = float(metrics.get('loc', 0))
    complexity = float(metrics.get('complexity', 0))
    dependencies = float(metrics.get('dependencies', 0))
    comments = float(metrics.get('comments', 0))
    comment_ratio = float(metrics.get('comment_ratio', 0))
    complexity_per_loc = float(metrics.get('complexity_per_loc', 0))
    functions_per_class = float(metrics.get('functions_per_class', 0))
    
    # Complexity recommendations
    if complexity > 30:
        recommendations.append("⚠️ High cyclomatic complexity - Consider breaking into smaller functions")
    
    # Documentation recommendations
    if comment_ratio < 0.08:
        recommendations.append("📝 Low comment ratio - Add more documentation")
    elif comment_ratio > 0.25:
        recommendations.append("💬 High comment density - Consider if all comments are necessary")
    
    # Dependency recommendations
    if dependencies > 10:
        recommendations.append("🔗 Many dependencies - Review and reduce coupling")
    
    # Size recommendations
    if loc > 500:
        recommendations.append("📏 Large module - Consider splitting into smaller modules")
    
    # Function structure recommendations
    if functions_per_class < 1.5 and functions_per_class > 0:
        recommendations.append("🏗️ Low functions per class - Class may have too many responsibilities")
    elif functions_per_class > 4:
        recommendations.append("🏗️ High functions per class - Consider consolidating related functions")
    
    # Code density
    if complexity_per_loc > 0.6:
        recommendations.append("🔥 High complexity density - Simplify logic and improve clarity")
    
    # Positive recommendations
    if is_optimized:
        recommendations.append("✅ Code follows optimization best practices")
    
    # Default recommendation
    if not recommendations:
        recommendations.append("Code structure is reasonable - Monitor for future improvements")
    
    return recommendations
