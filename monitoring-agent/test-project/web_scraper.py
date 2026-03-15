#!/usr/bin/env python3
"""
Web scraper for data analysis
Multi-function utility with complex logic
"""

import requests
import json
import time
import logging
from bs4 import BeautifulSoup
from typing import List, Dict, Optional

class WebScraper:
    """Advanced web scraping utility"""
    
    def __init__(self, base_url: str, timeout: int = 30):
        self.base_url = base_url
        self.timeout = timeout
        self.session = requests.Session()
        self.scraped_data = []
        self.error_count = 0
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def fetch_page(self, url: str) -> Optional[str]:
        """Fetch a single page with enhanced error handling and retries"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = self.session.get(url, timeout=self.timeout)
                if response.status_code == 200:
                    return response.text
                else:
                    self.logger.warning(f"HTTP {response.status_code} for {url} (attempt {attempt + 1})")
                    if attempt == max_retries - 1:
                        self.error_count += 1
                    return None
            except requests.RequestException as e:
                self.logger.error(f"Request failed for {url}: {e} (attempt {attempt + 1})")
                if attempt == max_retries - 1:
                    self.error_count += 1
                time.sleep(2)  # Wait before retry
        return None
    
    def parse_content(self, html: str, selectors: Dict[str, str]) -> Dict[str, str]:
        """Parse HTML content using CSS selectors with advanced filtering"""
        soup = BeautifulSoup(html, 'html.parser')
        result = {}
        
        for key, selector in selectors.items():
            elements = soup.select(selector)
            
            # Enhanced parsing logic with nested conditions
            if elements:
                if len(elements) == 1:
                    text = elements[0].get_text(strip=True)
                    # Additional processing based on content type
                    if key == 'price' and '$' in text:
                        # Price parsing logic
                        result[key] = float(text.replace('$', '').replace(',', ''))
                    elif key == 'date' and '-' in text:
                        # Date parsing logic
                        try:
                            result[key] = time.strptime(text, '%Y-%m-%d')
                        except ValueError:
                            result[key] = text
                    elif key == 'rating' and '/5' in text:
                        # Rating extraction
                        rating_val = text.split('/5')[0]
                        try:
                            result[key] = float(rating_val)
                        except ValueError:
                            result[key] = text
                    else:
                        result[key] = text
                else:
                    # Multi-element processing with filtering
                    processed_items = []
                    for elem in elements:
                        item_text = elem.get_text(strip=True)
                        # Filter out empty or short items
                        if len(item_text) > 2:
                            if key == 'links':
                                # Extract href for links
                                href = elem.get('href')
                                if href:
                                    processed_items.append({'text': item_text, 'url': href})
                            else:
                                processed_items.append(item_text)
                    result[key] = processed_items if processed_items else None
            else:
                # Log missing elements for debugging
                self.logger.debug(f"No elements found for selector: {selector}")
                result[key] = None
                
        return result
    
    def scrape_multiple(self, urls: List[str], selectors: Dict[str, str]) -> List[Dict]:
        """Scrape multiple URLs with batch processing"""
        results = []
        
        for i, url in enumerate(urls):
            self.logger.info(f"Processing {i+1}/{len(urls)}: {url}")
            
            # Rate limiting
            if i > 0:
                time.sleep(1)
            
            html = self.fetch_page(url)
            if html:
                parsed_data = self.parse_content(html, selectors)
                parsed_data['source_url'] = url
                parsed_data['scraped_at'] = time.time()
                results.append(parsed_data)
            
            # Error threshold check
            if self.error_count > len(urls) * 0.3:  # 30% error rate
                self.logger.error("High error rate detected, stopping...")
                break
                
        return results
    
    def save_data(self, data: List[Dict], filename: str):
        """Save scraped data to JSON file"""
        try:
            with open(filename, 'w') as f:
                json.dump(data, f, indent=2)
            self.logger.info(f"Data saved to {filename}")
        except Exception as e:
            self.logger.error(f"Failed to save data: {e}")

def analyze_performance(scraper: WebScraper) -> Dict[str, float]:
    """Analyze scraper performance metrics"""
    total_requests = len(scraper.scraped_data) + scraper.error_count
    success_rate = len(scraper.scraped_data) / total_requests if total_requests > 0 else 0
    
    return {
        'success_rate': success_rate,
        'total_requests': total_requests,
        'errors': scraper.error_count,
        'avg_response_time': 1.2  # Mock average
    }

if __name__ == "__main__":
    # Example usage
    scraper = WebScraper("https://example.com")
    
    urls = ["https://example.com/page1", "https://example.com/page2"]
    selectors = {
        'title': 'h1',
        'description': '.description',
        'links': 'a'
    }
    
    results = scraper.scrape_multiple(urls, selectors)
    scraper.save_data(results, 'scraped_data.json')
    
    # Performance analysis
    perf_stats = analyze_performance(scraper)
    print(f"Scraping completed with {perf_stats['success_rate']:.1%} success rate")