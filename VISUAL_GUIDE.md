# ML Training System - Visual Quick Reference

## 🎨 UI Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│         ML Training Dashboard                           │
│  http://localhost:3000/ml-training                     │
└─────────────────────────────────────────────────────────┘
                         ↓
        ┌────────────────┴────────────────┐
        ↓                                  ↓
   ┌─────────────┐            ┌──────────────────┐
   │ Algorithm   │            │ Retrain Model    │
   │ Info Bar    │            │ Button           │
   │             │            │                  │
   │ Current:    │            │ Trains the       │
   │ XGBoost     │            │ selected         │
   │             │            │ algorithm        │
   └─────────────┘            └──────────────────┘
        ↓                                  ↓
        │              Click    ┌─────────┴─────────┐
        └──────────────────────→│                   │
                           ┌────▼──────────────────┐
                           │ View Analysis (Link)  │
                           │                       │
                           │ Opens algorithm      │
                           │ analysis modal       │
                           └──────────────────────┘
                                    ↓
                        ┌───────────────────────┐
                        │  Algorithm Analysis   │
                        │  Modal                │
                        │                       │
                        │ • Performance metrics │
                        │ • Feature importance │
                        │ • Dataset info      │
                        │ • Characteristics   │
                        └───────────────────────┘
        
        ┌─────────────────────────────────────┐
        │ Select Algorithm Button (Top Right) │
        │                                     │
        │ Opens Algorithm Selector Modal      │
        └─────────────────────────────────────┘
                         ↓
        ┌─────────────────────────────────────┐
        │  Algorithm Selector Modal            │
        │                                     │
        │  ┌─────────────────────────────┐   │
        │  │ Random Forest    ○ Selected │   │
        │  │ • Pros: ...                 │   │
        │  │ • Cons: ...                 │   │
        │  └─────────────────────────────┘   │
        │                                     │
        │  ┌─────────────────────────────┐   │
        │  │ XGBoost          ○ Available│   │
        │  │ • Pros: Fast & Accurate     │   │
        │  │ • Cons: Hyperparameter tune │   │
        │  └─────────────────────────────┘   │
        │                                     │
        │  [Continue] Button                  │
        └─────────────────────────────────────┘
```

## 🔄 User Workflow

### Initial Setup
```
1. Open http://localhost:3000/ml-training
   ↓
2. System loads available algorithms
   ↓
3. Shows algorithm info bar (Current: Random Forest)
   ↓
4. Shows overview tab with model metrics
   ↓
5. Ready to use!
```

### Switch Algorithm
```
1. Click "Select Algorithm" button
   ↓
2. Browse 5 algorithms
   ↓
3. Read pros/cons for each
   ↓
4. Click algorithm card to select
   ↓
5. Click "Continue" button
   ↓
6. Algorithm switched!
```

### Train Model
```
1. Click "Retrain Model" button
   ↓
2. Backend:
   ├─ Generates 800 code samples
   ├─ Splits 640 train / 160 test
   ├─ Trains selected algorithm
   ├─ Evaluates performance
   └─ Saves model
   ↓
3. Frontend:
   ├─ Shows success message
   ├─ Updates metrics
   ├─ Shows predictions
   └─ Displays recommendations
```

### View Analysis
```
1. Click "View Analysis" link in info bar
   ↓
2. Modal opens showing:
   ├─ Algorithm description
   ├─ Strengths & considerations
   ├─ Performance metrics (Accuracy, etc.)
   ├─ Feature importance chart
   └─ Dataset information
   ↓
3. Click Close to return
```

### Make Predictions
```
1. Go to "Predictions" tab
   ↓
2. System shows sample predictions using:
   ├─ Current algorithm
   ├─ Actual code metrics
   └─ Confidence scores
   ↓
3. For each prediction:
   ├─ Status (Optimized/Unoptimized)
   ├─ Confidence percentage
   ├─ Code metrics breakdown
   └─ Recommendations
