import { describe, expect, test } from 'bun:test';
import { document } from './dom';
import snapshot from '../../src/data/github.snapshot.json';
import { profile } from '../../src/content/profile';

describe('contact and footer', () => {
  test('the email button copies the address and a mailto link exists', () => {
    expect(document.querySelector('#contact [data-copy]')?.getAttribute('data-copy')).toBe(profile.email);
    expect(document.querySelector(`#contact a[href="mailto:${profile.email}"]`)).not.toBeNull();
  });

  test('profile links are all there', () => {
    for (const l of profile.links) expect(document.querySelector(`#contact a[href="${l.href}"]`)).not.toBeNull();
  });

  test('no resume link while public/resume.pdf is missing', () => {
    expect(document.querySelector('a[href="/resume.pdf"]')).toBeNull();
  });

  test('latest merge links to the real PR', () => {
    expect(document.querySelector(`#contact a[href="${snapshot.latest!.url}"]`)).not.toBeNull();
  });

  test('the clock uses the owner time zone', () => {
    expect(document.querySelector('#contact [data-clock]')?.getAttribute('data-tz')).toBe(profile.timeZone);
  });

  test('the footer has a theme toggle', () => {
    expect(document.querySelector('footer [data-theme-toggle]')).not.toBeNull();
  });
});
