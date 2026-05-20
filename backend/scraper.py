import asyncio
import os
import json
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
        # Sort by latest (date_posted) and filter by past 24 hours
        search_url = f"https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords={encoded_keyword}&origin=GLOBAL_SEARCH_HEADER&sortBy=%22date_posted%22"
        await page.goto(search_url)
        
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
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(3000)
            
            html = await page.content()
            soup = BeautifulSoup(html, "html.parser")
            post_elements = soup.find_all('div', attrs={"data-urn": True})
            
            current_total = len(post_elements)
            print(f"Scroll {scroll_attempts}/{max_scrolls} - Found {current_total} posts in DOM so far...")
            
            if current_total == previous_post_count:
                print("No more posts loading. Reached the end of the feed.")
                break
                
            previous_post_count = current_total
        
        print("Parsing posts...")
        # Only grab elements that actually have a data-urn (the true post containers)
        post_elements = soup.find_all('div', attrs={"data-urn": True})
        
        extracted_posts = []
        seen_urls = set()
        
        for idx, post in enumerate(post_elements):
            try:
                # 1. Author Name
                author_elem = post.find('span', class_=lambda x: x and 'update-components-actor__name' in x)
                author_name = author_elem.get_text(strip=True).split('\n')[0] if author_elem else "Unknown Recruiter"
                
                # 2. Post Text
                text_elem = post.find('div', class_=lambda x: x and 'update-components-text' in x)
                post_text = text_elem.get_text(separator='\n', strip=True) if text_elem else ""
                
                if not post_text:
                    continue

                # 3. True Post URL
                # The most reliable way is to extract the data-urn attribute and construct the URL
                post_url = "No URL"
                post_urn = post.get('data-urn')
                
                if not post_urn:
                    # Sometimes it's on an inner element
                    urn_elem = post.find(attrs={"data-urn": True})
                    if urn_elem:
                        post_urn = urn_elem.get('data-urn')
                
                if not post_urn:
                    # Fallback: Regex search the entire HTML block of this post
                    import re
                    match = re.search(r'urn:li:activity:\d+', str(post))
                    if match:
                        post_urn = match.group(0)
                        
                if post_urn:
                    post_url = f"https://www.linkedin.com/feed/update/{post_urn}/"
                else:
                    # Final Fallback to looking for links
                    links = post.find_all('a', href=True)
                    for link in links:
                        href = link['href']
                        if 'urn:li:activity' in href or '/posts/' in href:
                            post_url = href.split('?')[0] # Clean tracking params
                            if post_url.startswith('/'):
                                post_url = "https://www.linkedin.com" + post_url
                            break
                
                if post_url == "No URL":
                    # Debug: dump this post to a file to inspect
                    with open("failed_post.html", "w", encoding="utf-8") as f:
                        f.write(str(post))
                    print("--- FAILED TO FIND URL - Saved to failed_post.html ---")
                    
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
