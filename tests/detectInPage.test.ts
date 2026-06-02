// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { reactComponentName, isRealComponentName, collectFrameworkSignals } from '../src/shared/detectInPage';

describe('isRealComponentName', () => {
  it('accepts PascalCase component names', () => {
    expect(isRealComponentName('LoginButton')).toBe(true);
    expect(isRealComponentName('Dialog')).toBe(true);
  });
  it('rejects minified single letters', () => {
    expect(isRealComponentName('a')).toBe(false);
    expect(isRealComponentName('A')).toBe(false);
  });
  it('rejects lowercase host names', () => {
    expect(isRealComponentName('div')).toBe(false);
  });
});

describe('reactComponentName', () => {
  it('returns null when the element has no fiber', () => {
    document.body.innerHTML = '<button id="b"></button>';
    expect(reactComponentName(document.getElementById('b')!)).toBeNull();
  });
  it('walks the fiber to the nearest named component', () => {
    document.body.innerHTML = '<button id="b"></button>';
    const el = document.getElementById('b')! as unknown as Record<string, unknown>;
    function LoginButton() {}
    el['__reactFiber$abc'] = { type: 'button', return: { type: LoginButton, return: null } };
    expect(reactComponentName(document.getElementById('b')!)).toBe('LoginButton');
  });
  it('returns null when only minified names exist (honesty)', () => {
    document.body.innerHTML = '<button id="b"></button>';
    const el = document.getElementById('b')! as unknown as Record<string, unknown>;
    function a() {}
    el['__reactFiber$abc'] = { type: a, return: null };
    expect(reactComponentName(document.getElementById('b')!)).toBeNull();
  });
});

describe('collectFrameworkSignals', () => {
  it('detects React via a fiber expando on the element', () => {
    document.body.innerHTML = '<div id="d"></div>';
    const el = document.getElementById('d')! as unknown as Record<string, unknown>;
    el['__reactFiber$z'] = { type: 'div', return: null };
    expect(collectFrameworkSignals(document.getElementById('d')!).hasReactFiberKeys).toBe(true);
  });
  it('detects React via an ancestor fiber (host node without own fiber)', () => {
    document.body.innerHTML = '<div id="root"><span id="leaf"></span></div>';
    const root = document.getElementById('root')! as unknown as Record<string, unknown>;
    root['__reactContainer$z'] = { type: 'div', return: null };
    expect(collectFrameworkSignals(document.getElementById('leaf')!).hasReactFiberKeys).toBe(true);
  });
  it('reports no framework on a bare element', () => {
    document.body.innerHTML = '<p id="p"></p>';
    expect(collectFrameworkSignals(document.getElementById('p')!).hasReactFiberKeys).toBe(false);
  });
});
