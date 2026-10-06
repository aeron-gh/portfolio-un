import { describe, expect, test } from 'bun:test';
import { document } from './dom';
import snapshot from '../../src/data/github.snapshot.json';
import { profile } from '../../src/content/profile';
import { roundedTotal } from '../../src/lib/github';

describe('open source section', () => {
  test('the label shows the rounded total', () => {
    expect(document.querySelector('#oss .label')?.textContent).toContain(`${roundedTotal(snapshot.total)} merged`);
  });

  test('the graph has one cell per day, and filled cells match merge days', () => {
    const cells = [...document.querySelectorAll('.g-grid i')];
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.length % 7).toBe(0);
    const filled = cells.filter((c) => /\bl[123]\b/.test(c.getAttribute('class') ?? ''));
    expect(filled.length).toBe(Object.keys(snapshot.perDay).length);
  });

  test('future days have no tooltip', () => {
    for (const c of document.querySelectorAll('.g-grid i.fut')) expect(c.hasAttribute('data-tip')).toBe(false);
  });

  test('every featured PR is linked with its real title', () => {
    for (const block of profile.oss) {
      for (const f of block.featured) {
        const pr = snapshot.prs.find((p) => p.repo === f.repo && p.number === f.number)!;
        const link = document.querySelector(`#oss .prs a[href="${pr.url}"]`);
        expect(link?.textContent).toContain(pr.title);
      }
    }
  });

  test('only blocks marked open start open, and buttons say so', () => {
    for (const block of profile.oss) {
      const btn = document.querySelector(`#${block.id}-head`);
      expect(btn?.getAttribute('aria-expanded')).toBe(block.open ? 'true' : 'false');
      expect(btn?.getAttribute('aria-controls')).toBe(`${block.id}-body`);
    }
  });
});

describe('activity graph size limits', () => {
  const fig = document.querySelector('[data-graph]');
  const weeks = document.querySelectorAll('.g-grid i').length / 7;

  test('shows at most 26 weeks', () => {
    expect(weeks).toBeLessThanOrEqual(26);
  });

  test('marks weeks older than 17 so narrow screens can hide them', () => {
    expect(document.querySelectorAll('.g-grid i.old').length).toBe(7 * Math.max(0, weeks - 17));
    expect(fig?.getAttribute('style')).toContain(`--recent:${Math.min(weeks, 17)}`);
  });
});
