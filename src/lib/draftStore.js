const DB_NAME = "agreement_drafts";
const STORE_NAME = "drafts";
const LEGACY_KEY_PREFIX = "draft_";

export const isDraftId = (id) => typeof id === "string" && id.startsWith(LEGACY_KEY_PREFIX);

const openDatabase = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const runInStore = async (mode, operation) => {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const request = operation(transaction.objectStore(STORE_NAME));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
};

// JSON turned File objects into {} in old localStorage drafts, so those uploads must read as missing.
const clearLostUpload = (slot) => (slot?.uploaded && !slot.file?.name ? { uploaded: false, file: null } : slot);

const migrateLegacyDrafts = async () => {
  const legacyKeys = Object.keys(localStorage).filter((key) => key.startsWith(LEGACY_KEY_PREFIX));
  for (const key of legacyKeys) {
    let draft;
    try {
      draft = JSON.parse(localStorage.getItem(key));
    } catch {
      continue;
    }
    const uploadStatuses = Object.fromEntries(
      Object.entries(draft.uploadStatuses || {}).map(([type, slot]) => [type, clearLostUpload(slot)])
    );
    await saveDraft({
      ...draft,
      id: key,
      uploadStatuses,
      clientDraftFile: clearLostUpload(draft.clientDraftFile),
    });
    localStorage.removeItem(key);
  }
};

export const saveDraft = (draft) => runInStore("readwrite", (store) => store.put(draft));

export const deleteDraft = (id) => runInStore("readwrite", (store) => store.delete(id));

export const listDrafts = async () => {
  await migrateLegacyDrafts();
  const drafts = await runInStore("readonly", (store) => store.getAll());
  return drafts.sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));
};
