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
            val = document["scraped_at"]
            if val.tzinfo is None:
                document["scraped_at"] = val.isoformat() + "Z"
            else:
                document["scraped_at"] = val.isoformat()
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
    # If running on Render, scraping is disabled to prevent LinkedIn blocking and resource exhaustion.
    if os.getenv("RENDER"):
        return {
            "status": "error", 
            "message": "Scraping on Render is disabled to bypass LinkedIn security. Please run 'python scraper.py && python ai_processor.py' locally on your machine, and your new leads will automatically sync to MongoDB Atlas!"
        }
    
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
    
    # 1. Enforce only ONE file: delete any existing fallback files to ensure replacement
    for existing_ext in ["pdf", "docx"]:
        old_file = f"uploads/secondary_resume.{existing_ext}"
        if os.path.exists(old_file):
            try:
                os.remove(old_file)
            except Exception as e:
                print(f"Error removing old attachment {old_file}: {e}")

    # Extract extension
    ext = file.filename.split('.')[-1]
    file_path = f"uploads/secondary_resume.{ext}"
    
    # Save the file
    with open(file_path, "wb") as f:
        f.write(await file.read())
        
    # We'll save the exact filename in a small txt file so we know the extension later
    with open("uploads/current_resume_ext.txt", "w") as f:
        f.write(ext)
        
    # Save metadata for UI display, preserving existing toggle setting if present
    import json
    from datetime import datetime
    attach_to_emails = True
    metadata_path = "uploads/resume_metadata.json"
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, "r") as f:
                old_metadata = json.load(f)
                attach_to_emails = old_metadata.get("attach_to_emails", True)
        except:
            pass

    metadata = {
        "original_filename": file.filename,
        "ext": ext,
        "uploaded_at": datetime.utcnow().isoformat(),
        "attach_to_emails": attach_to_emails
    }
    with open("uploads/resume_metadata.json", "w") as f:
        json.dump(metadata, f)
        
    return {"status": "ok", "message": f"Resume replaced successfully! Emails will now attach '{file.filename}'."}

@app.get("/api/current-resume")
async def get_current_resume():
    import json
    metadata_path = "uploads/resume_metadata.json"
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, "r") as f:
                metadata = json.load(f)
            # Verify the physical file exists
            file_path = f"uploads/secondary_resume.{metadata.get('ext')}"
            if os.path.exists(file_path):
                return {
                    "exists": True,
                    "filename": metadata.get("original_filename"),
                    "ext": metadata.get("ext"),
                    "uploaded_at": metadata.get("uploaded_at"),
                    "attach_to_emails": metadata.get("attach_to_emails", True)
                }
        except Exception as e:
            print(f"Error loading resume metadata: {e}")
            
    return {"exists": False, "filename": None, "ext": None, "uploaded_at": None, "attach_to_emails": True}

@app.post("/api/current-resume/toggle-attach")
async def toggle_attach(payload: dict):
    import json
    metadata_path = "uploads/resume_metadata.json"
    attach = payload.get("attach", True)
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, "r") as f:
                metadata = json.load(f)
            metadata["attach_to_emails"] = attach
            with open(metadata_path, "w") as f:
                json.dump(metadata, f)
            return {"status": "ok", "attach_to_emails": attach}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    raise HTTPException(status_code=404, detail="No resume uploaded yet.")

@app.delete("/api/delete-resume")
async def delete_resume():
    # Remove files
    files_to_remove = [
        "uploads/current_resume_ext.txt",
        "uploads/resume_metadata.json",
        "uploads/secondary_resume.pdf",
        "uploads/secondary_resume.docx"
    ]
    removed = []
    for f in files_to_remove:
        if os.path.exists(f):
            try:
                os.remove(f)
                removed.append(f)
            except Exception as e:
                print(f"Error removing {f}: {e}")
    return {"status": "ok", "message": "Global email attachment removed successfully.", "removed": removed}


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
        
        # Attach the universal secondary resume if enabled and exists
        should_attach = True
        metadata_path = "uploads/resume_metadata.json"
        print(f"DEBUG ATTACHMENT: Checking metadata path {metadata_path}")
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, "r") as f:
                    meta = json.load(f)
                print(f"DEBUG ATTACHMENT: Loaded metadata: {meta}")
                should_attach = meta.get("attach_to_emails", True)
            except Exception as e:
                print(f"DEBUG ATTACHMENT: Error reading metadata: {e}")
        else:
            print("DEBUG ATTACHMENT: Metadata file does not exist")
            
        print(f"DEBUG ATTACHMENT: final should_attach: {should_attach}")

        if should_attach:
            from email.mime.application import MIMEApplication
            if os.path.exists("uploads/current_resume_ext.txt"):
                with open("uploads/current_resume_ext.txt", "r") as f:
                    ext = f.read().strip()
                    
                resume_path = f"uploads/secondary_resume.{ext}"
                print(f"DEBUG ATTACHMENT: Attaching file from {resume_path}")
                if os.path.exists(resume_path):
                    with open(resume_path, "rb") as f:
                        part = MIMEApplication(f.read(), Name=f"Resume_Sanjay_Varma.{ext}")
                    part['Content-Disposition'] = f'attachment; filename="Resume_Sanjay_Varma.{ext}"'
                    msg.attach(part)
                else:
                    print("DEBUG ATTACHMENT: Resume file path does not exist physically")
            else:
                print("DEBUG ATTACHMENT: uploads/current_resume_ext.txt does not exist")
        else:
            print("DEBUG ATTACHMENT: Skipping attachment because should_attach is False")
        
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
        error_msg = str(e)
        if os.getenv("RENDER"):
            raise HTTPException(
                status_code=500,
                detail="Outbound SMTP (port 587) is blocked on Render's Free tier to prevent spam. Please run this app locally to send emails, or upgrade Render to open SMTP."
            )
        raise HTTPException(status_code=500, detail=f"Failed to send email via SMTP: {error_msg}")
