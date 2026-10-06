import { describe, expect, test } from 'bun:test';
import { document } from './dom';
import { profile } from '../../src/content/profile';

describe('middle sections', () => {
  test('empty Experience and Education are not rendered', () => {
    if (profile.experience.length === 0) expect(document.querySelector('#experience')).toBeNull();
    if (profile.education.length === 0) expect(document.querySelector('#education')).toBeNull();
  });

  test('Building blocks follow the profile, with status and links', () => {
    for (const b of profile.building) {
      const head = document.querySelector(`#${b.id}-head`);
      expect(head?.getAttribute('aria-expanded')).toBe(b.open ? 'true' : 'false');
      const body = document.querySelector(`#${b.id}-body`);
      expect(body?.querySelector('.status')?.textContent).toBe(b.status);
      for (const l of b.links) expect(body?.querySelector(`a[href="${l.href}"]`)).not.toBeNull();
    }
  });

  test('Opentrail is not called live', () => {
    expect(document.querySelector('#opentrail-body')?.textContent).not.toMatch(/\bLive\b/);
  });

  test('the Partlore pin demo has seven pins, the first selected, with a datasheet source', () => {
    const pins = document.querySelectorAll('#partlore-body .pin');
    expect(pins.length).toBe(7);
    expect(pins[0].getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('#partlore-body .pin-card a')?.getAttribute('href')).toContain('espressif.com');
    expect(document.querySelectorAll('#partlore-body .pins-list li').length).toBe(7);
  });

  test('Earlier rows link out', () => {
    for (const r of profile.earlier) expect(document.querySelector(`#earlier a.row[href="${r.href}"]`)).not.toBeNull();
  });

  test('Stack lists every group', () => {
    expect(document.querySelectorAll('#stack dt').length).toBe(profile.stack.length);
  });
});
