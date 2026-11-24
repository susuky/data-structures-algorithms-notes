'use strict';
const assert = require('node:assert/strict');
const models = require('../source/models-algorithms.js');
let cases = 0;
function result(key, input) {
  const frames = models[key].run(input);
  assert.ok(frames.length > 0, key);
  for (const frame of frames) {
    assert.equal(typeof frame.title, 'string');
    assert.ok(frame.title.trim());
    assert.equal(typeof frame.explanation, 'string');
    assert.ok(frame.explanation.trim());
    assert.ok(Array.isArray(frame.rows));
  }
  assert.ok(Object.hasOwn(frames.at(-1), 'result'), key);
  cases++;
  return frames.at(-1).result;
}
function arrays(values, length, prefix = []) {
  if (!length) return [prefix];
  return values.flatMap(value => arrays(values, length - 1, [...prefix, value]));
}
for (const [key, model] of Object.entries(models)) {
  result(key, Object.fromEntries(model.inputs.map(input => [input.name, input.value])));
  for (const preset of model.presets) result(key, preset.values);
}
for (let n = 0; n <= 5; n++) {
  for (const values of arrays([0, 1, 2], n)) {
    const input = {array: values.join(',')}, sorted = [...values].sort((a, b) => a - b);
    for (const key of ['insertion-sort', 'merge-sort', 'radix-sort']) assert.deepEqual(result(key, input), sorted);
    const stable = values.map((key, index) => ({key, index})).sort((a, b) => a.key - b.key);
    assert.deepEqual(result('counting-sort', input), {values: stable.map(x => x.key), indices: stable.map(x => x.index)});
    assert.equal(result('inversion-count', input), values.reduce((total, value, i) => total + values.slice(i + 1).filter(other => value > other).length, 0));
    for (let k = 1; k <= n; k++) assert.equal(result('quickselect', {...input, k}), sorted[k - 1]);
  }
}
for (const values of [[], [0], [0.99, 0.1, 0.25, 0.3, 0.1], [0.9999, 0.9998, 0.9997], [0.1, 0.3, 0.7, 0.9]]) {
  assert.deepEqual(result('bucket-sort', {array: values.join(',')}), values.slice().sort((a, b) => a - b));
}
assert.deepEqual(result('merge-sort', {array: '-5,7,-3,0'}), [-5, -3, 0, 7]);
assert.deepEqual(result('radix-sort', {array: '170,45,75,90,802,24,2,66'}), [2, 24, 45, 66, 75, 90, 170, 802]);

let factorial = 1n;
for (let n = 0; n <= 200; n++) {
  if (n) factorial *= BigInt(n);
  const text = factorial.toString(), trailing = text.length - text.replace(/0+$/, '').length;
  assert.equal(result('factorial-zeroes', {n}), trailing);
}
for (let a = -20; a <= 20; a++) for (let b = -20; b <= 20; b++) {
  let expected = 0;
  for (let d = 1; d <= Math.max(Math.abs(a), Math.abs(b)); d++) if (a % d === 0 && b % d === 0) expected = d;
  assert.equal(result('euclid-gcd', {a, b}), expected);
}
for (let n = 0; n <= 80; n++) {
  const expected = [];
  for (let p = 2; p <= n; p++) if (Array.from({length: p - 2}, (_, i) => i + 2).every(d => p % d)) expected.push(p);
  assert.deepEqual(result('prime-sieve', {n}), expected);
}
for (let n = 0; n <= 12; n++) for (let k = 0; k <= n; k++) {
  let expected = 1;
  for (let i = 1; i <= k; i++) expected = expected * (n - i + 1) / i;
  assert.equal(result('pascal-combinations', {n, k}), Math.round(expected));
}

for (let n = 0; n <= 6; n++) for (const letters of arrays(['a', 'b'], n)) {
  const text = letters.join('');
  assert.deepEqual(result('suffix-array', {text}), Array.from({length: n}, (_, i) => i).sort((i, j) => text.slice(i) < text.slice(j) ? -1 : text.slice(i) > text.slice(j) ? 1 : 0));
  for (let m = 0; m <= 3; m++) for (const parts of arrays(['a', 'b'], m)) {
    const pattern = parts.join(''), expected = [];
    for (let i = 0; i <= n; i++) if (text.startsWith(pattern, i)) expected.push(i);
    assert.deepEqual(result('kmp-matching', {text, pattern}), expected);
    assert.deepEqual(result('rolling-hash', {text, pattern, base: 1, modulus: 2}), expected);
  }
}
assert.equal(result('polynomial-hash', {text: 'cat', base: 31, modulus: 101}), 90);
assert.equal(result('polynomial-hash', {text: '', base: 31, modulus: 101}), 0);
assert.deepEqual(result('kmp-matching', {text: '資料資料', pattern: '資料'}), [0, 2]);
assert.deepEqual(result('suffix-array', {text: '香蕉香'}), [1, 2, 0]);
const collision = models['rolling-hash'].run({text: 'abac', pattern: 'ba', base: 1, modulus: 7});
assert.ok(collision.some(frame => frame.explanation.includes('碰撞')));
assert.deepEqual(collision.at(-1).result, [1]);

