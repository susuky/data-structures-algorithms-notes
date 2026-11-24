/* Pure, input-driven traces for foundational categories. */
(function(root,factory){const models=factory();if(typeof module==='object'&&module.exports)module.exports=models;else root.TopicModels=Object.assign(root.TopicModels||{},models);})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const models={};
const copy=x=>JSON.parse(JSON.stringify(x));
const num=(v,min,max,label)=>{if(String(v).trim()===''||!Number.isInteger(Number(v))||Number(v)<min||Number(v)>max)throw Error(label+'請填 '+min+'–'+max+' 的整數。');return Number(v);};
const nums=(v,minLength=0,maxLength=12)=>{const s=String(v??'').trim(),a=s?s.split(',').map(x=>num(x,-999,999,'陣列元素')):[];if(a.length<minLength||a.length>maxLength)throw Error('請填 '+minLength+'–'+maxLength+' 個整數，以逗號分隔。');return a;};
const input=(name,label,value,type='text')=>({name,label,value,type});
const row=(label,a,active=-1)=>({label,cells:a.map((v,i)=>({text:String(v),state:i===active?'active':''}))});
const frame=(title,explanation,rows,vars={},extra={})=>({title,explanation,rows,vars,...extra});
models['prefix-sum']={title:'兩道前綴之間的總和',inputs:[input('array','整數（最多 12 個）','3, -2, 5, 1, 4'),input('left','起點 left','1','number'),input('right','終點 right（不含）','4','number')],presets:[{label:'含負數',values:{array:'3, -2, 5, 1, 4',left:1,right:4}},{label:'空區間',values:{array:'3, -2, 5',left:2,right:2}},{label:'空陣列',values:{array:'',left:0,right:0}}],run(p){
 const a=nums(p.array),l=num(p.left,0,a.length,'left'),r=num(p.right,l,a.length,'right'),prefix=[0],f=[];
 f.push(frame('保留空前綴','prefix[0] = 0，代表還沒讀入任何元素。',[row('資料',a),row('prefix',prefix)],{left:l,right:r}));
 for(let i=0;i<a.length;i++){prefix.push(prefix.at(-1)+a[i]);f.push(frame('累積到位置 '+(i+1),'prefix['+(i+1)+'] = '+prefix[i]+' + '+a[i]+' = '+prefix[i+1]+'。',[row('資料',a,i),row('prefix',prefix,i+1)],{已處理:i+1}));}
 const sum=prefix[r]-prefix[l];f.push(frame('扣掉左邊那一段','prefix['+r+'] − prefix['+l+'] = '+prefix[r]+' − '+prefix[l]+' = '+sum+'。',[row('資料',a),row('prefix',prefix)],{left:l,right:r,區間和:sum},{result:sum}));return f;
}};
models['frequency-count']={title:'相同數值可以配出幾對',inputs:[input('array','整數（最多 12 個）','2, 1, 2, 2, 1')],presets:[{label:'三個 2',values:{array:'2, 1, 2, 2, 1'}},{label:'全部不同',values:{array:'1, 2, 3'}},{label:'空輸入',values:{array:''}}],run(p){
 const a=nums(p.array),counts={},f=[],rows=i=>[row('資料',a,i)];
 let pairs=0;f.push(frame('先查，再加一','每個新元素只和先前出現的相同值配對。',rows(-1),{配對數:0}));
 for(let i=0;i<a.length;i++){const old=counts[a[i]]||0;pairs+=old;counts[a[i]]=old+1;f.push(frame('讀到 '+a[i],'先前有 '+old+' 個 '+a[i]+'，新增 '+old+' 對，再把次數加一。',rows(i),{配對數:pairs},{table:{columns:['數值','次數'],rows:Object.entries(counts)},result:{counts:copy(counts),pairs}}));}
 f.push(frame('計數完成','每一對在右側元素抵達時恰好計入一次。',rows(-1),{配對數:pairs},{table:{columns:['數值','次數'],rows:Object.entries(counts)},result:{counts,pairs}}));return f;
}};
models['matrix-cost']={title:'上方與左方，選較便宜的一條',inputs:[input('grid','矩陣：逗號分欄、分號換列，x 是障礙（最多 4×5）','1,3,1;1,x,1;4,2,1')],presets:[{label:'中間有障礙',values:{grid:'1,3,1;1,x,1;4,2,1'}},{label:'路線封住',values:{grid:'1,x; x,2'}},{label:'單格',values:{grid:'7'}},{label:'負成本與障礙',values:{grid:'1,-5,2;2,x,-4'}}],run(p){
 const parts=String(p.grid??'').trim().split(';'),grid=parts.map(r=>r.split(',').map(v=>v.trim().toLowerCase()==='x'?null:num(v,-9,99,'格子成本')));
 const m=grid.length,n=grid[0].length;if(m>4||n>5||grid.some(r=>r.length!==n))throw Error('請填列長一致、最多 4×5 的矩陣。');const dp=Array.from({length:m},()=>Array(n).fill(Infinity)),f=[];
 const table=()=>({columns:['row / col',...Array.from({length:n},(_,i)=>String(i))],rows:dp.map((r,i)=>[i,...r.map((v,j)=>grid[i][j]===null?'障礙':v===Infinity?'∞':v)])});
 f.push(frame('從左上開始','只能往右或往下；格子成本包含起點。',[],{},{table:table()}));
 for(let r=0;r<m;r++)for(let c=0;c<n;c++){const cost=grid[r][c],above=r?dp[r-1][c]:Infinity,left=c?dp[r][c-1]:Infinity;if(cost!==null)dp[r][c]=r===0&&c===0?cost:Math.min(above,left)+cost;f.push(frame('處理 ('+r+', '+c+')',cost===null?'障礙保留 ∞，後面的格子無法經由這裡取得有限成本。':r===0&&c===0?'起點先放自己的成本 '+cost+'。':'min('+(above===Infinity?'∞':above)+', '+(left===Infinity?'∞':left)+') + '+cost+' = '+(dp[r][c]===Infinity?'∞':dp[r][c])+'。',[row('這一列成本',grid[r].map(v=>v===null?'x':v),c)],{row:r,col:c},{table:table()}));}
 const result=dp[m-1][n-1]===Infinity?null:dp[m-1][n-1];f.push(frame('讀取右下角',result===null?'右下角仍是 ∞，沒有可通行的路徑。':'右下角的最小總成本是 '+result+'。',[],{答案:result===null?'無路可走':result},{table:table(),result}));return f;
}};
models['monotonic-queue']={title:'視窗最大值的候選隊伍',inputs:[input('array','整數（1–12 個）','1, 3, -1, -3, 5, 3, 6, 7'),input('k','視窗長度 k',3,'number')],presets:[{label:'起伏',values:{array:'1, 3, -1, -3, 5, 3, 6, 7',k:3}},{label:'相同數值',values:{array:'2, 2, 2, 2',k:2}},{label:'遞減',values:{array:'9, 7, 5, 3',k:2}}],run(p){
 const a=nums(p.array,1),k=num(p.k,1,a.length,'k'),q=[],answer=[],f=[],show=(title,explanation,i)=>f.push(frame(title,explanation,[row('資料',a,i),row('候選索引',q),row('候選值',q.map(j=>a[j])),row('各窗最大值',answer)],{right:i,left:Math.max(0,i-k+1)}));
 show('準備候選佇列','隊首是目前最早、最大的候選。',-1);
 for(let i=0;i<a.length;i++){while(q.length&&q[0]<=i-k){const j=q.shift();show('移除過期索引 '+j,'索引 '+j+' 已經落在視窗左界之外。',i);}while(q.length&&a[q.at(-1)]<=a[i]){const j=q.pop();show('尾端候選 '+j+' 退場','新值 '+a[i]+' 至少一樣大，而且較晚過期。',i);}q.push(i);show('加入索引 '+i,'候選值維持由大到小，索引維持由小到大。',i);if(i>=k-1){answer.push(a[q[0]]);show('記下這個視窗的答案','隊首 '+q[0]+' 的值 '+a[q[0]]+' 就是最大值。',i);}}
 f.push(frame('所有視窗完成','每個索引入列一次、最多離開一次；總工作量 O(n)。',[row('最大值',answer)],{k},{result:answer}));return f;
}};
models['bitmask-set']={title:'用一排位元保存集合',inputs:[input('mask','mask（0–63）',10,'number'),input('bit','位置（0–5）',2,'number'),input('operation','操作 set、clear 或 toggle','set')],presets:[{label:'加入位置 2',values:{mask:10,bit:2,operation:'set'}},{label:'移除位置 3',values:{mask:10,bit:3,operation:'clear'}},{label:'切換位置 1',values:{mask:10,bit:1,operation:'toggle'}}],run(p){
 const m=num(p.mask,0,63,'mask'),bit=num(p.bit,0,5,'位置'),op=String(p.operation).trim().toLowerCase();if(!['set','clear','toggle'].includes(op))throw Error('操作請填 set、clear 或 toggle。');
 const bits=x=>Array.from({length:6},(_,i)=>({text:String((x>>(5-i))&1),state:5-i===bit?'active':''})),flag=1<<bit,value=op==='set'?m|flag:op==='clear'?m&~flag:m^flag;
 return [frame('讀取集合','最右邊是位置 0；值為 1 的位置屬於集合。',[row('位置',[5,4,3,2,1,0]),{label:'mask',cells:bits(m)}],{mask:m}),frame('建立單一位置','1 << '+bit+' = '+flag+'，只有位置 '+bit+' 是 1。',[{label:'mask',cells:bits(m)},{label:'旗標',cells:bits(flag)}],{原本存在:Boolean(m&flag)?'是':'否'}),frame('套用 '+op,op==='set'?'OR 把指定位元設成 1。':op==='clear'?'AND 配合反轉旗標，把指定位元清成 0。':'XOR 切換指定位元；其餘位置保持原值。',[{label:'原值',cells:bits(m)},{label:'結果',cells:bits(value)}],{結果:value},{result:{mask:value,members:Array.from({length:6},(_,i)=>i).filter(i=>value&(1<<i))}})];
}};

