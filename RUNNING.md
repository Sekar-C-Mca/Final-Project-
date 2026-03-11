# Running the ML Training System

## Prerequisites

- Node.js 16+ (for frontend)
- Python 3.8+ (for backend)
- npm or yarn (for frontend package management)
- Git (optional, for version control)

## Installation

### 1. Install Backend Dependencies

```bash
cd python-ml

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Verify XGBoost installation
python -c "import xgboost; print(f'XGBoost {xgboost.__version__} installed')"
```

### 2. Install Frontend Dependencies

```bash
cd frontend

# Install npm packages
npm install

# Verify installation
npm list react recharts lucide-react
```

## Running the Application

### Option 1: Start Both Services (Recommended)

#### Terminal 1: Backend Service
```bash
cd python-ml

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Start FastAPI server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Output should show:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

#### Terminal 2: Frontend Service
```bash
cd frontend

# Start development server
npm run dev
```

Output should show:
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  press h to show help
```

### Option 2: Using Docker (Optional)

If you have Docker installed:

```bash
# Backend
docker run -p 8000:8000 -v $(pwd)/python-ml:/app python:3.9 \
  sh -c "cd /app && pip install -r requirements.txt && \
  python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

# Frontend (in separate terminal)
docker run -p 3000:3000 -v $(pwd)/frontend:/app node:16 \
  sh -c "cd /app && npm install && npm run dev"
```

## Access the Application

### Web Interface
```
http://localhost:3000/ml-training
```

### API Documentation
```
http://localhost:8000/docs          (Interactive Swagger UI)
http://localhost:8000/redoc         (ReDoc documentation)
```

### Health Check
```bash
curl http://localhost:8000/api/ml/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "ML Optimization Prediction",
  "model_loaded": true,
  "current_algorithm": "random_forest",
  "available_algorithms": [
    "random_forest",
    "gradient_boosting",
    "xgboost",
    "svm",
    "logistic_regression"
  ]
}
```

## First Time Setup

### 1. Verify Backend is Running
```bash
curl http://localhost:8000/api/ml/health
```

### 2. Check Available Algorithms
```bash
curl http://localhost:8000/api/ml/algorithms
```

### 3. Generate Dataset (Optional)
```bash
curl -X POST http://localhost:8000/api/ml/datasets/download \
  -H "Content-Type: application/json" \
  -d '{"dataset_type": "synthetic", "num_samples": 2000}'
```

### 4. Train Initial Model
```bash
curl -X POST http://localhost:8000/api/ml/retrain \
  -H "Content-Type: application/json" \
  -d '{"algorithm": "xgboost", "dataset_size": 800}'
```

### 5. Open Web Browser
```
Navigate to: http://localhost:3000/ml-training
```

## Project Structure

```
Final Year Project/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── MLTraining.jsx
│   │   │   ├── MLTraining.css
│   │   │   ├── AlgorithmSelector.jsx      (NEW)
│   │   │   ├── AlgorithmSelector.css      (NEW)
│   │   │   ├── AlgorithmAnalysis.jsx      (NEW)
│   │   │   └── AlgorithmAnalysis.css      (NEW)
│   │   ├── components/
│   │   ├── context/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── python-ml/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ml_routes.py       (Enhanced)
│   │   │   ├── routes.py
│   │   │   └── __init__.py
│   │   ├── models/
│   │   │   ├── trainer.py         (Enhanced)
│   │   │   ├── dataset_generator.py
│   │   │   ├── dataset_downloader.py    (NEW)
│   │   │   └── __init__.py
│   │   ├── database/
│   │   ├── preprocessing/
│   │   └── main.py
│   ├── requirements.txt
│   └── tests/
├── backend/
├── monitoring-agent/
├── logs/
├── ML_TRAINING_GUIDE.md            (NEW)
├── ML_QUICKSTART.md                (NEW)
├── ML_API_EXAMPLES.md              (NEW)
├── IMPLEMENTATION_SUMMARY.md       (NEW)
├── RUNNING.md                      (This file)
└── start.sh
```

## Troubleshooting

### Backend Won't Start

**Issue**: `Address already in use`
```bash
# Find and kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use different port
python -m uvicorn app.main:app --reload --port 8001
```

**Issue**: `ModuleNotFoundError: No module named 'xgboost'`
```bash
pip install xgboost>=2.0.0
```

**Issue**: `MongoDB connection error`
```bash
# MongoDB is optional for ML training
# If not needed, set dummy connection or check .env file
```

### Frontend Won't Start

