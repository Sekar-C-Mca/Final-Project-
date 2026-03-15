const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const fs = require('fs').promises;
const path = require('path');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Storage for active monitoring sessions
const activeMonitors = new Map();
const monitorUpdates = new Map(); // Current pending updates for each agent
const sentUpdateIndices = new Map(); // Track which updates have been sent to avoid loss

// All routes are protected
router.use(protect);

// @route   POST /api/deploy/start-realtime-monitor
// @desc    Deploy monitoring script to folder and start real-time monitoring
// @access  Private
router.post('/start-realtime-monitor', [
    body('folderPath').notEmpty().withMessage('Folder path is required'),
    body('projectName').notEmpty().withMessage('Project name is required'),
], validate, async (req, res) => {
    try {
        const { folderPath, projectName } = req.body;
        const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`Deploying monitoring to: ${folderPath} (Agent: ${agentId})`);
        
        // Smart path resolution - handle both absolute and relative paths  
        let absoluteFolderPath;
        if (path.isAbsolute(folderPath)) {
            absoluteFolderPath = folderPath;
        } else {
            // For relative paths, try common locations including media drives
            const projectRoot = path.join(__dirname, '../../');
            const possiblePaths = [
                path.join(projectRoot, folderPath), // Relative to project root
                path.join(process.cwd(), folderPath), // Relative to current directory
                path.join('/home', process.env.USER || 'user', folderPath), // User home directory
                path.join('/home', process.env.USER || 'user', 'Desktop', folderPath), // Desktop
                path.join('/home', process.env.USER || 'user', 'Documents', folderPath), // Documents
                folderPath // Try as-is in case it's already resolved
            ];
            
            // Special handling for media directories - search dynamically
            try {
                const mediaUserDir = `/media/${process.env.USER || 'sekar'}`;
                const mediaContents = await fs.readdir(mediaUserDir);
                for (const drive of mediaContents) {
                    possiblePaths.push(path.join(mediaUserDir, drive, folderPath));
                }
            } catch (e) {
                // Media directory not accessible, continue with other paths
            }
            
            console.log('Searching for folder in possible locations:', possiblePaths);
            
            // Find the first path that exists
            for (const testPath of possiblePaths) {
                try {
                    const stats = await fs.stat(testPath);
                    if (stats.isDirectory()) {
                        absoluteFolderPath = testPath;
                        console.log(`Found folder at: ${testPath}`);
                        break;
                    }
                } catch (e) {
                    // Path doesn't exist, try next one
                }
            }
            
            // If no path found, create a working directory for testing
            if (!absoluteFolderPath) {
                const tempPath = path.join('/tmp', 'riskguard_test', folderPath);
                try {
                    await fs.mkdir(tempPath, { recursive: true });
                    absoluteFolderPath = tempPath;
                    console.log(`Created test directory for deployment: ${tempPath}`);
                    
                    // Create a test file to simulate a project
                    const testFile = path.join(tempPath, 'test.py');
                    await fs.writeFile(testFile, '# Test file for monitoring\nprint("Hello World")');
                } catch (createError) {
                    console.error('Failed to create test directory:', createError);
                    return res.status(500).json({
                        success: false,
                        message: `Could not find or create deployment location for "${folderPath}"`,
                        error: 'DEPLOYMENT_LOCATION_ERROR',
                        details: createError.message
                    });
                }
            }
        }
        
        console.log(`Resolved path: ${absoluteFolderPath}`);
        
        // Check if folder exists and is writable
        try {
            const stats = await fs.stat(absoluteFolderPath);
            if (!stats.isDirectory()) {
                return res.status(400).json({
                    success: false,
                    message: `Path is not a directory: ${absoluteFolderPath}`
                });
            }
            
            // Test write permissions
            const testFile = path.join(absoluteFolderPath, '.riskguard_test');
            await fs.writeFile(testFile, 'test');
            await fs.unlink(testFile);
            
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: `Folder not accessible or no write permissions: ${absoluteFolderPath}`
            });
        }
        
        // Deploy monitoring files to the target folder
        const sourceDir = path.join(__dirname, '../../monitoring-agent');
        const targetMonitorScript = path.join(absoluteFolderPath, 'portable_monitor.py');
        const targetConfigFile = path.join(absoluteFolderPath, 'monitor_config.json');
        const targetRequirementsFile = path.join(absoluteFolderPath, 'requirements.txt');
        
        console.log(`Deploying files to: ${absoluteFolderPath}`);
        
        try {
            // Copy the standalone portable monitor
            const sourcePortableScript = path.join(sourceDir, 'portable_monitor.py');
            await fs.copyFile(sourcePortableScript, targetMonitorScript);
            
            // Create simple config for the portable monitor
            const deploymentConfig = {
                "project_id": projectName,
                "debounce_seconds": 2,
                "watch_patterns": ["*.py", "*.js", "*.jsx", "*.ts", "*.tsx", "*.java", "*.cpp", "*.c", "*.h", "*.cs", "*.php"],
                "ignore_patterns": ["node_modules", ".git", "__pycache__", "*.pyc", ".env", "dist", "build", "portable_monitor.py", "monitor_config.json", "requirements.txt"]
            };
            
            await fs.writeFile(targetConfigFile, JSON.stringify(deploymentConfig, null, 2));
            
            // Create simple requirements file
            const simpleRequirements = `watchdog>=6.0.0\nrequests>=2.32.0\n`;
            await fs.writeFile(targetRequirementsFile, simpleRequirements);
            
            // Make script executable on Unix-like systems
            if (process.platform !== 'win32') {
                try {
                    await execAsync(`chmod +x "${targetMonitorScript}"`);
                } catch (chmodError) {
                    console.log('Could not make script executable:', chmodError.message);
                }
            }
            
            console.log('✅ Portable monitor files deployed successfully');
            
        } catch (deployError) {
            console.error('Failed to deploy files:', deployError);
            return res.status(500).json({
                success: false,
                message: `Failed to deploy monitoring files: ${deployError.message}`
            });
        }
        
        // Determine Python executable - prefer monitoring-agent's venv
        const monitoringAgentVenv = path.join(sourceDir, 'venv', 'bin', 'python3');
        const systemPython = 'python3';
        let pythonExecutable = systemPython;
        
        try {
            await fs.access(monitoringAgentVenv);
            pythonExecutable = monitoringAgentVenv;
            console.log('Using monitoring-agent virtual environment Python:', pythonExecutable);
        } catch (error) {
            // Try to use system Python with installed packages
            console.log('Monitoring-agent venv not found, trying system Python3');
            
            // Try to install watchdog globally if needed
            try {
                await execAsync('pip3 install --user watchdog requests', { timeout: 30000 });
                console.log('Installed watchdog package for system Python');
            } catch (installError) {
                console.log('Could not install packages:', installError.message);
            }
        }
        
        // Start the portable monitor from the deployed location
        console.log('Starting portable monitor from deployed location...');
        console.log(`Using Python executable: ${pythonExecutable}`);
        
        const monitorProcess = spawn(pythonExecutable, [
            path.join(absoluteFolderPath, 'portable_monitor.py'),
            '--watch-dir', absoluteFolderPath,
            '--config', path.join(absoluteFolderPath, 'monitor_config.json'),
            '--project-id', projectName
        ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: absoluteFolderPath,
            env: { 
                ...process.env,
                PYTHONPATH: absoluteFolderPath,
                PYTHONUNBUFFERED: '1'  // Ensure immediate output
            }
        });
        
        // Initialize updates array for this agent
        monitorUpdates.set(agentId, []);
        
        let processStarted = false;
        let bufferLines = []; // Buffer to accumulate related lines
        
        // Helper function to parse metrics from consecutive output lines
        const parseMetricsSection = (lines) => {
            const metrics = {};
            for (const line of lines) {
                // LOC: X
                if (line.includes('└─ LOC:')) {
                    const match = line.match(/LOC:\s*(\d+)/);
                    if (match) metrics.loc = parseInt(match[1]);
                }
                // COMPLEXITY: X.XX
                else if (line.includes('└─ COMPLEXITY:')) {
                    const match = line.match(/COMPLEXITY:\s*([\d.]+)/);
                    if (match) metrics.complexity = parseFloat(match[1]);
                }
                // DEPENDENCIES: X
                else if (line.includes('└─ DEPENDENCIES:')) {
                    const match = line.match(/DEPENDENCIES:\s*(\d+)/);
                    if (match) metrics.dependencies = parseInt(match[1]);
                }
                // FUNCTIONS: X
                else if (line.includes('└─ FUNCTIONS:')) {
                    const match = line.match(/FUNCTIONS:\s*(\d+)/);
                    if (match) metrics.functions = parseInt(match[1]);
                }
                // CLASSES: X
                else if (line.includes('└─ CLASSES:')) {
                    const match = line.match(/CLASSES:\s*(\d+)/);
                    if (match) metrics.classes = parseInt(match[1]);
                }
                // COMMENTS: X
                else if (line.includes('└─ COMMENTS:')) {
                    const match = line.match(/COMMENTS:\s*(\d+)/);
                    if (match) metrics.comments = parseInt(match[1]);
                }
                // COMPLEXITY PER LOC: X.XX
                else if (line.includes('└─ COMPLEXITY PER LOC:')) {
                    const match = line.match(/COMPLEXITY PER LOC:\s*([\d.]+)/);
                    if (match) metrics.complexity_per_loc = parseFloat(match[1]);
                }
                // COMMENT RATIO: X.XX
                else if (line.includes('└─ COMMENT RATIO:')) {
                    const match = line.match(/COMMENT RATIO:\s*([\d.]+)/);
                    if (match) metrics.comment_ratio = parseFloat(match[1]);
                }
                // FUNCTIONS PER CLASS: X.XX
                else if (line.includes('└─ FUNCTIONS PER CLASS:')) {
                    const match = line.match(/FUNCTIONS PER CLASS:\s*([\d.]+)/);
                    if (match) metrics.functions_per_class = parseFloat(match[1]);
                }
            }
            return Object.keys(metrics).length > 0 ? metrics : null;
        };
        
        // Handle monitor output - parse both JSON and console output
        monitorProcess.stdout.on('data', (data) => {
            if (!processStarted) {
                processStarted = true;
                console.log('✅ Portable monitor started successfully');
            }
            
            try {
                const lines = data.toString().split('\n').filter(line => line.trim());
                const updates = monitorUpdates.get(agentId) || [];
                
                lines.forEach((line, idx) => {
                    console.log(`Monitor Output: ${line}`); // Enhanced logging
                    
                    // Accumulate lines that contain metrics
                    if (line.includes('└─')) {
                        bufferLines.push(line);
                    }
                    
                    // When we hit end of metrics section, parse them
                    if (bufferLines.length > 0 && !line.includes('└─') && line.trim() !== '') {
                        const metrics = parseMetricsSection(bufferLines);
                        if (metrics) {
                            console.log(`📊 Parsed metrics:`, JSON.stringify(metrics));
                        }
                        bufferLines = [];
                    }
                    
                    // Try to parse as JSON first
                    try {
                        const update = JSON.parse(line);
                        if (update.type === 'file_change' || update.type === 'analysis_result') {
                            updates.push({
                                ...update,
                                timestamp: new Date().toISOString(),
                                agentId,
                                deployedLocation: absoluteFolderPath
                            });
                        }
                    } catch (parseError) {
                        // Not JSON, treat as console output - convert to structured format
                        const messageObj = {
                            type: 'console_output',
                            message: line,
                            timestamp: new Date().toISOString(),
                            agentId,
                            deployedLocation: absoluteFolderPath
                        };
                        
                        // If this line contains metrics, attach them
                        if (line.includes('EXTRACTED FEATURES') && bufferLines.length > 0) {
                            const metrics = parseMetricsSection(bufferLines);
                            if (metrics) {
                                messageObj.metrics = metrics;
                            }
                        }
                        
                        updates.push(messageObj);
                    }
                    
                    monitorUpdates.set(agentId, updates.slice(-50)); // Keep last 50 updates
                });
            } catch (error) {
                console.error('Error processing monitor output:', error);
            }
        });
        
        // Handle stderr output
        monitorProcess.stderr.on('data', (data) => {
            const errorMessage = data.toString().trim();
            console.error(`Monitor Error: ${errorMessage}`);
            
            // Also add errors to updates for frontend display
            const updates = monitorUpdates.get(agentId) || [];
            updates.push({
                type: 'error',
                message: errorMessage,
                timestamp: new Date().toISOString(),
                agentId
            });
            monitorUpdates.set(agentId, updates.slice(-50));
        });
        
        // Handle process exit
        monitorProcess.on('close', (code) => {
            console.log(`Monitor process exited with code ${code}`);
            activeMonitors.delete(agentId);
            
            const updates = monitorUpdates.get(agentId) || [];
            updates.push({
                type: 'monitor_stopped',
                message: `Process exited with code ${code}`,
                timestamp: new Date().toISOString(),
                agentId
            });
            monitorUpdates.set(agentId, updates.slice(-50));
        });
        
        monitorProcess.on('error', (error) => {
            console.error('Failed to start monitor process:', error);
            activeMonitors.delete(agentId);
            
            const updates = monitorUpdates.get(agentId) || [];
            updates.push({
                type: 'error',
                message: `Failed to start monitoring: ${error.message}`,
                timestamp: new Date().toISOString(),
                agentId
            });
            monitorUpdates.set(agentId, updates.slice(-50));
        });
        
        // Store the process reference with deployment info
        activeMonitors.set(agentId, {
            process: monitorProcess,
            folderPath: absoluteFolderPath,
            projectName,
            deployedFiles: [targetMonitorScript, targetConfigFile, targetRequirementsFile],
            startTime: new Date().toISOString()
        });
        
        // Give the process a moment to start
        setTimeout(() => {
            res.status(200).json({
                success: true,
                agentId,
                message: 'Monitoring script deployed and started',
                folderPath: absoluteFolderPath,
                projectName,
                deployedFiles: ['portable_monitor.py', 'monitor_config.json', 'requirements.txt']
            });
        }, 1000);
        
    } catch (error) {
        console.error('Error deploying monitoring:', error);
        res.status(500).json({
            success: false,
            message: `Failed to deploy monitoring: ${error.message}`
        });
    }
});

