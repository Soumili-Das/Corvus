# Corvus Extension: Deployment & Next Steps

This document outlines the exact steps needed to finalize the project for production and upload the extension to the Chrome Web Store.

## 1. Local Testing & Verification
Before deploying to production, verify that the entire suite works correctly on your local machine:

**Step A: Ignite the Backend**
1. Open a terminal and navigate to the backend folder: `cd /home/miku/Desktop/crow/backend`
2. Ensure dependencies are installed and `.env` has your `GEMINI_API_KEY`.
3. Pre-load models (only needs to be done once): `python setup.py`
4. Start the FastAPI server: `uvicorn app.main:app --reload`
5. *Verification:* The terminal should show `Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)` without any model load errors.

**Step B: Load the Extension**
1. Open a second terminal and build the extension: `cd /home/miku/Desktop/crow/extension && npm run build`
2. Open Chrome and navigate to `chrome://extensions/`.
3. Toggle **Developer mode** on (top right corner).
4. Click **Load unpacked** (top left corner).
5. Select the `/home/miku/Desktop/crow/extension/` directory. 
6. Pin the black Corvus icon to your toolbar.

**Step C: Test the Features**
1. **Phishing Shield:** Navigate to a random http/https site. Open the Chrome DevTools for the site, and verify the network tab or console. The extension will silently ping `http://127.0.0.1:8000/scan`. If you visit a known phishing site, it should flash the red/black "DANGER" overlay.
2. **Speedometer:** Click the Corvus icon. The popup should show a risk percentage gauge filling up in red based on the current page's score.
3. **Tab Organizer:** Open 4-5 completely different tabs (e.g. Wikipedia, YouTube, GitHub, a news site). Click the Corvus icon and press "GROUP TABS". Wait ~1-3 seconds. The UI should display Cyber-Goth groupings (e.g., `>> INTEL`, `>> CODE`). Press "CONFIRM GROUPS" to watch Chrome automatically color-code and group your tabs.
4. **RAG Summarizer:** Go to a long Wikipedia article. Click the Corvus icon, then "SUMMARIZE PAGE". The backend will extract chunks, create embeddings, and stream a concise summary into the popup window from Gemini.

## 2. Hardening & Stress Testing
- **Check Backend Latency:** The ONNX DistilBERT model currently runs efficiently on CPU. Test if the endpoint latency is acceptable for your users. If not, consider moving it to a GPU-backed cloud instance.

## 2. Production Build for Backend
- You are currently running the backend locally via `uvicorn`. To deploy to production:
  1. Pick a platform (e.g., Render, Railway, AWS EC2, or DigitalOcean Droplet).
  2. Setup a `Dockerfile` for the backend.
  3. Ensure the environment has enough RAM (at least 2GB-4GB) to hold the ONNX and ChromaDB models in memory.
  4. Serve via `gunicorn -k uvicorn.workers.UvicornWorker app.main:app`.
  5. **Crucial:** Once deployed, update the `BACKEND_URL` mapped in `extension/src/config.ts` to your new `https://api.yourdomain.com` endpoint.

## 3. Chrome Web Store Preparation
- **Icons & Branding:** Ensure your `extensionlogo.png` looks crisp across all sizes (16px, 48px, 128px) as defined in the `manifest.json`.
- **Privacy Policy:** Because Corvus accesses tab strings, URLs, and active tab content, Google will require a comprehensive Privacy Policy stating exactly what data is sent to your backend and how it's handled. (Host this on a simple GitHub Pages site).
- **Compile Final Extension Asset:**
  1. Navigate to the `extension/` directory.
  2. Run `npm run build` to output the final TypeScript bundles into the `dist/` folder.
  3. Verify `.DS_Store` or redundant `node_modules/` aren't slipping into the directory (though `npm run build` safely targets `dist/`).
  4. Zip the entire `extension/` directory (excluding `node_modules` and `src`).

## 4. Web Store Upload Process
1. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Pay the one-time $5 developer registration fee if you haven't already.
3. Click "New Item" and upload the compiled `.zip` file of your extension.
4. Fill out the Store Listing details:
   - Provide a bold, Cyber-Goth themed description.
   - Upload high-res promotional tiles.
   - Link to your official Privacy Policy.
5. Submit for review! (Currently, MV3 reviews take approx 1-3 business days).
