'use strict';
const assert = require('node:assert/strict');
const models = require('../source/models-applied.js');
let checks = 0;
const equal = (a,b) => { assert.deepEqual(a,b); checks++; };
const okay = value => { assert.ok(value); checks++; };
function execute(key,input) {
  const frames=models[key].run(input);
  okay(frames.length>0);
  for(const f of frames) {
    okay(typeof f.title==='string'&&f.title.trim());
    okay(typeof f.explanation==='string'&&f.explanation.trim());
    for(const row of f.rows||[])for(const cell of row.cells)okay(typeof cell==='string'||typeof cell==='number'||(cell&&typeof cell.text==='string'));
    if(f.table)for(const row of f.table.rows) {
      equal(row.length,f.table.columns.length);
      for(const cell of row)okay(typeof cell==='string'||(typeof cell==='number'&&Number.isFinite(cell)));
    }
  }
  return frames.at(-1).result;
}
const run=(key,input)=>models[key].run(input).at(-1).result;
for(const [key,model] of Object.entries(models)) {
  execute(key,Object.fromEntries(model.inputs.map(i=>[i.name,i.value])));
  for(const sample of model.presets)execute(key,sample.values);
}
let seed=275;
function random(max){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%max;}
function array(n){return Array.from({length:n},()=>random(15)-7);}