**Issue**: `Port 3000 already in use`
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- --port 3001
```

**Issue**: `Module not found`
```bash
rm -rf node_modules package-lock.json
npm install
```

### Connection Issues

**Backend URL in Frontend**: `frontend/src/utils/api.js`
```javascript
// Check if pointing to correct backend
const BACKEND_URL = 'http://localhost:8000';
```

**Frontend URL in Backend**: `python-ml/app/main.py`
```python
# Check CORS origins
origins = ["http://localhost:3000"]
```

### Browser Issues

**Clear Browser Cache**:
1. Open DevTools (F12)
2. Go to Application tab
3. Clear Storage → All site data
4. Refresh page (Ctrl+Shift+R)

**Check Console Errors**:
1. Open DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Check Network tab for failed requests

## Testing Endpoints

### Test with curl

```bash
# 1. Get algorithms
curl http://localhost:8000/api/ml/algorithms | jq

# 2. Select algorithm
curl -X POST http://localhost:8000/api/ml/select-algorithm \
  -H "Content-Type: application/json" \
  -d '{"algorithm": "xgboost"}' | jq

# 3. Train model
curl -X POST http://localhost:8000/api/ml/retrain \
  -H "Content-Type: application/json" \
  -d '{"algorithm": "xgboost", "dataset_size": 800}' | jq

# 4. Make prediction
curl -X POST http://localhost:8000/api/ml/predict \
  -H "Content-Type: application/json" \
  -d '{
    "loc": 250,
    "complexity": 18,
    "dependencies": 5,
    "functions": 12,
    "classes": 3,
    "comments": 45,
    "complexity_per_loc": 0.072,
    "comment_ratio": 0.18,
    "functions_per_class": 4.0
  }' | jq

# 5. Get analysis
curl http://localhost:8000/api/ml/algorithm-analysis/xgboost | jq
```

### Test with Python

```python
import requests
import json

BASE_URL = 'http://localhost:8000/api/ml'

# Get algorithms
response = requests.get(f'{BASE_URL}/algorithms')
print(response.json())

# Train model
response = requests.post(f'{BASE_URL}/retrain', json={
    'algorithm': 'xgboost',
    'dataset_size': 800
})
print(response.json())

# Make prediction
metrics = {
    'loc': 250,
    'complexity': 18,
    'dependencies': 5,
    'functions': 12,
    'classes': 3,
    'comments': 45,
    'complexity_per_loc': 0.072,
    'comment_ratio': 0.18,
    'functions_per_class': 4.0
}
response = requests.post(f'{BASE_URL}/predict', json=metrics)
print(response.json())
```

## Performance Tips

### For Better Performance

1. **Reduce dataset size for testing**
   ```bash
   # Instead of 800, use 200
   {"algorithm": "xgboost", "dataset_size": 200}
   ```

2. **Close unnecessary browser tabs**
   - Reduces RAM usage

3. **Use production build for frontend**
   ```bash
   npm run build
   npm run preview
   ```

4. **Monitor backend logs**
   ```bash
   # Check for warnings or errors
   # Optimize slow queries
   ```

## Backup & Recovery

### Save Model
Models are automatically saved:
```
app/models/saved_models/
├── xgboost_model.pkl
├── xgboost_training_results.json
├── random_forest_model.pkl
└── random_forest_training_results.json
```

### Backup Data
```bash
# Backup models
cp -r python-ml/app/models/saved_models/ ./backup/

# Backup frontend code
cp -r frontend/ ./backup/

# Backup backend code
cp -r python-ml/app/ ./backup/
```

## Cleanup & Reset

### Reset Models
```bash
# Remove all trained models
rm python-ml/app/models/saved_models/*.pkl
rm python-ml/app/models/saved_models/*.json
```

### Reset Datasets
```bash
# Remove generated datasets
rm python-ml/datasets/*.csv
```

### Full Reset
```bash
# Remove everything
rm -rf python-ml/app/models/saved_models/*
rm -rf python-ml/datasets/*
npm run build  # Rebuild frontend
```

## Environment Variables

Create `.env` file in `python-ml/`:

```env
# Database
MONGODB_URL=mongodb://localhost:27017
DB_NAME=risk_evaluation

# API
CORS_ORIGINS=http://localhost:3000

# ML Models
ML_MODEL_PATH=app/models/saved_models/

# Environment
DEBUG=True
LOG_LEVEL=INFO
```

## Next Steps

1. ✅ Access ML Training dashboard
2. ✅ Select XGBoost algorithm
3. ✅ Train model with sample data
4. ✅ View algorithm analysis
5. ✅ Make predictions
6. ✅ Compare with other algorithms
7. ✅ Check recommendations
8. ✅ Review feature importance

## Support Files

- 📖 **ML_TRAINING_GUIDE.md** - Complete feature guide
- 🚀 **ML_QUICKSTART.md** - Quick reference
- 📊 **ML_API_EXAMPLES.md** - API examples
- 📝 **IMPLEMENTATION_SUMMARY.md** - Technical details

---

**Last Updated**: March 5, 2026
**Version**: 2.0.0 (ML Training with XGBoost)
