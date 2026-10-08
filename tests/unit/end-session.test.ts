import { describe, expect, test } from 'bun:test';
import { COUNTDOWN, dialogText, shownSeconds } from '../../src/desktop/system/end-session';

describe('end-session dialogs (endSessionDialog.js)', () => {
  test('the countdown shows tens, then every second for the last ten', () => {
    expect(COUNTDOWN).toBe(60);
    expect([60, 59.5, 51, 50, 49, 41, 40, 11, 10.2, 10, 9, 1, 0.3].map((s) => shownSeconds(60, s))).toEqual([60, 60, 60, 50, 50, 50, 40, 20, 20, 10, 9, 1, 1]);
  });

  test('log out names the user; without a name it says "You"', () => {
    expect(dialogText('log-out', 'Abhishek Agarwal', 60)).toEqual({
      title: 'Log Out Abhishek Agarwal',
      description: 'Abhishek Agarwal will be logged out automatically in 60 seconds',
      confirm: 'Log Out',
    });
    expect(dialogText('log-out', null, 1).description).toBe('You will be logged out automatically in 1 second');
  });

  test('restart and power off, with GNOME\'s singular at one second', () => {
    expect(dialogText('restart', 'Abhishek Agarwal', 20)).toEqual({ title: 'Restart', description: 'The system will restart automatically in 20 seconds', confirm: 'Restart' });
    expect(dialogText('power-off', null, 1)).toEqual({ title: 'Power Off', description: 'The system will power off automatically in 1 second', confirm: 'Power Off' });
  });
});
