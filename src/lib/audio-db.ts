const DB = "bpom-sound";
const STORE = "audio";

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function saveAudio(key: string, file: Blob) {
  const db = await open();
  return new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(file, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
    tx.addEventListener("complete", () => db.close());
  });
}

export async function getAudio(key: string): Promise<Blob | undefined> {
  const db = await open();
  return new Promise((res, rej) => {
    const r = db.transaction(STORE).objectStore(STORE).get(key);
    r.onsuccess = () => { res(r.result as Blob | undefined); db.close(); };
    r.onerror = () => rej(r.error);
  });
}

export async function deleteAudio(key: string) {
  const db = await open();
  return new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => { db.close(); res(); };
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  });
}

// Restore every supported sound slot in a single transaction, leaving the old data intact on failure.
export async function replaceAudio(files: Record<string, Blob>) {
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const key of ["day-1", "day-2", "day-3", "day-4", "leaving-warn", "leaving-out"]) {
      const file = files[key];
      if (file) store.put(file, key);
      else store.delete(key);
    }
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}
