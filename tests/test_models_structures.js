'use strict';
const assert = require('node:assert/strict');
const models = require('../source/models-structures.js');
let checks = 0;
function equal(actual, expected) { assert.deepEqual(actual, expected); checks++; }
function run(key, values) {
  const frames = models[key].run(values);
  assert(frames.length > 0 && frames.every(f => f.title && f.explanation));
  for (const f of frames) {
    if (key === 'sweep-line') equal(f.graph.edges.filter(e => e.state === 'active').length, f.vars['目前重疊數']);
    if (f.graph) {
      const nodes = new Set(f.graph.nodes.map(n => n.id));
      assert.equal(nodes.size, f.graph.nodes.length);
      assert(f.graph.nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y)));
      assert(f.graph.edges.every(e => nodes.has(e.from) && nodes.has(e.to)));
    }
  }
  checks++;
  return frames;
}
const result = (key, values) => run(key, values).at(-1).result;
for (const [key, model] of Object.entries(models)) for (const p of model.presets) run(key, p.values);
for (let n = 1; n <= 7; n++) for (let seed = 0; seed < 30; seed++) {
  const array = Array.from({length:n}, (_, i) => (i * 7 + seed * 3) % 13 - 6), index = seed % n, value = seed % 11 - 5;
  const copy = array.slice(); copy[index] = value;
  for (let left = 0; left <= n; left++) {
    const right = left + seed % (n - left + 1);
    equal(result('segment-tree', {array:array.join(','), index, value, left, right}), copy.slice(left, right).reduce((a, b) => a + b, 0));
  }
  const delta = seed - 15, end = seed % (n + 1); copy[index] = array[index] + delta;
  equal(result('fenwick-tree', {array:array.join(','), index, delta, end}), copy.slice(0, end).reduce((a, b) => a + b, 0));
  const remove = array[seed % n], query = seed % 15 - 7;
  const expected = [...new Set(array)].filter(x => x !== remove).sort((a, b) => a - b);
  const frames = run('ordered-set', {array:array.join(','), remove, query});
  equal(frames.at(-1).result, {values:expected, lowerBound:expected.find(x => x >= query) ?? null});
  function verify(node, lo = -Infinity, hi = Infinity) {
    if (!node) return 0;
    assert(lo < node.key && node.key < hi);
    const left = verify(node.left, lo, node.key), right = verify(node.right, node.key, hi);
    assert(Math.abs(left - right) <= 1); equal(node.h, 1 + Math.max(left, right));
    return node.h;
  }
  frames.forEach(f => verify(f.tree));
}
function components(n, edges, skipVertex = -1, skipEdge = -1) {
  const adj = Array.from({length:n}, () => []);
  edges.forEach(([a,b], i) => { if (a !== skipVertex && b !== skipVertex && i !== skipEdge) {adj[a].push(b);adj[b].push(a);} });
  const seen = new Set([skipVertex]); let count = 0;
  for (let i = 0; i < n; i++) if (!seen.has(i)) {
    count++; const queue = [i]; seen.add(i);
    while (queue.length) for (const v of adj[queue.shift()]) if (!seen.has(v)) {seen.add(v);queue.push(v);}
  }
  return count;
}
function bruteForest(n, edges) {
  const target = n - components(n, edges); let best = Infinity;
  for (let mask = 0; mask < 2 ** edges.length; mask++) {
    const chosen = edges.filter((_, i) => mask & 2 ** i);
    if (chosen.length === target && components(n, chosen) === n - target) best = Math.min(best, chosen.reduce((s, e) => s + e[2], 0));
  }
  return best;
}
for (let mask = 0; mask < 64; mask++) {
  const candidates = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]], edges = candidates.filter((_,i) => mask & 2 ** i);
  if (mask % 5 === 0 && edges.length) edges.push(edges[0]);
  const encoded = edges.map(e => e.join('-')).join(','), n = 4;
  const b = result('biconnected', {n, edges:encoded}), baseline = components(n, edges);
  equal(b.cuts, [0,1,2,3].filter(v => components(n, edges, v) > baseline));
  equal(b.bridges.slice().sort((a,b)=>a-b), edges.flatMap((_,i)=>components(n, edges, -1, i) > baseline ? [i] : []));
  equal(b.blocks.flat().sort((a,b)=>a-b), edges.map((_,i)=>i));
  const candidateBlocks=[];
  for(let subset=1;subset<2**n;subset++){
    const vertices=[0,1,2,3].filter(v=>subset&2**v);
    if(vertices.length<2)continue;
    const ids=edges.flatMap(([a,b],i)=>vertices.includes(a)&&vertices.includes(b)?[i]:[]);
    const sub=ids.map(i=>edges[i].map(v=>vertices.indexOf(v)));
    if(components(vertices.length,sub)===1&&vertices.every((_,i)=>components(vertices.length,sub,i)<=1))candidateBlocks.push({subset,ids});
  }
  equal(b.blocks.map(block=>block.slice().sort((a,b)=>a-b).join(',')).sort(),candidateBlocks.filter(c=>!candidateBlocks.some(d=>d.subset!==c.subset&&(d.subset&c.subset)===c.subset)).map(c=>c.ids.join(',')).sort());
  for (const block of b.blocks) {
    const vs = [...new Set(block.flatMap(i=>edges[i]))];
    const sub = block.map(i=>edges[i].map(v=>vs.indexOf(v)));
    assert(vs.every(v => components(vs.length, sub, vs.indexOf(v)) <= 1));
  }
  const weighted = edges.map(([a,b],i)=>[a,b,(i*3+mask)%9-4]);
  equal(result('kruskal', {n, edges:weighted.map(([a,b,w])=>a+'-'+b+':'+w).join(',')}).cost, bruteForest(n, weighted));
  const circuit = result('euler-circuit', {n, edges:encoded}), degree = Array(n).fill(0);
  edges.forEach(([a,b])=>{degree[a]++;degree[b]++;});
  const possible = degree.every(x=>x%2===0) && baseline-degree.filter(x=>x===0).length <= 1;
  equal(circuit !== null, possible);
  if (circuit) {
    equal(circuit[0], circuit.at(-1));
    equal(circuit.slice(1).map((v,i)=>[circuit[i],v].sort().join('-')).sort(), edges.map(e=>e.slice().sort().join('-')).sort());
  }
}
equal(result('euler-circuit', {n:1, edges:'0-0,0-0'}), [0,0,0]);
for (let mask = 0; mask < 64; mask++) {
  const candidates = [[0,1],[1,0],[0,2],[2,0],[1,2],[2,1]], edges = candidates.filter((_,i)=>mask&2**i), n=3;
  const reach = Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j));
  edges.forEach(([a,b])=>reach[a][b]=true);
  for(let k=0;k<n;k++)for(let i=0;i<n;i++)for(let j=0;j<n;j++)reach[i][j] ||= reach[i][k]&&reach[k][j];
  const groups = result('tarjan-scc', {n, edges:edges.map(e=>e.join('>')).join(',')}), label=[];
  groups.forEach((group,i)=>group.forEach(v=>label[v]=i));
  for(let a=0;a<n;a++)for(let b=0;b<n;b++)equal(label[a]===label[b],reach[a][b]&&reach[b][a]);
  const weights=edges.map(([a,b],i)=>[a,b,(mask+i)%2]), dist=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?0:Infinity));
  weights.forEach(([a,b,w])=>dist[a][b]=Math.min(dist[a][b],w));
  for(let k=0;k<n;k++)for(let a=0;a<n;a++)for(let b=0;b<n;b++)dist[a][b]=Math.min(dist[a][b],dist[a][k]+dist[k][b]);
  const encoded=weights.map(([a,b,w])=>a+'>'+b+':'+w).join(',');
  equal(result('zero-one-bfs',{n,edges:encoded,start:0}),dist[0].map(x=>x===Infinity?null:x));
  equal(result('bellman-ford',{n,edges:encoded,start:0}),{negativeCycle:false,distance:dist[0].map(x=>x===Infinity?null:x)});
}
equal(result('bellman-ford',{n:3,edges:'0>1:0,1>2:-1,2>1:0',start:0}).negativeCycle,true);
equal(result('bellman-ford',{n:3,edges:'1>2:-1,2>1:-1',start:0}),{negativeCycle:false,distance:[0,null,null]});
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const grid=Array.from({length:9},(_,i)=>[i%3,Math.floor(i/3)]);
for(let mask=0;mask<512;mask++){
  const points=grid.filter((_,i)=>mask&2**i),hull=result('convex-hull',{points:points.map(p=>p.join(':')).join(',')});
  equal(new Set(hull.map(p=>p.join(','))).size,hull.length);
  if(hull.length>=3){assert(hull.every((p,i)=>cross(hull[(i+hull.length-2)%hull.length],hull[(i+hull.length-1)%hull.length],p)>0));assert(hull.every((p,i)=>points.every(q=>cross(hull[(i+hull.length-1)%hull.length],p,q)>=0)));}
  else if(hull.length===2)assert(points.every(p=>cross(hull[0],hull[1],p)===0));
  else equal(hull,points);
}
const intervals=[];for(let a=-2;a<=2;a++)for(let b=a;b<=3;b++)intervals.push([a,b]);
for(let i=0;i<intervals.length;i++)for(let j=0;j<intervals.length;j++){
  const input=[intervals[i],intervals[j]],counts=Array.from({length:6},(_,k)=>input.filter(([a,b])=>a<=k-2&&k-2<b).length);
  equal(result('sweep-line',{intervals:input.map(p=>p.join(':')).join(',')}),{length:counts.filter(Boolean).length,peak:Math.max(...counts)});
}
assert.throws(()=>models['zero-one-bfs'].run({n:2,edges:'0>1:2',start:0}));
assert.throws(()=>models.biconnected.run({n:2,edges:'0-0'}));
assert.throws(()=>models['segment-tree'].run({array:'1,2',index:0,value:3,left:2,right:1}));
console.log(`Structure models: ${checks} result, graph, AVL and boundary checks passed across ${Object.keys(models).length} models`);
