"""
Script to scrape philosophical quotes from BrainyQuote using Selenium (browser automation)
This bypasses anti-scraping measures by using a real browser
Run with: python3 scripts/scrapePhilosophicalQuotesSelenium.py

Requirements:
pip install selenium webdriver-manager
"""

import os
import time
import hashlib
from dotenv import load_dotenv
from supabase import create_client, Client
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import re

# Load environment variables
load_dotenv()

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')

if not supabase_url or not supabase_key:
    print('❌ Missing required environment variables')
    print('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in .env file')
    exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

BASE_URL = 'https://www.brainyquote.com/profession/quotes-by-philosophers'

def setup_driver():
    """Setup Chrome driver with options"""
    chrome_options = Options()
    # Run in headless mode (no browser window)
    # chrome_options.add_argument('--headless')  # Uncomment to hide browser
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    
    # Add user agent
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    # Execute CDP command to prevent detection
    driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
        'source': '''
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            })
        '''
    })
    
    return driver

def generate_quote_hash(quote_text: str, author: str) -> str:
    """Generate a unique hash for a quote to prevent duplicates"""
    combined = f"{quote_text.strip().lower()}||{author.strip().lower()}"
    return hashlib.md5(combined.encode()).hexdigest()

def scrape_quotes_from_page(driver: webdriver.Chrome, url: str) -> list:
    """Scrape all quotes from a single page using Selenium"""
    print(f'📄 Scraping: {url}')
    
    try:
        driver.get(url)
        
        # Wait for page to load - look for any quote link
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "a[href*='/quotes/']"))
        )
        
        # Small delay to ensure all content is loaded
        time.sleep(2)
        
        quotes = []
        seen_on_page = set()
        
        # Find all grid items/containers that hold quotes
        # Try multiple possible container selectors
        containers = driver.find_elements(By.CSS_SELECTOR, ".grid-item, .m-brick, [class*='quote']")
        
        if not containers:
            # Fallback: find all quote and author links directly
            quote_links = driver.find_elements(By.CSS_SELECTOR, "a[href*='/quotes/']")
            
            for quote_link in quote_links:
                try:
                    quote_text = quote_link.text.strip()
                    
                    # Skip if contains unwanted text or too short
                    if not quote_text or len(quote_text) < 15 or 'Share this Quote' in quote_text:
                        continue
                    
                    # Clean the quote text
                    quote_text = quote_text.replace('Share this Quote', '').strip()
                    
                    # Find nearby author link
                    try:
                        # Look for author link after the quote
                        parent = quote_link.find_element(By.XPATH, "./ancestor::*[1]")
                        author_link = parent.find_element(By.CSS_SELECTOR, "a[href*='/authors/']")
                        author = author_link.text.strip()
                    except:
                        # Try sibling approach
                        try:
                            author_link = quote_link.find_element(By.XPATH, "./following::a[contains(@href, '/authors/')][1]")
                            author = author_link.text.strip()
                        except:
                            continue
                    
                    if author and quote_text and len(author) > 2:
                        quote_key = f"{quote_text[:50]}||{author}"
                        if quote_key not in seen_on_page:
                            seen_on_page.add(quote_key)
                            quotes.append({
                                'quote_text': quote_text,
                                'author': author,
                                'source_url': url
                            })
                except Exception as e:
                    continue
        else:
            # Process containers
            for container in containers:
                try:
                    # Find quote link in container
                    quote_link = container.find_element(By.CSS_SELECTOR, "a[href*='/quotes/']")
                    quote_text = quote_link.text.strip().replace('Share this Quote', '').strip()
                    
                    if not quote_text or len(quote_text) < 15:
                        continue
                    
                    # Find author link in container
                    author_link = container.find_element(By.CSS_SELECTOR, "a[href*='/authors/']")
                    author = author_link.text.strip()
                    
                    if author and quote_text and len(author) > 2:
                        quote_key = f"{quote_text[:50]}||{author}"
                        if quote_key not in seen_on_page:
                            seen_on_page.add(quote_key)
                            quotes.append({
                                'quote_text': quote_text,
                                'author': author,
                                'source_url': url
                            })
                except Exception as e:
                    continue
        
        print(f'  ✅ Found {len(quotes)} unique quotes')
        return quotes
        
    except Exception as e:
        print(f'❌ Error scraping page: {e}')
        return []

