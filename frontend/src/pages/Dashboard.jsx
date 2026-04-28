import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI, historyAPI } from '../utils/api';
import Navbar from '../components/Navbar';
import {
    Plus,
    FolderOpen,
    AlertTriangle,
    TrendingUp,
    FileCode,
    Clock,
    Trash2,
    CheckCircle,
    XCircle,
    MinusCircle,
    BarChart2,
    RefreshCw,
} from 'lucide-react';
import './Dashboard.css';

const riskConfig = {
    high: { label: 'HIGH', color: '#dc2626', bg: 'rgba(220,38,38,0.12)', icon: <XCircle size={13} /> },
    medium: { label: 'MED', color: '#d97706', bg: 'rgba(217,119,6,0.12)', icon: <MinusCircle size={13} /> },
    low: { label: 'LOW', color: '#16a34a', bg: 'rgba(22,163,74,0.12)', icon: <CheckCircle size={13} /> },
    unknown: { label: '?', color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: <MinusCircle size={13} /> },
};

const Dashboard = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', description: '', language: 'python' });

    // History state
    const [history, setHistory] = useState([]);
    const [histStats, setHistStats] = useState(null);
    const [histLoading, setHistLoading] = useState(true);
    const [clearingAll, setClearingAll] = useState(false);

    useEffect(() => { fetchProjects(); }, []);
    useEffect(() => { fetchHistory(); }, []);

    const fetchProjects = async () => {
        try {
            const response = await projectsAPI.getAll();
            setProjects(response.data.projects || []);
        } catch (error) {
            console.error('Error fetching projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = useCallback(async () => {
        setHistLoading(true);
        try {
            const [histRes, statsRes] = await Promise.all([
                historyAPI.getAll({ limit: 50 }),
                historyAPI.getStats(),
            ]);
            setHistory(histRes.data.data || []);
            setHistStats(statsRes.data.stats || null);
        } catch (err) {
            console.error('History fetch error:', err);
        } finally {
            setHistLoading(false);
        }
    }, []);

    const handleDeleteEntry = async (id) => {
        try {
            await historyAPI.remove(id);
            setHistory(prev => prev.filter(e => e._id !== id));
            fetchHistory(); // refresh stats too
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm('Clear all prediction history? This cannot be undone.')) return;
        setClearingAll(true);
        try {
            await historyAPI.clear();
            setHistory([]);
            setHistStats(null);
        } catch (err) {
            console.error('Clear error:', err);
        } finally {
            setClearingAll(false);
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            await projectsAPI.create(newProject);
            setShowCreateModal(false);
            setNewProject({ name: '', description: '', language: 'python' });
            fetchProjects();
        } catch (error) {
            console.error('Error creating project:', error);
            alert('Failed to create project');
        }
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading dashboard...</p>
                </div>
            </>
        );
    }

    const totalModules = projects.reduce((s, p) => s + (p.totalModules || 0), 0);
    const totalHighRisk = projects.reduce((s, p) => s + (p.highRiskCount || 0), 0);
    const totalMedRisk = projects.reduce((s, p) => s + (p.mediumRiskCount || 0), 0);

    return (
        <>
            <Navbar />
            <div className="dashboard-container">

                {/* ── Projects ── */}
                <div className="projects-section">
                    <h2>Your Projects</h2>
                    <div className="projects-grid">
                        {projects.map((project) => (
                            <Link to={`/project/${project._id}`} key={project._id} className="project-card">
                                <div className="project-header">
                                    <h3>{project.name}</h3>
                                    <span className="language-badge">{project.language}</span>
                                </div>
                                <p className="project-description">{project.description || 'No description'}</p>
                                <div className="project-stats">
                                    <div className="project-stat">
                                        <span className="risk-badge low">{project.lowRiskCount || 0}</span>
                                        <span>Low</span>
                                    </div>
                                    <div className="project-stat">
                                        <span className="risk-badge medium">{project.mediumRiskCount || 0}</span>
                                        <span>Medium</span>
                                    </div>
                                    <div className="project-stat">
                                        <span className="risk-badge high">{project.highRiskCount || 0}</span>
                                        <span>High</span>
                                    </div>
                                </div>
                                <div className="project-footer">
                                    <span className="text-muted">{project.totalModules || 0} modules analyzed</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ══════════════════════════════════════
                    PREDICTION HISTORY PANEL
                ══════════════════════════════════════ */}
                <div className="history-section">
                    <div className="history-header">
                        <div className="history-title-row">
                            <Clock size={22} />
                            <h2>Prediction History</h2>
                            {histStats && (
                                <span className="history-total-badge">{histStats.totalScans} scans</span>
                            )}
                        </div>
                        <div className="history-header-actions">
                            <button className="btn-icon-sm" onClick={fetchHistory} title="Refresh">
                                <RefreshCw size={15} />
                            </button>
                            {history.length > 0 && (
                                <button
                                    className="btn-clear-history"
                                    onClick={handleClearAll}
                                    disabled={clearingAll}
                                >
                                    <Trash2 size={14} />
                                    {clearingAll ? 'Clearing…' : 'Clear All'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats Row */}
                    {histStats && histStats.totalScans > 0 && (
                        <div className="history-stats-row">
                            <div className="hist-stat">
                                <BarChart2 size={16} />
                                <span><strong>{histStats.totalScans}</strong> Total Scans</span>
                            </div>
                            <div className="hist-stat danger">
                                <XCircle size={16} />
                                <span><strong>{histStats.highRiskPercent}%</strong> High Risk</span>
                            </div>
                            <div className="hist-stat">
                                <Clock size={16} />
                                <span><strong>{histStats.recentScans}</strong> Last 7 Days</span>
                            </div>
                            {histStats.topFiles?.[0] && (
                                <div className="hist-stat">
                                    <FileCode size={16} />
                                    <span>Most Scanned: <strong>{histStats.topFiles[0].filename}</strong> ({histStats.topFiles[0].count}×)</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Timeline */}
                    {histLoading ? (
                        <div className="history-loading">
                            <div className="spinner" style={{ width: 28, height: 28 }}></div>
                            <p>Loading history…</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="history-empty">
                            <Clock size={40} style={{ opacity: 0.3 }} />
                            <p>No history yet. Refresh data on the <strong>ML Training → Predictions</strong> tab to start tracking.</p>
                        </div>
                    ) : (
                        <div className="history-list">
                            {history.map(entry => {
                                const rc = riskConfig[entry.consensusRisk] || riskConfig.unknown;
                                const dt = new Date(entry.createdAt);
                                const timeStr = dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

                                return (
                                    <div key={entry._id} className="history-item">
                                        <div className="history-item-left">
                                            {/* Risk pill */}
                                            <span className="risk-pill" style={{ color: rc.color, background: rc.bg, borderColor: rc.color }}>
                                                {rc.icon} {rc.label}
                                            </span>
                                            <div className="history-item-info">
                                                <span className="history-filename">{entry.filename}</span>
                                                <span className="history-meta">
                                                    {timeStr}
                                                    {entry.issuesDetected?.length > 0 && (
                                                        <span className="issues-count"> · {entry.issuesDetected.length} issue{entry.issuesDetected.length > 1 ? 's' : ''} found</span>
                                                    )}
                                                </span>
                                                {/* Algorithm mini-badges */}
                                                {entry.algorithmPredictions?.length > 0 && (
                                                    <div className="algo-mini-badges">
                                                        {entry.algorithmPredictions.map(ap => {
                                                            const arc = riskConfig[ap.riskLevel] || riskConfig.unknown;
                                                            return (
                                                                <span key={ap.algorithm} className="algo-mini" style={{ color: arc.color }}>
                                                                    {ap.algorithm.replace('_', ' ')} {ap.riskLevel === 'high' ? '🔴' : ap.riskLevel === 'low' ? '🟢' : '🟡'}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {/* Issues list */}
                                                {entry.issuesDetected?.length > 0 && (
                                                    <ul className="history-issues">
                                                        {entry.issuesDetected.map((iss, i) => (
                                                            <li key={i}>⚠ {iss}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            className="history-delete-btn"
                                            title="Delete entry"
                                            onClick={() => handleDeleteEntry(entry._id)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Project Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Create New Project</h2>
                        <form onSubmit={handleCreateProject}>
                            <div className="input-group">
                                <label htmlFor="name">Project Name</label>
                                <input type="text" id="name" value={newProject.name}
                                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                    required placeholder="My Awesome Project" />
                            </div>
                            <div className="input-group">
                                <label htmlFor="description">Description</label>
                                <input type="text" id="description" value={newProject.description}
                                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                    placeholder="Brief project description" />
                            </div>
                            <div className="input-group">
                                <label htmlFor="language">Primary Language</label>
                                <select id="language" value={newProject.language}
                                    onChange={(e) => setNewProject({ ...newProject, language: e.target.value })}>
                                    <option value="python">Python</option>
                                    <option value="javascript">JavaScript</option>
                                    <option value="java">Java</option>
                                    <option value="cpp">C++</option>
                                    <option value="mixed">Mixed</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Dashboard;
