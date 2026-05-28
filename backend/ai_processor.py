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
    "is_hotlisted": boolean (true if the post is a hotlist post, e.g. bench sales recruiters marketing their list of candidates/hotlist, templates saying 'we have a hotlist of candidates', or vendor/bench list spam, rather than a standard job opening),
    "ai_summary": "1-2 sentence summary of the role",
    "hiring_for": "A clean 2-4 word job title representing what role they are hiring for (e.g. 'Senior DevOps Engineer' or 'SRE Engineer')",
    "email_draft": "Draft an attractive, customized email (approx 150-250 words) from the candidate to the recruiter. \nDO NOT USE ANY BRACKETS [ ] OR PLACEHOLDERS IN YOUR FINAL OUTPUT. If you know the recruiter's name, use it (e.g., 'Hi John,'). If you do not know the name, use 'Hi Hiring Team,'. \nDO NOT include any job URL or LinkedIn post link in the email.\nFormat the email as:\nSubject: <Attractive, eye-catching Subject Line matching the role, C2C availability, and immediate start, e.g., 'Senior DevOps Engineer (C2C) - Immediate Availability for Open Role'>\n\nHi <Name/Hiring Team>,\n\nI noticed your recent job posting on LinkedIn for the <hiring_for> position and wanted to reach out.\n\nI am Sanjay Varma, a Senior DevOps/SRE Engineer with 10+ years of experience, immediately available for C2C opportunities.\n\n<A paragraph highlighting 2-3 key technical alignments (e.g. Kubernetes, Terraform, CI/CD, AWS, Azure, Ansible, monitoring) between the Candidate's Base Resume and the specific requirements of the Job Description. Be specific, attractive, and direct. If the Candidate's Base Resume is not provided, mention standard DevOps/SRE strengths.>\n\nI would love to connect to discuss how I can add value to your team.\n\nBest regards,\nSanjay Varma\n+1 5109603865"
}

Rules:
- Be strict with the AI score. Deduct heavily if it's full-time (W2), outside the USA, or junior level.
- Crucial: NEVER mention in the email draft that a resume, CV, or LinkedIn details are attached (as the user might choose to send the email without attachments).
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

    # Fetch candidate's base resume
    base_resume_text = ""
    try:
        base_resume_doc = await db["baseresumes"].find_one()
        if base_resume_doc:
            base_resume_text = base_resume_doc.get("content", "")
    except Exception as e:
        print(f"Note: Could not fetch base resume from db: {e}")

    print(f"Found {len(unscored_posts)} posts to process with AI...")

    for post in unscored_posts:
        description = post.get("full_description", "")
        if not description:
            continue
            
        print(f"Processing post: {post['post_url']}...")
        
        try:
            job_url = post.get("post_url", "")
            user_content = f"Analyze this job post:\nJob URL: {job_url}\n\n{description}"
            if base_resume_text:
                user_content += f"\n\nCandidate's Base Resume:\n\n{base_resume_text}"
                
            response = await client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_content}
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
                "is_hotlisted": parsed_data.get("is_hotlisted", False),
                "ai_summary": parsed_data.get("ai_summary", ""),
                "email_draft": parsed_data.get("email_draft", "")
            }
            
            # If author_name is "Unknown Recruiter" or empty, set it to the role title extracted by DeepSeek
            current_author = post.get("author_name", "Unknown Recruiter")
            if current_author == "Unknown Recruiter" or not current_author:
                update_data["author_name"] = parsed_data.get("hiring_for", "Unknown Recruiter")
            
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
