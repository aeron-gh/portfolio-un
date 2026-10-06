import { describe, expect, test } from 'bun:test';
import { document } from './dom';
import snapshot from '../../src/data/github.snapshot.json';
import { profile } from '../../src/content/profile';
import { roundedTotal, sinceLabel } from '../../src/lib/github';

describe('top of the page', () => {
  test('the name is split into letters but read as one label', () => {
    expect(document.querySelector('.who')?.getAttribute('aria-label')).toBe(profile.name);
    expect(document.querySelectorAll('.name .ch').length).toBe([...profile.name].length);
  });

  test('the statement is the h1, split into words with spaces kept', () => {
    const h1 = document.querySelector('h1');
    expect(h1?.textContent?.trim()).toBe(profile.statement);
    expect(h1?.querySelectorAll('.w').length).toBe(profile.statement.split(' ').length);
  });

  test('the lede shows the rounded total and since-month, never the exact number', () => {
    const lede = document.querySelector('.lede')?.textContent ?? '';
    expect(lede).toContain(`${roundedTotal(snapshot.total)} pull requests merged`);
    expect(lede).toContain(`Since ${sinceLabel(snapshot.firstMergedAt, new Date(snapshot.fetchedAt))}`);
    expect(lede).not.toContain(`${snapshot.total} pull`);
  });

  test('the meta description is plain text from the lede', () => {
    const desc = document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    expect(desc).toContain('pull requests merged');
    expect(desc).not.toMatch(/\*\*|\]\(/);
  });

  test('two boot triggers and one menu trigger exist', () => {
    expect(document.querySelectorAll('[data-boot]').length).toBe(2);
    expect(document.querySelectorAll('[data-cmdk]').length).toBe(1);
  });

  test('the resume button is hidden while public/resume.pdf is missing', () => {
    expect(document.querySelector('.hero a[href="/resume.pdf"]')).toBeNull();
  });

  test('the Now section is there with its month', () => {
    expect(document.querySelector('#now .label')?.textContent).toMatch(/Now\s*\w+ \d{4}/);
  });
});
