import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, TrendingUp, Brain, RefreshCw, BarChart3, Zap, Code, CheckCircle, ChevronRight, Settings } from 'lucide-react';
import Navbar from '../components/Navbar';
import AlgorithmSelector from './AlgorithmSelector';
import AlgorithmAnalysis from './AlgorithmAnalysis';
import AlgorithmDescription from '../components/AlgorithmDescription';
import './MLTraining.css';
import { historyAPI } from '../utils/api';

const MLTraining = () => {
  const [modelInfo, setModelInfo] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [retraining, setRetraining] = useState(false);
  const [showAlgorithmSelector, setShowAlgorithmSelector] = useState(false);
  const [showAlgorithmAnalysis, setShowAlgorithmAnalysis] = useState(false);
  const [currentAlgorithm, setCurrentAlgorithm] = useState('random_forest');
  const [trainingAlgorithm, setTrainingAlgorithm] = useState('random_forest');
  const [datasetsStatus, setDatasetsStatus] = useState(null);
  const [realTimeData, setRealTimeData] = useState([]);
  const [predictionDistribution, setPredictionDistribution] = useState([
    { name: 'Optimized', value: 0, fill: 'var(--success)' },
    { name: 'Unoptimized', value: 0, fill: 'var(--danger)' }
  ]);

  const fetchRealTimePredictions = async (algorithm = currentAlgorithm) => {
    try {
      console.log(`Fetching real-time predictions for algorithm: ${algorithm}`);
      setLoading(true);

      // First select the algorithm
      try {
        const selectResponse = await fetch('http://localhost:8000/api/ml/select-algorithm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ algorithm: algorithm })
        });

        if (!selectResponse.ok) {
          const errorText = await selectResponse.text();
          console.error('Select algorithm error response:', errorText);
          throw new Error(`Failed to select algorithm: ${selectResponse.status} - ${errorText}`);
        }
      } catch (selectError) {
        console.error('Algorithm selection failed:', selectError);
      }

      // Try to fetch recent analysis results from our real-time monitoring
      let realTimeResults = [];

      // First, try to get real monitored data
      try {
        const monitorResponse = await fetch('http://localhost:8000/api/recent-analyses', {
          headers: { 'Content-Type': 'application/json' }
        });

        if (monitorResponse.ok) {
          const monitorData = await monitorResponse.json();
          console.log('Real-time monitor data:', monitorData);

          if (monitorData.analyses && monitorData.analyses.length > 0) {
            realTimeResults = monitorData.analyses.map((analysis, index) => {
              // Support both new format (extracted_features dict) and old format (features array)
              const ef = analysis.extracted_features || {};
              const fv = analysis.feature_vector || analysis.features || [];
              const fname = analysis.filename || analysis.file_path?.split('/').pop() || `file_${index + 1}`;

              return {
                name: fname,
                filename: fname,
                loc: ef.LOC ?? fv[0] ?? 0,
                complexity: ef.Complexity ?? fv[1] ?? 0,
                dependencies: ef.Dependencies ?? fv[2] ?? 0,
                functions: ef.Functions ?? fv[3] ?? 0,
                classes: ef.Classes ?? fv[4] ?? 0,
                comments: ef.Comments ?? fv[5] ?? 0,
                complexity_per_loc: ef['Complexity/LOC'] ?? fv[6] ?? 0,
                comment_ratio: ef['Comment Ratio'] ?? fv[7] ?? 0,
                functions_per_class: ef['Functions/Class'] ?? fv[8] ?? 0,
                predictions: analysis.predictions || {},
                consensus: analysis.consensus || { risk_level: 'unknown', confidence: 0 },
                feature_importance: analysis.feature_importance || {},
                timestamp: analysis.timestamp,
                actualType: analysis.consensus?.risk_level === 'low' ? 'optimized' :
                  analysis.consensus?.risk_level === 'high' ? 'unoptimized' :
                    analysis.consensus?.risk_level || 'unknown'
              };
            });
          }
        }
      } catch (monitorError) {
        console.log('No real-time monitor data available, using demonstration data');
      }

      // If no real data, show empty state (no fake demo data)
      if (realTimeResults.length === 0) {
        console.log('No real monitoring data available');
      }

      setPredictions(realTimeResults);
      setRealTimeData(realTimeResults);

      // ── Auto-save each result to MongoDB history (silent, non-blocking) ──
      if (realTimeResults.length > 0) {
        realTimeResults.forEach(pred => {
          const algoPreds = pred.predictions
            ? Object.entries(pred.predictions).map(([algo, p]) => ({
              algorithm: algo,
              riskLevel: p.risk_level || 'unknown',
              confidence: typeof p.confidence === 'number' ? p.confidence : 0
            }))
            : [];

          // Compute Spot-verdict issues (mirrors the logic in the card)
          const issues = [];
          const cmtPct = Number(pred.comment_ratio || 0) * 100;
          const cplx = Number(pred.complexity || 0);
          const loc = Number(pred.loc || 0);
          const funcs = Number(pred.functions || 0);
          const clss = Number(pred.classes || 0);
          const deps = Number(pred.dependencies || 0);
          if (cplx > 10) issues.push(`High complexity (${cplx})`);
          else if (cplx > 5) issues.push(`Moderate complexity (${cplx})`);
          if (cmtPct < 10) issues.push(`Very low comment ratio (${cmtPct.toFixed(1)}%)`);
          else if (cmtPct < 20) issues.push(`Low comment ratio (${cmtPct.toFixed(1)}%)`);
          if (loc > 300) issues.push(`Large file (${loc} lines)`);
          if (funcs > 15) issues.push(`Too many functions (${funcs})`);
          if (funcs > 0 && clss === 0 && loc > 80) issues.push(`No classes defined`);
          if (deps > 8) issues.push(`High dependency count (${deps})`);

          historyAPI.save({
            filename: pred.filename || pred.name || 'unknown',
            features: { loc, complexity: cplx, commentRatio: pred.comment_ratio || 0, functions: funcs, classes: clss, dependencies: deps },
            algorithmPredictions: algoPreds,
            consensusRisk: pred.consensus?.risk_level || pred.actualType || 'unknown',
            issuesDetected: issues
          }).catch(() => { /* silent — history save failure should never break UI */ });
        });
      }

      // Update distribution based on predictions
      const optimizedCount = realTimeResults.filter(p =>
        p.is_optimized || p.actualType === 'optimized' || p.consensus?.risk_level === 'low'
      ).length;
      const unoptimizedCount = realTimeResults.length - optimizedCount;

      setPredictionDistribution([
        { name: 'Optimized', value: optimizedCount, fill: 'var(--success)' },
        { name: 'Unoptimized', value: unoptimizedCount, fill: 'var(--danger)' }
      ]);

    } catch (error) {
      console.error('Error fetching real-time predictions:', error);
      setError(`Failed to fetch predictions: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log(`MLTraining component mounted or algorithm changed: ${currentAlgorithm}`);
    if (currentAlgorithm) {
      fetchModelInfo(currentAlgorithm);
      fetchRealTimePredictions(currentAlgorithm);
      fetchDatasetsStatus();
    }
  }, [currentAlgorithm]);

  // Also fetch datasets status on initial load and set up periodic updates
  useEffect(() => {
    console.log('Initial datasets fetch on component mount');
    fetchDatasetsStatus();

    // Set up periodic refresh for real-time data
    const interval = setInterval(() => {
      if (currentAlgorithm) {
        fetchRealTimePredictions(currentAlgorithm);
      }
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [currentAlgorithm]);

  const fetchModelInfo = async (algorithm = currentAlgorithm) => {
    try {
      console.log(`Fetching model info for algorithm: ${algorithm}`);
      // First select the algorithm, then get its info
      const selectResponse = await fetch('http://localhost:8000/api/ml/select-algorithm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ algorithm: algorithm })
      });

      if (!selectResponse.ok) {
        const errorText = await selectResponse.text();
        console.error('Select algorithm error response:', errorText);
        throw new Error(`Failed to select algorithm: ${selectResponse.status} - ${errorText}`);
      }

      const selectResult = await selectResponse.json();
      console.log('Algorithm selection successful:', selectResult);

      // Now fetch the model info for the selected algorithm
      const response = await fetch('http://localhost:8000/api/ml/model-info');
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Model info error response:', errorText);
        throw new Error(`Failed to fetch model info: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Model info received:', data);
      setModelInfo(data);

      // Update prediction distribution based on algorithm-specific dataset
      if (data.dataset_info) {
        const optimized = data.dataset_info.optimized_samples || 0;
        const unoptimized = data.dataset_info.unoptimized_samples || 0;
        setPredictionDistribution([
          { name: 'Optimized', value: optimized, fill: 'var(--success)' },
          { name: 'Unoptimized', value: unoptimized, fill: 'var(--danger)' }
        ]);
        console.log('Updated prediction distribution:', { optimized, unoptimized });
      }

      // Don't override currentAlgorithm - keep user's selection
      setLoading(false);
    } catch (err) {
      console.error('Error fetching model info:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchDatasetsStatus = async () => {
    try {
      console.log('Fetching datasets status...');
      const response = await fetch('http://localhost:8000/api/ml/datasets/status');
      console.log('Response status:', response.status);
      if (!response.ok) throw new Error(`Failed to fetch datasets status: ${response.status}`);
      const data = await response.json();
      console.log('Datasets data received:', data);
      if (data.datasets) {
        setDatasetsStatus(data.datasets);
        console.log('Datasets state updated with', Object.keys(data.datasets).length, 'algorithms');
      }
    } catch (err) {
      console.error('Error fetching datasets status:', err);
      // Retry after 2 seconds
      setTimeout(() => {
        console.log('Retrying fetch...');
        fetch('http://localhost:8000/api/ml/datasets/status')
          .then(r => r.json())
          .then(d => {
            if (d.datasets) {
              console.log('Retry successful, updating state');
              setDatasetsStatus(d.datasets);
            }
          })
          .catch(e => console.error('Retry failed:', e));
      }, 2000);
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      const response = await fetch('http://localhost:8000/api/ml/retrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          algorithm: trainingAlgorithm,
          dataset_size: 800
        })
      });

      if (!response.ok) throw new Error('Retraining failed');

      const data = await response.json();
      alert(`Model (${data.algorithm}) retrained successfully with independent dataset!`);
      setCurrentAlgorithm(data.algorithm);
      fetchModelInfo();
      fetchRealTimePredictions(); // Use the new real-time function
      fetchDatasetsStatus();
    } catch (err) {
      alert(`Retraining error: ${err.message}`);
    } finally {
      setRetraining(false);
    }
  };

  const handleAlgorithmSelect = (algorithm) => {
    console.log(`Algorithm selected: ${algorithm}`);
    setTrainingAlgorithm(algorithm);
    setCurrentAlgorithm(algorithm);
    setShowAlgorithmSelector(false);

    // Fetch algorithm-specific data
    fetchModelInfo(algorithm);
    fetchRealTimePredictions(algorithm);
    fetchDatasetsStatus();
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

  // Get algorithm-specific insights for features
  const getFeatureInsight = (featureName, algorithm) => {
    const insights = {
      'LOC': {
        'random_forest': 'Tree-based models see larger codebases as potentially less optimized.',
        'gradient_boosting': 'Gradient boosting focuses on gradual complexity reduction in large files.',
        'xgboost': 'XGBoost efficiently handles high-dimensional LOC features.',
        'svm': 'SVM with linear kernel finds LOC boundaries for optimization classification.',
        'logistic_regression': 'Linear relationship between code size and optimization probability.'
      },
      'Complexity': {
        'random_forest': 'Most critical factor for tree splits - high complexity indicates poor optimization.',
        'gradient_boosting': 'Complexity reduction is key focus in boosting iterations.',
        'xgboost': 'Advanced complexity handling with regularization prevents overfitting.',
        'svm': 'Linear separation based on complexity thresholds for optimization.',
        'logistic_regression': 'Linear coefficient shows direct complexity impact on optimization odds.'
      },
      'Dependencies': {
        'random_forest': 'High coupling affects optimization - important tree decision factor.',
        'gradient_boosting': 'Gradual learning of dependency patterns across boosting rounds.',
        'xgboost': 'Efficient handling of dependency interactions with feature importance.',
        'svm': 'Clear dependency boundaries separate optimized from unoptimized code.',
        'logistic_regression': 'Linear dependency impact on optimization probability.'
      },
      'Comment Ratio': {
        'random_forest': 'Well-documented code strongly correlates with optimization in tree decisions.',
        'gradient_boosting': 'Documentation quality emerges as key factor through boosting.',
        'xgboost': 'Comment ratio shows highest importance - documentation drives optimization.',
        'svm': 'Clear linear relationship between documentation and code optimization.',
        'logistic_regression': 'Strong positive coefficient for comment ratio in optimization prediction.'
      },
      'Functions': {
        'random_forest': 'Function count splits help identify well-structured code.',
        'gradient_boosting': 'Function organization patterns learned through gradient descent.',
        'xgboost': 'Function structure efficiently captured by XGBoost feature selection.',
        'svm': 'Function count provides clear optimization classification boundaries.',
        'logistic_regression': 'Linear relationship between function organization and optimization.'
      },
      'Classes': {
        'random_forest': 'Class structure influences tree-based optimization decisions.',
        'gradient_boosting': 'Object-oriented design patterns emerge through boosting.',
        'xgboost': 'Class organization efficiently handled by advanced tree methods.',
        'svm': 'Class count boundaries help separate optimized code.',
        'logistic_regression': 'Linear impact of class design on optimization probability.'
      },
      'Comments': {
        'random_forest': 'Comment count is major factor in tree-based optimization prediction.',
        'gradient_boosting': 'Documentation volume shows high importance in boosting.',
        'xgboost': 'Comment analysis reveals strong optimization correlation.',
        'svm': 'Comment count provides clear optimization classification.',
        'logistic_regression': 'Direct linear relationship between comments and optimization.'
      }
    };

    const defaultInsight = 'Important factor in determining code optimization quality.';
    return insights[featureName]?.[algorithm] || defaultInsight;
  };

  // Prediction distribution is now managed by state and updated from algorithm-specific dataset info

  return (
    <>
      <Navbar />
      <div className="ml-training-container">
        <div className="dashboard-header">
          <div>
            <h1>ML Optimization Model</h1>
            <p className="text-muted">Code optimization prediction and analysis</p>
          </div>
          <div className="header-controls">
            <div className="algorithm-selector-wrapper">
              <label htmlFor="algorithm-dropdown">Algorithm:</label>
              <select
                id="algorithm-dropdown"
                value={currentAlgorithm}
                onChange={async (e) => {
                  const newAlgorithm = e.target.value;
                  console.log(`Algorithm changed to: ${newAlgorithm}`);
                  setCurrentAlgorithm(newAlgorithm);
                  setTrainingAlgorithm(newAlgorithm);
                  setLoading(true);
                  setError(null);

                  try {
                    // Fetch algorithm-specific data
                    await fetchModelInfo(newAlgorithm);
                    await fetchRealTimePredictions(newAlgorithm);
                    fetchDatasetsStatus(); // This can run async
                  } catch (error) {
                    console.error('Error during algorithm change:', error);
                    setError(error.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="algorithm-dropdown"
              >
                <option value="random_forest">Random Forest</option>
                <option value="gradient_boosting">Gradient Boosting</option>
                <option value="xgboost">XGBoost</option>
                <option value="svm">SVM</option>
                <option value="logistic_regression">Logistic Regression</option>
              </select>
            </div>
            <div className="header-buttons">
              <button
                className="btn btn-primary"
                onClick={handleRetrain}
                disabled={retraining}
              >
                <RefreshCw size={20} />
                {retraining ? 'Retraining...' : 'Retrain Model'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="algorithm-info-bar">
          <span className="algo-badge">Current Algorithm: <strong>{trainingAlgorithm.toUpperCase()}</strong></span>
        </div>

        <AlgorithmDescription algorithm={currentAlgorithm} />

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
          <button
            className={`tab-btn ${selectedTab === 'datasets' ? 'active' : ''}`}
            onClick={() => {
              setSelectedTab('datasets');
              fetchDatasetsStatus();
            }}
          >
            <BarChart3 size={18} />
            Datasets
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
                  <span className="value algo-value">
                    {(modelInfo?.algorithm || currentAlgorithm).replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">Training Samples</span>
                  <span className="value">
                    {modelInfo?.dataset_info?.train_size || 0}
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">Test Samples</span>
                  <span className="value">
                    {modelInfo?.dataset_info?.test_size || 0}
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">Dataset Ratio (Opt:Unopt)</span>
                  <span className="value">
                    {(modelInfo?.dataset_info?.optimized_samples || 0)}:{(modelInfo?.dataset_info?.unoptimized_samples || 0)}
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">Status</span>
                  <span className="value" style={{ color: modelInfo?.model_loaded ? 'var(--success)' : 'var(--warning)' }}>
                    {modelInfo?.model_loaded ? 'Active' : 'Not Trained'}
                  </span>
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
                <h2>Feature Importance Analysis - {currentAlgorithm.replace('_', ' ').toUpperCase()}</h2>
                <p className="section-subtitle">Features with the most impact on optimization predictions for {currentAlgorithm.replace('_', ' ')} algorithm</p>
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
                  <h3>Key Insights for {currentAlgorithm.replace('_', ' ').toUpperCase()}</h3>
                  <ul>
                    {featureImportanceData.slice(0, 4).map((feature, idx) => (
                      <li key={idx}>
                        <strong>{feature.name} ({feature.importance}%)</strong>: {getFeatureInsight(feature.name, currentAlgorithm)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="no-data-message">
                <p>No feature importance data available for {currentAlgorithm.replace('_', ' ')} algorithm</p>
                <p>Try retraining the model to generate feature importance data.</p>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'predictions' && (
          <div className="tab-content">
            <div className="predictions-header">
              <h2>Real-Time Code Analysis</h2>
              <button
                className="btn btn-outline-primary"
                onClick={() => fetchRealTimePredictions(currentAlgorithm)}
                disabled={loading}
              >
                <RefreshCw size={16} />
                Refresh Data
              </button>
            </div>

            {realTimeData.length > 0 && (
              <div className="real-time-notice">
                <div className="notice-content">
                  <CheckCircle size={16} />
                  <span>Showing {realTimeData.length} analyzed files from monitoring system</span>
                </div>
                <div className="last-updated">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            )}

            {realTimeData.length > 0 ? (
              <div className="predictions-grid">
                {realTimeData.map((pred, idx) => {
                  // Determine prediction status
                  const riskLevel = pred.consensus?.risk_level || pred.actualType || 'unknown';
                  const isOptimized = riskLevel === 'low' || pred.is_optimized || pred.actualType === 'optimized';
                  const rawConf = pred.consensus?.confidence ?? pred.confidence ?? 0;
                  const confidence = (typeof rawConf === 'number' && !isNaN(rawConf)) ? rawConf : 0;

                  return (
                    <div
                      key={idx}
                      className={`prediction-card ${isOptimized ? 'success' : 'danger'}`}
                    >
                      <div className="card-title">
                        <h3>{pred.filename || pred.name}</h3>
                        <div className={`badge ${isOptimized ? 'badge-success' : 'badge-danger'}`}>
                          {isOptimized ? 'Optimized' : 'Unoptimized'}
                        </div>
                      </div>

                      <div className="confidence-meter">
                        <div className="confidence-label">
                          <span>Confidence</span>
                          <span className="confidence-value">
                            {(confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className={`progress-fill ${isOptimized ? 'success' : 'danger'}`}
                            style={{ width: `${confidence * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="metrics-list">
                        <div className="metric-row">
                          <span>Lines of Code</span>
                          <strong>{pred.loc}</strong>
                        </div>
                        <div className="metric-row">
                          <span>Complexity</span>
                          <strong>{pred.complexity}</strong>
                        </div>
                        <div className="metric-row">
                          <span>Comment Ratio</span>
                          <strong>{(Number(pred.comment_ratio || 0) * 100).toFixed(1)}%</strong>
                        </div>
                        <div className="metric-row">
                          <span>Dependencies</span>
                          <strong>{pred.dependencies}</strong>
                        </div>
                        <div className="metric-row">
                          <span>Functions</span>
                          <strong>{pred.functions}</strong>
                        </div>
                        <div className="metric-row">
                          <span>Classes</span>
                          <strong>{pred.classes}</strong>
                        </div>
                      </div>

                      {pred.predictions && Object.keys(pred.predictions).length > 0 && (() => {
                        const allPreds = Object.entries(pred.predictions);
                        const highCount = allPreds.filter(([, p]) => (p.risk_level || '') === 'high').length;
                        const total = allPreds.length;

                        // ── Detect specific issues from real metrics ──
                        const issues = [];
                        const commentRatioPct = Number(pred.comment_ratio || 0) * 100;
                        const complexity = Number(pred.complexity || 0);
                        const loc = Number(pred.loc || 0);
                        const functions = Number(pred.functions || 0);
                        const classes = Number(pred.classes || 0);
                        const dependencies = Number(pred.dependencies || 0);

                        if (complexity > 10)
                          issues.push(`🔧 High complexity (${complexity}) — break large logic blocks into smaller functions to reduce cyclomatic complexity.`);
                        else if (complexity > 5)
                          issues.push(`⚙️ Moderate complexity (${complexity}) — consider simplifying conditional branches or extracting helpers.`);

                        if (commentRatioPct < 10)
                          issues.push(`📝 Very low comment ratio (${commentRatioPct.toFixed(1)}%) — add inline comments and function-level documentation to explain intent.`);
                        else if (commentRatioPct < 20)
                          issues.push(`📝 Low comment ratio (${commentRatioPct.toFixed(1)}%) — aim for at least 20% comments for better maintainability.`);

                        if (loc > 300)
                          issues.push(`📏 Large file size (${loc} lines) — consider splitting this file into smaller, focused modules.`);

                        if (functions > 15)
                          issues.push(`🔗 Too many functions (${functions}) in one file — group related functions into classes or separate modules.`);

                        if (functions > 0 && classes === 0 && loc > 80)
                          issues.push(`🏗️ No classes defined — for ${functions} function(s), consider using OOP with classes to improve structure and reusability.`);

                        if (dependencies > 8)
                          issues.push(`🔌 High dependency count (${dependencies}) — reduce coupling by removing unused imports or splitting responsibilities.`);

                        // Verdict based on ML results + detected issues
                        const isGood = highCount === 0 && issues.length === 0;
                        const verdictColor = isGood ? '#16a34a' : highCount === total ? '#dc2626' : '#d97706';
                        const verdictBg = isGood ? 'rgba(22,163,74,0.12)' : highCount === total ? 'rgba(220,38,38,0.12)' : 'rgba(217,119,6,0.12)';
                        const verdictIcon = isGood ? '✅' : highCount === total ? '🚨' : '⚠️';
                        const verdictLabel = isGood ? 'Your Code is Good!' : `Your Code Has ${issues.length || highCount} Issue${(issues.length || highCount) !== 1 ? 's' : ''}`;

                        return (
                          <>
                            <div className="algorithm-predictions">
                              <h4>Algorithm Predictions</h4>
                              {allPreds.map(([algo, prediction]) => {
                                const risk = prediction.risk_level || 'unknown';
                                const conf = (typeof prediction.confidence === 'number' && !isNaN(prediction.confidence)) ? prediction.confidence : 0;
                                const riskEmoji = { 'low': '🟢', 'medium': '🟡', 'high': '🔴' }[risk] || '⚪';
                                return (
                                  <div key={algo} className="algo-prediction">
                                    <span>{algo.replace('_', ' ').toUpperCase()}</span>
                                    <div className="risk-indicator">
                                      {riskEmoji} {risk.toUpperCase()} ({(conf * 100).toFixed(1)}%)
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* ── Spot Verdict Footer ── */}
                            <div style={{
                              marginTop: '12px',
                              borderRadius: '10px',
                              background: verdictBg,
                              border: `1.5px solid ${verdictColor}`,
                              padding: '11px 14px',
                            }}>
                              {/* Header row */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: isGood ? 0 : '8px' }}>
                                <span style={{ fontSize: '17px' }}>{verdictIcon}</span>
                                <span style={{ fontWeight: 700, color: verdictColor, fontSize: '12.5px', letterSpacing: '0.3px' }}>
                                  SPOT VERDICT — {verdictLabel}
                                </span>
                                {!isGood && (
                                  <span style={{
                                    marginLeft: 'auto', fontSize: '10px',
                                    background: verdictColor, color: '#fff',
                                    borderRadius: '20px', padding: '2px 8px', fontWeight: 600, whiteSpace: 'nowrap'
                                  }}>
                                    {highCount}/{total} HIGH
                                  </span>
                                )}
                              </div>

                              {/* Issue list */}
                              {!isGood && issues.length > 0 && (
                                <ul style={{ margin: '0', padding: '0 0 0 4px', listStyle: 'none' }}>
                                  {issues.map((issue, i) => (
                                    <li key={i} style={{
                                      fontSize: '11px', color: verdictColor,
                                      lineHeight: '1.55', marginBottom: i < issues.length - 1 ? '5px' : 0,
                                      paddingLeft: '0', opacity: 0.92
                                    }}>
                                      {issue}
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {/* No specific metric issues but ML says high */}
                              {!isGood && issues.length === 0 && (
                                <p style={{ margin: 0, fontSize: '11px', color: verdictColor, lineHeight: '1.5', opacity: 0.9 }}>
                                  {highCount}/{total} ML models flagged this as HIGH risk. Review code structure and logic flow for hidden inefficiencies.
                                </p>
                              )}
                            </div>
                          </>
                        );
                      })()}

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
                  );
                })}
              </div>
            ) : (
              <div className="loading-state">
                <AlertCircle size={32} style={{ color: 'var(--info)', marginBottom: '10px' }} />
                <h3>No Monitoring Data Available</h3>
                <p>Start monitoring a project folder to see real-time ML analysis</p>
                <div style={{ marginTop: '15px', textAlign: 'left', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>To get started:</h4>
                  <ol style={{ margin: 0, paddingLeft: '20px' }}>
                    <li>Go to Deploy Script page</li>
                    <li>Select a project folder to monitor</li>
                    <li>Click "Start Monitoring"</li>
                    <li>Make code changes to generate analysis data</li>
                    <li>Return here and click "Refresh Data"</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'datasets' && (
          <div className="tab-content">
            <div className="info-section">
              <h2>Algorithm Datasets</h2>
              <p className="text-muted">Each algorithm has its own individual dataset for training and evaluation</p>

              {datasetsStatus && Object.keys(datasetsStatus).length > 0 ? (
                <div className="datasets-grid">
                  {Object.entries(datasetsStatus).map(([algo, info]) => (
                    <div key={algo} className={`dataset-card ${info.dataset_exists ? 'active' : 'inactive'}`}>
                      <div className="dataset-header">
                        <h3>{algo.replace('_', ' ').toUpperCase()}</h3>
                        <span className={`status-badge ${info.dataset_exists ? 'success' : 'warning'}`}>
                          {info.dataset_exists ? '✓ Available' : '○ Not Trained'}
                        </span>
                      </div>

                      {info.dataset_exists && (
                        <>
                          <div className="dataset-info">
                            <div className="info-item">
                              <span className="label">Dataset File</span>
                              <span className="value">{algo}_dataset.npz</span>
                            </div>
                            <div className="info-item">
                              <span className="label">File Size</span>
                              <span className="value">{(info.dataset_size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                          </div>

                          {info.dataset_info && (
                            <>
                              <div className="dataset-stats">
                                <div className="stat-item">
                                  <span className="stat-label">Total Samples</span>
                                  <span className="stat-value">{info.dataset_info.total_samples}</span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Training Samples</span>
                                  <span className="stat-value">{info.dataset_info.train_size}</span>
                                </div>
                                <div className="stat-item">
                                  <span className="stat-label">Test Samples</span>
                                  <span className="stat-value">{info.dataset_info.test_size}</span>
                                </div>
                              </div>

                              {info.metrics && (
                                <div className="performance-metrics">
                                  <h4>Performance Metrics</h4>
                                  <div className="metrics-mini">
                                    {info.metrics.accuracy && (
                                      <div className="metric-mini">
                                        <span>Accuracy</span>
                                        <span className="value">{(info.metrics.accuracy * 100).toFixed(2)}%</span>
                                      </div>
                                    )}
                                    {info.metrics.precision && (
                                      <div className="metric-mini">
                                        <span>Precision</span>
                                        <span className="value">{(info.metrics.precision * 100).toFixed(2)}%</span>
                                      </div>
                                    )}
                                    {info.metrics.recall && (
                                      <div className="metric-mini">
                                        <span>Recall</span>
                                        <span className="value">{(info.metrics.recall * 100).toFixed(2)}%</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {info.timestamp && (
                                <div className="dataset-timestamp">
                                  <small>Last trained: {new Date(info.timestamp).toLocaleString()}</small>
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : datasetsStatus === null ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading datasets status...</p>
                  <small style={{ marginTop: '10px', color: '#888' }}>Connecting to ML API...</small>
                </div>
              ) : (
                <div className="loading-state">
                  <AlertCircle size={32} style={{ color: 'var(--warning)', marginBottom: '10px' }} />
                  <p>No datasets available yet</p>
                  <small style={{ marginTop: '10px', color: '#888' }}>Train a model to generate datasets</small>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showAlgorithmSelector && (
        <AlgorithmSelector
          onAlgorithmSelect={handleAlgorithmSelect}
          onClose={() => setShowAlgorithmSelector(false)}
          currentAlgorithm={trainingAlgorithm}
        />
      )}

      {showAlgorithmAnalysis && (
        <AlgorithmAnalysis
          algorithm={trainingAlgorithm}
          onClose={() => setShowAlgorithmAnalysis(false)}
        />
      )}
    </>
  );
};

export default MLTraining;