// @route   GET /api/deploy/monitor-updates/:agentId
// @desc    Get real-time monitor updates
// @access  Private
router.get('/monitor-updates/:agentId', (req, res) => {
    try {
        const { agentId } = req.params;
        const allUpdates = monitorUpdates.get(agentId) || [];
        const lastSentIndex = sentUpdateIndices.get(agentId) || -1;
        
        // Get only new updates since last poll (prevents data loss)
        const newUpdates = allUpdates.slice(lastSentIndex + 1);
        
        // Update tracking to mark these as sent
        // Keep updates in buffer but track what we've sent
        sentUpdateIndices.set(agentId, allUpdates.length - 1);
        
        // Log for debugging
        if (newUpdates.length > 0) {
            console.log(`📤 Sent ${newUpdates.length} updates to frontend for agent ${agentId}`);
            newUpdates.forEach((update, idx) => {
                console.log(`   [${lastSentIndex + idx + 1}] ${update.type}: ${update.message?.substring(0, 50) || 'N/A'}`);
            });
        }
        
        res.status(200).json(newUpdates);
    } catch (error) {
        console.error('Error getting monitor updates:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get monitor updates'
        });
    }
});
// @desc    Check if ML backend is running
// @access  Private
router.post('/check-ml-backend', async (req, res) => {
    try {
        const response = await fetch('http://localhost:8000/');
        res.status(200).json({
            success: true,
            status: 'running',
            message: 'ML Backend is running'
        });
    } catch (error) {
        res.status(200).json({
            success: true,
            status: 'stopped',
            message: 'ML Backend is not running'
        });
    }
});

