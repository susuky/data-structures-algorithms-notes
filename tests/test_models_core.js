'use strict';
const assert=require('node:assert/strict'),models=require('../source/models-core.js');
let checks=0;
function eq(actual,expected){assert.deepEqual(actual,expected);checks++;}
function run(key,input){const frames=models[key].run(input);assert(frames.length>0);for(const f of frames){assert.equal(typeof f.title,'string');assert.equal(typeof f.explanation,'string');assert(f.title.trim()&&f.explanation.trim());}return frames.at(-1).result;}
function arrays(values,max){const out=[[]];for(let n=1;n<=max;n++){const previous=out.filter(a=>a.length===n-1);for(const a of previous)for(const x of values)out.push([...a,x]);}return out;}
for(const a of arrays([-1,0,2],5)){
 const raw=a.join(',');
 for(let l=0;l<=a.length;l++)for(let r=l;r<=a.length;r++)eq(run('prefix-sum',{array:raw,left:l,right:r}),a.slice(l,r).reduce((s,x)=>s+x,0));
 let pairs=0;const counts={};for(let i=0;i<a.length;i++){counts[a[i]]=(counts[a[i]]||0)+1;for(let j=0;j<i;j++)if(a[i]===a[j])pairs++;}
 eq(run('frequency-count',{array:raw}),{counts,pairs});eq(run('recursion-sum',{array:raw}),a.reduce((s,x)=>s+x,0));
 for(let k=1;k<=a.length;k++)eq(run('monotonic-queue',{array:raw,k}),a.slice(k-1).map((_,i)=>Math.max(...a.slice(i,i+k))));
}
for(let mask=0;mask<64;mask++)for(let bit=0;bit<6;bit++)for(const operation of ['set','clear','toggle']){
 const flag=2**bit,has=Math.floor(mask/flag)%2===1,want=operation==='set'?(has?mask:mask+flag):operation==='clear'?(has?mask-flag:mask):(has?mask-flag:mask+flag);
 const result=run('bitmask-set',{mask,bit,operation});eq(result.mask,want);eq(result.members,Array.from({length:6},(_,i)=>i).filter(i=>Math.floor(want/2**i)%2===1));
}
for(const a of arrays(['a','b','🙂'],5)){
 let best=[0,0];for(let l=0;l<a.length;l++)for(let r=l+1;r<=a.length;r++)if(new Set(a.slice(l,r)).size===r-l&&r-l>best[1]-best[0])best=[l,r];
 eq(run('unique-string',{text:a.join('')}),{length:best[1]-best[0],text:a.slice(...best).join(''),left:best[0],right:best[1]});
}
for(let mask=1;mask<16;mask++){const coins=[1,2,3,4].filter((_,i)=>mask&(1<<i));for(let amount=0;amount<=14;amount++){
 const dp=Array(amount+1).fill(99);dp[0]=0;for(let s=1;s<=amount;s++)for(const c of coins)if(c<=s)dp[s]=Math.min(dp[s],dp[s-c]+1);
 eq(run('memo-coins',{coins:coins.join(','),amount}).value,dp[amount]===99?-1:dp[amount]);
}}
for(const cells of arrays([null,0,1,3],6).filter(a=>a.length===6)){
 const grid=[cells.slice(0,3),cells.slice(3)];
 const paths=[];function walk(r,c,sum){if(r>=2||c>=3||grid[r][c]===null)return;sum+=grid[r][c];if(r===1&&c===2){paths.push(sum);return;}walk(r+1,c,sum);walk(r,c+1,sum);}walk(0,0,0);
 eq(run('matrix-cost',{grid:grid.map(row=>row.map(x=>x===null?'x':x).join(',')).join(';')}),paths.length?Math.min(...paths):null);
}
for(let mask=0;mask<128;mask++){
 if(Array.from({length:7},(_,i)=>i).some(i=>i>0&&(mask&(1<<i))&&!(mask&(1<<Math.floor((i-1)/2)))))continue;
 const values=Array.from({length:7},(_,i)=>mask&(1<<i)?i+1:null);
 for(const order of ['pre','in','post']){const expected=[];function visit(i){if(i>=7||values[i]===null)return;if(order==='pre')expected.push(values[i]);visit(2*i+1);if(order==='in')expected.push(values[i]);visit(2*i+2);if(order==='post')expected.push(values[i]);}visit(0);eq(run('tree-dfs',{tree:values.map(v=>v===null?'null':v).join(','),order}),expected);}
}
function perms(a){if(!a.length)return[[]];return a.flatMap((v,i)=>perms(a.filter((_,j)=>i!==j)).map(p=>[v,...p]));}
for(const order of perms([1,2,3,4,5]))for(let target=0;target<=6;target++){
 const result=run('bst-search',{array:order.join(','),target});eq(result.found,order.includes(target));eq(new Set(result.path).size,result.path.length);if(result.found)eq(result.path.at(-1),target);
}
const possible=[];for(const a of ['A','B','C','D'])for(const b of ['A','B','C','D'])if(a!==b)possible.push([a,b]);
for(let mask=0;mask<1<<possible.length;mask++){
 const edges=possible.filter((_,i)=>mask&(1<<i)),state={};let cycle=false;
 function dfs(v){state[v]=1;for(const[a,b]of edges)if(a===v){if(state[b]===1)cycle=true;else if(!state[b])dfs(b);}state[v]=2;}for(const v of ['A','B','C','D','E','F'])if(!state[v])dfs(v);
 const r=run('topological-sort',{edges:edges.map(e=>e.join('-')).join(',')});eq(r.cycle,cycle);if(!cycle){eq(r.order.length,6);for(const[a,b]of edges)assert(r.order.indexOf(a)<r.order.indexOf(b));}
}
const pool=['a','ab','ace','b','bee','cat'];
for(let mask=0;mask<64;mask++){const words=pool.filter((_,i)=>mask&(1<<i));for(const query of ['','a','ab','ac','ace','b','be','bee','ca','cat','z'])eq(run('trie-prefix',{words:words.join(','),query}),{prefix:query===''||words.some(w=>w.startsWith(query)),exact:words.includes(query)});}
for(const [key,model]of Object.entries(models)){const defaults=Object.fromEntries(model.inputs.map(i=>[i.name,i.value]));run(key,defaults);for(const preset of model.presets)run(key,{...defaults,...preset.values});}
assert.throws(()=>models['prefix-sum'].run({array:'1,2',left:2,right:1}));
assert.throws(()=>models['topological-sort'].run({edges:'A-Z'}));
assert.throws(()=>models['matrix-cost'].run({grid:'1,2;3'}));
assert.throws(()=>models['tree-dfs'].run({tree:'null,1',order:'pre'}));
assert.throws(()=>models['memo-coins'].run({coins:'0,1',amount:3}));

