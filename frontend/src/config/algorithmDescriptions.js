/**
 * Algorithm descriptions for code risk evaluation
 */

export const ALGORITHM_DESCRIPTIONS = {
  random_forest: {
    name: 'Random Forest',
    description: 'Ensemble method that uses multiple decision trees voting together',
    context: 'Code Risk Evaluation',
    benefits: [
      'Identifies which code metrics are most important for predicting risk',
      'Handles complex relationships between code features (LOC, complexity, dependencies)',
      'Robust to outliers - can handle unusual code patterns',
      'Fast predictions even with large codebases',
      'Provides feature importance scores for each metric'
    ],
    use_case: 'Best for general-purpose code risk assessment across diverse projects',
    accuracy: '~95-98%'
  },
  
  gradient_boosting: {
    name: 'Gradient Boosting',
    description: 'Sequentially builds trees where each new tree corrects errors of previous trees',
    context: 'Code Risk Evaluation',
    benefits: [
      'Higher accuracy than Random Forest for complex patterns',
      'Captures subtle relationships between code metrics',
      'Better at identifying edge cases of risky code patterns',
      'Weighted focus on misclassified samples',
      'Excellent for imbalanced risk categories'
    ],
    use_case: 'Best when you need maximum accuracy for critical code risk detection',
    accuracy: '~96-99%'
  },
  
  xgboost: {
    name: 'XGBoost',
    description: 'Optimized gradient boosting with enhanced speed and regularization',
    context: 'Code Risk Evaluation',
    benefits: [
      'Fastest training and prediction among gradient boosting variants',
      'Built-in regularization prevents overfitting to your codebase patterns',
      'Handles missing or sparse code metrics gracefully',
      'Scales well to large code repositories',
      'Better generalization to new code patterns'
    ],
    use_case: 'Best for production deployments needing speed and generalization',
    accuracy: '~96-99%'
  },
  
  svm: {
    name: 'Support Vector Machine (SVM)',
    description: 'Finds optimal hyperplane that maximally separates safe code from risky code',
    context: 'Code Risk Evaluation',
    benefits: [
      'Excellent for binary classification (optimized vs risky code)',
      'Works well with your 9 code metrics as features',
      'Strong for high-dimensional feature spaces',
      'Finds decision boundaries between code quality zones',
      'Less prone to overfitting with proper regularization'
    ],
    use_case: 'Best when you want clear separation between risk categories',
    accuracy: '~90-95%'
  },
  
  logistic_regression: {
    name: 'Logistic Regression',
    description: 'Linear model that estimates probability of code being risky',
    context: 'Code Risk Evaluation',
    benefits: [
      'Most interpretable model - shows exact impact of each metric',
      'Fast training and prediction',
      'Good baseline for comparing other algorithms',
      'Provides probability scores for confidence levels',
      'Works well when relationships are roughly linear'
    ],
    use_case: 'Best for understanding which metrics matter most in risk assessment',
    accuracy: '~85-92%'
  }
};
