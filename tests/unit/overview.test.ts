import { describe, expect, test } from 'bun:test';
import { PREVIEW_MAX, cardRect, pickerSlots, showThumbnails } from '../../src/desktop/shell/overview';

const AREA_1080 = { x: 66, y: 32, w: 1854, h: 1048 };
const AREA = { x: 66, y: 32, w: 1214, h: 768 };

describe('overview geometry', () => {
  test('the workspace card matches the real 26.04 screenshot at 1920×1080', () => {
    const c = cardRect(AREA_1080, false);
    expect(c.y).toBe(109);
    expect(c.h).toBe(902);
    expect(Math.abs(c.w - 1591)).toBeLessThanOrEqual(8);
    expect(Math.abs(c.x - 198)).toBeLessThanOrEqual(4);
  });

  test('the thumbnails strip pushes the card down', () => {
    expect(cardRect(AREA, true).y).toBeGreaterThan(cardRect(AREA, false).y);
  });

  test('thumbnails show only with more than two workspaces', () => {
    expect(showThumbnails(2)).toBe(false);
    expect(showThumbnails(3)).toBe(true);
  });
});

describe('window picker slots', () => {
  const card = cardRect(AREA, false);
  const scaleOfCard = card.w / AREA.w;

  test('one window is centred and never larger than its workspace-scaled size', () => {
    const s = pickerSlots([{ id: 'a', rect: { x: 300, y: 200, w: 640, h: 420 } }], card, AREA).a;
    expect(s.scale).toBeCloseTo(scaleOfCard * PREVIEW_MAX, 5);
    expect(Math.abs(s.x + (640 * s.scale) / 2 - (card.x + card.w / 2))).toBeLessThanOrEqual(1);
    expect(Math.abs(s.y + (420 * s.scale) / 2 - (card.y + card.h / 2))).toBeLessThanOrEqual(1);
  });

  test('several windows fit inside the card without overlapping', () => {
    const wins = ['a', 'b', 'c', 'd', 'e'].map((id, i) => ({ id, rect: { x: 100 + i * 50, y: 100 + i * 40, w: 800, h: 500 } }));
    const slots = pickerSlots(wins, card, AREA);
    const boxes = wins.map((w) => ({ ...slots[w.id], w: w.rect.w * slots[w.id].scale, h: w.rect.h * slots[w.id].scale }));
    for (const b of boxes) {
      expect(b.x).toBeGreaterThanOrEqual(card.x);
      expect(b.y).toBeGreaterThanOrEqual(card.y);
      expect(b.x + b.w).toBeLessThanOrEqual(card.x + card.w + 1);
      expect(b.y + b.h).toBeLessThanOrEqual(card.y + card.h + 1);
    }
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const [p, q] = [boxes[i], boxes[j]];
        const overlap = p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h;
        expect(overlap).toBe(false);
      }
  });

  test('no windows, no slots', () => {
    expect(pickerSlots([], card, AREA)).toEqual({});
  });
});
