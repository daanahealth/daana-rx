import { effectiveQuery, SEARCH_MIN_CHARS } from '../hooks';

describe('provider search hooks', () => {
  it('only searches at 2+ characters (API contract) and trims', () => {
    expect(SEARCH_MIN_CHARS).toBe(2);
    expect(effectiveQuery('')).toBe('');
    expect(effectiveQuery(' m ')).toBe('');
    expect(effectiveQuery(' me ')).toBe('me');
  });
});
