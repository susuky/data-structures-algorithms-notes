'use strict';

const assert = require('node:assert/strict');
const { sortTrace, pathBoard, pathTrace, searchTrace, heapTrace, bstTrace, hashTrace } = require('../source/exploration-studio.js');

const duplicateValues = [4, 4, 1];
for (const algorithm of ['insertion', 'selection', 'bubble']) {
  const result = sortTrace(duplicateValues, algorithm).at(-1);
  assert.deepEqual(result.values, [1, 4, 4]);
  assert.deepEqual(result.origins, algorithm === 'selection' ? [2, 1, 0] : [2, 0, 1]);
  assert.equal(result.comparisons, 3);
  assert.equal(result.swaps, algorithm === 'selection' ? 1 : 2);

  const signed = [-7, 0, -99, 5, 0, 99, -7];
  assert.deepEqual(sortTrace(signed, algorithm).at(-1).values, [-99, -7, -7, 0, 0, 5, 99]);
}
assert.deepEqual(duplicateValues, [4, 4, 1]);
assert.equal(sortTrace([1, 2, 3, 4], 'bubble').at(-1).comparisons, 3);

const weighted = pathBoard('weighted');
const bfs = pathTrace(weighted, false).at(-1);
const dijkstra = pathTrace(weighted, true).at(-1);
assert.equal(bfs.route.length - 1, 6);
assert.equal(bfs.cost, 26);
assert.equal(dijkstra.route.length - 1, 8);
assert.equal(dijkstra.cost, 8);
for (const result of [bfs, dijkstra]) {
  assert.equal(result.route[0], weighted.start);
  assert.equal(result.route.at(-1), weighted.goal);
  assert.equal(result.cost, result.route.slice(1).reduce((total, cell) => total + weighted.terrain[cell], 0));
  for (let index = 1; index < result.route.length; index++) {
    const previous = result.route[index - 1];
    const current = result.route[index];
    const steps = Math.abs(previous % 9 - current % 9) + Math.abs(Math.floor(previous / 9) - Math.floor(current / 9));
    assert.equal(steps, 1);
    assert.ok(weighted.terrain[current] > 0);
  }
}
const maze = pathBoard('maze');
assert.equal(pathTrace(maze, false).at(-1).cost, pathTrace(maze, true).at(-1).cost);

// Consecutive array indexes at the edge of a row must not be treated as neighbors.
const isolated = { start: 8, goal: 9, terrain: Array(45).fill(0) };
isolated.terrain[8] = isolated.terrain[9] = 1;
for (const weightedSearch of [false, true]) {
  const result = pathTrace(isolated, weightedSearch).at(-1);
  assert.equal(result.done, true);
  assert.deepEqual(result.route, []);
  assert.equal(result.cost, null);
}

const sorted = [-10, -2, 4, 4, 4, 6, 15];
for (const [target, expected, match] of [[4, 2, true], [-99, 0, false], [99, 7, false], [5, 5, false]]) {
  const trace = searchTrace(sorted, target);
  const result = trace.at(-1);
  assert.equal(result.done, true);
  assert.equal(result.left, expected);
  assert.equal(result.right, expected);
  assert.equal(result.match, match);
  assert.ok(result.probes <= Math.ceil(Math.log2(sorted.length + 1)));
}
assert.equal(searchTrace([], 4).at(-1).left, 0);
assert.equal(searchTrace([], 4).at(-1).probes, 0);

function checkHeap(values) {
  assert.ok(values.every((value, index) => index === 0 || values[Math.floor((index - 1) / 2)] <= value));
}
const original = [12, 24, 16, 40, 31, 28, 22];
const inserted = heapTrace(original, 'insert', 5).at(-1);
assert.deepEqual(inserted.values, [5, 12, 16, 24, 31, 28, 22, 40]);
assert.equal(inserted.swaps, 3);
assert.deepEqual(original, [12, 24, 16, 40, 31, 28, 22]);
checkHeap(inserted.values);

let heap = heapTrace(inserted.values, 'insert', 12).at(-1).values;
const removed = [];
while (heap.length) {
  const result = heapTrace(heap, 'remove').at(-1);
  removed.push(result.removed);
  heap = result.values;
  checkHeap(heap);
}
assert.deepEqual(removed, [5, 12, 12, 16, 22, 24, 28, 31, 40]);
assert.deepEqual(heapTrace([], 'insert', -8).at(-1).values, [-8]);

// BST vs AVL height and rotations
const skewedBst = bstTrace([10, 20, 30, 40, 50], 'bst').at(-1);
assert.equal(skewedBst.height, 5);
assert.deepEqual(skewedBst.values, [10, 20, 30, 40, 50]);
const balancedAvl = bstTrace([10, 20, 30, 40, 50], 'avl').at(-1);
assert.equal(balancedAvl.height, 3);
assert.deepEqual(balancedAvl.values, [10, 20, 30, 40, 50]);
const lrInsert = bstTrace([30, 10], 'avl', 'insert', 20).at(-1);
assert.equal(lrInsert.height, 2);
assert.equal(lrInsert.rotations, 2);
assert.equal(lrInsert.tree.key, 20);
assert.equal(bstTrace(lrInsert.tree, 'avl', 'search', 10).at(-1).found, true);
assert.equal(bstTrace(lrInsert.tree, 'avl', 'search', 99).at(-1).found, false);
const bstDeleted = bstTrace([30, 15, 45], 'bst', 'delete', 30).at(-1);
assert.deepEqual(bstDeleted.values, [15, 45]);
assert.equal(bstDeleted.tree.key, 45);

// Hash table chaining and linear probing with tombstones
const chainIns = hashTrace([7, 14, 21], 7, 'chaining', 'insert', 28).at(-1);
assert.deepEqual(chainIns.buckets[0], [7, 14, 21, 28]);
assert.equal(chainIns.count, 4);
assert.equal(hashTrace(chainIns.buckets, 7, 'chaining', 'search', 21).at(-1).found, true);
assert.equal(hashTrace(chainIns.buckets, 7, 'chaining', 'delete', 14).at(-1).buckets[0].includes(14), false);

const probeIns = hashTrace([7, 14], 7, 'probing', 'insert', 21).at(-1);
assert.equal(probeIns.buckets[2].key, 21);
const probeDel = hashTrace(probeIns.buckets, 7, 'probing', 'delete', 14).at(-1);
assert.equal(probeDel.buckets[1].state, 'tombstone');
assert.equal(hashTrace(probeDel.buckets, 7, 'probing', 'search', 21).at(-1).found, true);
const probeReuse = hashTrace(probeDel.buckets, 7, 'probing', 'insert', 28).at(-1);
assert.equal(probeReuse.buckets[1].key, 28);

console.log('Exploration studio models passed');
