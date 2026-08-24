import { renderToStaticMarkup } from 'react-dom/server';
import { PasswordChecklist } from '../PasswordChecklist';

describe('PasswordChecklist', () => {
  it('lists every rule with its pass state', () => {
    const html = renderToStaticMarkup(<PasswordChecklist password="Abcdefghi1!" />);
    expect(html).toContain('Minimum 10 characters');
    expect(html).toContain('aria-label="Password requirements"');
    expect(html.match(/data-passed="true"/g)?.length).toBe(5);
    const weak = renderToStaticMarkup(<PasswordChecklist password="abc" />);
    expect(weak.match(/data-passed="false"/g)?.length).toBe(4);
  });
});
