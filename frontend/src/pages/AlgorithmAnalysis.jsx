import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Activity } from 'lucide-react';
import './AlgorithmAnalysis.css';

const AlgorithmAnalysis = ({ algorithm, onClose }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalysis();
  }, [algorithm]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8000/api/ml/algorithm-analysis/${algorithm}`);
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      } else {
        setError('Model not yet trained. Please retrain the model.');
      }
    } catch (err) {
      setError(`Error loading analysis: ${err.message}`);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAlgorithmDescription = (algo) => {
    const descriptions = {
      'random_forest': {
        title: 'Random Forest Analysis',
        description: 'An ensemble method using multiple decision trees that make predictions by voting.',
        strengths: ['Handles non-linear relationships', 'Robust to outliers', 'Feature importance available'],
        considerations: ['Can be prone to overfitting', 'Slower prediction time with large forests']
      },
      'gradient_boosting': {
        title: 'Gradient Boosting Analysis',
        description: 'Sequentially builds trees to correct residuals of previous trees.',
        strengths: ['Often achieves best performance', 'Good at capturing complex patterns'],
        considerations: ['Requires careful hyperparameter tuning', 'Slower training time']
      },
      'xgboost': {
        title: 'XGBoost Analysis',
        description: 'Optimized gradient boosting implementation with enhanced speed and performance.',
        strengths: ['Fast training and prediction', 'Handles missing values', 'Memory efficient', 'Often best in competitions'],
        considerations: ['Complex hyperparameters', 'Prone to overfitting without proper tuning']
      },
      'svm': {
        title: 'Support Vector Machine Analysis',
        description: 'Finds optimal hyperplane to separate classes in high-dimensional space.',
        strengths: ['Works well in high dimensions', 'Memory efficient', 'Versatile kernels'],
        considerations: ['Requires feature scaling', 'Slow with large datasets', 'Sensitive to hyperparameters']
      },
      'logistic_regression': {
        title: 'Logistic Regression Analysis',
        description: 'Simple linear model for binary classification with probabilistic output.',
        strengths: ['Fast and interpretable', 'Good baseline model', 'Low computational cost'],
        considerations: ['Limited to linear relationships', 'Poor with complex patterns']
      }
    };
    return descriptions[algo] || descriptions['random_forest'];
  };

  const algoInfo = getAlgorithmDescription(algorithm);

  if (loading) {
    return (
      <div className="analysis-modal">
        <div className="modal-header">
          <h2>Algorithm Analysis - {algoInfo.title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="loading-state">
          <p>Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-modal">
        <div className="modal-header">
          <h2>Algorithm Analysis - {algoInfo.title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="error-state">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }

  // Prepare feature importance data
  const featureImportanceData = analysis?.feature_importance
    ? Object.entries(analysis.feature_importance)
        .sort(([, a], [, b]) => b - a)
        .map(([name, importance]) => ({
          name: name.substring(0, 15), // Truncate long names
          importance: (importance * 100).toFixed(2),
          value: importance
        }))
    : [];

  // Prepare metrics data for comparison
  const metricsData = analysis?.training_results
    ? [
        { name: 'Accuracy', value: (analysis.training_results.accuracy * 100).toFixed(2) },
        { name: 'Precision', value: (analysis.training_results.precision * 100).toFixed(2) },
        { name: 'Recall', value: (analysis.training_results.recall * 100).toFixed(2) },
        { name: 'F1-Score', value: (analysis.training_results.f1_score * 100).toFixed(2) }
      ]
    : [];

  return (
    <div className="analysis-modal">
      <div className="modal-header">
        <h2>{algoInfo.title}</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="analysis-content">
        <div className="description-section">
          <p className="algo-description">{algoInfo.description}</p>
          
          <div className="characteristics">
            <div className="char-col">
              <h4>Strengths</h4>
              <ul className="strengths-list">
                {algoInfo.strengths.map((strength, i) => (
                  <li key={i}>✓ {strength}</li>
                ))}
              </ul>
            </div>
            <div className="char-col">
              <h4>Considerations</h4>
              <ul className="considerations-list">
                {algoInfo.considerations.map((consideration, i) => (
                  <li key={i}>⚠ {consideration}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {metricsData.length > 0 && (
          <div className="metrics-section">
            <h3>Performance Metrics</h3>
            <div className="metrics-grid">
              {metricsData.map((metric, i) => (
                <div key={i} className="metric-card">
                  <div className="metric-icon">
                    {metric.name === 'Accuracy' && <TrendingUp size={24} />}
                    {metric.name === 'F1-Score' && <Activity size={24} />}
                  </div>
                  <div className="metric-info">
                    <p className="metric-label">{metric.name}</p>
                    <p className="metric-value">{metric.value}%</p>
                  </div>
                  <div className="metric-bar">
                    <div 
                      className="metric-fill"
                      style={{ width: `${metric.value}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {featureImportanceData.length > 0 && (
          <div className="features-section">
            <h3>Feature Importance</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={featureImportanceData} layout="vertical" margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={140} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="importance" fill="#3b82f6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {analysis?.dataset_info && (
          <div className="dataset-section">
            <h3>Training Dataset Information</h3>
            <div className="dataset-grid">
              <div className="dataset-item">
                <span className="label">Total Samples</span>
                <span className="value">{analysis.dataset_info.total_samples || 'N/A'}</span>
              </div>
              <div className="dataset-item">
                <span className="label">Training Samples</span>
                <span className="value">{analysis.dataset_info.train_size || 'N/A'}</span>
              </div>
              <div className="dataset-item">
                <span className="label">Test Samples</span>
                <span className="value">{analysis.dataset_info.test_size || 'N/A'}</span>
              </div>
              <div className="dataset-item">
                <span className="label">Optimized Samples</span>
                <span className="value">{analysis.dataset_info.optimized_samples || 'N/A'}</span>
              </div>
              <div className="dataset-item">
                <span className="label">Unoptimized Samples</span>
                <span className="value">{analysis.dataset_info.unoptimized_samples || 'N/A'}</span>
              </div>
              <div className="dataset-item">
                <span className="label">Last Updated</span>
                <span className="value">
                  {analysis.timestamp 
                    ? new Date(analysis.timestamp).toLocaleDateString()
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default AlgorithmAnalysis;
