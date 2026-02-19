#!/usr/bin/env python3
"""
🔍 Portable Risk Monitor
A self-contained script that can be placed in any project folder
to automatically monitor code changes and send them to ML backend.

Usage:
    python3 portable_monitor.py [--port 8000] [--project-name auto]
    
    Or simply:
    ./portable_monitor.py
"""

import os
import sys
import time
import json
import argparse
import subprocess
from pathlib import Path
from datetime import datetime
import threading

# ============================================================================
# CONFIGURATION - Modify these as needed
# ============================================================================

DEFAULT_ML_PORT = 8000
DEFAULT_ML_HOST = "localhost"
DEBOUNCE_SECONDS = 2
MAX_FILE_SIZE_MB = 5

# File extensions to monitor
WATCH_PATTERNS = [
    "*.py", "*.js", "*.jsx", "*.ts", "*.tsx",
    "*.java", "*.cpp", "*.c", "*.h", "*.cs",
    "*.php", "*.rb", "*.go", "*.rs", "*.swift",
    "*.kt", "*.scala", "*.vue", "*.svelte"
]

# Patterns to ignore
IGNORE_PATTERNS = [
    "node_modules", ".git", "__pycache__", "*.pyc", "*.pyo",
    "venv", "env", ".venv", "dist", "build", ".next", ".cache",
    "*.min.js", "*.bundle.js", "coverage", "target", "bin", "obj",
    ".vscode", ".idea", "*.log", ".DS_Store", "*.tmp", "*.temp",
    ".pytest_cache", ".tox", "htmlcov", ".coverage", "*.egg-info"
]

# ============================================================================
# PORTABLE DEPENDENCIES - Check and install if needed
# ============================================================================

def install_dependencies():
    """Install required packages if not available"""
    required_packages = [
        ("watchdog", "watchdog==6.0.0"),
        ("requests", "requests==2.32.3")
    ]
    
    missing_packages = []
    
    for module_name, pip_name in required_packages:
        try:
            __import__(module_name)
        except ImportError:
            missing_packages.append(pip_name)
    
    if missing_packages:
        print("📦 Installing required packages...")
        try:
            subprocess.check_call([
                sys.executable, "-m", "pip", "install", "--user"
            ] + missing_packages)
            print("✅ Dependencies installed successfully")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install dependencies: {e}")
            print("Please install manually: pip install watchdog requests")
            return False
    
    return True

# Install dependencies before importing
if not install_dependencies():
    sys.exit(1)

# Now import the dependencies
try:
    import requests
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please install manually: pip install watchdog requests")
    sys.exit(1)

# ============================================================================
# CORE FUNCTIONALITY
# ============================================================================

class PortableFileAnalyzer:
    """Analyze files and determine if they should be monitored"""
    
    LANGUAGE_MAP = {
        '.py': 'python', '.js': 'javascript', '.jsx': 'javascript',
        '.ts': 'typescript', '.tsx': 'typescript', '.java': 'java',
        '.cpp': 'cpp', '.c': 'c', '.h': 'c', '.cc': 'cpp', '.cxx': 'cpp',
        '.hpp': 'cpp', '.cs': 'csharp', '.php': 'php', '.rb': 'ruby',
        '.go': 'go', '.rs': 'rust', '.swift': 'swift', '.kt': 'kotlin',
        '.scala': 'scala', '.vue': 'vue', '.svelte': 'svelte'
    }
    
    @staticmethod
    def should_monitor(file_path, project_root):
        """Check if file should be monitored"""
        path = Path(file_path)
        
        # Check if file exists and is a file
        if not path.exists() or not path.is_file():
            return False
        
        # Check file size
        try:
            file_size = path.stat().st_size
            if file_size > MAX_FILE_SIZE_MB * 1024 * 1024 or file_size < 10:
                return False
        except OSError:
            return False
        
        # Check ignore patterns
        relative_path = str(path.relative_to(project_root))
        for ignore in IGNORE_PATTERNS:
            if ignore.replace('*', '') in relative_path:
                return False
        
        # Check watch patterns  
        for pattern in WATCH_PATTERNS:
            if path.match(pattern) or path.suffix == pattern.replace('*', ''):
                return True
                
        return False
    
    @staticmethod
    def get_language(file_path):
        """Get programming language from file extension"""
        ext = Path(file_path).suffix.lower()
        return PortableFileAnalyzer.LANGUAGE_MAP.get(ext, 'unknown')
    
    @staticmethod
    def read_file_content(file_path):
        """Safely read file content"""
        try:
            encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']
            for encoding in encodings:
                try:
                    with open(file_path, 'r', encoding=encoding) as f:
                        content = f.read()
                        # Basic validation
                        if len(content.strip()) > 5:
                            return content
                except UnicodeDecodeError:
                    continue
            return None
        except Exception as e:
            print(f"❌ Error reading {file_path}: {e}")
            return None

