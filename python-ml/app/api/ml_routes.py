"""
ML API routes for code optimization prediction with calibrated confidence scoring
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.models.trainer import ModelTrainer
from app.models.dataset_generator import DatasetGenerator
from app.datasets.dataset_manager import DatasetManager
from app.models.calibration import EnsembleVotingPredictor, calculate_confidence_level
from datetime import datetime
from typing import Dict, List
import numpy as np
import os
import json

router = APIRouter(prefix="/ml", tags=["ML Optimization"])

# Initialize trainer and dataset manager
trainer = ModelTrainer()
dataset_manager = DatasetManager()
ensemble_predictor = EnsembleVotingPredictor("app/models/saved_models")

# Load pre-trained model if available
SELECTED_ALGORITHM_FILE = "app/models/saved_models/selected_algorithm.json"
CURRENT_ALGORITHM = "random_forest"  # Default algorithm
MODEL_LOADED = False
USE_ENSEMBLE = False  # Flag to use ensemble voting when multiple models available

def load_current_algorithm_model():
    """Load the currently selected algorithm's model and attempt to load ensemble models"""
    global trainer, CURRENT_ALGORITHM, MODEL_LOADED, USE_ENSEMBLE, ensemble_predictor
    
    try:
        # Check if there's a selected algorithm file
        if os.path.exists(SELECTED_ALGORITHM_FILE):
            with open(SELECTED_ALGORITHM_FILE, 'r') as f:
                data = json.load(f)
                CURRENT_ALGORITHM = data.get('selected_algorithm', 'random_forest')
        
        # Try to load the algorithm's model
        model_filename = f"{CURRENT_ALGORITHM}_model.pkl"
        model_path = os.path.join("app/models/saved_models", model_filename)
        
        if os.path.exists(model_path):
            trainer = ModelTrainer()
            trainer.load_model(model_filename)
            MODEL_LOADED = True
            print(f"✅ Loaded {CURRENT_ALGORITHM} model")
        else:
            print(f"⚠️ No trained model found for {CURRENT_ALGORITHM}")
            MODEL_LOADED = False
        
        # Try to load all available models for ensemble voting
        print(f"🔄 Loading models for ensemble voting...")
        ensemble_predictor = EnsembleVotingPredictor("app/models/saved_models")
        
        algorithms = ['random_forest', 'gradient_boosting', 'xgboost', 'svm', 'logistic_regression']
        loaded_count = 0
        
        for algo in algorithms:
            if ensemble_predictor.load_model(algo, trainer):
                loaded_count += 1
        
        if loaded_count > 1:
            USE_ENSEMBLE = True
            print(f"✅ Ensemble voting enabled with {loaded_count} models")
        else:
            USE_ENSEMBLE = False
            print(f"ℹ️ Ensemble voting disabled (only {loaded_count} model(s) available)")
    
    except Exception as e:
        print(f"⚠️ Error loading models: {e}")
        MODEL_LOADED = False
        USE_ENSEMBLE = False

# Load models on startup
load_current_algorithm_model()