function treePicture(a,current=-1,done=[]){
 const depth=Math.max(1,Math.floor(Math.log2(Math.max(1,a.length)))+1);
 const nodes=a.flatMap((v,i)=>v===null?[]:[{id:String(i),label:String(v),x:(i-(2**Math.floor(Math.log2(i+1))-1)+.5)*600/2**Math.floor(Math.log2(i+1)),y:30+Math.floor(Math.log2(i+1))*220/Math.max(1,depth-1),state:i===current?'active':done.includes(i)?'done':''}]);
 return {nodes,edges:nodes.filter(n=>n.id!=='0').map(n=>({from:String(Math.floor((Number(n.id)-1)/2)),to:n.id,directed:true}))};
}
models['tree-dfs']={title:'同一棵樹，三種回傳時機',inputs:[input('tree','依陣列位置填樹（最多 15 格，null 是空節點）','5, 3, 8, 1, 4, null, 9'),input('order','順序 pre、in 或 post','in')],presets:[{label:'中序',values:{tree:'5, 3, 8, 1, 4, null, 9',order:'in'}},{label:'前序',values:{tree:'5, 3, 8, 1, 4, null, 9',order:'pre'}},{label:'後序',values:{tree:'5, 3, 8, 1, 4, null, 9',order:'post'}},{label:'空樹',values:{tree:'',order:'in'}},{label:'稀疏右枝',values:{tree:'1,null,2,null,null,3,4',order:'in'}}],run(p){
 const s=String(p.tree??'').trim(),a=s?s.split(',').map(v=>v.trim().toLowerCase()==='null'?null:num(v,-999,999,'節點')):[],order=String(p.order).trim().toLowerCase();
 if(a.length>15)throw Error('樹最多填 15 格。');if(!['pre','in','post'].includes(order))throw Error('順序請填 pre、in 或 post。');
 a.forEach((v,i)=>{if(v!==null&&i>0&&a[Math.floor((i-1)/2)]===null)throw Error('有值的節點上方也需要有父節點。');});
 const stack=[],output=[],done=[],f=[],show=(t,e,i)=>f.push(frame(t,e,[row('呼叫堆疊',stack.map(j=>a[j])),row('輸出',output)],{順序:order},{graph:treePicture(a,i,done)}));
 const emit=i=>{output.push(a[i]);done.push(i);show('輸出 '+a[i],'這次在 '+({pre:'走左子樹之前',in:'左子樹之後、右子樹之前',post:'左右子樹都完成之後'})[order]+' 記下節點值。',i);};
 function visit(i){if(i>=a.length||a[i]===null)return;stack.push(i);show('進入 '+a[i],'呼叫堆疊保留回到父節點後要繼續的工作。',i);if(order==='pre')emit(i);visit(2*i+1);if(order==='in')emit(i);visit(2*i+2);if(order==='post')emit(i);stack.pop();show('返回上一層','目前節點的左右分支都已完成。',i);}
 show('從根開始','位置 i 的左右子節點在 2i+1 與 2i+2；null 表示沒有節點。',-1);visit(0);f.push(frame('走訪完成','每個非空節點進入一次，時間 O(n)，呼叫堆疊最深 O(h)。',[row('輸出',output)],{節點數:output.length},{graph:treePicture(a,-1,done),result:output}));return f;
}};
models['bst-search']={title:'BST 每走一步，排除一側',inputs:[input('array','插入順序（最多 10 個不同整數）','8, 3, 10, 1, 6, 9'),input('target','尋找的值',6,'number')],presets:[{label:'有找到',values:{array:'8, 3, 10, 1, 6, 9',target:6}},{label:'不存在',values:{array:'8, 3, 10, 1, 6, 9',target:7}},{label:'偏斜樹',values:{array:'1, 2, 3, 4, 5',target:5}}],run(p){
 const a=nums(p.array,0,10);if(new Set(a).size!==a.length)throw Error('這個 BST 範例使用不同的整數。');const target=num(p.target,-999,999,'target'),nodes=[];
 for(const value of a){const n={id:nodes.length,value,left:null,right:null};if(!nodes.length){nodes.push(n);continue;}let at=0;while(true){const side=value<nodes[at].value?'left':'right';if(nodes[at][side]===null){nodes[at][side]=n.id;break;}at=nodes[at][side];}nodes.push(n);}
 const sorted=[...a].sort((x,y)=>x-y),depths={};function depth(i,d){if(i===null)return;depths[i]=d;depth(nodes[i].left,d+1);depth(nodes[i].right,d+1);}if(nodes.length)depth(0,0);
 const maxDepth=Math.max(1,...Object.values(depths)),seen=[],f=[];
 const graph=current=>({nodes:nodes.map(n=>({id:String(n.id),label:String(n.value),x:35+(sorted.indexOf(n.value)+.5)*530/Math.max(1,sorted.length),y:30+depths[n.id]*235/maxDepth,state:n.id===current?'active':seen.includes(n.id)?'done':''})),edges:nodes.flatMap(n=>[n.left,n.right].filter(x=>x!==null).map(x=>({from:String(n.id),to:String(x),directed:true})))});
 let at=nodes.length?0:null,found=false;f.push(frame('沿著大小關係找','每個節點的左子樹較小、右子樹較大。',[],{target},{graph:graph(null)}));
 while(at!==null){const n=nodes[at];seen.push(at);if(n.value===target){found=true;f.push(frame('找到 '+target,'目標等於目前節點。',[row('走過的值',seen.map(i=>nodes[i].value))],{target},{graph:graph(at)}));break;}const side=target<n.value?'left':'right';f.push(frame('往'+(side==='left'?'左':'右')+'走',target+(side==='left'?' < ':' > ')+n.value+'，另一側的值都不符合。',[row('走過的值',seen.map(i=>nodes[i].value))],{target},{graph:graph(at)}));at=n[side];}
 f.push(frame(found?'搜尋完成':'走到空連結',found?'找到目標。':'這條路的候選已用完，目標不在樹中。',[row('走過的值',seen.map(i=>nodes[i].value))],{找到:found?'是':'否',比較次數:seen.length},{graph:graph(null),result:{found,path:seen.map(i=>nodes[i].value)}}));return f;
}};
models['topological-sort']={title:'先做沒有前置工作的項目',inputs:[input('edges','A–F 的相依邊，例如 A-B 表示 A 先做','A-C, B-C, C-D, C-E, E-F')],presets:[{label:'有相依',values:{edges:'A-C, B-C, C-D, C-E, E-F'}},{label:'成環',values:{edges:'A-B, B-C, C-A, D-E'}},{label:'互相獨立',values:{edges:''}}],run(p){
 const names=['A','B','C','D','E','F'],edges=[],seen=new Set();
 if(String(p.edges??'').trim())for(const token of String(p.edges).split(',')){const m=/^([A-F])\s*-\s*([A-F])$/.exec(token.trim().toUpperCase());if(!m)throw Error('相依邊請用 A-B，節點限 A–F。');if(!seen.has(m[1]+m[2])){edges.push([m[1],m[2]]);seen.add(m[1]+m[2]);}}
 const degree=Object.fromEntries(names.map(n=>[n,0]));edges.forEach(([,b])=>degree[b]++);const q=names.filter(n=>degree[n]===0),order=[],f=[];
 const show=(title,explanation,current)=>f.push(frame(title,explanation,[row('待辦佇列',q),row('完成順序',order)],{}, {table:{columns:['工作','剩餘前置數'],rows:names.map(n=>[n,degree[n]])},graph:{nodes:names.map((id,i)=>({id,label:id,x:300+230*Math.cos(i*Math.PI/3),y:150+110*Math.sin(i*Math.PI/3),state:id===current?'active':order.includes(id)?'done':''})),edges:edges.map(([from,to])=>({from,to,directed:true}))}}));
 show('找入度為 0 的工作','入度記錄還有幾項前置工作未完成。');
 while(q.length){const v=q.shift();order.push(v);show('完成 '+v,'從待辦佇列取出 '+v+'。',v);for(const [a,b]of edges)if(a===v){degree[b]--;if(degree[b]===0)q.push(b);show('解除 '+b+' 的一項前置',b+' 剩下 '+degree[b]+' 項前置工作。',b);}}
 const cycle=order.length<names.length;f.push(frame(cycle?'剩下的工作卡在相依環':'相依工作全部完成',cycle?'佇列已空，但仍有工作入度大於 0；這些工作等待環上的前置條件。':'每條相依邊的起點都排在終點之前。',[row('完成順序',order)],{有環:cycle?'是':'否'},{result:{order,cycle,blocked:names.filter(n=>degree[n]>0)}}));return f;
}};
models['trie-prefix']={title:'沿共同字首前進',inputs:[input('words','單字（最多 6 個，每個 1–6 個英文字母）','tea, ten, to, in, inn'),input('query','查詢字首或單字','te')],presets:[{label:'共同字首',values:{words:'tea, ten, to, in, inn',query:'te'}},{label:'完整單字',values:{words:'tea, ten, to, in, inn',query:'ten'}},{label:'路徑中斷',values:{words:'tea, ten, to',query:'team'}}],run(p){
 const words=String(p.words??'').trim()?String(p.words).split(',').map(w=>w.trim().toLowerCase()):[],query=String(p.query??'').trim().toLowerCase();
 if(words.length>6||words.some(w=>!/^[a-z]{1,6}$/.test(w))||!/^[a-z]{0,6}$/.test(query))throw Error('單字限 1–6 個英文字母、最多 6 個；查詢可留空。');
 const root={children:{},end:false},all=[['',root]],f=[];
 const show=(t,e,path)=>f.push(frame(t,e,[row('目前字首',[path||'∅'])],{}, {table:{columns:['字首','下一個字元','完整單字'],rows:all.map(([s,n])=>[s||'∅',Object.keys(n.children).join(', ')||'—',n.end?'是':'否'])}}));
 show('從空字首開始','每條邊是一個字元，節點另外記錄單字是否在這裡結束。','');
 for(const word of words){let node=root,path='';for(const ch of word){path+=ch;if(!node.children[ch]){node.children[ch]={children:{},end:false};all.push([path,node.children[ch]]);}node=node.children[ch];show('加入 '+word,'沿著字元 '+ch+'，走到字首 '+path+'。',path);}node.end=true;show('標記單字結尾',word+' 在這個節點結束。',word);}
 let node=root,path='',prefix=true;for(const ch of query){path+=ch;if(!node.children[ch]){prefix=false;show('沒有 '+ch+' 這條邊','字首 '+path+' 的路徑中斷。',path);break;}node=node.children[ch];show('查詢走到 '+path,'沿著既有的 '+ch+' 邊前進。',path);}
 const exact=prefix&&node.end;f.push(frame('查詢完成',prefix?(exact?'查詢同時是字首與完整單字。':'路徑存在，這個節點尚未標記為單字結尾。'):'字首路徑不存在。',[row('查詢',[query||'∅'])],{字首存在:prefix?'是':'否',完整單字:exact?'是':'否'},{result:{prefix,exact}}));return f;
}};

