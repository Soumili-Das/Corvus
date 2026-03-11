import os
from transformers import AutoTokenizer
from optimum.onnxruntime import ORTModelForSequenceClassification
from sentence_transformers import SentenceTransformer
import torch
import numpy as np

PHISHING_MODEL_ID = "ealvaradob/bert-finetuned-phishing"
EMBEDDING_MODEL_ID = "all-MiniLM-L6-v2"
ONNX_MODEL_DIR = "./onnx_phishing_model"

class PhishingModel:
    def __init__(self):
        self.tokenizer = None
        self.model = None

    def load(self):
        print(f"Loading phishing model from {ONNX_MODEL_DIR}...")
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(ONNX_MODEL_DIR)
            self.model = ORTModelForSequenceClassification.from_pretrained(ONNX_MODEL_DIR)
            print("Phishing model loaded from ONNX.")
        except Exception as e:
            print(f"ONNX model not found, loading from HF and exporting... {e}")
            self.tokenizer = AutoTokenizer.from_pretrained(PHISHING_MODEL_ID)
            self.model = ORTModelForSequenceClassification.from_pretrained(PHISHING_MODEL_ID, export=True)
            self.tokenizer.save_pretrained(ONNX_MODEL_DIR)
            self.model.save_pretrained(ONNX_MODEL_DIR)
            print("Phishing model exported to ONNX successfully.")
        
    def predict(self, url: str) -> float:
        if not self.model or not self.tokenizer:
            self.load()
        inputs = self.tokenizer(url, return_tensors="pt", truncation=True, padding=True)
        outputs = self.model(**inputs)
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1).detach().numpy()[0]
        return float(probs[1]) if len(probs) >= 2 else float(probs[0])

class EmbeddingModel:
    def __init__(self):
        self.model = None

    def load(self):
        print(f"Loading embedding model {EMBEDDING_MODEL_ID}...")
        self.model = SentenceTransformer(EMBEDDING_MODEL_ID)
        print("Embedding model loaded successfully.")

    def encode(self, texts: list[str]) -> list[list[float]]:
        if not self.model:
            self.load()
        return self.model.encode(texts).tolist()

phishing_sentry = PhishingModel()
embedding_extractor = EmbeddingModel()
