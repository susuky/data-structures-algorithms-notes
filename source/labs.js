/* Deterministic algorithm traces. No network, timers, random input, or dependencies. */
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
      frames.push({kind: 'array', values: [...values], markers: right < 0 ? {} : {left, right}, active: values.map((_, i) => i).filter(i => i >= left && i <= right), vars: {left, right, sum, k, '最大總和': best === null ? '尚無完整視窗' : best, '最佳起點': best === null ? '—' : bestLeft}, explanation, done, result: done ? {sum: best, left: bestLeft, right: bestLeft + k - 1} : null});
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
    push(`所有長度 ${k} 的視窗都已處理。最大總和為 ${best}，範圍是索引 ${bestLeft}–${bestLeft + k - 1}。`, true);
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
    let current = null;
    function push(explanation, done = false) {
      frames.push({kind: 'graph', nodes, edges, queue: [...queue], current, distances: {...distances}, parents: {...parents}, order: [...order], vars: {'目前節點': current || '—', '佇列（左端先出）': queue.join(' → ') || '空', '已出列': order.join(' → ') || '—', '已發現': nodes.filter(n => distances[n] !== null).length}, explanation, done, result: done ? {...distances} : null});
    }
    push(`將起點 ${start} 入列，同時設距離 0、標記已發現。此後只有尚未發現的鄰居可以入列。`);
    while (queue.length) {
      current = queue.shift();
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
  const algorithms = {'two-pointers': twoPointers, 'sliding-window': slidingWindow, 'binary-search': binarySearch, bfs, backtracking, dp};
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
    if (frame.kind === 'dp') result += '<p class="visual-legend">索引是總額；方格內是最少硬幣數。∞ = 目前不可行。</p>';
    else if (frame.sentinel) result += '<p class="visual-legend">深色方格 = 仍需檢查的 [lo, hi)；淡色 = 已排除。尾端只有位置，不能讀值。</p>';
    else result += '<p class="visual-legend">深色方格 = 目前比較元素或視窗；上方是指標，下方是索引。</p>';
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
    svg += '</svg></div><div class="queue-view"><strong>佇列</strong><span class="queue-start">先出 →</span>' + (frame.queue.length ? frame.queue.map(n => `<span class="queue-node">${n}</span>`).join('') : '<span class="queue-empty">空</span>') + '</div><p class="visual-legend">粗虛線圈 = 目前處理；深色 = 已發現；深色邊 = 首次發現時的父節點邊。距離另列於下方。</p><div class="distance-list">';
    svg += frame.nodes.map(n => `<span><strong>${n}</strong> ${display(frame.distances[n])}</span>`).join('') + '</div>';
    return svg;
  }
  function backtrackingHTML(frame) {
    const actionNames = {visit: '進入狀態', choose: '選擇', skip: '不選', undo: '撤銷', solution: '保存答案', prune: '剪枝', return: '返回', done: '完成'};
    return `<div class="backtrack-state"><div class="decision-label">${actionNames[frame.action]}</div><div class="decision-trail"><strong>決策路徑</strong><span>${frame.decisions.length ? frame.decisions.map(escape).join(' → ') : '根節點'}</span></div><div class="path-view"><strong>path</strong>${frame.path.length ? frame.path.map(n => `<span class="path-node">${n}</span>`).join('') : '<span class="path-empty">[ ] 空集合</span>'}</div><div class="candidate-view"><strong>下一個</strong>${Array.from({length: frame.n}, (_, i) => `<span class="candidate${i + 1 === frame.i ? ' current' : ''}${i + 1 < frame.i ? ' past' : ''}">${i + 1}</span>`).join('')}</div><div class="solutions-view"><strong>已保存答案</strong><p>${frame.solutions.length ? frame.solutions.map(s => '[' + s.join(', ') + ']').join('　') : '還沒有；每一條分支都值得確認。'}</p></div></div>`;
  }
  function render(container, frame, index, total) {
    container.querySelector('.lab-visual').innerHTML = frame.kind === 'graph' ? graphHTML(frame) : frame.kind === 'backtracking' ? backtrackingHTML(frame) : arrayHTML(frame);
    container.querySelector('.lab-vars').innerHTML = Object.entries(frame.vars).map(([key, value]) => `<div><dt>${escape(key)}</dt><dd>${escape(value)}</dd></div>`).join('');
    container.querySelector('.lab-explanation').textContent = frame.explanation;
    container.querySelector('.lab-step').textContent = `步驟 ${index + 1} / ${total}${frame.done ? ' · 已完成' : ''}`;
    container.querySelector('[data-action="prev"]').disabled = index === 0;
    container.querySelector('[data-action="next"]').disabled = index === total - 1;
    container.dataset.step = String(index);
    container.dataset.done = String(!!frame.done);
  }
  function mount(container) {
    const key = container.dataset.lab;
    let frames = [], position = 0;
    const form = container.querySelector('form');
    const error = container.querySelector('.lab-error');
    function apply() {
      const input = Object.fromEntries(Array.from(form.querySelectorAll('input')).map(el => [el.name, el.value]));
      try {
        const candidate = algorithms[key](input);
        frames = candidate; position = 0;
        error.hidden = true; error.textContent = '';
        form.querySelectorAll('input').forEach(el => el.removeAttribute('aria-invalid'));
        render(container, frames[position], position, frames.length);
      } catch (reason) {
        error.textContent = reason.message + ' 畫面保留上一組有效輸入的步驟。'; error.hidden = false;
        // The array/relationship may be invalid rather than one isolated field.
        form.querySelectorAll('input').forEach(el => el.setAttribute('aria-invalid', 'true'));
      }
    }
    form.addEventListener('submit', event => { event.preventDefault(); apply(); });
    container.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
      if (!frames.length) return;
      if (button.dataset.action === 'next') position = Math.min(frames.length - 1, position + 1);
      if (button.dataset.action === 'prev') position = Math.max(0, position - 1);
      if (button.dataset.action === 'reset') position = 0;
      render(container, frames[position], position, frames.length);
    }));
    apply();
    return {get frames() {return clone(frames);}, get position() {return position;}};
  }
  function init(document) {return Array.from(document.querySelectorAll('[data-lab]')).map(mount);}
  return {algorithms, integer, numbers, parseEdges, init, render};
});
