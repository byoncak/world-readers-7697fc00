import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchGoogleBooks } from './googleBooks';

const origFetch = global.fetch;
afterEach(() => {
  global.fetch = origFetch;
  vi.restoreAllMocks();
});

describe('searchGoogleBooks', () => {
  it('maps Open Library results to a medium HTTPS cover and metadata', async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          docs: [
            {
              key: '/works/OL1W',
              title: 'A Book',
              author_name: ['Jane Doe'],
              number_of_pages_median: 240,
              first_publish_year: 2001,
              cover_i: 12345,
              isbn: ['9781234567890', '1234567890'],
            },
          ],
        }),
        { status: 200 },
      ),
    ) as any;

    const [r] = await searchGoogleBooks('foo');
    expect(r.title).toBe('A Book');
    expect(r.author).toBe('Jane Doe');
    expect(r.pages).toBe(240);
    expect(r.year).toBe(2001);
    expect(r.isbn).toBe('9781234567890');
    // Stored cover prefers the large -L.jpg for crisp display; thumbnail row keeps -M.jpg.
    expect(r.coverUrl).toBe('https://covers.openlibrary.org/b/id/12345-L.jpg');
    expect(r.thumbnailUrl).toBe('https://covers.openlibrary.org/b/id/12345-M.jpg');
    expect(r.coverUrl?.startsWith('https://')).toBe(true);
  });

  it('normalizes Google Books thumbnails to HTTPS when Open Library is empty', async () => {
    global.fetch = vi.fn(async (url: any) => {
      const u = String(url);
      if (u.includes('openlibrary.org')) {
        return new Response(JSON.stringify({ docs: [] }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          items: [
            {
              id: 'gb1',
              volumeInfo: {
                title: 'GB Title',
                authors: ['A. Uthor'],
                pageCount: 300,
                publishedDate: '1999-05-12',
                imageLinks: { thumbnail: 'http://books.google.com/img?id=abc' },
                industryIdentifiers: [
                  { type: 'ISBN_10', identifier: '0000000000' },
                  { type: 'ISBN_13', identifier: '9780000000002' },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      );
    }) as any;

    const [r] = await searchGoogleBooks('bar');
    // HTTPS normalization + zoom upgrade + edge=curl removal for crisp cover.
    expect(r.coverUrl?.startsWith('https://books.google.com/img')).toBe(true);
    expect(r.coverUrl).toContain('zoom=1');
    expect(r.coverUrl).not.toContain('edge=curl');
    expect(r.year).toBe(1999);
    expect(r.isbn).toBe('9780000000002');
    expect(r.externalId).toBe('gb1');
  });

  it('upgrades Google Books URL: replaces zoom/edge params while preserving id', async () => {
    global.fetch = vi.fn(async (url: any) => {
      const u = String(url);
      if (u.includes('openlibrary.org')) return new Response(JSON.stringify({ docs: [] }), { status: 200 });
      return new Response(JSON.stringify({
        items: [{
          id: 'gb2',
          volumeInfo: {
            title: 'Big',
            authors: ['X'],
            imageLinks: {
              thumbnail: 'http://books.google.com/img?id=THE_ID&printsec=frontcover&zoom=5&edge=curl',
              large: 'http://books.google.com/img?id=THE_ID&printsec=frontcover&zoom=3&edge=curl',
            },
          },
        }],
      }), { status: 200 });
    }) as any;
    const [r] = await searchGoogleBooks('big');
    expect(r.coverUrl).toContain('id=THE_ID');
    expect(r.coverUrl).toContain('zoom=1');
    expect(r.coverUrl).not.toContain('edge=curl');

  it('returns [] for empty queries and skips network', async () => {
    const spy = vi.fn();
    global.fetch = spy as any;
    expect(await searchGoogleBooks('  ')).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });
});
