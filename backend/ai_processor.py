import os
import json
import asyncio
from openai import AsyncOpenAI
from dotenv import load_dotenv
from database import connect_to_mongo, close_mongo_connection, get_db

# Load from the parent directory's .env.local since that's where the user keeps it
load_dotenv("../.env.local")

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

if not DEEPSEEK_API_KEY:
    print("WARNING: DEEPSEEK_API_KEY not found in environment.")

# Initialize OpenAI client with DeepSeek base URL
client = AsyncOpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com/v1"
)

SYSTEM_PROMPT = """
You are an expert technical recruiter AI. Your job is to analyze LinkedIn job posts for DevOps/SRE roles.
The user is a candidate with 10+ years of experience looking for C2C/Contract roles that are Remote, Hybrid, or In-person WITHIN the USA.

Extract the following information from the provided job description and return it as a JSON object:
{
    "is_devops_or_sre": boolean,
    "years_experience_mentioned": integer or null,
    "is_c2c_or_contract": boolean,
    "is_usa_allowed": boolean (true if remote anywhere in USA, or specific USA location),
    "recruiter_email": string or null (extract any email address found in the text, otherwise null),
    "required_skills": [list of strings],
    "ai_score": integer (0 to 100 representing how well it matches: DevOps, 10+ years, C2C, USA),
    "ai_summary": "1-2 sentence summary of the role",
    "email_draft": "Draft an email using EXACTLY the following template. DO NOT USE ANY BRACKETS [ ] OR PLACEHOLDERS IN YOUR FINAL OUTPUT. If you know the recruiter's name, use it (e.g., 'Hi John,'). If you do not know the name, use 'Hi Hiring Team,'. For the subject, write a real subject line. Template:\n\nSubject: Interested in the <Role Name> Role\n\nHi <Recruiter Name or Hiring Team>,\n\nI am writing to express my interest in the <Role Name> role you have available. With over 10 years of experience in DevOps and SRE, I am available immediately for C2C opportunities across the USA. I would love to discuss how my skills align with your requirements.\n\nBest regards,\nSanjay Varma\n+1 5109603865"
}

Rules:
- Be strict with the AI score. Deduct heavily if it's full-time (W2), outside the USA, or junior level.
- Ensure the output is strictly valid JSON without markdown blocks.
"""

async def process_unscored_leads():
    await connect_to_mongo()
    db = get_db()
    collection = db["raw_posts"]
    
    # Find posts that haven't been scored yet (process up to 1000 at a time)
    unscored_posts = await collection.find({"ai_score": {"$exists": False}}).to_list(length=1000)
    
    if not unscored_posts:
        print("No unscored posts found. Everything is up to date!")
        await close_mongo_connection()
        return

    print(f"Found {len(unscored_posts)} posts to process with AI...")

    for post in unscored_posts:
        description = post.get("full_description", "")
        if not description:
            continue
            
        print(f"Processing post: {post['post_url']}...")
        
        try:
            response = await client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Analyze this job post:\n\n{description}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            
            ai_content = response.choices[0].message.content
            parsed_data = json.loads(ai_content)
            
            # Update the document
            update_data = {
                "is_devops": parsed_data.get("is_devops_or_sre", False),
                "experience_range": str(parsed_data.get("years_experience_mentioned", "")),
                "is_c2c": parsed_data.get("is_c2c_or_contract", False),
                "is_remote": parsed_data.get("is_usa_allowed", False),
                "recruiter_email": parsed_data.get("recruiter_email", None),
                "required_skills": parsed_data.get("required_skills", []),
                "ai_score": parsed_data.get("ai_score", 0),
                "ai_summary": parsed_data.get("ai_summary", ""),
                "email_draft": parsed_data.get("email_draft", "")
            }
            
            # Determine status based on score
            if update_data["ai_score"] >= 70:
                update_data["status"] = "new"
            else:
                update_data["status"] = "ignored"
                
            await collection.update_one(
                {"_id": post["_id"]},
                {"$set": update_data}
            )
            print(f"  -> Scored: {update_data['ai_score']}/100. Status: {update_data['status']}")
            
        except Exception as e:
            print(f"Error processing post {post['post_url']}: {e}")
            
    print("Finished AI processing!")
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(process_unscored_leads())
