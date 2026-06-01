import { describe, it, expect } from 'vitest';
import { ping } from '../src/engine/types';

describe('smoke', () => {
  it('engine module loads', () => {
    expect(ping()).toBe('archify');
  });
});
