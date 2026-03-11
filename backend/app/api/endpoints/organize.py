from fastapi import APIRouter
from app.models.schemas import OrganizeRequest
from app.services import rag
import json

router = APIRouter()

@router.post("/organize")
async def organize_tabs(request: OrganizeRequest):
    tabs_dict = [{"id": t.id, "title": t.title, "url": t.url} for t in request.tabs]
    result_json = rag.organize_tabs(tabs_dict)
    
    try:
        return json.loads(result_json)
    except json.JSONDecodeError:
        return {"error": "Failed to parse AI response as JSON", "raw": result_json}