// @route   POST /api/deploy/analyze-folder
// @desc    Analyze a project folder structure
// @access  Private
router.post('/analyze-folder', [
    body('folderPath').notEmpty().withMessage('Folder path is required'),
], validate, async (req, res) => {
    try {
        const { folderPath } = req.body;
        
        // In a real implementation, you would:
        // 1. Check if folder exists and is accessible
        // 2. Scan for code files
        // 3. Determine project structure and languages
        // 4. Return analysis results
        
        // Mock analysis for demo purposes
        const mockAnalysis = {
            totalFiles: 45,
            codeFiles: 23,
            languages: {
                'js': 8,
                'jsx': 5,
                'py': 6,
                'css': 4
            },
            projectType: 'React/Python',
            size: '2.3MB'
        };

        res.status(200).json({
            success: true,
            analysis: mockAnalysis
        });
    } catch (error) {
        console.error('Error analyzing folder:', error);
        res.status(500).json({
            success: false,
            message: 'Error analyzing folder structure'
        });
    }
});

// @route   POST /api/deploy/script
// @desc    Deploy monitoring script to specified folder
// @access  Private
router.post('/script', [
    body('folderPath').notEmpty().withMessage('Folder path is required'),
    body('projectName').notEmpty().withMessage('Project name is required'),
], validate, async (req, res) => {
    try {
        const { folderPath, projectName } = req.body;
        const userId = req.user.id;
        
        console.log(`Deploying script to: ${folderPath} (User: ${userId})`);
        
        // Smart path resolution - handle both absolute and relative paths
        let absoluteFolderPath;
        if (path.isAbsolute(folderPath)) {
            absoluteFolderPath = folderPath;
        } else {
            // For relative paths, try common locations including media drives
            const projectRoot = path.join(__dirname, '../../');
            const possiblePaths = [
                path.join(projectRoot, folderPath), // Relative to project root
                path.join(process.cwd(), folderPath), // Relative to current directory
                path.join('/home', process.env.USER || 'user', folderPath), // User home directory
                path.join('/home', process.env.USER || 'user', 'Desktop', folderPath), // Desktop
                path.join('/home', process.env.USER || 'user', 'Documents', folderPath), // Documents
                folderPath // Try as-is in case it's already resolved
            ];
            
            // Special handling for media directories - search dynamically
            try {
                const mediaUserDir = `/media/${process.env.USER || 'sekar'}`;
                const mediaContents = await fs.readdir(mediaUserDir);
                for (const drive of mediaContents) {
                    possiblePaths.push(path.join(mediaUserDir, drive, folderPath));
                }
            } catch (e) {
                // Media directory not accessible, continue with other paths
            }
            
            console.log('Searching for script deployment folder:', possiblePaths);
            
            // Find the first path that exists
            for (const testPath of possiblePaths) {
                try {
                    const stats = await fs.stat(testPath);
                    if (stats.isDirectory()) {
                        absoluteFolderPath = testPath;
                        console.log(`Found folder at: ${testPath}`);
                        break;
                    }
                } catch (e) {
                    // Path doesn't exist, try next one
                }
            }
            
            // If no path found, create a working directory for testing
            if (!absoluteFolderPath) {
                const tempPath = path.join('/tmp', 'riskguard_script_deploy', folderPath);
                try {
                    await fs.mkdir(tempPath, { recursive: true });
                    absoluteFolderPath = tempPath;
                    console.log(`Created test directory for script deployment: ${tempPath}`);
                    
                    // Create a test file to simulate a project
                    const testFile = path.join(tempPath, 'sample.js');
                    await fs.writeFile(testFile, '// Sample file for monitoring\nconsole.log("Hello World");');
                } catch (createError) {
                    console.error('Failed to create test directory:', createError);
                    return res.status(500).json({
                        success: false,
                        message: `Could not find or create deployment location for "${folderPath}"`,
                        error: 'SCRIPT_DEPLOYMENT_ERROR',
                        details: createError.message
                    });
                }
            }
        }
        
        console.log(`Resolved path: ${absoluteFolderPath}`);
        
        // Check if folder exists and is writable
        try {
            const stats = await fs.stat(absoluteFolderPath);
            if (!stats.isDirectory()) {
                return res.status(400).json({
                    success: false,
                    message: `Path is not a directory: ${absoluteFolderPath}`
                });
            }
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: `Folder not accessible: ${absoluteFolderPath}`
            });
        }

        // Deploy monitoring files to the target folder
        const sourceDir = path.join(__dirname, '../../monitoring-agent');
        const targetMonitorScript = path.join(absoluteFolderPath, 'portable_monitor.py');
        const targetConfigFile = path.join(absoluteFolderPath, 'monitor_config.json');
        const targetRequirementsFile = path.join(absoluteFolderPath, 'requirements.txt');
        
        try {
            // Get the portable monitor script path
            const sourcePortableScript = path.join(sourceDir, 'portable_monitor.py');
            
            // Check if source script exists
            await fs.access(sourcePortableScript);
            
            // Copy the standalone portable monitor
            await fs.copyFile(sourcePortableScript, targetMonitorScript);
            
            // Create simple config for the portable monitor
            const deploymentConfig = {
                "project_id": projectName,
                "debounce_seconds": 2,
                "watch_patterns": ["*.py", "*.js", "*.jsx", "*.ts", "*.tsx", "*.java", "*.cpp", "*.c", "*.h", "*.cs", "*.php"],
                "ignore_patterns": ["node_modules", ".git", "__pycache__", "*.pyc", ".env", "dist", "build", "portable_monitor.py", "monitor_config.json", "requirements.txt"]
            };
            
            await fs.writeFile(targetConfigFile, JSON.stringify(deploymentConfig, null, 2));
            
            // Create simple requirements file
            const simpleRequirements = `watchdog>=6.0.0\nrequests>=2.32.0\n`;
            await fs.writeFile(targetRequirementsFile, simpleRequirements);
            
            console.log('✅ Portable monitor files deployed successfully');
            
        } catch (deployError) {
            console.error('Failed to deploy files:', deployError);
            return res.status(500).json({
                success: false,
                message: `Failed to deploy monitoring files: ${deployError.message}`
            });
        }
        
        const deploymentId = `deploy_${userId}_${Date.now()}`;
        const deploymentInfo = {
            id: deploymentId,
            userId,
            folderPath: absoluteFolderPath,
            projectName,
            deployedAt: new Date(),
            status: 'deployed',
            scriptPath: path.join(absoluteFolderPath, 'portable_monitor.py'),
            configPath: path.join(absoluteFolderPath, 'monitor_config.json')
        };

        // In a real app, save this to database
        console.log('Deployment completed:', deploymentInfo);

        res.status(200).json({
            success: true,
            deployment: deploymentInfo,
            message: 'Monitoring script deployed successfully to target folder'
        });
    } catch (error) {
        console.error('Error deploying script:', error);
        res.status(500).json({
            success: false,
            message: 'Error deploying monitoring script'
        });
    }
});

