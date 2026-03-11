# ML Training API Examples & Responses

## Available Algorithms Endpoint

### Request
```bash
GET /api/ml/algorithms
```

### Response
```json
{
  "algorithms": {
    "random_forest": {
      "name": "Random Forest",
      "description": "Ensemble method using multiple decision trees",
      "pros": [
        "Good generalization",
        "Handles non-linear relationships",
        "Feature importance available"
      ],
      "cons": [
        "Can overfit with high depth",
        "Slower prediction time"
      ],
      "best_for": "Complex relationships with mixed feature types"
    },
    "gradient_boosting": {
      "name": "Gradient Boosting",
      "description": "Sequential ensemble learning on residuals",
      "pros": [
        "Often best performance",
        "Handles non-linear patterns",
        "Good for competition"
      ],
      "cons": [
        "Slower training",
        "More hyperparameter tuning needed"
      ],
      "best_for": "High-accuracy predictions with sufficient computational resources"
    },
    "xgboost": {
      "name": "XGBoost",
      "description": "Extreme Gradient Boosting - optimized gradient boosting",
      "pros": [
        "Fast training and prediction",
        "Handles missing values",
        "Excellent performance",
        "Memory efficient"
      ],
      "cons": [
        "Complex hyperparameter tuning",
        "Prone to overfitting"
      ],
      "best_for": "Production systems requiring speed and accuracy"
    },
    "svm": {
      "name": "Support Vector Machine",
      "description": "Finds optimal hyperplane to separate classes",
      "pros": [
        "Works well in high dimensions",
        "Memory efficient",
        "Versatile"
      ],
      "cons": [
        "Slow with large datasets",
        "Requires feature scaling",
        "Sensitive to hyperparameters"
      ],
      "best_for": "Medium-sized datasets with clear separation"
    },
    "logistic_regression": {
      "name": "Logistic Regression",
      "description": "Linear model for binary classification",
      "pros": [
        "Fast training and prediction",
        "Interpretable",
        "Good baseline"
      ],
      "cons": [
        "Limited to linear relationships",
        "Poor with complex patterns"
      ],
      "best_for": "Simple linear relationships and interpretability"
    }
  },
  "loaded_models": {
    "random_forest": true,
    "gradient_boosting": false,
    "xgboost": false,
    "svm": false,
    "logistic_regression": false
  },
  "current_algorithm": "random_forest"
}
```

---

## Select Algorithm Endpoint

### Request
```bash
POST /api/ml/select-algorithm
Content-Type: application/json

{
  "algorithm": "xgboost"
}
```

### Response
```json
{
  "message": "Algorithm switched to xgboost",
  "current_algorithm": "xgboost",
  "model_loaded": true,
  "available_algorithms": [
    "random_forest",
    "gradient_boosting",
    "xgboost",
    "svm",
    "logistic_regression"
  ]
}
```

---

## Make Prediction Endpoint

### Request
```bash
POST /api/ml/predict
Content-Type: application/json

{
  "loc": 250,
  "complexity": 18,
  "dependencies": 5,
  "functions": 12,
  "classes": 3,
  "comments": 45,
  "complexity_per_loc": 0.072,
  "comment_ratio": 0.18,
  "functions_per_class": 4.0
}
```

### Response (XGBoost)
```json
{
  "timestamp": "2026-03-05T10:30:45.123456",
  "algorithm": "xgboost",
  "is_optimized": true,
  "optimization_status": "Optimized",
  "confidence": "87.34%",
  "confidence_score": 0.8734,
  "input_metrics": {
    "loc": 250,
    "complexity": 18,
    "dependencies": 5,
    "functions": 12,
    "classes": 3,
    "comments": 45,
    "complexity_per_loc": 0.072,
    "comment_ratio": 0.18,
    "functions_per_class": 4.0
  },
  "feature_importance": {
    "LOC": 0.182,
    "Complexity": 0.245,
    "Dependencies": 0.156,
    "Functions": 0.098,
    "Classes": 0.076,
    "Comments": 0.089,
    "Complexity/LOC": 0.091,
    "Comment Ratio": 0.038,
    "Functions/Class": 0.025
  },
  "recommendations": [
    "✅ Code follows optimization best practices",
    "📝 Documentation level is good",
    "✓ Complexity is within acceptable range"
  ]
}
```

---

## Retrain Model Endpoint

### Request
```bash
POST /api/ml/retrain
Content-Type: application/json

{
  "algorithm": "xgboost",
  "dataset_size": 800
}
```

### Response
```json
{
  "message": "Model (xgboost) retrained successfully",
  "algorithm": "xgboost",
  "model_path": "app/models/saved_models/xgboost_model.pkl",
  "metrics": {
    "accuracy": 0.945,
    "precision": 0.938,
    "recall": 0.952,
    "f1_score": 0.945,
    "auc_roc": 0.988
  },
  "dataset_info": {
    "training_samples": 640,
    "testing_samples": 160
  }
}
```

---

## Algorithm Analysis Endpoint

### Request
```bash
GET /api/ml/algorithm-analysis/xgboost
```

### Response
```json
{
  "algorithm": "xgboost",
  "feature_importance": {
    "LOC": 0.182,
    "Complexity": 0.245,
    "Dependencies": 0.156,
    "Functions": 0.098,
    "Classes": 0.076,
    "Comments": 0.089,
    "Complexity/LOC": 0.091,
    "Comment Ratio": 0.038,
    "Functions/Class": 0.025
  },
  "training_results": {
    "accuracy": 0.945,
    "precision": 0.938,
    "recall": 0.952,
    "f1_score": 0.945,
    "auc_roc": 0.988
  },
  "dataset_info": {
    "total_samples": 800,
    "optimized_samples": 400,
    "unoptimized_samples": 400,
    "train_size": 640,
    "test_size": 160
  },
  "feature_names": [
    "LOC",
    "Complexity",
    "Dependencies",
    "Functions",
    "Classes",
    "Comments",
    "Complexity/LOC",
    "Comment Ratio",
    "Functions/Class"
  ],
  "timestamp": "2026-03-05T10:25:30.456789"
}
```

