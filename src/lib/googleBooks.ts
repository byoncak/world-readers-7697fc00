export interface BookSearchResult {
  title: string;
  author: string;
  pages: number | null;
}

export async function searchGoogleBooks(query: string, signal?: AbortSignal): Promise<BookSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  // Try Open Library first (free, no quota)
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=5&fields=title,author_name,number_of_pages_median`;
    const res = await fetch(url, { signal });
    if (res.ok) {
      const data = await res.json();
      const docs: any[] = data.docs ?? [];
      const results = docs.map((d) => ({
        title: d.title ?? '',
        author: Array.isArray(d.author_name) && d.author_name.length ? d.author_name[0] : '',
        pages: typeof d.number_of_pages_median === 'number' && d.number_of_pages_median > 0 ? d.number_of_pages_median : null,
      })).filter((b) => b.title);
      if (results.length) return results;
    }
  } catch (e) {
    if ((e as any)?.name === 'AbortError') throw e;
  }
  // Fallback to Google Books
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=5&printType=books`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  const items: any[] = data.items ?? [];
  return items.map((it) => {
    const v = it.volumeInfo ?? {};
    return {
      title: v.title ?? '',
      author: Array.isArray(v.authors) && v.authors.length ? v.authors[0] : '',
      pages: typeof v.pageCount === 'number' && v.pageCount > 0 ? v.pageCount : null,
    };
  }).filter((b) => b.title);
}