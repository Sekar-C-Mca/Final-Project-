# Quick Start - ML Training with XGBoost

## 1️⃣ Start the Application

```bash
# Terminal 1: Start backend
cd python-ml
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Start frontend (in project root)
cd frontend
npm run dev
```

Then open: `http://localhost:3000/ml-training`

## 2️⃣ Select Algorithm

1. Click **"Select Algorithm"** button (top right)
2. Browse the 5 available algorithms:
   - ✅ **Random Forest** - Balanced approach
   - ✅ **Gradient Boosting** - High accuracy
   - ✅ **XGBoost** - Fast & Accurate (RECOMMENDED)
   - ✅ **SVM** - High-dimensional data
   - ✅ **Logistic Regression** - Simple & Fast
3. Click on **XGBoost** card to select
4. Click **"Continue"** button

## 3️⃣ Retrain Model

1. After selecting algorithm, click **"Retrain Model"** button
2. Wait for training to complete (typically 2-5 seconds)
3. Success message appears: "Model (xgboost) retrained successfully!"

## 4️⃣ View Algorithm Analysis

1. Click **"View Analysis"** link in the blue info bar
2. See:
   - **Performance Metrics**: Accuracy, Precision, Recall, F1-Score
   - **Feature Importance**: Which metrics matter most
   - **Dataset Info**: Training/test samples, optimized/unoptimized ratio
   - **Algorithm Details**: Strengths & considerations

## 5️⃣ Make Predictions

1. Go to **"Predictions"** tab
2. See sample code analysis with:
   - Optimization status (Optimized/Unoptimized)
   - Confidence score
   - Code metrics breakdown
   - Recommendations

## 🔄 Switch Algorithms

Want to compare algorithms? Easy!

1. Click **"Select Algorithm"** again
2. Choose a different algorithm (e.g., **Gradient Boosting**)
3. Click **"Continue"**
4. Repeat steps 3-5 to see different results

## 📊 Understanding the Results

### Performance Metrics
- **Accuracy**: Overall correctness (aim for >90%)
- **Precision**: Correct optimized predictions
- **Recall**: Finding all optimized code
- **F1-Score**: Balance between precision and recall

### Feature Importance
Shows which code metrics are most important:
- **Complexity**: Code complexity level
- **Comment Ratio**: Documentation quality
- **Dependencies**: Code coupling
- **LOC**: Lines of code count

### Recommendations
- 🔧 Specific suggestions to improve code
- 📝 Documentation hints
- 🔗 Coupling reduction tips
- 📏 Code structure improvements

## ⚡ XGBoost Advantages

Why use XGBoost?

| Feature | XGBoost | Others |
|---------|---------|--------|
| **Speed** | ⚡ Very Fast | 🟡 Medium |
| **Accuracy** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Memory** | 💾 Efficient | 💾 Higher |
| **Scaling** | 📈 Excellent | 📈 Good |
| **Prod Ready** | ✅ Yes | ✅ Yes |

## 🐛 Troubleshooting

### "Model not loaded" error
```
Solution: Click "Retrain Model" button first
```

### Algorithm not switching
```
Solution: Refresh page and try again
```

### No predictions showing
```
Solution: Make sure model is trained for selected algorithm
```

### Backend not responding
```
Solution: Check if backend is running on port 8000
curl http://localhost:8000/api/ml/health
```

## 📱 API Quick Reference

```bash
# Check available algorithms
curl http://localhost:8000/api/ml/algorithms

# Select XGBoost
curl -X POST http://localhost:8000/api/ml/select-algorithm \
  -H "Content-Type: application/json" \
  -d '{"algorithm": "xgboost"}'

# Train XGBoost
curl -X POST http://localhost:8000/api/ml/retrain \
  -H "Content-Type: application/json" \
  -d '{"algorithm": "xgboost", "dataset_size": 800}'

# Get XGBoost analysis
curl http://localhost:8000/api/ml/algorithm-analysis/xgboost

# Health check
curl http://localhost:8000/api/ml/health
```

## 📚 Learn More

- Full guide: See `ML_TRAINING_GUIDE.md`
- Backend API docs: `http://localhost:8000/docs`
- Feature importance: Based on code quality metrics
- Recommendations: Auto-generated from predictions

## 🎯 Next Steps

1. ✅ Try different algorithms
2. ✅ Compare their performance metrics
3. ✅ Understand feature importance
4. ✅ Use recommendations to optimize code
5. ✅ Monitor model performance over time

---

**Happy ML Training!** 🚀