---

## Model Info Endpoint

### Request
```bash
GET /api/ml/model-info
```

### Response
```json
{
  "model_loaded": true,
  "current_algorithm": "xgboost",
  "available_models": {
    "random_forest": {
      "loaded": true,
      "timestamp": "2026-03-05T09:15:20.123456",
      "metrics": {
        "accuracy": 0.925,
        "precision": 0.918,
        "recall": 0.932,
        "f1_score": 0.925
      },
      "dataset_info": {
        "total_samples": 800,
        "optimized_samples": 400,
        "unoptimized_samples": 400,
        "train_size": 640,
        "test_size": 160
      },
      "feature_importance": {
        "LOC": 0.175,
        "Complexity": 0.238,
        "Dependencies": 0.162,
        ...
      }
    },
    "xgboost": {
      "loaded": true,
      "timestamp": "2026-03-05T10:25:30.456789",
      "metrics": {
        "accuracy": 0.945,
        "precision": 0.938,
        "recall": 0.952,
        "f1_score": 0.945,
        "auc_roc": 0.988
      },
      "dataset_info": {
        "total_samples": 800,
        "optimized_samples": 400,
        "unoptimized_samples": 400,
        "train_size": 640,
        "test_size": 160
      },
      "feature_importance": {
        "LOC": 0.182,
        "Complexity": 0.245,
        "Dependencies": 0.156,
        ...
      }
    },
    "gradient_boosting": {
      "loaded": false
    }
  }
}
```

---

## Datasets Endpoint

### Request
```bash
GET /api/ml/datasets
```

### Response
```json
{
  "datasets": {
    "code_quality": {
      "name": "Code Quality Dataset",
      "description": "Synthetic code metrics dataset for optimization prediction",
      "path": "python-ml/datasets/code_quality.csv",
      "exists": true,
      "size": 245120
    },
    "github_metrics": {
      "name": "GitHub Repository Metrics",
      "description": "Real code metrics from GitHub repositories",
      "path": "python-ml/datasets/github_metrics.csv",
      "exists": false,
      "size": 0
    }
  },
  "total": 2
}
```

---

## Download Dataset Endpoint

### Request
```bash
POST /api/ml/datasets/download
Content-Type: application/json

{
  "dataset_type": "synthetic",
  "num_samples": 2000
}
```

### Response
```json
{
  "message": "Dataset downloaded/generated successfully",
  "dataset_type": "synthetic",
  "path": "python-ml/datasets/code_quality_synthetic.csv",
  "info": {
    "path": "python-ml/datasets/code_quality_synthetic.csv",
    "shape": [2000, 10],
    "columns": [
      "loc",
      "complexity",
      "dependencies",
      "functions",
      "classes",
      "comments",
      "complexity_per_loc",
      "comment_ratio",
      "functions_per_class",
      "is_optimized"
    ],
    "statistics": {
      "mean": {
        "loc": 525.3,
        "complexity": 25.4,
        "dependencies": 9.8,
        ...
      },
      "std": {
        "loc": 272.1,
        "complexity": 14.2,
        ...
      },
      "min": {
        "loc": 50,
        "complexity": 1,
        ...
      },
      "max": {
        "loc": 999,
        "complexity": 49,
        ...
      }
    }
  }
}
```

---

## Health Check Endpoint

### Request
```bash
GET /api/ml/health
```

### Response
```json
{
  "status": "healthy",
  "service": "ML Optimization Prediction",
  "model_loaded": true,
  "current_algorithm": "xgboost",
  "available_algorithms": [
    "random_forest",
    "gradient_boosting",
    "xgboost",
    "svm",
    "logistic_regression"
  ],
  "timestamp": "2026-03-05T10:35:15.789456"
}
```

---

## Error Response Examples

### Missing Algorithm
```json
{
  "detail": "Unknown algorithm: deep_learning. Choose from ['random_forest', 'gradient_boosting', 'xgboost', 'svm', 'logistic_regression']"
}
```

### Model Not Loaded
```json
{
  "detail": "ML model (xgboost) not loaded. Train model first."
}
```

### Missing Required Field
```json
{
  "detail": "Missing required field: complexity"
}
```

---

## Performance Metrics Interpretation

### Accuracy
- **Definition**: Percentage of correct predictions
- **Range**: 0-1 (0-100%)
- **Goal**: >0.90 (90%)
- **Note**: Use with caution for imbalanced datasets

### Precision
- **Definition**: Of predicted optimized, how many are actually optimized?
- **Range**: 0-1 (0-100%)
- **Goal**: >0.90 (90%)
- **When**: Priority is avoiding false positives

### Recall
- **Definition**: Of actual optimized code, how many did we find?
- **Range**: 0-1 (0-100%)
- **Goal**: >0.90 (90%)
- **When**: Priority is catching all optimized code

### F1-Score
- **Definition**: Harmonic mean of precision and recall
- **Range**: 0-1 (0-100%)
- **Goal**: >0.90 (90%)
- **When**: Need balance between precision and recall

### AUC-ROC
- **Definition**: Area under ROC curve
- **Range**: 0-1 (0-100%)
- **Goal**: >0.95 (95%)
- **When**: Class imbalance or need for threshold tuning

---

**Last Updated**: March 5, 2026
