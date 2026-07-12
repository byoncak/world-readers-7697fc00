export interface BookSearchResult {
  title: string;
  author: string;
  pages: number | null;
  /** Preferred cover image URL (https, medium/thumbnail size). */
  coverUrl?: string | null;
  /** First publication year, when known. */
  year?: number | null;
  /** ISBN13 preferred, else ISBN10, when known. */
  isbn?: string | null;
  /** Provider-specific external id, for keys/dedup. */
  externalId?: string | null;
}

const toHttps = (u?: string | null) =>
  typeof u === 'string' && u ? u.replace(/^http:\/\//i, 'https://') : null;

export async function searchGoogleBooks(query: string, signal?: AbortSignal): Promise<BookSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  // Try Open Library first (free, no quota)
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=6&fields=key,title,author_name,number_of_pages_median,first_publish_year,cover_i,isbn`;
    const res = await fetch(url, { signal });
    if (res.ok) {
      const data = await res.json();
      const docs: any[] = data.docs ?? [];
      const results: BookSearchResult[] = docs
        .map((d) => ({
          title: d.title ?? '',
          author: Array.isArray(d.author_name) && d.author_name.length ? d.author_name[0] : '',
          pages:
            typeof d.number_of_pages_median === 'number' && d.number_of_pages_median > 0
              ? d.number_of_pages_median
              : null,
          coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
          year: typeof d.first_publish_year === 'number' ? d.first_publish_year : null,
          isbn: Array.isArray(d.isbn) && d.isbn.length ? d.isbn[0] : null,
          externalId: typeof d.key === 'string' ? d.key : null,
        }))
        .filter((b) => b.title);
      if (results.length) return results;
    }
  } catch (e) {
    if ((e as any)?.name === 'AbortError') throw e;
  }
  // Fallback to Google Books
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=6&printType=books`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  const items: any[] = data.items ?? [];
  return items
    .map((it) => {
      const v = it.volumeInfo ?? {};
      const imgs = v.imageLinks ?? {};
      const cover =
        toHttps(imgs.thumbnail) ||
        toHttps(imgs.smallThumbnail) ||
        toHttps(imgs.small) ||
        toHttps(imgs.medium) ||
        null;
      const year =
        typeof v.publishedDate === 'string' && v.publishedDate.length >= 4
          ? parseInt(v.publishedDate.slice(0, 4), 10) || null
          : null;
      const ids: any[] = Array.isArray(v.industryIdentifiers) ? v.industryIdentifiers : [];
      const isbn13 = ids.find((i) => i.type === 'ISBN_13')?.identifier;
      const isbn10 = ids.find((i) => i.type === 'ISBN_10')?.identifier;
      return {
        title: v.title ?? '',
        author: Array.isArray(v.authors) && v.authors.length ? v.authors[0] : '',
        pages: typeof v.pageCount === 'number' && v.pageCount > 0 ? v.pageCount : null,
        coverUrl: cover,
        year,
        isbn: isbn13 || isbn10 || null,
        externalId: typeof it.id === 'string' ? it.id : null,
      } as BookSearchResult;
    })
    .filter((b) => b.title);
}
