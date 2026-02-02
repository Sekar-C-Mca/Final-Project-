# 👁️ Risk Monitoring Agent

The Risk Monitoring Agent is an intelligent file watcher that automatically detects code changes and sends them to the ML backend for real-time risk analysis.

## 🚀 Quick Start

### 1. Installation

```bash
# Navigate to monitoring agent directory
cd monitoring-agent

# Run installation script
./install.sh

# Activate virtual environment (if created)
source venv/bin/activate
```

### 2. Start ML Backend

Make sure the Python ML backend is running:

```bash
cd ../python-ai
python -m app.main
```

### 3. Run Agent

```bash
# Monitor current directory with default project ID
python3 monitor.py .

# Monitor specific directory with custom project ID
python3 monitor.py /path/to/project my_project_name

# Use environment variables
PROJECT_ID=my_project python3 monitor.py /path/to/project
```

## 📋 Features

### ✅ Real-time Monitoring
- **File Watcher**: Uses `watchdog` for efficient file system monitoring
- **Smart Debouncing**: Prevents multiple triggers for rapid file saves
- **Pattern Matching**: Configurable file patterns and ignore rules
- **Multi-language**: Supports Python, JavaScript, TypeScript, Java, C++, and more

### ✅ Intelligent Analysis
- **Language Detection**: Automatic programming language identification
- **File Validation**: Content validation and encoding detection
- **Size Filtering**: Skips binary files and files that are too large/small
- **Error Handling**: Robust error handling with retry logic

### ✅ Rich Reporting
- **Color-coded Output**: Visual risk level indicators (🟢🟡🔴)
- **Detailed Metrics**: LOC, complexity, functions count
- **Smart Recommendations**: Actionable insights for high-risk code
- **Session Statistics**: Real-time and final session reports

### ✅ Advanced Features
- **Risk Alerts**: Notifications when high-risk threshold is reached
- **Project Analytics**: Comprehensive project risk distribution
- **Performance Monitoring**: Analysis rate tracking
- **Directory Analysis**: Pre-scan project structure and statistics

## ⚙️ Configuration

### Main Configuration (`config.json`)

```json
{
  "api_url": "http://localhost:8000/api",
  "project_id": "default_project",
  "watch_patterns": [
    "*.py", "*.js", "*.jsx", "*.ts", "*.tsx",
    "*.java", "*.cpp", "*.c", "*.h", "*.cs"
  ],
  "ignore_patterns": [
    "node_modules", ".git", "__pycache__", "*.pyc",
    "venv", "env", "dist", "build", ".next"
  ],
  "debounce_seconds": 2,
  "max_file_size_mb": 1,
  "enable_notifications": true,
  "notification_threshold": {
    "high_risk_count": 3,
    "analysis_interval_minutes": 5
  }
}
```

### Environment Variables (`.env`)

```bash
# ML Backend Configuration
API_URL=http://localhost:8000/api
PROJECT_ID=my_project

# Optional overrides
DEBUG=true
```

## 📊 Usage Examples

### Basic Monitoring

```bash
# Monitor current directory
python3 monitor.py .

# Monitor with custom project ID
python3 monitor.py . my_web_app
```

### Advanced Usage

```bash
# Monitor specific project
python3 monitor.py /home/user/projects/webapp frontend_project

# Use environment variables for configuration
export PROJECT_ID=backend_api
export API_URL=http://192.168.1.100:8000/api
python3 monitor.py /path/to/backend
```

### Real-world Example

```bash
# Monitor a React + Node.js project
cd /projects/my-fullstack-app
python3 /path/to/monitor.py . fullstack_app

# Output:
# 🚀 RISK MONITORING ACTIVE
# ====================================
# 📁 Watching: /projects/my-fullstack-app
# 🏷️  Project ID: fullstack_app
# 🔗 ML Backend: http://localhost:8000/api
# ====================================
# 
# 🔍 Analyzing: src/components/UserForm.jsx
#    📊 Size: 2.3KB | Language: javascript
#    ✓ 🟡 RISK: MEDIUM (0.7 confidence)
#    📈 LOC: 87 | Complexity: 12 | Functions: 5
#    💡 Top recommendations:
#       1. Consider breaking down large functions
#       2. Add input validation for user data
```

## 🧪 Testing

The agent includes a comprehensive test suite:

```bash
# Run all tests
python3 test_agent.py

# Test output:
# 🧪 Risk Monitoring Agent Test Suite
# ==================================================
# ⚙️  Testing Configuration
# ✅ All required configuration keys present
# 
# 🔍 Testing ML Backend Connection
# ✅ Backend is healthy and accessible
# 
# 🧪 Testing File Analysis
# 🔍 Analyzing simple.py...
#    ✅ 🟢 Risk: LOW (0.2%)
# 🔍 Analyzing complex.py...
#    ✅ 🔴 Risk: HIGH (0.8%)
# 
# 📋 TEST SUMMARY
# ==================================================
# ✅ PASS Configuration
# ✅ PASS Backend Connection
# ✅ PASS File Analysis
# ✅ PASS File Watcher
# 
# 🎯 Overall: 4/4 tests passed
# 🎉 All tests passed! The agent is ready to use.
```

