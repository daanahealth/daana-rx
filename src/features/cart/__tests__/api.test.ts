/**
 * The cart bootstrap must resolve the server's "current" cart (GET
 * /carts/current) and never mint a new one (POST /carts) — PR #11 fix.
 */
import { getCurrentCart, addItemToCart, ConcurrentConflictError } from '../api';

const fetchMock = global.fetch as jest.Mock;

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as unknown as Response;
}

describe('getCurrentCart', () => {
  it('GETs /transactions/carts/current and maps the cart', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: 'c1',
        owner_id: 'u1',
        status: 'active',
        submitted_at: null,
        decided_at: null,
        expires_at: null,
        items: [],
      })
    );
    const cart = await getCurrentCart();
    expect(cart).toMatchObject({ id: 'c1', ownerId: 'u1', status: 'active', items: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/transactions\/carts\/current$/);
    expect(init.method ?? 'GET').toBe('GET');
  });

  it('never falls back to POST /carts when the server errors', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'nope' }, 500));
    await expect(getCurrentCart()).rejects.toThrow('nope');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.some(([, i]) => (i as RequestInit)?.method === 'POST')).toBe(false);
  });
});

describe('addItemToCart', () => {
  it('surfaces the concurrent-checkout 409 as ConcurrentConflictError', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ conflict: 'concurrent_checkout', error: 'gone' }, 409)
    );
    await expect(addItemToCart('c1', 'i1')).rejects.toBeInstanceOf(ConcurrentConflictError);
  });

  it('sends override + note as query params', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'in_cart', added_at: 'now' }));
    await addItemToCart('c1', 'i1', { override: true, note: 'reason' });
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('/carts/c1/items?override=true&note=reason');
  });
});
