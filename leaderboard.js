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

const renderRows = (entries, userEntryId = null) => {
  rowsEl.innerHTML = "";
  entries.forEach((entry, index) => {
    const row = document.createElement("div");
    const isUserEntry = userEntryId && entry.id === userEntryId;
    const rank = index + 1;
    row.className = isUserEntry ? "leaderboard-row user-entry" : "leaderboard-row";
    row.innerHTML = `
      <span class="rank-number">#${rank}</span>
      <span>${entry.nickname || "Anonymous"}${isUserEntry ? ' (You)' : ''}</span>
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

// Get user's entry ID from URL if present
const urlParams = new URLSearchParams(window.location.search);
const userEntryId = urlParams.get('entry');

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

    const top10 = sorted.slice(0, 10);

    // If user just submitted, find their rank
    let userRank = null;
    let userEntry = null;
    if (userEntryId) {
      const userIndex = sorted.findIndex(entry => entry.id === userEntryId);
      if (userIndex !== -1) {
        userRank = userIndex + 1;
        userEntry = sorted[userIndex];
      }
    }

    statusEl.textContent = "";
    tableEl.hidden = false;
    renderRows(top10, userEntryId);

    // Show user's rank if they're outside top 10 (add as last row in table)
    if (userRank && userRank > 10) {
      const row = document.createElement("div");
      row.className = "leaderboard-row user-entry";
      row.innerHTML = `
        <span class="rank-number">#${userRank}</span>
        <span>${userEntry.nickname || "Anonymous"} (You)</span>
        <span>${userEntry.totalTargets ?? 0}</span>
        <span>${userEntry.levelsCompleted ?? 0}</span>
        <span>${formatDate(userEntry.createdAt)}</span>
      `;
      rowsEl.appendChild(row);
    }
  });
}
