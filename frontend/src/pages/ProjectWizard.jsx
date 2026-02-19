import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Code,
    Database,
    Layers,
    CheckCircle,
    ArrowRight,
    ArrowLeft,
    Loader,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { projectsAPI } from '../utils/api';
import './ProjectWizard.css';

const ProjectWizard = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const [projectData, setProjectData] = useState({
        type: '',
        name: '',
        description: '',
        language: 'python',
        framework: '',
        path: '',
    });

    const projectTypes = [
        {
            id: 'mern',
            name: 'MERN Stack',
            icon: '🌐',
            description: 'MongoDB, Express, React, Node.js',
            languages: ['javascript', 'typescript'],
            frameworks: ['Next.js', 'Express', 'React'],
        },
        {
            id: 'python',
            name: 'Python Application',
            icon: '🐍',
            description: 'Django, Flask, FastAPI',
            languages: ['python'],
            frameworks: ['Django', 'Flask', 'FastAPI', 'Pure Python'],
        },
        {
            id: 'java',
            name: 'Java/Spring',
            icon: '☕',
            description: 'Spring Boot, Java EE',
            languages: ['java'],
            frameworks: ['Spring Boot', 'Spring MVC', 'Java EE'],
        },
        {
            id: 'nodejs',
            name: 'Node.js/Express',
            icon: '⚡',
            description: 'Express, Nest.js, Fastify',
            languages: ['javascript', 'typescript'],
            frameworks: ['Express', 'Nest.js', 'Fastify'],
        },
        {
            id: 'dotnet',
            name: '.NET/C#',
            icon: '🔷',
            description: 'ASP.NET Core, Entity Framework',
            languages: ['csharp'],
            frameworks: ['ASP.NET Core', '.NET 6+'],
        },
        {
            id: 'mobile',
            name: 'React Native',
            icon: '📱',
            description: 'Cross-platform mobile apps',
            languages: ['javascript', 'typescript'],
            frameworks: ['React Native', 'Expo'],
        },
        {
            id: 'rust',
            name: 'Rust Application',
            icon: '🦀',
            description: 'Actix, Rocket, Tokio',
            languages: ['rust'],
            frameworks: ['Actix', 'Rocket', 'Pure Rust'],
        },
        {
            id: 'go',
            name: 'Go Application',
            icon: '🎯',
            description: 'Gin, Echo, Fiber',
            languages: ['go'],
            frameworks: ['Gin', 'Echo', 'Fiber', 'Pure Go'],
        },
    ];

    const selectedType = projectTypes.find((t) => t.id === projectData.type);

    const handleTypeSelect = (typeId) => {
        const type = projectTypes.find((t) => t.id === typeId);
        setProjectData({
            ...projectData,
            type: typeId,
            language: type.languages[0],
            framework: type.frameworks[0],
        });
        setCurrentStep(2);
    };

    const handleNext = () => {
        setCurrentStep(currentStep + 1);
    };

    const handleBack = () => {
        setCurrentStep(currentStep - 1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const response = await projectsAPI.create({
                name: projectData.name,
                description: projectData.description,
                language: projectData.language,
                path: projectData.path,
            });

            const projectId = response.data.project._id;

            // Navigate to installation instructions
            navigate(`/project/${projectId}/setup`);
        } catch (error) {
            console.error('Error creating project:', error);
            alert('Failed to create project');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className="wizard-container">
                {/* Progress Bar */}
                <div className="wizard-progress">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${(currentStep / 3) * 100}%` }}
                        />
                    </div>
                    <div className="progress-steps">
                        <div className={`progress-step ${currentStep >= 1 ? 'active' : ''}`}>
                            <div className="step-circle">1</div>
                            <span>Select Type</span>
                        </div>
                        <div className={`progress-step ${currentStep >= 2 ? 'active' : ''}`}>
                            <div className="step-circle">2</div>
                            <span>Configure</span>
                        </div>
                        <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
                            <div className="step-circle">3</div>
                            <span>Confirm</span>
                        </div>
                    </div>
                </div>

                {/* Step 1: Project Type Selection */}
                {currentStep === 1 && (
                    <div className="wizard-step fade-in">
                        <h1>Select Your Project Type</h1>
                        <p className="wizard-subtitle">Choose the technology stack for your project</p>

                        <div className="project-types-grid">
                            {projectTypes.map((type) => (
                                <div
                                    key={type.id}
                                    className={`type-card ${projectData.type === type.id ? 'selected' : ''}`}
                                    onClick={() => handleTypeSelect(type.id)}
                                >
                                    <div className="type-icon">{type.icon}</div>
                                    <h3>{type.name}</h3>
                                    <p>{type.description}</p>
                                    {projectData.type === type.id && (
                                        <div className="selected-badge">
                                            <CheckCircle size={20} />
                                            Selected
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Configuration */}
                {currentStep === 2 && selectedType && (
                    <div className="wizard-step fade-in">
                        <h1>Configure Your Project</h1>
                        <p className="wizard-subtitle">Tell us more about your {selectedType.name} project</p>

                        <div className="config-form">
                            <div className="input-group">
                                <label>
                                    <Code size={18} />
                                    Project Name
                                </label>
                                <input
                                    type="text"
                                    value={projectData.name}
                                    onChange={(e) =>
                                        setProjectData({ ...projectData, name: e.target.value })
                                    }
                                    placeholder="my-awesome-app"
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label>
                                    <Layers size={18} />
                                    Description
                                </label>
                                <textarea
                                    value={projectData.description}
                                    onChange={(e) =>
                                        setProjectData({ ...projectData, description: e.target.value })
                                    }
                                    placeholder="Brief description of your project..."
                                    rows={3}
                                />
                            </div>

                            <div className="input-group">
                                <label>
                                    <Database size={18} />
                                    Primary Language
                                </label>
                                <select
                                    value={projectData.language}
                                    onChange={(e) =>
                                        setProjectData({ ...projectData, language: e.target.value })
                                    }
                                >
                                    {selectedType.languages.map((lang) => (
                                        <option key={lang} value={lang}>
                                            {lang.charAt(0).toUpperCase() + lang.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="input-group">
                                <label>Framework</label>
                                <select
                                    value={projectData.framework}
                                    onChange={(e) =>
                                        setProjectData({ ...projectData, framework: e.target.value })
                                    }
                                >
                                    {selectedType.frameworks.map((fw) => (
                                        <option key={fw} value={fw}>
                                            {fw}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="input-group">
                                <label>Project Path (Optional)</label>
                                <input
                                    type="text"
                                    value={projectData.path}
                                    onChange={(e) =>
                                        setProjectData({ ...projectData, path: e.target.value })
                                    }
                                    placeholder="/path/to/your/project"
                                />
                            </div>
                        </div>

                        <div className="wizard-actions">
                            <button onClick={handleBack} className="btn btn-secondary">
                                <ArrowLeft size={18} />
                                Back
                            </button>
                            <button onClick={handleNext} className="btn btn-primary">
                                Continue
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Confirmation */}
                {currentStep === 3 && selectedType && (
                    <div className="wizard-step fade-in">
                        <h1>Review & Confirm</h1>
                        <p className="wizard-subtitle">Make sure everything looks correct</p>

                        <div className="confirmation-card">
                            <div className="confirm-header">
                                <div className="project-badge">{selectedType.icon}</div>
                                <div>
                                    <h2>{projectData.name}</h2>
                                    <p>{projectData.description || 'No description'}</p>
                                </div>
                            </div>

                            <div className="confirm-details">
                                <div className="detail-row">
                                    <span className="label">Project Type:</span>
                                    <span className="value">{selectedType.name}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Language:</span>
                                    <span className="value">{projectData.language}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Framework:</span>
                                    <span className="value">{projectData.framework}</span>
                                </div>
                                {projectData.path && (
                                    <div className="detail-row">
                                        <span className="label">Path:</span>
                                        <span className="value">{projectData.path}</span>
                                    </div>
                                )}
                            </div>

                            <div className="next-steps-card">
                                <h3>📦 What happens next?</h3>
                                <ul>
                                    <li>✓ Project will be created in your dashboard</li>
                                    <li>✓ You'll get installation instructions for the monitoring agent</li>
                                    <li>✓ Auto-configuration files will be generated</li>
                                    <li>✓ Start analyzing code in real-time!</li>
                                </ul>
                            </div>
                        </div>

                        <div className="wizard-actions">
                            <button onClick={handleBack} className="btn btn-secondary">
                                <ArrowLeft size={18} />
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader size={18} className="spinning" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        Create Project
                                        <CheckCircle size={18} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default ProjectWizard;
