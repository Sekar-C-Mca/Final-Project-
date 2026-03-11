# ML Training Module - XGBoost & Multi-Algorithm Implementation

## Overview

The ML Training module has been completely redesigned to support multiple machine learning algorithms with algorithm-specific analysis and visualization. Users can now select, train, and analyze different algorithms directly from the web interface.

## Features Implemented

### 1. **Algorithm Selection Interface**
- **Location**: `http://localhost:3000/ml-training`
- **Component**: `AlgorithmSelector.jsx`
- **Features**:
  - 5 available algorithms: Random Forest, Gradient Boosting, XGBoost, SVM, Logistic Regression
  - Each algorithm displays:
    - Detailed description
    - Pros and cons
    - Best use cases
    - Current selection status
  - Modal-based selection interface
  - Algorithm switching without page reload

### 2. **Supported Algorithms**

#### Random Forest
- **Type**: Ensemble of decision trees
- **Pros**: Good generalization, handles non-linear relationships, feature importance available
- **Best for**: Mixed feature types with complex relationships
- **Training time**: Medium
- **Prediction speed**: Fast

#### Gradient Boosting
- **Type**: Sequential ensemble learning
- **Pros**: Often best performance, captures complex patterns
- **Best for**: High-accuracy predictions
- **Training time**: Slow
- **Prediction speed**: Medium

#### **XGBoost (NEW!)**
- **Type**: Optimized gradient boosting
- **Pros**: Fast training/prediction, handles missing values, memory efficient, excellent performance
- **Best for**: Production systems requiring speed and accuracy
- **Training time**: Very fast
- **Prediction speed**: Very fast
- **Key advantages**: 
  - Parallel tree boosting
  - Handles sparse data
  - Built-in regularization
  - Cross-validation support

#### SVM (Support Vector Machine)
- **Type**: Hyperplane-based classifier
- **Pros**: Works well in high dimensions, memory efficient
- **Best for**: Medium-sized datasets with clear separation
- **Training time**: Medium
- **Prediction speed**: Medium

#### Logistic Regression
- **Type**: Linear classification model
- **Pros**: Fast, interpretable, good baseline
- **Best for**: Simple linear relationships
- **Training time**: Very fast
- **Prediction speed**: Very fast

### 3. **Algorithm-Specific Analysis**
- **Component**: `AlgorithmAnalysis.jsx`
- **Features**:
  - Performance metrics visualization
  - Feature importance analysis (bar charts)
  - Training dataset information
  - Model characteristics and considerations
  - Last update timestamp

### 4. **Backend Updates**

#### XGBoost Integration (`trainer.py`)
```python
from xgboost import XGBClassifier

ALGORITHMS = {
    'random_forest': RandomForestClassifier,
    'gradient_boosting': GradientBoostingClassifier,
    'xgboost': xgb.XGBClassifier,  # NEW
    'svm': SVC,
    'logistic_regression': LogisticRegression
}
```

#### New API Endpoints (`ml_routes.py`)

1. **Get Available Algorithms**
```
GET /api/ml/algorithms
```
Returns list of all algorithms with descriptions, pros, cons, and best use cases.

2. **Select Algorithm**
```
POST /api/ml/select-algorithm
Body: { "algorithm": "xgboost" }
```
Switches the active algorithm for prediction.

3. **Algorithm-Specific Analysis**
```
GET /api/ml/algorithm-analysis/{algorithm}
```
Returns performance metrics, feature importance, and training data for specific algorithm.

4. **Train/Retrain Model**
```
POST /api/ml/retrain
Body: { 
    "algorithm": "xgboost",  # NEW: specify algorithm
    "dataset_size": 800 
}
```
Trains the specified algorithm with synthetic data.

5. **Dataset Management** (NEW)
```
GET /api/ml/datasets
POST /api/ml/datasets/download
GET /api/ml/datasets/info/{dataset_name}
```

### 5. **Dataset Support**

#### Synthetic Dataset Generator
- Located in: `dataset_downloader.py`
- Generates code quality metrics datasets
- Features:
  - Configurable sample size
  - Realistic metric distributions
  - Optimized/unoptimized labels
  - Train/test split

#### Available Dataset Types
1. **Synthetic Code Quality**: Generated on-the-fly
2. **GitHub Metrics**: Public repository code metrics

## Usage Guide

### Step 1: Access the ML Training Dashboard
```
Navigate to: http://localhost:3000/ml-training
```

### Step 2: Select an Algorithm
```
1. Click "Select Algorithm" button
2. Review algorithm details
3. Click on algorithm card to select
4. Click "Continue" to apply selection
```

### Step 3: View Algorithm Analysis
```
1. Click "View Analysis" link in algorithm info bar
2. Review performance metrics
3. Analyze feature importance
4. Check dataset information
```

### Step 4: Retrain Model
```
1. Click "Retrain Model" button
2. Model trains with selected algorithm
3. Metrics update automatically
4. Results display in Overview tab
```

### Step 5: Make Predictions
```
1. System uses selected algorithm for predictions
2. Each prediction shows:
   - Optimization status
   - Confidence score
   - Algorithm used
   - Feature importance
   - Recommendations
```

## File Structure