class MLBackendClient:
    """Communicate with ML Backend"""
    
    def __init__(self, host="localhost", port=8000):
        self.base_url = f"http://{host}:{port}"
        self.api_url = f"{self.base_url}/api"
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
    def test_connection(self):
        """Test connection to ML backend"""
        try:
            # Try root endpoint first
            response = self.session.get(f"{self.base_url}/", timeout=5)
            if response.status_code == 200:
                return True
            
            # Try API health endpoint
            response = self.session.get(f"{self.api_url}/health", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def analyze_code(self, project_id, module_name, file_path, code_content, language):
        """Send code for analysis"""
        try:
            payload = {
                "project_id": project_id,
                "module_name": module_name,
                "file_path": file_path,
                "code_content": code_content,
                "language": language,
                "timestamp": datetime.now().isoformat()
            }
            
            response = self.session.post(
                f"{self.api_url}/analyze",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Analysis failed: {response.status_code}")
                return None
                
        except requests.exceptions.ConnectionError:
            print(f"❌ Cannot connect to ML backend at {self.base_url}")
            return None
        except Exception as e:
            print(f"❌ Analysis error: {e}")
            return None

class PortableMonitorHandler(FileSystemEventHandler):
    """Handle file system events"""
    
    def __init__(self, project_root, project_name, ml_client):
        self.project_root = Path(project_root)
        self.project_name = project_name
        self.ml_client = ml_client
        self.analyzer = PortableFileAnalyzer()
        self.last_modified = {}
        self.stats = {
            'files_analyzed': 0,
            'high_risk_count': 0,
            'session_start': time.time()
        }
    
    def on_modified(self, event):
        """Handle file modification"""
        if event.is_directory:
            return
        
        self._process_file(event.src_path)
    
    def on_created(self, event):
        """Handle file creation"""
        if not event.is_directory:
            self._process_file(event.src_path)
    
    def _process_file(self, file_path):
        """Process a single file"""
        # Debouncing
        current_time = time.time()
        if file_path in self.last_modified:
            if current_time - self.last_modified[file_path] < DEBOUNCE_SECONDS:
                return
        
        self.last_modified[file_path] = current_time
        
        # Check if should monitor
        if not self.analyzer.should_monitor(file_path, self.project_root):
            return
        
        # Process in separate thread to avoid blocking
        threading.Thread(
            target=self._analyze_file,
            args=(file_path,),
            daemon=True
        ).start()
    
    def _analyze_file(self, file_path):
        """Analyze file and send to ML backend"""
        try:
            relative_path = str(Path(file_path).relative_to(self.project_root))
            print(f"\n🔍 Analyzing: {relative_path}")
            
            # Read file content
            content = self.analyzer.read_file_content(file_path)
            if not content:
                print(f"   ⚠️ Skipped: Could not read file")
                return
            
            # Get metadata
            language = self.analyzer.get_language(file_path)
            file_size = len(content)
            
            print(f"   📊 Size: {file_size/1024:.1f}KB | Language: {language}")
            
            # Send to ML backend
            result = self.ml_client.analyze_code(
                project_id=self.project_name,
                module_name=relative_path,
                file_path=file_path,
                code_content=content,
                language=language
            )
            
            if result:
                self.stats['files_analyzed'] += 1
                self._display_result(result, relative_path)
            
        except Exception as e:
            print(f"   ❌ Analysis error: {e}")
    
    def _display_result(self, result, file_path):
        """Display analysis results"""
        risk_level = result.get('risk_level', 'unknown')
        risk_score = result.get('risk_score', 0)
        
        # Risk indicators
        risk_indicators = {
            'low': {'emoji': '🟢', 'color': '\033[92m'},
            'medium': {'emoji': '🟡', 'color': '\033[93m'},
            'high': {'emoji': '🔴', 'color': '\033[91m'}
        }
        
        indicator = risk_indicators.get(risk_level, {'emoji': '⚪', 'color': '\033[90m'})
        emoji = indicator['emoji']
        color = indicator['color']
        reset = '\033[0m'
        
        print(f"   {color}{emoji} RISK: {risk_level.upper()} ({risk_score:.1%}){reset}")
        
        # Update statistics
        if risk_level == 'high':
            self.stats['high_risk_count'] += 1
            
            # Alert for high risk
            if self.stats['high_risk_count'] % 3 == 0:
                print(f"\n🚨 ALERT: {self.stats['high_risk_count']} high-risk files detected!")
        
        # Show recommendations for medium/high risk
        if result.get('recommendations') and risk_level in ['medium', 'high']:
            print(f"   💡 Recommendations:")
            for i, rec in enumerate(result['recommendations'][:2], 1):
                print(f"      {i}. {rec}")
    
    def get_stats(self):
        """Get monitoring statistics"""
        duration = time.time() - self.stats['session_start']
        return {
            'files_analyzed': self.stats['files_analyzed'],
            'high_risk_count': self.stats['high_risk_count'],
            'duration_minutes': duration / 60,
            'analysis_rate': self.stats['files_analyzed'] / max(duration / 60, 1)
        }

def detect_project_info(project_root):
    """Auto-detect project name and type"""
    project_path = Path(project_root)
    project_name = project_path.name.replace(' ', '_').replace('-', '_')
    
    # Clean project name
    project_name = ''.join(c for c in project_name if c.isalnum() or c == '_')
    
    # Detect project type
    project_type = "unknown"
    if (project_path / "package.json").exists():
        project_type = "nodejs"
    elif (project_path / "requirements.txt").exists() or (project_path / "pyproject.toml").exists():
        project_type = "python"
    elif (project_path / "pom.xml").exists():
        project_type = "java"
    elif (project_path / "Cargo.toml").exists():
        project_type = "rust"
    
    return project_name, project_type

def scan_project_structure(project_root):
    """Scan project and show statistics"""
    project_path = Path(project_root)
    stats = {
        'total_files': 0,
        'code_files': 0,
        'languages': {},
        'total_size': 0
    }
    
    try:
        for file_path in project_path.rglob('*'):
            if file_path.is_file():
                stats['total_files'] += 1
                
                # Skip hidden files and ignored patterns
                if any(part.startswith('.') for part in file_path.parts):
                    continue
                
                # Check if it's a code file
                if PortableFileAnalyzer.should_monitor(str(file_path), project_path):
                    stats['code_files'] += 1
                    language = PortableFileAnalyzer.get_language(str(file_path))
                    stats['languages'][language] = stats['languages'].get(language, 0) + 1
                
                # Add file size
                try:
                    stats['total_size'] += file_path.stat().st_size
                except:
                    pass
                    
    except Exception as e:
        print(f"❌ Error scanning project: {e}")
        
    return stats

def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description="Portable Risk Monitor - Monitor any project for code risk"
    )
    parser.add_argument('--port', '-p', type=int, default=DEFAULT_ML_PORT,
                       help=f'ML backend port (default: {DEFAULT_ML_PORT})')
    parser.add_argument('--host', default=DEFAULT_ML_HOST,
                       help=f'ML backend host (default: {DEFAULT_ML_HOST})')
    parser.add_argument('--project-name', '-n', 
                       help='Project name (default: auto-detect)')
    parser.add_argument('--project-path', default='.',
                       help='Project path to monitor (default: current directory)')
    
    args = parser.parse_args()
    
    # Setup project
    project_root = os.path.abspath(args.project_path)
    if not os.path.isdir(project_root):
        print(f"❌ Invalid project directory: {project_root}")
        sys.exit(1)
    
    # Auto-detect project info
    auto_name, project_type = detect_project_info(project_root)
    project_name = args.project_name or auto_name
    
    print("🔍 Portable Risk Monitor v1.0")
    print("=" * 50)
    print(f"📁 Project: {project_root}")
    print(f"🏷️  Name: {project_name}")
    print(f"🔧 Type: {project_type}")
    print(f"🔗 ML Backend: {args.host}:{args.port}")
    
    # Scan project structure
    print(f"\n📊 Scanning project structure...")
    stats = scan_project_structure(project_root)
    print(f"   📄 Total files: {stats['total_files']}")
    print(f"   📝 Code files: {stats['code_files']}")
    print(f"   💾 Size: {stats['total_size']/(1024*1024):.1f}MB")
    
    if stats['languages']:
        langs = ', '.join(f"{lang}({count})" for lang, count in stats['languages'].items())
        print(f"   🔧 Languages: {langs}")
    
    if stats['code_files'] == 0:
        print("⚠️ No code files found to monitor!")
        print(f"Supported extensions: {', '.join(WATCH_PATTERNS)}")
        response = input("Continue anyway? (y/N): ")
        if response.lower() != 'y':
            sys.exit(1)
    
    # Initialize ML client
    print(f"\n🔍 Testing ML backend connection...")
    ml_client = MLBackendClient(args.host, args.port)
    
    if not ml_client.test_connection():
        print(f"⚠️ Cannot connect to ML backend at {args.host}:{args.port}")
        print("The monitor will continue but analysis will fail.")
        print("Make sure your ML backend is running!")
        response = input("Continue anyway? (y/N): ")
        if response.lower() != 'y':
            sys.exit(1)
    else:
        print("✅ ML backend is accessible")
    
    # Setup file monitoring
    event_handler = PortableMonitorHandler(project_root, project_name, ml_client)
    observer = Observer()
    observer.schedule(event_handler, project_root, recursive=True)
    
    # Start monitoring
    observer.start()
    
    print("\n" + "=" * 50)
    print("🚀 MONITORING ACTIVE")
    print("=" * 50)
    print("👁️ Watching for code changes...")
    print("💡 Edit any code file to trigger analysis")
    print("⏹️ Press Ctrl+C to stop")
    print("=" * 50)
    print("")
    
    try:
        last_stats_time = time.time()
        monitor_start_time = time.time()
        
        while True:
            time.sleep(30)  # Check every 30 seconds instead of 5
            
            # Show periodic stats
            current_time = time.time()
            if current_time - last_stats_time > 300:  # Every 5 minutes
                session_stats = event_handler.get_stats()
                if session_stats['files_analyzed'] > 0:
                    elapsed = int(current_time - monitor_start_time)
                    minutes = elapsed // 60
                    seconds = elapsed % 60
                    print(f"\n📊 Session Stats [{minutes}m {seconds}s]: {session_stats['files_analyzed']} analyzed | "
                          f"{session_stats['high_risk_count']} high-risk | "
                          f"{session_stats['analysis_rate']:.1f}/min")
                    print(f"⏱️ Monitor still active - waiting for code changes...")
                    print("")
                last_stats_time = current_time
    
    except KeyboardInterrupt:
        print("\n\n⏹️ Stopping monitor...")
        observer.stop()
        
        # Final statistics
        final_stats = event_handler.get_stats()
        print("\n📊 FINAL REPORT")
        print("=" * 30)
        print(f"⏱️ Duration: {final_stats['duration_minutes']:.1f} minutes")
        print(f"📝 Files analyzed: {final_stats['files_analyzed']}")
        print(f"🔴 High-risk files: {final_stats['high_risk_count']}")
        if final_stats['files_analyzed'] > 0:
            print(f"📈 Analysis rate: {final_stats['analysis_rate']:.1f} files/minute")
        
    observer.join()
    print("✅ Monitor stopped")

if __name__ == "__main__":
    main()