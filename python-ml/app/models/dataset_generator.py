"""
Synthetic dataset generator for code optimization classification.
Creates realistic code metrics for training ML models.
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from typing import Tuple
import os

class DatasetGenerator:
    """Generate synthetic code metrics datasets"""
    
    def __init__(self, random_state: int = 42):
        self.random_state = random_state
        np.random.seed(random_state)
    
    def generate_optimized_code_sample(self, count: int = 100) -> np.ndarray:
        """Generate samples for optimized code"""
        samples = []
        for _ in range(count):
            # Optimized code characteristics:
            # - Low complexity (5-20)
            # - High comments (0.12-0.25)
            # - Low dependencies (1-4)
            # - High functions per class (2.5-4.5)
            # - Low complexity per LOC (0.2-0.4)
            # - High comment ratio (0.12-0.25)
            
            loc = np.random.randint(100, 500)  # Lines of code
            complexity = np.random.randint(5, 20)  # Cyclomatic complexity
            dependencies = np.random.randint(1, 4)  # Number of dependencies
            functions = np.random.randint(8, 20)  # Number of functions
            classes = np.random.randint(2, 6)  # Number of classes
            comments = np.random.randint(int(loc * 0.12), int(loc * 0.25))  # Comment lines
            
            # Derived metrics
            complexity_per_loc = complexity / loc
            comment_ratio = comments / loc
            functions_per_class = functions / classes if classes > 0 else 0
            
            samples.append([
                loc, complexity, dependencies, functions, classes, 
                comments, complexity_per_loc, comment_ratio, functions_per_class
            ])
        
        return np.array(samples)
    
    def generate_unoptimized_code_sample(self, count: int = 100) -> np.ndarray:
        """Generate samples for unoptimized code"""
        samples = []
        for _ in range(count):
            # Unoptimized code characteristics:
            # - High complexity (25-50)
            # - Low comments (0.01-0.08)
            # - High dependencies (5-15)
            # - Low functions per class (0.5-1.5)
            # - High complexity per LOC (0.5-0.8)
            # - Low comment ratio (0.01-0.08)
            
            loc = np.random.randint(200, 800)  # More LOC for complex code
            complexity = np.random.randint(25, 50)  # High cyclomatic complexity
            dependencies = np.random.randint(5, 15)  # Many dependencies
            functions = np.random.randint(3, 10)  # Few functions
            classes = np.random.randint(3, 8)  # More classes but low cohesion
            comments = np.random.randint(max(1, int(loc * 0.01)), int(loc * 0.08))  # Few comments
            
            # Derived metrics
            complexity_per_loc = complexity / loc
            comment_ratio = comments / loc
            functions_per_class = functions / classes if classes > 0 else 0
            
            samples.append([
                loc, complexity, dependencies, functions, classes,
                comments, complexity_per_loc, comment_ratio, functions_per_class
            ])
        
        return np.array(samples)
    
    def generate_dataset(self, 
                        optimized_count: int = 400,
                        unoptimized_count: int = 400,
                        test_size: float = 0.2) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Generate complete dataset with train-test split.
        
        Returns:
            X_train, X_test, y_train, y_test
        """
        print(f"Generating synthetic dataset...")
        print(f"  - Optimized samples: {optimized_count}")
        print(f"  - Unoptimized samples: {unoptimized_count}")
        
        # Generate samples
        optimized_samples = self.generate_optimized_code_sample(optimized_count)
        unoptimized_samples = self.generate_unoptimized_code_sample(unoptimized_count)
        
        # Combine and create labels (1 = optimized, 0 = unoptimized)
        X = np.vstack([optimized_samples, unoptimized_samples])
        y = np.hstack([np.ones(optimized_count), np.zeros(unoptimized_count)])
        
        # Shuffle
        indices = np.random.permutation(len(X))
        X = X[indices]
        y = y[indices]
        
        # Train-test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=self.random_state, stratify=y
        )
        
        print(f"✓ Dataset generated:")
        print(f"  - Training samples: {len(X_train)}")
        print(f"  - Testing samples: {len(X_test)}")
        print(f"  - Features: 9 (LOC, Complexity, Dependencies, Functions, Classes, Comments, Complexity/LOC, Comment Ratio, Functions/Class)")
        
        return X_train, X_test, y_train, y_test
    
    def save_dataset(self, X_train: np.ndarray, X_test: np.ndarray, 
                    y_train: np.ndarray, y_test: np.ndarray,
                    filepath: str = "app/models/saved_models/dataset.npz") -> None:
        """Save dataset to file"""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        np.savez(filepath, X_train=X_train, X_test=X_test, y_train=y_train, y_test=y_test)
        print(f"✓ Dataset saved to {filepath}")
    
    def generate_algorithm_specific_dataset(self, algorithm: str) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Generate unique REAL dataset for specific algorithm with algorithm-specific characteristics"""
        from app.datasets.real_dataset_manager import RealDatasetManager
        
        print(f"🔍 Loading REAL dataset for {algorithm}...")
        
        # Use real dataset manager
        real_manager = RealDatasetManager()
        
        try:
            # Get algorithm-specific real dataset
            X_train, X_test, y_train, y_test = real_manager.download_algorithm_dataset(algorithm)
            
            dataset_info = real_manager.get_dataset_info(algorithm)
            print(f"📊 Dataset: {dataset_info.get('name', 'Unknown')}")
            print(f"🎯 Domain: {dataset_info.get('domain', 'Software Metrics')}")
            print(f"📈 Ratio: {dataset_info.get('ratio', 'Unknown')}")
            
            return X_train, X_test, y_train, y_test
            
        except Exception as e:
            print(f"❌ Error loading real dataset for {algorithm}: {e}")
            print(f"🔄 Falling back to algorithm-specific synthetic data...")
            
            # Fallback to synthetic with different characteristics
            algorithm_seeds = {
                'random_forest': 42,
                'gradient_boosting': 123,
                'xgboost': 456,
                'svm': 789,
                'logistic_regression': 321
            }
            
            seed = algorithm_seeds.get(algorithm, 42)
            np.random.seed(seed)
            
            print(f"Generating algorithm-specific synthetic dataset for {algorithm} with seed {seed}...")
            
            # Algorithm-specific data characteristics for fallback
            if algorithm == 'random_forest':
                # Random Forest works well with diverse feature ranges
                optimized_count, unoptimized_count = 350, 450
            elif algorithm == 'gradient_boosting':
                # Gradient Boosting prefers balanced datasets
                optimized_count, unoptimized_count = 400, 400
            elif algorithm == 'xgboost':
                # XGBoost handles larger datasets well
                optimized_count, unoptimized_count = 450, 350
            elif algorithm == 'svm':
                # SVM works well with smaller, clean datasets
                optimized_count, unoptimized_count = 300, 300
            elif algorithm == 'logistic_regression':
                # Logistic Regression prefers balanced linear separable data
                optimized_count, unoptimized_count = 380, 420
            else:
                optimized_count, unoptimized_count = 400, 400
            
            return self.generate_dataset(optimized_count, unoptimized_count, test_size=0.2)
    
    def save_algorithm_dataset(self, X_train: np.ndarray, X_test: np.ndarray, 
                               y_train: np.ndarray, y_test: np.ndarray,
                               algorithm: str = "random_forest") -> str:
        """Save dataset specific to an algorithm"""
        model_dir = "app/models/saved_models"
        os.makedirs(model_dir, exist_ok=True)
        filepath = os.path.join(model_dir, f"{algorithm}_dataset.npz")
        np.savez(filepath, X_train=X_train, X_test=X_test, y_train=y_train, y_test=y_test)
        print(f"✓ Dataset for {algorithm} saved to {filepath}")
        return filepath
    
    @staticmethod
    def load_dataset(filepath: str = "app/models/saved_models/dataset.npz") -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Load dataset from file"""
        data = np.load(filepath)
        return data['X_train'], data['X_test'], data['y_train'], data['y_test']
    
    @staticmethod
    def load_algorithm_dataset(algorithm: str = "random_forest") -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """Load dataset specific to an algorithm"""
        filepath = f"app/models/saved_models/{algorithm}_dataset.npz"
        if os.path.exists(filepath):
            data = np.load(filepath)
            return data['X_train'], data['X_test'], data['y_train'], data['y_test']
        else:
            raise FileNotFoundError(f"Dataset for algorithm '{algorithm}' not found at {filepath}")
    
    def get_feature_names(self):
        """Get names of features"""
        return [
            'LOC',                    # Lines of Code
            'Complexity',             # Cyclomatic Complexity
            'Dependencies',           # Number of Dependencies
            'Functions',              # Number of Functions
            'Classes',                # Number of Classes
            'Comments',               # Number of Comment Lines
            'Complexity/LOC',         # Complexity per Line of Code
            'Comment Ratio',          # Comments / LOC
            'Functions/Class'         # Functions per Class
        ]


if __name__ == "__main__":
    # Test dataset generation
    generator = DatasetGenerator()
    X_train, X_test, y_train, y_test = generator.generate_dataset(
        optimized_count=400,
        unoptimized_count=400,
        test_size=0.2
    )
    
    # Save dataset
    generator.save_dataset(X_train, X_test, y_train, y_test)
    
    print("\nDataset Statistics:")
    print(f"Training set - Optimized: {np.sum(y_train)}, Unoptimized: {len(y_train) - np.sum(y_train)}")
    print(f"Test set - Optimized: {np.sum(y_test)}, Unoptimized: {len(y_test) - np.sum(y_test)}")
