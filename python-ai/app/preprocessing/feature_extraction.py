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
            
        except Exception as e:
            print(f"Error extracting Python features: {e}")
            # Fallback to basic metrics
            return FeatureExtractor._basic_metrics(code)
    
    @staticmethod
    def extract_javascript_features(code: str, file_path: str = "") -> CodeMetrics:
        """Extract features from JavaScript code (basic implementation)"""
        return FeatureExtractor._basic_metrics(code)
    
    @staticmethod
    def _basic_metrics(code: str) -> CodeMetrics:
        """Fallback basic metrics extraction"""
        lines = code.split('\n')
        loc = len([l for l in lines if l.strip() and not l.strip().startswith('#')])
        comments = len([l for l in lines if l.strip().startswith('#') or l.strip().startswith('//')])
        
        # Simple pattern matching
        functions = len(re.findall(r'\bdef\s+\w+|function\s+\w+', code))
        classes = len(re.findall(r'\bclass\s+\w+', code))
        imports = len(re.findall(r'\bimport\s+|from\s+\w+\s+import|require\(', code))
        
        return CodeMetrics(
            loc=loc,
            complexity=5.0,  # Default moderate complexity
            dependencies=imports,
            functions=functions,
            classes=classes,
            comments=comments
        )
    
    @staticmethod
    def extract_features(code: str, language: str, file_path: str = "") -> CodeMetrics:
        """Extract features based on programming language"""
        if language.lower() in ['python', 'py']:
            return FeatureExtractor.extract_python_features(code, file_path)
        elif language.lower() in ['javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx']:
            return FeatureExtractor.extract_javascript_features(code, file_path)
        else:
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
