from fastapi import APIRouter
from app.models.schemas import ScanRequest, ScanResponse
from app.services.ml_models import phishing_sentry

router = APIRouter()

@router.post("/scan", response_model=ScanResponse)
async def scan_url(request: ScanRequest):
    risk = phishing_sentry.predict(request.url)
    return ScanResponse(risk_score=risk)
