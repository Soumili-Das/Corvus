async function extractContent() {
    // Clone document body to not mess with the actual page
    const clone = document.body.cloneNode(true);

    // Strip out scripts, styles, and nav elements
    const elementsToRemove = clone.querySelectorAll('script, style, nav, header, footer, iframe, noscript');
    elementsToRemove.forEach(el => el.remove());

    // Get inner text and clean up
    let text = clone.innerText || clone.textContent || "";
    text = text.replace(/\s+/g, ' ').trim();

    // Limit to roughly 15000 chars for token safety
    return text.substring(0, 15000);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract_content") {
        extractContent()
            .then(text => sendResponse({ text }))
            .catch(err => sendResponse({ text: "Error extracting text: " + err.message }));
        return true; // Keeps the messaging channel open for the async response
    }
    return false;
});
