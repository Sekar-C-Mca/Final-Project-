"""
Feature extraction module for code analysis
Extracts metrics and features from source code for ML model training
"""

import re
from typing import Dict, List, Any, Tuple


class CodeAnalyzer:
    """Extract features from code for risk assessment"""
    
    def __init__(self):
        """Initialize the code analyzer"""
        self.feature_names = [
            'LOC', 'Complexity', 'Dependencies', 'Functions', 'Classes',
            'Comments', 'Complexity/LOC', 'Comment Ratio', 'Functions/Class'
        ]
    
    def extract_features(self, code: str) -> Dict[str, float]:
        """
        Extract metrics from source code
        
        Args:
            code: Source code string
            
        Returns:
            Dictionary of extracted features
        """
        lines = code.split('\n')
        
        # Basic metrics
        loc = len([l for l in lines if l.strip() and not l.strip().startswith('#')])
        comment_lines = len([l for l in lines if l.strip().startswith('#')])
        blank_lines = len([l for l in lines if not l.strip()])
        
        # Code structure
        functions = len(re.findall(r'def\s+\w+\s*\(', code))
        classes = len(re.findall(r'class\s+\w+', code))
        
        # Dependencies and imports
        imports = len(re.findall(r'^(?:import|from)\s+', code, re.MULTILINE))
        
        # Complexity estimation (simple heuristic)
        complexity = self._estimate_complexity(code)
        
        # Calculate ratios
        complexity_ratio = complexity / max(loc, 1)
        comment_ratio = comment_lines / max(loc + comment_lines, 1)
        functions_per_class = functions / max(classes, 1)
        
        features = {
            'LOC': float(loc),
            'Complexity': float(complexity),
            'Dependencies': float(imports),
            'Functions': float(functions),
            'Classes': float(classes),
            'Comments': float(comment_lines),
            'Complexity/LOC': float(complexity_ratio),
            'Comment Ratio': float(comment_ratio),
            'Functions/Class': float(functions_per_class)
        }
        
        return features
    
    def _estimate_complexity(self, code: str) -> float:
        """
        Estimate cyclomatic complexity from code
        
        Args:
            code: Source code string
            
        Returns:
            Estimated complexity score
        """
        # Count control flow keywords
        if_count = len(re.findall(r'\bif\b', code))
        elif_count = len(re.findall(r'\belif\b', code))
        else_count = len(re.findall(r'\belse\b', code))
        for_count = len(re.findall(r'\bfor\b', code))
        while_count = len(re.findall(r'\bwhile\b', code))
        try_count = len(re.findall(r'\btry\b', code))
        except_count = len(re.findall(r'\bexcept\b', code))
        
        # Simple complexity calculation
        complexity = 1 + if_count + elif_count + for_count + while_count + try_count * 0.5
        
        return float(complexity)
    
    def extract_batch_features(self, code_samples: List[str]) -> List[Dict[str, float]]:
        """
        Extract features from multiple code samples
        
        Args:
            code_samples: List of source code strings
            
        Returns:
            List of feature dictionaries
        """
        return [self.extract_features(code) for code in code_samples]


def extract_code_features(code: str) -> Dict[str, float]:
    """
    Standalone function to extract features from code
    
    Args:
        code: Source code string
        
    Returns:
        Dictionary of extracted features
    """
    analyzer = CodeAnalyzer()
    return analyzer.extract_features(code)


def extract_features_batch(code_samples: List[str]) -> List[Dict[str, float]]:
    """
    Standalone function to extract features from multiple code samples
    
    Args:
        code_samples: List of source code strings
        
    Returns:
        List of feature dictionaries
    """
    analyzer = CodeAnalyzer()
    return analyzer.extract_batch_features(code_samples)
