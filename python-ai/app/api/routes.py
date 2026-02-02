from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from app.api.schemas import (
    AnalysisRequest, AnalysisResponse, ModelMetrics, 
    TrainingRequest, RiskLevel
)
from app.models.predictor import RiskPredictor
from app.models.trainer import ModelTrainer
from app.preprocessing.data_cleaning import DataPreprocessor
from app.database.mongo_client import db
from datetime import datetime
from typing import List
import pandas as pd
import io

router = APIRouter()

# Initialize predictor (singleton)
predictor = RiskPredictor()

@router.post("/analyze", response_model=AnalysisResponse, tags=["Analysis"])
async def analyze_code(request: AnalysisRequest):
    """
    Analyze a code module and predict risk level
    
    - **project_id**: Unique identifier for the project
    - **module_name**: Name of the module/file
    - **file_path**: Full path to the file
    - **code_content**: Source code to analyze
    - **language**: Programming language (python, javascript, etc.)
    """
    try:
        # Validate input
        if not request.code_content:
            raise HTTPException(status_code=400, detail="code_content is required")
        
        # Perform prediction
        result = predictor.predict(
            code=request.code_content,
            language=request.language,
            module_name=request.module_name,
            file_path=request.file_path
        )
        
        # Store result in database
        analysis_collection = db.get_collection("analysis_results")
        analysis_collection.insert_one({
            "project_id": request.project_id,
            "module_name": result.module_name,
            "file_path": result.file_path,
            "risk_level": result.risk_level.value,
            "risk_score": result.risk_score,
            "metrics": result.metrics.dict(),
            "recommendations": result.recommendations,
            "timestamp": result.timestamp
        })
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/results/{project_id}", tags=["Analysis"])
async def get_project_results(project_id: str, risk_level: RiskLevel = None):
    """
    Get all analysis results for a project
    
    - **project_id**: Project identifier
    - **risk_level**: Optional filter by risk level (low, medium, high)
    """
    try:
        analysis_collection = db.get_collection("analysis_results")
        
        # Build query
        query = {"project_id": project_id}
        if risk_level:
            query["risk_level"] = risk_level.value
        
        # Fetch results
        results = list(analysis_collection.find(query).sort("timestamp", -1))
        
        # Convert ObjectId to string
        for result in results:
            result["_id"] = str(result["_id"])
        
        return JSONResponse(content={
            "project_id": project_id,
            "total_modules": len(results),
            "results": results
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch results: {str(e)}")


@router.get("/statistics/{project_id}", tags=["Analysis"])
async def get_project_statistics(project_id: str):
    """Get statistical summary for a project"""
    try:
        analysis_collection = db.get_collection("analysis_results")
        
        # Fetch all results for project
        results = list(analysis_collection.find({"project_id": project_id}))
        
        if not results:
            return JSONResponse(content={
                "project_id": project_id,
                "message": "No analysis data found"
            })
        
        # Calculate statistics
        total = len(results)
        high_risk = len([r for r in results if r["risk_level"] == "high"])
        medium_risk = len([r for r in results if r["risk_level"] == "medium"])
        low_risk = len([r for r in results if r["risk_level"] == "low"])
        
        avg_complexity = sum(r["metrics"]["complexity"] for r in results) / total
        avg_loc = sum(r["metrics"]["loc"] for r in results) / total
        
        return JSONResponse(content={
            "project_id": project_id,
            "total_modules": total,
            "risk_distribution": {
                "high": high_risk,
                "medium": medium_risk,
                "low": low_risk
            },
            "risk_percentages": {
                "high": f"{(high_risk/total)*100:.1f}%",
                "medium": f"{(medium_risk/total)*100:.1f}%",
                "low": f"{(low_risk/total)*100:.1f}%"
            },
            "average_metrics": {
                "complexity": round(avg_complexity, 2),
                "loc": round(avg_loc, 2)
            }
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate statistics: {str(e)}")


@router.post("/models/train", tags=["Model Management"])
async def train_model(request: TrainingRequest):
    """
    Train a new ML model
    
    - **dataset_name**: Name of the dataset file in datasets/ directory
    - **algorithm**: ML algorithm (random_forest, gradient_boosting, svm, logistic_regression)
    - **hyperparameters**: Optional custom hyperparameters
    """
    try:
        # Load dataset
        dataset_path = f"datasets/{request.dataset_name}"
        df = pd.read_csv(dataset_path)
        
        # Preprocess data
        preprocessor = DataPreprocessor()
        df_clean = preprocessor.clean_dataset(df)
        
        X = preprocessor.prepare_features(df_clean, fit=True)
        y = preprocessor.prepare_labels(df_clean)
        
        # Split data
        X_train, X_test, y_train, y_test = preprocessor.split_data(X, y)
        
        # Train model
        trainer = ModelTrainer()
        trainer.train(X_train, y_train, request.algorithm, request.hyperparameters)
        
        # Evaluate model
        metrics = trainer.evaluate(X_test, y_test)
        
        # Save model
        model_path = trainer.save_model()
        
        # Store metrics in database
        models_collection = db.get_collection("model_metrics")
        models_collection.insert_one({
            "algorithm": request.algorithm,
            "dataset": request.dataset_name,
            "metrics": metrics,
            "model_path": model_path,
            "trained_at": datetime.utcnow()
        })
        
        return JSONResponse(content={
            "message": "Model trained successfully",
            "algorithm": request.algorithm,
            "metrics": metrics,
            "model_path": model_path
        })
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Dataset '{request.dataset_name}' not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.get("/models/metrics", response_model=List[ModelMetrics], tags=["Model Management"])
async def get_model_metrics():
    """Get performance metrics for all trained models"""
    try:
        models_collection = db.get_collection("model_metrics")
        metrics = list(models_collection.find().sort("trained_at", -1))
        
        # Convert ObjectId to string
        for metric in metrics:
            metric["_id"] = str(metric["_id"])
        
        return JSONResponse(content=metrics)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch metrics: {str(e)}")


@router.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Risk Evaluation ML Backend",
        "timestamp": datetime.utcnow()
    }
