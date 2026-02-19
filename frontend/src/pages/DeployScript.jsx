import React, { useState, useEffect } from 'react';
import { FolderOpen, Play, Square, Terminal, CheckCircle, AlertTriangle, Info, RefreshCw, Download, FileCode, Activity, Zap } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useMonitor } from '../context/MonitorContext';
import './DeployScript.css';

const DeployScript = () => {
    const { monitorOutput, addToOutput, clearOutput, stats, updateStats } = useMonitor();
    
    const [selectedFolder, setSelectedFolder] = useState('');
    const [projectName, setProjectName] = useState('');
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [deployStatus, setDeployStatus] = useState('idle'); // idle, deploying, deployed, error
    const [mlBackendStatus, setMlBackendStatus] = useState('unknown');
    const [currentSession, setCurrentSession] = useState(null);
    const [currentDeployment, setCurrentDeployment] = useState(null);

    // Check ML backend status
    useEffect(() => {
        checkMlBackendStatus();
        const interval = setInterval(checkMlBackendStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const checkMlBackendStatus = async () => {
        try {
            const response = await fetch('/api/deploy/check-ml-backend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                setMlBackendStatus(data.status);
            } else {
                setMlBackendStatus('stopped');
            }
        } catch (error) {
            setMlBackendStatus('stopped');
            console.error('Error checking ML backend:', error);
        }
    };

    const handleFolderSelect = async () => {
        try {
            // Use the newer File System Access API if available
            if ('showDirectoryPicker' in window) {
                try {
                    const dirHandle = await window.showDirectoryPicker();
                    const fullPath = await getDirectoryPath(dirHandle);
                    setSelectedFolder(fullPath);
                    
                    const autoProjectName = dirHandle.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                    setProjectName(autoProjectName);

                    addToOutput(`📁 Selected folder: ${fullPath}`, 'info');
                    addToOutput(`📋 Project name: ${autoProjectName}`, 'info');
                    
                    // Analyze the directory
                    await analyzeSelectedDirectory(fullPath, dirHandle);
                    return;
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        console.error('Directory picker error:', err);
                    }
                }
            }
            
            // Fallback to input file method
            const input = document.createElement('input');
            input.type = 'file';
            input.webkitdirectory = true;
            input.multiple = true;
            
            input.onchange = async (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    // Try to get the full directory path
                    let fullPath = null;
                    
                    if (files[0].path) {
                        // Electron or similar environment
                        fullPath = files[0].path.substring(0, files[0].path.lastIndexOf('/'));
                    } else if (files[0].webkitRelativePath) {
                        // Web browser - try to construct path
                        const relativePath = files[0].webkitRelativePath;
                        const folderName = relativePath.split('/')[0];
                        // This will be relative, but we'll let the backend resolve it
                        fullPath = folderName;
                    }
                    
                    setSelectedFolder(fullPath);
                    
                    const folderName = fullPath ? fullPath.split('/').pop() : 'selected_project';
                    const autoProjectName = folderName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                    setProjectName(autoProjectName);

                    addToOutput(`📁 Selected folder: ${fullPath}`, 'info');
                    addToOutput(`📋 Project name: ${autoProjectName}`, 'info');
                    
                    await analyzeFolder(fullPath, files);
                }
            };
            
            input.click();
        } catch (error) {
            console.error('Error selecting folder:', error);
            addToOutput(`❌ Error selecting folder: ${error.message}`, 'error');
        }
    };
    
    const getDirectoryPath = async (dirHandle) => {
        // Try to get full path if possible
        if (dirHandle.resolve) {
            try {
                const path = await dirHandle.resolve();
                return path.join('/');
            } catch (err) {
                console.log('Could not resolve full path, using name:', err);
            }
        }
        return dirHandle.name;
    };
    
    const analyzeSelectedDirectory = async (fullPath, dirHandle) => {
        try {
            addToOutput('🔍 Analyzing project structure...', 'info');
            
            let fileCount = 0;
            let codeFileCount = 0;
            
            // Count files in the directory
            for await (const [name, handle] of dirHandle.entries()) {
                if (handle.kind === 'file') {
                    fileCount++;
                    const ext = name.split('.').pop().toLowerCase();
                    if (['py', 'js', 'jsx', 'ts', 'tsx', 'java', 'cpp', 'c', 'h', 'cs', 'php', 'rb', 'go', 'rs'].includes(ext)) {
                        codeFileCount++;
                    }
                }
            }
            
            addToOutput(`✅ Analysis complete!`, 'success');
            addToOutput(`📊 Total files: ${fileCount}`, 'info');
            addToOutput(`📝 Code files: ${codeFileCount}`, 'info');
            
            if (codeFileCount === 0) {
                addToOutput(`⚠️ Warning: No code files detected in the selected folder`, 'warning');
            }
            
        } catch (error) {
            addToOutput(`❌ Error analyzing directory: ${error.message}`, 'error');
        }
    };

    const analyzeFolder = async (folderPath, files) => {
        try {
            addToOutput('🔍 Analyzing project structure...', 'info');
            
            const codeFiles = files.filter(file => {
                const ext = file.name.split('.').pop().toLowerCase();
                return ['py', 'js', 'jsx', 'ts', 'tsx', 'java', 'cpp', 'c', 'h', 'cs', 'php', 'rb', 'go', 'rs'].includes(ext);
            });

            const languages = {};
            codeFiles.forEach(file => {
                const ext = file.name.split('.').pop().toLowerCase();
                languages[ext] = (languages[ext] || 0) + 1;
            });

            addToOutput(`✅ Analysis complete:`, 'success');
            addToOutput(`   📄 Total files: ${files.length}`, 'info');
            addToOutput(`   📝 Code files: ${codeFiles.length}`, 'info');
            
            if (Object.keys(languages).length > 0) {
                const langSummary = Object.entries(languages)
                    .map(([lang, count]) => `${lang}(${count})`)
                    .join(', ');
                addToOutput(`   🔧 Languages: ${langSummary}`, 'info');
            }

            if (codeFiles.length === 0) {
                addToOutput(`⚠️ Warning: No code files detected in the selected folder`, 'warning');
            }

            try {
                const response = await fetch('/api/deploy/analyze-folder', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ folderPath })
                });

                if (response.ok) {
                    const data = await response.json();
                    addToOutput(`📊 Backend analysis: ${data.analysis.projectType} project detected`, 'info');
                }
            } catch (error) {
                console.error('Backend analysis failed:', error);
            }

        } catch (error) {
            addToOutput(`❌ Error analyzing folder: ${error.message}`, 'error');
        }
    };

    const deployScript = async () => {
        if (!selectedFolder) {
            addToOutput('❌ Please select a folder first', 'error');
            return;
        }

        if (!projectName.trim()) {
            addToOutput('❌ Please enter a project name', 'error');
            return;
        }

        setDeployStatus('deploying');
        addToOutput('🚀 Deploying portable monitor...', 'info');

        try {
            const response = await fetch('/api/deploy/script', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    folderPath: selectedFolder,
                    projectName: projectName.trim()
                })
            });

            if (response.ok) {
                const data = await response.json();
                setCurrentDeployment(data.deployment);
                setDeployStatus('deployed');
                addToOutput('✅ Portable monitor deployed successfully!', 'success');
                addToOutput(`📍 Deployment ID: ${data.deployment.id}`, 'info');
                addToOutput('💡 Ready to start monitoring', 'info');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Deployment failed');
            }
            
        } catch (error) {
            setDeployStatus('error');
            addToOutput(`❌ Deployment failed: ${error.message}`, 'error');
        }
    };

    const startMonitoring = async () => {
        if (!selectedFolder) {
            addToOutput('❌ Please select a folder first', 'error');
            return;
        }

        try {
            setIsMonitoring(true);
            addToOutput('🚀 Starting monitoring session...', 'info');
            addToOutput('⏳ Initializing file watcher...', 'info');
            
            // Create a session for tracking
            const mockSession = {
                id: `session_${Date.now()}`,
                folderPath: selectedFolder,
                startTime: new Date().toISOString()
            };
            setCurrentSession(mockSession);
            
            addToOutput(`✅ Monitoring session created: ${mockSession.id}`, 'success');
            addToOutput(`📁 Target: ${selectedFolder}`, 'info');
            addToOutput('🎯 Starting real-time analysis...', 'info');
            addToOutput('', 'separator');
            
            // Start live monitoring immediately
            startLiveMonitoring();
            
        } catch (error) {
            setIsMonitoring(false);
            addToOutput(`❌ Failed to start monitoring: ${error.message}`, 'error');
        }
    };

    const startLiveMonitoring = () => {
        // Start real file monitoring by launching the monitoring agent
        if (selectedFolder !== 'DEMO') {
            startRealFileWatcher();
            return;
        }
        
        // Demo mode with realistic simulation
        const mockFiles = [
            'src/components/Header.jsx',
            'utils/database.py',
            'services/apiService.js',
            'models/UserModel.java',
            'core/dataProcessor.cpp',
            'tests/userTest.py',
            'config/appConfig.js',
            'middleware/authMiddleware.js',
            'controllers/userController.py',
            'views/dashboard.jsx',
            'styles/main.css',
            'utils/validation.js'
        ];

        const riskLevels = [
            { level: 'low', weight: 60, emoji: '🟢', color: 'success' },
            { level: 'medium', weight: 30, emoji: '🟡', color: 'warning' },
            { level: 'high', weight: 10, emoji: '🔴', color: 'error' }
        ];

        const recommendations = [
            'Consider breaking down large functions',
            'Add input validation for user inputs',
            'Improve error handling mechanisms',
            'Add comprehensive unit tests',
            'Reduce cyclomatic complexity',
            'Add detailed documentation',
            'Remove unused variables and imports',
            'Optimize algorithm performance',
            'Implement proper exception handling',
            'Add type annotations'
        ];

        const getRandomRisk = () => {
            const random = Math.random() * 100;
            let cumulative = 0;
            for (const risk of riskLevels) {
                cumulative += risk.weight;
                if (random <= cumulative) return risk;
            }
            return riskLevels[0]; // fallback to low
        };

        let fileIndex = 0;
        let analysisCount = 0;
        
        const performAnalysis = () => {
            if (!isMonitoring) {
                return;
            }

            const file = mockFiles[fileIndex % mockFiles.length];
            const risk = getRandomRisk();
            const confidence = Math.floor(Math.random() * 30) + 70; // 70-100%
            const size = (Math.random() * 8 + 0.3).toFixed(1);
            const loc = Math.floor(Math.random() * 200) + 20;
            const complexity = Math.floor(Math.random() * 10) + 1;
            
            const timestamp = new Date().toLocaleTimeString();
            
            // File detection
            addToOutput(`[${timestamp}] 📝 File changed: ${file}`, 'info');
            
            // Analysis start
            setTimeout(() => {
                if (!isMonitoring) return;
                addToOutput(`🔍 Analyzing: ${file}`, 'info');
                addToOutput(`   📊 Size: ${size}KB | Lines: ${loc} | Complexity: ${complexity}`, 'info');
                
                // Analysis result
                setTimeout(() => {
                    if (!isMonitoring) return;
                    addToOutput(`   ${risk.emoji} RISK: ${risk.level.toUpperCase()} (${confidence}% confidence)`, risk.color);
                    
                    if (risk.level === 'medium' || risk.level === 'high') {
                        const rec = recommendations[Math.floor(Math.random() * recommendations.length)];
                        addToOutput(`   💡 Recommendation: ${rec}`, 'info');
                    }
                    
                    if (risk.level === 'high') {
                        addToOutput(`   ⚠️ Critical: Immediate attention required`, 'error');
                    }
                    
                    addToOutput('', 'separator'); // Visual separator
                    
                    // Update stats
                    updateStats({
                        filesAnalyzed: stats.filesAnalyzed + 1,
                        highRiskCount: stats.highRiskCount + (risk.level === 'high' ? 1 : 0),
                        sessionDuration: Math.floor((Date.now() - new Date(currentSession?.startTime || Date.now()).getTime()) / 1000)
                    });
                    
                }, 1000);
            }, 500);

            fileIndex++;
            analysisCount++;

            // Show periodic summary
            if (analysisCount % 5 === 0 && isMonitoring) {
                setTimeout(() => {
                    if (!isMonitoring) return;
                    addToOutput(`📈 Session Summary: ${stats.filesAnalyzed} files analyzed, ${stats.highRiskCount} high-risk detected`, 'info');
                    addToOutput('', 'separator');
                }, 2000);
            }

            // Schedule next analysis
            if (isMonitoring) {
                const nextInterval = Math.random() * 4000 + 2000; // 2-6 seconds
                setTimeout(performAnalysis, nextInterval);
            }
        };

        // Start first analysis
        setTimeout(performAnalysis, 1500);
    };

    const startRealFileWatcher = async () => {
        try {
            addToOutput('🚀 Deploying monitoring script to selected folder...', 'info');
            addToOutput(`📁 Target: ${selectedFolder}`, 'info');
            addToOutput('📦 Copying monitoring files...', 'info');
            
            // Deploy and start the monitoring agent
            const response = await fetch('/api/deploy/start-realtime-monitor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    folderPath: selectedFolder,
                    projectName: projectName
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}: Failed to deploy monitoring agent`);
            }
            
            addToOutput(`✅ Monitoring script deployed successfully!`, 'success');
            addToOutput(`📂 Files deployed: ${data.deployedFiles.join(', ')}`, 'info');
            addToOutput(`🔍 Agent ID: ${data.agentId}`, 'info');
            addToOutput(`� Location: ${data.folderPath}`, 'info');
            addToOutput('🎯 Starting real-time file monitoring...', 'info');
            addToOutput('', 'separator');
            
            // Start polling for real-time updates
            startPollingForUpdates(data.agentId);
            
        } catch (error) {
            console.error('Deployment error:', error);
            addToOutput(`❌ Failed to deploy monitoring script: ${error.message}`, 'error');
            addToOutput('🔧 Troubleshooting tips:', 'warning');
            addToOutput('  • Check if you have write permissions to the selected folder', 'info');
            addToOutput('  • Ensure the folder path is accessible', 'info');
            addToOutput('  • Try selecting a different folder location', 'info');
            addToOutput('🔄 Falling back to simulation mode...', 'warning');
            
            // Enhanced fallback simulation
            setTimeout(() => {
                addToOutput('🎭 SIMULATION MODE ACTIVE', 'warning');
                addToOutput('   (Demo data - not monitoring real file changes)', 'info');
                addToOutput('', 'separator');
                
                const mockFiles = [
                    `${selectedFolder}/src/components/Header.jsx`,
                    `${selectedFolder}/utils/database.py`,
                    `${selectedFolder}/services/api.js`,
                    `${selectedFolder}/models/User.java`,
                    `${selectedFolder}/config/settings.json`
                ];
                
                let fileIndex = 0;
                const performSimulation = () => {
                    if (!isMonitoring) return;
                    
                    const file = mockFiles[fileIndex % mockFiles.length];
                    const timestamp = new Date().toLocaleTimeString();
                    const risks = ['low', 'medium', 'high'];
                    const risk = risks[Math.floor(Math.random() * risks.length)];
                    const confidence = Math.floor(Math.random() * 30 + 70);
                    
                    addToOutput(`[${timestamp}] 📝 [SIM] File changed: ${file}`, 'info');
                    
                    const riskColors = { low: 'success', medium: 'warning', high: 'error' };
                    const riskEmojis = { low: '🟢', medium: '🟡', high: '🔴' };
                    
                    addToOutput(`   ${riskEmojis[risk]} RISK: ${risk.toUpperCase()} (${confidence}% confidence)`, riskColors[risk]);
                    
                    if (risk !== 'low' && Math.random() > 0.4) {
                        const recommendations = [
                            'Add input validation for user data',
                            'Implement proper error handling', 
                            'Add comprehensive unit tests',
                            'Reduce function complexity',
                            'Add security headers',
                            'Validate all external inputs'
                        ];
                        const rec = recommendations[Math.floor(Math.random() * recommendations.length)];
                        addToOutput(`   💡 Recommendation: ${rec}`, 'info');
                    }
                    
                    addToOutput('', 'separator');
                    
                    updateStats({
                        filesAnalyzed: stats.filesAnalyzed + 1,
                        highRiskCount: stats.highRiskCount + (risk === 'high' ? 1 : 0)
                    });
                    
                    fileIndex++;
                    if (isMonitoring) {
                        const nextDelay = 3000 + Math.random() * 3000; // 3-6 seconds
                        setTimeout(performSimulation, nextDelay);
                    }
                };
                
                performSimulation();
            }, 2000);
        }
    };
    
    const startPollingForUpdates = (agentId) => {
        // Store agentId for reference
        window.currentAgentId = agentId;
        console.log(`✅ Starting polling for agentId: ${agentId}`);
        
        let missedPollCount = 0;
        
        const pollInterval = setInterval(async () => {
            // Check if polling should continue using window reference (avoids stale closure)
            if (!window.monitoringInterval) {
                clearInterval(pollInterval);
                console.log('🛑 Polling stopped - monitoring ended');
                return;
            }
            
            try {
                const response = await fetch(`/api/deploy/monitor-updates/${agentId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.ok) {
                    const updates = await response.json();
                    missedPollCount = 0; // Reset on successful poll
                    
                    if (updates && updates.length > 0) {
                        console.log(`📥 Received ${updates.length} updates from backend`);
                    }
                    
                    updates.forEach((update, idx) => {
                        console.log(`   Update ${idx + 1}: type=${update.type}, message=${update.message?.substring(0, 50) || 'N/A'}`);
                        
                        if (update.type === 'console_output') {
                            // Handle console output from portable monitor - display all meaningful messages
                            const message = update.message;
                            
                            // Skip empty or whitespace-only messages
                            if (!message || !message.trim()) return;
                            
                            // Determine message type and color based on content
                            let color = 'info';
                            
                            // Risk level messages
                            if (message.includes('RISK:') || message.includes('🔴') || message.includes('HIGH')) {
                                color = message.includes('HIGH') || message.includes('🔴') ? 'error' : 
                                        message.includes('MEDIUM') || message.includes('🟡') ? 'warning' : 'success';
                            } 
                            // File change messages
                            else if (message.includes('FILE CHANGED') || message.includes('File changed') || 
                                     message.includes('📝') || message.includes('file changed:')) {
                                color = 'info';
                            }
                            // Analysis/processing messages  
                            else if (message.includes('Analyzing') || message.includes('🔍')) {
                                color = 'info';
                            }
                            // Waiting/status messages
                            else if (message.includes('Waiting') || message.includes('📊')) {
                                color = 'info';
                            }
                            // Error messages
                            else if (message.includes('Error') || message.includes('❌')) {
                                color = 'error';
                            }
                            // Mismatch messages
                            else if (message.includes('MISMATCH') || message.includes('⚠️')) {
                                color = 'warning';
                            }
                            // Skip separator lines
                            else if (message.startsWith('==')) {
                                return;
                            }
                            
                            console.log(`   ✨ Adding to output: ${message.substring(0, 60)}...`);
                            // Add the message to output
                            addToOutput(message, color);
                            
                            // If metrics are available in the update, parse and display them
                            if (update.metrics && Object.keys(update.metrics).length > 0) {
                                const m = update.metrics;
                                
                                // Display metrics in a formatted way
                                if (m.loc !== undefined) {
                                    addToOutput(`   📊 LOC: ${m.loc}`, 'info');
                                }
                                if (m.complexity !== undefined) {
                                    addToOutput(`       COMPLEXITY: ${m.complexity}`, 'info');
                                }
                                if (m.dependencies !== undefined) {
                                    addToOutput(`       DEPENDENCIES: ${m.dependencies}`, 'info');
                                }
                                if (m.functions !== undefined) {
                                    addToOutput(`       FUNCTIONS: ${m.functions}`, 'info');
                                }
                                if (m.classes !== undefined) {
                                    addToOutput(`       CLASSES: ${m.classes}`, 'info');
                                }
                                if (m.comments !== undefined) {
                                    addToOutput(`       COMMENTS: ${m.comments}`, 'info');
                                }
                                if (m.complexity_per_loc !== undefined) {
                                    addToOutput(`       COMPLEXITY/LOC: ${m.complexity_per_loc}`, 'info');
                                }
                                if (m.comment_ratio !== undefined) {
                                    addToOutput(`       COMMENT_RATIO: ${m.comment_ratio}`, 'info');
                                }
                                if (m.functions_per_class !== undefined) {
                                    addToOutput(`       FUNCTIONS/CLASS: ${m.functions_per_class}`, 'info');
                                }
                            }
                            
                            // Update stats if it's a risk analysis result
                            if (message.includes('RISK:')) {
                                updateStats({
                                    filesAnalyzed: stats.filesAnalyzed + 1,
                                    highRiskCount: stats.highRiskCount + (message.includes('HIGH') ? 1 : 0)
                                });
                            }
                        } else if (update.type === 'file_change' || update.type === 'analysis_result') {
                            // Handle structured JSON updates
                            const timestamp = new Date(update.timestamp).toLocaleTimeString();
                            addToOutput(`[${timestamp}] 📝 ${update.action}: ${update.file}`, 'info');
                            
                            if (update.analysis) {
                                const risk = update.analysis.risk_level;
                                const confidence = Math.round(update.analysis.confidence * 100);
                                const emoji = risk === 'high' ? '🔴' : risk === 'medium' ? '🟡' : '🟢';
                                const color = risk === 'high' ? 'error' : risk === 'medium' ? 'warning' : 'success';
                                
                                addToOutput(`   ${emoji} RISK: ${risk.toUpperCase()} (${confidence}% confidence)`, color);
                                
                                if (update.analysis.recommendations) {
                                    update.analysis.recommendations.forEach(rec => {
                                        addToOutput(`   💡 ${rec}`, 'info');
                                    });
                                }
                                
                                // Update stats
                                updateStats({
                                    filesAnalyzed: stats.filesAnalyzed + 1,
                                    highRiskCount: stats.highRiskCount + (risk === 'high' ? 1 : 0)
                                });
                            }
                        } else if (update.type === 'error') {
                            addToOutput(`❌ ${update.message}`, 'error');
                        } else if (update.type === 'monitor_stopped') {
                            addToOutput(`⏹️ Monitor stopped: ${update.message}`, 'warning');
                        }
                    });
                } else {
                    missedPollCount++;
                    console.warn(`⚠️ Poll failed - Status ${response.status} (attempt ${missedPollCount})`);
                    
                    if (missedPollCount > 10) {
                        console.error('❌ Too many failed polls - stopping monitoring');
                        clearInterval(pollInterval);
                        window.monitoringInterval = null;
                        addToOutput('❌ Lost connection to monitoring agent', 'error');
                    }
                }
            } catch (error) {
                missedPollCount++;
                console.error(`❌ Polling error (attempt ${missedPollCount}):`, error.message);
                
                if (missedPollCount > 10) {
                    console.error('❌ Too many failed polls - stopping monitoring');
                    clearInterval(pollInterval);
                    window.monitoringInterval = null;
                    addToOutput(`❌ Polling failed: ${error.message}`, 'error');
                }
            }
        }, 1500); // Poll every 1.5 seconds for more responsive updates
        
        // Store interval reference for cleanup
        window.monitoringInterval = pollInterval;
        console.log('✅ Polling interval started');
    };

    const stopMonitoring = async () => {
        if (!currentSession) {
            addToOutput('❌ No active monitoring session', 'error');
            return;
        }

        setIsMonitoring(false);
        addToOutput('⏹️ Stopping monitoring session...', 'warning');

        try {
            // Clear polling interval
            if (window.monitoringInterval) {
                clearInterval(window.monitoringInterval);
                window.monitoringInterval = null;
            }
            
            if (currentDeployment) {
                const response = await fetch('/api/deploy/stop-monitoring', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        sessionId: currentSession.id
                    })
                });

                if (response.ok) {
                    addToOutput('✅ Monitoring stopped successfully', 'success');
                } else {
                    addToOutput('⚠️ Warning: Could not properly stop backend monitoring', 'warning');
                }
            } else {
                addToOutput('✅ Direct monitoring stopped', 'success');
            }
            
            addToOutput(`📊 Final Session Stats:`, 'info');
            addToOutput(`   📝 Files analyzed: ${stats.filesAnalyzed}`, 'info');
            addToOutput(`   🔴 High-risk modules: ${stats.highRiskCount}`, stats.highRiskCount > 0 ? 'warning' : 'success');
            addToOutput(`   ⏱️ Duration: ${Math.floor(stats.sessionDuration / 60)}m ${stats.sessionDuration % 60}s`, 'info');
            addToOutput('', 'separator');
            
            setCurrentSession(null);

        } catch (error) {
            addToOutput(`❌ Error stopping monitoring: ${error.message}`, 'error');
        }
    };

    const getStatusIcon = () => {
        switch (deployStatus) {
            case 'deployed': return <CheckCircle className="status-icon success" />;
            case 'error': return <AlertTriangle className="status-icon danger" />;
            case 'deploying': return <RefreshCw className="status-icon warning rotating" />;
            default: return <Info className="status-icon" />;
        }
    };

    const getStatusText = () => {
        switch (deployStatus) {
            case 'deployed': return 'Script Deployed';
            case 'error': return 'Deployment Failed';
            case 'deploying': return 'Deploying...';
            default: return 'Not Deployed';
        }
    };

    return (
        <>
            <Navbar />
            <div className="dashboard-container">
                <div className="dashboard-header">
                    <div>
                        <h1>Deploy Script to Local</h1>
                        <p className="text-muted">Deploy the portable risk monitor to any local project folder</p>
                    </div>
                    <button 
                        onClick={checkMlBackendStatus}
                        className="btn btn-secondary"
                    >
                        <RefreshCw size={20} />
                        Refresh Status
                    </button>
                </div>

                {/* Overview Cards */}
                <div className="overview-cards">
                    <div className={`overview-card ${mlBackendStatus === 'running' ? 'success' : 'danger'}`}>
                        <Activity size={32} />
                        <div>
                            <h3>{mlBackendStatus === 'running' ? 'Online' : 'Offline'}</h3>
                            <p>ML Backend Status</p>
                        </div>
                    </div>

                    <div className="overview-card">
                        <FileCode size={32} />
                        <div>
                            <h3>{stats.filesAnalyzed}</h3>
                            <p>Files Analyzed</p>
                        </div>
                    </div>

                    <div className="overview-card warning">
                        <AlertTriangle size={32} />
                        <div>
                            <h3>{stats.highRiskCount}</h3>
                            <p>High Risk Files</p>
                        </div>
                    </div>

                    <div className="overview-card">
                        <Zap size={32} />
                        <div>
                            <h3>{isMonitoring ? 'Active' : 'Stopped'}</h3>
                            <p>Monitor Status</p>
                        </div>
                    </div>
                </div>

                <div className="deploy-content">
                    <div className="deploy-left">
                        {/* Project Selection Card */}
                        <div className="deploy-card">
                            <div className="card-header">
                                <FolderOpen size={20} />
                                <h3>Project Selection</h3>
                            </div>
                            <div className="card-content">
                                <button 
                                    className="btn btn-primary full-width"
                                    onClick={handleFolderSelect}
                                >
                                    <FolderOpen size={20} />
                                    Choose Project Folder
                                </button>
                                
                                <button 
                                    className="btn btn-secondary full-width"
                                    onClick={() => {
                                        setSelectedFolder('DEMO');
                                        setProjectName('demo_project');
                                        addToOutput('📁 Demo project loaded for testing', 'success');
                                        addToOutput('✅ Ready to start monitoring', 'info');
                                    }}
                                >
                                    <Play size={20} />
                                    Use Demo Project
                                </button>
                                
                                {selectedFolder && (
                                    <div className="selected-folder">
                                        <p><strong>Selected:</strong> {selectedFolder}</p>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label htmlFor="projectName">Project Name</label>
                                    <input
                                        type="text"
                                        id="projectName"
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                        placeholder="Enter project name"
                                        className="form-input"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Deployment Controls Card */}
                        <div className="deploy-card">
                            <div className="card-header">
                                <Download size={20} />
                                <h3>Monitoring Controls</h3>
                            </div>
                            <div className="card-content">
                                <div className="info-notice">
                                    <p className="text-muted">
                                        💡 <strong>Quick Start:</strong> Select a project folder and click "Start Monitor" - no deployment required!
                                    </p>
                                </div>
                                
                                <div className="control-buttons">
                                    <button 
                                        className="btn btn-secondary"
                                        onClick={deployScript}
                                        disabled={!selectedFolder || deployStatus === 'deploying'}
                                    >
                                        {deployStatus === 'deploying' ? (
                                            <>
                                                <RefreshCw size={16} className="rotating" />
                                                Deploying...
                                            </>
                                        ) : (
                                            <>
                                                <Download size={16} />
                                                Deploy Script (Optional)
                                            </>
                                        )}
                                    </button>

                                    <button 
                                        className={`btn ${isMonitoring ? 'btn-danger' : 'btn-primary'}`}
                                        onClick={isMonitoring ? stopMonitoring : startMonitoring}
                                        disabled={!selectedFolder}
                                    >
                                        {isMonitoring ? (
                                            <>
                                                <Square size={16} />
                                                Stop Monitor
                                            </>
                                        ) : (
                                            <>
                                                <Play size={16} />
                                                Start Monitor
                                            </>
                                        )}
                                    </button>
                                </div>
                                
                                <div className="status-display">
                                    {getStatusIcon()}
                                    <span>{getStatusText()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="deploy-right">
                        {/* Monitor Output Card */}
                        <div className="deploy-card monitor-card">
                            <div className="card-header">
                                <Terminal size={20} />
                                <h3>Monitor Output</h3>
                                <button 
                                    className="btn btn-secondary btn-sm"
                                    onClick={clearOutput}
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="card-content">
                                <div className="monitor-output">
                                    {monitorOutput.length === 0 ? (
                                        <div className="output-placeholder">
                                            <Terminal size={48} />
                                            <p>Monitor output will appear here...</p>
                                            <p className="text-muted">Select a folder and deploy the script to begin</p>
                                        </div>
                                    ) : (
                                        monitorOutput.map((entry, index) => (
                                            <div key={index} className={`output-line ${entry.type}`}>
                                                <span className="output-timestamp">[{entry.timestamp}]</span>
                                                <span className="output-message">{entry.message}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DeployScript;