import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button 
            className="theme-toggle" 
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            <div className="toggle-track">
                <div className={`toggle-thumb ${theme}`}>
                    {theme === 'dark' ? (
                        <Moon size={14} />
                    ) : (
                        <Sun size={14} />
                    )}
                </div>
                <Sun size={12} className="toggle-icon sun" />
                <Moon size={12} className="toggle-icon moon" />
            </div>
        </button>
    );
};

export default ThemeToggle;
