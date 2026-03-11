const BACKEND_URL = "http://127.0.0.1:8000";

async function checkRisk(url) {
  const res = await fetch(`${BACKEND_URL}/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: url }),
  });
  if (!res.ok) throw new Error("Backend Error");
  const data = await res.json();
  return data.risk_score;
}

async function organizeTabs(payload) {
  const res = await fetch(`${BACKEND_URL}/organize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tabs: payload }),
  });
  if (!res.ok) throw new Error("Backend Error");
  return await res.json();
}

async function summarizePage(url, text) {
  const res = await fetch(`${BACKEND_URL}/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, text }),
  });
  if (!res.ok) throw new Error("Backend Error");
  const data = await res.json();
  return data.summary;
}

function renderTabGroups(groupedJson, allTabs, container) {
  container.innerHTML = "";
  container.classList.remove("hidden");

  let confirmBtn = document.createElement("button");
  confirmBtn.className = "action-btn";
  confirmBtn.innerText = "Confirm Groups";
  confirmBtn.style.marginTop = "10px";

  for (const [category, ids] of Object.entries(groupedJson)) {
    let groupDiv = document.createElement("div");
    let title = document.createElement("div");
    title.style.fontWeight = "bold";
    title.style.marginTop = "10px";
    title.style.color = "var(--accent-cyan)";
    title.innerText = `>> ${category}`;
    groupDiv.appendChild(title);

    ids.forEach((id) => {
      const tabInfo = allTabs.find((t) => t.id == id);
      if (tabInfo) {
        let itemDiv = document.createElement("div");
        itemDiv.style.marginLeft = "10px";
        itemDiv.style.color = "var(--text-main)";
        itemDiv.innerText = tabInfo.title || "Unknown Tab";
        groupDiv.appendChild(itemDiv);
      }
    });
    container.appendChild(groupDiv);
  }

  confirmBtn.onclick = async () => {
    for (const [category, ids] of Object.entries(groupedJson)) {
      if (ids.length > 0) {
        try {
          const tabIdsToGroup = ids.map((i) => Number(i));
          const groupId = await chrome.tabs.group({ tabIds: tabIdsToGroup });
          await chrome.tabGroups.update(groupId, {
            title: category,
            color: "blue",
          });
        } catch (e) {
          console.error("Error grouping tabs:", e);
        }
      }
    }
    container.innerText = "Tabs Grouped.";
  };
  container.appendChild(confirmBtn);
}

document.addEventListener("DOMContentLoaded", async () => {
  let [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  const toggles = {
    tabOrganizerToggle: "btnOrganizeTabs",
    pageSummarizerToggle: "btnSummarize",
    phishingDetectorToggle: "btnForceScan",
  };

  Object.entries(toggles).forEach(([toggleId, btnId]) => {
    const toggle = document.getElementById(toggleId);
    const btn = document.getElementById(btnId);
    if (toggle && btn) {
      toggle.addEventListener("change", (e) => {
        btn.disabled = !e.target.checked;
        btn.style.opacity = e.target.checked ? "1" : "0.5";
        btn.style.cursor = e.target.checked ? "pointer" : "not-allowed";
      });
    }
  });

  const scanPhishing = async () => {
    const gaugeNeedle = document.getElementById("gaugeNeedle");
    const probLabel = document.getElementById("phishingProbabilityLabel");
    const details = document.getElementById("phishingDetails");

    if (!document.getElementById("phishingDetectorToggle").checked) return;

    if (activeTab && activeTab.url && activeTab.url.startsWith("http")) {
      try {
        if (probLabel) probLabel.innerText = "Analyzing...";

        const risk = await checkRisk(activeTab.url);
        const probPercent = (risk * 100).toFixed(1);

        if (gaugeNeedle) {
          const rotation = risk * 180 - 90;
          gaugeNeedle.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        }

        if (probLabel) {
          const riskText =
            risk > 0.85 ? "High Risk" : risk > 0.4 ? "Medium Risk" : "Low Risk";
          probLabel.innerText = `${probPercent}% - ${riskText}`;
          probLabel.style.color =
            risk > 0.85
              ? "var(--danger)"
              : risk > 0.4
                ? "#fbbf24"
                : "var(--accent-green)";
        }

        if (details) {
          details.classList.remove("hidden");
          details.innerHTML = `Analyzed URL: ${activeTab.url}`;
        }
      } catch (e) {
        if (probLabel) probLabel.innerText = "Backend Offline";
      }
    } else {
      if (probLabel) probLabel.innerText = "N/A - Not HTTP(s)";
    }
  };

  scanPhishing();

  const forceBtn = document.getElementById("btnForceScan");
  if (forceBtn) {
    forceBtn.addEventListener("click", scanPhishing);
  }

  let organizeTimeout;
  const orgBtn = document.getElementById("btnOrganizeTabs");
  if (orgBtn) {
    orgBtn.addEventListener("click", () => {
      if (!document.getElementById("tabOrganizerToggle").checked) return;

      clearTimeout(organizeTimeout);
      organizeTimeout = setTimeout(async () => {
        const container = document.getElementById("ragResults");
        if (!container) return;

        container.classList.remove("hidden");
        container.innerText = "Analyzing open tabs...";
        const allTabs = await chrome.tabs.query({ currentWindow: true });
        const payload = allTabs.map((t) => ({
          id: t.id,
          title: t.title,
          url: t.url,
        }));

        try {
          const grouped = await organizeTabs(payload);
          if (grouped.error) {
            container.innerText = grouped.error;
            return;
          }
          renderTabGroups(grouped, allTabs, container);
        } catch (e) {
          container.innerText = "Failed: Backend offline?";
        }
      }, 500);
    });
  }

  const sumBtn = document.getElementById("btnSummarize");
  if (sumBtn) {
    sumBtn.addEventListener("click", async () => {
      if (!document.getElementById("pageSummarizerToggle").checked) return;

      const windowEl = document.getElementById("summaryResults");
      if (!activeTab || !activeTab.url?.startsWith("http") || !activeTab.id) {
        if (windowEl)
          windowEl.innerText = "Cannot summarize: Not a valid HTTP page.";
        return;
      }
      if (!windowEl) return;

      windowEl.innerText = "Reading context...";

      try {
        chrome.tabs.sendMessage(
          activeTab.id,
          { action: "extract_content" },
          async (response) => {
            if (chrome.runtime.lastError || !response || !response.text) {
              windowEl.innerText = "Failed to extract text from page.";
              return;
            }

            windowEl.innerText = "Synthesizing AI summary...";
            try {
              const summary = await summarizePage(activeTab.url, response.text);
              windowEl.innerHTML = `<ul>${summary
                .split("\n")
                .filter((l) => l.trim())
                .map((l) => `<li>${l.replace("- ", "")}</li>`)
                .join("")}</ul>`;
            } catch (e) {
              windowEl.innerText = "Failed: Backend offline?";
            }
          },
        );
      } catch (e) {
        windowEl.innerText = "Failed script injection";
      }
    });
  }
});
