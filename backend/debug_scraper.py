import asyncio
from playwright.async_api import async_playwright
import urllib.parse

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(storage_state="storage_state.json")
        page = await context.new_page()
        
        search_query = 'DevOps AND ("C2C" OR "Contract") AND ("Remote" OR "Hybrid" OR "USA")'
        encoded = urllib.parse.quote(search_query)
        url = f"https://www.linkedin.com/search/results/content/?keywords={encoded}&origin=GLOBAL_SEARCH_HEADER"
        
        await page.goto(url)
        await page.wait_for_timeout(5000)
        
        html = await page.content()
        with open("debug.html", "w", encoding="utf-8") as f:
            f.write(html)
        
        print("Saved debug.html")
        await browser.close()

asyncio.run(main())