models['recursion-sum']={title:'分成兩半，總和往上合',inputs:[input('array','整數（最多 8 個）','7, -2, 5, 4')],presets:[{label:'兩半各自求和',values:{array:'7, -2, 5, 4'}},{label:'一個值',values:{array:'7'}},{label:'空輸入',values:{array:''}}],run(p){
 const a=nums(p.array,0,8),stack=[],f=[];const show=(title,explanation,l,r,value)=>f.push(frame(title,explanation,[row('資料',a),row('這層區間',a.slice(l,r)),row('呼叫堆疊',stack)],{lo:l,hi:r,回傳值:value===undefined?'等待子呼叫':value}));
 function sum(lo,hi){stack.push('['+lo+','+hi+')');show('呼叫 total('+lo+', '+hi+')','這次處理半開區間 ['+lo+', '+hi+')。',lo,hi);if(hi-lo<=1){const value=lo===hi?0:a[lo];show('碰到基底',lo===hi?'空區間回傳 0。':'單一元素回傳 '+value+'。',lo,hi,value);stack.pop();return value;}const mid=Math.floor((lo+hi)/2),left=sum(lo,mid),right=sum(mid,hi),value=left+right;show('合併左右答案',left+' + '+right+' = '+value+'。',lo,hi,value);stack.pop();return value;}
 const result=sum(0,a.length);f.push(frame('最外層收到答案','只傳索引邊界，每層保留左右子問題的回傳值；最大呼叫深度 O(log n)。',[row('資料',a)],{總和:result},{result}));return f;
}};
models['memo-coins']={title:'相同剩餘金額，只展開一次',inputs:[input('coins','正整數面額（最多 5 種）','1, 3, 4'),input('amount','金額（0–14）',6,'number')],presets:[{label:'重複子問題',values:{coins:'1, 3, 4',amount:6}},{label:'湊不出來',values:{coins:'2, 4',amount:7}},{label:'零元',values:{coins:'2, 3',amount:0}}],run(p){
 const values=[...new Set(nums(p.coins,1,5))].sort((a,b)=>a-b);if(values.some(c=>c<=0))throw Error('面額請填正整數。');const amount=num(p.amount,0,14,'金額'),memo={},stack=[],f=[];let calls=0,hits=0;
 const display=v=>v===Infinity?'∞':v,show=(title,explanation)=>f.push(frame(title,explanation,[row('呼叫堆疊',stack.map(x=>'best('+x+')'))],{呼叫數:calls,快取命中:hits},{table:{columns:['剩餘金額','最少硬幣數'],rows:Object.entries(memo).map(([k,v])=>[k,display(v)])}}));
 function best(remain){calls++;stack.push(remain);if(Object.hasOwn(memo,remain)){hits++;show('取回 best('+remain+')','這個剩餘金額算過了，答案是 '+display(memo[remain])+'。');stack.pop();return memo[remain];}show('求 best('+remain+')',remain===0?'零元需要 0 枚硬幣。':'試用每一種不超過剩餘金額的面額。');let answer=remain===0?0:Infinity;for(const coin of values){if(coin>remain)break;const sub=best(remain-coin);answer=Math.min(answer,1+sub);show('試用面額 '+coin,'1 + best('+(remain-coin)+') = '+display(1+sub)+'，目前最少 '+display(answer)+' 枚。');}memo[remain]=answer;show('保存 best('+remain+')','保存 '+display(answer)+'；∞ 表示這個金額湊不出來。');stack.pop();return answer;}
 const value=best(amount),result=value===Infinity?-1:value;f.push(frame('計算完成','每個剩餘金額最多展開一次；每次檢查各種面額。',[row('面額',values)],{金額:amount,答案:result,快取命中:hits},{result:{value:result,calls,hits,memo:Object.fromEntries(Object.entries(memo).map(([k,v])=>[k,v===Infinity?null:v]))}}));return f;
}};

