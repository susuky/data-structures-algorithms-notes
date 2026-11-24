(function (root, factory) {
  const models = factory();
  if (typeof module === 'object' && module.exports) module.exports = models;
  else root.TopicModels = Object.assign(root.TopicModels || {}, models);
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const models = {};
  const field = (name, label, value, type = 'text') => ({name, label, value, type});
  const preset = (label, values) => ({label, values});
  function integer(value, label, min, max) {
    const x = Number(value);
    if (String(value).trim() === '' || !Number.isInteger(x) || x < min || x > max) throw new Error(label + '請填 ' + min + '～' + max + ' 的整數。');
    return x;
  }
  function numbers(text, empty = true) {
    if (!String(text).trim() && empty) return [];
    const a = String(text).split(',').map(x => integer(x.trim(), '數值', -99, 99));
    if (a.length > 12) throw new Error('一次最多輸入 12 個數值。');
    return a;
  }
  const cells = (values, active = [], done = []) => values.map((value, i) => ({text:String(value), state:active.includes(i) ? 'active' : done.includes(i) ? 'done' : ''}));
  const row = (label, values, active, done) => ({label, cells: cells(values, active, done)});
  const frame = (title, explanation, rows = [], vars = {}, extra = {}) => ({title, explanation, rows, vars, ...extra});
  const snapshot = value => JSON.parse(JSON.stringify(value));
  const pretty = value => value === Infinity ? '∞' : String(value);
  function graphInput(input, weighted = false, directed = false) {
    const n = integer(input.n, '節點數', 1, 8);
    const entries = String(input.edges).trim() ? String(input.edges).split(',') : [];
    if (entries.length > 18) throw new Error('一次最多輸入 18 條邊。');
    const expression = weighted ? /^(\d+)\s*(?:>|-)\s*(\d+)\s*:\s*(-?\d+)$/ : /^(\d+)\s*(?:>|-)\s*(\d+)$/;
    const edges = entries.map((entry, id) => {
      const match = entry.trim().match(expression);
      if (!match) throw new Error(weighted ? '邊請寫成 0>1:3，用逗號分隔。' : '邊請寫成 0-1，用逗號分隔。');
      const a = integer(match[1], '端點', 0, n - 1), b = integer(match[2], '端點', 0, n - 1);
      return {a, b, w:weighted ? integer(match[3], '權重', -20, 20) : 1, id};
    });
    return {n, edges, directed};
  }
  function graphView(g, activeNodes = [], chosen = [], currentEdge = null, labels = {}) {
    return {
      nodes:Array.from({length:g.n}, (_, i) => ({id:String(i), label:labels[i] || String(i), x:300 + 210 * Math.cos(-Math.PI / 2 + i * 2 * Math.PI / g.n), y:150 + 110 * Math.sin(-Math.PI / 2 + i * 2 * Math.PI / g.n), state:activeNodes.includes(i) ? 'active' : ''})),
      edges:g.edges.map(e => ({from:String(e.a), to:String(e.b), label:g.weighted ? String(e.w) : '#' + e.id, directed:g.directed, state:e.id === currentEdge ? 'active' : chosen.includes(e.id) ? 'done' : ''}))
    };
  }

  models['segment-tree'] = {
    title:'區間加總與單點修改',
    inputs:[field('array', '數列（1–8 項）', '2, 1, 5, 3, 4, 6'), field('index', '修改索引', 2, 'number'), field('value', '改成', 9, 'number'), field('left', '查詢左端', 1, 'number'), field('right', '查詢右端（不含）', 5, 'number')],
    presets:[preset('修改後查詢', {array:'2,1,5,3,4,6',index:2,value:9,left:1,right:5}), preset('負數與空區間', {array:'-3,2,-5',index:0,value:-4,left:1,right:1})],
    run(input) {
      const a = numbers(input.array, false), index = integer(input.index, '修改索引', 0, a.length - 1), value = integer(input.value, '新數值', -99, 99);
      if (a.length > 8) throw new Error('線段樹圖一次顯示 1～8 個數值。');
      let left = integer(input.left, '左端', 0, a.length), right = integer(input.right, '右端', left, a.length), size = 1;
      while (size < a.length) size *= 2;
      const tree = Array(2 * size).fill(0), frames = [], selected = [];
      a.forEach((x, i) => tree[size + i] = x);
      for (let p = size - 1; p; p--) tree[p] = tree[2 * p] + tree[2 * p + 1];
      function view(active = []) {
        const nodes = [], edges = [];
        for (let p = 1; p < 2 * size; p++) {
          const depth = Math.floor(Math.log2(p)), slot = p - 2 ** depth;
          nodes.push({id:String(p), label:String(tree[p]), x:(slot + .5) * 600 / 2 ** depth, y:25 + depth * 60, state:active.includes(p) ? 'active' : selected.includes(p) ? 'done' : ''});
          if (p > 1) edges.push({from:String(p >> 1), to:String(p)});
        }
        return {nodes, edges};
      }
      const push = (title, text, active, vars) => frames.push(frame(title, text, [row('原數列', a)], vars, {graph:view(active), tree:tree.slice()}));
      push('每個父節點保存兩個孩子的總和', '葉端依序放數列，補齊的葉子放 0。', [], {size});
      let p = size + index;
      a[index] = value; tree[p] = value;
      push('修改葉節點 ' + index, '只沿著這片葉子的祖先往上重算。', [p], {p, value});
      while (p > 1) { p >>= 1; tree[p] = tree[2*p] + tree[2*p+1]; push('更新父節點 ' + p, tree[2*p] + ' + ' + tree[2*p+1] + ' = ' + tree[p], [p,2*p,2*p+1], {p}); }
      left += size; right += size;
      let answer = 0;
      push('把查詢邊界移到葉子層', '半開區間的右端指向第一個不納入的葉子。', [left, right], {left, right, answer});
      while (left < right) {
        if (left & 1) { answer += tree[left]; selected.push(left); push('收下左側獨立節點', '它是右孩子，左兄弟落在查詢範圍外。', [left], {left,right,answer}); left++; }
        if (right & 1) { right--; answer += tree[right]; selected.push(right); push('收下右側獨立節點', '右端退一格，這片子樹完整落在查詢範圍內。', [right], {left,right,answer}); }
        left >>= 1; right >>= 1;
        push('兩側一起升一層', '剩下的範圍由更大的完整子樹組成。', [], {left,right,answer});
      }
      frames.push(frame('區間總和：' + answer, '收下的子樹互不重疊，合起來剛好覆蓋查詢區間。', [row('修改後', a),row('選取節點', selected)], {answer}, {graph:view(),result:answer}));
      return frames;
    }
  };

  models['fenwick-tree'] = {
    title:'沿著 lowbit 更新與查詢',
    inputs:[field('array','數列','2, 1, 5, 3, 4, 6'),field('index','增加的索引',2,'number'),field('delta','增加多少',4,'number'),field('end','查詢前幾項',5,'number')],
    presets:[preset('一路往上加',{array:'2,1,5,3,4,6',index:2,delta:4,end:5}),preset('前綴長度為零',{array:'5,-2,3',index:1,delta:-4,end:0})],
    run(input) {
      const a=numbers(input.array,false), n=a.length, index=integer(input.index,'索引',0,n-1), delta=integer(input.delta,'增量',-99,99), end=integer(input.end,'前綴長度',0,n);
      const bit=[0,...a], frames=[];
      for(let i=1;i<=n;i++){const p=i+(i&-i);if(p<=n)bit[p]+=bit[i];}
      const push=(title,text,i,answer)=>frames.push(frame(title,text,[row('數列',a),row('BIT 索引',Array.from({length:n},(_,j)=>j+1)),row('BIT 總和',bit.slice(1),i?[i-1]:[])],{i,lowbit:i?(i&-i):0,累積:answer},{table:{columns:['索引','涵蓋原數列 [l,r)'],rows:Array.from({length:n},(_,j)=>[j+1,'['+(j+1-((j+1)&-(j+1)))+','+(j+1)+')'])}}));
      push('BIT 第 i 格涵蓋 lowbit(i) 項','內部索引從 1 開始，原數列索引仍從 0 開始。',0,0);
      a[index]+=delta;
      for(let i=index+1;i<=n;i+=i&-i){bit[i]+=delta;push('更新 BIT['+i+']','這個區塊包含原索引 '+index+'，加上 '+delta+'。',i,0);}
      let answer=0;
      for(let i=end;i>0;i-=i&-i){answer+=bit[i];push('讀取 BIT['+i+']','收下右端區塊，下一步清掉索引最低位的 1。',i,answer);}
      frames.push(frame('前 '+end+' 項總和：'+answer,'查詢區塊一路往左接起來，直到前綴長度歸零。',[row('修改後',a),row('BIT',bit.slice(1))],{answer},{result:answer}));
      return frames;
    }
  };

  models['ordered-set'] = {
    title:'AVL 有序集合與下一個候選',
    inputs:[field('array','依序插入','30, 10, 20, 40, 50'),field('remove','移除鍵',30,'number'),field('query','找第一個 ≥ 此值的鍵',21,'number')],
    presets:[preset('雙旋轉',{array:'30,10,20,40,50',remove:30,query:21}),preset('重複與無候選',{array:'4,4,2,6',remove:4,query:9})],
    run(input) {
      const values=numbers(input.array), remove=integer(input.remove,'移除鍵',-99,99), query=integer(input.query,'查詢鍵',-99,99), frames=[];
      let root=null, rotations=[];
      const h=n=>n?n.h:0, fix=n=>(n.h=1+Math.max(h(n.left),h(n.right)),n);
      const rotR=n=>{const x=n.left;n.left=x.right;x.right=fix(n);rotations.push('右旋 '+n.key+' → '+x.key);return fix(x);};
      const rotL=n=>{const x=n.right;n.right=x.left;x.left=fix(n);rotations.push('左旋 '+n.key+' → '+x.key);return fix(x);};
      function balance(n){fix(n);if(h(n.left)-h(n.right)>1){if(h(n.left.left)<h(n.left.right))n.left=rotL(n.left);return rotR(n);}if(h(n.right)-h(n.left)>1){if(h(n.right.right)<h(n.right.left))n.right=rotR(n.right);return rotL(n);}return n;}
      function add(n,x){if(!n)return {key:x,left:null,right:null,h:1};if(x<n.key)n.left=add(n.left,x);else if(x>n.key)n.right=add(n.right,x);return balance(n);}
      function discard(n,x){if(!n)return null;if(x<n.key)n.left=discard(n.left,x);else if(x>n.key)n.right=discard(n.right,x);else if(!n.left)return n.right;else if(!n.right)return n.left;else{let s=n.right;while(s.left)s=s.left;n.key=s.key;n.right=discard(n.right,s.key);}return balance(n);}
      function ordered(n){return n?[...ordered(n.left),n.key,...ordered(n.right)]:[];}
      function push(title,text,active=null,vars={}){const nodes=[],edges=[];function visit(n,x,y,span){if(!n)return;nodes.push({id:String(n.key),label:n.key+' · h'+n.h,x,y,state:n.key===active?'active':''});for(const [child,sign]of[[n.left,-1],[n.right,1]])if(child){edges.push({from:String(n.key),to:String(child.key)});visit(child,x+sign*span,y+62,span/2);}}visit(root,300,30,145);frames.push(frame(title,text,[row('中序走訪',ordered(root))],vars,{graph:{nodes,edges},tree:snapshot(root)}));}
      push('空集合','每個鍵只保留一份，搜尋沿左右大小關係走。');
      for(const x of values){rotations=[];root=add(root,x);push('插入 '+x,rotations.length?rotations.join('；')+'。旋轉保留中序的大小順序。':'由插入位置往上更新高度，各節點左右高度差至多 1。',x);}
      rotations=[];root=discard(root,remove);push('移除 '+remove,rotations.length?rotations.join('；'):'接上剩餘子樹；兩個孩子都在時，以右子樹最小鍵補位。');
      let node=root, answer=null;
      while(node){const key=node.key;if(key>=query){answer=key;node=node.left;push(key+' 已符合，再往左找','保留候選 '+key+'，看看是否有更小且仍達標的鍵。',key,{候選:answer});}else{node=node.right;push(key+' 太小，往右找','左子樹的鍵更小，候選全在右側。',key,{候選:answer===null?'無':answer});}}
      push('查詢完成',answer===null?'集合裡所有鍵都小於 '+query+'。':'第一個大於或等於 '+query+' 的鍵是 '+answer+'。');
      frames[frames.length-1].result={values:ordered(root),lowerBound:answer};
      return frames;
    }
  };

  models.kruskal = {
    title:'用最少總成本連起各群組',
    inputs:[field('n','節點數',5,'number'),field('edges','無向邊與權重','0-1:4,0-2:1,1-2:2,1-3:1,2-3:5,3-4:3')],
    presets:[preset('跨群組的便宜邊',{n:5,edges:'0-1:4,0-2:1,1-2:2,1-3:1,2-3:5,3-4:3'}),preset('兩個群組與負權重',{n:5,edges:'0-1:-2,1-2:3,0-2:4,3-4:1'})],
    run(input){
      const g=graphInput(input,true);g.weighted=true;
      const parent=Array.from({length:g.n},(_,i)=>i),size=Array(g.n).fill(1),chosen=[],frames=[];let cost=0;
      const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};
      const push=(title,text,id=null)=>frames.push(frame(title,text,[row('各節點所屬根',parent.map((_,i)=>find(i))),row('已選邊編號',chosen)],{總成本:cost,群組數:new Set(parent.map((_,i)=>find(i))).size},{graph:graphView(g,[],chosen,id)}));
      push('依邊權重排序','只要新邊接起不同群組，就把它留下。');
      for(const e of [...g.edges].sort((a,b)=>a.w-b.w||a.id-b.id)){
        let a=find(e.a),b=find(e.b);
        if(a===b){push('略過 #'+e.id+'：兩端已相連','加入它會繞出一圈，目前的連線已能抵達另一端。',e.id);continue;}
        if(size[a]<size[b])[a,b]=[b,a];parent[b]=a;size[a]+=size[b];chosen.push(e.id);cost+=e.w;
        push('選 #'+e.id+'：'+e.a+'—'+e.b,'這條目前最便宜的跨群組邊，把兩棵樹合起來。',e.id);
      }
      push('最小生成森林完成','每個原本連通的群組，都留下了一棵總成本最小的樹。');
      frames.at(-1).result={cost,edges:chosen.slice(),components:new Set(parent.map((_,i)=>find(i))).size};return frames;
    }
  };

  models['euler-circuit'] = {
    title:'每條邊走一次，再接回起點',
    inputs:[field('n','節點數',5,'number'),field('edges','無向邊（可重複）','0-1,1-2,2-0,0-3,3-4,4-0')],
    presets:[preset('兩個環接起來',{n:5,edges:'0-1,1-2,2-0,0-3,3-4,4-0'}),preset('奇數度數',{n:3,edges:'0-1,1-2'}),preset('分離的環',{n:6,edges:'0-1,1-2,2-0,3-4,4-5,5-3'}),preset('平行邊',{n:2,edges:'0-1,0-1'})],
    run(input){
      const g=graphInput(input),adj=Array.from({length:g.n},()=>[]),used=Array(g.edges.length).fill(false),frames=[],circuit=[];
      g.edges.forEach(e=>{adj[e.a].push([e.b,e.id]);adj[e.b].push([e.a,e.id]);});
      const degree=adj.map(x=>x.length),start=degree.findIndex(d=>d>0),stack=[start<0?0:start];
      const push=(title,text,id=null)=>frames.push(frame(title,text,[row('目前路徑堆疊',stack),row('退回順序',circuit),row('各節點度數',degree)],{已用邊:used.filter(Boolean).length,總邊數:g.edges.length},{graph:graphView(g,stack.slice(-1),used.flatMap((x,i)=>x?[i]:[]),id)}));
      push('每次進入節點，都要有邊離開','閉合路線中的每個節點度數為偶數，起點也一樣。');
      if(degree.some(d=>d%2)){push('有奇數度數，閉合路線不存在','改試「平行邊」，兩條相同端點的邊仍有各自的編號。');frames.at(-1).result=null;return frames;}
      while(stack.length){const v=stack.at(-1);while(adj[v].length&&used[adj[v].at(-1)[1]])adj[v].pop();if(adj[v].length){const [w,id]=adj[v].pop();used[id]=true;stack.push(w);push('走過 #'+id+'：'+v+' → '+w,'同一條無向邊在兩端各存一次，用編號阻止重複行走。',id);}else{circuit.push(stack.pop());push('從 '+v+' 退回，放進答案','這裡已沒有可用邊，將這段路線接到完成的尾端。');}}
      if(circuit.length!==g.edges.length+1){push('尚有另一個帶邊的群組','從起點走不到那些邊，整張圖沒有一條閉合路線能涵蓋全部邊。');frames.at(-1).result=null;return frames;}
      const result=[...circuit].reverse();push('反轉退回順序，得到路線',result.join(' → '));frames.at(-1).result=result;return frames;
    }
  };

  models['tarjan-scc'] = {
    title:'從 DFS 堆疊收出互相可達的群組',
    inputs:[field('n','節點數',6,'number'),field('edges','有向邊','0>1,1>2,2>0,2>3,3>4,4>3,4>5')],
    presets:[preset('三個強連通群組',{n:6,edges:'0>1,1>2,2>0,2>3,3>4,4>3,4>5'}),preset('指向已完成群組',{n:4,edges:'0>1,1>0,2>0,2>3,3>2'}),preset('孤立節點',{n:3,edges:''})],
    run(input){
      const g=graphInput(input,false,true),adj=Array.from({length:g.n},()=>[]),disc=Array(g.n).fill(-1),low=Array(g.n).fill(-1),on=Array(g.n).fill(false),stack=[],components=[],frames=[];let time=0;
      g.edges.forEach(e=>adj[e.a].push(e));
      const push=(title,text,node=null,id=null)=>frames.push(frame(title,text,[row('尚未歸組的堆疊',stack),row('已完成群組',components.map(x=>'{'+x.join(',')+'}'))],{}, {graph:graphView(g,node===null?[]:[node],[],id),table:{columns:['節點','disc','low','在堆疊內'],rows:disc.map((d,i)=>[i,d<0?'—':d,low[i]<0?'—':low[i],on[i]?'是':'否'])}}));
      function visit(v){disc[v]=low[v]=time++;stack.push(v);on[v]=true;push('進入 '+v,'給它新的發現順序，同時放進尚未歸組的堆疊。',v);for(const e of adj[v]){if(disc[e.b]<0){visit(e.b);low[v]=Math.min(low[v],low[e.b]);push('從 '+e.b+' 返回 '+v,'孩子能回到更早的地方，就把這條路傳回父節點。',v,e.id);}else if(on[e.b]){low[v]=Math.min(low[v],disc[e.b]);push('遇到仍在堆疊的 '+e.b,'以對方的發現時間更新 low。',v,e.id);}else push('略過已歸組的 '+e.b,'對方的群組已完成，這條單向邊留給後續的縮點圖。',v,e.id);}if(low[v]===disc[v]){const group=[];let w;do{w=stack.pop();on[w]=false;group.push(w);}while(w!==v);components.push(group);push('收出一個強連通群組','從堆疊頂端取到 '+v+'，這批節點可以互相抵達。',v);}}
      for(let v=0;v<g.n;v++)if(disc[v]<0)visit(v);
      push('完成 '+components.length+' 個群組','把每個群組縮成一點，群組間的邊形成 DAG。');frames.at(-1).result=components.map(x=>x.slice());return frames;
    }
  };

  models.biconnected = {
    title:'用回邊找出割點、橋與雙連通區塊',
    inputs:[field('n','節點數',6,'number'),field('edges','無向邊（端點不同）','0-1,1-2,2-0,1-3,3-4,4-5,5-3')],
    presets:[preset('兩個環與一座橋',{n:6,edges:'0-1,1-2,2-0,1-3,3-4,4-5,5-3'}),preset('平行邊不是橋',{n:3,edges:'0-1,0-1,1-2'}),preset('DFS 根有兩個孩子',{n:3,edges:'0-1,0-2'})],
    run(input){
      const g=graphInput(input),adj=Array.from({length:g.n},()=>[]),disc=Array(g.n).fill(-1),low=Array(g.n).fill(-1),stack=[],blocks=[],cuts=new Set(),bridges=[],frames=[];let time=0;
      g.edges.forEach(e=>{if(e.a===e.b)throw new Error('這個實驗請使用端點不同的邊；平行邊可以重複輸入。');adj[e.a].push([e.b,e.id]);adj[e.b].push([e.a,e.id]);});
      const push=(title,text,v=null,id=null)=>frames.push(frame(title,text,[row('邊堆疊',stack.map(i=>'#'+i)),row('割點',[...cuts]),row('橋',bridges.map(i=>'#'+i)),row('已收區塊',blocks.map(x=>x.map(i=>'#'+i).join(' ')))],{}, {graph:graphView(g,v===null?[]:[v],bridges,id),table:{columns:['節點','disc','low'],rows:disc.map((d,i)=>[i,d<0?'—':d,low[i]<0?'—':low[i]])}}));
      function visit(v,parent=-1){disc[v]=low[v]=time++;let children=0;push('進入 '+v,'low 表示子樹可藉由回邊抵達的最早發現時間。',v);for(const [w,id]of adj[v]){if(id===parent)continue;if(disc[w]<0){children++;stack.push(id);visit(w,id);low[v]=Math.min(low[v],low[w]);if(low[w]>disc[v])bridges.push(id);if(low[w]>=disc[v]){if(parent!==-1||children>1)cuts.add(v);const group=[];let e;do{e=stack.pop();group.push(e);}while(e!==id);blocks.push(group);push('孩子 '+w+' 的區塊在此結束','low['+w+']='+low[w]+'，無法越過 '+v+' 回到更早的祖先；取出邊堆疊到 #'+id+'。',v,id);}else push('孩子仍有路繞回祖先','把 low 往上傳，這一段繼續留在同一區塊。',v,id);}else if(disc[w]<disc[v]){stack.push(id);low[v]=Math.min(low[v],disc[w]);push('回邊 #'+id+' 連到 '+w,'只略過進來的那一條邊，另一條平行邊會把 low 降到父節點。',v,id);}}}
      for(let v=0;v<g.n;v++)if(disc[v]<0)visit(v);
      push('區塊完成','割點可同時屬於多個區塊，每條邊恰好分到一個區塊。');frames.at(-1).result={blocks:snapshot(blocks),cuts:[...cuts].sort((a,b)=>a-b),bridges:bridges.slice()};return frames;
    }
  };

  models['bellman-ford'] = {
    title:'讓負權重路徑逐輪傳遞',
    inputs:[field('n','節點數',4,'number'),field('edges','有向邊與權重','0>1:4,0>2:5,2>1:-3,1>3:2'),field('start','起點',0,'number')],
    presets:[preset('負邊帶來更短路徑',{n:4,edges:'0>1:4,0>2:5,2>1:-3,1>3:2',start:0}),preset('可達負環',{n:3,edges:'0>1:0,1>2:-1,2>1:0',start:0}),preset('負環在另一群',{n:3,edges:'1>2:-1,2>1:-1',start:0})],
    run(input){
      const g=graphInput(input,true,true);g.weighted=true;const start=integer(input.start,'起點',0,g.n-1),distance=Array(g.n).fill(Infinity),frames=[];distance[start]=0;
      const push=(title,text,round,id=null)=>frames.push(frame(title,text,[row('距離',distance.map(pretty))],{輪數:round},{graph:graphView(g,[],[],id)}));
      push('起點距離為 0','其餘距離為 ∞，只有從起點走得到的邊才傳播更新。',0);
      for(let r=1;r<g.n;r++){let changed=false;for(const e of g.edges){if(distance[e.a]!==Infinity&&distance[e.a]+e.w<distance[e.b]){const old=distance[e.b];distance[e.b]=distance[e.a]+e.w;changed=true;push('改善 '+e.b+'：'+pretty(old)+' → '+distance[e.b],'從 '+e.a+' 接上權重 '+e.w+' 的邊。',r,e.id);}}push('第 '+r+' 輪完成',changed?'同輪已更新的值可繼續往後傳，下一輪再掃全部邊。':'這一輪沒有變動，可以提早結束。',r);if(!changed)break;}
      const edge=g.edges.find(e=>distance[e.a]!==Infinity&&distance[e.a]+e.w<distance[e.b]);
      if(edge){push('仍可改善：起點可達負環','走完至多 V−1 輪後還能降價，沿著某個負環繞行可持續降低成本。',g.n,edge.id);frames.at(-1).result={negativeCycle:true,distance:null};}
      else{push('距離穩定','額外檢查全部邊，已沒有任何可達邊能改善距離。',g.n);frames.at(-1).result={negativeCycle:false,distance:distance.map(x=>x===Infinity?null:x)};}
      return frames;
    }
  };

  models['zero-one-bfs'] = {
    title:'免費邊放前端，付費邊放後端',
    inputs:[field('n','節點數',5,'number'),field('edges','有向邊，權重為 0 或 1','0>1:1,0>2:0,2>1:0,1>3:1,2>4:1,4>3:0'),field('start','起點',0,'number')],
    presets:[preset('免費繞路更便宜',{n:5,edges:'0>1:1,0>2:0,2>1:0,1>3:1,2>4:1,4>3:0',start:0}),preset('零權重環',{n:3,edges:'0>1:0,1>0:0,1>2:1',start:0})],
    run(input){
      const g=graphInput(input,true,true);g.weighted=true;const start=integer(input.start,'起點',0,g.n-1),adj=Array.from({length:g.n},()=>[]),distance=Array(g.n).fill(Infinity),queue=[[start,0]],frames=[];distance[start]=0;
      g.edges.forEach(e=>{if(e.w!==0&&e.w!==1)throw new Error('0–1 BFS 的邊權重請填 0 或 1。');adj[e.a].push(e);});
      const push=(title,text,v=null,id=null)=>frames.push(frame(title,text,[row('deque：前 → 後',queue.map(([x,d])=>x+'（'+d+'）')),row('距離',distance.map(pretty))],{}, {graph:graphView(g,v===null?[]:[v],[],id)}));
      push('起點放進 deque','括號裡是入列時的距離。');
      while(queue.length){const [v,known]=queue.shift();if(known!==distance[v]){push('略過 '+v+' 的舊候選','已找到更便宜的距離 '+distance[v]+'，這份 '+known+' 的候選已過期。',v);continue;}push('取出 '+v,'目前最小距離在 deque 前端。',v);for(const e of adj[v])if(known+e.w<distance[e.b]){distance[e.b]=known+e.w;if(e.w===0)queue.unshift([e.b,distance[e.b]]);else queue.push([e.b,distance[e.b]]);push(e.w===0?'走免費邊，放到前端':'走成本 1 的邊，放到後端','距離 '+e.b+' 更新為 '+distance[e.b]+'。',e.b,e.id);}}
      push('所有候選都已處理','使用真正的雙端佇列時，兩端加入與取出都只需 O(1)。');frames.at(-1).result=distance.map(x=>x===Infinity?null:x);return frames;
    }
  };

  models['convex-hull'] = {
    title:'把向內凹的轉彎彈掉',
    inputs:[field('points','整數座標 x:y','0:0,1:1,2:0,2:2,0:2,1:0')],
    presets:[preset('內點與邊上的點',{points:'0:0,1:1,2:0,2:2,0:2,1:0'}),preset('全部共線',{points:'-2:-2,0:0,1:1,2:2,0:0'}),preset('單一座標',{points:'1:1,1:1'})],
    run(input){
      const entries=String(input.points).trim()?String(input.points).split(','):[];
      if(entries.length>12)throw new Error('一次最多輸入 12 個點。');
      const unique=new Map();for(const entry of entries){const match=entry.trim().match(/^(-?\d+)\s*:\s*(-?\d+)$/);if(!match)throw new Error('座標請寫成 x:y，用逗號分隔。');const x=integer(match[1],'x',-9,9),y=integer(match[2],'y',-9,9);unique.set(x+','+y,[x,y]);}
      const points=[...unique.values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),frames=[],lower=[],upper=[];
      const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
      const minX=Math.min(0,...points.map(p=>p[0])),maxX=Math.max(1,...points.map(p=>p[0])),minY=Math.min(0,...points.map(p=>p[1])),maxY=Math.max(1,...points.map(p=>p[1]));
      function push(title,text,current=null,turn='—',closed=false){const edges=[],chain=closed?[...lower.slice(0,-1),...upper.slice(0,-1)]:null;for(const list of chain?[chain]:[lower,upper]){for(let i=1;i<list.length;i++)edges.push({from:String(points.indexOf(list[i-1])),to:String(points.indexOf(list[i])),state:'done'});if(closed&&list.length>2)edges.push({from:String(points.indexOf(list.at(-1))),to:String(points.indexOf(list[0])),state:'done'});}frames.push(frame(title,text,[row('下凸殼',lower.map(p=>'('+p.join(',')+')')),row('上凸殼',upper.map(p=>'('+p.join(',')+')'))],{叉積:turn},{graph:{nodes:points.map((p,i)=>({id:String(i),label:'('+p.join(',')+')',x:55+(p[0]-minX)*490/(maxX-minX),y:250-(p[1]-minY)*200/(maxY-minY),state:p===current?'active':''})),edges}}));}
      push('先依 x、再依 y 排序','相同座標合併成一個點。外框只保留角點。');
      if(points.length<=1){push('凸包完成','零個或一個不同座標，直接回傳。');frames.at(-1).result=snapshot(points);return frames;}
      for(const [name,chain,order]of[['下凸殼',lower,points],['上凸殼',upper,[...points].reverse()]])for(const point of order){while(chain.length>=2&&cross(chain.at(-2),chain.at(-1),point)<=0){const turn=cross(chain.at(-2),chain.at(-1),point),removed=chain.pop();push(name+'：彈出 ('+removed.join(',')+')','叉積小於等於 0，這個點造成右轉或位在同一直線中間。',point,turn);}chain.push(point);push(name+'：加入 ('+point.join(',')+')','保留下來的轉彎都朝左，每個點最多加入與彈出各一次。',point);}
      const result=[...lower.slice(0,-1),...upper.slice(0,-1)];push('接起上下兩條鏈','各去掉一個重複端點，得到逆時針外框；共線時留下兩端。',null,'—',true);frames.at(-1).result=snapshot(result);return frames;
    }
  };

  models['sweep-line'] = {
    title:'只在端點更新目前重疊數',
    inputs:[field('intervals','半開區間 left:right','1:4,2:5,5:7,3:3')],
    presets:[preset('相接與重疊',{intervals:'1:4,2:5,5:7,3:3'}),preset('同時開始與結束',{intervals:'0:2,0:2,2:4,2:3'}),preset('分離與負座標',{intervals:'-4:-2,1:3,5:5'})],
    run(input){
      const entries=String(input.intervals).trim()?String(input.intervals).split(','):[];
      if(entries.length>10)throw new Error('一次最多輸入 10 段區間。');
      const intervals=entries.map(entry=>{const m=entry.trim().match(/^(-?\d+)\s*:\s*(-?\d+)$/);if(!m)throw new Error('區間請寫成 left:right，用逗號分隔。');const a=integer(m[1],'左端',-20,20),b=integer(m[2],'右端',a,20);return[a,b];});
      const events=new Map();for(const [a,b]of intervals){if(a===b)continue;events.set(a,(events.get(a)||0)+1);events.set(b,(events.get(b)||0)-1);}
      const xs=[...events.keys()].sort((a,b)=>a-b),frames=[];let active=0,length=0,peak=0,previous=null;
      const min=Math.min(0,...xs),max=Math.max(1,...xs);
      function push(title,text,x=null,coveredAt=x){const nodes=[],edges=[];intervals.forEach(([a,b],i)=>{nodes.push({id:'a'+i,label:String(a),x:40+(a-min)*520/(max-min),y:25+i*25,state:coveredAt!==null&&a<=coveredAt&&coveredAt<b?'active':''},{id:'b'+i,label:String(b),x:40+(b-min)*520/(max-min),y:25+i*25});edges.push({from:'a'+i,to:'b'+i,state:coveredAt!==null&&a<=coveredAt&&coveredAt<b?'active':''});});frames.push(frame(title,text,[row('事件座標',xs,x===null?[]:[xs.indexOf(x)]),row('淨變化',xs.map(p=>(events.get(p)>=0?'+':'')+events.get(p)))],{目前重疊數:active,覆蓋總長:length,最高重疊數:peak},{graph:{nodes,edges}}));}
      push('同一座標的開始與結束合併','[left,right) 包含左端、排除右端；零長度區間直接略過。');
      for(const x of xs){const width=previous===null?0:x-previous;if(active>0)length+=width;push('掃到 '+x,'剛跨過長度 '+width+' 的一段，當時重疊數為 '+active+'；'+(active>0?'把這段長度加入總長。':'這段空白略過。'),x,previous===null?x-1:(previous+x)/2);active+=events.get(x);peak=Math.max(peak,active);push('套用 '+x+' 的淨變化 '+events.get(x),'新重疊數會沿用到下一個事件座標。',x);previous=x;}
      push('掃描完成','覆蓋總長 '+length+'，最高同時重疊 '+peak+' 段。');frames.at(-1).result={length,peak};return frames;
    }
  };
  return models;
});