@router.post("/predict", tags=["Prediction"])
async def predict_code_optimization(code_metrics: Dict):
    """
    Predict if code is optimized based on code metrics with CALIBRATED CONFIDENCE SCORE.
    
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
    
    Output: Prediction (optimized/unoptimized) with calibrated confidence score
    - Uses ensemble voting when multiple models are available
    - Confidence reflects true prediction reliability based on model agreement
    - High confidence: All models agree and probability is extreme
    - Medium confidence: Partial agreement or moderate probability
    - Low confidence: Models disagree or uncertain predictions
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
        
        # Make prediction using ensemble voting if available, else use single model
        voting_details = None
        
        if USE_ENSEMBLE:
            try:
                is_optimized, calibrated_confidence, voting_details = ensemble_predictor.ensemble_predict(
                    metrics_array, CURRENT_ALGORITHM
                )
                confidence_level = calculate_confidence_level(calibrated_confidence)
                feature_importance = trainer.get_feature_importance()
                
                return JSONResponse(content={
                    "timestamp": datetime.utcnow().isoformat(),
                    "is_optimized": is_optimized,
                    "optimization_status": "Optimized" if is_optimized else "Unoptimized",
                    "confidence_score": float(calibrated_confidence),
                    "confidence_percentage": f"{calibrated_confidence*100:.1f}%",
                    "confidence_level": confidence_level,
                    "prediction_type": "ensemble_voting",
                    "num_models_used": voting_details.get('num_models'),
                    "model_agreement": voting_details.get('model_agreement_percentage'),
                    "model_votes": voting_details.get('votes'),
                    "model_probabilities": voting_details.get('probabilities'),
                    "input_metrics": code_metrics,
                    "feature_importance": feature_importance,
                    "recommendations": generate_recommendations(code_metrics, is_optimized)
                })
            
            except Exception as e:
                print(f"⚠️ Ensemble voting failed: {e}. Falling back to single model.")
        
        # Fallback: Single model prediction with calibrated confidence
        is_optimized, calibrated_confidence, details = ensemble_predictor.single_model_predict(
            metrics_array, CURRENT_ALGORITHM
        )
        
        confidence_level = calculate_confidence_level(calibrated_confidence)
        feature_importance = trainer.get_feature_importance()
        
        return JSONResponse(content={
            "timestamp": datetime.utcnow().isoformat(),
            "is_optimized": is_optimized,
            "optimization_status": "Optimized" if is_optimized else "Unoptimized",
            "confidence_score": float(calibrated_confidence),
            "confidence_percentage": f"{calibrated_confidence*100:.1f}%",
            "confidence_level": confidence_level,
            "prediction_type": "single_model",
            "algorithm": CURRENT_ALGORITHM,
            "raw_probability": details.get('raw_probability'),
            "input_metrics": code_metrics,
            "feature_importance": feature_importance,
            "recommendations": generate_recommendations(code_metrics, is_optimized)
        })
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"❌ Prediction error: {e}")
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
    """Get information about the current algorithm's loaded model and its dataset"""
    try:
        global CURRENT_ALGORITHM
        
        # Get the algorithm-specific training results file
        results_file = f"app/models/saved_models/{CURRENT_ALGORITHM}_training_results.json"
        
        if not os.path.exists(results_file):
            return JSONResponse(content={
                "model_loaded": MODEL_LOADED,
                "algorithm": CURRENT_ALGORITHM,
                "current_algorithm": CURRENT_ALGORITHM,
                "status": f"No training data available for {CURRENT_ALGORITHM}",
                "message": f"Please train the {CURRENT_ALGORITHM} model first"
            })
        
        with open(results_file, 'r') as f:
            training_results = json.load(f)
        
        return JSONResponse(content={
            "model_loaded": MODEL_LOADED,
            "algorithm": CURRENT_ALGORITHM,
            "current_algorithm": CURRENT_ALGORITHM,
            "training_timestamp": training_results.get('timestamp'),
            "metrics": training_results.get('metrics'),
            "dataset_info": training_results.get('dataset'),
            "feature_names": training_results.get('feature_names'),
            "feature_importance": training_results.get('feature_importance')
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model info: {str(e)}")


@router.get("/algorithms", tags=["Model Management"])
async def get_available_algorithms():
    """Get list of available algorithms"""
    try:
        algorithms = {
            'random_forest': {
                'name': 'Random Forest',
                'description': 'Ensemble method using multiple decision trees',
                'icon': '🌲',
                'accuracy': 'High',
                'speed': 'Fast'
            },
            'gradient_boosting': {
                'name': 'Gradient Boosting',
                'description': 'Sequential tree building with residual correction',
                'icon': '📈',
                'accuracy': 'Very High',
                'speed': 'Medium'
            },
            'xgboost': {
                'name': 'XGBoost',
                'description': 'Optimized gradient boosting with enhanced performance',
                'icon': '⚡',
                'accuracy': 'Very High',
                'speed': 'Fast'
            },
            'svm': {
                'name': 'SVM',
                'description': 'Support Vector Machine for classification',
                'icon': '🎯',
                'accuracy': 'Medium-High',
                'speed': 'Medium'
            },
            'logistic_regression': {
                'name': 'Logistic Regression',
                'description': 'Linear classification model',
                'icon': '🧠',
                'accuracy': 'Medium',
                'speed': 'Very Fast'
            }
        }
        
        return JSONResponse(content={
            "algorithms": algorithms,
            "current_algorithm": CURRENT_ALGORITHM
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get algorithms: {str(e)}")


@router.post("/select-algorithm", tags=["Model Management"])
async def select_algorithm(request: Dict):
    """Select which algorithm to use for training and load its model"""
    try:
        global trainer, CURRENT_ALGORITHM, MODEL_LOADED, USE_ENSEMBLE, ensemble_predictor
        
        algorithm = request.get('algorithm', 'random_forest')
        
        valid_algorithms = ['random_forest', 'gradient_boosting', 'xgboost', 'svm', 'logistic_regression']
        
        if algorithm not in valid_algorithms:
            raise HTTPException(status_code=400, detail=f"Invalid algorithm. Must be one of: {', '.join(valid_algorithms)}")
        
        # Store selected algorithm
        with open("app/models/saved_models/selected_algorithm.json", "w") as f:
            json.dump({"selected_algorithm": algorithm}, f)
        
        # Update current algorithm and try to load its model
        CURRENT_ALGORITHM = algorithm
        model_filename = f"{algorithm}_model.pkl"
        model_path = os.path.join("app/models/saved_models", model_filename)
        
        if os.path.exists(model_path):
            trainer = ModelTrainer()
            trainer.load_model(model_filename)
            MODEL_LOADED = True
            model_status = "loaded"
        else:
            MODEL_LOADED = False
            model_status = "not_trained"
        
        # Reload ensemble with current state
        ensemble_predictor = EnsembleVotingPredictor("app/models/saved_models")
        loaded_count = 0
        
        for algo in valid_algorithms:
            if ensemble_predictor.load_model(algo, trainer):
                loaded_count += 1
        
        USE_ENSEMBLE = loaded_count > 1
        
        return JSONResponse(content={
            "selected_algorithm": algorithm,
            "model_status": model_status,
            "ensemble_available": USE_ENSEMBLE,
            "num_ensemble_models": loaded_count,
            "message": f"Algorithm switched to {algorithm}. Model status: {model_status}. Ensemble: {'enabled' if USE_ENSEMBLE else 'disabled'}"
        })
    
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to select algorithm: {str(e)}")


@router.post("/retrain", tags=["Model Management"])
async def retrain_model(request: Dict):
    """
    Retrain the model with new synthetic data.
    
    Request body:
    - **algorithm**: Algorithm to use (random_forest, gradient_boosting, xgboost, svm, logistic_regression)
    - **dataset_size**: Total number of samples (split 50-50)
    
    Each algorithm gets its own independent dataset stored as {algorithm}_dataset.npz
    """
    try:
        global trainer, CURRENT_ALGORITHM, MODEL_LOADED
        
        algorithm = request.get('algorithm', 'random_forest')
        dataset_size = request.get('dataset_size', 800)
        
        valid_algorithms = ['random_forest', 'gradient_boosting', 'xgboost', 'svm', 'logistic_regression']
        
        if algorithm not in valid_algorithms:
            raise HTTPException(status_code=400, detail=f"Invalid algorithm. Must be one of: {', '.join(valid_algorithms)}")
        
        print(f"🔄 Retraining {algorithm} model with {dataset_size} samples...")
        print(f"📊 Generating independent dataset for {algorithm}...")
        
        # Generate algorithm-specific dataset (unique for each algorithm)
        generator = DatasetGenerator()
        X_train, X_test, y_train, y_test = generator.generate_algorithm_specific_dataset(algorithm)
        
        # Calculate actual dataset distribution
        optimized_samples = int(np.sum(y_train)) + int(np.sum(y_test))
        unoptimized_samples = int(len(y_train) - np.sum(y_train)) + int(len(y_test) - np.sum(y_test))
        total_samples = optimized_samples + unoptimized_samples
        
        print(f"📊 Dataset Distribution for {algorithm}:")
        print(f"   🟢 Optimized samples: {optimized_samples}")
        print(f"   🔴 Unoptimized samples: {unoptimized_samples}")
        print(f"   📈 Ratio: {optimized_samples}:{unoptimized_samples}")
        
        # Save dataset specific to this algorithm
        dataset_path = generator.save_algorithm_dataset(X_train, X_test, y_train, y_test, algorithm)
        
        # Train new model
        trainer = ModelTrainer()
        trainer.train(X_train, y_train, algorithm=algorithm)
        
        # Evaluate
        metrics = trainer.evaluate(X_test, y_test)
        
        # Save model
        model_path = trainer.save_model(f"{algorithm}_model.pkl")
        
        # Save algorithm-specific training results
        feature_importance = trainer.get_feature_importance()
        results = {
            "timestamp": datetime.utcnow().isoformat(),
            "algorithm": algorithm,
            "dataset_file": dataset_path,
            "dataset": {
                "total_samples": total_samples,
                "optimized_samples": optimized_samples,
                "unoptimized_samples": unoptimized_samples,
                "train_size": len(X_train),
                "test_size": len(X_test)
            },
            "metrics": metrics,
            "feature_importance": feature_importance,
            "feature_names": trainer.feature_names
        }
        
        # Save to algorithm-specific results file
        results_file = f"app/models/saved_models/{algorithm}_training_results.json"
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        # Also update the general training results file
        general_results_file = "app/models/saved_models/training_results.json"
        with open(general_results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        # Update current algorithm
        CURRENT_ALGORITHM = algorithm
        MODEL_LOADED = True
        
        # Save selected algorithm
        with open("app/models/saved_models/selected_algorithm.json", "w") as f:
            json.dump({"selected_algorithm": algorithm}, f)
        
        print(f"✅ {algorithm} training complete with independent dataset")
        
        return JSONResponse(content={
            "message": f"Model ({algorithm}) retrained successfully with independent dataset",
            "algorithm": algorithm,
            "model_path": model_path,
            "dataset_path": dataset_path,
            "metrics": metrics,
            "dataset_info": {
                "training_samples": len(X_train),
                "testing_samples": len(X_test),
                "algorithm_specific": True
            }
        })
    
    except HTTPException as e:
        raise e
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


@router.get("/datasets/available", tags=["Datasets"])
async def get_available_datasets():
    """Get list of available datasets for download"""
    try:
        datasets = dataset_manager.get_available_datasets()
        return JSONResponse(content={
            "available_datasets": datasets,
            "total": len(datasets)
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get available datasets: {str(e)}")


@router.post("/datasets/download/{dataset_name}", tags=["Datasets"])
async def download_dataset(dataset_name: str):
    """Download a dataset"""
    try:
        filepath = dataset_manager.download_dataset(dataset_name)
        
        if filepath and os.path.exists(filepath):
            return JSONResponse(content={
                "status": "success",
                "dataset": dataset_name,
                "filepath": filepath,
                "file_size": os.path.getsize(filepath),
                "message": f"Dataset {dataset_name} downloaded successfully"
            })
        else:
            raise HTTPException(status_code=400, detail=f"Failed to download dataset {dataset_name}")
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download dataset: {str(e)}")


@router.get("/datasets/status", tags=["Model Management"])
async def get_datasets_status():
    """Get status of all algorithm-specific datasets"""
    try:
        model_dir = "app/models/saved_models"
        datasets_info = {}
        
        algorithms = ['random_forest', 'gradient_boosting', 'xgboost', 'svm', 'logistic_regression']
        
        for algo in algorithms:
            dataset_path = os.path.join(model_dir, f"{algo}_dataset.npz")
            results_path = os.path.join(model_dir, f"{algo}_training_results.json")
            
            dataset_exists = os.path.exists(dataset_path)
            results_exists = os.path.exists(results_path)
            
            datasets_info[algo] = {
                "algorithm": algo,
                "dataset_exists": dataset_exists,
                "dataset_path": dataset_path if dataset_exists else None,
                "dataset_size": os.path.getsize(dataset_path) if dataset_exists else 0,
                "has_training_results": results_exists,
                "training_results_path": results_path if results_exists else None
            }
            
            # Load training results if available
            if results_exists:
                try:
                    with open(results_path, 'r') as f:
                        results = json.load(f)
                        datasets_info[algo]["dataset_info"] = results.get("dataset", {})
                        datasets_info[algo]["metrics"] = results.get("metrics", {})
                        datasets_info[algo]["timestamp"] = results.get("timestamp")
                except:
                    pass
        
        return JSONResponse(content={
            "message": "Algorithm datasets status",
            "datasets": datasets_info
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get datasets status: {str(e)}")


@router.get("/datasets/local", tags=["Datasets"])
async def get_local_datasets():
    """Get list of locally stored datasets"""
    try:
        local_datasets = dataset_manager.list_local_datasets()
        return JSONResponse(content={
            "local_datasets": local_datasets,
            "total": len(local_datasets)
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list local datasets: {str(e)}")
