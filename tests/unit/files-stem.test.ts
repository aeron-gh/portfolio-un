import { describe, expect, test } from 'bun:test';
import { stem } from '../../src/desktop/apps/files/stem';

// Every expected value is Snowball's own (snowball-data english/output.txt). The port was also checked against the whole
// list of 42,648 words: all agree but 18 words starting with "inter", which Snowball changed after the 3.0.1 that Ubuntu has.
const cases = (pairs: string) => pairs.split('; ').map((p) => p.split(' ') as [string, string]);
const check = (pairs: string) => {
  for (const [word, want] of cases(pairs)) expect([word, stem(word)]).toEqual([word, want]);
};

describe('the English stemmer (Snowball 3.0.1)', () => {
  test('whole words with their own answer, and words too short to touch', () => {
    check('skies sky; sky sky; news news; only onli; early earli; idly idl; gently gentl; ugly ugli; singly singl; atlas atlas; bias bias; andes andes; cosmos cosmos; howe howe; by by');
    check("'a 'a; 'a' a; 'aa aa");
  });
  test('a y after a vowel is a consonant', () => check('youth youth; saying say; say say; cry cri'));
  test('the region prefixes', () => check('generous generous; communication communic; arsenal arsenal; paste paste; university universiti; lateral lateral; emergency emergenc; organization organiz'));
  test('step 1a: plurals', () => check('caresses caress; cries cri; ties tie; gaps gap; gas gas; press press'));
  test('step 1b: -eed, -ed, -ing', () => {
    check('agreed agre; feed feed; proceed proceed; exceed exceed; succeeded succeed');
    check('hoping hope; hopping hop; adding add; dying die; lying lie; inning inning; outing outing; canning canning');
    check('troubled troubl; sized size; falling fall; filling fill; hissing hiss');
  });
  test('steps 2 to 5', () => {
    check('national nation; sensational sensat; rational ration; conditional condit; operator oper; hopefulness hope; callousness callous');
    check('formality formal; sensibility sensibl; analogy analog; apology apolog; archaeology archaeolog; generously generous; homeless homeless');
    check('carelessly careless; hopefully hope; lovely love; brightly bright; happily happili; possibly possibl');
    check('electrical electr; goodness good; revival reviv; allowance allow; inference infer; defensible defens; adjustment adjust');
    check('dependent depend; adoption adopt; communism communism; effective effect; rate rate; cease ceas; controll control; roll roll');
  });
  test('letters outside English are left as they are, and count as consonants', () => {
    expect(stem('résumés')).toBe('résumé');
    expect(stem('2026')).toBe('2026');
  });
});
