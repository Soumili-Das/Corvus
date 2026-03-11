from fastapi import APIRouter
from app.models.schemas import SummarizeRequest, SummarizeResponse
from app.services import rag

router = APIRouter()

@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_page(request: SummarizeRequest):
    summary = rag.summarize_with_rag(request.url, request.text, request.query or "")
    return SummarizeResponse(summary=summary)