// Check long failure chains against exhaustive proper-prefix comparisons.
for (const pattern of ['ababaca', 'aaaaab', 'aabaaab', 'abcababcab', 'abacababac']) {
  const frames = models['kmp-matching'].run({text: pattern + pattern, pattern});
  for (const frame of frames.filter(frame => frame.title.startsWith('pi['))) {
    const {i, j} = frame.vars, prefix = pattern.slice(0, i + 1);
    let expected = 0;
    for (let length = 1; length < prefix.length; length++) if (prefix.slice(0, length) === prefix.slice(-length)) expected = length;
    assert.equal(j, expected);
  }
  assert.deepEqual(frames.at(-1).result, Array.from({length: pattern.length * 2 + 1}, (_, i) => i).filter(i => (pattern + pattern).startsWith(pattern, i)));
  cases++;
}
const failureFrames = models['kmp-matching'].run({text: 'abababaca', pattern: 'ababaca'});
assert.deepEqual(failureFrames.filter(frame => frame.vars.建表位置 === 5).map(frame => [frame.vars.回退前, frame.vars.回退後]), [[3, 1], [1, 0]]);
// Supplementary Unicode characters keep the same code-point indexing as Python.
for (const [text, pattern] of [['🙂a🙂a', '🙂a'], ['𝄞𝄞𝄞', '𝄞𝄞'], ['🙂a', '']]) {
  const letters = Array.from(text), query = Array.from(pattern), expected = [];
  for (let i = 0; i + query.length <= letters.length; i++) if (query.every((char, j) => letters[i + j] === char)) expected.push(i);
  assert.deepEqual(result('kmp-matching', {text, pattern}), expected);
  assert.deepEqual(result('rolling-hash', {text, pattern, base: 1, modulus: 2}), expected);
  const compare = (i, j) => {
    while (i < letters.length && j < letters.length) {
      const delta = letters[i].codePointAt(0) - letters[j].codePointAt(0);
      if (delta) return delta;
      i++; j++;
    }
    return (letters.length - i) - (letters.length - j);
  };
  assert.deepEqual(result('suffix-array', {text}), letters.map((_, i) => i).sort(compare));
}

const permutations = new Map();
for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 2; c++) {
  const draws = [(a + 0.25) / 4, (b + 0.25) / 3, (c + 0.25) / 2];
  const key = result('fisher-yates', {items: 'A,B,C,D', draws: draws.join(',')}).join('');
  permutations.set(key, (permutations.get(key) || 0) + 1);
}
assert.equal(permutations.size, 24);
assert.ok([...permutations.values()].every(count => count === 1));
const subsets = new Map();
for (let a = 0; a < 3; a++) for (let b = 0; b < 4; b++) for (let c = 0; c < 5; c++) {
  const draws = [(a + 0.25) / 3, (b + 0.25) / 4, (c + 0.25) / 5];
  const key = result('reservoir-sampling', {items: 'A,B,C,D,E', k: 2, draws: draws.join(',')}).sort().join('');
  subsets.set(key, (subsets.get(key) || 0) + 1);
}
assert.equal(subsets.size, 10);
assert.ok([...subsets.values()].every(count => count === 6));
assert.deepEqual(result('reservoir-sampling', {items: 'A,B', k: 0, draws: ''}), []);
assert.deepEqual(result('reservoir-sampling', {items: '', k: 2, draws: ''}), []);
for (let bound = 1; bound <= 7; bound++) {
  const outcome = result('rejection-sampling', {bound, draws: '1,2,3,4,5,6,7'}), counts = Array(bound).fill(0);
  for (const value of outcome.samples) counts[value]++;
  assert.ok(counts.every(count => count === Math.floor(7 / bound)));
  assert.equal(outcome.rejected, 7 % bound);
}
assert.deepEqual(result('weighted-moments', {outcomes: '-3,0,5', weights: '1,2,1'}), {mean: 0.5, variance: 8.25});
assert.deepEqual(result('weighted-moments', {outcomes: '5', weights: '3'}), {mean: 5, variance: 0});
assert.deepEqual(result('weighted-moments', {outcomes: '1,9', weights: '0,1'}), {mean: 9, variance: 0});

for (const [key, input] of [
  ['insertion-sort', {array: '1,,2'}], ['bucket-sort', {array: '1'}], ['counting-sort', {array: '-1'}],
  ['radix-sort', {array: '1.2'}], ['quickselect', {array: '1', k: 2}], ['prime-sieve', {n: 81}],
  ['pascal-combinations', {n: 2, k: 3}], ['fisher-yates', {items: 'A,B,C', draws: '0'}],
  ['reservoir-sampling', {items: 'A,B,C', k: 1, draws: '1,0'}], ['weighted-moments', {outcomes: '1,2', weights: '0,0'}],
  ['polynomial-hash', {text: 'a', base: 31, modulus: 1}], ['rejection-sampling', {bound: 5, draws: '8'}]
]) assert.throws(() => models[key].run(input), Error, key);
console.log(`${Object.keys(models).length} algorithm models: ${cases} cases passed; exact shuffle/reservoir outcome counts and collision paths verified.`);