```
frontend/src/pages/
├── MLTraining.jsx                 # Main component (updated)
├── MLTraining.css                 # Styles (updated)
├── AlgorithmSelector.jsx          # Algorithm selection modal (NEW)
├── AlgorithmSelector.css          # Selector styles (NEW)
├── AlgorithmAnalysis.jsx          # Analysis modal (NEW)
└── AlgorithmAnalysis.css          # Analysis styles (NEW)

python-ml/app/
├── api/
│   └── ml_routes.py              # ML endpoints (updated)
├── models/
│   ├── trainer.py                # Model trainer (updated with XGBoost)
│   ├── dataset_generator.py      # Existing data generator
│   └── dataset_downloader.py     # Dataset management (NEW)
```

## API Examples

### 1. Get All Available Algorithms
```bash
curl http://localhost:8000/api/ml/algorithms
```

Response:
```json
{
  "algorithms": {
    "xgboost": {
      "name": "XGBoost",
      "description": "Extreme Gradient Boosting - optimized gradient boosting",
      "pros": [...],
      "cons": [...],
      "best_for": "Production systems requiring speed and accuracy"
    },
    ...
  },
  "loaded_models": {...},
  "current_algorithm": "xgboost"
}
```

### 2. Select XGBoost Algorithm
```bash
curl -X POST http://localhost:8000/api/ml/select-algorithm \
  -H "Content-Type: application/json" \
  -d '{"algorithm": "xgboost"}'
```

### 3. Train XGBoost Model
```bash
curl -X POST http://localhost:8000/api/ml/retrain \
  -H "Content-Type: application/json" \
  -d '{"algorithm": "xgboost", "dataset_size": 800}'
```

### 4. Get XGBoost Analysis
```bash
curl http://localhost:8000/api/ml/algorithm-analysis/xgboost
```

### 5. Generate Dataset
```bash
curl -X POST http://localhost:8000/api/ml/datasets/download \
  -H "Content-Type: application/json" \
  -d '{"dataset_type": "synthetic", "num_samples": 2000}'
```

## Configuration

### XGBoost Hyperparameters
Configured in `trainer.py`:
```python
'xgboost': {
    'n_estimators': 150,
    'learning_rate': 0.1,
    'max_depth': 6,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'random_state': 42,
    'eval_metric': 'logloss',
    'verbosity': 0
}
```

### Model Save/Load
- Models saved as: `{algorithm}_model.pkl`
- Results saved as: `{algorithm}_training_results.json`
- Location: `app/models/saved_models/`

## Performance Comparison

| Algorithm | Training Time | Prediction Speed | Accuracy | Best Use Case |
|-----------|---------------|------------------|----------|---------------|
| Random Forest | Medium | Fast | High | Balanced approach |
| Gradient Boosting | Slow | Medium | Very High | Accuracy priority |
| **XGBoost** | **Very Fast** | **Very Fast** | **Very High** | **Production systems** |
| SVM | Medium | Medium | Medium | High-dimensional data |
| Logistic Regression | Very Fast | Very Fast | Low | Simple relationships |

## Testing

### Run Backend Tests
```bash
cd python-ml
pytest tests/
```

### Test Each Algorithm
```bash
# Test Random Forest
python -c "from app.models.trainer import ModelTrainer; m = ModelTrainer(); print(m.ALGORITHMS.keys())"

# Generate test data and train
python -m app.models.dataset_generator
```

## Troubleshooting

### Model Not Loading
```
Error: "ML model not loaded. Train model first."
Solution: Click "Retrain Model" button to train the selected algorithm
```

### Algorithm Switch Not Working
```
Error: "Unknown algorithm"
Solution: Ensure algorithm name is valid (use /api/ml/algorithms to check)
```

### XGBoost Import Error
```
Error: "No module named 'xgboost'"
Solution: pip install xgboost>=2.0.0
```

### Dataset Download Failed
```
Error: "Failed to download dataset"
Solution: Check internet connection or use synthetic dataset generation
```

## Performance Tips

### For Best Results:
1. **Use XGBoost** for production systems (fastest)
2. **Use Gradient Boosting** when accuracy is critical
3. **Use Random Forest** for balanced performance
4. **Start with Logistic Regression** as baseline
5. **Use SVM** for high-dimensional data

### Optimization Tips:
1. Ensure dataset is balanced (equal optimized/unoptimized samples)
2. Normalize features before training SVM
3. Monitor feature importance to remove unnecessary features
4. Use cross-validation for reliable metrics
5. Adjust hyperparameters based on performance metrics

## Future Enhancements

- [ ] Deep Learning models (Neural Networks)
- [ ] Ensemble voting (combine multiple algorithms)
- [ ] Hyperparameter tuning interface
- [ ] Real-time model monitoring
- [ ] A/B testing capabilities
- [ ] Export trained models
- [ ] Real dataset integration

## Dependencies

### Frontend
- React 18+
- Recharts (charting)
- Lucide React (icons)

### Backend
- FastAPI
- scikit-learn
- xgboost>=2.0.0 (NEW)
- pandas
- numpy
- pymongo

## Version History

### v2.0.0 (Current)
- ✅ Added XGBoost support
- ✅ Multi-algorithm selection
- ✅ Algorithm-specific analysis
- ✅ Dataset management
- ✅ Improved UI/UX

### v1.0.0
- Random Forest only
- Basic prediction interface

## Support & Documentation

- **Backend Docs**: `http://localhost:8000/docs`
- **Algorithm Details**: In-app "View Analysis" panel
- **API Documentation**: OpenAPI/Swagger at `/docs`

---

**Last Updated**: March 5, 2026
**Status**: Production Ready ✅
