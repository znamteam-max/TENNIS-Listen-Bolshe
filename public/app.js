const state = {
  matches: [],
  selected: null
};

const refs = {
  matchList: document.querySelector("#matchList"),
  panelMode: document.querySelector("#panelMode"),
  pollMs: document.querySelector("#pollMs"),
  showGuides: document.querySelector("#showGuides"),
  overlayUrl: document.querySelector("#overlayUrl"),
  openOverlay: document.querySelector("#openOverlay"),
  copyUrl: document.querySelector("#copyUrl")
};

const buildOverlayUrl = () => {
  if (!state.selected) return `${location.origin}/overlay.html`;

  const params = new URLSearchParams();
  params.set("source", state.selected.source);
  params.set("news", state.selected.news || "/data/news-demo.json");
  params.set("panel", refs.panelMode.value);
  params.set("poll", refs.pollMs.value || "3000");
  if (refs.showGuides.checked) params.set("guides", "1");

  return `${location.origin}/overlay.html?${params.toString()}`;
};

const syncOutput = () => {
  const url = buildOverlayUrl();
  refs.overlayUrl.value = url;
  refs.openOverlay.href = url;
};

const renderMatches = () => {
  refs.matchList.textContent = "";

  for (const match of state.matches) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `match-option${state.selected?.id === match.id ? " active" : ""}`;
    button.innerHTML = `
      <span class="match-title">${match.title}</span>
      <span class="match-meta">${match.provider} · ${match.description}</span>
    `;
    button.addEventListener("click", () => {
      state.selected = match;
      renderMatches();
      syncOutput();
    });
    refs.matchList.append(button);
  }
};

const loadMatches = async () => {
  const response = await fetch("/data/matches.json", { cache: "no-store" });
  state.matches = await response.json();
  state.selected = state.matches[0] || null;
  renderMatches();
  syncOutput();
};

refs.panelMode.addEventListener("change", syncOutput);
refs.pollMs.addEventListener("input", syncOutput);
refs.showGuides.addEventListener("change", syncOutput);
refs.copyUrl.addEventListener("click", async () => {
  await navigator.clipboard.writeText(refs.overlayUrl.value);
  refs.copyUrl.textContent = "Скопировано";
  window.setTimeout(() => {
    refs.copyUrl.textContent = "Скопировать URL";
  }, 1400);
});

loadMatches().catch((error) => {
  refs.matchList.textContent = `Не удалось загрузить matches.json: ${error.message}`;
});
