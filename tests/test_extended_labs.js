'use strict';
const assert = require('node:assert/strict');
const {algorithms: model} = require('../source/labs.js');
const cases = {};
function finish(key, input) {
  const trace = model[key](input);
  assert.ok(trace.length > 0, key + ' has a trace');
  assert.equal(trace.at(-1).done, true, key + ' terminates');
  assert.equal(trace.filter(frame => frame.done).length, 1);
  for (const frame of trace) {
    assert.ok(frame.explanation.trim().length > 0);
    assert.ok(frame.operation.trim().length > 0);
  }
  cases[key] = (cases[key] || 0) + 1;
  return {trace, last: trace.at(-1)};
}
function arrays(values, maxLength) {
  const result = [[]];
  let frontier = [[]];
  for (let length = 1; length <= maxLength; length++) {
    frontier = frontier.flatMap(prefix => values.map(value => [...prefix, value]));
    result.push(...frontier);
  }
  return result;
}
for (let n = 0; n <= 9; n++) {
  const {last} = finish('pair-count', {n});
  const pairs = [];
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) pairs.push([b, a]);
  assert.equal(last.result, pairs.length);
  assert.equal(last.cells.length, pairs.length);
  for (const pair of pairs) assert.equal(last.cells.filter(cell => cell[0] === pair[0] && cell[1] === pair[1]).length, 1);
}
for (const values of arrays([-1, 0, 1], 4)) {
  for (let target = -2; target <= 2; target++) {
    let answer = null;
    outer: for (let right = 1; right < values.length; right++)
      for (let left = 0; left < right; left++)
        if (values[left] + values[right] === target) {answer = [left, right]; break outer;}
    const {last} = finish('hash-lookup', {array: values.join(','), target});
    assert.deepEqual(last.result, answer);
  }
  const {trace, last} = finish('linked-reverse', {array: values.join(',')});
  const visited = [], actual = [];
  let node = last.previous;
  while (node !== null) {
    assert.ok(!visited.includes(node), 'reversed list contains no cycle');
    visited.push(node); actual.push(values[node]); node = last.next[node];
  }
  assert.deepEqual(visited, values.map((_, index) => values.length - 1 - index));
  assert.deepEqual(actual, last.result);
  assert.deepEqual(trace[0].next, values.map((_, index) => index + 1 < values.length ? index + 1 : null));

  const stack = finish('monotonic-stack', {array: values.join(',')});
  const expected = values.map((value, index) => {
    for (let next = index + 1; next < values.length; next++) if (values[next] > value) return next;
    return null;
  });
  assert.deepEqual(stack.last.result, expected);
  for (const frame of stack.trace) for (let index = 1; index < frame.stack.length; index++)
    assert.ok(values[frame.stack[index - 1]] >= values[frame.stack[index]]);
}
for (const values of arrays([-2, 0, 2], 5).filter(value => value.length)) {
  for (let k = 1; k <= values.length; k++) {
    const {trace, last} = finish('heap-top-k', {array: values.join(','), k});
    const expected = [...values].sort((a, b) => b - a).slice(0, k);
    assert.deepEqual(last.result.top, expected);
    assert.equal(last.result.kth, expected.at(-1));
    for (const frame of trace.filter(item => item.operation === '# prefix processed' || item.done)) {
      for (let child = 1; child < frame.heap.length; child++)
        assert.ok(frame.heap[Math.floor((child - 1) / 2)] <= frame.heap[child]);
      const prefix = values.slice(0, frame.current + 1).sort((a, b) => b - a).slice(0, k);
      assert.deepEqual([...frame.heap].sort((a, b) => b - a), prefix);
    }
  }
}
const intervalPool = [];
for (let start = 0; start < 4; start++) for (let end = start + 1; end <= 4; end++) intervalPool.push([start, end]);
function compatible(intervals) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  return sorted.every((interval, index) => !index || interval[0] >= sorted[index - 1][1]);
}
for (let mask = 1; mask < 2 ** intervalPool.length; mask++) {
  const intervals = intervalPool.filter((_, bit) => mask & (1 << bit));
  let best = 0;
  for (let subset = 0; subset < 2 ** intervals.length; subset++) {
    const selected = intervals.filter((_, bit) => subset & (1 << bit));
    if (selected.length > best && compatible(selected)) best = selected.length;
  }
  const {last} = finish('interval-greedy', {intervals: intervals.map(item => item.join('-')).join(',')});
  assert.equal(last.result.length, best);
  assert.ok(compatible(last.result));
}
for (const labels of arrays(['A', 'B', 'C'], 5).filter(value => value.length)) {
  for (let k = 0; k <= 3; k++) {
    let answer = {left: 0, right: 0, length: 0};
    for (let left = 0; left < labels.length; left++) {
      for (let right = left + 1; right <= labels.length; right++) {
        const distinct = [...new Set(labels.slice(left, right))].length;
        if (distinct <= k && right - left > answer.length) answer = {left, right, length: right - left};
      }
    }
    const {last} = finish('label-window', {labels: labels.join(','), k});
    assert.deepEqual(last.result, answer);
    const count = {};
    for (const label of labels.slice(answer.left, answer.right)) count[label] = (count[label] || 0) + 1;
    assert.deepEqual(Object.fromEntries(last.entries), count);
    assert.deepEqual(last.active, labels.map((_, index) => index).filter(index => index >= answer.left && index < answer.right));
  }
}
const nodes = ['A', 'B', 'C', 'D', 'E', 'F'], edgePool = [];
for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) edgePool.push([nodes[a], nodes[b]]);
for (let mask = 0; mask < 2 ** edgePool.length; mask++) {
  const edges = edgePool.filter((_, bit) => mask & (1 << bit));
  const adjacency = Object.fromEntries(nodes.map(node => [node, []]));
  for (const [a, b] of edges) {adjacency[a].push(b); adjacency[b].push(a);}
  const groups = {};
  let component = 0;
  for (const seed of nodes) {
    if (groups[seed] !== undefined) continue;
    const frontier = [seed]; groups[seed] = component;
    while (frontier.length) {
      const node = frontier.pop();
      for (const neighbor of adjacency[node]) if (groups[neighbor] === undefined) {groups[neighbor] = component; frontier.push(neighbor);}
    }
    component++;
  }
  const {trace, last} = finish('union-find', {edges: edges.map(edge => edge.join('-')).join(',')});
  assert.equal(last.result.components, component);
  const root = node => {
    for (let hops = 0; hops < nodes.length; hops++) {
      if (last.parent[node] === node) return node;
      node = last.parent[node];
    }
    assert.fail('parent cycle');
  };
  for (const a of nodes) for (const b of nodes) assert.equal(root(a) === root(b), groups[a] === groups[b]);
  for (const representative of nodes.filter(node => last.parent[node] === node))
    assert.equal(last.size[representative], nodes.filter(node => root(node) === representative).length);
  assert.deepEqual(trace[0].parent, Object.fromEntries(nodes.map(node => [node, node])));
}
const fullChain = finish('union-find', {edges: 'A-B,B-C,C-D,D-E,E-F,A-F'});
assert.equal(fullChain.last.result.components, 1);
console.log(JSON.stringify({models: Object.keys(cases).length, cases, total: Object.values(cases).reduce((a, b) => a + b, 0)}, null, 2));
