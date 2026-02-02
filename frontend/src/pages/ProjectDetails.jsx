import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectsAPI } from '../utils/api';
import Navbar from '../components/Navbar';
import RiskChart from '../components/RiskChart';
import { ArrowLeft, RefreshCw, FileCode, AlertTriangle } from 'lucide-react';
import './ProjectDetails.css';

const ProjectDetails = () => {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchProjectData();
    }, [id]);

    const fetchProjectData = async () => {
        setLoading(true);
        try {
            const [projectRes, analysisRes, statsRes] = await Promise.all([
                projectsAPI.getOne(id),
                projectsAPI.getAnalysis(id),
                projectsAPI.getStatistics(id),
            ]);

            setProject(projectRes.data.project);
            setAnalysis(analysisRes.data.data);
            setStatistics(statsRes.data.data);
        } catch (error) {
            console.error('Error fetching project data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchProjectData();
        setRefreshing(false);
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading project data...</p>
                </div>
            </>
        );
    }

    const results = analysis?.results || [];
    const stats = statistics || {};

    return (
        <>
            <Navbar />
            <div className="page-container">
                <div className="page-header">
                    <div>
                        <Link to="/dashboard" className="back-link">
                            <ArrowLeft size={20} />
                            Back to Dashboard
                        </Link>
                        <h1>{project?.name || 'Project Details'}</h1>
                        <p className="text-muted">{project?.description || 'No description'}</p>
                    </div>
                    <button onClick={handleRefresh} className="btn btn-secondary" disabled={refreshing}>
                        <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
                        Refresh
                    </button>
                </div>

                {stats.total_modules > 0 ? (
                    <>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <FileCode size={32} />
                                <div>
                                    <h3>{stats.total_modules}</h3>
                                    <p>Total Modules</p>
                                </div>
                            </div>

                            <div className="stat-card high-risk">
                                <AlertTriangle size={32} />
                                <div>
                                    <h3>{stats.risk_distribution?.high || 0}</h3>
                                    <p>High Risk</p>
                                </div>
                            </div>

                            <div className="stat-card medium-risk">
                                <AlertTriangle size={32} />
                                <div>
                                    <h3>{stats.risk_distribution?.medium || 0}</h3>
                                    <p>Medium Risk</p>
                                </div>
                            </div>

                            <div className="stat-card low-risk">
                                <AlertTriangle size={32} />
                                <div>
                                    <h3>{stats.risk_distribution?.low || 0}</h3>
                                    <p>Low Risk</p>
                                </div>
                            </div>
                        </div>

                        <RiskChart distribution={stats.risk_distribution} />

                        <div className="modules-section">
                            <h2>Module Analysis Results</h2>
                            <div className="modules-grid">
                                {results.map((result, index) => (
                                    <div key={index} className="module-card">
                                        <div className="module-header">
                                            <h3>{result.module_name}</h3>
                                            <span className={`risk-badge ${result.risk_level}`}>
                                                {result.risk_level}
                                            </span>
                                        </div>

                                        <div className="module-metrics">
                                            <div className="metric">
                                                <span>Lines of Code</span>
                                                <strong>{result.metrics.loc}</strong>
                                            </div>
                                            <div className="metric">
                                                <span>Complexity</span>
                                                <strong>{result.metrics.complexity.toFixed(1)}</strong>
                                            </div>
                                            <div className="metric">
                                                <span>Dependencies</span>
                                                <strong>{result.metrics.dependencies}</strong>
                                            </div>
                                        </div>

                                        {result.recommendations?.length > 0 && (
                                            <div className="module-recommendations">
                                                <h4>Recommendations</h4>
                                                <ul>
                                                    {result.recommendations.slice(0, 2).map((rec, i) => (
                                                        <li key={i}>{rec}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <FileCode size={64} />
                        <h2>No Analysis Data</h2>
                        <p>
                            No modules have been analyzed yet. Start the monitoring agent to analyze your
                            code.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
};

export default ProjectDetails;
