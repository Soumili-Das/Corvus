from fastapi import APIRouter
from app.api.endpoints import scan, organize, summarize

api_router = APIRouter()
api_router.include_router(scan.router, tags=["Phishing"])
api_router.include_router(organize.router, tags=["Core AI"])
api_router.include_router(summarize.router, tags=["Core AI"])
