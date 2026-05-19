export function openLibraryIdToWorkKey(bookId: string): string | null {
  const prefix = "openlibrary:";
  if (!bookId.startsWith(prefix)) return null;
  const workId = bookId.slice(prefix.length).trim();
  return workId || null;
}

export function workKeyToOpenLibraryId(key: string): string {
  const trimmed = key.trim();
  const withoutPrefix = trimmed.startsWith("/works/")
    ? trimmed.slice("/works/".length)
    : trimmed.startsWith("works/")
      ? trimmed.slice("works/".length)
      : trimmed;
  return `openlibrary:${withoutPrefix}`;
}