models['unique-string']={title:'重複字元出現，左界跳到哪裡',inputs:[input('text','字串（最多 18 個 Unicode 碼位）','abcaacbb')],presets:[{label:'左界跳躍',values:{text:'abcaacbb'}},{label:'重複在視窗外',values:{text:'abba'}},{label:'中文與表情符號',values:{text:'你🙂好🙂你'}},{label:'空字串',values:{text:''}}],run(p){
 const a=Array.from(String(p.text??''));if(a.length>18)throw Error('請填最多 18 個 Unicode 字元。');const last=new Map(),f=[];let left=0,best=[0,0];
 f.push(frame('先保留空視窗','last 記錄各字元最近一次出現的位置。',[row('字元',a)],{left:0,right:0,最長長度:0}));
 for(let right=0;right<a.length;right++){const ch=a[right],previous=last.get(ch);if(previous!==undefined)left=Math.max(left,previous+1);last.set(ch,right);if(right-left+1>best[1]-best[0])best=[left,right+1];f.push(frame('讀到「'+ch+'」',previous===undefined?'這個字元第一次出現，視窗向右擴張。':'上次在 '+previous+'；left 取原值與 '+(previous+1)+' 的較大者，所以不會往回走。',[row('字元',a,right),row('目前視窗',a.slice(left,right+1)),row('目前最長',a.slice(...best))],{left,right,最長長度:best[1]-best[0]},{table:{columns:['字元','最近位置'],rows:[...last]}}));}
 f.push(frame('最長的不重複片段','長度按 Unicode code point 計算；每個字元只處理一次。',[row('答案',a.slice(...best))],{長度:best[1]-best[0]},{result:{length:best[1]-best[0],text:a.slice(...best).join(''),left:best[0],right:best[1]}}));return f;
}};

return models;
});
