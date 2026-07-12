import { describe, it, expect } from 'vitest';
import { shouldAnnounceUpdate } from '../src/shared/version';
import { changelogUrlFor } from '../src/shared/links';

describe('shouldAnnounceUpdate', () => {
  it('announces a minor bump', () => {
    expect(shouldAnnounceUpdate('0.2.0', '0.3.0')).toBe(true);
  });
  it('announces a major bump', () => {
    expect(shouldAnnounceUpdate('0.9.2', '1.0.0')).toBe(true);
  });
  it('stays silent on a patch bump', () => {
    expect(shouldAnnounceUpdate('0.3.0', '0.3.1')).toBe(false);
  });
  it('stays silent when versions are equal', () => {
    expect(shouldAnnounceUpdate('0.3.0', '0.3.0')).toBe(false);
  });
  it('stays silent on a downgrade', () => {
    expect(shouldAnnounceUpdate('0.4.0', '0.3.9')).toBe(false);
  });
  it('stays silent when previousVersion is missing', () => {
    expect(shouldAnnounceUpdate(undefined, '0.3.0')).toBe(false);
  });
  it('stays silent on malformed versions', () => {
    expect(shouldAnnounceUpdate('garbage', '0.3.0')).toBe(false);
    expect(shouldAnnounceUpdate('0.2.0', 'not-a-version')).toBe(false);
    expect(shouldAnnounceUpdate('', '0.3.0')).toBe(false);
  });
  it('handles two- and four-segment Chrome versions', () => {
    expect(shouldAnnounceUpdate('0.2', '0.3')).toBe(true);
    expect(shouldAnnounceUpdate('0.2.0.1', '0.3.0.0')).toBe(true);
    expect(shouldAnnounceUpdate('0.3.0.0', '0.3.0.1')).toBe(false);
  });
});

describe('changelogUrlFor', () => {
  it('deep-links to the version anchor on the site changelog', () => {
    expect(changelogUrlFor('0.3.0')).toBe('https://archify.salahxd.dev/changelog#0-3-0');
  });
  it('slugs every dot, including four-segment versions', () => {
    expect(changelogUrlFor('1.2.3.4')).toBe('https://archify.salahxd.dev/changelog#1-2-3-4');
  });
});
