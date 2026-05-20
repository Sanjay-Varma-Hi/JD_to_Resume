from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class RecruiterContact(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None

class LeadStatus(str):
    NEW = "new"
    EMAIL_FOUND = "email_found"
    CONTACTED = "contacted"
    IGNORED = "ignored"

class JobLeadBase(BaseModel):
    post_url: str
    job_title: str
    company_name: Optional[str] = None
    location: Optional[str] = None
    is_remote: bool = False
    is_c2c: bool = False
    experience_range: Optional[str] = None
    required_skills: List[str] = []
    full_description: str
    
    # Recruiter Info
    recruiter: Optional[RecruiterContact] = None
    
    # AI Scoring
    ai_score: int = 0  # 0 to 100
    ai_summary: Optional[str] = None
    email_draft: Optional[str] = None

class JobLeadCreate(JobLeadBase):
    pass

class JobLeadInDB(JobLeadBase):
    id: str = Field(alias="_id")
    status: str = LeadStatus.NEW
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
