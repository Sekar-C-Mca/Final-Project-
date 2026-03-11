import React from 'react';
import { Info } from 'lucide-react';
import { ALGORITHM_DESCRIPTIONS } from '../config/algorithmDescriptions';
import './AlgorithmDescription.css';

const AlgorithmDescription = ({ algorithm }) => {
  const algo = ALGORITHM_DESCRIPTIONS[algorithm];

  if (!algo) return null;

  return (
    <div className="algorithm-description-panel">
      <div className="algo-description-header">
        <Info size={20} />
        <h3>{algo.name}</h3>
      </div>

      <p className="algo-description-text">{algo.description}</p>

      <div className="algo-details-grid">
        <div className="algo-detail">
          <span className="detail-label">Context:</span>
          <span className="detail-value">{algo.context}</span>
        </div>
        <div className="algo-detail">
          <span className="detail-label">Expected Accuracy:</span>
          <span className="detail-value">{algo.accuracy}</span>
        </div>
      </div>

      <div className="algo-benefits">
        <h4>Benefits for Code Risk Evaluation:</h4>
        <ul>
          {algo.benefits.map((benefit, idx) => (
            <li key={idx}>{benefit}</li>
          ))}
        </ul>
      </div>

      <div className="algo-use-case">
        <strong>Best Use Case:</strong>
        <p>{algo.use_case}</p>
      </div>
    </div>
  );
};

export default AlgorithmDescription;
