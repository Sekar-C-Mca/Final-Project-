import { createContext, useContext, useState, useCallback } from 'react';

const MonitorContext = createContext();

export const useMonitor = () => {
    const context = useContext(MonitorContext);
    if (!context) {
        throw new Error('useMonitor must be used within a MonitorProvider');
    }
    return context;
};

export const MonitorProvider = ({ children }) => {
    const [monitorOutput, setMonitorOutput] = useState([]);
    const [stats, setStats] = useState({
        filesAnalyzed: 0,
        highRiskCount: 0,
        sessionDuration: 0
    });

    const addToOutput = useCallback((message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        const newEntry = { message, type, timestamp };
        
        setMonitorOutput(prev => {
            const updated = [...prev, newEntry];
            // Keep only last 100 entries to prevent memory issues
            return updated.slice(-100);
        });
        
        // Auto-scroll to bottom after state update
        setTimeout(() => {
            const outputContainer = document.querySelector('.output-container');
            if (outputContainer) {
                outputContainer.scrollTop = outputContainer.scrollHeight;
            }
        }, 50);
    }, []);

    const clearOutput = useCallback(() => {
        setMonitorOutput([]);
        setStats({ filesAnalyzed: 0, highRiskCount: 0, sessionDuration: 0 });
    }, []);

    const updateStats = useCallback((newStats) => {
        setStats(prev => ({ ...prev, ...newStats }));
    }, []);

    const value = {
        monitorOutput,
        setMonitorOutput,
        addToOutput,
        clearOutput,
        stats,
        setStats,
        updateStats
    };

    return (
        <MonitorContext.Provider value={value}>
            {children}
        </MonitorContext.Provider>
    );
};

export default MonitorContext;
