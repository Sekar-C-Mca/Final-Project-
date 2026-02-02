#!/usr/bin/env python3
"""
RiskGuard Portable Monitor
Standalone file monitoring script that can be deployed to any project folder
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime
from pathlib import Path

# Check if required packages are available
try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
except ImportError:
    print("❌ Error: Required packages not installed.")
    print("Run: pip install watchdog requests")
    sys.exit(1)

class PortableFileMonitor(FileSystemEventHandler):
    """Portable file monitoring handler"""
    
    def __init__(self, config: dict, watch_dir: str):
        self.config = config
        self.watch_dir = watch_dir
        self.last_modified = {}
        self.debounce_seconds = config.get('debounce_seconds', 2)
        self.total_analyzed = 0
        self.high_risk_count = 0
        self.session_start_time = time.time()
        
    def should_analyze(self, file_path: str) -> bool:
        """Check if file should be analyzed"""
        file_name = os.path.basename(file_path)
        file_ext = f"*{os.path.splitext(file_path)[1]}"
        
        # Check ignore patterns
        for pattern in self.config.get('ignore_patterns', []):
            if pattern in file_path or pattern == file_name:
                return False
        
        # Check watch patterns
        for pattern in self.config.get('watch_patterns', []):
            if pattern == file_ext or file_path.endswith(pattern.replace('*', '')):
                return True
        
        return False
    
    def get_language(self, file_path: str) -> str:
        """Get programming language from file extension"""
        ext_map = {
            '.py': 'python', '.js': 'javascript', '.jsx': 'javascript',
            '.ts': 'typescript', '.tsx': 'typescript', '.java': 'java',
            '.cpp': 'cpp', '.c': 'c', '.h': 'c', '.cs': 'csharp',
            '.php': 'php', '.rb': 'ruby', '.go': 'go', '.rs': 'rust'
        }
        ext = os.path.splitext(file_path)[1].lower()
        return ext_map.get(ext, 'unknown')
    
    def analyze_file(self, file_path: str):
        """Simple file analysis"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            relative_path = os.path.relpath(file_path, self.watch_dir)
            language = self.get_language(file_path)
            
            # Simple risk assessment based on content
            lines = content.split('\n')
            line_count = len(lines)
            
            risk_indicators = [
                'eval(', 'exec(', 'system(', 'shell_exec(',
                'sql', 'SELECT', 'INSERT', 'DELETE', 'UPDATE',
                'password', 'secret', 'token', 'key',
                'TODO', 'FIXME', 'HACK', 'XXX'
            ]
            
            risk_score = 0
            for line in lines:
                line_lower = line.lower()
                for indicator in risk_indicators:
                    if indicator.lower() in line_lower:
                        risk_score += 1
            
            # Determine risk level
            if risk_score >= 5:
                risk_level = 'high'
                self.high_risk_count += 1
            elif risk_score >= 2:
                risk_level = 'medium'
            else:
                risk_level = 'low'
            
            confidence = min(0.95, 0.6 + (risk_score * 0.05))
            
            # Display result
            timestamp = datetime.now().strftime('%H:%M:%S')
            print(f"[{timestamp}] 📝 File changed: {relative_path}")
            
            risk_colors = {'low': '🟢', 'medium': '🟡', 'high': '🔴'}
            print(f"   {risk_colors[risk_level]} RISK: {risk_level.upper()} ({confidence:.0%} confidence)")
            print(f"   📊 Lines: {line_count} | Language: {language}")
            
            if risk_level != 'low':
                recommendations = [
                    "Review for security vulnerabilities",
                    "Add input validation",
                    "Implement proper error handling",
                    "Add unit tests",
                    "Document security considerations"
                ]
                if risk_score > 0:
                    print(f"   💡 Recommendation: {recommendations[min(risk_score-1, len(recommendations)-1)]}")
            
            print()  # Add spacing
            self.total_analyzed += 1
            
        except Exception as e:
            print(f"❌ Error analyzing {file_path}: {str(e)}")
    
    def on_modified(self, event):
        """Handle file modification events"""
        if event.is_directory:
            return
        
        file_path = event.src_path
        file_name = os.path.basename(file_path)
        relative_path = os.path.relpath(file_path, self.watch_dir)
        
        # Print immediate file change notification
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"📝 [{timestamp}] FILE CHANGED: {file_name}")
        print(f"   📍 Path: {relative_path}")
        
        # Debounce: prevent multiple triggers for same file
        current_time = time.time()
        if file_path in self.last_modified:
            if current_time - self.last_modified[file_path] < self.debounce_seconds:
                print(f"   ⏱️  Debouncing... (waiting {self.debounce_seconds}s)")
                return
        
        self.last_modified[file_path] = current_time
        
        # Check if file should be analyzed
        if not self.should_analyze(file_path):
            print(f"   ⚪ Skipped (not in watch patterns)")
            return
        
        print(f"   🔍 Analyzing file...")
        # Analyze the file
        self.analyze_file(file_path)
    
    def on_created(self, event):
        """Handle file creation events"""
        if event.is_directory:
            timestamp = datetime.now().strftime("%H:%M:%S")
            dir_name = os.path.basename(event.src_path)
            print(f"📁 [{timestamp}] DIRECTORY CREATED: {dir_name}")
        else:
            timestamp = datetime.now().strftime("%H:%M:%S")
            file_name = os.path.basename(event.src_path)
            relative_path = os.path.relpath(event.src_path, self.watch_dir)
            print(f"📄 [{timestamp}] FILE CREATED: {file_name}")
            print(f"   📍 Path: {relative_path}")
            self.on_modified(event)
    
    def on_deleted(self, event):
        """Handle file deletion events"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        name = os.path.basename(event.src_path)
        if event.is_directory:
            print(f"🗑️  [{timestamp}] DIRECTORY DELETED: {name}")
        else:
            print(f"🗑️  [{timestamp}] FILE DELETED: {name}")
    
    def on_moved(self, event):
        """Handle file move/rename events"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        old_name = os.path.basename(event.src_path)
        new_name = os.path.basename(event.dest_path)
        if event.is_directory:
            print(f"📂 [{timestamp}] DIRECTORY RENAMED: {old_name} → {new_name}")
        else:
            print(f"📝 [{timestamp}] FILE RENAMED: {old_name} → {new_name}")
    
    def get_stats(self):
        """Get session statistics"""
        duration = time.time() - self.session_start_time
        return {
            'duration_minutes': duration / 60,
            'total_analyzed': self.total_analyzed,
            'high_risk_count': self.high_risk_count
        }

