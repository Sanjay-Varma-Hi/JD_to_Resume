import asyncio
import os
import json
import urllib.parse
import hashlib
from playwright.async_api import async_playwright, Page
from bs4 import BeautifulSoup

STATE_FILE = "storage_state.json"

class LinkedInScraper:
    def __init__(self):
        self.browser = None
        self.context = None

    async def init_session(self):
        """
        Initializes the Playwright session.
        If storage_state.json does not exist, it opens a visible browser and waits for manual login.
        If it exists, it loads the session state and proceeds headlessly (or visibly if desired).
        """
        print("Starting Playwright...")
        playwright = await async_playwright().start()

        if not os.path.exists(STATE_FILE):
            print(f"[{'*'*10}] NO SESSION FOUND [{'*'*10}]")
            print("Launching visible browser for manual login.")
            print("Please log in to LinkedIn. The script will wait until you reach the feed.")
            
            self.browser = await playwright.chromium.launch(headless=False)
            self.context = await self.browser.new_context()
            page = await self.context.new_page()
            
            await page.goto("https://www.linkedin.com/login")
            
            # Wait for the user to log in and reach the feed
            print("Waiting for login... (waiting for navigation to /feed/)")
            try:
                await page.wait_for_url("**/feed/**", timeout=0) # Wait indefinitely until logged in
            except Exception as e:
                print("Error waiting for login:", e)
                
            print("Login successful! Saving session state...")
            await self.context.storage_state(path=STATE_FILE)
            print(f"Session saved to {STATE_FILE}. You can restart the app to run headless.")
            
            await self.browser.close()
            return False # Return False to indicate we just performed setup
        
        else:
            print("Session found! Launching browser with saved state.")
            # For debugging, we can set headless=False, but in prod it should be True
            headless = os.getenv("HEADLESS_MODE", "True").lower() == "true"
            self.browser = await playwright.chromium.launch(headless=headless)
            self.context = await self.browser.new_context(storage_state=STATE_FILE)
            return True

    async def scrape_linkedin_posts(self, keyword="DevOps hiring", max_posts=10, existing_urls=None):
        """
        Navigates to LinkedIn Search and extracts posts related to the keyword.
        """
        if not self.context:
            print("Session not initialized.")
            return []
            
        existing_urls = existing_urls or set()

        page = await self.context.new_page()
        print(f"Navigating to LinkedIn Search for: {keyword}...")
        
        # URL encode keyword
        import urllib.parse
        encoded_keyword = urllib.parse.quote(keyword)
        # Filter by past 24 hours and sort by Relevance (default) to maximize matching posts
        search_url = f"https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords={encoded_keyword}&origin=GLOBAL_SEARCH_HEADER"
        await page.goto(search_url)
        
        # Debug: Save screenshot of the loaded page to inspect what's happening
        try:
            import os
            os.makedirs("debug_screenshots", exist_ok=True)
            clean_name = keyword.replace(' ', '_').replace('"', '').replace('(', '').replace(')', '').replace('/', '_')
            screenshot_path = f"debug_screenshots/{clean_name}.png"
            await page.screenshot(path=screenshot_path)
            print(f"DEBUG: Saved screenshot to {screenshot_path}")
        except Exception as e:
            print(f"DEBUG: Failed to save screenshot: {e}")
        
        # Check if LinkedIn redirected us to the login page (session expired)
        if "login" in page.url or "sign in" in (await page.title()).lower():
            print("\n" + "="*50)
            print("🚨 SESSION EXPIRED! LinkedIn logged you out.")
            print("="*50)
            print("Deleting the old, broken session file...")
            if os.path.exists("storage_state.json"):
                os.remove("storage_state.json")
            print("Please run `python scraper.py` again immediately.")
            print("A visible browser will open so you can log back in securely.")
            print("="*50 + "\n")
            await page.close()
            return []
        
        # Wait for the search results to load
        print("Waiting for posts to load...")
        await page.wait_for_timeout(5000)
        
        # Dynamic Scrolling: keep scrolling until we hit the bottom of the feed
        print("Scrolling to find all posts...")
        scroll_attempts = 0
        max_scrolls = 30
        previous_post_count = 0
        
        while scroll_attempts < max_scrolls:
            scroll_attempts += 1
            
            # Scroll the workspace element if it exists, otherwise fall back to window
            await page.evaluate("""
                async () => {
                    const el = document.getElementById('workspace');
                    if (el) {
                        for (let y = el.scrollTop; y < el.scrollHeight; y += 400) {
                            el.scrollTop = y;
                            await new Promise(resolve => setTimeout(resolve, 80));
                        }
                    } else {
                        window.scrollTo(0, document.body.scrollHeight);
                    }
                }
            """)
            await page.wait_for_timeout(3000)
            
            html = await page.content()
            soup = BeautifulSoup(html, "html.parser")
            
            # Count unique post cards in DOM
            post_cards = soup.find_all('div', componentkey=lambda x: x and 'expanded' in x and 'FeedType' in x)
            current_total = len(post_cards)
            print(f"Scroll {scroll_attempts}/{max_scrolls} - Found {current_total} posts in DOM so far...")
            
            if current_total == previous_post_count:
                print("No more posts loading. Reached the end of the feed.")
                break
                
            previous_post_count = current_total
        
        print("Parsing posts...")
        # Re-parse the final HTML content
        html = await page.content()
        soup = BeautifulSoup(html, "html.parser")
        
        post_cards = soup.find_all('div', componentkey=lambda x: x and 'expanded' in x and 'FeedType' in x)
        extracted_posts = []
        seen_urls = set()
        
        for idx, card in enumerate(post_cards):
            try:
                # 1. Extract Author Name (prioritize /in/ profile name, then group name)
                profile_links = card.find_all('a', href=lambda x: x and ('/in/' in x or 'linkedin.com/in/' in x))
                author_name = "Unknown Recruiter"
                for p_link in profile_links:
                    name_text = p_link.get_text(strip=True)
                    if name_text:
                        author_name = name_text.split('\n')[0].split('•')[0].strip()
                        break
                        
                if author_name == "Unknown Recruiter":
                    # Try group name as author
                    group_links = card.find_all('a', href=lambda x: x and '/groups/' in x)
                    for g_link in group_links:
                        name_text = g_link.get_text(strip=True)
                        if name_text and name_text != "Join" and "reactions" not in name_text.lower():
                            author_name = name_text.split('\n')[0].strip()
                            break
                
                # 2. Extract Post Text
                text_elems = card.find_all(['span', 'p'])
                post_text = ""
                max_len = 0
                
                for elem in text_elems:
                    elem_text = elem.get_text(separator='\n', strip=True)
                    if "Follow" in elem_text or "Join" in elem_text or elem_text == author_name:
                        continue
                    if len(elem_text) > max_len and not elem_text.startswith("Feed post"):
                        max_len = len(elem_text)
                        post_text = elem_text
                
                if not post_text:
                    continue
                
                # 3. Extract URL or Fallback
                post_url = None
                links = card.find_all('a', href=True)
                for link in links:
                    href = link['href']
                    if "highlightedUpdateUrn=" in href:
                        parsed_url = urllib.parse.urlparse(href)
                        params = urllib.parse.parse_qs(parsed_url.query)
                        urn_param = params.get('highlightedUpdateUrn')
                        if urn_param:
                            post_url = f"https://www.linkedin.com/feed/update/{urn_param[0]}/"
                            break
                            
                if not post_url:
                    # Fallback to profile URL with unique query hash
                    profile_link = card.find('a', href=lambda x: x and ('/in/' in x or 'linkedin.com/in/' in x))
                    if profile_link:
                        profile_url = profile_link['href'].split('?')[0]
                        text_hash = hashlib.md5(post_text.encode('utf-8')).hexdigest()[:16]
                        post_url = f"{profile_url}?post_hash={text_hash}"
                    else:
                        # Generic fallback if no profile link exists
                        text_hash = hashlib.md5(post_text.encode('utf-8')).hexdigest()[:16]
                        post_url = f"https://www.linkedin.com/feed/update/fallback-{text_hash}/"
                
                # Prevent duplicates
                if post_url in seen_urls or post_url in existing_urls:
                    continue
                
                seen_urls.add(post_url)
                print(f"--- Found NEW Post by {author_name} ---")
                
                lead_data = {
                    "post_url": post_url,
                    "author_name": author_name,
                    "full_description": post_text,
                }
                extracted_posts.append(lead_data)
                
            except Exception as e:
                print(f"Error parsing a post: {e}")
                continue
                
        print(f"Successfully extracted {len(extracted_posts)} posts.")
        await page.close()
        return extracted_posts

    async def close(self):
        if self.browser:
            await self.browser.close()

