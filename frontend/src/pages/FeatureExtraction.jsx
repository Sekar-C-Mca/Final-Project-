import { useState, useEffect } from 'react';
import { Code, FileCode, Activity, TrendingUp, Brain, AlertCircle, CheckCircle, Zap, BarChart3, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';
import './FeatureExtraction.css';

const FeatureExtraction = () => {
    const [sampleCode, setSampleCode] = useState(`def calculate_metrics(data):
    """Calculate statistical metrics from dataset"""
    total = sum(data)
    count = len(data)
    average = total / count
    
    variance = sum((x - average) ** 2 for x in data) / count
    std_dev = variance ** 0.5
    
    return {
        'mean': average,
        'std': std_dev,
        'variance': variance
    }

class DataProcessor:
    def __init__(self, config):
        self.config = config
        self.results = []
    
    def process(self, items):
        for item in items:
            result = self._analyze(item)
            self.results.append(result)
        return self.results
    
    def _analyze(self, data):
        # Complex analysis logic here
        metrics = calculate_metrics(data)
        return metrics
`);

    const [analysisResult, setAnalysisResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Extract features from the code when component mounts
    useEffect(() => {
        analyzeCode();
    }, []);

    const analyzeCode = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:8000/api/analyze-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code: sampleCode })
            });
            
            if (!response.ok) {
                throw new Error(`Analysis failed: ${response.status}`);
            }
            
            const result = await response.json();
            setAnalysisResult(result);
        } catch (err) {
            console.error('Analysis error:', err);
            setError(err.message);
            // Fallback to static data if API fails
            setAnalysisResult({
                extracted_features: {
                    LOC: 25,
                    Complexity: 8.5,
                    Dependencies: 3,
                    Functions: 3,
                    Classes: 1,
                    Comments: 2,
                    'Complexity/LOC': 0.34,
                    'Comment Ratio': 0.08,
                    'Functions/Class': 3.0,
                },
                ml_prediction: null,
                feature_importance: null,
                code_analysis: {
                    complexity_level: "Medium",
                    documentation_level: "Poor"
                },
                recommendations: ["Add more documentation", "Consider breaking down complex functions"]
            });
        }
        setLoading(false);
    };

    const handleCodeChange = (e) => {
        setSampleCode(e.target.value);
    };

    const featureDescriptions = {
        LOC: 'Lines of Code - Total number of code lines excluding blanks',
        Complexity: 'Cyclomatic Complexity - Measure of code complexity based on decision points',
        Dependencies: 'Number of external imports and dependencies',
        Functions: 'Total count of function definitions',
        Classes: 'Total count of class definitions',
        Comments: 'Number of comment lines',
        'Complexity/LOC': 'Complexity normalized by lines of code',
        'Comment Ratio': 'Ratio of comments to total lines',
        'Functions/Class': 'Average functions per class',
    };

    return (
        <>
            <Navbar />
            <div className="feature-extraction-container">
                <div className="page-header">
                    <div>
                        <h1>Dynamic Feature Extraction & ML Analysis</h1>
                        <p className="text-muted">
                            Real-time code analysis with feature extraction, ML predictions, and optimization insights
                        </p>
                    </div>
                    <button 
                        className="btn btn-primary"
                        onClick={analyzeCode}
                        disabled={loading}
                    >
                        <RefreshCw size={20} className={loading ? 'spinning' : ''} />
                        {loading ? 'Analyzing...' : 'Re-analyze Code'}
                    </button>
                </div>

                {error && (
                    <div className="error-message">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="extraction-grid">
                    {/* Code Editor */}
                    <div className="extraction-card">
                        <h2>
                            <Code size={24} />
                            Source Code Editor
                        </h2>
                        <div className="code-editor">
                            <textarea
                                value={sampleCode}
                                onChange={handleCodeChange}
                                className="code-textarea"
                                placeholder="Paste your code here for analysis..."
                                rows={20}
                            />
                            <button 
                                className="analyze-button"
                                onClick={analyzeCode}
                                disabled={loading}
                            >
                                <Brain size={16} />
                                Analyze This Code
                            </button>
                        </div>
                    </div>

                    {/* ML Analysis Results */}
                    {analysisResult?.ml_prediction && (
                        <div className="extraction-card ml-analysis">
                            <h2>
                                <Brain size={24} />
                                ML Analysis Results
                            </h2>
                            <div className="ml-results">
                                <div className={`prediction-result ${analysisResult.ml_prediction.is_optimized ? 'optimized' : 'unoptimized'}`}>
                                    <div className="prediction-header">
                                        {analysisResult.ml_prediction.is_optimized ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                                        <h3>{analysisResult.ml_prediction.is_optimized ? 'Code is Optimized' : 'Code Needs Optimization'}</h3>
                                    </div>
                                    <div className="prediction-details">
                                        <p>Algorithm: <strong>{analysisResult.ml_prediction.algorithm_used?.toUpperCase()}</strong></p>
                                        <p>Confidence: <strong>{(analysisResult.ml_prediction.confidence * 100).toFixed(1)}%</strong></p>
                                    </div>
                                </div>
                                
                                {analysisResult.recommendations && (
                                    <div className="recommendations">
                                        <h4>Optimization Recommendations:</h4>
                                        <ul>
                                            {analysisResult.recommendations.map((rec, idx) => (
                                                <li key={idx}>{rec}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Extraction Process */}
                    <div className="extraction-card">
                        <h2>
                            <Activity size={24} />
                            Real-time Extraction Process
                        </h2>
                        <div className="process-steps">
                            <div className="step completed">
                                <div className="step-number">1</div>
                                <div className="step-content">
                                    <h4>Parse Source Code</h4>
                                    <p>Convert code to Abstract Syntax Tree (AST)</p>
                                </div>
                            </div>

                            <div className="step completed">
                                <div className="step-number">2</div>
                                <div className="step-content">
                                    <h4>Analyze Structure</h4>
                                    <p>Count functions, classes, and dependencies</p>
                                </div>
                            </div>

                            <div className="step completed">
                                <div className="step-number">3</div>
                                <div className="step-content">
                                    <h4>Calculate Complexity</h4>
                                    <p>Measure cyclomatic complexity patterns</p>
                                </div>
                            </div>

                            <div className="step completed">
                                <div className="step-number">4</div>
                                <div className="step-content">
                                    <h4>ML Prediction</h4>
                                    <p>Apply trained model for optimization prediction</p>
                                </div>
                            </div>

                            <div className="step completed">
                                <div className="step-number">5</div>
                                <div className="step-content">
                                    <h4>Feature Importance Analysis</h4>
                                    <p>Identify key factors affecting optimization</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dynamic Extracted Features */}
                {analysisResult?.extracted_features && (
                    <div className="features-section">
                        <h2>
                            <TrendingUp size={24} />
                            Dynamically Extracted Features
                        </h2>
                        <div className="features-grid">
                            {Object.entries(analysisResult.extracted_features).map(([key, value]) => (
                                <div key={key} className="feature-item">
                                    <div className="feature-header">
                                        <FileCode size={20} />
                                        <h3>{key.replace(/_/g, ' ').toUpperCase()}</h3>
                                    </div>
                                    <div className="feature-value">{typeof value === 'number' ? value.toFixed(2) : value}</div>
                                    <p className="feature-description">{featureDescriptions[key] || 'Extracted code metric'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Feature Importance from Current ML Model */}
                {analysisResult?.feature_importance && (
                    <div className="importance-section card">
                        <h2>
                            <BarChart3 size={24} />
                            Feature Importance Analysis (Live from ML Model)
                        </h2>
                        <div className="importance-grid">
                            {Object.entries(analysisResult.feature_importance)
                                .sort(([,a], [,b]) => b - a)
                                .slice(0, 5)
                                .map(([feature, importance]) => (
                                <div key={feature} className="importance-item">
                                    <div className="importance-bar">
                                        <div className="importance-label">{feature}</div>
                                        <div className="importance-visual">
                                            <div 
                                                className="importance-fill" 
                                                style={{ width: `${importance * 100}%` }}
                                            ></div>
                                        </div>
                                        <div className="importance-value">{(importance * 100).toFixed(1)}%</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-muted" style={{ marginTop: '1rem' }}>
                            Feature importance values from the currently selected ML algorithm
                        </p>
                    </div>
                )}

                {/* Code Quality Analysis */}
                {analysisResult?.code_analysis && (
                    <div className="quality-section card">
                        <h2>Code Quality Analysis</h2>
                        <div className="quality-metrics">
                            <div className="quality-item">
                                <span className="quality-label">Complexity Level:</span>
                                <span className={`quality-badge ${analysisResult.code_analysis.complexity_level.toLowerCase()}`}>
                                    {analysisResult.code_analysis.complexity_level}
                                </span>
                            </div>
                            <div className="quality-item">
                                <span className="quality-label">Documentation Level:</span>
                                <span className={`quality-badge ${analysisResult.code_analysis.documentation_level.toLowerCase()}`}>
                                    {analysisResult.code_analysis.documentation_level}
                                </span>
                            </div>
                            {analysisResult.code_analysis.structure_quality && (
                                <div className="quality-item">
                                    <span className="quality-label">Structure Quality:</span>
                                    <span className={`quality-badge ${analysisResult.code_analysis.structure_quality.toLowerCase()}`}>
                                        {analysisResult.code_analysis.structure_quality}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Feature Vector for ML Model */}
                {analysisResult?.feature_vector && (
                    <div className="vector-section card">
                        <h2>Live Feature Vector for ML Model</h2>
                        <div className="vector-display">
                            <code>
                                [{analysisResult.feature_vector.map(v => typeof v === 'number' ? v.toFixed(2) : v).join(', ')}]
                            </code>
                        </div>
                        <p className="text-muted" style={{ marginTop: '1rem' }}>
                            This 9-dimensional vector is dynamically extracted and fed into the ML model for real-time optimization prediction
                        </p>
                    </div>
                )}
            </div>
        </>
    );
};

export default FeatureExtraction;
