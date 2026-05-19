import type { AppState } from "./types";
import { parseStoredState } from "./storage";

const BACKUP_VERSION = 1;
const BACKUP_FILENAME = "reading-nook-library-backup.json";

export type LibraryBackupFile = {
  backupVersion: typeof BACKUP_VERSION;
  exportedAt: string;
  state: AppState;
};

export function buildLibraryBackup(state: AppState): LibraryBackupFile {
  return {
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    state,
  };
}

export function downloadLibraryBackup(state: AppState): void {
  const payload = buildLibraryBackup(state);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = BACKUP_FILENAME;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function parseLibraryBackupJson(raw: string): AppState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("File is not valid JSON.");
  }
  if (typeof parsed === "object" && parsed !== null && "state" in parsed) {
    const wrapped = parsed as { state: unknown };
    const stateRaw =
      typeof wrapped.state === "string" ? wrapped.state : JSON.stringify(wrapped.state);
    const fromInner = parseStoredState(stateRaw);
    if (fromInner) return fromInner;
  }
  const direct = parseStoredState(raw);
  if (direct) return direct;
  throw new Error("Unrecognized backup format.");
}

export async function readLibraryBackupFile(file: File): Promise<AppState> {
  const text = await file.text();
  return parseLibraryBackupJson(text);
}