for(let n=0;n<=8;n++){
 const a=Array.from({length:n},(_,i)=>i-3),frames=models['recursion-sum'].run({array:a.join(',')});
 eq(frames.filter(f=>f.title.startsWith('呼叫 total(')).length,n?2*n-1:1);
 const depth=Math.max(...frames.map(f=>f.rows.find(r=>r.label==='呼叫堆疊')?.cells.length||0));
 eq(depth,n?Math.ceil(Math.log2(n))+1:1);
}
for(const [coins,amount] of [['1,3,4',6],['2,4',7],['2,3',0],['3,5',14]]){
 const frames=models['memo-coins'].run({coins,amount});
 const expansions=frames.filter(f=>f.title.startsWith('求 best(')).map(f=>f.title);
 eq(new Set(expansions).size,expansions.length);
 assert(expansions.length<=amount+1);
 const result=frames.at(-1).result;
 eq(result.calls,expansions.length+result.hits);
 eq(Object.keys(result.memo).length,expansions.length);
}
for(const [grid,expected] of [['0,-5;2,-1',-6],['0,1;-9,1',-8],['x,-5;1,2',null],['1,2;3,x',null],['-4',-4],['1,-5,2;2,x,-4',-6]])
 eq(run('matrix-cost',{grid}),expected);
for(const [text,expected] of [
 ['e\u0301e',{length:2,text:'e\u0301',left:0,right:2}],
 ['👩‍💻👩',{length:3,text:'👩‍💻',left:0,right:3}],
 ['🇹🇼🇹',{length:2,text:'🇹🇼',left:0,right:2}],
 ['🙂'.repeat(18),{length:1,text:'🙂',left:0,right:1}]
])eq(run('unique-string',{text}),expected);
assert.throws(()=>models['unique-string'].run({text:'🙂'.repeat(19)}));
const sparseTree='1,null,2,null,null,3,4';
for(const [order,expected] of [['pre',[1,2,3,4]],['in',[1,3,2,4]],['post',[3,4,2,1]]]){
 const frames=models['tree-dfs'].run({tree:sparseTree,order});
 eq(frames.at(-1).result,expected);
 for(const f of frames)if(f.graph){
  const ids=new Set(f.graph.nodes.map(n=>n.id));
  assert(f.graph.edges.every(e=>ids.has(e.from)&&ids.has(e.to)));
 }
}
assert.throws(()=>models['tree-dfs'].run({tree:'1,null,2,3',order:'in'}));
eq(run('bst-search',{array:'8,3,10,1,6,9',target:6}).path,[8,3,6]);
eq(run('bst-search',{array:'8,3,10,1,6,9',target:7}).path,[8,3,6]);
assert.throws(()=>models['bst-search'].run({array:'2,2',target:2}));
console.log('core topic models: '+Object.keys(models).length+' models, '+checks+' independent result checks passed');
