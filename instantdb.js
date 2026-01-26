import { init, id } from "@instantdb/core";

const envAppId =
  typeof import.meta !== "undefined" ? import.meta.env?.VITE_INSTANTDB_APP_ID : "";
const windowAppId =
  typeof window !== "undefined" ? window.INSTANTDB_APP_ID : "";
const appId = (envAppId || windowAppId || "").trim();

export const hasInstantDb = Boolean(appId);
export const db = hasInstantDb ? init({ appId }) : null;
export { id };

export function ensureInstantDb() {
  if (!hasInstantDb) {
    console.warn(
      "InstantDB app ID missing. Set VITE_INSTANTDB_APP_ID in .env or window.INSTANTDB_APP_ID."
    );
  }
  return hasInstantDb;
}