// @route   POST /api/deploy/stop-monitoring
// @desc    Stop monitoring session
// @access  Private
router.post('/stop-monitoring', [
    body('sessionId').optional(),
    body('agentId').optional()
], validate, async (req, res) => {
    try {
        const { sessionId, agentId } = req.body;
        
        // Find the agent to stop
        let targetAgentId = agentId;
        if (!targetAgentId && sessionId) {
            // Try to find agent by session ID pattern
            for (const [id, monitor] of activeMonitors) {
                if (id.includes(sessionId.split('_')[1])) {
                    targetAgentId = id;
                    break;
                }
            }
        }
        
        if (!targetAgentId || !activeMonitors.has(targetAgentId)) {
            return res.status(404).json({
                success: false,
                message: 'Monitoring session not found'
            });
        }
        
        const monitor = activeMonitors.get(targetAgentId);
        
        // Terminate the monitoring process
        if (monitor.process && !monitor.process.killed) {
            monitor.process.kill('SIGTERM');
            
            // Force kill after timeout
            setTimeout(() => {
                if (!monitor.process.killed) {
                    monitor.process.kill('SIGKILL');
                }
            }, 5000);
        }
        
        // Clean up
        activeMonitors.delete(targetAgentId);
        monitorUpdates.delete(targetAgentId);
        
        res.status(200).json({
            success: true,
            message: 'Monitoring stopped successfully',
            agentId: targetAgentId
        });
        
    } catch (error) {
        console.error('Error stopping monitoring:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to stop monitoring'
        });
    }
});
// @desc    Start monitoring on deployed script
// @access  Private
router.post('/start-monitoring', [
    body('deploymentId').notEmpty().withMessage('Deployment ID is required'),
], validate, async (req, res) => {
    try {
        const { deploymentId } = req.body;
        const userId = req.user.id;
        
        // In a real implementation, you would:
        // 1. Find the deployment record
        // 2. Start the monitoring process
        // 3. Return process ID for later control
        
        const monitoringSession = {
            id: `monitor_${deploymentId}_${Date.now()}`,
            deploymentId,
            userId,
            startedAt: new Date(),
            status: 'running',
            processId: Math.floor(Math.random() * 10000)
        };

        console.log('Monitoring started:', monitoringSession);

        res.status(200).json({
            success: true,
            session: monitoringSession,
            message: 'Monitoring started successfully'
        });
    } catch (error) {
        console.error('Error starting monitoring:', error);
        res.status(500).json({
            success: false,
            message: 'Error starting monitoring'
        });
    }
});

