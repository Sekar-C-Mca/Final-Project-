import requests
import json
import time
from typing import Dict, Any, Optional
from datetime import datetime

class RiskAPIClient:
    """Client for communicating with the ML backend API"""
    
    def __init__(self, api_url: str, project_id: str):
        self.api_url = api_url.rstrip('/')
        self.project_id = project_id
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.analysis_count = 0
        self.last_request_time = None
    
    def analyze_code(self, module_name: str, file_path: str, 
                    code_content: str, language: str = "python") -> Optional[Dict[str, Any]]:
        """
        Send code to ML backend for analysis with retry logic
        
        Args:
            module_name: Name of the module/file
            file_path: Full file path
            code_content: Source code content
            language: Programming language
            
        Returns:
            Analysis result dict or None if failed
        """
        # Rate limiting
        if self.last_request_time and time.time() - self.last_request_time < 0.5:
            time.sleep(0.5)
        
        self.last_request_time = time.time()
        
        for attempt in range(3):  # Retry up to 3 times
            try:
                payload = {
                    "project_id": self.project_id,
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
                    result = response.json()
                    self.analysis_count += 1
                    risk_emoji = {"low": "🟢", "medium": "🟡", "high": "🔴"}
                    emoji = risk_emoji.get(result.get('risk_level', 'unknown'), "⚪")
                    print(f"✓ {emoji} {module_name}: {result.get('risk_level', 'unknown').upper()} risk ({result.get('risk_score', 0):.1%})")
                    return result
                elif response.status_code == 400:
                    print(f"✗ Invalid request for {module_name}: {response.text}")
                    return None  # Don't retry on 400
                else:
                    print(f"✗ Analysis failed (attempt {attempt + 1}): {response.status_code}")
                    if attempt < 2:  # Wait before retry
                        time.sleep(1)
                        
            except requests.exceptions.ConnectionError:
                print(f"✗ Connection failed (attempt {attempt + 1}) to {self.api_url}")
                if attempt < 2:
                    time.sleep(2)
            except requests.exceptions.Timeout:
                print(f"✗ Request timeout (attempt {attempt + 1})")
                if attempt < 2:
                    time.sleep(1)
            except Exception as e:
                print(f"✗ Unexpected error: {e}")
                return None
                
        print(f"✗ Failed to analyze {module_name} after 3 attempts")
        return None
    
    def get_project_statistics(self) -> Optional[Dict[str, Any]]:
        """Get comprehensive project risk statistics"""
        try:
            response = self.session.get(
                f"{self.api_url}/results/{self.project_id}",
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                # Calculate statistics from results
                stats = {
                    'total_modules': len(data),
                    'analysis_count': self.analysis_count,
                    'risk_distribution': {'low': 0, 'medium': 0, 'high': 0}
                }
                
                for result in data:
                    risk = result.get('risk_level', 'unknown')
                    if risk in stats['risk_distribution']:
                        stats['risk_distribution'][risk] += 1
                        
                return stats
            return None
        except Exception as e:
            print(f"✗ Error getting statistics: {e}")
            return None
    
    def health_check(self) -> bool:
        """Check if ML backend is healthy and accessible"""
        try:
            # Try root endpoint first
            response = self.session.get(f"{self.api_url.replace('/api', '')}/", timeout=5)
            if response.status_code == 200:
                return True
            
            # Try health endpoint
            response = self.session.get(f"{self.api_url}/health", timeout=5)
            return response.status_code == 200
        except Exception as e:
            print(f"Health check failed: {e}")
            return False
    
    def get_recent_results(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get recent analysis results for the project"""
        try:
            response = self.session.get(
                f"{self.api_url}/results/{self.project_id}?limit={limit}",
                timeout=10
            )
            if response.status_code == 200:
                return response.json()[-limit:]  # Get last N results
            return []
        except Exception as e:
            print(f"✗ Error getting recent results: {e}")
            return []
