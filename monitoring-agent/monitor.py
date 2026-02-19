#!/usr/bin/env python3
"""
Risk Monitoring Agent
Watches code changes and sends them for ML-based risk analysis
"""

import sys
import time
import json
import os
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from api_client import RiskAPIClient
from code_analyzer import CodeAnalyzer
from dotenv import load_dotenv

load_dotenv()

class CodeChangeHandler(FileSystemEventHandler):
    """Handle file system events with enhanced tracking and notifications"""
    
    def __init__(self, config: dict, api_client: RiskAPIClient, watch_dir: str):
        self.config = config
        self.api_client = api_client
        self.watch_dir = watch_dir
        self.analyzer = CodeAnalyzer()
        self.last_modified = {}
        self.debounce_seconds = config.get('debounce_seconds', 2)
        self.analysis_queue = []
        self.high_risk_count = 0
        self.total_analyzed = 0
        self.session_start_time = time.time()
    
    def on_modified(self, event):
        """Handle file modification events"""
        if event.is_directory:
            return
        
        file_path = event.src_path
        
        # Debounce: prevent multiple triggers for same file
        current_time = time.time()
        if file_path in self.last_modified:
            if current_time - self.last_modified[file_path] < self.debounce_seconds:
                return
        
        self.last_modified[file_path] = current_time
        
        # Check if file should be analyzed
        if not self.analyzer.should_analyze(
            file_path, 
            self.config['watch_patterns'],
            self.config['ignore_patterns']
        ):
            return
        
        # Process file
        self._analyze_file(file_path)
    
    def on_created(self, event):
        """Handle file creation events"""
        if not event.is_directory:
            self.on_modified(event)
    
    def _analyze_file(self, file_path: str):
        """Analyze and send file to ML backend with enhanced reporting"""
        relative_path = os.path.relpath(file_path, self.watch_dir)
        print(f"\n🔍 Analyzing: {relative_path}")
        
        # Get file stats
        file_stats = self.analyzer.get_file_stats(file_path)
        if file_stats:
            size_kb = file_stats['size_bytes'] / 1024
            print(f"   📊 Size: {size_kb:.1f}KB | Language: {file_stats['language']}")
        
        # Read file content
        code_content = self.analyzer.read_file_content(file_path)
        if not code_content:
            print(f"   ⚠️  Skipped: Unable to read file content")
            return
        
        # Get language and module name
        language = self.analyzer.get_language(file_path)
        module_name = self.analyzer.get_module_name(file_path, self.watch_dir)
        
        # Add to analysis queue for tracking
        analysis_entry = {
            'timestamp': time.time(),
            'file_path': file_path,
            'module_name': module_name,
            'language': language,
            'size': len(code_content)
        }
        self.analysis_queue.append(analysis_entry)
        
        # Send to ML backend
        result = self.api_client.analyze_code(
            module_name=module_name,
            file_path=file_path,
            code_content=code_content,
            language=language
        )
        
        if result:
            self.total_analyzed += 1
            self._display_result(result, relative_path)
            self._check_risk_threshold(result)
    
    def _display_result(self, result: dict, relative_path: str = ""):
        """Display analysis result with enhanced formatting"""
        risk_level = result.get('risk_level', 'unknown')
        risk_score = result.get('risk_score', 0)
        
        # Color and emoji coding
        risk_config = {
            'low': {'color': '\033[92m', 'emoji': '🟢', 'symbol': '✓'},
            'medium': {'color': '\033[93m', 'emoji': '🟡', 'symbol': '⚠'},
            'high': {'color': '\033[91m', 'emoji': '🔴', 'symbol': '⚠'}
        }
        
        config = risk_config.get(risk_level, {'color': '\033[90m', 'emoji': '⚪', 'symbol': '?'})
        color = config['color']
        emoji = config['emoji']
        symbol = config['symbol']
        reset = '\033[0m'
        
        print(f"   {color}{symbol} {emoji} RISK: {risk_level.upper()} ({risk_score:.1%} confidence){reset}")
        
        # Show metrics if available
        if 'metrics' in result:
            metrics = result['metrics']
            print(f"   📈 LOC: {metrics.get('loc', 0)} | Complexity: {metrics.get('complexity', 0)} | Functions: {metrics.get('functions', 0)}")
        
        # Show top recommendations for medium/high risk
        if result.get('recommendations') and risk_level in ['medium', 'high']:
            print(f"   💡 Top recommendations:")
            for i, rec in enumerate(result['recommendations'][:2], 1):
                print(f"      {i}. {rec}")
        
        print()  # Add spacing

    def _check_risk_threshold(self, result: dict):
        """Check if high-risk threshold is reached and show alert"""
        if result.get('risk_level') == 'high':
            self.high_risk_count += 1
            
            # Alert every 3 high-risk files
            if self.high_risk_count % 3 == 0:
                print(f"\n🚨 ALERT: {self.high_risk_count} high-risk modules detected!")
                print("   Consider reviewing and refactoring these modules.\n")

    def get_session_stats(self) -> dict:
        """Get statistics for current monitoring session"""
        session_time = time.time() - self.session_start_time
        return {
            'session_duration': session_time,
            'total_analyzed': self.total_analyzed,
            'high_risk_count': self.high_risk_count,
            'analysis_rate': self.total_analyzed / max(session_time / 60, 1)  # per minute
        }


