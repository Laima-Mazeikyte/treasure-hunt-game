import { db, ensureInstantDb, hasInstantDb } from "./instantdb.js";

const statusEl = document.getElementById("leaderboard-status");
const tableEl = document.getElementById("leaderboard-table");
const rowsEl = document.getElementById("leaderboard-rows");

const formatDate = (timestamp) => {
  if (!timestamp) return "--";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const renderRows = (entries) => {
  rowsEl.innerHTML = "";
  entries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "leaderboard-row";
    row.innerHTML = `
      <span>${entry.nickname || "Anonymous"}</span>
      <span>${entry.totalTargets ?? 0}</span>
      <span>${entry.levelsCompleted ?? 0}</span>
      <span>${formatDate(entry.createdAt)}</span>
    `;
    rowsEl.appendChild(row);
  });
};

const renderEmpty = (message) => {
  statusEl.textContent = message;
  tableEl.hidden = true;
};

if (!hasInstantDb || !ensureInstantDb() || !db) {
  renderEmpty("Leaderboard is not configured yet.");
} else {
  db.subscribeQuery({ leaderboard_entries: {} }, (resp) => {
    if (resp.error) {
      renderEmpty("Could not load leaderboard.");
      return;
    }

    const entries = resp.data?.leaderboard_entries || [];
    if (!entries.length) {
      renderEmpty("No scores yet. Be the first!");
      return;
    }

    const sorted = [...entries].sort((a, b) => {
      const targetsDiff = (b.totalTargets || 0) - (a.totalTargets || 0);
      if (targetsDiff !== 0) return targetsDiff;
      const levelsDiff = (b.levelsCompleted || 0) - (a.levelsCompleted || 0);
      if (levelsDiff !== 0) return levelsDiff;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    statusEl.textContent = "";
    tableEl.hidden = false;
    renderRows(sorted);
  });
}
