'use strict';
const assert = require('node:assert/strict');
const {algorithms: a, numbers, parseEdges} = require('../source/labs.js');
let checks = 0;
function check(value, message) {assert.ok(value, message);checks++;}
function equal(actual, expected, message) {assert.deepEqual(actual, expected, message);checks++;}
function last(frames) {
  check(frames.length > 0 && frames.at(-1).done, 'trace must terminate');
  check(frames.slice(0, -1).every(f => !f.done), 'only final frame is terminal');
  check(frames.every(f => f.explanation && f.vars), 'every frame teaches state');
  return frames.at(-1).result;
}
// Exhaustive arrays over a tiny domain, with duplicates and negatives.
function arrays(n, alphabet, prefix = []) {
  if (!n) return [prefix];
  return alphabet.flatMap(v => arrays(n - 1, alphabet, [...prefix, v]));
}
for (let n = 2; n <= 5; n++) for (const arr of arrays(n, [-2, 0, 2])) {
  arr.sort((x, y) => x - y);
  for (let target = -5; target <= 5; target++) {
    const frames = a['two-pointers']({array: arr, target});
    const found = last(frames);
    const possible = arr.some((x, i) => arr.some((y, j) => j > i && x + y === target));
    equal(found !== null, possible);
    if (found) check(found[0] < found[1] && arr[found[0]] + arr[found[1]] === target);
    for (const f of frames) {check(f.markers.left >= 0 && f.markers.right < arr.length);check(f.markers.left <= f.markers.right);}
  }
}
for (let n = 1; n <= 5; n++) for (const arr of arrays(n, [-2, 0, 3])) for (let k = 1; k <= n; k++) {
  const frames = a['sliding-window']({array: arr, k});
  const sums = Array.from({length: n - k + 1}, (_, left) => arr.slice(left, left + k).reduce((x, y) => x + y, 0));
  equal(last(frames), {sum: Math.max(...sums), left: sums.indexOf(Math.max(...sums)), right: sums.indexOf(Math.max(...sums)) + k - 1});
  for (const f of frames) equal(f.vars.sum, arr.slice(f.vars.left, f.vars.right + 1).reduce((x, y) => x + y, 0), 'sum matches active window');
}
for (let n = 0; n <= 6; n++) for (const arr of arrays(n, [0, 2])) {
  arr.sort((x, y) => x - y);
  for (let target = -1; target <= 3; target++) {
    const frames = a['binary-search']({array: arr, target});
    const expected = arr.findIndex(x => x >= target);
    equal(last(frames), expected === -1 ? n : expected);
    let previousWidth = n + 1;
    for (const [i, f] of frames.entries()) {
      const {lo, hi} = f.vars;
      check(lo <= hi && lo >= 0 && hi <= n);
      check(arr.slice(0, lo).every(v => v < target));
      check(arr.slice(hi).every(v => v >= target));
      if (i && !f.done) check(hi - lo < previousWidth, 'each binary-search step shrinks');
      previousWidth = hi - lo;
    }
  }
}
const allEdges = ['A-B','A-C','A-D','B-C','B-E','C-D','D-E','E-F'];
for (let mask = 0; mask < 256; mask++) for (const start of ['A', 'C', 'F']) {
  const edges = allEdges.filter((_, i) => mask & (1 << i));
  const frames = a.bfs({edges: edges.join(', '), start});
  const expected = Object.fromEntries('ABCDEF'.split('').map(n => [n, null]));expected[start] = 0;
  // Repeated relaxation is independent from queue implementation.
  for (let pass = 0; pass < 6; pass++) for (const edge of edges) {
    const [x, y] = edge.split('-');
    for (const [u, v] of [[x,y],[y,x]]) if (expected[u] !== null && (expected[v] === null || expected[v] > expected[u] + 1)) expected[v] = expected[u] + 1;
  }
  equal(last(frames), expected);
  for (const f of frames) {
    equal(new Set(f.queue).size, f.queue.length, 'visited on enqueue means no duplicate queue entries');
    check(f.queue.every(n => f.distances[n] !== null));
    for (let i = 1; i < f.order.length; i++) check(f.distances[f.order[i]] >= f.distances[f.order[i-1]]);
  }
}
for (let n = 1; n <= 6; n++) for (let target = 0; target <= 30; target++) {
  const frames = a.backtracking({n, target}), expected = [];
  for (let mask = 0; mask < (1 << n); mask++) {
    const set = Array.from({length:n}, (_, i) => i + 1).filter(x => mask & (1 << (x - 1)));
    if (set.reduce((x, y) => x + y, 0) === target) expected.push(set.join(','));
  }
  equal(last(frames).map(s => s.join(',')).sort(), expected.sort());
  for (const f of frames) {
    equal(f.path.reduce((x,y) => x+y, 0), f.vars['path 總和']);
    check(f.path.every((n, i) => !i || n > f.path[i-1]));
  }
  equal(frames.at(-1).path, [], 'path fully restored at return');
}
for (const coins of [[1],[2],[3,5],[1,3,4],[2,4,7],[7,3,2],[20]]) for (let amount = 0; amount <= 18; amount++) {
  const frames = a.dp({coins, amount});
  const result = last(frames);
  // Independent breadth-of-sums brute-force shortest path.
  const distance = Array(amount + 1).fill(null);distance[0]=0;const q=[0];
  while (q.length) {const x=q.shift();for (const c of coins) if(x+c<=amount && distance[x+c]===null){distance[x+c]=distance[x]+1;q.push(x+c);}}
  equal(result.count, distance[amount]);
  if(result.count!==null){equal(result.coins.length,result.count);equal(result.coins.reduce((x,y)=>x+y,0),amount);check(result.coins.every(c=>coins.includes(c)));}
  for(const f of frames){equal(f.values[0],0);if(f.markers['s−coin']!==undefined)check(f.markers['s−coin']<f.markers.s);}
}
assert.throws(() => a['two-pointers']({array:'3,1',target:4}), /排序/);checks++;
assert.throws(() => a['sliding-window']({array:'1,2',k:3}), /k/);checks++;
assert.throws(() => a.dp({coins:'0,1',amount:2}), /整數/);checks++;
assert.throws(() => a.dp({coins:'1,1',amount:2}), /重複/);checks++;
assert.throws(() => a.bfs({edges:'A-Z',start:'A'}), /A–F/);checks++;
assert.throws(() => a.backtracking({n:7,target:4}), /n/);checks++;
assert.throws(() => numbers('1,,2'), /完整/);checks++;
assert.throws(() => numbers('1,2,'), /完整/);checks++;
assert.throws(() => numbers('1.5,2'), /整數/);checks++;
assert.throws(() => numbers('<img src=x>'), /整數/);checks++;
equal(parseEdges('a-b, B-A, C-D'), [['A','B'],['C','D']]);
console.log(`Algorithm assertions passed: ${checks}`);