// Reference LRU stores a plain recency array, independently of model pointers.
for(let capacity=0;capacity<=5;capacity++)for(let sample=0;sample<70;sample++) {
  const operations=[],order=[],values={},outputs=[];
  for(let i=0;i<12;i++) {
    const key='ABCD'[random(4)];
    if(random(3)===0) {
      operations.push('get:'+key);
      outputs.push(Object.hasOwn(values,key)?values[key]:null);
      if(Object.hasOwn(values,key)){order.splice(order.indexOf(key),1);order.push(key);}
    } else {
      const value=random(20)-10;operations.push('put:'+key+':'+value);
      if(Object.hasOwn(values,key))order.splice(order.indexOf(key),1);
      values[key]=value;order.push(key);
      if(order.length>capacity)delete values[order.shift()];
    }
  }
  equal(run('lru-cache',{capacity,operations:operations.join(',')}),{order,values,outputs});
}
for(let n=1;n<=6;n++) {
  const ids='ABCDEF'.slice(0,n).split('');
  for(const move of ids)for(const after of ids) {
    const expected=[...ids];
    if(move!==after){expected.splice(expected.indexOf(move),1);expected.splice(expected.indexOf(after)+1,0,move);}
    const actual=run('list-splice',{nodes:ids.join(','),move,after});
    equal(actual.order,expected);
    const all=['head',...expected,'tail'];
    all.forEach((id,i)=>equal(actual.links[id],{prev:all[i-1]??null,next:all[i+1]??null}));
  }
}
for(let sample=0;sample<100;sample++) {
  const rows=Array.from({length:random(6)},()=>array(random(5)));
  const requests=random(13),flat=rows.flat();
  const result=run('lazy-iterator',{rows:rows.map(row=>row.join(',')).join(';'),requests});
  equal(result.output,flat.slice(0,requests));
  equal(result.exhausted,requests>flat.length);
}
for(let sample=0;sample<180;sample++) {
  const values=array(random(13));
  const result=run('stream-median',{values:values.join(',')});
  const expected=values.map((_,i)=>{const prefix=values.slice(0,i+1).sort((a,b)=>a-b),n=prefix.length;return (prefix[(n-1)>>1]+prefix[n>>1])/2;});
  equal(result.medians,expected);
  okay(result.low.length===result.high.length||result.low.length===result.high.length+1);
  if(result.high.length)okay(Math.max(...result.low)<=Math.min(...result.high));
  for(let i=1;i<result.low.length;i++)okay(result.low[(i-1)>>1]>=result.low[i]);
  for(let i=1;i<result.high.length;i++)okay(result.high[(i-1)>>1]<=result.high[i]);
}
for(let maxTake=1;maxTake<=6;maxTake++)for(let stones=0;stones<=24;stones++) {
  const result=run('stone-game',{stones,maxTake});
  result.win.forEach((v,s)=>equal(v,s%(maxTake+1)!==0));
  result.choice.forEach((take,s)=>{if(take!==null){okay(take>=1&&take<=maxTake);equal(result.win[s-take],false);}});
}
function minimaxReference(leaves) {
  let level=[...leaves],maximize=Math.log2(leaves.length)%2===1;
  while(level.length>1) {
    const next=[];
    for(let i=0;i<level.length;i+=2)next.push(maximize?Math.max(level[i],level[i+1]):Math.min(level[i],level[i+1]));
    level=next;maximize=!maximize;
  }
  return level[0];
}
for(const n of [1,2,4,8])for(let sample=0;sample<120;sample++) {
  const leaves=array(n),expected=minimaxReference(leaves);
  for(const pruning of [0,1]) {
    const result=run('minimax-tree',{leaves:leaves.join(','),pruning});
    equal(result.value,expected);
    if(!pruning)equal(result.visited.length,n);
    equal(new Set(result.visited).size,result.visited.length);
    for(const index of result.visited)okay(!result.pruned.includes(n+index));
  }
}
equal(run('minimax-tree',{leaves:'3,5,2,9',pruning:1}).visited,[0,1,2]);
for(let n=0;n<=9;n++)for(let mask=0;mask<2**n;mask++) {
  const bits=Array.from({length:n},(_,i)=>(mask>>i)&1);
  const result=run('parity-lights',{bits:bits.join(',')});
  equal(result.possible,bits.filter(Boolean).length%2===0);
  if(result.possible){
    const actual=[...bits];
    for(const [a,b] of result.moves){okay(a!==b);actual[a]^=1;actual[b]^=1;}
    equal(actual,Array(n).fill(0));
    equal(result.moves.length,bits.filter(Boolean).length/2);
  }
}
equal(run('sql-ranking',{orders:'A:12,A:8,B:20,C:7',top:2}),[['A',20,1],['B',20,1],['C',7,2]]);
equal(run('sql-ranking',{orders:'A:-2,A:2,B:0,C:-1',top:1}),[['A',0,1],['B',0,1]]);
equal(run('sql-ranking',{orders:'',top:1}),[]);
equal(run('shell-frequency',{text:'Tea, coffee TEA. tea!'}),[['tea',3],['coffee',1]]);
equal(run('shell-frequency',{text:'X2y x_Y'}),[['x',2],['y',2]]);
equal(run('shell-frequency',{text:'... 123 !!!'}),[]);
for(const schedule of ['AABB','ABAB','ABBA','BAAB','BABA','BBAA']) {
  equal(run('thread-interleaving',{schedule,locked:1}).value,2);
  equal(run('thread-interleaving',{schedule,locked:0}).value,['AABB','BBAA'].includes(schedule)?2:1);
}
for(const n of [...Array.from({length:40},(_,i)=>i+1),100,128])for(let secret=1;secret<=n;secret++) {
  const result=run('oracle-search',{n,secret});
  equal(result.answer,secret);okay(result.queries<=Math.floor(Math.log2(n))+1);
}
for(let sample=0;sample<250;sample++) {
  const values=array(random(9)),target=random(15)-7,answers=[];
  for(let mask=0;mask<2**values.length;mask++){
    const indices=values.map((_,i)=>i).filter(i=>mask&(1<<i));
    if(indices.length===3&&indices.reduce((s,i)=>s+values[i],0)===target)answers.push(indices);
  }
  answers.sort((a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2]);
  const result=run('triple-enumeration',{values:values.join(','),target});
  equal(result.answers,answers);equal(result.examined,values.length < 3 ? 0 : values.length*(values.length-1)*(values.length-2)/6);
}
for(let sample=0;sample<400;sample++) {
  const values=array(random(11)),target=random(25)-12;let expected=0;
  for(let mask=0;mask<2**values.length;mask++) {
    let total=0;values.forEach((value,i)=>{if(mask&(1<<i))total+=value;});
    if(total===target)expected++;
  }
  equal(run('subset-mitm',{values:values.join(','),target}).count,expected);
}
equal(run('subset-mitm',{values:'0,0,0',target:0}).count,8);
// Independently advance a clock one tick at a time for the simulation oracle.
for(let sample=0;sample<150;sample++){
  const jobs=Array.from({length:random(8)},()=>[random(18),random(5)+1]),waiting=[],expected=[],starts={};
  let current=null,remaining=0,now=0;
  while(expected.length<jobs.length){
    if(current!==null&&remaining===0){expected.push([current,starts[current],now,starts[current]-jobs[current][0]]);current=null;}
    jobs.forEach(([arrival],id)=>{if(arrival===now)waiting.push(id);});
    if(current===null&&waiting.length){current=waiting.shift();starts[current]=now;remaining=jobs[current][1];}
    if(current!==null)remaining--;
    now++;
  }
  const result=run('fcfs-simulation',{jobs:jobs.map(job=>job.join(':')).join(',')});
  equal(result.jobs,expected);
}
for(const [key,input] of [
 ['lru-cache',{capacity:2,operations:'put:A'}],
 ['list-splice',{nodes:'A,A',move:'A',after:'A'}],
 ['lazy-iterator',{rows:'1,NaN',requests:1}],
 ['stream-median',{values:'1,,2'}],
 ['stone-game',{stones:7,maxTake:0}],
 ['minimax-tree',{leaves:'1,2,3',pruning:0}],
 ['parity-lights',{bits:'0,2'}],
 ['sql-ranking',{orders:'A:x',top:2}],
 ['shell-frequency',{text:'x'.repeat(241)}],
 ['thread-interleaving',{schedule:'AAAB',locked:0}],
 ['oracle-search',{n:2,secret:3}],
 ['triple-enumeration',{values:'1,2',target:NaN}],
 ['subset-mitm',{values:'1,2',target:1001}],
 ['fcfs-simulation',{jobs:'0:0'}]
]) {assert.throws(()=>models[key].run(input),Error);checks++;}
console.log('14 applied models: '+checks+' assertions passed');
