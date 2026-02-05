import ast
import re
from radon.complexity import cc_visit
from radon.raw import analyze
from typing import Dict, Any, Optional
from app.api.schemas import CodeMetrics

class FeatureExtractor:
    """Extract features from source code for ML analysis"""
    
    @staticmethod
    def extract_python_features(code: str, file_path: str = "") -> CodeMetrics:
        """Extract features from Python code"""
        try:
            # Use radon for code metrics
            raw_metrics = analyze(code)
            
            # Calculate cyclomatic complexity
            complexity_blocks = cc_visit(code)
            avg_complexity = (
                sum(block.complexity for block in complexity_blocks) / len(complexity_blocks)
                if complexity_blocks else 0
            )
            
            # Parse AST for detailed metrics
            tree = ast.parse(code)
            
            # Count functions and classes
            functions = sum(1 for node in ast.walk(tree) if isinstance(node, ast.FunctionDef))
            classes = sum(1 for node in ast.walk(tree) if isinstance(node, ast.ClassDef))
            
            # Count imports (dependencies)
            imports = sum(1 for node in ast.walk(tree) 
                         if isinstance(node, (ast.Import, ast.ImportFrom)))
            
            return CodeMetrics(
                loc=raw_metrics.loc,
                complexity=round(avg_complexity, 2),
                dependencies=imports,
                functions=functions,
                classes=classes,
                comments=raw_metrics.comments
            )
            
        except SyntaxError:
            # If Python syntax is invalid, use basic metrics instead
            # This handles edge cases like Python syntax in .c or other files
            return FeatureExtractor._basic_metrics(code)
        except Exception as e:
            # For any other error, silently fall back to basic metrics
            # This prevents crashes from unexpected code formats
            return FeatureExtractor._basic_metrics(code)
    
    @staticmethod
    def extract_javascript_features(code: str, file_path: str = "") -> CodeMetrics:
        """Extract features from JavaScript/TypeScript code"""
        try:
            lines = code.split('\n')
            
            # Count lines of code and comments
            loc = 0
            comments = 0
            in_block_comment = False
            in_template_literal = False
            
            for line in lines:
                stripped = line.strip()
                
                # Skip empty lines
                if not stripped:
                    continue
                
                # Handle template literals (backticks)
                if '`' in stripped:
                    in_template_literal = not in_template_literal
                
                # Skip processing if we're inside a template literal
                if in_template_literal:
                    loc += 1
                    continue
                
                # Handle block comments
                if '/*' in stripped:
                    in_block_comment = True
                if in_block_comment:
                    comments += 1
                    if '*/' in stripped:
                        in_block_comment = False
                    continue
                
                # Count single-line comments
                if stripped.startswith('//'):
                    comments += 1
                    continue
                
                # If we reach here, it's a line of code
                loc += 1
            
            # Extract JavaScript-specific metrics
            # Count functions (including arrow functions, async, etc.)
            functions = len(re.findall(
                r'\bfunction\s+\w+|\w+\s*:\s*function|\w+\s*[=:]\s*(?:async\s*)?\(.*?\)\s*(?:=>|{)',
                code, re.MULTILINE
            ))
            
            # Count classes and constructors
            classes = len(re.findall(r'\bclass\s+\w+', code))
            
            # Count imports and requires
            imports = len(re.findall(r'\bimport\s+|from\s+["\']|require\s*\(', code))
            
            # Calculate complexity based on cyclomatic complexity indicators
            complexity_indicators = len(re.findall(
                r'\bif\s*\(|\belse\s*\{|\bfor\s*\(|\bwhile\s*\(|\bswitch\s*\(|\bcatch\s*\(|\?|&&|\|\|',
                code
            ))
            avg_complexity = min(10.0, 2.0 + (complexity_indicators / max(loc, 1)) * 3)
            
            return CodeMetrics(
                loc=max(1, loc),
                complexity=round(avg_complexity, 2),
                dependencies=imports,
                functions=functions,
                classes=classes,
                comments=comments
            )
        except Exception:
            # If any error occurs, use basic metrics as fallback
            # This handles edge cases like invalid syntax or unexpected formats
            return FeatureExtractor._basic_metrics(code)
    
    @staticmethod
    def _basic_metrics(code: str) -> CodeMetrics:
        """Fallback basic metrics extraction - works with any language/syntax"""
        try:
            lines = code.split('\n')
            
            # Count lines of code and comments
            loc = 0
            comments = 0
            in_block_comment = False
            
            for line in lines:
                stripped = line.strip()
                
                # Skip empty lines
                if not stripped:
                    continue
                
                # Handle block comments (Python style: """ or ''', JavaScript style: /* */, C style: /* */)
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
                
                # Count single-line comments (works for multiple languages)
                if stripped.startswith('#') or stripped.startswith('//'):
                    comments += 1
                    continue
                
                # If we reach here, it's a line of code
                loc += 1
            
            # Simple pattern matching that works across multiple languages
            functions = len(re.findall(r'\bdef\s+\w+|function\s+\w+|\w+\s*\(.*?\)\s*\{', code))
            classes = len(re.findall(r'\bclass\s+\w+|struct\s+\w+|interface\s+\w+', code))
            imports = len(re.findall(r'\bimport\s+|from\s+\w+\s+import|require\(|#include\s+', code))
            
            return CodeMetrics(
                loc=max(1, loc),  # Ensure at least 1 LOC
                complexity=5.0,  # Default moderate complexity
                dependencies=imports,
                functions=functions,
                classes=classes,
                comments=comments
            )
        except Exception:
            # Absolute fallback - if even basic extraction fails, return minimal metrics
            # This ensures we never throw errors to the user
            return CodeMetrics(
                loc=1,
                complexity=5.0,
                dependencies=0,
                functions=0,
                classes=0,
                comments=0
            )
    
    @staticmethod
    def extract_features(code: str, language: str, file_path: str = "") -> CodeMetrics:
        """Extract features based on programming language with graceful fallback
        
        Args:
            code: Source code content
            language: Programming language (python, javascript, java, c, cpp, etc.)
            file_path: Optional file path for additional context
            
        Returns:
            CodeMetrics: Extracted metrics, falling back to basic metrics if language-specific
                         extraction fails
        """
        try:
            lang_lower = language.lower().strip()
            
            # Python and related variants
            if lang_lower in ['python', 'py', 'python3', 'python2']:
                return FeatureExtractor.extract_python_features(code, file_path)
            
            # JavaScript, TypeScript and related variants
            elif lang_lower in ['javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx', 'node', 'nodejs']:
                return FeatureExtractor.extract_javascript_features(code, file_path)
            
            # For any other language, use basic metrics which are language-agnostic
            else:
                return FeatureExtractor._basic_metrics(code)
                
        except Exception:
            # If language detection or extraction fails, use basic metrics
            # This prevents crashes from unexpected input or file/language mismatches
            return FeatureExtractor._basic_metrics(code)
    
    @staticmethod
    def metrics_to_feature_vector(metrics: CodeMetrics) -> list[float]:
        """Convert metrics to ML feature vector"""
        return [
            float(metrics.loc),
            float(metrics.complexity),
            float(metrics.dependencies),
            float(metrics.functions),
            float(metrics.classes),
            float(metrics.comments),
            # Derived features
            float(metrics.complexity / max(metrics.loc, 1)),  # Complexity per LOC
            float(metrics.comments / max(metrics.loc, 1)),     # Comment ratio
            float(metrics.functions / max(metrics.classes, 1)) if metrics.classes > 0 else 0  # Functions per class
        ]
