from pydantic import BaseModel
from typing import List, Optional

class ScanRequest(BaseModel):
    url: str
    metadata: Optional[str] = None

class ScanResponse(BaseModel):
    risk_score: float

class TabItem(BaseModel):
    id: int
    title: str
    url: str

class OrganizeRequest(BaseModel):
    tabs: List[TabItem]

class SummarizeRequest(BaseModel):
    url: str
    text: str
    query: Optional[str] = "Summarize the key points of this page."

class SummarizeResponse(BaseModel):
    summary: str