// @route   POST /api/deploy/stop-monitoring
// @desc    Stop monitoring session
// @access  Private
router.post('/stop-monitoring', [
    body('sessionId').notEmpty().withMessage('Session ID is required'),
], validate, async (req, res) => {
    try {
        const { sessionId } = req.body;
        const userId = req.user.id;
        
        // In a real implementation, you would:
        // 1. Find the monitoring session
        // 2. Stop the monitoring process
        // 3. Update session status
        
        console.log('Stopping monitoring session:', sessionId);

        res.status(200).json({
            success: true,
            message: 'Monitoring stopped successfully'
        });
    } catch (error) {
        console.error('Error stopping monitoring:', error);
        res.status(500).json({
            success: false,
            message: 'Error stopping monitoring'
        });
    }
});

// @route   GET /api/deploy/deployments
// @desc    Get all deployments for user
// @access  Private
router.get('/deployments', async (req, res) => {
    try {
        const userId = req.user.id;
        
        // In a real implementation, fetch from database
        const mockDeployments = [
            {
                id: 'deploy_1',
                projectName: 'Test Project',
                folderPath: '/path/to/test/project',
                deployedAt: new Date(),
                status: 'deployed'
            }
        ];

        res.status(200).json({
            success: true,
            deployments: mockDeployments
        });
    } catch (error) {
        console.error('Error fetching deployments:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching deployments'
        });
    }
});

// @route   DELETE /api/deploy/:deploymentId
// @desc    Remove a deployment
// @access  Private
router.delete('/:deploymentId', async (req, res) => {
    try {
        const { deploymentId } = req.params;
        const userId = req.user.id;
        
        // In a real implementation:
        // 1. Find deployment record
        // 2. Stop any running monitoring
        // 3. Remove script files
        // 4. Delete deployment record
        
        console.log('Removing deployment:', deploymentId);

        res.status(200).json({
            success: true,
            message: 'Deployment removed successfully'
        });
    } catch (error) {
        console.error('Error removing deployment:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing deployment'
        });
    }
});

module.exports = router;