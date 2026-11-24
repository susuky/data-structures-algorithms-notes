/* Deterministic algorithm traces with user-controlled playback. Offline, dependency-free. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DSALabs = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const display = value => value === null ? '∞' : String(value);
  function integer(raw, name, min = -1000, max = 1000) {
    const value = typeof raw === 'number' ? raw : Number(String(raw).trim());
    if (String(raw).trim() === '' || !Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${name} 必須是 ${min} 到 ${max} 的整數。`);
    return value;
  }
  function numbers(raw, {minLength = 1, maxLength = 12, min = -1000, max = 1000, sorted = false, unique = false} = {}) {
    let values;
    if (Array.isArray(raw)) values = raw.map(n => integer(n, '元素', min, max));
    else {
      const text = String(raw).trim();
      if (!text) values = [];
      else {
        const parts = text.split(/[,，\s]+/);
        if (text.startsWith(',') || text.endsWith(',') || /[,，]\s*[,，]/.test(text)) throw new Error('請輸入完整整數，數字之間以逗號或空白分隔。');
        values = parts.map(n => integer(n, '元素', min, max));
      }
    }
    if (values.length < minLength || values.length > maxLength) throw new Error(`請提供 ${minLength}–${maxLength} 個整數。`);
    if (sorted && values.some((v, i) => i > 0 && v < values[i - 1])) throw new Error('這個實驗需要由小到大排序的陣列；請先排序輸入。');
    if (unique && new Set(values).size !== values.length) throw new Error('請勿重複輸入同一面額。');
    return values;
  }
  function twoPointers(input) {
    const values = numbers(input.array, {minLength: 2, sorted: true});
    const target = integer(input.target, '目標總和', -2000, 2000);
    const frames = [];
    let left = 0, right = values.length - 1;
    function push(explanation, done = false, result = null) {
      frames.push({kind: 'array', values: [...values], markers: {left, right}, active: left < right ? [left, right] : [], muted: values.map((_, i) => i).filter(i => i < left || i > right), vars: {left, right, '目前兩數和': left < right ? values[left] + values[right] : '不再比較', target}, explanation, done, result});
    }
    push('先把 left 放在最左、right 放在最右。候選配對都在這個範圍內，接著比較兩端總和。');
    while (left < right) {
      const sum = values[left] + values[right];
      if (sum === target) { push(`找到：索引 ${left} 與 ${right}，${values[left]} + ${values[right]} = ${target}。停止；本題只需要一組答案。`, true, [left, right]); return frames; }
      if (sum < target) {
        const old = left++;
        push(`剛才 ${values[old]} + ${values[right]} = ${sum} < ${target}。即使配上範圍內最大值仍太小，因此排除索引 ${old}，left 改為 ${left}。`);
      } else {
        const old = right--;
        push(`剛才 ${values[left]} + ${values[old]} = ${sum} > ${target}。即使配上範圍內最小值仍太大，因此排除索引 ${old}，right 改為 ${right}。`);
      }
    }
    push('left 與 right 已相遇。不能重複使用同一元素，候選配對已耗盡；沒有符合的答案。', true, null);
    return frames;
  }
  function slidingWindow(input) {
    const values = numbers(input.array);
    const k = integer(input.k, 'k', 1, values.length);
    let sum = 0, best = null, bestLeft = 0, left = 0, right = -1;
    const frames = [];
    function push(explanation, done = false) {
      const shownLeft = done ? bestLeft : left, shownRight = done ? bestLeft + k - 1 : right;
      frames.push({kind: 'array', values: [...values], markers: shownRight < 0 ? {} : {left: shownLeft, right: shownRight}, active: values.map((_, i) => i).filter(i => i >= shownLeft && i <= shownRight), vars: {left: shownLeft, right: shownRight, sum: done ? best : sum, k, '最大總和': best === null ? '尚無完整視窗' : best, '最佳起點': best === null ? '—' : bestLeft}, explanation, done, result: done ? {sum: best, left: bestLeft, right: bestLeft + k - 1} : null});
    }
    push(`從空視窗開始。先逐一加入前 ${k} 個元素；尚未湊滿 k 前，不更新最佳答案。`);
    for (right = 0; right < k; right++) {
      sum += values[right];
      if (right === k - 1) { best = sum; bestLeft = 0; }
      push(`加入索引 ${right} 的 ${values[right]}，sum = ${sum}。${right === k - 1 ? '第一個完整視窗成立，用它初始化最大值，負數也不例外。' : '視窗尚未滿 k，繼續加入。'}`);
    }
    for (right = k; right < values.length; right++) {
      const leaving = values[left];
      sum -= leaving;
      left++;
      sum += values[right];
      const improved = sum > best;
      if (improved) { best = sum; bestLeft = left; }
      push(`移除 ${leaving}，加入 ${values[right]}，sum = ${sum}。${improved ? '比既有最佳值大，更新最佳視窗。' : '沒有嚴格超過最佳值，保留較早出現的答案。'}`);
    }
    right = values.length - 1;
    push(`所有長度 ${k} 的視窗都已處理。標出的最佳視窗為索引 ${bestLeft}–${bestLeft + k - 1}，最大總和 ${best}。`, true);
    return frames;
  }
  function binarySearch(input) {
    const values = numbers(input.array, {minLength: 0, sorted: true});
    const target = integer(input.target, 'target');
    let lo = 0, hi = values.length, mid = null;
    const frames = [];
    function push(explanation, done = false) {
      frames.push({kind: 'array', values: [...values], markers: {lo, hi, ...(mid === null ? {} : {'mid（剛檢查）': mid})}, active: values.map((_, i) => i).filter(i => i >= lo && i < hi), muted: values.map((_, i) => i).filter(i => i < lo || i >= hi), sentinel: true, vars: {lo, hi, 'mid（剛檢查）': mid === null ? '—' : mid, target, '候選數': hi - lo}, explanation, done, result: done ? lo : null});
    }
    push(`搜尋區間是 [0, ${hi})。hi 可等於陣列長度，這是邊界，不是可讀取的元素索引。`);
    while (lo < hi) {
      mid = lo + Math.floor((hi - lo) / 2);
      if (values[mid] < target) {
        lo = mid + 1;
        push(`檢查索引 ${mid}：${values[mid]} < ${target}。它及左側都太小，令 lo = mid + 1 = ${lo}。新候選區間 [${lo}, ${hi})。`);
      } else {
        hi = mid;
        push(`檢查索引 ${mid}：${values[mid]} ≥ ${target}。它可能就是第一個，因此令 hi = mid = ${hi}；邊界保留這個可能答案。新候選區間 [${lo}, ${hi})。`);
      }
    }
    push(`lo = hi = ${lo}，候選區間已空，停止。${lo === values.length ? '所有元素都小於 target；回傳陣列尾端的插入位置。' : `第一個不小於 ${target} 的元素為索引 ${lo} 的 ${values[lo]}。${values[lo] === target ? '這也是 target 的第一次出現。' : 'target 不在陣列中；這是它的插入位置。'}`}`, true);
    return frames;
  }
  function parseEdges(raw) {
    const text = String(raw).trim().toUpperCase();
    const edges = [];
    if (!text) return edges;
    for (const part of text.split(/[,，]/)) {
      const match = part.trim().match(/^([A-F])\s*[-–]\s*([A-F])$/);
      if (!match) throw new Error('邊請寫成 A-B, B-C；本實驗只使用 A–F 六個節點。');
      if (match[1] === match[2]) throw new Error('請使用兩個不同節點；本實驗不加入自環。');
      const edge = [match[1], match[2]].sort();
      if (!edges.some(e => e[0] === edge[0] && e[1] === edge[1])) edges.push(edge);
    }
    return edges;
  }
  function bfs(input) {
    const nodes = ['A', 'B', 'C', 'D', 'E', 'F'];
    const edges = parseEdges(input.edges);
    const start = String(input.start).trim().toUpperCase();
    if (!nodes.includes(start)) throw new Error('起點必須是 A、B、C、D、E 或 F。');
    const adj = Object.fromEntries(nodes.map(n => [n, []]));
    edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
    nodes.forEach(n => adj[n].sort());
    const distances = Object.fromEntries(nodes.map(n => [n, null]));
    const parents = Object.fromEntries(nodes.map(n => [n, null]));
    const queue = [start], order = [], frames = [];
    distances[start] = 0;
    let current = null, head = 0;
    function push(explanation, done = false) {
      frames.push({kind: 'graph', nodes, edges, queue: queue.slice(head), current, distances: {...distances}, parents: {...parents}, order: [...order], vars: {'目前節點': current || '—', '已出列': order.join(' → ') || '—', '已發現': nodes.filter(n => distances[n] !== null).length}, explanation, done, result: done ? {...distances} : null});
    }
    push(`將起點 ${start} 入列，同時設距離 0、標記已發現。此後只有尚未發現的鄰居可以入列。`);
    while (head < queue.length) {
      current = queue[head++];
      order.push(current);
      push(`從佇列前端取出 ${current}，距離是 ${distances[current]}。依字母順序檢查它的鄰居。`);
      for (const next of adj[current]) {
        if (distances[next] !== null) {
          push(`${current} 的鄰居 ${next} 已發現，距離為 ${distances[next]}。略過，避免環與重複入列。`);
        } else {
          distances[next] = distances[current] + 1;
          parents[next] = current;
          queue.push(next);
          push(`首次發現 ${next}：距離 = ${distances[current]} + 1 = ${distances[next]}，父節點記為 ${current}；立刻標記並加入佇列。`);
        }
      }
    }
    current = null;
    const unreachable = nodes.filter(n => distances[n] === null);
    push(`佇列已空，所有可到達節點皆已處理。${unreachable.length ? unreachable.join('、') + ' 不可從起點到達，距離保留 ∞。' : '六個節點皆可從起點到達。'} 這裡的距離計算邊數，只適用無權（或等權）圖。`, true);
    return frames;
  }
  function backtracking(input) {
    const n = integer(input.n, 'n', 1, 6);
    const target = integer(input.target, 'target', 0, 30);
    const path = [], decisions = [], solutions = [], frames = [];
    function push(i, sum, explanation, action, done = false) {
      frames.push({kind: 'backtracking', n, path: [...path], decisions: [...decisions], solutions: solutions.map(s => [...s]), i, action, vars: {'下一個數': i <= n ? i : '已無數字', 'path 總和': sum, target, '遞迴深度': decisions.length, '答案數': solutions.length}, explanation, done, result: done ? solutions.map(s => [...s]) : null});
    }
    function visit(i, sum) {
      push(i, sum, `進入狀態：接著決定 ${i <= n ? i : '沒有剩餘數字'}，path = [${path.join(', ')}]，總和 ${sum}。`, 'visit');
      if (sum === target) {
        solutions.push([...path]);
        push(i, sum, `找到一組：[${path.join(', ')}]。複製目前 path 保存答案；所有候選數皆為正，繼續選只會超過目標，所以返回。`, 'solution');
        return;
      }
      if (sum > target) { push(i, sum, `${sum} > ${target}；後續都為正數，無法把總和降回來。剪掉這條分支。`, 'prune'); return; }
      if (i > n) { push(i, sum, '所有數字都已決定，總和仍未達目標；返回上一層。', 'return'); return; }
      const remaining = (i + n) * (n - i + 1) / 2;
      if (sum + remaining < target) { push(i, sum, `就算全選剩餘數字，總和最多 ${sum + remaining} < ${target}。不可能達標，剪枝。`, 'prune'); return; }
      path.push(i); decisions.push(`選 ${i}`);
      push(i + 1, sum + i, `選擇 ${i}：把它加入 path，再深入下一層。`, 'choose');
      visit(i + 1, sum + i);
      path.pop(); decisions.pop();
      push(i, sum, `子呼叫返回。撤銷選擇 ${i}，path 與總和都還原到進入這層的狀態。`, 'undo');
      decisions.push(`略過 ${i}`);
      push(i + 1, sum, `現在探索不選 ${i} 的分支；總和不變。`, 'skip');
      visit(i + 1, sum);
      decisions.pop();
    }
    visit(1, 0);
    push(1, 0, `所有選／不選分支都已走完或被安全剪枝，共找到 ${solutions.length} 組。path 已清空，沒有殘留上一次選擇。`, 'done', true);
    return frames;
  }
  function dp(input) {
    const coins = numbers(input.coins, {minLength: 1, maxLength: 6, min: 1, max: 20, unique: true});
    const amount = integer(input.amount, 'amount', 0, 18);
    const table = Array(amount + 1).fill(null), choice = Array(amount + 1).fill(null), frames = [];
    table[0] = 0;
    let current = 0, dependency = null, coin = null;
    function push(explanation, done = false, result = null) {
      frames.push({kind: 'dp', values: [...table], choice: [...choice], markers: {s: current, ...(dependency === null ? {} : {'s−coin': dependency})}, active: dependency === null ? [current] : [current, dependency], vars: {s: current, coin: coin === null ? '—' : coin, 'dp[s−coin]': dependency === null ? '—' : display(table[dependency]), 'dp[s]': display(table[current]), amount}, explanation, done, result});
    }
    push('初始化 dp[0] = 0；湊出 0 元不需要硬幣。其他位置先設 ∞，表示尚未找到可行解。');
    for (current = 1; current <= amount; current++) {
      for (coin of coins) {
        if (coin > current) { dependency = null; push(`面額 ${coin} 大於目前總額 ${current}，不能使用，略過。`); continue; }
        dependency = current - coin;
        if (table[dependency] === null) { push(`dp[${dependency}] = ∞，無法先湊出 ${dependency}，所以再加面額 ${coin} 仍不可行。`); continue; }
        const candidate = table[dependency] + 1;
        if (table[current] === null || candidate < table[current]) {
          table[current] = candidate;
          choice[current] = coin;
          push(`最後使用一枚 ${coin}：dp[${dependency}] + 1 = ${candidate}，改善目前最佳值，令 dp[${current}] = ${candidate}。`);
        } else push(`使用 ${coin} 的候選值 ${candidate} 沒有更小；保留 dp[${current}] = ${table[current]}。`);
      }
    }
    current = amount; dependency = null; coin = null;
    const used = [];
    if (table[amount] !== null) {
      for (let remaining = amount; remaining > 0; remaining -= choice[remaining]) used.push(choice[remaining]);
    }
    push(table[amount] === null ? `表格填完，dp[${amount}] 仍為 ∞。這些面額無法湊出指定總額，回傳不可行。` : `表格填完，最少需要 ${table[amount]} 枚硬幣。${used.length ? '一組最優組合：' + used.join(' + ') + ' = ' + amount + '。' : 'amount = 0，答案是空組合。'}`, true, {count: table[amount], coins: used});
    return frames;
  }

  function pairCount(input) {
    const n = integer(input.n, 'n', 0, 9), frames = [], cells = [];
    let count = 0, row = -1, column = -1;
    function push(explanation, operation, done = false) {
      frames.push({kind:'pairs', n, cells:cells.map(x=>[...x]), row, column,
        vars:{n, i:row < 0 ? '—' : row, j:column < 0 ? '—' : column, pairs:count, '直接計算':n*(n-1)/2},
        explanation, operation, done, result:done ? count : null});
    }
    push('每一格代表一對位置 (i, j)。只走 j < i 的格子；對角線代表自己配自己，留白。','pairs = 0');
    for (row = 0; row < n; row++) for (column = 0; column < row; column++) {
      cells.push([row,column]); count++;
      push(`處理位置 (${row}, ${column})，累計 ${count} 對。第 i 列有 i 格，總數為 0 + 1 + … + (n−1)。`,'pairs += 1');
    }
    row = n; column = -1;
    push(`${n} 個位置共有 ${count} 對。只求個數時，n×(n−1)/2 用一次公式即可；列出所有配對仍要輸出 ${count} 項。`,'return n * (n - 1) // 2',true);
    return frames;
  }
  function hashLookup(input) {
    const values = numbers(input.array,{minLength:0}), target = integer(input.target,'target',-2000,2000);
    const seen = new Map(), frames = []; let current = -1, need = null;
    function push(explanation,operation,done=false,result=null) {
      frames.push({kind:'lookup',values:[...values],active:current<0?[]:[current],markers:current<0?{}:{i:current},
        entries:[...seen],vars:{i:current<0?'—':current, '目前值':current<0?'—':values[current], '要找的搭檔':need===null?'—':need,target,'已存不同值':seen.size},
        explanation,operation,done,result});
    }
    push('字典先留空。每次只查較早出現的元素，找到時兩個索引自然不同。','first_index = {}');
    for(current=0; current<values.length; current++) {
      need=target-values[current];
      push(`讀到 ${values[current]}，需要 ${need}。在寫入目前位置前，查詢較早的索引。`,'need = target - value');
      if(seen.has(need)) {
        const result=[seen.get(need),current];
        push(`字典中的 ${need} 位於索引 ${result[0]}。與索引 ${current} 的 ${values[current]} 配成 ${target}。`,'return first_index[need], i',true,result);
        return frames;
      }
      const existed=seen.has(values[current]);
      if(!existed) seen.set(values[current],current);
      push(existed ? `${values[current]} 已有較早位置 ${seen.get(values[current])}，保留它，方便回傳較早的左端。` : `目前沒有搭檔。加入 ${values[current]} → ${current}，讓下一輪能查到這筆。`,'first_index.setdefault(value, i)');
    }
    current=-1;need=null;
    push('所有位置都查過一次，沒有兩數和符合目標。','return None',true,null);
    return frames;
  }
  function linkedReverse(input) {
    const values=numbers(input.array,{minLength:0,maxLength:8}), next=values.map((_,i)=>i+1<values.length?i+1:null);
    let current=values.length?0:null, previous=null, saved=null;
    const frames=[];
    function push(explanation,operation,done=false) {
      frames.push({kind:'linked',values:[...values],next:[...next],current,previous,saved,
        vars:{prev:previous===null?'None':`節點 ${previous}`,cur:current===null?'None':`節點 ${current}`,nxt:saved===null?'None':`節點 ${saved}`},
        explanation,operation,done,result:done?[...values].reverse():null});
    }
    push('節點保持原位；反轉的是 next 的方向。prev 指向已完成部分，cur 指向尚未處理的第一個節點。','prev, cur = None, head');
    while(current!==null) {
      saved=next[current];
      push(`先保存節點 ${current} 原本的下一站 ${saved===null?'None':saved}，改線之後仍能找到剩下的串列。`,'nxt = cur.next');
      next[current]=previous;
      push(`將節點 ${current} 的 next 接到 ${previous===null?'None':`節點 ${previous}`}。它現在成為已反轉部分的新起點。`,'cur.next = prev');
      previous=current; current=saved; saved=null;
      push('prev 前進到剛完成的節點，cur 沿保存的入口往後走。','prev, cur = cur, nxt');
    }
    push(values.length ? `cur 已走到 None。新起點是原本最後一個節點 ${previous}，讀出的值為 ${[...values].reverse().join(' → ')}。` : '輸入為空，直接回傳 None。','return prev',true);
    return frames;
  }
  function monotonicStack(input) {
    const values=numbers(input.array,{minLength:0}), stack=[], answer=values.map(()=>null),frames=[];
    let current=-1, popped=null;
    function push(explanation,operation,done=false) {
      frames.push({kind:'stack',values:[...values],active:current<0?[]:[current],markers:current<0?{}:{i:current},
        stack:[...stack],answer:[...answer],vars:{i:current<0?'—':current,'等待索引':stack.join(', ')||'空','剛解決':popped===null?'—':popped},
        explanation,operation,done,result:done?[...answer]:null});
    }
    push('堆疊保存尚未找到右側較大值的索引。從底到頂，對應數值維持非遞增。','stack, answer = [], [-1] * n');
    for(current=0;current<values.length;current++) {
      popped=null;
      push(`新值 ${values[current]} 抵達，從最近等待的索引開始比較。`,'for i, value in enumerate(nums):');
      while(stack.length&&values[stack.at(-1)]<values[current]) {
        popped=stack.pop();answer[popped]=current;
        push(`索引 ${popped} 的 ${values[popped]} 等到了第一個嚴格較大值 ${values[current]}，答案設為索引 ${current}。`,'answer[stack.pop()] = i');
      }
      stack.push(current);popped=null;
      push(`索引 ${current} 加入等待。相等的值保留在堆疊，因為題目要求嚴格較大。`,'stack.append(i)');
    }
    current=-1;
    push('掃描結束。留在堆疊的索引在右側沒有較大值；答案格顯示 —。每個索引最多入堆疊、出堆疊各一次。','return answer',true);
    return frames;
  }
  function heapTopK(input) {
    const values=numbers(input.array,{minLength:1}),k=integer(input.k,'k',1,values.length),heap=[],frames=[];
    let current=-1,active=[];
    function push(explanation,operation,done=false) {
      frames.push({kind:'heap',values:[...values],heap:[...heap],current,active:[...active],
        vars:{'已讀':current<0?0:current+1,k,'門檻（根）':heap.length===k?heap[0]:'尚未滿 k 個','堆積大小':heap.length},
        explanation,operation,done,result:done?{top:[...heap].sort((a,b)=>b-a),kth:heap[0]}:null});
    }
    push(`保留最大的 ${k} 個值。最小堆積的根是其中最小者，也是新值要超過的入選門檻。`,'heap = []');
    for(current=0;current<values.length;current++) {
      const value=values[current]; active=[];
      if(heap.length<k) {
        heap.push(value); let at=heap.length-1;active=[at];
        push(`尚未滿 ${k} 個，先將 ${value} 放到尾端，再沿父節點方向修復堆積。`,'heappush(heap, value)');
        while(at>0) {
          const parent=Math.floor((at-1)/2);
          if(heap[parent]<=heap[at]) break;
          [heap[parent],heap[at]]=[heap[at],heap[parent]];active=[parent,at];at=parent;
          push('新值比父節點小，交換一次；繼續往上看。','swap(child, parent)');
        }
      } else if(value>heap[0]) {
        const evicted=heap[0];heap[0]=value;let at=0;active=[0];
        push(`${value} 超過門檻 ${evicted}，替換根，接著向下修復。`,'heapreplace(heap, value)');
        while(2*at+1<heap.length) {
          let child=2*at+1;
          if(child+1<heap.length&&heap[child+1]<heap[child]) child++;
          if(heap[at]<=heap[child]) break;
          [heap[at],heap[child]]=[heap[child],heap[at]];active=[at,child];at=child;
          push('與較小的子節點交換，讓父節點重新小於兩個子節點。','swap(parent, smaller_child)');
        }
      } else push(`${value} 沒有超過門檻 ${heap[0]}，保留目前的 k 個候選。`,'if value <= heap[0]: continue');
      active=[];
      push(`處理完索引 ${current}，根為 ${heap[0]}。已讀前綴的最大 ${Math.min(k,current+1)} 個值都在堆積中。`,'# prefix processed');
    }
    current=values.length-1;active=[0];
    push(`第 ${k} 大是 ${heap[0]}；由大到小的入選值為 ${[...heap].sort((a,b)=>b-a).join(', ')}。`,'return heap[0]',true);
    return frames;
  }
  function parseIntervals(raw) {
    const parts=String(raw).trim().split(/[,，]/).filter(x=>x.trim());
    if(parts.length<1||parts.length>10) throw new Error('請輸入 1–10 個區間，例如 1-4, 3-5。');
    return parts.map((part,id)=>{
      const match=part.trim().match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if(!match) throw new Error('區間請寫成 1-4，端點為 0–30 的整數。');
      const start=integer(match[1],'起點',0,30),end=integer(match[2],'終點',0,30);
      if(start>=end) throw new Error('每個區間的起點需小於終點。');
      return {start,end,id,label:String.fromCharCode(65+id)};
    });
  }
  function intervalGreedy(input) {
    const original=parseIntervals(input.intervals),intervals=[...original].sort((a,b)=>a.end-b.end||a.start-b.start||a.id-b.id);
    const selected=[],rejected=[],frames=[];let current=null,end=null;
    function push(explanation,operation,done=false) {
      frames.push({kind:'intervals',intervals:clone(intervals),selected:[...selected],rejected:[...rejected],current,end,
        vars:{'上一場結束':end===null?'—':end,'已安排':selected.length,'目前候選':current===null?'—':original[current].label},
        explanation,operation,done,result:done?selected.map(id=>[original[id].start,original[id].end]):null});
    }
    push('目標是安排最多場活動。按結束時間排序，較早結束能留給後續活動較多時間。','intervals.sort(key=lambda x: x.end)');
    for(const item of intervals) {
      current=item.id;
      if(end===null||item.start>=end) {
        selected.push(item.id);end=item.end;
        push(`接受 ${item.label} [${item.start}, ${item.end})；下一場最早可從 ${end} 開始。端點相接可以連排。`,'if start >= end: selected.append(item)');
      } else {
        rejected.push(item.id);
        push(`略過 ${item.label} [${item.start}, ${item.end})，它在上一場結束的 ${end} 之前就開始。`,'else: skip(item)');
      }
    }
    current=null;
    push(`共安排 ${selected.length} 場：${selected.map(id=>original[id].label).join('、')}。若改成最大總收入，決策還需把每場收入加入狀態。`,'return selected',true);
    return frames;
  }
  function labelWindow(input) {
    const values=String(input.labels).split(/[,，\s]+/).filter(Boolean);
    if(values.length<1||values.length>12||values.some(x=>!/^[a-zA-Z0-9]{1,6}$/.test(x))) throw new Error('請輸入 1–12 個標籤，各含 1–6 個英文字母或數字。');
    const k=integer(input.k,'最多種類 k',0,6),frequency=new Map(),frames=[];
    let left=0,right=-1,bestLeft=0,bestRight=0;
    function push(explanation,operation,done=false) {
      const l=done?bestLeft:left,r=done?bestRight-1:right;
      frames.push({kind:'lookup',values:[...values],active:values.map((_,i)=>i).filter(i=>i>=l&&i<=r),markers:r>=l?{left:l,right:r}:{},
        entries:[...frequency],vars:{left:l,right:r,'目前種類':frequency.size,k,'最佳長度':bestRight-bestLeft,'最佳區間':`[${bestLeft}, ${bestRight})`},
        explanation,operation,done,result:done?{left:bestLeft,right:bestRight,length:bestRight-bestLeft}:null});
    }
    push('找出最多 k 種標籤的最長連續區間。字典保存目前視窗中的數量，歸零時移除該鍵。','left, best = 0, (0, 0)');
    for(right=0;right<values.length;right++) {
      const value=values[right];frequency.set(value,(frequency.get(value)||0)+1);
      push(`加入 ${value}，視窗有 ${frequency.size} 種標籤。`,'freq[value] += 1');
      while(frequency.size>k) {
        const leaving=values[left++];frequency.set(leaving,frequency.get(leaving)-1);
        if(frequency.get(leaving)===0) frequency.delete(leaving);
        push(`移出 ${leaving}；left = ${left}，剩 ${frequency.size} 種。種類超過 k 時繼續縮。`,'while len(freq) > k: remove_left()');
      }
      if(right+1-left>bestRight-bestLeft){bestLeft=left;bestRight=right+1;}
      push(`目前合法區間 [${left}, ${right+1})；最佳仍取最早的同長區間 [${bestLeft}, ${bestRight})。`,'if length > best_length: best = (left, right + 1)');
    }
    const bestFrequency=new Map();
    for(const value of values.slice(bestLeft,bestRight)) bestFrequency.set(value,(bestFrequency.get(value)||0)+1);
    frequency.clear();for(const entry of bestFrequency) frequency.set(...entry);
    push(`最佳區間 [${bestLeft}, ${bestRight})，長度 ${bestRight-bestLeft}。圖中回到這一段，字典也顯示這一段的頻率。`,'return best',true);
    return frames;
  }
  function unionFind(input) {
    const nodes=['A','B','C','D','E','F'],edges=parseEdges(input.edges),parent=Object.fromEntries(nodes.map(n=>[n,n])),size=Object.fromEntries(nodes.map(n=>[n,1])),frames=[];
    let components=6,current=null;
    function push(explanation,operation,done=false) {
      frames.push({kind:'union',nodes,edges:clone(edges),parent:{...parent},size:{...size},current,
        vars:{'群組數':components,'目前連線':current?current.join('—'):'—'},
        explanation,operation,done,result:done?{components,parent:{...parent}}:null});
    }
    function find(x) {
      if(parent[x]!==x) {
        const root=find(parent[x]);
        if(parent[x]!==root){parent[x]=root;push(`把 ${x} 直接接到根 ${root}，縮短下次查詢的路徑。`,'parent[x] = find(parent[x])');}
      }
      return parent[x];
    }
    push('六個節點各自成一組，parent 指向自己。加入連線時，只需合併兩端所在的群組。','parent[x] = x');
    for(const edge of edges) {
      current=edge;let a=find(edge[0]),b=find(edge[1]);
      if(a===b) {push(`${edge.join(' 與 ')} 已經同屬根 ${a}，群組數維持 ${components}。`,'if root_a == root_b: return False');continue;}
      if(size[a]<size[b]) [a,b]=[b,a];
      parent[b]=a;size[a]+=size[b];components--;
      push(`把較小群組的根 ${b} 接到 ${a}，新群組大小 ${size[a]}，群組總數降為 ${components}。`,'parent[small] = large');
    }
    current=null;
    push(`連線處理完，共 ${components} 個連通群組。根節點的 size 是群組人數。`,'return components',true);
    return frames;
  }

  const algorithms = {'two-pointers': twoPointers, 'sliding-window': slidingWindow, 'binary-search': binarySearch, bfs, backtracking, dp, 'pair-count':pairCount, 'hash-lookup':hashLookup, 'linked-reverse':linkedReverse, 'monotonic-stack':monotonicStack, 'heap-top-k':heapTopK, 'interval-greedy':intervalGreedy, 'label-window':labelWindow, 'union-find':unionFind};
  const escape = text => String(text).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  function arrayHTML(frame) {
    const values = frame.values;
    let result = '<div class="array-scroll"><div class="array-strip">';
    const length = values.length + (frame.sentinel ? 1 : 0);
    for (let i = 0; i < length; i++) {
      const labels = Object.entries(frame.markers || {}).filter(([, value]) => value === i).map(([key]) => key);
      const active = (frame.active || []).includes(i), muted = (frame.muted || []).includes(i);
      result += `<div class="array-item${active ? ' active' : ''}${muted ? ' excluded' : ''}${i === values.length ? ' sentinel' : ''}"><div class="array-pointers">${labels.map(l => `<span>${escape(l)}</span>`).join('')}</div><div class="array-value">${i === values.length ? '尾端' : frame.kind === 'dp' ? display(values[i]) : values[i]}</div><span class="array-index">${frame.kind === 'dp' ? 'dp[' + i + ']' : i}</span></div>`;
    }
    result += '</div></div>';
    if (frame.kind === 'dp') result += '<p class="visual-legend">dp[s]：湊出 s 的最少硬幣數；∞：尚未找到組合。</p>';
    return result;
  }
  function graphHTML(frame) {
    const positions = {A: [65, 120], B: [190, 55], C: [190, 190], D: [335, 120], E: [465, 55], F: [465, 190]};
    let svg = '<div class="graph-scroll"><svg viewBox="0 0 540 255" role="img" aria-label="BFS 圖形狀態，節點內顯示名稱及距離">';
    for (const [a, b] of frame.edges) {
      const [x1, y1] = positions[a], [x2, y2] = positions[b];
      const tree = frame.parents[a] === b || frame.parents[b] === a;
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="graph-edge${tree ? ' tree-edge' : ''}"/>`;
    }
    for (const node of frame.nodes) {
      const [x, y] = positions[node];
      const found = frame.distances[node] !== null, current = frame.current === node;
      svg += `<g class="graph-node${found ? ' discovered' : ''}${current ? ' current' : ''}"><circle cx="${x}" cy="${y}" r="28"/><text x="${x}" y="${y - 2}" text-anchor="middle">${node}</text><text class="graph-distance" x="${x}" y="${y + 16}" text-anchor="middle">d=${display(frame.distances[node])}</text></g>`;
    }
    svg += '</svg></div><div class="queue-view"><strong>佇列</strong><span class="queue-start">先出 →</span>' + (frame.queue.length ? frame.queue.map(n => `<span class="queue-node">${n}</span>`).join('') : '<span class="queue-empty">空</span>') + '</div><p class="visual-legend">虛線圈：目前節點。橘色節點：已發現。粗線：首次發現路徑。</p>';
    return svg;
  }
  function backtrackingHTML(frame) {
    const actionNames = {visit: '進入狀態', choose: '選擇', skip: '不選', undo: '撤銷', solution: '保存答案', prune: '剪枝', return: '返回', done: '完成'};
    return `<div class="backtrack-state"><div class="decision-label">${actionNames[frame.action]}</div><div class="decision-trail"><strong>決策路徑</strong><span>${frame.decisions.length ? frame.decisions.map(escape).join(' → ') : '根節點'}</span></div><div class="path-view"><strong>path</strong>${frame.path.length ? frame.path.map(n => `<span class="path-node">${n}</span>`).join('') : '<span class="path-empty">[]</span>'}</div><div class="candidate-view"><strong>下一個</strong>${Array.from({length: frame.n}, (_, i) => `<span class="candidate${i + 1 === frame.i ? ' current' : ''}${i + 1 < frame.i ? ' past' : ''}">${i + 1}</span>`).join('')}</div><div class="solutions-view"><strong>已保存答案</strong><p>${frame.solutions.length ? frame.solutions.map(s => '[' + s.join(', ') + ']').join('　') : '無'}</p></div></div>`;
  }

  function extraHTML(frame) {
    if(frame.kind==='pairs') {
      const chosen=new Set(frame.cells.map(p=>p.join(',')));
      return '<div class="pair-matrix" style="--n:'+Math.max(1,frame.n)+'">' + Array.from({length:frame.n*frame.n},(_,pos)=>{
        const i=Math.floor(pos/frame.n),j=pos%frame.n,done=chosen.has(i+','+j);
        return '<span class="pair-cell '+(j>=i?'unused':done?'visited':'')+(frame.row===i&&frame.column===j?' current':'')+'">'+(j<i?i+','+j:'·')+'</span>';
      }).join('')+'</div><p class="visual-legend">列是 i，欄是 j；已走過 '+frame.cells.length+' 格。</p>';
    }
    if(frame.kind==='lookup') return arrayHTML(frame)+'<div class="map-view"><strong>字典</strong><div>'+ (frame.entries.length?frame.entries.map(([k,v])=>'<span class="map-entry"><b>'+escape(k)+'</b><span>→ '+escape(v)+'</span></span>').join(''):'<span class="empty-state">空</span>')+'</div></div>';
    if(frame.kind==='stack') return arrayHTML(frame)+'<div class="stack-state"><div><strong>等待堆疊</strong><div class="stack-row">'+(frame.stack.length?frame.stack.map(i=>'<span>'+escape(frame.values[i])+'<small>索引 '+i+'</small></span>').join(''):'空')+'</div></div><div><strong>右側較大值的索引</strong><div class="answer-row">'+frame.answer.map((v,i)=>'<span><small>'+i+'</small><b>'+ (v===null?'—':v)+'</b></span>').join('')+'</div></div></div>';
    if(frame.kind==='linked') {
      if(!frame.values.length) return '<div class="trace-empty">head → None</div>';
      const width=Math.max(500,frame.values.length*86+60),x=i=>45+i*86;
      let svg='<div class="trace-scroll"><svg viewBox="0 0 '+width+' 205" role="img" aria-label="鏈結串列 next 方向與 prev、cur 位置">';
      frame.next.forEach((to,i)=>{
        if(to===null){svg+='<text class="trace-small" x="'+x(i)+'" y="182" text-anchor="middle">next → None</text>';return;}
        const direction=to>i?1:-1, y=direction>0?57:142, sx=x(i)+direction*20,ex=x(to)-direction*26;
        svg+='<path class="trace-edge" d="M'+sx+' 97 Q'+((sx+ex)/2)+' '+y+' '+ex+' 97"/><path class="trace-edge" d="M'+(ex-direction*7)+' 91 L'+ex+' 97 L'+(ex-direction*7)+' 101"/>';
      });
      frame.values.forEach((v,i)=>{
        const flags=[frame.previous===i?'prev':'',frame.current===i?'cur':'',frame.saved===i?'nxt':''].filter(Boolean);
        svg+='<g class="trace-node '+(frame.current===i?'current':'')+'"><circle cx="'+x(i)+'" cy="97" r="23"/><text x="'+x(i)+'" y="103" text-anchor="middle">'+v+'</text><text class="trace-small" x="'+x(i)+'" y="33" text-anchor="middle">'+flags.join(' · ')+'</text><text class="trace-small" x="'+x(i)+'" y="145" text-anchor="middle">節點 '+i+'</text></g>';
      });
      return svg+'</svg></div>';
    }
    if(frame.kind==='heap') {
      const width=610,positions=frame.heap.map((_,i)=>{const level=Math.floor(Math.log2(i+1)),slot=i-(2**level-1);return [(slot+0.5)*width/2**level,40+level*74];});
      let svg='<div class="trace-stream">'+frame.values.map((v,i)=>'<span class="'+(i===frame.current?'current':i<frame.current?'visited':'')+'">'+v+'</span>').join('')+'</div><div class="trace-scroll"><svg viewBox="0 0 610 305" role="img" aria-label="最小堆積，根為目前入選門檻">';
      positions.forEach(([x,y],i)=>{if(i){const [px,py]=positions[Math.floor((i-1)/2)];svg+='<line class="trace-edge" x1="'+x+'" y1="'+y+'" x2="'+px+'" y2="'+py+'"/>';}});
      positions.forEach(([x,y],i)=>{svg+='<g class="trace-node '+(frame.active.includes(i)?'current':'')+'"><circle cx="'+x+'" cy="'+y+'" r="22"/><text x="'+x+'" y="'+(y+6)+'" text-anchor="middle">'+frame.heap[i]+'</text></g>';});
      return svg+'</svg></div>';
    }
    if(frame.kind==='intervals') {
      const max=Math.max(...frame.intervals.map(x=>x.end)),scale=440/Math.max(1,max),height=frame.intervals.length*40+45;
      let svg='<div class="trace-scroll"><svg viewBox="0 0 620 '+height+'" role="img" aria-label="按結束時間排列的活動，已選活動可相接">';
      frame.intervals.forEach((it,i)=>{
        const y=28+i*40,status=frame.selected.includes(it.id)?'已選':frame.rejected.includes(it.id)?'重疊':'待看';
        svg+='<g class="interval-row '+(status==='已選'?'selected':status==='重疊'?'rejected':'')+'"><text x="10" y="'+(y+18)+'">'+it.label+'</text><rect x="'+(60+it.start*scale)+'" y="'+y+'" width="'+((it.end-it.start)*scale)+'" height="24" rx="5"/><text class="trace-small" x="'+(65+it.start*scale)+'" y="'+(y+17)+'">'+it.start+'–'+it.end+'</text><text x="535" y="'+(y+18)+'">'+status+'</text></g>';
      });
      return svg+'</svg></div>';
    }
    if(frame.kind==='union') {
      const roots=frame.nodes.filter(n=>frame.parent[n]===n),rootOf=n=>{while(frame.parent[n]!==n)n=frame.parent[n];return n;};
      return '<div class="union-groups">'+roots.map(root=>'<div class="union-group"><strong>根 '+root+'</strong><div>'+frame.nodes.filter(n=>rootOf(n)===root).map(n=>'<span class="'+(frame.current&&frame.current.includes(n)?'current':'')+'">'+n+'</span>').join('')+'</div><small>'+frame.size[root]+' 個節點</small></div>').join('')+'</div><table class="parent-table"><caption>parent 連結</caption><thead><tr><th scope="col">節點</th>'+frame.nodes.map(n=>'<th scope="col">'+n+'</th>').join('')+'</tr></thead><tbody><tr><th scope="row">指向</th>'+frame.nodes.map(n=>'<td>'+frame.parent[n]+'</td>').join('')+'</tr></tbody></table>';
    }
    return arrayHTML(frame);
  }
  const presets = {
    'pair-count':[['4 個位置',{n:4}],['9 個位置',{n:9}],['空輸入',{n:0}]],
    'two-pointers':[['有解',{array:'1, 3, 4, 6, 8, 11',target:10}],['重複值',{array:'3, 3',target:6}],['無解',{array:'1, 2, 5',target:9}]],
    'sliding-window':[['收益',{array:'4, -2, 5, 1, -3, 6, 2',k:3}],['全負數',{array:'-5, -2, -4',k:2}],['整段',{array:'2, 0, 4',k:3}]],
    'hash-lookup':[['未排序',{array:'9, 2, 7, 4',target:11}],['同值配對',{array:'3, 3',target:6}],['只出現一次',{array:'3',target:6}]],
    'linked-reverse':[['四個節點',{array:'7, 2, 9, 4'}],['一個節點',{array:'7'}],['空串列',{array:''}]],
    'monotonic-stack':[['高低交錯',{array:'2, 1, 2, 4, 3'}],['嚴格遞減',{array:'5, 4, 3, 2, 1'}],['相同數值',{array:'3, 3, 3'}]],
    'bfs':[['有環',{edges:'A-B, A-C, B-D, C-D, D-E, E-F',start:'A'}],['不連通',{edges:'A-B, B-C, D-E',start:'A'}],['孤立起點',{edges:'B-C, D-E',start:'A'}]],
    'heap-top-k':[['最大的 3 個',{array:'5, 2, 9, 1, 7, 3, 8',k:3}],['重複也計名次',{array:'5, 5, 2, 4',k:2}],['只留最大值',{array:'-4, -2, -7',k:1}]],
    'interval-greedy':[['活動排程',{intervals:'1-4, 3-5, 0-6, 5-7, 8-9, 5-9'}],['端點相接',{intervals:'0-2, 2-4, 4-6'}],['長活動擋路',{intervals:'0-10, 1-3, 3-5, 5-7'}]],
    'binary-search':[['重複值',{array:'1, 3, 3, 3, 7, 9, 12',target:3}],['全部太小',{array:'1, 2, 3',target:8}],['空陣列',{array:'',target:3}]],
    'backtracking':[['兩組答案',{n:4,target:5}],['空集合答案',{n:4,target:0}],['整棵剪枝',{n:4,target:15}]],
    'dp':[['貪婪會多用一枚',{coins:'1, 3, 4',amount:6}],['無法湊出',{coins:'2, 4',amount:7}],['零元',{coins:'1, 3, 4',amount:0}]],
    'label-window':[['最多兩種',{labels:'A, B, A, C, C, B, B',k:2}],['全部相同',{labels:'A, A, A, A',k:1}],['不允許種類',{labels:'A, B, A',k:0}]],
    'union-find':[['逐步合併',{edges:'A-B, C-D, B-C, E-F, D-E'}],['已在同一組',{edges:'A-B, B-C, A-C'}],['沒有連線',{edges:''}]]
  };

  function operationFor(key, frame, index) {
    if(frame.operation) return frame.operation;
    if(frame.done) return ({'two-pointers':'return (left, right) if found else None','sliding-window':'return best','binary-search':'return lo',bfs:'return distances',backtracking:'return solutions',dp:'return dp[amount]'})[key]||'return result';
    if(index===0) return ({'two-pointers':'left, right = 0, len(nums) - 1','sliding-window':'sum, best = 0, None','binary-search':'lo, hi = 0, len(nums)',bfs:'queue.append(start); distance[start] = 0',backtracking:'dfs(1, 0)',dp:'dp[0] = 0'})[key]||'initialize()';
    if(key==='two-pointers') return frame.explanation.includes('left 改為')?'left += 1':'right -= 1';
    if(key==='binary-search') return frame.explanation.includes('lo = mid')?'lo = mid + 1':'hi = mid';
    if(key==='sliding-window') return frame.explanation.startsWith('移除')?'sum += entering - leaving':'sum += nums[right]';
    if(key==='bfs') return frame.explanation.startsWith('從佇列')?'current = queue.popleft()':frame.explanation.includes('首次發現')?'distance[next] = distance[current] + 1; queue.append(next)':'if next in visited: continue';
    if(key==='backtracking') return ({choose:'path.append(i)',undo:'path.pop()',solution:'solutions.append(path.copy())',prune:'return',skip:'dfs(i + 1, total)',visit:'dfs(i, total)',return:'return'})[frame.action]||'return';
    if(key==='dp') return frame.explanation.includes('令 dp[')?'dp[s] = min(dp[s], dp[s - coin] + 1)':'# keep the current best';
    return '';
  }
  function render(container, frame, index, total) {
    container.querySelector('.lab-visual').innerHTML = frame.kind === 'graph' ? graphHTML(frame) : frame.kind === 'backtracking' ? backtrackingHTML(frame) : extraHTML(frame);
    container.querySelector('.lab-vars').innerHTML = Object.entries(frame.vars).map(([key, value]) => `<div><dt>${escape(key)}</dt><dd>${escape(value)}</dd></div>`).join('');
    container.querySelector('.lab-explanation').textContent = frame.explanation;
    container.querySelector('.lab-step').textContent = `${index + 1} / ${total}${frame.done ? ' · 完成' : ''}`;
    container.querySelector('[data-action="prev"]').disabled = index === 0;
    container.querySelector('[data-action="next"]').disabled = index === total - 1;
    const progress=container.querySelector('.lab-progress');
    if(progress){progress.max=String(total-1);progress.value=String(index);progress.setAttribute('aria-valuetext',`第 ${index+1} 步，共 ${total} 步`);}
    const operation=container.querySelector('.lab-operation code');
    if(operation) operation.textContent=operationFor(container.dataset.lab,frame,index);
    container.dataset.step = String(index);
    container.dataset.done = String(!!frame.done);
  }
  const mounts = new WeakMap();
  function mount(container) {
    if(mounts.has(container)) return mounts.get(container);
    const key = container.dataset.lab;
    let frames = [], position = 0, timer = null, playing = false;
    const form = container.querySelector('form'),error = container.querySelector('.lab-error');
    const doc=container.ownerDocument;
    if(container.insertAdjacentHTML && doc) {
      const controls=container.querySelector('.lab-controls');
      controls.insertAdjacentHTML('beforeend',`<button type="button" data-action="play">播放</button><label class="lab-speed-label" for="${container.id}-speed">速度<select class="lab-speed" id="${container.id}-speed"><option value="1600">慢</option><option value="900" selected>中</option><option value="450">快</option></select></label><input class="lab-progress" type="range" min="0" max="1" value="0" step="1" aria-label="步驟進度">`);
      const examples=presets[key]||[];
      form.insertAdjacentHTML('beforebegin','<div class="lab-presets">'+examples.map(([title],i)=>'<button type="button" data-preset="'+i+'">'+escape(title)+'</button>').join('')+'</div>');
      const stage=container.querySelector('.lab-stage'),narrative=doc.createElement('div');
      narrative.className='lab-narrative';
      narrative.append(container.querySelector('.lab-vars'));
      narrative.insertAdjacentHTML('beforeend','<div class="lab-operation"><code></code></div>');
      narrative.append(container.querySelector('.lab-explanation'));
      stage.append(narrative);
      const settings=doc.createElement('details'),summary=doc.createElement('summary');
      settings.className='lab-settings js-only';
      summary.textContent='調整輸入';
      form.before(settings); settings.append(summary,form);
      controls.before(stage); controls.after(settings);
      form.setAttribute('aria-label',(container.querySelector('h3,h4')?.textContent||key)+'輸入');
      error.id=error.id||container.id+'-error';
      form.querySelectorAll('input').forEach(el=>el.setAttribute('aria-describedby',error.id));
    }
    function pause() {
      playing=false;
      if(timer!==null){clearTimeout(timer);timer=null;}
      const button=container.querySelector('[data-action="play"]');
      if(button)button.textContent='播放';
      container.querySelector('.lab-explanation').setAttribute?.('aria-live','polite');
    }
    function draw() {render(container,frames[position],position,frames.length);}
    function tick() {
      if(!playing)return;
      if(doc && (doc.visibilityState==='hidden'||!container.getClientRects().length)){pause();return;}
      if(position>=frames.length-1){pause();return;}
      position++;draw();
      if(position===frames.length-1){pause();return;}
      timer=setTimeout(tick,Number(container.querySelector('.lab-speed')?.value||900));
    }
    function apply() {
      pause();
      const input = Object.fromEntries(Array.from(form.querySelectorAll('input')).map(el => [el.name, el.value]));
      try {
        const candidate = algorithms[key](input);
        frames = candidate; position = 0;
        error.hidden = true; error.textContent = '';
        form.querySelectorAll('input').forEach(el => el.removeAttribute('aria-invalid'));
        draw();
      } catch (reason) {
        error.textContent = reason.message; error.hidden = false;
        form.querySelectorAll('input').forEach(el => el.setAttribute('aria-invalid', 'true'));
        const settings=form.closest?.('.lab-settings');
        if(settings)settings.open=true;
        form.querySelector('input')?.focus?.();
      }
    }
    form.addEventListener('submit', event => { event.preventDefault(); apply(); });
    form.addEventListener('input',()=>{
      error.hidden=true;
      form.querySelectorAll('input').forEach(el=>el.removeAttribute('aria-invalid'));
    });
    container.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{
      const input=presets[key][Number(button.dataset.preset)][1];
      for(const [name,value] of Object.entries(input)) {
        const el=form.querySelector('[name="'+name+'"]');
        if(el) el.value=String(value);
      }
      apply();
    }));
    container.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
      if (!frames.length) return;
      const action=button.dataset.action;
      if(action==='play'){
        if(playing){pause();return;}
        if(position===frames.length-1)position=0;
        playing=true;button.textContent='暫停';
        container.querySelector('.lab-explanation').setAttribute?.('aria-live','off');
        draw();timer=setTimeout(tick,Number(container.querySelector('.lab-speed')?.value||900));return;
      }
      pause();
      if (action === 'next') position = Math.min(frames.length - 1, position + 1);
      if (action === 'prev') position = Math.max(0, position - 1);
      if (action === 'reset') position = 0;
      draw();
    }));
    container.querySelector('.lab-progress')?.addEventListener('input',event=>{pause();position=Number(event.target.value);draw();});
    container.addEventListener('keydown',event=>{
      if(event.isComposing||event.ctrlKey||event.metaKey||event.altKey||/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)||event.target.isContentEditable)return;
      if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
      event.preventDefault();event.stopPropagation();pause();
      position=Math.max(0,Math.min(frames.length-1,position+(event.key==='ArrowRight'?1:-1)));draw();
    });
    doc?.defaultView?.addEventListener('hashchange',pause);
    doc?.addEventListener('course:route',pause);
    doc?.addEventListener('visibilitychange',()=>{if(doc.visibilityState==='hidden')pause();});
    apply();
    const mounted={get frames(){return clone(frames);},get position(){return position;},pause};
    mounts.set(container,mounted);return mounted;
  }
  function init(document) {return Array.from(document.querySelectorAll('[data-lab]')).map(mount);}
  return {algorithms, integer, numbers, parseEdges, parseIntervals, presets, init, render};
});