def get_total_pages(driver: webdriver.Chrome, base_url: str) -> int:
    """Determine the total number of pages to scrape"""
    try:
        driver.get(base_url)
        
        # Wait for pagination to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "pagination"))
        )
        
        time.sleep(2)
        
        # Find all pagination links
        pagination = driver.find_element(By.CLASS_NAME, "pagination")
        page_links = pagination.find_elements(By.TAG_NAME, "a")
        
        page_numbers = []
        for link in page_links:
            href = link.get_attribute('href')
            if href and 'quotes-by-philosophers_' in href:
                match = re.search(r'_(\d+)$', href)
                if match:
                    page_numbers.append(int(match.group(1)))
        
        return max(page_numbers) if page_numbers else 1
    except Exception as e:
        print(f'⚠️  Could not determine total pages: {e}')
        return 18  # Default to 18 pages

def upload_quotes_to_supabase(quotes: list) -> tuple:
    """Upload quotes to Supabase, skipping duplicates"""
    inserted_count = 0
    skipped_count = 0
    
    for quote in quotes:
        quote_hash = generate_quote_hash(quote['quote_text'], quote['author'])
        
        try:
            # Check if quote already exists
            result = supabase.table('philosophical_quotes').select('id').eq('quote_hash', quote_hash).execute()
            
            if result.data and len(result.data) > 0:
                skipped_count += 1
                continue
            
            # Insert new quote
            data = {
                'quote_text': quote['quote_text'],
                'author': quote['author'],
                'source_url': quote['source_url'],
                'quote_hash': quote_hash
            }
            
            supabase.table('philosophical_quotes').insert(data).execute()
            inserted_count += 1
            
        except Exception as e:
            print(f'❌ Error inserting quote: {e}')
            print(f'   Quote: "{quote["quote_text"][:50]}..." by {quote["author"]}')
    
    return inserted_count, skipped_count

def scrape_single_page_with_fresh_browser(url: str) -> list:
    """Open a fresh browser, scrape one page, then close"""
    driver = None
    try:
        driver = setup_driver()
        quotes = scrape_quotes_from_page(driver, url)
        return quotes
    except Exception as e:
        print(f'❌ Error scraping page: {e}')
        return []
    finally:
        if driver:
            driver.quit()
            time.sleep(2)  # Wait before opening next browser

def main():
    """Main function to scrape all pages and upload quotes"""
    print('🌐 Starting BrainyQuote scraper (Selenium)...\n')
    print('📝 Note: Opening fresh browser for each page to bypass Cloudflare\n')
    
    try:
        # Determine total pages using a fresh browser session
        print('🚀 Checking total pages...')
        driver = setup_driver()
        total_pages = get_total_pages(driver, BASE_URL)
        driver.quit()
        print(f'📚 Total pages to scrape: {total_pages}\n')
        time.sleep(3)
        
        all_quotes = []
        
        # Scrape page 1 (base URL)
        print('🔄 Opening fresh browser for page 1...')
        quotes = scrape_single_page_with_fresh_browser(BASE_URL)
        all_quotes.extend(quotes)
        
        # Scrape remaining pages with fresh browser for each
        for page_num in range(2, total_pages + 1):
            print(f'🔄 Opening fresh browser for page {page_num}...')
            page_url = f'{BASE_URL}_{page_num}'
            quotes = scrape_single_page_with_fresh_browser(page_url)
            all_quotes.extend(quotes)
            
            # Longer delay between pages to avoid triggering rate limits
            time.sleep(4)
        
        print(f'\n📊 Total quotes scraped: {len(all_quotes)}')
        
        # Upload to Supabase
        print('\n💾 Uploading quotes to Supabase...')
        inserted, skipped = upload_quotes_to_supabase(all_quotes)
        
        print(f'\n✅ Complete!')
        print(f'   Inserted: {inserted} new quotes')
        print(f'   Skipped: {skipped} duplicates')
        print(f'   Total: {inserted + skipped} quotes processed')
        
    except Exception as e:
        print(f'\n❌ Error: {e}')

if __name__ == '__main__':
    main()