if __name__ == "__main__":
    from database import connect_to_mongo, close_mongo_connection, get_db
    import uuid
    from datetime import datetime
    
    async def main():
        # Connect to DB
        await connect_to_mongo()
        db = get_db()
        
        # Cleanup posts older than 7 days that have not been contacted
        from datetime import timedelta
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        cleanup_res = await db["raw_posts"].delete_many({
            "scraped_at": {"$lt": seven_days_ago},
            "status": {"$ne": "contacted"}
        })
        if cleanup_res.deleted_count > 0:
            print(f"Cleanup: Removed {cleanup_res.deleted_count} uncontacted posts older than 7 days to save database space.")
        
        scraper = LinkedInScraper()
        is_ready = await scraper.init_session()
        
        if is_ready:
            print("Fetching existing URLs from database...")
            collection = db["raw_posts"]
            cursor = collection.find({}, {"post_url": 1})
            existing_urls = set()
            async for doc in cursor:
                if "post_url" in doc:
                    existing_urls.add(doc["post_url"])
            print(f"Found {len(existing_urls)} existing posts in DB. Scraper will ignore these.")

            print("Running post extraction for multiple roles...")
            roles = [
                '"Senior DevOps Engineer"',
                '"Senior SRE Engineer"',
                '"DevOps Engineer"',
                '"SRE Engineer"',
                '"Platform Engineer"',
                '"Cloud Infrastructure Engineer"',
                '"Kubernetes Engineer"',
                '"Infrastructure Automation Engineer"',
                '("CI/CD Engineer" OR "Release Engineer")'
            ]
            
            all_posts = []
            for role in roles:
                search_query = f'{role} AND ("C2C" OR "Contract") AND ("Remote" OR "Hybrid" OR "USA")'
                print(f"\n{'='*50}\nScraping Role: {role}\n{'='*50}")
                
                try:
                    posts = await scraper.scrape_linkedin_posts(keyword=search_query, existing_urls=existing_urls)
                    # Inject the role into the post data so the UI can filter by it
                    clean_role = role.replace('"', '').replace('(', '').replace(')', '')
                    for p in posts:
                        p["search_role"] = clean_role
                        existing_urls.add(p["post_url"])
                    all_posts.extend(posts)
                except Exception as e:
                    print(f"Error scraping {role}: {e}")
            
            # Save to Database
            new_posts_count = 0
            
            for post in all_posts:
                post['scraped_at'] = datetime.utcnow()
                
                # Upsert based on post URL to prevent duplicates from ever being saved
                result = await collection.update_one(
                    {"post_url": post["post_url"]},
                    {"$setOnInsert": post},
                    upsert=True
                )
                
                # upserted_id is only present if a NEW document was created
                if result.upserted_id:
                    new_posts_count += 1
                
            print(f"Finished all roles! Found {len(all_posts)} total posts. Saved {new_posts_count} NEW posts to MongoDB!")
            await scraper.close()
        else:
            print("First-time setup complete. Please restart the script to begin scraping.")
            
        await close_mongo_connection()

    asyncio.run(main())
