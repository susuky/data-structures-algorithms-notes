/* Input-driven demonstrations for chapters 21–24. Each run returns immutable snapshots. */
(function (root, factory) {
  const models = factory();
  if (typeof module === 'object' && module.exports) module.exports = models;
  else root.TopicModels = Object.assign(root.TopicModels || {}, models);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const models = {};
  const clone = value => JSON.parse(JSON.stringify(value));
  const field = (name, label, value, type = 'text') => ({name, label, value, type});
  const preset = (label, values) => ({label, values});
  const fail = message => { throw new Error(message); };
  function integer(value, min, max, label) {
    if (String(value ?? '').trim() === '') fail(label + '請填整數。');
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n < min || n > max) fail(label + '須為 ' + min + ' 到 ' + max + ' 的整數。');
    return n;
  }
  function numbers(text, max = 12) {
    const raw = String(text ?? '').trim();
    if (!raw) return [];
    const parts = raw.split(',').map(s => s.trim());
    if (parts.length > max) fail('最多輸入 ' + max + ' 個數字。');
    return parts.map(s => integer(s, -100, 100, '數值'));
  }
  function frame(title, explanation, rows = [], vars = {}, extras = {}) {
    return clone({title, explanation, rows, vars, ...extras});
  }
  const row = (label, cells) => ({label, cells});
  const marked = (value, state) => ({text: String(value), state});

  models['lru-cache'] = {
    title: 'LRU：最近使用的移到尾端',
    inputs: [field('capacity', '容量（0–5）', 2, 'number'), field('operations', '操作（put:鍵:值 或 get:鍵）', 'put:A:10, put:B:20, get:A, put:C:30, get:B')],
    presets: [preset('讀取後淘汰', {capacity:2,operations:'put:A:10,put:B:20,get:A,put:C:30,get:B'}), preset('覆寫既有鍵', {capacity:2,operations:'put:A:1,put:B:2,put:A:9,put:C:3'}), preset('容量為零', {capacity:0,operations:'put:A:1,get:A'})],
    run(input) {
      const capacity=integer(input.capacity,0,5,'容量');
      const raw=String(input.operations ?? '').trim(), ops=raw ? raw.split(',').map(x=>x.trim().split(':')) : [];
      if(ops.length>14) fail('操作最多 14 次。');
      for(const op of ops) {
        if(!['put','get'].includes(op[0]) || op.length!==(op[0]==='put'?3:2) || !/^[A-Za-z][A-Za-z0-9]{0,5}$/.test(op[1])) fail('請使用 put:A:10 或 get:A，鍵最多 6 個英數字。');
        if(op[0]==='put') integer(op[2],-100,100,'寫入值');
      }
      const head={key:'head'},tail={key:'tail'},nodes=new Map(),outputs=[];
      head.next=tail;tail.prev=head;
      const detach=n=>{n.prev.next=n.next;n.next.prev=n.prev;};
      const append=n=>{const last=tail.prev;last.next=n;n.prev=last;n.next=tail;tail.prev=n;};
      const order=()=>{const values=[];for(let n=head.next;n!==tail;n=n.next)values.push(n.key);return values;};
      const snap=(title,message)=>frame(title,message,[row('最舊 → 最新',order())],{'容量':capacity,'目前筆數':nodes.size,'get 結果':outputs.map(x=>x===null?'None':x).join(', ')||'—'},{table:{columns:['鍵','值','prev','next'],rows:[...nodes.values()].map(n=>[n.key,n.value,n.prev.key,n.next.key])}});
      const frames=[snap('空快取','字典與雙向串列從空集合開始。')];
      for(const op of ops) {
        const [kind,key]=op;
        if(kind==='get') {
          const node=nodes.get(key);
          if(!node){outputs.push(null);frames.push(snap('get('+key+') 未命中','鍵不在字典，使用順序保持原樣。'));continue;}
          outputs.push(node.value);detach(node);append(node);
          frames.push(snap('get('+key+') → '+node.value,'把 '+key+' 剪下後接到最新端。'));
        } else {
          let node=nodes.get(key);
          if(node){detach(node);node.value=Number(op[2]);}
          else{node={key,value:Number(op[2])};nodes.set(key,node);}
          append(node);
          let evicted='';
          if(nodes.size>capacity){const victim=head.next;evicted=victim.key;detach(victim);nodes.delete(evicted);}
          frames.push(snap('put('+key+', '+op[2]+')',evicted?'容量超出，淘汰最舊的 '+evicted+'。':'寫入後，把 '+key+' 放在最新端。'));
        }
      }
      frames.at(-1).result={order:order(),values:Object.fromEntries([...nodes].map(([k,n])=>[k,n.value])),outputs};
      return frames;
    }
  };

  models['list-splice'] = {
    title:'雙向串列：把一個節點接到另一個後面',
    inputs:[field('nodes','節點（不同英文字母）','A,B,C,D'),field('move','搬動節點','B'),field('after','接到誰後面','D')],
    presets:[preset('中間搬到尾端',{nodes:'A,B,C,D',move:'B',after:'D'}),preset('往前搬',{nodes:'A,B,C,D',move:'D',after:'A'}),preset('原本就在後面',{nodes:'A,B,C,D',move:'B',after:'A'})],
    run(input) {
      const ids=String(input.nodes??'').split(',').map(s=>s.trim());
      if(ids.length<1||ids.length>6||ids.some(x=>!/^[A-Za-z]$/.test(x))||new Set(ids).size!==ids.length) fail('請輸入 1–6 個不同的英文字母。');
      const move=String(input.move??'').trim(),after=String(input.after??'').trim();
      if(!ids.includes(move)||!ids.includes(after)) fail('搬動節點與接入位置都須出現在串列裡。');
      const all=['head',...ids,'tail'],links={};
      all.forEach((id,i)=>links[id]={prev:all[i-1]??null,next:all[i+1]??null});
      function walk(){const seen=[],used=new Set();let id=links.head.next;while(id!=='tail'&&id!==null&&!used.has(id)){seen.push(id);used.add(id);id=links[id].next;}return seen;}
      const snap=(title,message)=>frame(title,message,[row('沿 next 走',walk())],{'node':move,'anchor':after},{table:{columns:['節點','prev','next'],rows:all.map(id=>[id,links[id].prev??'None',links[id].next??'None'])}});
      const frames=[snap('原始連結','每個相鄰節點的 next 與 prev 互相對應。')];
      if(move===after||links[after].next===move){frames.push(snap('順序已符合','原串列就是所需順序。'));frames.at(-1).result={order:walk(),links:clone(links)};return frames;}
      const before=links[move].prev,following=links[move].next;
      links[before].next=following;links[following].prev=before;
      frames.push(snap('剪下 '+move,before+' 與 '+following+' 接回；'+move+' 暫時離開主串列。'));
      const targetNext=links[after].next;
      links[after].next=move;links[move].prev=after;links[move].next=targetNext;links[targetNext].prev=move;
      frames.push(snap('接到 '+after+' 後面',after+' ⇄ '+move+' ⇄ '+targetNext+' 的雙向連結已接好。'));
      frames.at(-1).result={order:walk(),links:clone(links)};
      return frames;
    }
  };

  models['lazy-iterator'] = {
    title:'逐次 next，跨過空列',
    inputs:[field('rows','各列以分號分隔；列內用逗號','1,2;;3;'),field('requests','next 次數（0–12）',5,'number')],
    presets:[preset('中間與尾端空列',{rows:'1,2;;3;',requests:5}),preset('先略過空列',{rows:';;7',requests:1}),preset('只取第一筆',{rows:'1,2;3,4',requests:1})],
    run(input) {
      const raw=String(input.rows??''),groups=raw===''?[]:raw.split(';').map(x=>numbers(x,6));
      if(groups.length>6) fail('最多輸入 6 列。');
      const requests=integer(input.requests,0,12,'next 次數');
      let r=0,c=0,exhausted=false;const output=[];
      const snap=(title,message)=>frame(title,message,groups.map((items,i)=>row('列 '+i,items.map((v,j)=>marked(v,i===r&&j===c?'active':i<r||(i===r&&j<c)?'done':'muted')))),{'外層列':r,'列內位置':c,'回傳值':output.join(', ')||'—'});
      const frames=[snap('尚未取值','初始化只保存迭代位置。')];
      for(let call=1;call<=requests;call++){
        while(!exhausted&&r<groups.length&&c>=groups[r].length){r++;c=0;frames.push(snap('換下一列','目前列已耗盡，向外層取得下一列。'));}
        if(r>=groups.length) exhausted=true;
        if(exhausted){frames.push(snap('next '+call+'：StopIteration','外層也已耗盡，之後的 next 持續回報結束。'));continue;}
        const value=groups[r][c++];output.push(value);
        frames.push(snap('next '+call+' → '+value,'只取出這一格，後面的元素留待下一次呼叫。'));
      }
      frames.at(-1).result={output,exhausted,row:r,column:c};return frames;
    }
  };

  function heapPush(heap,value){
    heap.push(value);let i=heap.length-1;
    while(i>0){const p=(i-1)>>1;if(heap[p]<=heap[i])break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p;}
  }
  function heapPop(heap){
    const first=heap[0],last=heap.pop();
    if(heap.length){heap[0]=last;let i=0;while(2*i+1<heap.length){let c=2*i+1;if(c+1<heap.length&&heap[c+1]<heap[c])c++;if(heap[i]<=heap[c])break;[heap[i],heap[c]]=[heap[c],heap[i]];i=c;}}
    return first;
  }
  models['stream-median'] = {
    title:'兩個堆積維持中間位置',
    inputs:[field('values','依序抵達的整數（0–12 個）','8,2,5,10')],
    presets:[preset('大小交錯',{values:'8,2,5,10'}),preset('重複與負值',{values:'5,-4,5,2,5'}),preset('空串流',{values:''})],
    run(input) {
      const values=numbers(input.values),low=[],high=[],medians=[];
      const snap=(title,message,median='—')=>frame(title,message,[row('較小半：最大堆積',low.map(v=>-v)),row('較大半：最小堆積',high)],{'中位數':median,'已接收':medians.length},{table:{columns:['左半大小','右半大小','左半最大','右半最小'],rows:[[low.length,high.length,low.length?-low[0]:'—',high.length?high[0]:'—']]}});
      const frames=[snap('尚無資料','第一筆資料抵達後才有中位數。')];
      for(const value of values){
        heapPush(low,-value);heapPush(high,-heapPop(low));
        if(high.length>low.length)heapPush(low,-heapPop(high));
        const median=low.length>high.length?-low[0]:(-low[0]+high[0])/2;
        medians.push(median);
        frames.push(snap('加入 '+value,'調整後，左半與右半等大或多一筆；中間值留在堆頂。',median));
      }
      frames.at(-1).result={medians,low:low.map(v=>-v),high:[...high]};return frames;
    }
  };

  models['stone-game'] = {
    title:'把對手送進敗態',
    inputs:[field('stones','石子數（0–24）',7,'number'),field('maxTake','每次最多取幾顆（1–6）',3,'number')],
    presets:[preset('留下 4 顆',{stones:7,maxTake:3}),preset('整除的敗態',{stones:8,maxTake:3}),preset('每回合最多 4 顆',{stones:18,maxTake:4})],
    run(input){
      const stones=integer(input.stones,0,24,'石子數'),maxTake=integer(input.maxTake,1,6,'上限'),win=Array(stones+1).fill(null),choice=Array(stones+1).fill(null);
      win[0]=false;
      const snap=(s,title,message)=>frame(title,message,[row('剩餘顆數',win.map((v,i)=>marked(i+':'+(v===null?'?':v?'勝':'敗'),i===s?'active':v===null?'muted':'done')))],{'正在求解':s,'可取上限':maxTake,'第一個好選擇':choice[s]??'—'});
      const frames=[snap(0,'0 顆是敗態','輪到自己時已經沒有石子，沒有合法動作。')];
      for(let s=1;s<=stones;s++){
        win[s]=false;
        for(let take=1;take<=Math.min(maxTake,s);take++)if(!win[s-take]){win[s]=true;choice[s]=take;break;}
        const next=Array.from({length:Math.min(maxTake,s)},(_,i)=>s-i-1);
        frames.push(snap(s,s+' 顆：'+(win[s]?'勝':'敗'),win[s]?'取 '+choice[s]+' 顆，把 '+(s-choice[s])+' 顆這個敗態交給對手。':'所有下一步 '+next.join('、')+' 都是對手的勝態。'));
      }
      frames.at(-1).result={win,choice};return frames;
    }
  };

  models['minimax-tree'] = {
    title:'分數沿遊戲樹向上傳',
    inputs:[field('leaves','葉分數（1、2、4 或 8 個）','3,5,2,9'),field('pruning','alpha-beta 剪枝（0 關、1 開）',1,'number')],
    presets:[preset('右邊可以剪枝',{leaves:'3,5,2,9',pruning:1}),preset('完整 Minimax',{leaves:'3,5,2,9',pruning:0}),preset('先看到高分，還要往下讀',{leaves:'7,4,8,1',pruning:1})],
    run(input){
      const leaves=numbers(input.leaves,8),n=leaves.length,pruning=integer(input.pruning,0,1,'剪枝');
      if(![1,2,4,8].includes(n))fail('葉分數數量須為 1、2、4 或 8。');
      const depth=Math.log2(n),values={},visited=[],pruned=new Set(),frames=[];
      const bound=x=>Number.isFinite(x)?x:(x<0?'−∞':'∞');
      function graph(active){
        const nodes=[],edges=[];
        for(let id=1;id<2*n;id++){
          const level=Math.floor(Math.log2(id)),slot=id-2**level;
          nodes.push({id:String(id),label:values[id]!==undefined?String(values[id]):id>=n?'?':level%2?'MIN':'MAX',x:(slot+.5)*600/(2**level),y:35+level*230/Math.max(1,depth),state:id===active?'active':pruned.has(id)?'muted':values[id]!==undefined?'done':'muted'});
          if(id>1)edges.push({from:String(Math.floor(id/2)),to:String(id),directed:true,state:pruned.has(id)?'muted':'done'});
        }
        return {nodes,edges};
      }
      function snap(id,title,message,alpha=-Infinity,beta=Infinity){
        frames.push(frame(title,message,[row('葉分數',leaves.map((v,i)=>marked(v,visited.includes(i)?'done':pruned.has(n+i)?'muted':'active')))],{'alpha':bound(alpha),'beta':bound(beta),'已評估葉數':visited.length},{graph:graph(id)}));
      }
      function markSubtree(id){if(id>=2*n)return;pruned.add(id);markSubtree(2*id);markSubtree(2*id+1);}
      function visit(id,level,alpha,beta){
        if(id>=n){values[id]=leaves[id-n];visited.push(id-n);snap(id,'讀取葉 '+(id-n),'這個終局給 MAX 的分數是 '+values[id]+'。',alpha,beta);return values[id];}
        const maximize=level%2===0;let best=maximize?-Infinity:Infinity;
        for(const child of [id*2,id*2+1]){
          const value=visit(child,level+1,alpha,beta);
          best=maximize?Math.max(best,value):Math.min(best,value);
          if(maximize)alpha=Math.max(alpha,best);else beta=Math.min(beta,best);
          values[id]=best;
          snap(id,(maximize?'MAX':'MIN')+' 暫定 '+best,'從已讀的子分支取'+(maximize?'最大':'最小')+'值。',alpha,beta);
          if(pruning&&alpha>=beta&&child===id*2){markSubtree(id*2+1);snap(id,'略過另一個分支','alpha ≥ beta，祖先已有足以排除此分支的選擇。',alpha,beta);break;}
        }
        return best;
      }
      snap(1,'根由 MAX 選擇','MIN 會選擇讓 MAX 得分較小的子分支。');
      const value=visit(1,0,-Infinity,Infinity);
      snap(1,'根的值是 '+value,'所有影響根選擇的分支都已完成。');
      frames.at(-1).result={value,visited,pruned:[...pruned]};return frames;
    }
  };

  models['parity-lights'] = {
    title:'亮燈數的奇偶性',
    inputs:[field('bits','燈號（0、1，以逗號分隔）','1,0,1,1,0,1')],
    presets:[preset('四盞亮燈',{bits:'1,0,1,1,0,1'}),preset('奇數盞亮燈',{bits:'1,0,1,1'}),preset('已經全暗',{bits:'0,0,0'})],
    run(input){
      const bits=numbers(input.bits,12);
      if(bits.some(v=>v!==0&&v!==1))fail('燈號只接受 0 與 1。');
      const on=bits.map((v,i)=>v?i:-1).filter(i=>i>=0),moves=[];
      const snap=(title,message,active=[])=>frame(title,message,[row('燈號',bits.map((v,i)=>marked(v,active.includes(i)?'active':v?'done':'muted')))],{'亮燈數':bits.reduce((a,b)=>a+b,0),'奇偶':bits.reduce((a,b)=>a^b,0)===0?'偶數':'奇數','已操作':moves.length});
      const frames=[snap('先算奇偶性','翻轉兩個不同位置，亮燈數只會增加 2、減少 2，或保持不變。')];
      if(on.length%2){frames.push(snap('奇數狀態無法到達全暗','每次操作都保持奇數，全暗則是偶數。'));frames.at(-1).result={possible:false,moves:null,final:bits};return frames;}
      for(let i=0;i<on.length;i+=2){const a=on[i],b=on[i+1];bits[a]^=1;bits[b]^=1;moves.push([a,b]);frames.push(snap('翻轉 '+a+' 與 '+b,'把兩盞亮燈配成一組，一步同時關掉。',[a,b]));}
      frames.push(snap('全暗，共 '+moves.length+' 步','每一步最多關掉兩盞亮燈，這個配對方式達到最少步數。'));
      frames.at(-1).result={possible:true,moves,final:bits};return frames;
    }
  };

  models['sql-ranking'] = {
    title:'訂單先分組，再按總額排名',
    inputs:[field('orders','訂單（客戶:金額，以逗號分隔）','A:12,A:8,B:20,C:7'),field('top','保留前幾種名次（1–6）',2,'number')],
    presets:[preset('總額並列',{orders:'A:12,A:8,B:20,C:7',top:2}),preset('只保留第一名',{orders:'A:12,A:8,B:20,C:7',top:1}),preset('含退款',{orders:'A:30,A:-10,B:5,C:5',top:2})],
    run(input){
      const top=integer(input.top,1,6,'名次'),raw=String(input.orders??'').trim();
      const orders=raw?raw.split(',').map(pair=>{const p=pair.trim().split(':');if(p.length!==2||!/^[A-Za-z][A-Za-z0-9]{0,5}$/.test(p[0]))fail('請使用 A:12 的訂單格式。');return [p[0],integer(p[1],-100,100,'金額')];}):[];
      if(orders.length>16)fail('最多輸入 16 張訂單。');
      const totals=new Map(),frames=[frame('一列是一張訂單','相同客戶的多張訂單先保留為多列。',[],{'訂單數':orders.length},{table:{columns:['customer','amount'],rows:orders}})];
      for(const [customer,amount] of orders){
        totals.set(customer,(totals.get(customer)||0)+amount);
        frames.push(frame('GROUP BY：累加 '+customer,'把這張 '+amount+' 的訂單加進客戶總額。',[],{'正在處理':customer},{table:{columns:['customer','total'],rows:[...totals]}}));
      }
      const sorted=[...totals].sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:a[0]>b[0]?1:0));let last=null,rank=0;
      const ranked=sorted.map(([customer,total])=>{if(last===null||total!==last){rank++;last=total;}return [customer,total,rank];});
      frames.push(frame('DENSE_RANK：同額同名次','下一種總額的名次加一，並列名次不留空號。',[],{'客戶數':totals.size},{table:{columns:['customer','total','place'],rows:ranked}}));
      const result=ranked.filter(r=>r[2]<=top);
      frames.push(frame('WHERE place ≤ '+top,'保留名次條件符合的客戶，再依名次與客戶代號輸出。',[],{'輸出列數':result.length},{table:{columns:['customer','total','place'],rows:result},result}));
      return frames;
    }
  };

  models['shell-frequency'] = {
    title:'詞頻管線的每一段輸出',
    inputs:[field('text','文字（英文字母組成單字，最多 240 字）','Tea, coffee TEA. tea!')],
    presets:[preset('大小寫與標點',{text:'Tea, coffee TEA. tea!'}),preset('次數相同',{text:'red blue RED blue green'}),preset('只有分隔字元',{text:'... 123 !!!'})],
    run(input){
      const text=String(input.text??'');if(text.length>240)fail('文字最多 240 字。');
      const words=text.match(/[A-Za-z]+/g)||[],lower=words.map(x=>x.toLowerCase()),sorted=[...lower].sort(),counts=[];
      for(const word of sorted){const last=counts.at(-1);if(last&&last[0]===word)last[1]++;else counts.push([word,1]);}
      const ranked=[...counts].sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:a[0]>b[0]?1:0));
      return [
        frame('tr：切成單字','連續英文字母保留，其他字元變成分隔。',[row('單字',words)],{'單字數':words.length}),
        frame('tr：換成小寫','大小寫不同的相同單字會落在同一群。',[row('小寫',lower)]),
        frame('sort：相同單字排相鄰','uniq 會合併相鄰的相同行。',[row('排序後',sorted)]),
        frame('uniq -c：數相鄰群組','每群輸出一次，附上出現次數。',[],{}, {table:{columns:['單字','次數'],rows:counts}}),
        frame('sort：次數遞減，同分依單字','第 1 欄使用數字排序；第 2 欄決定同次數順序。',[],{'不同單字':ranked.length},{table:{columns:['單字','次數'],rows:ranked},result:ranked})
      ];
    }
  };

  models['thread-interleaving'] = {
    title:'讀取與寫回的交錯',
    inputs:[field('schedule','排程（兩個 A、兩個 B）','ABAB'),field('locked','完整操作加鎖（0 關、1 開）',0,'number')],
    presets:[preset('更新遺失',{schedule:'ABAB',locked:0}),preset('同排程加鎖',{schedule:'ABAB',locked:1}),preset('依序完成',{schedule:'AABB',locked:0})],
    run(input){
      const schedule=String(input.schedule??'').replaceAll(' ','').toUpperCase();
      if([...schedule].sort().join('')!=='AABB')fail('排程須恰好包含兩個 A 與兩個 B，例如 ABAB。');
      const locked=integer(input.locked,0,1,'加鎖'),phase={A:0,B:0},local={},pending=[...schedule];
      let value=0,owner=null;
      const snap=(title,message)=>frame(title,message,[row('尚未執行的排程',pending)],{'共享 value':value,'持鎖者':owner??'無'},{table:{columns:['工作者','暫存讀值','下一步'],rows:['A','B'].map(id=>[id,local[id]??'—',['讀取','寫回','完成'][phase[id]]])}});
      const frames=[snap('共享值從 0 開始','每位工作者依序執行一次讀取與一次寫回。')];
      while(pending.length){
        const worker=pending.shift();
        if(locked&&owner!==null&&owner!==worker){pending.push(worker);frames.push(snap(worker+' 等待鎖',owner+' 完成讀取與寫回後，'+worker+' 再重試。'));continue;}
        if(phase[worker]===0){
          if(locked)owner=worker;
          local[worker]=value;phase[worker]++;
          frames.push(snap(worker+' 讀到 '+value,'暫存值留在 '+worker+' 的本地狀態，尚未改變共享值。'));
        }else{
          value=local[worker]+1;phase[worker]++;owner=null;
          frames.push(snap(worker+' 寫回 '+value,'把先前讀到的 '+local[worker]+' 加一，寫回共享計數器。'));
        }
      }
      frames.at(-1).result={value,local,locked:Boolean(locked)};return frames;
    }
  };

  models['oracle-search'] = {
    title:'每次回覆刪去一半候選',
    inputs:[field('n','上界 n（1–128）',20,'number'),field('secret','隱藏答案（1–n）',14,'number')],
    presets:[preset('中間答案',{n:20,secret:14}),preset('最右邊界',{n:100,secret:100}),preset('只有一個候選',{n:1,secret:1})],
    run(input){
      const n=integer(input.n,1,128,'上界'),secret=integer(input.secret,1,n,'隱藏答案');
      let low=1,high=n,queries=0;const history=[],budget=Math.floor(Math.log2(n))+1;
      const candidates=()=>high-low<16?Array.from({length:Math.max(0,high-low+1)},(_,i)=>low+i):[low,'…',high];
      const snap=(title,message,guess='—',reply='—')=>frame(title,message,[row('仍可能的答案',candidates())],{'猜測':guess,'oracle 回覆':reply,'已提問':queries,'最壞上限':budget},{table:{columns:['猜測','回覆'],rows:history}});
      const frames=[snap('答案在 [1, '+n+']','只透過 oracle 的大小回覆縮小候選。')];
      while(low<=high){
        const mid=Math.floor((low+high)/2),answer=Math.sign(secret-mid);queries++;history.push([mid,answer]);
        if(answer===0){frames.push(snap('找到 '+mid,'oracle 回覆 0，搜尋結束。',mid,0));frames.at(-1).result={answer:mid,queries,budget};return frames;}
        if(answer>0)low=mid+1;else high=mid-1;
        frames.push(snap('詢問 '+mid+' → '+answer,answer>0?'答案更大，刪去中點與左半部。':'答案更小，刪去中點與右半部。',mid,answer));
      }
      return frames;
    }
  };

  models['triple-enumeration'] = {
    title:'遞增索引列舉三個位置',
    inputs:[field('values','整數（0–8 個）','1,1,2,3'),field('target','目標總和（−300–300）',6,'number')],
    presets:[preset('相同值，不同索引',{values:'1,1,2,3',target:6}),preset('四個零',{values:'0,0,0,0',target:0}),preset('不足三個位置',{values:'2,4',target:6})],
    run(input){
      const values=numbers(input.values,8),target=integer(input.target,-300,300,'目標總和'),answers=[],frames=[];
      let examined=0;
      const snap=(title,message,active=[],sum='—')=>frame(title,message,[row('原陣列',values.map((v,i)=>marked(i+':'+v,active.includes(i)?'active':'muted')))],{'目標':target,'目前總和':sum,'已檢查':examined,'已找到':answers.length},{table:{columns:['i','j','k'],rows:answers}});
      frames.push(snap('固定 i < j < k','每個三索引集合都以唯一的遞增順序出現。'));
      for(let i=0;i<values.length;i++)for(let j=i+1;j<values.length;j++)for(let k=j+1;k<values.length;k++){
        const sum=values[i]+values[j]+values[k];examined++;if(sum===target)answers.push([i,j,k]);
        frames.push(snap('檢查 ('+[i,j,k].join(', ')+')',sum===target?'總和符合，把這組索引加入答案。':'總和不符合，繼續下一組遞增索引。',[i,j,k],sum));
      }
      frames.push(snap('完成，共 '+answers.length+' 組','所有合法三索引組合都已檢查。'));frames.at(-1).result={answers,examined};return frames;
    }
  };

  models['subset-mitm'] = {
    title:'左右子集合總和配對',
    inputs:[field('values','整數（0–10 個）','4,-1,6,0'),field('target','目標總和（−1000–1000）',9,'number')],
    presets:[preset('零造成不同子集合',{values:'4,-1,6,0',target:9}),preset('三個零',{values:'0,0,0',target:0}),preset('空集合也算一種',{values:'',target:0})],
    run(input){
      const values=numbers(input.values,10),target=integer(input.target,-1000,1000,'目標'),middle=Math.floor(values.length/2),left=[0],right=[0],matches=[],frames=[];
      let count=0;
      const snap=(title,message)=>frame(title,message,[row('左半總和',left),row('右半總和',right)],{'目標':target,'累積答案':count},{table:{columns:['左和 a','需要 target−a','右側次數','累積'],rows:matches}});
      frames.push(snap('兩邊先放空集合的 0','每個完整子集合唯一對應一個左半選法與一個右半選法。'));
      for(const [name,part,sums] of [['左',values.slice(0,middle),left],['右',values.slice(middle),right]]){
        for(const value of part){
          const added=sums.map(sum=>sum+value);sums.push(...added);
          frames.push(snap(name+'半加入 '+value,'原總和代表不選，新總和代表選這個位置；相同總和保留多份。'));
        }
      }
      const frequency=new Map();for(const sum of right)frequency.set(sum,(frequency.get(sum)||0)+1);
      for(const a of left){
        const needed=target-a,times=frequency.get(needed)||0;count+=times;matches.push([a,needed,times,count]);
        frames.push(snap('左和 '+a+' 尋找 '+needed,'右半有 '+times+' 個子集合可配成目標。'));
      }
      frames.at(-1).result={count,left:[...left],right:[...right]};return frames;
    }
  };

  models['fcfs-simulation'] = {
    title:'單台機器依到達順序處理',
    inputs:[field('jobs','工作（到達:處理時間，以逗號分隔）','0:3,1:2,8:1')],
    presets:[preset('忙碌與空檔',{jobs:'0:3,1:2,8:1'}),preset('同時抵達',{jobs:'4:3,4:1'}),preset('輸入未排序',{jobs:'8:1,0:3,1:2'})],
    run(input){
      const raw=String(input.jobs??'').trim(),jobs=raw?raw.split(',').map((part,id)=>{const pair=part.trim().split(':');if(pair.length!==2)fail('請使用 0:3 的工作格式。');return {id,arrival:integer(pair[0],0,50,'到達時間'),duration:integer(pair[1],1,12,'處理時間')};}):[];
      if(jobs.length>8)fail('最多輸入 8 筆工作。');
      jobs.sort((a,b)=>a.arrival-b.arrival||a.id-b.id);
      const result=[],frames=[];let now=0;
      const snap=(title,message,active=null)=>frame(title,message,[row('處理順序',jobs.map(j=>marked('工作 '+j.id+' @'+j.arrival,j.id===active?'active':result.some(r=>r[0]===j.id)?'done':'muted')))],{'目前時間':now},{table:{columns:['工作','開始','完成','等待'],rows:result}});
      frames.push(snap('按到達時間排列','同時抵達的工作依原輸入順序處理。'));
      for(const job of jobs){
        if(now<job.arrival){const from=now;now=job.arrival;frames.push(snap('空閒 '+from+' → '+now,'中間沒有工作會改變狀態，直接跳到下一次抵達。',job.id));}
        const start=now,finish=start+job.duration,wait=start-job.arrival;
        frames.push(snap('工作 '+job.id+' 開始','開始於 '+start+'，已等待 '+wait+'；預計 '+finish+' 完成。',job.id));
        now=finish;result.push([job.id,start,finish,wait]);
        frames.push(snap('工作 '+job.id+' 完成','機器在 '+finish+' 釋放，接著看下一筆工作。',job.id));
      }
      frames.at(-1).result={jobs:result,finish:now,totalWait:result.reduce((sum,r)=>sum+r[3],0)};return frames;
    }
  };
  return models;
});
