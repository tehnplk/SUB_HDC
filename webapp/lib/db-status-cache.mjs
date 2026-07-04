let dbStatusPromise = null;
let dbStatusPayload = null;

export function resetDbStatusCache() {
  dbStatusPromise = null;
  dbStatusPayload = null;
}

export async function getDbStatusOnce(fetcher = globalThis.fetch) {
  if (dbStatusPayload) {
    return dbStatusPayload;
  }

  if (!dbStatusPromise) {
    dbStatusPromise = fetcher("/api/db-status")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to check database status");
        }
        return res.json();
      })
      .then((payload) => {
        dbStatusPayload = payload;
        return payload;
      })
      .catch((err) => {
        dbStatusPromise = null;
        throw err;
      });
  }

  return dbStatusPromise;
}
