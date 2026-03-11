import chromadb
from google import genai
import os
from .ml_models import embedding_extractor
import json

client = chromadb.Client()

def chunk_text(text: str, chunk_size: int = 600) -> list[str]:
    return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]

def store_and_retrieve(url_id: str, text: str, query: str) -> str:
    collection_name = f"doc_{abs(hash(url_id))}"
    try:
        collection = client.get_collection(collection_name)
    except Exception:
        collection = client.create_collection(collection_name)
    
    if collection.count() == 0:
        chunks = chunk_text(text)
        if not chunks: return ""
        collection.add(
            embeddings=embedding_extractor.encode(chunks),
            documents=chunks,
            ids=[f"chunk_{i}" for i in range(len(chunks))]
        )
    
    query_embedding = embedding_extractor.encode([query])[0]
    results = collection.query(query_embeddings=[query_embedding], n_results=min(3, collection.count()))
    if results['documents'] and len(results['documents']) > 0:
        return "\n".join(results['documents'][0])
    return ""

def get_gemini_keys() -> list[str]:
    keys = []
    for key_name in ["GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3"]:
        val = os.getenv(key_name)
        if val:
            if ',' in val:
                keys.extend([k.strip() for k in val.split(',') if k.strip()])
            else:
                keys.append(val.strip())
    return list(dict.fromkeys(keys))

def summarize_with_rag(url: str, text: str, query: str) -> str:
    context = store_and_retrieve(url, text, query)
    keys = get_gemini_keys()
    
    if not keys: return "[Error: GEMINI_API_KEY not found]"
    
    prompt = f"Context:\n{context}\n\nQuery:\n{query}\n\nRespond to the query based on the context concisely."
    last_error = ""
    for api_key in keys:
        try:
            g_client = genai.Client(api_key=api_key)
            response = g_client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
            return response.text
        except Exception as e:
            print(f"Gemini API Error with a key limit/issue: {e}. Trying next...")
            last_error = str(e)
            
    return f"[Error with Gemini API after trying all keys: {last_error}]"


def fallback_organize(tabs: list[dict]) -> str:
    categories = {"Neon Grind": [], "Data Scavenge": [], "Corp Splurge": [], "Void Stream": [], "Stray Nodes": []}
    for t in tabs:
        t_str = (t.get('title', '') + " " + t.get('url', '')).lower()
        if any(x in t_str for x in ['github', 'stackoverflow', 'cloud', 'aws', 'mail', 'jira']):
            categories["Neon Grind"].append(t['id'])
        elif any(x in t_str for x in ['wiki', 'search', 'google', 'blog', 'article', 'news']):
            categories["Data Scavenge"].append(t['id'])
        elif any(x in t_str for x in ['amazon', 'ebay', 'shop', 'cart', 'store', 'buy', 'pay']):
            categories["Corp Splurge"].append(t['id'])
        elif any(x in t_str for x in ['youtube', 'twitch', 'netflix', 'spotify', 'video']):
            categories["Void Stream"].append(t['id'])
        else:
            categories["Stray Nodes"].append(t['id'])
    return json.dumps({k: v for k, v in categories.items() if v})

def organize_tabs(tabs: list[dict]) -> str:
    keys = get_gemini_keys()
    if not keys: return fallback_organize(tabs)
        
    tab_data = "\n".join([f"ID: {t['id']} | Title: {t['title']} | URL: {t['url']}" for t in tabs])
    prompt = "Group the following browser tabs into aggressive, short, cyber-goth categories. Return pure JSON.\n\n" + tab_data
    
    for api_key in keys:
        try:
            g_client = genai.Client(api_key=api_key)
            response = g_client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
            return response.text.replace('```json', '').replace('```', '').strip()
        except Exception as e:
            print(f"Gemini API Error with a key limit/issue: {e}. Trying next...")
            
    print("All Gemini API keys exhausted. Using local fallback grouping.")
    return fallback_organize(tabs)