```

## 📊 Algorithm at a Glance

```
┌─────────────────┬────────┬──────────┬────────────┐
│ Algorithm       │ Speed  │ Accuracy │ Best For   │
├─────────────────┼────────┼──────────┼────────────┤
│ Random Forest   │ ⚡⚡⚡  │ ⭐⭐⭐⭐ │ Balanced   │
│ Gradient Boost  │ ⚡⚡    │ ⭐⭐⭐⭐⭐│ Accuracy   │
│ XGBoost ⭐      │ ⚡⚡⚡⚡ │ ⭐⭐⭐⭐⭐│ Production │
│ SVM             │ ⚡⚡⚡  │ ⭐⭐⭐  │ High-dim   │
│ Log. Regression │ ⚡⚡⚡⚡⚡│ ⭐⭐    │ Simple     │
└─────────────────┴────────┴──────────┴────────────┘

Legend:
⚡ = Speed (more = faster)
⭐ = Accuracy (more = better)
```

## 🎯 Feature Importance Visualization

```
Example: XGBoost Results
┌─────────────────────────────────────────────────┐
│ Feature Importance Analysis                     │
├─────────────────────────────────────────────────┤
│ Complexity        ████████████████░░░░░ 24.5%  │
│ LOC              ███████████░░░░░░░░░░░░░░ 18.2% │
│ Dependencies     ███████░░░░░░░░░░░░░░░░░░░░░ 15.6% │
│ Complexity/LOC   ████░░░░░░░░░░░░░░░░░░░░░░░░ 9.1%  │
│ Comments         █████░░░░░░░░░░░░░░░░░░░░░░░░░ 8.9% │
│ Functions        ████░░░░░░░░░░░░░░░░░░░░░░░░░░ 9.8% │
│ Classes          ███░░░░░░░░░░░░░░░░░░░░░░░░░░░ 7.6% │
│ Comment Ratio    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 3.8%  │
│ Functions/Class  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 2.5%  │
└─────────────────────────────────────────────────┘

Key Insights:
• Complexity is most important (24.5%)
• LOC matters (18.2%)
• Code structure important (Functions, Classes)
• Comment quality has moderate impact (8.9%)
```

## 📈 Performance Metrics Explained

```
┌──────────────────────────────────────┐
│ Model Performance Metrics             │
├──────────────────────────────────────┤
│                                      │
│ Accuracy:        94.5% ███████████░  │
│ Precision:       93.8% ███████████░  │
│ Recall:          95.2% ███████████░  │
│ F1-Score:        94.5% ███████████░  │
│ AUC-ROC:         98.8% █████████████ │
│                                      │
├──────────────────────────────────────┤
│ Interpretation:                      │
│ ✓ Model is highly accurate           │
│ ✓ Good at finding optimized code    │
│ ✓ Low false positives                │
│ ✓ Excellent overall performance      │
└──────────────────────────────────────┘
```

## 🔍 Code Prediction Breakdown

```
Sample Code Analysis
┌────────────────────────────────────────┐
│ Well-Written Code                      │
│                                        │
│ Status: ✓ OPTIMIZED                   │
│ Confidence: 87.3% ████████░            │
│                                        │
│ Metrics:                               │
│ ├─ Lines of Code: 250                │
│ ├─ Complexity: 18                    │
│ ├─ Comment Ratio: 18%                │
│ ├─ Dependencies: 5                   │
│ ├─ Functions: 12                     │
│ └─ Classes: 3                        │
│                                        │
│ Recommendations:                       │
│ ✓ Code follows best practices        │
│ ✓ Documentation level is good        │
│ ✓ Complexity is acceptable           │
│                                        │
└────────────────────────────────────────┘
```

## 🔗 API Endpoints Overview

```
┌────────────────────────────────────────────────┐
│ ML Training API Endpoints                      │
├────────────────────────────────────────────────┤
│                                                │
│ GET /algorithms                                │
│  → Get all available algorithms               │
│                                                │
│ POST /select-algorithm                        │
│  → Switch active algorithm                    │
│                                                │
│ POST /predict                                 │
│  → Make prediction with code metrics         │
│                                                │
│ POST /retrain                                 │
│  → Train selected algorithm                   │
│                                                │
│ GET /algorithm-analysis/{algo}                │
│  → Get algorithm-specific analysis           │
│                                                │
│ GET /model-info                               │
│  → Get all model information                 │
│                                                │
│ GET /datasets                                 │
│  → List available datasets                    │
│                                                │
│ POST /datasets/download                       │
│  → Generate/download dataset                  │
│                                                │
│ GET /health                                   │
│  → Health check                               │
│                                                │
└────────────────────────────────────────────────┘
```

## 🎮 Control Panel Quick Reference

```
┌─────────────────────────────────────────────────────┐
│ ML Training Control Panel                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Select Algorithm] ────┐                          │
│  [Retrain Model]        │ Main Action Buttons      │
│                         │                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Algorithm Info Bar:                               │
│  Current: XGBoost  [View Analysis →]              │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Tabs:                                              │
│  [Overview] [Feature Importance] [Predictions]    │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Content Area:                                      │
│  (Displays selected tab content)                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 📱 Mobile Responsive Layout

