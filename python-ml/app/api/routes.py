"""
General API routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.preprocessing.feature_extraction import CodeAnalyzer
from typing import Dict, List, Optional
from datetime import datetime

router = APIRouter(tags=["API"])

class CodeAnalysisRequest(BaseModel):
    code: str

class BatchCodeAnalysisRequest(BaseModel):
    code_samples: List[str]

class RealTimeAnalysisRequest(BaseModel):
    code_content: str = ""  # Optional for feature-based analysis
    features: Optional[List[float]] = None  # Real-time extracted features
    file_path: str
    timestamp: str

# Initialize code analyzer
analyzer = CodeAnalyzer()

@router.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Risk Evaluation API"
    }

@router.post("/extract-features", tags=["Feature Extraction"])
async def extract_features(request: CodeAnalysisRequest):
    """
    Extract features from source code for ML analysis
    
    Args:
        request: CodeAnalysisRequest containing the source code
        
    Returns:
        Dictionary containing extracted features and metadata
    """
    try:
        if not request.code.strip():
            raise HTTPException(status_code=400, detail="Code cannot be empty")
        
        # Extract features using the analyzer
        features = analyzer.extract_features(request.code)
        
        # Create feature vector for ML model
        feature_vector = [
            features['LOC'],
            features['Complexity'], 
            features['Dependencies'],
            features['Functions'],
            features['Classes'],
            features['Comments'],
            features['Complexity/LOC'],
            features['Comment Ratio'],
            features['Functions/Class']
        ]
        
        # Calculate code quality indicators
        code_lines = len([line for line in request.code.split('\n') if line.strip()])
        comment_lines = len([line for line in request.code.split('\n') if line.strip().startswith('#')])
        
        return {
            "features": features,
            "feature_vector": feature_vector,
            "feature_names": analyzer.feature_names,
            "analysis": {
                "total_lines": code_lines + comment_lines,
                "code_lines": code_lines,
                "comment_lines": comment_lines,
                "complexity_level": "Low" if features['Complexity'] <= 5 else "Medium" if features['Complexity'] <= 15 else "High",
                "documentation_level": "Good" if features['Comment Ratio'] > 0.15 else "Fair" if features['Comment Ratio'] > 0.05 else "Poor"
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feature extraction failed: {str(e)}")

@router.post("/extract-features-batch", tags=["Feature Extraction"])
async def extract_features_batch(request: BatchCodeAnalysisRequest):
    """
    Extract features from multiple code samples
    
    Args:
        request: BatchCodeAnalysisRequest containing list of code samples
        
    Returns:
        List of feature extractions for each code sample
    """
    try:
        if not request.code_samples:
            raise HTTPException(status_code=400, detail="Code samples cannot be empty")
        
        results = []
        for i, code in enumerate(request.code_samples):
            if not code.strip():
                continue
                
            features = analyzer.extract_features(code)
            feature_vector = [features[name] for name in analyzer.feature_names]
            
            results.append({
                "sample_index": i,
                "features": features,
                "feature_vector": feature_vector,
                "analysis": {
                    "complexity_level": "Low" if features['Complexity'] <= 5 else "Medium" if features['Complexity'] <= 15 else "High",
                    "documentation_level": "Good" if features['Comment Ratio'] > 0.15 else "Fair" if features['Comment Ratio'] > 0.05 else "Poor"
                }
            })
        
        return {
            "results": results,
            "total_samples": len(request.code_samples),
            "processed_samples": len(results),
            "feature_names": analyzer.feature_names
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch feature extraction failed: {str(e)}")

@router.post("/analyze-code", tags=["Feature Extraction", "ML Analysis"])
async def analyze_code_with_prediction(request: dict):
    """
    Complete code analysis: Extract features + ML prediction + Feature importance
    Handles both CodeAnalysisRequest and RealTimeAnalysisRequest
    """
    try:
        # Determine request type and extract features accordingly
        if 'features' in request and request['features']:
            # Real-time data from monitor with pre-extracted features
            feature_vector = request['features']
            features = {
                'LOC': feature_vector[0],
                'Complexity': feature_vector[1],
                'Dependencies': feature_vector[2],
                'Functions': feature_vector[3],
                'Classes': feature_vector[4],
                'Comments': feature_vector[5],
                'Complexity/LOC': feature_vector[6],
                'Comment Ratio': feature_vector[7],
                'Functions/Class': feature_vector[8]
            }
        else:
            # Traditional code analysis request
            if 'code' not in request or not request['code'].strip():
                raise HTTPException(status_code=400, detail="Code cannot be empty")
            
            # Extract features using the analyzer
            features = analyzer.extract_features(request['code'])
            
            # Create feature vector for ML model
            feature_vector = [
                features['LOC'],
                features['Complexity'], 
                features['Dependencies'],
                features['Functions'],
                features['Classes'],
                features['Comments'],
                features['Complexity/LOC'],
                features['Comment Ratio'],
                features['Functions/Class']
            ]

        # Make predictions using ALL algorithms for comprehensive analysis
        predictions = {}
        feature_importance_data = {}
        
        try:
            import numpy as np
            from app.models.trainer import ModelTrainer
            import os
            
            # Load all available models and make predictions
            algorithms = ["random_forest", "gradient_boosting", "xgboost", "svm", "logistic_regression"]
            
            for algo in algorithms:
                try:
                    trainer = ModelTrainer()
                    model_filename = f"{algo}_model.pkl"
                    model_path = os.path.join("app/models/saved_models", model_filename)
                    
                    if os.path.exists(model_path):
                        trainer.load_model(model_filename)
                        
                        # Make prediction
                        prediction_result = trainer.predict(np.array([feature_vector]))
                        prediction_value = prediction_result[0][0] if len(prediction_result[0]) > 0 else 0
                        
                        # Map prediction to risk levels
                        if prediction_value < 0.3:
                            risk_level = "low"
                        elif prediction_value < 0.7:
                            risk_level = "medium"
                        else:
                            risk_level = "high"
                        
                        predictions[algo] = {
                            "risk_level": risk_level,
                            "confidence": float(prediction_value),
                            "raw_prediction": float(prediction_value)
                        }
                        
                        # Get feature importance
                        importance = trainer.get_feature_importance()
                        if importance is not None:
                            feature_importance_data[algo] = importance
                        
                except Exception as algo_error:
                    print(f"Error with {algo}: {algo_error}")
                    continue
                    
        except Exception as e:
            print(f"ML prediction error: {e}")
            predictions = {}
            feature_importance_data = {}

        # Calculate consensus risk level
        risk_counts = {"low": 0, "medium": 0, "high": 0}
        total_confidence = 0
        valid_predictions = 0
        
        for pred in predictions.values():
            if pred:
                risk_counts[pred["risk_level"]] += 1
                total_confidence += pred["confidence"]
                valid_predictions += 1
        
        consensus_risk = max(risk_counts.items(), key=lambda x: x[1])[0] if valid_predictions > 0 else "unknown"
        average_confidence = total_confidence / valid_predictions if valid_predictions > 0 else 0

        return {
            "status": "success",
            "timestamp": request.get('timestamp'),
            "file_path": request.get('file_path'),
            "extracted_features": features,
            "feature_vector": feature_vector,
            "feature_names": ["LOC", "Complexity", "Dependencies", "Functions", "Classes", "Comments", "Complexity/LOC", "Comment Ratio", "Functions/Class"],
            "predictions": predictions,
            "consensus": {
                "risk_level": consensus_risk,
                "confidence": average_confidence,
                "algorithm_count": valid_predictions
            },
            "feature_importance": feature_importance_data,
            "analysis_summary": {
                "complexity_level": "Low" if features['Complexity'] <= 5 else "Medium" if features['Complexity'] <= 15 else "High",
                "documentation_level": "Good" if features['Comment Ratio'] > 0.15 else "Fair" if features['Comment Ratio'] > 0.05 else "Poor",
                "structure_quality": "Good" if features.get('Functions/Class', 0) > 1 and features['Classes'] > 0 else "Fair"
            },
            "recommendations": _get_recommendations(features)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Code analysis failed: {str(e)}")

# Store recent analyses for frontend display
recent_analyses = []
MAX_RECENT_ANALYSES = 10

@router.post("/store-analysis", tags=["Real-time Analysis"])
async def store_analysis_result(analysis_data: dict):
    """Store analysis result for frontend display"""
    global recent_analyses
    
    try:
        # Add timestamp if not provided
        if 'timestamp' not in analysis_data:
            analysis_data['timestamp'] = datetime.now().isoformat()
        
        # Add to recent analyses
        recent_analyses.append(analysis_data)
        
        # Keep only the most recent analyses
        if len(recent_analyses) > MAX_RECENT_ANALYSES:
            recent_analyses = recent_analyses[-MAX_RECENT_ANALYSES:]
        
        return {"status": "success", "message": "Analysis stored successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store analysis: {str(e)}")

@router.get("/recent-analyses", tags=["Real-time Analysis"])
async def get_recent_analyses():
    """Get recent analysis results for frontend display"""
    try:
        return {
            "status": "success",
            "analyses": recent_analyses,
            "count": len(recent_analyses)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recent analyses: {str(e)}")

@router.post("/clear-analyses", tags=["Real-time Analysis"])
async def clear_recent_analyses():
    """Clear all stored analysis results (useful when changing monitoring folders)"""
    try:
        global recent_analyses
        recent_analyses.clear()
        return {
            "status": "success",
            "message": "All analysis data cleared successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear analyses: {str(e)}")

def _get_recommendations(features: Dict[str, float]) -> Dict:
    """
    Generate comprehensive optimization recommendations and verdict based on features
    Returns: Dictionary with verdict, summary, and detailed recommendations
    """
    recommendations = []
    issues = []
    issue_count = 0
    
    loc = features.get('LOC', 0)
    complexity = features.get('Complexity', 0)
    dependencies = features.get('Dependencies', 0)
    comment_ratio = features.get('Comment Ratio', 0)
    complexity_per_loc = features.get('Complexity/LOC', 0)
    functions_per_class = features.get('Functions/Class', 0)
    classes = features.get('Classes', 0)
    
    # Identify issues and collect recommendations
    # Complexity issues
    if complexity > 30:
        issue_count += 1
        issues.append("High cyclomatic complexity")
        recommendations.append("🔥 HIGH COMPLEXITY: Break this function/class into smaller, more focused components. Consider extracting complex logic into separate helper functions.")
    elif complexity > 15:
        recommendations.append("⚠️ MODERATE COMPLEXITY: Consider breaking down complex functions into smaller, more manageable pieces")
    
    # Documentation issues
    if comment_ratio < 0.08:
        issue_count += 1
        issues.append("Poor documentation")
        recommendations.append("📝 LOW DOCUMENTATION: Add more comments explaining the logic. Aim for 8-12% comment ratio.")
    elif comment_ratio > 0.25:
        recommendations.append("💬 EXCESSIVE COMMENTS: Review if all comments are necessary. Remove redundant explanations.")
    
    # Dependency issues
    if dependencies > 10:
        issue_count += 1
        issues.append("Too many dependencies")
        recommendations.append("🔗 HIGH COUPLING: Review and reduce external dependencies. This increases maintenance burden.")
    
    # Size issues
    if loc > 500:
        issue_count += 1
        issues.append("File too large")
        recommendations.append("📏 LARGE MODULE: Split this file into smaller modules with single responsibilities. Aim for <300 LOC per file.")
    
    # Function structure issues
    if functions_per_class < 1.5 and functions_per_class > 0 and classes > 0:
        issue_count += 1
        issues.append("Unbalanced class structure")
        recommendations.append("🏗️ CLASS DESIGN: This class may have too many responsibilities. Consider breaking it into smaller, focused classes.")
    elif functions_per_class > 4:
        issue_count += 1
        issues.append("Class is too granular")
        recommendations.append("🏗️ OVER-FRAGMENTATION: Consider consolidating related functions into a more cohesive class structure.")
    
    # Code density issues
    if complexity_per_loc > 0.6:
        issue_count += 1
        issues.append("High code complexity density")
        recommendations.append("💣 DENSE CODE: Simplify the logic - high complexity per line makes code hard to understand. Break into multiple functions.")
    
    # Determine if optimized based on simple heuristics
    is_optimized = issue_count == 0 and complexity < 15 and comment_ratio >= 0.08
    
    # Generate verdict
    verdict = {}
    if is_optimized and issue_count == 0:
        verdict = {
            "status": "✅ GOOD",
            "color": "success",
            "title": "Your code is optimized and follows best practices!",
            "summary": "No major issues detected. Code quality is excellent.",
            "rating": "Excellent",
            "score": "A+"
        }
    elif is_optimized and issue_count > 0:
        verdict = {
            "status": "⚠️ GOOD WITH IMPROVEMENTS",
            "color": "warning",
            "title": f"Your code is optimized but has {issue_count} area(s) for improvement",
            "summary": f"Code is generally well-structured. Focus on: {', '.join(issues)}",
            "rating": "Good",
            "score": "A"
        }
    elif not is_optimized and issue_count <= 2:
        verdict = {
            "status": "⚠️ NEEDS ATTENTION",
            "color": "warning",
            "title": f"Code needs optimization - {issue_count} issue(s) to fix",
            "summary": f"Key issues: {', '.join(issues)}. Address these areas for improvement.",
            "rating": "Fair",
            "score": "B"
        }
    else:
        verdict = {
            "status": "❌ HAS ISSUES",
            "color": "danger",
            "title": f"Code has {issue_count} significant issue(s) requiring attention",
            "summary": f"Critical issues: {', '.join(issues[:3])}. Refactoring recommended.",
            "rating": "Poor",
            "score": "C"
        }
    
    # Add positive feedback if applicable
    if is_optimized:
        recommendations.append("✅ Code follows optimization best practices and design patterns.")
    
    # Default if no issues or recommendations
    if not recommendations:
        recommendations.append("Code structure is reasonable. Monitor for future improvements as complexity grows.")
    
    return {
        "verdict": verdict,
        "issues": issues,
        "issue_count": issue_count,
        "recommendations": recommendations
    }

