import argparse
from app.services.ml_models import phishing_sentry, embedding_extractor

if __name__ == "__main__":
    print("Pre-downloading and configuring models for Project Corvus...")
    phishing_sentry.load()
    embedding_extractor.load()
    print("Setup complete.")
