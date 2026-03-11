from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from dotenv import load_dotenv

from app.services.ml_models import phishing_sentry, embedding_extractor
from app.api.router import api_router

load_dotenv()

app = FastAPI(title="Corvus Extension API")
app.add_middleware(GZipMiddleware, minimum_size=500)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    phishing_sentry.load()
    embedding_extractor.load()

app.include_router(api_router)
