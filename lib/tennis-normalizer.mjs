export const normalizePercent = (value) => String(value || "").trim();

export const sideLabel = (side) => {
  if (side === "home") return "Home";
  if (side === "away") return "Away";
  return "";
};
