import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../utils/api';
import Navbar from '../components/Navbar';
import {
    Plus,
    FolderOpen,
    AlertTriangle,
    TrendingUp,
    FileCode,
} from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newProject, setNewProject] = useState({
        name: '',
        description: '',
        language: 'python',
    });

    useEffect(() => {
        fetchProjects();
    }, []);

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
                    <p>Loading projects...</p>
                </div>
            </>
        );
    }

    const totalModules = projects.reduce((sum, p) => sum + (p.totalModules || 0), 0);
    const totalHighRisk = projects.reduce((sum, p) => sum + (p.highRiskCount || 0), 0);
    const totalMediumRisk = projects.reduce((sum, p) => sum + (p.mediumRiskCount || 0), 0);

    return (
        <>
            <Navbar />
            <div className="dashboard-container">
                <div className="dashboard-header">
                    <div>
                        <h1>Dashboard</h1>
                        <p className="text-muted">Monitor and manage your software project risks</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary"
                    >
                        <Plus size={20} />
                        New Project
                    </button>
                </div>

                <div className="overview-cards">
                    <div className="overview-card">
                        <FolderOpen size={32} />
                        <div>
                            <h3>{projects.length}</h3>
                            <p>Total Projects</p>
                        </div>
                    </div>

                    <div className="overview-card">
                        <FileCode size={32} />
                        <div>
                            <h3>{totalModules}</h3>
                            <p>Modules Analyzed</p>
                        </div>
                    </div>

                    <div className="overview-card danger">
                        <AlertTriangle size={32} />
                        <div>
                            <h3>{totalHighRisk}</h3>
                            <p>High Risk Modules</p>
                        </div>
                    </div>

                    <div className="overview-card warning">
                        <TrendingUp size={32} />
                        <div>
                            <h3>{totalMediumRisk}</h3>
                            <p>Medium Risk Modules</p>
                        </div>
                    </div>
                </div>

                <div className="projects-section">
                    <h2>Your Projects</h2>

                    {projects.length === 0 ? (
                        <div className="empty-state card">
                            <FolderOpen size={64} />
                            <h3>No Projects Yet</h3>
                            <p>Create your first project to start monitoring code quality.</p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="btn btn-primary"
                            >
                                <Plus size={20} />
                                Create Project
                            </button>
                        </div>
                    ) : (
                        <div className="projects-grid">
                            {projects.map((project) => (
                                <Link
                                    to={`/project/${project._id}`}
                                    key={project._id}
                                    className="project-card"
                                >
                                    <div className="project-header">
                                        <h3>{project.name}</h3>
                                        <span className="language-badge">{project.language}</span>
                                    </div>

                                    <p className="project-description">
                                        {project.description || 'No description'}
                                    </p>

                                    <div className="project-stats">
                                        <div className="project-stat">
                                            <span className="risk-badge low">
                                                {project.lowRiskCount || 0}
                                            </span>
                                            <span>Low</span>
                                        </div>
                                        <div className="project-stat">
                                            <span className="risk-badge medium">
                                                {project.mediumRiskCount || 0}
                                            </span>
                                            <span>Medium</span>
                                        </div>
                                        <div className="project-stat">
                                            <span className="risk-badge high">
                                                {project.highRiskCount || 0}
                                            </span>
                                            <span>High</span>
                                        </div>
                                    </div>

                                    <div className="project-footer">
                                        <span className="text-muted">
                                            {project.totalModules || 0} modules analyzed
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Create New Project</h2>
                        <form onSubmit={handleCreateProject}>
                            <div className="input-group">
                                <label htmlFor="name">Project Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={newProject.name}
                                    onChange={(e) =>
                                        setNewProject({ ...newProject, name: e.target.value })
                                    }
                                    required
                                    placeholder="My Awesome Project"
                                />
                            </div>

                            <div className="input-group">
                                <label htmlFor="description">Description</label>
                                <input
                                    type="text"
                                    id="description"
                                    value={newProject.description}
                                    onChange={(e) =>
                                        setNewProject({ ...newProject, description: e.target.value })
                                    }
                                    placeholder="Brief project description"
                                />
                            </div>

                            <div className="input-group">
                                <label htmlFor="language">Primary Language</label>
                                <select
                                    id="language"
                                    value={newProject.language}
                                    onChange={(e) =>
                                        setNewProject({ ...newProject, language: e.target.value })
                                    }
                                >
                                    <option value="python">Python</option>
                                    <option value="javascript">JavaScript</option>
                                    <option value="java">Java</option>
                                    <option value="cpp">C++</option>
                                    <option value="mixed">Mixed</option>
                                </select>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Dashboard;
