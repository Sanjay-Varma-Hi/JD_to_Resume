from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
import os
from fastapi.middleware.cors import CORSMiddleware
from database import connect_to_mongo, close_mongo_connection, get_db

app = FastAPI(title="LinkedIn DevOps Lead Scraper API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

@app.get("/")
async def root():
    return {"message": "LinkedIn Scraper API is running."}

@app.get("/api/linkedin-status")
async def get_linkedin_status():
    # Check if storage_state.json exists in current folder (backend/)
    import os
    state_exists = os.path.exists("storage_state.json")
    return {"logged_in": state_exists}

@app.get("/api/leads")
async def get_leads(db=Depends(get_db)):
    collection = db["raw_posts"]
    cursor = collection.find({})
    leads = []
    async for document in cursor:
        # Convert ObjectId and datetime to string for JSON serialization
        if "_id" in document:
            document["_id"] = str(document["_id"])
        if "scraped_at" in document and hasattr(document["scraped_at"], "isoformat"):
            document["scraped_at"] = document["scraped_at"].isoformat()
        leads.append(document)
    # Sort so 'new' status and highest score are first
    leads.sort(key=lambda x: (0 if x.get("status") == "new" else 1, -x.get("ai_score", 0)))
    return {"status": "ok", "total": len(leads), "leads": leads}

from pydantic import BaseModel

class StatusUpdate(BaseModel):
    status: str

@app.put("/api/leads/{lead_id}/status")
async def update_lead_status(lead_id: str, update: StatusUpdate, db=Depends(get_db)):
    collection = db["raw_posts"]
    
    # Try ObjectId first, fallback to string if UUID
    from bson import ObjectId
    try:
        query = {"_id": ObjectId(lead_id)}
    except:
        query = {"_id": lead_id}
        
    res = await collection.update_one(query, {"$set": {"status": update.status}})
    return {"status": "ok", "updated": res.modified_count}

class ResumeUpdate(BaseModel):
    resume: dict

@app.put("/api/leads/{lead_id}/resume")
async def update_lead_resume(lead_id: str, update: ResumeUpdate, db=Depends(get_db)):
    collection = db["raw_posts"]
    from bson import ObjectId
    try:
        query = {"_id": ObjectId(lead_id)}
    except:
        query = {"_id": lead_id}
        
    res = await collection.update_one(query, {"$set": {"generated_resume": update.resume}})
    return {"status": "ok", "updated": res.modified_count}

import subprocess

@app.post("/api/scrape")
async def trigger_scrape():
    # Run the scraper then the AI processor sequentially in the background
    cmd = "[ -d backend ] && cd backend; source venv/bin/activate && python scraper.py && python ai_processor.py"
    subprocess.Popen(cmd, shell=True)
    return {"status": "ok", "message": "Scraping and AI scoring started in background"}

# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)

@app.post("/api/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf") and not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only PDF or DOCX files are allowed.")
    
    # Extract extension
    ext = file.filename.split('.')[-1]
    file_path = f"uploads/secondary_resume.{ext}"
    
    # Save the file
    with open(file_path, "wb") as f:
        f.write(await file.read())
        
    # We'll save the exact filename in a small txt file so we know the extension later
    with open("uploads/current_resume_ext.txt", "w") as f:
        f.write(ext)
        
    return {"status": "ok", "message": f"Resume uploaded successfully! Emails will now attach this {ext.upper()} file."}

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

# Ensure env vars are loaded from .env.local
load_dotenv("../.env.local")

class EmailRequest(BaseModel):
    email_draft: str = None

@app.post("/api/leads/{lead_id}/send-email")
async def send_email(lead_id: str, request: EmailRequest = None, db=Depends(get_db)):
    collection = db["raw_posts"]
    from bson import ObjectId
    try:
        query = {"_id": ObjectId(lead_id)}
    except:
        query = {"_id": lead_id}
        
    lead = await collection.find_one(query)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    recruiter_email = lead.get("recruiter_email")
    
    # Use the user's edited draft if provided, otherwise fallback to the original AI draft
    email_draft = request.email_draft if request and request.email_draft else lead.get("email_draft")
    
    if not recruiter_email:
        raise HTTPException(status_code=400, detail="This lead does not have a recruiter email address associated with it.")
        
    if not email_draft:
        raise HTTPException(status_code=400, detail="No email draft found. Run AI processor first.")
        
    gmail_address = os.getenv("GMAIL_ADDRESS")
    gmail_password = os.getenv("GMAIL_APP_PASSWORD")
    
    if not gmail_address or not gmail_password or gmail_address == "your_email@gmail.com":
        raise HTTPException(status_code=500, detail="Gmail credentials are not configured in .env.local! Please add your email and App Password.")
        
    # Parse Subject and Body from the AI draft
    lines = email_draft.strip().split('\n')
    subject = "Interested in your open role"
    body = email_draft
    
    if lines and lines[0].lower().startswith("subject:"):
        subject = lines[0][8:].strip()
        body = '\n'.join(lines[1:]).strip()
        
    try:
        msg = MIMEMultipart()
        msg['From'] = gmail_address
        msg['To'] = recruiter_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        
        # Attach the universal secondary resume if it exists
        from email.mime.application import MIMEApplication
        if os.path.exists("uploads/current_resume_ext.txt"):
            with open("uploads/current_resume_ext.txt", "r") as f:
                ext = f.read().strip()
                
            resume_path = f"uploads/secondary_resume.{ext}"
            if os.path.exists(resume_path):
                with open(resume_path, "rb") as f:
                    part = MIMEApplication(f.read(), Name=f"Resume_Sanjay_Varma.{ext}")
                part['Content-Disposition'] = f'attachment; filename="Resume_Sanjay_Varma.{ext}"'
                msg.attach(part)
        
        # Connect and send
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(gmail_address, gmail_password)
        server.send_message(msg)
        server.quit()
        
        # Mark as contacted upon successful send
        await collection.update_one(query, {"$set": {"status": "contacted"}})
        
        return {"status": "ok", "message": f"Successfully sent email to {recruiter_email}!"}
    except Exception as e:
        print(f"Failed to send email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send email via SMTP: {str(e)}")
