import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { detectFramework } from '../src/engine/framework';
import { detectComponentType } from '../src/engine/componentType';
import { detectLibrary } from '../src/engine/library';

function load(dir: string) {
  const root = join(process.cwd(), 'fixtures', dir);
  return readdirSync(root)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(root, f), 'utf8')));
}

describe('detection accuracy (tracked)', () => {
  for (const group of ['dev', 'prod']) {
    it(`${group} fixtures match expectations`, () => {
      const cases = load(group);
      const results = cases.map((c) => ({
        name: c.name,
        fwOk: detectFramework(c.frameworkSignals).framework === c.expect.framework,
        typeOk: detectComponentType(c.dom).type === c.expect.type,
        libOk: detectLibrary(c.dom).library === c.expect.library,
      }));
      const score = results.flatMap((r) => [r.fwOk, r.typeOk, r.libOk]).filter(Boolean).length;
      const total = results.length * 3;
      // eslint-disable-next-line no-console
      console.log(`[accuracy:${group}] ${score}/${total}`, results);
      // Seed fixtures are curated to pass exactly; real-site fixtures may relax this.
      expect(score).toBe(total);
    });
  }
});
