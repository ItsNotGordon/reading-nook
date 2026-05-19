/**
 * Map Reading Nook canonical genre labels to Open Library subject search phrases.
 */
const GENRE_TO_OL_SUBJECT: Record<string, string> = {
  adventure: "Adventure",
  "american literature": "American literature",
  biography: "Biography",
  "british fiction": "British fiction",
  "chick lit": "Chick lit",
  classics: "Classics",
  comics: "Comics",
  "coming of age": "Coming of age",
  cooking: "Cooking",
  creative: "Creative",
  crime: "Crime",
  drama: "Drama",
  dystopian: "Dystopian",
  "english fiction": "English fiction",
  "english literature": "English literature",
  "family fiction": "Family fiction",
  fantasy: "Fantasy",
  fiction: "Fiction",
  "historical fiction": "Historical fiction",
  history: "History",
  horror: "Horror",
  humor: "Humor",
  "literary fiction": "Literary fiction",
  manga: "Manga",
  memoir: "Memoir",
  mystery: "Mystery",
  "non-fiction": "Non-fiction",
  paranormal: "Paranormal",
  poetry: "Poetry",
  "regency romance": "Regency romance",
  romance: "Romance",
  "science fiction": "Science fiction",
  sports: "Sports",
  suspense: "Suspense",
  thriller: "Thriller",
  war: "War",
  western: "Western",
  "young adult": "Young adult",
};

function genreKey(label: string): string {
  return label.trim().toLowerCase();
}

/** OL `subject:"..."` phrase for a canonical genre label, or null if unknown. */
export function canonicalGenreToOlSubject(genreLabel: string): string | null {
  const key = genreKey(genreLabel);
  return GENRE_TO_OL_SUBJECT[key] ?? (genreLabel.trim() || null);
}