## 📈 Monitoring Output

### Analysis Output
```
🔍 Analyzing: src/utils/dataProcessor.js
   📊 Size: 4.2KB | Language: javascript
   ⚠ 🟡 RISK: MEDIUM (67% confidence)
   📈 LOC: 156 | Complexity: 18 | Functions: 8
   💡 Top recommendations:
      1. Reduce cyclomatic complexity in processData()
      2. Add error handling for edge cases

📊 Session Stats: 15 analyzed | 2 high-risk | 3.2/min
```

### Risk Alerts
```
🚨 ALERT: 3 high-risk modules detected!
   Consider reviewing and refactoring these modules.
```

### Final Report
```
📊 FINAL SESSION REPORT
========================================
⏱️  Duration: 24.3 minutes
📝 Files analyzed: 42
🔴 High-risk modules: 5
📈 Analysis rate: 1.7 files/minute

📊 Project Overview:
   Total modules in database: 127
   🔴 High Risk: 12 (9.4%)
   🟡 Medium Risk: 38 (29.9%)
   🟢 Low Risk: 77 (60.6%)
```

## 🔧 Architecture

### Components

1. **File Watcher** (`monitor.py`)
   - Main monitoring loop
   - Event handling and debouncing
   - Statistics tracking

2. **API Client** (`api_client.py`)
   - ML backend communication
   - Retry logic and error handling
   - Rate limiting

3. **Code Analyzer** (`code_analyzer.py`)
   - File filtering and validation
   - Language detection
   - Content analysis

### Data Flow

```
File Change → Debounce → Validate → Extract Features → ML Analysis → Display Results
      ↓              ↓           ↓              ↓              ↓
  Watchdog      Pattern      Content      Language      FastAPI      Console
              Matching      Reading      Detection     Backend      Output
```

## 🚨 Troubleshooting

### Common Issues

1. **Backend Connection Failed**
   ```bash
   # Check if ML backend is running
   curl http://localhost:8000/
   
   # Start ML backend
   cd ../python-ai && python -m app.main
   ```

2. **No Files Being Analyzed**
   ```bash
   # Check watch patterns in config.json
   # Verify file extensions match patterns
   # Check ignore patterns aren't too broad
   ```

3. **Permission Errors**
   ```bash
   # Make sure scripts are executable
   chmod +x monitor.py install.sh
   
   # Check directory permissions
   ls -la /path/to/watch/directory
   ```

4. **Module Import Errors**
   ```bash
   # Reinstall dependencies
   pip3 install -r requirements.txt
   
   # Check Python path
   export PYTHONPATH=$PYTHONPATH:$(pwd)
   ```

### Debug Mode

```bash
# Enable verbose output
DEBUG=true python3 monitor.py /path/to/project

# Test specific file
python3 -c "
from api_client import RiskAPIClient
client = RiskAPIClient('http://localhost:8000/api', 'test')
print(client.health_check())
"
```

## 📚 API Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | `http://localhost:8000/api` | ML backend URL |
| `PROJECT_ID` | `default_project` | Project identifier |
| `DEBUG` | `false` | Enable debug output |

### Command Line Arguments

```bash
python3 monitor.py [watch_directory] [project_id]
```

- `watch_directory`: Directory to monitor (default: current directory)
- `project_id`: Project identifier (default: from config/env)

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `api_url` | string | `http://localhost:8000/api` | ML backend URL |
| `project_id` | string | `default_project` | Project identifier |
| `watch_patterns` | array | `["*.py", "*.js", ...]` | File patterns to watch |
| `ignore_patterns` | array | `["node_modules", ...]` | Patterns to ignore |
| `debounce_seconds` | number | `2` | Debounce delay |
| `max_file_size_mb` | number | `1` | Maximum file size |

## 🤝 Integration

### With CI/CD Pipeline

```bash
# In your CI script
python3 monitor.py . $CI_PROJECT_NAME &
MONITOR_PID=$!

# Run your tests/build
npm test

# Stop monitoring
kill $MONITOR_PID
```

### With IDE Integration

Add to your IDE's external tools:

- **Command**: `python3`
- **Arguments**: `/path/to/monitor.py $ProjectFileDir$ $ProjectName$`
- **Working Directory**: `/path/to/monitoring-agent`

## 📄 License

Part of the Predictive Risk Evaluation system - MCA Final Year Project 2025-2026