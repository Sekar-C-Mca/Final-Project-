import React, { useState, useEffect } from 'react';
import { ChevronRight, TrendingUp, Zap, Brain, Activity, Layers } from 'lucide-react';
import './AlgorithmSelector.css';

const AlgorithmSelector = ({ onAlgorithmSelect, onClose, currentAlgorithm }) => {
  const [algorithms, setAlgorithms] = useState({});
  const [selectedAlgo, setSelectedAlgo] = useState(currentAlgorithm || 'random_forest');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAlgorithms();
  }, []);

  const fetchAlgorithms = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/ml/algorithms');
      const data = await response.json();
      setAlgorithms(data.algorithms);
    } catch (err) {
      console.error('Error fetching algorithms:', err);
    }
  };

  const handleSelect = async (algo) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/ml/select-algorithm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm: algo })
      });

      if (response.ok) {
        setSelectedAlgo(algo);
        onAlgorithmSelect(algo);
      }
    } catch (err) {
      console.error('Error selecting algorithm:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAlgorithmIcon = (algo) => {
    const icons = {
      'random_forest': <Layers size={24} />,
      'gradient_boosting': <TrendingUp size={24} />,
      'xgboost': <Zap size={24} />,
      'svm': <Activity size={24} />,
      'logistic_regression': <Brain size={24} />
    };
    return icons[algo] || <Layers size={24} />;
  };

  return (
    <div className="algorithm-selector-overlay">
      <div className="algorithm-selector-modal">
        <div className="modal-header">
          <h2>Select ML Algorithm</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="algorithms-grid">
          {Object.entries(algorithms).map(([key, algo]) => (
            <div
              key={key}
              className={`algo-card ${selectedAlgo === key ? 'selected' : ''}`}
              onClick={() => handleSelect(key)}
            >
              <div className="algo-icon">{getAlgorithmIcon(key)}</div>
              <h3>{algo.name}</h3>
              <p className="algo-description">{algo.description}</p>

              <div className="algo-details">
                <div className="detail-section">
                  <h4>Pros</h4>
                  <ul>
                    {algo.pros.map((pro, i) => (
                      <li key={i}>✓ {pro}</li>
                    ))}
                  </ul>
                </div>

                <div className="detail-section">
                  <h4>Cons</h4>
                  <ul>
                    {algo.cons.map((con, i) => (
                      <li key={i}>✗ {con}</li>
                    ))}
                  </ul>
                </div>

                <div className="best-for">
                  <strong>Best for:</strong> {algo.best_for}
                </div>
              </div>

              {selectedAlgo === key && (
                <div className="selected-indicator">
                  <ChevronRight size={20} />
                  Selected
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button 
            className="btn btn-primary" 
            onClick={onClose}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlgorithmSelector;
