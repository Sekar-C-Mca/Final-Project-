import { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import Navbar from '../components/Navbar';
import axios from 'axios';
import './MLTraining.css';

const MLTraining = () => {
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [algorithm, setAlgorithm] = useState('random_forest');
    const [uploading, setUploading] = useState(false);
    const [training, setTraining] = useState(false);
    const [trainingMetrics, setTrainingMetrics] = useState(null);
    const [error, setError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
            setUploadSuccess(false);
            setError('');
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a dataset file');
            return;
        }

        setUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('http://localhost:8000/api/upload-dataset', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setUploadSuccess(true);
            setFileName(response.data.filename);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to upload dataset');
        } finally {
            setUploading(false);
        }
    };

    const handleTrain = async () => {
        if (!fileName) {
            setError('Please upload a dataset first');
            return;
        }

        setTraining(true);
        setError('');

        try {
            const response = await axios.post('http://localhost:8000/api/models/train', {
                dataset_name: fileName,
                algorithm: algorithm,
            });

            setTrainingMetrics(response.data.metrics);
        } catch (err) {
            setError(err.response?.data?.detail || 'Training failed');
        } finally {
            setTraining(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className="ml-training-container">
                <div className="page-header">
                    <div>
                        <h1>ML Model Training</h1>
                        <p className="text-muted">Upload datasets and train custom prediction models</p>
                    </div>
                </div>

                <div className="training-grid">
                    {/* Dataset Upload Section */}
                    <div className="training-card">
                        <h2>
                            <Upload size={24} />
                            Upload Dataset
                        </h2>

                        <div className="upload-area">
                            <input
                                type="file"
                                id="dataset-file"
                                accept=".csv"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            <label htmlFor="dataset-file" className="upload-label">
                                <FileText size={48} />
                                <p>{file ? file.name : 'Click to select CSV file'}</p>
                                <span className="text-muted">Max size: 50MB</span>
                            </label>
                        </div>

                        {file && (
                            <button onClick={handleUpload} className="btn btn-primary" disabled={uploading}>
                                {uploading ? (
                                    <>
                                        <Loader size={18} className="spinning" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={18} />
                                        Upload Dataset
                                    </>
                                )}
                            </button>
                        )}

                        {uploadSuccess && (
                            <div className="success-message">
                                <CheckCircle size={18} />
                                <span>Dataset uploaded successfully!</span>
                            </div>
                        )}

                        {error && (
                            <div className="error-message">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Model Training Section */}
                    <div className="training-card">
                        <h2>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            Train Model
                        </h2>

                        <div className="input-group">
                            <label>Select Algorithm</label>
                            <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
                                <option value="random_forest">Random Forest</option>
                                <option value="gradient_boosting">Gradient Boosting</option>
                                <option value="svm">Support Vector Machine</option>
                                <option value="logistic_regression">Logistic Regression</option>
                            </select>
                        </div>

                        <div className="info-box">
                            <h4>Algorithm Info</h4>
                            {algorithm === 'random_forest' && (
                                <p>Ensemble method using multiple decision trees. Great for complex patterns.</p>
                            )}
                            {algorithm === 'gradient_boosting' && (
                                <p>Builds trees sequentially, correcting errors. High accuracy but slower.</p>
                            )}
                            {algorithm === 'svm' && (
                                <p>Finds optimal hyperplane for classification. Works well with high dimensions.</p>
                            )}
                            {algorithm === 'logistic_regression' && (
                                <p>Linear model for classification. Fast and interpretable.</p>
                            )}
                        </div>

                        <button
                            onClick={handleTrain}
                            className="btn btn-primary"
                            disabled={!uploadSuccess || training}
                        >
                            {training ? (
                                <>
                                    <Loader size={18} className="spinning" />
                                    Training Model...
                                </>
                            ) : (
                                'Start Training'
                            )}
                        </button>
                    </div>
                </div>

                {/* Training Results */}
                {trainingMetrics && (
                    <div className="metrics-section fade-in">
                        <h2>Training Results</h2>
                        <div className="metrics-grid">
                            <div className="metric-card">
                                <h3>Accuracy</h3>
                                <div className="metric-value">{(trainingMetrics.accuracy * 100).toFixed(2)}%</div>
                                <div className="metric-bar">
                                    <div
                                        className="metric-fill"
                                        style={{ width: `${trainingMetrics.accuracy * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="metric-card">
                                <h3>Precision</h3>
                                <div className="metric-value">{(trainingMetrics.precision * 100).toFixed(2)}%</div>
                                <div className="metric-bar">
                                    <div
                                        className="metric-fill"
                                        style={{ width: `${trainingMetrics.precision * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="metric-card">
                                <h3>Recall</h3>
                                <div className="metric-value">{(trainingMetrics.recall * 100).toFixed(2)}%</div>
                                <div className="metric-bar">
                                    <div
                                        className="metric-fill"
                                        style={{ width: `${trainingMetrics.recall * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="metric-card">
                                <h3>F1 Score</h3>
                                <div className="metric-value">{(trainingMetrics.f1_score * 100).toFixed(2)}%</div>
                                <div className="metric-bar">
                                    <div
                                        className="metric-fill"
                                        style={{ width: `${trainingMetrics.f1_score * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="success-message" style={{ marginTop: '2rem' }}>
                            <CheckCircle size={24} />
                            <div>
                                <strong>Model trained successfully!</strong>
                                <p>The model is now being used for all new predictions</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default MLTraining;
