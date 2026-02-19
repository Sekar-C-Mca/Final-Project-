import React from 'react';
import { BarChart3 } from 'lucide-react';
import './Logo.css';

const Logo = ({ className = "" }) => {
    return (
        <div className={`logo ${className}`}>
            <BarChart3 size={28} />
            <span className="logo-text">Risk Evaluator</span>
        </div>
    );
};

export default Logo;