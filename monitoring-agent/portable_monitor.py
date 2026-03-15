#!/usr/bin/env python3
"""
RiskGuard Portable Monitor
Standalone file monitoring script that can be deployed to any project folder
"""

import os
import sys
import json
import time
import re
import requests
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
        
        # ML API configuration
        self.ml_api_url = 'http://localhost:8000'
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
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
    
    def detect_language_mismatch(self, file_path: str, content: str) -> tuple:
        """Detect if file content doesn't match expected language from extension
        Returns: (has_mismatch: bool, detected_language: str, mismatch_warning: str)
        """
        expected_lang = self.get_language(file_path)
        file_ext = os.path.splitext(file_path)[1].lower()
        
        # Language indicators - specific patterns
        python_indicators = ['def ', 'import ', 'from ', 'class ', 'print(', '__init__', 'if __name__', 'self.', '= ']
        cpp_indicators = ['#include', 'int main', 'std::', 'void ', 'return 0;', 'using namespace', '#include <', '<<', '>>']
        c_indicators = ['#include', 'int main', 'printf(', 'scanf(', 'malloc(', 'void main', 'stdlib.h']
        java_indicators = ['public class', 'public static', 'import java', 'System.out.println', 'extends', 'implements']
        js_indicators = ['function ', 'const ', 'let ', 'var ', 'console.log', 'export ', '=>']
        
        content_lower = content.lower()
        
        # Count indicators for each language
        python_count = sum(1 for ind in python_indicators if ind.lower() in content_lower)
        cpp_count = sum(1 for ind in cpp_indicators if ind.lower() in content_lower)
        c_count = sum(1 for ind in c_indicators if ind.lower() in content_lower)
        java_count = sum(1 for ind in java_indicators if ind.lower() in content_lower)
        js_count = sum(1 for ind in js_indicators if ind.lower() in content_lower)
        
        # Determine detected language by highest count
        counts = {
            'python': python_count,
            'cpp': cpp_count,
            'c': c_count,
            'java': java_count,
            'javascript': js_count
        }
        
        # Find the language with most matches
        detected_lang = None
        max_count = max(counts.values())
        if max_count >= 1:  # At least 1 indicator must match
            detected_lang = max(counts, key=counts.get)
        
        # Check for mismatch - be sensitive to Python in C++ files
        has_mismatch = False
        warning = ""
        
        # Special handling: if Python detected in C/C++ file, it's a mismatch even with 1 indicator
        if expected_lang in ['cpp', 'c'] and detected_lang == 'python' and python_count >= 1:
            has_mismatch = True
            warning = f"⚠️  LANGUAGE MISMATCH DETECTED: Python code found in .{file_ext[1:] if file_ext else 'unknown'} file!"
        elif detected_lang and detected_lang != expected_lang and max_count >= 2:
            has_mismatch = True
            warning = f"⚠️  LANGUAGE MISMATCH: File is .{file_ext[1:] if file_ext else 'unknown'} but contains {detected_lang.upper()} code!"
        
        return has_mismatch, detected_lang or expected_lang, warning
    
    def extract_metrics(self, file_path: str, content: str) -> dict:
        """Extract comprehensive code metrics from file"""
        lines = content.split('\n')
        
        # Count lines of code and comments
        loc = 0
        comments = 0
        in_block_comment = False
        
        for line in lines:
            stripped = line.strip()
            
            # Skip empty lines
            if not stripped:
                continue
            
            # Handle block comments (Python style: """ or ''', JavaScript/C style: /* */)
            if '"""' in stripped or "'''" in stripped:
                in_block_comment = not in_block_comment
                comments += 1
                continue
            
            if '/*' in stripped:
                in_block_comment = True
            if in_block_comment or stripped.startswith('/*') or stripped.startswith('*'):
                comments += 1
                if '*/' in stripped:
                    in_block_comment = False
                continue
            
            # Count single-line comments (works across multiple languages)
            if stripped.startswith('#') or stripped.startswith('//'):
                comments += 1
                continue
            
            # If we reach here, it's a line of code
            loc += 1
        
        # Ensure we have at least 1 LOC
        loc = max(1, loc)
        
        # Count functions (language-agnostic patterns)
        function_patterns = [
            r'def\s+\w+\s*\(',  # Python: def function()
            r'function\s+\w+\s*\(',  # JavaScript: function name()
            r'async\s+function\s+\w+\s*\(',  # JavaScript async
            r'=>',  # Arrow functions
            r'void\s+\w+\s*\(',  # C/C++/Java: void name()
            r'int\s+\w+\s*\(',  # C/C++/Java: int name()
            r'public\s+\w+\s+\w+\s*\(',  # Java methods
            r'private\s+\w+\s+\w+\s*\(',  # Java methods
        ]
        
        functions = 0
        for pattern in function_patterns:
            functions += len(re.findall(pattern, content))
        
        # Count classes
        class_patterns = [
            r'class\s+\w+',  # Python/JavaScript: class Name
            r'struct\s+\w+',  # C/C++: struct Name
            r'interface\s+\w+',  # Java/TypeScript: interface Name
        ]
        
        classes = 0
        for pattern in class_patterns:
            classes += len(re.findall(pattern, content))
        
        # Count dependencies/imports
        import_patterns = [
            r'import\s+',  # Python/JavaScript: import
            r'require\s*\(',  # JavaScript: require()
            r'#include\s*[<"]',  # C/C++: #include
            r'using\s+',  # C#/Java: using/using namespace
        ]
        
        dependencies = 0
        for pattern in import_patterns:
            dependencies += len(re.findall(pattern, content))
        
        # Estimate cyclomatic complexity (simple approach)
        # Count decision points: if, else, for, while, switch, catch, etc.
        complexity_keywords = [
            r'\bif\b', r'\belse\b', r'\belif\b',
            r'\bfor\b', r'\bwhile\b', r'\bdo\b',
            r'\bswitch\b', r'\bcase\b',
            r'\bcatch\b', r'\bfinally\b',
            r'&&', r'\|\|', r'\?'  # Logical operators
        ]
        
        complexity = 1  # Base complexity
        for pattern in complexity_keywords:
            complexity += len(re.findall(pattern, content))
        
        # Average complexity per function (avoid division by zero)
        complexity = complexity / max(1, functions) if functions > 0 else complexity / max(1, loc / 10)
        complexity = round(complexity, 2)
        
        # Calculate derived metrics
        complexity_per_loc = round(complexity / max(1, loc), 2)
        comment_ratio = round(comments / max(1, loc), 2)
        functions_per_class = round(functions / max(1, classes), 2) if classes > 0 else 0
        
        return {
            'loc': loc,
            'complexity': complexity,
            'dependencies': dependencies,
            'functions': functions,
            'classes': classes,
            'comments': comments,
            'complexity_per_loc': complexity_per_loc,
            'comment_ratio': comment_ratio,
            'functions_per_class': functions_per_class
        }
    
    def send_to_ml_api(self, metrics: dict, file_path: str) -> dict:
        """Send extracted features to ML API for real-time analysis"""
        try:
            # Prepare feature vector for ML analysis
            feature_vector = [
                metrics['loc'],
                metrics['complexity'],
                metrics['dependencies'],
                metrics['functions'],
                metrics['classes'],
                metrics['comments'],
                metrics['complexity_per_loc'],
                metrics['comment_ratio'],
                metrics['functions_per_class']
            ]
            
            payload = {
                'code_content': '',  # Not needed for feature-based analysis
                'features': feature_vector,
                'file_path': file_path,
                'timestamp': datetime.now().isoformat()
            }
            
            # Send to ML API
            response = self.session.post(
                f"{self.ml_api_url}/api/analyze-code",
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                ml_result = response.json()
                print(f"   🤖 ML Analysis Complete: {ml_result.get('status', 'success')}")
                
                # Display ML predictions if available
                if 'predictions' in ml_result:
                    predictions = ml_result['predictions']
                    print(f"\n   🎯 ML PREDICTIONS:")
                    for algo, pred in predictions.items():
                        risk = pred.get('risk_level', 'unknown')
                        conf = pred.get('confidence', 0)
                        emoji = {'low': '🟢', 'medium': '🟡', 'high': '🔴'}.get(risk, '⚪')
                        print(f"   └─ {algo.replace('_', ' ').title()}: {emoji} {risk.upper()} ({conf:.1%})")
                
                # Store analysis data for frontend FIRST (before display that might error)
                self.store_analysis_data(file_path, feature_vector, ml_result)

                # Display feature importance (non-critical, wrapped in try/except)
                try:
                    if 'feature_importance' in ml_result:
                        importance = ml_result['feature_importance']
                        print(f"\n   📈 FEATURE IMPORTANCE:")
                        
                        # feature_importance can be:
                        #  - nested dict: {"algo_name": {"feature": score, ...}, ...}
                        #  - flat dict: {"feature": score, ...}
                        #  - list: [score1, score2, ...]
                        if isinstance(importance, dict):
                            # Check if values are dicts (nested per-algorithm format)
                            first_val = next(iter(importance.values()), None) if importance else None
                            if isinstance(first_val, dict):
                                # Nested: average importance across algorithms
                                merged = {}
                                algo_count = 0
                                for algo_name, algo_imp in importance.items():
                                    if isinstance(algo_imp, dict):
                                        algo_count += 1
                                        for feat, score in algo_imp.items():
                                            merged[feat] = merged.get(feat, 0) + float(score)
                                if algo_count > 0:
                                    merged = {k: v / algo_count for k, v in merged.items()}
                                sorted_features = sorted(merged.items(), key=lambda x: x[1], reverse=True)
                                for feature, score in sorted_features[:5]:
                                    print(f"   └─ {feature}: {score:.3f}")
                            else:
                                # Flat dict: {"feature": score}
                                sorted_features = sorted(importance.items(), key=lambda x: float(x[1]), reverse=True)
                                for feature, score in sorted_features[:5]:
                                    print(f"   └─ {feature}: {float(score):.3f}")
                        elif isinstance(importance, list) and len(importance) == 9:
                            feature_names = ['LOC', 'COMPLEXITY', 'DEPENDENCIES', 'FUNCTIONS', 
                                           'CLASSES', 'COMMENTS', 'COMPLEXITY_PER_LOC', 
                                           'COMMENT_RATIO', 'FUNCTIONS_PER_CLASS']
                            feature_scores = list(zip(feature_names, importance))
                            sorted_features = sorted(feature_scores, key=lambda x: float(x[1]), reverse=True)
                            for feature, score in sorted_features[:5]:
                                print(f"   └─ {feature}: {float(score):.3f}")
                except Exception as display_err:
                    print(f"   ⚠️  Feature importance display error: {display_err}")
                
                return ml_result
                
            else:
                print(f"   ⚠️  ML API error: {response.status_code}")
                return {}
                
        except requests.exceptions.ConnectionError:
            print(f"   ⚠️  ML API unavailable (connection failed)")
            return {}
        except Exception as e:
            print(f"   ⚠️  ML API error: {e}")
            return {}
    
    def _compute_consensus(self, predictions: dict) -> dict:
        """Compute consensus risk level and confidence from individual algorithm predictions"""
        if not predictions:
            return {'risk_level': 'unknown', 'confidence': 0.0}
        
        risk_counts = {'low': 0, 'medium': 0, 'high': 0}
        total_confidence = 0.0
        count = 0
        
        for algo, pred in predictions.items():
            if isinstance(pred, dict):
                risk = pred.get('risk_level', 'medium').lower()
                conf = pred.get('confidence', 0.5)
                if risk in risk_counts:
                    risk_counts[risk] += 1
                total_confidence += conf
                count += 1
        
        if count == 0:
            return {'risk_level': 'unknown', 'confidence': 0.0}
        
        # Majority vote for risk level
        consensus_risk = max(risk_counts, key=risk_counts.get)
        avg_confidence = total_confidence / count
        
        return {
            'risk_level': consensus_risk,
            'confidence': round(avg_confidence, 4),
            'agreement': risk_counts[consensus_risk] / count
        }

    def store_analysis_data(self, file_path: str, features: list, ml_result: dict) -> None:
        """Store analysis data for frontend consumption"""
        try:
            feature_names = ['LOC', 'Complexity', 'Dependencies', 'Functions', 
                           'Classes', 'Comments', 'Complexity/LOC', 
                           'Comment Ratio', 'Functions/Class']
            
            # Build extracted_features dict from feature vector
            extracted_features = {}
            for i, name in enumerate(feature_names):
                if i < len(features):
                    extracted_features[name] = features[i]
            
            # Compute consensus from predictions
            predictions = ml_result.get('predictions', {})
            consensus = self._compute_consensus(predictions)
            
            store_payload = {
                'file_path': file_path,
                'filename': os.path.basename(file_path),
                'extracted_features': extracted_features,
                'feature_vector': features,
                'features': features,
                'predictions': predictions,
                'consensus': consensus,
                'feature_importance': ml_result.get('feature_importance', {}),
                'timestamp': datetime.now().isoformat()
            }
            
            store_response = self.session.post(
                f"{self.ml_api_url}/api/store-analysis",
                json=store_payload,
                timeout=5
            )
            
            if store_response.status_code != 200:
                print(f"   ⚠️  Failed to store analysis: {store_response.status_code}")
                
        except Exception as e:
            print(f"   ⚠️  Storage error: {e}")
    
    
    def analyze_file(self, file_path: str):
        """Simple file analysis with comprehensive error handling"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            relative_path = os.path.relpath(file_path, self.watch_dir)
            language = self.get_language(file_path)
            
            # Detect language mismatch
            has_mismatch, detected_lang, mismatch_warning = self.detect_language_mismatch(file_path, content)
            
            # If mismatch detected, show warning and increase risk
            risk_boost = 0
            if has_mismatch:
                print(f"   {mismatch_warning}")
                risk_boost = 2  # Increase risk score for mismatches
            
            # Extract comprehensive metrics
            metrics = self.extract_metrics(file_path, content)
            
            lines = content.split('\n')
            
            # Simple risk assessment based on content patterns
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
            
            # Add risk boost for language mismatch
            risk_score += risk_boost
            
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
            
            # Only show risk level if NO mismatch detected
            if not has_mismatch:
                risk_colors = {'low': '🟢', 'medium': '🟡', 'high': '🔴'}
                print(f"   {risk_colors[risk_level]} RISK: {risk_level.upper()} ({confidence:.0%} confidence)")
            else:
                # For mismatch files, show different format
                print(f"   ⚠️  MISMATCH DETECTED - Fallback Analysis")
            
            # Display extracted features
            print(f"\n   📊 EXTRACTED FEATURES:")
            print(f"   └─ LOC: {metrics['loc']}")
            print(f"   └─ COMPLEXITY: {metrics['complexity']}")
            print(f"   └─ DEPENDENCIES: {metrics['dependencies']}")
            print(f"   └─ FUNCTIONS: {metrics['functions']}")
            print(f"   └─ CLASSES: {metrics['classes']}")
            print(f"   └─ COMMENTS: {metrics['comments']}")
            print(f"   └─ COMPLEXITY PER LOC: {metrics['complexity_per_loc']}")
            print(f"   └─ COMMENT RATIO: {metrics['comment_ratio']}")
            print(f"   └─ FUNCTIONS PER CLASS: {metrics['functions_per_class']}")
            
            # Send to ML API for dynamic analysis
            ml_result = self.send_to_ml_api(metrics, file_path)
            
            if has_mismatch:
                print(f"\n   💡 Recommendation: Review language mismatch - file may be in wrong folder")
            elif risk_level != 'low':
                recommendations = [
                    "Review for security vulnerabilities",
                    "Check language compatibility",
                    "Verify file is in correct directory",
                    "Add proper type hints/declarations",
                    "Implement error handling",
                ]
                if risk_score > 0:
                    print(f"\n   💡 Recommendation: {recommendations[min(risk_score-1, len(recommendations)-1)]}")
            
            # Show ML-based recommendations if available
            if ml_result.get('recommendations'):
                print(f"\n   🤖 ML Recommendations:")
                for i, rec in enumerate(ml_result['recommendations'][:3], 1):
                    print(f"      {i}. {rec}")
            
            print()  # Add spacing
            self.total_analyzed += 1
            
        except Exception as e:
            # Graceful error handling - log but don't crash
            # This handles edge cases like binary files, encoding issues, or unexpected formats
            relative_path = os.path.relpath(file_path, self.watch_dir)
            print(f"⚠️  Could not analyze {relative_path}: {type(e).__name__}")
    
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
    print("=" * 60)
    print(f"📁 Monitoring Directory: {watch_dir}")
    print(f"🎯 Project ID: {config.get('project_id', 'Unknown')}")
    print(f"⏱️  Debounce: {config.get('debounce_seconds', 2)}s")
    print(f"👀 Watch patterns: {len(config.get('watch_patterns', []))} file types")
    print("=" * 60)
    print("🟢 MONITORING ACTIVE - Real-time file change detection")
    print("=" * 60)
    print("📝 Make changes to files and see instant analysis!")
    print("🔍 Supported events: CREATE, MODIFY, DELETE, RENAME")
    print("⏹️  Press Ctrl+C to stop monitoring")
    print("=" * 60)
    print()
    
    try:
        last_stats_time = time.time()
        monitor_start_time = time.time()
        
        while True:
            time.sleep(10)  # Check every 10 seconds instead of 2
            
            # Show periodic statistics every 60 seconds
            current_time = time.time()
            if current_time - last_stats_time > 60:
                stats = event_handler.get_stats()
                timestamp = datetime.now().strftime("%H:%M:%S")
                elapsed = int(current_time - monitor_start_time)
                minutes = elapsed // 60
                seconds = elapsed % 60
                
                if stats['total_analyzed'] > 0:
                    print(f"\n📊 [{timestamp}] SESSION UPDATE [{minutes}m {seconds}s]")
                    print(f"   Analyzed: {stats['total_analyzed']} files | High-risk: {stats['high_risk_count']} | Rate: {stats['duration_minutes']:.1f}%")
                else:
                    print(f"\n👁️  [{timestamp}] Still monitoring ({minutes}m {seconds}s elapsed) - waiting for code changes...")
                
                print("")  # Add spacing to prevent "clearing" effect
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