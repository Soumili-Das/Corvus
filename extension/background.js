const BACKEND_URL = "http://127.0.0.1:8000";

function injectWarningOverlay() {
    if (document.getElementById('corvus-danger-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'corvus-danger-overlay';

    // Deep red, pure black styling - NO Emojis
    overlay.innerHTML = `
        <div style="text-align: center; font-family: 'JetBrains Mono', monospace; color: #FF0000;">
            <h1 style="font-size: 5rem; margin-bottom: 20px; font-weight: bold; letter-spacing: 5px;">! DANGER !</h1>
            <p style="font-size: 2rem;">PHISHING RISK EXCEEDS SECURE THRESHOLD</p>
            <p style="font-size: 1rem; margin-bottom: 40px; color: #cc0000;">The backend model indicates this URL visually or structurally matches known malicious destinations.</p>
            <button id="corvus-dismiss" style="background: #FF0000; color: #000000; border: none; padding: 15px 30px; font-size: 1.5rem; cursor: pointer; font-weight: bold; font-family: 'JetBrains Mono', monospace; box-shadow: 0 0 15px #FF0000;">PROCEED AT OWN RISK</button>
        </div>
    `;

    // Cyber-goth danger overlay style
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
    overlay.style.color = '#FF0000';
    overlay.style.zIndex = '2147483647';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.backdropFilter = 'blur(5px)';

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const dismissBtn = document.getElementById('corvus-dismiss');
    if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            overlay.remove();
            document.body.style.overflow = 'auto';
        });
    }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
        try {
            const response = await fetch(`${BACKEND_URL}/scan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: tab.url, metadata: "" })
            });
            const data = await response.json();

            if (data.risk_score > 0.85) {
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: injectWarningOverlay
                });
            }
        } catch (e) {
            console.error("Phishing scan failed:", e);
        }
    }
});
