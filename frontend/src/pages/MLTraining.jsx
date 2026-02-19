import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, TrendingUp, Brain, RefreshCw, BarChart3, Zap, Code, CheckCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import './MLTraining.css';

const MLTraining = () => {
  const [modelInfo, setModelInfo] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [retraining, setRetraining] = useState(false);

  const sampleMetrics = [
    {
      name: 'Well-Written Code',
      loc: 150,
      complexity: 10,
      dependencies: 2,
      functions: 12,
      classes: 3,
      comments: 30,
      complexity_per_loc: 0.067,
      comment_ratio: 0.20,
      functions_per_class: 4.0,
      type: 'optimized'
    },
    {
      name: 'Complex Code',
      loc: 500,
      complexity: 45,
      dependencies: 10,
      functions: 5,
      classes: 6,
      comments: 20,
      complexity_per_loc: 0.09,
      comment_ratio: 0.04,
      functions_per_class: 0.83,
      type: 'unoptimized'
    },
    {
      name: 'Medium Complexity',
      loc: 300,
      complexity: 22,
      dependencies: 5,
      functions: 9,
      classes: 4,
      comments: 50,
      complexity_per_loc: 0.073,
      comment_ratio: 0.167,
      functions_per_class: 2.25,
      type: 'medium'
    }
  ];

  useEffect(() => {
    fetchModelInfo();
    fetchPredictions();
  }, []);

  const fetchModelInfo = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/ml/model-info');
      if (!response.ok) throw new Error('Failed to fetch model info');
      const data = await response.json();
      setModelInfo(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching model info:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchPredictions = async () => {
    try {
      const results = [];
      for (const sample of sampleMetrics) {
        const metricsForAPI = {
          loc: sample.loc,
          complexity: sample.complexity,
          dependencies: sample.dependencies,
          functions: sample.functions,
          classes: sample.classes,
          comments: sample.comments,
          complexity_per_loc: sample.complexity_per_loc,
          comment_ratio: sample.comment_ratio,
          functions_per_class: sample.functions_per_class
        };

        const response = await fetch('http://localhost:8000/api/ml/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metricsForAPI)
        });

        if (response.ok) {
          const data = await response.json();
          results.push({
            name: sample.name,
            ...data,
            actualType: sample.type
          });
        }
      }
      setPredictions(results);
    } catch (err) {
      console.error('Error fetching predictions:', err);
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      const response = await fetch('http://localhost:8000/api/ml/retrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_size: 800 })
      });

      if (!response.ok) throw new Error('Retraining failed');
      
      alert('Model retrained successfully!');
      fetchModelInfo();
      fetchPredictions();
    } catch (err) {
      alert(`Retraining error: ${err.message}`);
    } finally {
      setRetraining(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="ml-training-container">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading ML Module...</p>
          </div>
        </div>
      </>
    );
  }

  const featureImportanceData = modelInfo?.feature_importance 
    ? Object.entries(modelInfo.feature_importance)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 9)
        .map(([name, importance]) => ({
          name,
          importance: (importance * 100).toFixed(2)
        }))
    : [];

  const optimizedCount = predictions.filter(p => p.is_optimized).length;
  const unoptimizedCount = predictions.filter(p => !p.is_optimized).length;

  const predictionDistribution = [
    { name: 'Optimized', value: optimizedCount, fill: 'var(--success)' },
    { name: 'Unoptimized', value: unoptimizedCount, fill: 'var(--danger)' }
  ];

  return (
    <>
      <Navbar />
      <div className="ml-training-container">
        <div className="dashboard-header">
          <div>
            <h1>ML Optimization Model</h1>
            <p className="text-muted">Code optimization prediction and analysis</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={handleRetrain}
            disabled={retraining}
          >
            <RefreshCw size={20} />
            {retraining ? 'Retraining...' : 'Retrain Model'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="tab-navigation">
          <button 
            className={`tab-btn ${selectedTab === 'overview' ? 'active' : ''}`}
            onClick={() => setSelectedTab('overview')}
          >
            <BarChart3 size={18} />
            Overview
          </button>
          <button 
            className={`tab-btn ${selectedTab === 'features' ? 'active' : ''}`}
            onClick={() => setSelectedTab('features')}
          >
            <TrendingUp size={18} />
            Feature Importance
          </button>
          <button 
            className={`tab-btn ${selectedTab === 'predictions' ? 'active' : ''}`}
            onClick={() => setSelectedTab('predictions')}
          >
            <Code size={18} />
            Predictions
          </button>
        </div>

        {selectedTab === 'overview' && (
          <div className="tab-content">
            <div className="overview-cards">
              <div className="overview-card">
                <TrendingUp size={32} />
                <div>
                  <h3>{modelInfo?.metrics?.accuracy ? (modelInfo.metrics.accuracy * 100).toFixed(2) : 'N/A'}%</h3>
                  <p>Accuracy</p>
                </div>
              </div>

              <div className="overview-card">
                <CheckCircle size={32} />
                <div>
                  <h3>{modelInfo?.metrics?.precision ? (modelInfo.metrics.precision * 100).toFixed(2) : 'N/A'}%</h3>
                  <p>Precision</p>
                </div>
              </div>

              <div className="overview-card">
                <Zap size={32} />
                <div>
                  <h3>{modelInfo?.metrics?.recall ? (modelInfo.metrics.recall * 100).toFixed(2) : 'N/A'}%</h3>
                  <p>Recall</p>
                </div>
              </div>

              <div className="overview-card">
                <Brain size={32} />
                <div>
                  <h3>{modelInfo?.metrics?.f1_score ? (modelInfo.metrics.f1_score * 100).toFixed(2) : 'N/A'}%</h3>
                  <p>F1-Score</p>
                </div>
              </div>
            </div>

            <div className="info-section">
              <h2>Model Information</h2>
              <div className="info-grid">
                <div className="info-row">
                  <span className="label">Algorithm</span>
                  <span className="value">{modelInfo?.algorithm || 'random_forest'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Training Samples</span>
                  <span className="value">{modelInfo?.dataset_info?.train_size || 640}</span>
                </div>
                <div className="info-row">
                  <span className="label">Test Samples</span>
                  <span className="value">{modelInfo?.dataset_info?.test_size || 160}</span>
                </div>
                <div className="info-row">
                  <span className="label">Status</span>
                  <span className="value" style={{ color: 'var(--success)' }}>Active</span>
                </div>
              </div>
            </div>

            {predictions.length > 0 && (
              <div className="chart-section">
                <h2>Prediction Distribution</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={predictionDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {predictionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'features' && (
          <div className="tab-content">
            {featureImportanceData.length > 0 ? (
              <div className="chart-section">
                <h2>Feature Importance Analysis</h2>
                <p className="section-subtitle">Features with the most impact on optimization predictions</p>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={featureImportanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis label={{ value: 'Importance (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="importance" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <div className="insights-section">
                  <h3>Key Insights</h3>
                  <ul>
                    <li><strong>Complexity (34%)</strong>: Most critical factor. Simplify complex functions.</li>
                    <li><strong>Comment Ratio (29%)</strong>: Well-documented code is preferred.</li>
                    <li><strong>Dependencies (27%)</strong>: High coupling affects optimization.</li>
                    <li><strong>Code Structure</strong>: Function and class design matters.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <p>No feature importance data available</p>
            )}
          </div>
        )}

        {selectedTab === 'predictions' && (
          <div className="tab-content">
            <h2>Sample Code Analysis</h2>
            <div className="predictions-grid">
              {predictions.map((pred, idx) => (
                <div 
                  key={idx} 
                  className={`prediction-card ${pred.is_optimized ? 'success' : 'danger'}`}
                >
                  <div className="card-title">
                    <h3>{pred.name}</h3>
                    <div className={`badge ${pred.is_optimized ? 'badge-success' : 'badge-danger'}`}>
                      {pred.is_optimized ? 'Optimized' : 'Unoptimized'}
                    </div>
                  </div>

                  <div className="confidence-meter">
                    <div className="confidence-label">
                      <span>Confidence</span>
                      <span className="confidence-value">{pred.confidence}</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className={`progress-fill ${pred.is_optimized ? 'success' : 'danger'}`}
                        style={{ width: `${parseFloat(pred.confidence_score) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="metrics-list">
                    <div className="metric-row">
                      <span>Lines of Code</span>
                      <strong>{pred.input_metrics.loc}</strong>
                    </div>
                    <div className="metric-row">
                      <span>Complexity</span>
                      <strong>{pred.input_metrics.complexity}</strong>
                    </div>
                    <div className="metric-row">
                      <span>Comment Ratio</span>
                      <strong>{(pred.input_metrics.comment_ratio * 100).toFixed(1)}%</strong>
                    </div>
                    <div className="metric-row">
                      <span>Dependencies</span>
                      <strong>{pred.input_metrics.dependencies}</strong>
                    </div>
                  </div>

                  {pred.recommendations && pred.recommendations.length > 0 && (
                    <div className="recommendations-list">
                      <h4>Recommendations</h4>
                      <ul>
                        {pred.recommendations.slice(0, 2).map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MLTraining;
