// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { collectDomSignals } from '../src/content/collect';

describe('collectDomSignals', () => {
  it('extracts tag, role, data-* and classes', () => {
    document.body.innerHTML = `<div id="t" role="dialog" data-state="open" class="MuiPaper-root flex"></div>`;
    const el = document.getElementById('t')!;
    const s = collectDomSignals(el);
    expect(s.tag).toBe('div');
    expect(s.role).toBe('dialog');
    expect(s.dataAttributes).toContain('data-state');
    expect(s.classList).toContain('MuiPaper-root');
  });
});
