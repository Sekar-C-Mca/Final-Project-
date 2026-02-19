import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, BarChart3, Brain, Code, Download } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            logout();
        }
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/dashboard" className="navbar-logo">
                    <BarChart3 size={28} />
                    <span>Risk Evaluator</span>
                </Link>

                <div className="navbar-menu">
                    <Link to="/deploy-script" className="navbar-link">
                        <Download size={18} />
                        Deploy Script
                    </Link>
                    <Link to="/dashboard" className="navbar-link">
                        <BarChart3 size={18} />
                        Dashboard
                    </Link>
                    <Link to="/ml-training" className="navbar-link">
                        <Brain size={18} />
                        ML Training
                    </Link>
                    <Link to="/feature-extraction" className="navbar-link">
                        <Code size={18} />
                        Feature Extraction
                    </Link>
                </div>

                <div className="navbar-right">
                    <ThemeToggle />
                    <div className="navbar-user">
                        <User size={18} />
                        <span>{user?.name || 'User'}</span>
                    </div>
                    <button onClick={handleLogout} className="btn btn-secondary navbar-logout">
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