def create_default_config():
    """Create default configuration"""
    return {
        "project_id": "portable_monitor",
        "debounce_seconds": 2,
        "watch_patterns": [
            "*.py", "*.js", "*.jsx", "*.ts", "*.tsx",
            "*.java", "*.cpp", "*.c", "*.h", "*.cs", "*.php", "*.rb"
        ],
        "ignore_patterns": [
            "node_modules", ".git", "__pycache__", "*.pyc",
            "venv", "env", "dist", "build", ".next", ".cache",
            "portable_monitor.py", "monitor_config.json", "requirements.txt"
        ]
    }

def main():
    """Main portable monitoring function"""
    parser = argparse.ArgumentParser(description='RiskGuard Portable Monitor')
    parser.add_argument('--watch-dir', default='.', help='Directory to monitor')
    parser.add_argument('--config', default='monitor_config.json', help='Config file')
    parser.add_argument('--project-id', help='Project identifier')
    
    args = parser.parse_args()
    
    # Load or create configuration
    config_path = Path(args.config)
    if config_path.exists():
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
        except Exception:
            config = create_default_config()
    else:
        config = create_default_config()
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
    
    if args.project_id:
        config['project_id'] = args.project_id
    
    # Get watch directory
    watch_dir = os.path.abspath(args.watch_dir)
    
    if not os.path.isdir(watch_dir):
        print(f"❌ Error: Directory not found: {watch_dir}")
        sys.exit(1)
    
    # Setup file observer
    event_handler = PortableFileMonitor(config, watch_dir)
    observer = Observer()
    observer.schedule(event_handler, watch_dir, recursive=True)
    
    # Start monitoring
    observer.start()
    
    print("🚀 RiskGuard Portable Monitor v1.0")
    print("=" * 50)
    print(f"📁 Monitoring Directory: {watch_dir}")
    print(f"🎯 Project ID: {config.get('project_id', 'Unknown')}")
    print(f"⏱️  Debounce: {config.get('debounce_seconds', 2)}s")
    print(f"👀 Watch patterns: {len(config.get('watch_patterns', []))} file types")
    print("=" * 50)
    print("🟢 MONITORING ACTIVE - Real-time file change detection")
    print("=" * 50)
    print("📝 Make changes to files and see instant analysis!")
    print("🔍 Supported events: CREATE, MODIFY, DELETE, RENAME")
    print("⏹️  Press Ctrl+C to stop monitoring")
    print("=" * 50)
    print("📊 Waiting for file changes...")
    print()
    
    try:
        last_stats_time = time.time()
        
        while True:
            time.sleep(2)
            
            # Show periodic statistics every 60 seconds
            current_time = time.time()
            if current_time - last_stats_time > 60:
                stats = event_handler.get_stats()
                timestamp = datetime.now().strftime("%H:%M:%S")
                if stats['total_analyzed'] > 0:
                    print(f"📊 [{timestamp}] SESSION UPDATE: {stats['total_analyzed']} files analyzed | "
                          f"{stats['high_risk_count']} high-risk | "
                          f"Runtime: {stats['duration_minutes']:.1f}min")
                else:
                    print(f"👁️  [{timestamp}] Still monitoring - no changes detected yet...")
                last_stats_time = current_time
    
    except KeyboardInterrupt:
        print("\n\n⏸️  Stopping RiskGuard Monitor...")
        observer.stop()
        
        # Show final statistics
        stats = event_handler.get_stats()
        print(f"\n📊 FINAL SESSION REPORT")
        print("=" * 50)
        print(f"⏱️  Duration: {stats['duration_minutes']:.1f} minutes")
        print(f"📝 Files analyzed: {stats['total_analyzed']}")
        print(f"🔴 High-risk files: {stats['high_risk_count']}")
        print("=" * 50)
        print("✅ Monitor test completed")
    
    observer.join()

if __name__ == "__main__":
    main()