import os
import re
from pathlib import Path
from typing import List, Dict, Any

class CodeAnalyzer:
    """Extract metrics from source code files and handle analysis logic"""
    
    LANGUAGE_MAP = {
        '.py': 'python',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.java': 'java',
        '.cpp': 'cpp',
        '.c': 'c',
        '.h': 'c',
        '.cc': 'cpp',
        '.cxx': 'cpp',
        '.hpp': 'cpp',
        '.cs': 'csharp',
        '.php': 'php',
        '.rb': 'ruby',
        '.go': 'go',
        '.rs': 'rust',
        '.swift': 'swift',
        '.kt': 'kotlin',
        '.scala': 'scala'
    }
    
    # File size limits (in bytes)
    MAX_FILE_SIZE = 1024 * 1024  # 1MB
    MIN_FILE_SIZE = 10  # 10 bytes
    
    @staticmethod
    def get_language(file_path: str) -> str:
        """Determine language from file extension"""
        ext = Path(file_path).suffix.lower()
        return CodeAnalyzer.LANGUAGE_MAP.get(ext, 'unknown')
    
    @staticmethod
    def should_analyze(file_path: str, watch_patterns: list, ignore_patterns: list) -> bool:
        """Check if file should be analyzed based on patterns and file properties"""
        path = Path(file_path)
        
        # Check file exists and is a file
        if not path.exists() or not path.is_file():
            return False
        
        # Check file size
        try:
            file_size = path.stat().st_size
            if file_size > CodeAnalyzer.MAX_FILE_SIZE or file_size < CodeAnalyzer.MIN_FILE_SIZE:
                return False
        except OSError:
            return False
        
        # Check if matches ignore patterns first (more efficient)
        path_str = str(path).replace('\\', '/')
        for ignore in ignore_patterns:
            if ignore in path_str or path.name.startswith('.') and ignore == '.*':
                return False
        
        # Check if matches watch patterns
        for pattern in watch_patterns:
            if path.match(pattern) or path.name.endswith(pattern.replace('*', '')):
                return True
                
        return False
    
    @staticmethod
    def read_file_content(file_path: str) -> str:
        """Read file content safely with encoding detection"""
        try:
            # Try UTF-8 first
            encodings = ['utf-8', 'utf-8-sig', 'latin-1', 'cp1252']
            
            for encoding in encodings:
                try:
                    with open(file_path, 'r', encoding=encoding) as f:
                        content = f.read()
                        
                        # Basic validation - check if content looks like code
                        if CodeAnalyzer._is_valid_code_content(content):
                            return content
                        else:
                            return ""
                except UnicodeDecodeError:
                    continue
                    
            print(f"⚠️  Could not decode {file_path} with any encoding")
            return ""
            
        except Exception as e:
            print(f"✗ Error reading {file_path}: {e}")
            return ""
    
    @staticmethod
    def _is_valid_code_content(content: str) -> bool:
        """Check if content appears to be valid source code"""
        if not content or len(content.strip()) < 10:
            return False
            
        # Check for binary content
        try:
            # If content can't be encoded as UTF-8, it's probably binary
            content.encode('utf-8')
        except UnicodeEncodeError:
            return False
        
        # Check for common binary patterns
        binary_indicators = [b'\x00', b'\xff\xfe', b'\xfe\xff']
        content_bytes = content.encode('utf-8', errors='ignore')
        
        for indicator in binary_indicators:
            if indicator in content_bytes:
                return False
                
        return True
    
    @staticmethod
    def get_module_name(file_path: str, watch_dir: str) -> str:
        """Generate module name from file path"""
        try:
            rel_path = Path(file_path).relative_to(watch_dir)
            return str(rel_path).replace('\\', '/')
        except ValueError:
            # File is outside watch directory
            return Path(file_path).name
    
    @staticmethod
    def get_file_stats(file_path: str) -> Dict[str, Any]:
        """Get basic file statistics"""
        try:
            path = Path(file_path)
            stat = path.stat()
            
            return {
                'size_bytes': stat.st_size,
                'modified_time': stat.st_mtime,
                'extension': path.suffix,
                'language': CodeAnalyzer.get_language(file_path),
                'name': path.name,
                'directory': str(path.parent)
            }
        except Exception:
            return {}
    
    @staticmethod
    def analyze_directory(directory: str, patterns: List[str]) -> Dict[str, int]:
        """Analyze directory for file counts and types"""
        stats = {
            'total_files': 0,
            'code_files': 0,
            'languages': {},
            'total_size': 0
        }
        
        try:
            for root, dirs, files in os.walk(directory):
                for file in files:
                    file_path = os.path.join(root, file)
                    
                    # Skip hidden files and directories
                    if any(part.startswith('.') for part in Path(file_path).parts):
                        continue
                    
                    stats['total_files'] += 1
                    
                    # Check if it's a code file
                    if CodeAnalyzer.should_analyze(file_path, patterns, []):
                        stats['code_files'] += 1
                        language = CodeAnalyzer.get_language(file_path)
                        stats['languages'][language] = stats['languages'].get(language, 0) + 1
                    
                    # Add file size
                    try:
                        stats['total_size'] += os.path.getsize(file_path)
                    except OSError:
                        pass
                        
        except Exception as e:
            print(f"Error analyzing directory: {e}")
            
        return stats
