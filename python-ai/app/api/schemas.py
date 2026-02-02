from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class CodeMetrics(BaseModel):
    """Code module metrics"""
    loc: int = Field(..., description="Lines of code")
    complexity: float = Field(..., description="Cyclomatic complexity")
    dependencies: int = Field(0, description="Number of dependencies/imports")
    functions: int = Field(0, description="Number of functions")
    classes: int = Field(0, description="Number of classes")
    comments: int = Field(0, description="Number of comment lines")
    
class AnalysisRequest(BaseModel):
    """Request model for code analysis"""
    project_id: str = Field(..., description="Project identifier")
    module_name: str = Field(..., description="Module/file name")
    file_path: str = Field(..., description="Full file path")
    code_content: Optional[str] = Field(None, description="Source code content")
    metrics: Optional[CodeMetrics] = Field(None, description="Pre-computed metrics")
    language: str = Field("python", description="Programming language")

class AnalysisResponse(BaseModel):
    """Response model for code analysis"""
    module_name: str
    file_path: str
    risk_level: RiskLevel
    risk_score: float = Field(..., ge=0, le=1, description="Risk probability 0-1")
    metrics: CodeMetrics
    recommendations: list[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
class ModelMetrics(BaseModel):
    """ML Model performance metrics"""
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    auc_roc: Optional[float] = None
    trained_at: datetime = Field(default_factory=datetime.utcnow)

class TrainingRequest(BaseModel):
    """Request model for model training"""
    dataset_name: str
    algorithm: str = Field("random_forest", description="ML algorithm to use")
    hyperparameters: Optional[Dict[str, Any]] = Field(default_factory=dict)
