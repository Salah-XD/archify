// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { collectDomSignals } from '../src/shared/collectDom';

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
  it('collects ancestor classes, data-attrs, and tags (library markers live on wrappers)', () => {
    document.body.innerHTML =
      `<button class="MuiButton-root" data-radix-thing="x"><span><span id="leaf">Save</span></span></button>`;
    const s = collectDomSignals(document.getElementById('leaf')!);
    expect(s.classList).toEqual([]);                       // the leaf itself is bare
    expect(s.ancestorClasses).toContain('MuiButton-root'); // but the wrapper isn't
    expect(s.ancestorDataAttributes).toContain('data-radix-thing');
    expect(s.ancestorTags).toContain('button');
  });
});
