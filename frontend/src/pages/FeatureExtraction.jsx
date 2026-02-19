import { useState } from 'react';
import { Code, FileCode, Activity, TrendingUp } from 'lucide-react';
import Navbar from '../components/Navbar';
import './FeatureExtraction.css';

const FeatureExtraction = () => {
    const [sampleCode] = useState(`def calculate_metrics(data):
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

    const [extractedFeatures] = useState({
        loc: 25,
        complexity: 8.5,
        dependencies: 3,
        functions: 3,
        classes: 1,
        comments: 2,
        complexity_per_loc: 0.34,
        comment_ratio: 0.08,
        functions_per_class: 3.0,
    });

    const featureDescriptions = {
        loc: 'Lines of Code - Total number of code lines excluding blanks',
        complexity: 'Cyclomatic Complexity - Measure of code complexity based on decision points',
        dependencies: 'Number of external imports and dependencies',
        functions: 'Total count of function definitions',
        classes: 'Total count of class definitions',
        comments: 'Number of comment lines',
        complexity_per_loc: 'Complexity normalized by lines of code',
        comment_ratio: 'Ratio of comments to total lines',
        functions_per_class: 'Average functions per class',
    };

    return (
        <>
            <Navbar />
            <div className="feature-extraction-container">
                <div className="page-header">
                    <div>
                        <h1>Feature Extraction Process</h1>
                        <p className="text-muted">
                            See how code metrics are extracted and analyzed
                        </p>
                    </div>
                </div>

                <div className="extraction-grid">
                    {/* Code Sample */}
                    <div className="extraction-card">
                        <h2>
                            <Code size={24} />
                            Sample Code
                        </h2>
                        <div className="code-viewer">
                            <pre>
                                <code>{sampleCode}</code>
                            </pre>
                        </div>
                    </div>

                    {/* Extraction Process */}
                    <div className="extraction-card">
                        <h2>
                            <Activity size={24} />
                            Extraction Steps
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
                                    <p>Measure cyclomatic complexity using Radon</p>
                                </div>
                            </div>

                            <div className="step completed">
                                <div className="step-number">4</div>
                                <div className="step-content">
                                    <h4>Derive Metrics</h4>
                                    <p>Compute ratios and normalized values</p>
                                </div>
                            </div>

                            <div className="step completed">
                                <div className="step-number">5</div>
                                <div className="step-content">
                                    <h4>Create Feature Vector</h4>
                                    <p>Transform to ML-ready numerical format</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Extracted Features */}
                <div className="features-section">
                    <h2>
                        <TrendingUp size={24} />
                        Extracted Features
                    </h2>
                    <div className="features-grid">
                        {Object.entries(extractedFeatures).map(([key, value]) => (
                            <div key={key} className="feature-item">
                                <div className="feature-header">
                                    <FileCode size={20} />
                                    <h3>{key.replace(/_/g, ' ').toUpperCase()}</h3>
                                </div>
                                <div className="feature-value">{value.toFixed(2)}</div>
                                <p className="feature-description">{featureDescriptions[key]}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Feature Vector */}
                <div className="vector-section card">
                    <h2>Final Feature Vector for ML Model</h2>
                    <div className="vector-display">
                        <code>
                            [{Object.values(extractedFeatures).map(v => v.toFixed(2)).join(', ')}]
                        </code>
                    </div>
                    <p className="text-muted" style={{ marginTop: '1rem' }}>
                        This 9-dimensional vector is fed into the ML model for risk prediction
                    </p>
                </div>
            </div>
        </>
    );
};

export default FeatureExtraction;
