const params = new URLSearchParams(window.location.search);
const config = {
  source: params.get("source") || "/data/live-match-demo.json",
  news: params.get("news") || "/data/news-demo.json",
  panel: params.get("panel") || "stats",
  poll: Number(params.get("poll") || 3000),
  guides: params.get("guides") === "1"
};

const refs = {
  overlay: document.querySelector("#overlay"),
  matchTitle: document.querySelector("#matchTitle"),
  matchStage: document.querySelector("#matchStage"),
  tournament: document.querySelector("#tournament"),
  statsPanel: document.querySelector("#statsPanel"),
  chatPanel: document.querySelector("#chatPanel"),
  statsList: document.querySelector("#statsList"),
  statUpdated: document.querySelector("#statUpdated"),
  playerHome: document.querySelector("#playerHome"),
  playerAway: document.querySelector("#playerAway"),
  homeName: document.querySelector("#playerHome .player-name"),
  awayName: document.querySelector("#playerAway .player-name"),
  homeGames: document.querySelector("#homeGames"),
  awayGames: document.querySelector("#awayGames"),
  homePoint: document.querySelector("#homePoint"),
  awayPoint: document.querySelector("#awayPoint"),
  tickerTrack: document.querySelector("#tickerTrack")
};

const asText = (value, fallback = "") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

const setPanelMode = () => {
  refs.statsPanel.hidden = config.panel === "chat";
  refs.chatPanel.hidden = config.panel !== "chat";
};

const setGuides = () => {
  refs.overlay.classList.toggle("guides", config.guides);
};

const fetchJson = async (url) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
};

const statRows = (sections) => {
  const wanted = ["Service", "Return", "Points", "Games"];
  const filtered = sections.filter((section) => wanted.includes(section.section)).slice(0, 4);
  return filtered
    .map((section) => {
      const rows = section.rows
        .slice(0, section.section === "Points" ? 4 : 3)
        .map(
          (row) => `
            <div class="stat-row">
              <span>${asText(row.home, "-")}</span>
              <span>${row.label}</span>
              <span>${asText(row.away, "-")}</span>
            </div>
          `
        )
        .join("");
      return `
        <div class="stat-section">
          <div class="stat-section-title">${section.section}</div>
          ${rows}
        </div>
      `;
    })
    .join("");
};

const renderMatch = (data) => {
  const home = data.players?.find((player) => player.side === "home") || data.players?.[0] || {};
  const away = data.players?.find((player) => player.side === "away") || data.players?.[1] || {};

  refs.matchTitle.textContent = data.match?.title || `${asText(home.name, "Home")} - ${asText(away.name, "Away")}`;
  refs.matchStage.textContent = [data.match?.stage, data.match?.duration].filter(Boolean).join(" · ");
  refs.tournament.textContent = data.match?.tournament || data.match?.stage || "Live tennis";

  refs.homeName.textContent = asText(home.shortName || home.name, "Home");
  refs.awayName.textContent = asText(away.shortName || away.name, "Away");
  refs.homeGames.textContent = asText(data.score?.games?.home, "0");
  refs.awayGames.textContent = asText(data.score?.games?.away, "0");
  refs.homePoint.textContent = asText(data.score?.current?.home, "");
  refs.awayPoint.textContent = asText(data.score?.current?.away, "");

  refs.playerHome.classList.toggle("serving", Boolean(home.isServing));
  refs.playerAway.classList.toggle("serving", Boolean(away.isServing));

  refs.statsList.innerHTML = statRows(data.statistics || []) || '<div class="chat-line muted">Статистика пока недоступна.</div>';
  refs.statUpdated.textContent = new Date(data.generatedAt || Date.now()).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
};

const renderNews = (items) => {
  const list = Array.isArray(items) ? items : items.items || [];
  refs.tickerTrack.textContent = list.map((item) => item.title || item).filter(Boolean).join("   •   ");
};

const refreshMatch = async () => {
  try {
    renderMatch(await fetchJson(config.source));
  } catch (error) {
    refs.matchStage.textContent = `Ошибка данных: ${error.message}`;
  }
};

const refreshNews = async () => {
  try {
    renderNews(await fetchJson(config.news));
  } catch {
    refs.tickerTrack.textContent = "Новости временно недоступны";
  }
};

setPanelMode();
setGuides();
refreshMatch();
refreshNews();
window.setInterval(refreshMatch, Math.max(config.poll, 1000));
window.setInterval(refreshNews, 60000);