```
Desktop (1400px+)
┌────────────────────────────────┐
│ [Select] [Retrain]             │
├────────────────────────────────┤
│ Algorithm Bar                  │
├────────────────────────────────┤
│ [Tab1] [Tab2] [Tab3]          │
├────────────────────────────────┤
│ ┌──────────┬──────────┐        │
│ │ Card 1   │ Card 2   │        │
│ ├──────────┼──────────┤        │
│ │ Card 3   │ Card 4   │        │
│ └──────────┴──────────┘        │
└────────────────────────────────┘

Mobile (max-width 768px)
┌──────────────────┐
│ [Sel] [Retrain]  │
├──────────────────┤
│ Algorithm Bar    │
├──────────────────┤
│ [T1] [T2] [T3]   │
├──────────────────┤
│ Card 1           │
├──────────────────┤
│ Card 2           │
├──────────────────┤
│ Card 3           │
├──────────────────┤
│ Card 4           │
└──────────────────┘
```

## ⏱️ Time Estimates

```
Activity                  Time      XGBoost
──────────────────────────────────────────
Start backend             < 1 min   N/A
Start frontend            < 1 min   N/A
Access UI                 < 1 min   N/A
Select algorithm          30 sec    N/A
Train model               2-5 sec   ⚡ Very fast
View analysis             30 sec    N/A
View predictions          30 sec    N/A
Run API test              30 sec    N/A
──────────────────────────────────────────
Total first run:          ~10 min   
Total for new algorithm:  ~1 min    ⚡ Fast
```

## 🎓 Knowledge Progression

```
Level 1: Beginner (30 min)
├─ Start system
├─ Select algorithm
├─ Train model
└─ View results

Level 2: Intermediate (1-2 hours)
├─ Try all algorithms
├─ Compare metrics
├─ View analysis
└─ Understand differences

Level 3: Advanced (2-4 hours)
├─ Review API endpoints
├─ Test with curl/Python
├─ Integrate with code
└─ Deploy to production

Level 4: Expert (varies)
├─ Customize algorithms
├─ Tune hyperparameters
├─ Monitor performance
└─ Optimize for production
```

## 🌟 Key Takeaways

```
1️⃣ XGBoost = Fastest & Most Accurate
   Use for production systems

2️⃣ Algorithm Selection = Easy
   3 clicks to switch algorithms

3️⃣ Analysis = Detailed
   See exactly what the model learned

4️⃣ API = Complete
   Integrate into your systems

5️⃣ Documentation = Comprehensive
   Find answers quickly
```

---

**Visual Reference Guide**
Last Updated: March 5, 2026