def main():
    """Main monitoring function with continuous operation"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Risk Monitoring Agent v2.0')
    parser.add_argument('--watch-dir', default=os.getcwd(), help='Directory to monitor')
    parser.add_argument('--config', help='Path to config file')
    parser.add_argument('--output-format', choices=['console', 'json'], default='console', help='Output format')
    parser.add_argument('--real-time', action='store_true', help='Enable real-time JSON output')
    parser.add_argument('--project-id', help='Override project ID')
    
    args = parser.parse_args()
    
    real_time_mode = args.real_time or args.output_format == 'json'
    
    # Load configuration
    config_path = Path(args.config) if args.config else Path(__file__).parent / 'config.json'
    if not config_path.exists():
        config_path = Path(__file__).parent / 'monitor_config.json'  # Try deployed config
    
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
        if not real_time_mode:
            print(f"✓ Configuration loaded from {config_path}")
    except FileNotFoundError:
        if not real_time_mode:
            print("Creating default configuration...")
        _create_default_config(config_path)
        with open(config_path, 'r') as f:
            config = json.load(f)
    
    # Get watch directory
    watch_dir = os.path.abspath(args.watch_dir)
    
    # Validate watch directory
    if not os.path.isdir(watch_dir):
        if real_time_mode:
            print(json.dumps({'type': 'error', 'message': f'Invalid directory: {watch_dir}'}))
        else:
            print(f"✗ Invalid directory: {watch_dir}")
        sys.exit(1)
    
    # Override project_id if provided
    project_id = args.project_id or os.getenv('PROJECT_ID') or config.get('project_id', 'default_project')
    
    # Initialize API client
    api_url = os.getenv('API_URL') or config['api_url']
    api_client = RiskAPIClient(api_url, project_id)
    
    if not real_time_mode:
        print("\n🚀 Risk Monitoring Agent v2.0")
        print("=" * 50)
    
    # Check backend health (non-blocking)
    if not real_time_mode:
        print(f"🔍 Testing connection to ML backend...")
    backend_available = api_client.health_check()
    if not backend_available:
        if real_time_mode:
            print(json.dumps({'type': 'warning', 'message': f'Cannot connect to ML backend at {api_url}'}))
        else:
            print(f"⚠️  Warning: Cannot connect to ML backend at {api_url}")
            print("   Monitoring will continue with local analysis")
    else:
        if not real_time_mode:
            print(f"✓ Connected to ML backend at {api_url}")
    
    # Analyze directory structure
    if not real_time_mode:
        print(f"📁 Analyzing project structure...")
    dir_stats = CodeAnalyzer.analyze_directory(watch_dir, config['watch_patterns'])
    if not real_time_mode:
        print(f"   📊 Total files: {dir_stats['total_files']}")
        print(f"   📝 Code files: {dir_stats['code_files']}")
        if dir_stats['languages']:
            print(f"   🔧 Languages: {', '.join(f'{lang}({count})' for lang, count in dir_stats['languages'].items())}")
    
    # Setup file system observer
    event_handler = CodeChangeHandler(config, api_client, watch_dir, real_time_mode)
    observer = Observer()
    observer.schedule(event_handler, watch_dir, recursive=True)
    
    # Start monitoring
    observer.start()
    
    if not real_time_mode:
        print(f"\n{'='*50}")
        print("🚀 MONITORING ACTIVE")
        print(f"{'='*50}")
        print("👁️  Watching for code changes...")
        print("💡 Edit any code file to trigger analysis")
        print("⏹️  Press Ctrl+C to stop")
        print(f"{'='*50}")
    else:
        # Send initial status for real-time mode
        print(json.dumps({
            'type': 'monitor_started',
            'watch_dir': watch_dir,
            'project_id': project_id,
            'stats': dir_stats,
            'message': 'Monitoring started successfully'
        }), flush=True)
    
    try:
        last_stats_time = time.time()
        
        while True:
            time.sleep(2)  # Check every 2 seconds for responsiveness
            
            current_time = time.time()
            
            # Show periodic status in console mode (every 60 seconds)
            if not real_time_mode and (current_time - last_stats_time > 60):
                stats = event_handler.get_session_stats()
                if stats['total_analyzed'] > 0:
                    print(f"📊 Files analyzed: {stats['total_analyzed']} | High-risk: {stats['high_risk_count']} | Runtime: {stats['session_duration']/60:.1f}min")
                else:
                    print("👁️  Monitoring active - waiting for file changes...")
                last_stats_time = current_time
            
    except KeyboardInterrupt:
        if not real_time_mode:
            print("\n\n⏸️  Stopping Risk Monitoring Agent...")
        observer.stop()
        
        if not real_time_mode:
            # Show final session statistics
            stats = event_handler.get_session_stats()
            print(f"\n📊 FINAL SESSION REPORT")
            print("="*50)
            print(f"⏱️  Duration: {stats['session_duration']/60:.1f} minutes")
            print(f"📝 Files analyzed: {stats['total_analyzed']}")
            print(f"🔴 High-risk modules: {stats['high_risk_count']}")
            if stats['total_analyzed'] > 0:
                print(f"📈 Analysis rate: {stats['total_analyzed']/(stats['session_duration']/60):.1f} files/minute")
            print("="*50)
        else:
            # Send final summary for real-time mode
            print(json.dumps({
                'type': 'monitor_stopped',
                'summary': event_handler.get_session_stats(),
                'message': 'Monitoring stopped by user'
            }), flush=True)
    
    observer.join()
    
    if not real_time_mode:
        print("✅ Monitor test completed")
        print("💡 You can run the agent again to continue monitoring\n")
                          f"{session_stats['analysis_rate']:.1f}/min")
                last_stats_time = current_time
            
    except KeyboardInterrupt:
        print("\n\n⏸️  Stopping Risk Monitoring Agent...")
        observer.stop()
        
        # Show final session statistics
        session_stats = event_handler.get_session_stats()
        print("\n📊 FINAL SESSION REPORT")
        print("="*40)
        print(f"⏱️  Duration: {session_stats['session_duration']/60:.1f} minutes")
        print(f"📝 Files analyzed: {session_stats['total_analyzed']}")
        print(f"🔴 High-risk modules: {session_stats['high_risk_count']}")
        print(f"📈 Analysis rate: {session_stats['analysis_rate']:.1f} files/minute")
        
        # Show project statistics from backend
        stats = api_client.get_project_statistics()
        if stats and stats.get('total_modules', 0) > 0:
            print(f"\n📊 Project Overview:")
            print(f"   Total modules in database: {stats['total_modules']}")
            if 'risk_distribution' in stats:
                dist = stats['risk_distribution']
                total = sum(dist.values())
                print(f"   🔴 High Risk: {dist.get('high', 0)} ({dist.get('high', 0)/total*100:.1f}%)")
                print(f"   🟡 Medium Risk: {dist.get('medium', 0)} ({dist.get('medium', 0)/total*100:.1f}%)")
                print(f"   🟢 Low Risk: {dist.get('low', 0)} ({dist.get('low', 0)/total*100:.1f}%)")
    
    observer.join()
    print("\n✓ Agent stopped successfully")
    print("💡 Run the React dashboard to view detailed analysis results\n")

def _create_default_config(config_path: Path):
    """Create default configuration file"""
    default_config = {
        "api_url": "http://localhost:8000/api",
        "project_id": "default_project",
        "watch_patterns": [
            "*.py", "*.js", "*.jsx", "*.ts", "*.tsx",
            "*.java", "*.cpp", "*.c", "*.h", "*.cs"
        ],
        "ignore_patterns": [
            "node_modules", ".git", "__pycache__", "*.pyc",
            "venv", "env", "dist", "build", ".next", ".cache",
            "*.min.js", "*.bundle.js", "coverage"
        ],
        "debounce_seconds": 2,
        "analysis_trigger": "on_save"
    }
    
    with open(config_path, 'w') as f:
        json.dump(default_config, f, indent=2)
    print(f"✓ Default configuration created at {config_path}")

if __name__ == "__main__":
    main()
