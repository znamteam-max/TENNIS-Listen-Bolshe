export const activeMatches = [
  {
    matchId: "pCanaMiD",
    winlineUrl: "https://winline.ru/stavki/sport/tennis/wta/rolan_garros/15909164",
    player1Name: "Potapova A.",
    player2Name: "Kalinskaya A."
  }
];

export function getActiveMatches() {
  return activeMatches
    .map((item) => ({
      matchId: String(item.matchId || "").trim(),
      winlineUrl: String(item.winlineUrl || "").trim(),
      player1Name: String(item.player1Name || "").trim(),
      player2Name: String(item.player2Name || "").trim()
    }))
    .filter((item) => item.matchId && item.winlineUrl);
}
