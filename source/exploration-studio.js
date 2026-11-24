(function (root, factory) {
  'use strict';
  const studio = factory();
  if (typeof module === 'object' && module.exports) module.exports = studio;
  else {
    root.ExplorationStudio = studio;
    const mountAll = () => root.document.querySelectorAll('[data-exploration-studio]').forEach(element => studio.mount(element));
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', mountAll, { once: true });
    else mountAll();
  }
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';

  const MODES = {
    sort: { label: '排序', title: '同一串數字，兩種排法', icon: 'sort' },
    path: { label: '最短路徑', title: '走得最少步，還是花費最低？', icon: 'path' },
    search: { label: '二分搜尋', title: '把搜尋範圍砍半', icon: 'search' },
    heap: { label: '最小堆', title: '最小值怎麼浮到堆頂？', icon: 'heap' },
    bst: { label: 'BST / AVL', title: '同樣的插入順序，樹高差多少？', icon: 'bst' },
    hash: { label: '雜湊表', title: '發生碰撞時，資料往哪裡放？', icon: 'hash' }
  };
  const SORT_NAMES = { insertion: '插入排序', selection: '選擇排序', bubble: '氣泡排序' };
  const SORT_PRESETS = {
    mixed: { label: '混合', values: [38, 16, 54, 27, 46, 12, 33, 22] },
    nearly: { label: '幾乎有序', values: [12, 19, 25, 32, 43, 38, 51, 60] },
    reverse: { label: '反向', values: [56, 49, 42, 35, 28, 21, 14, 7] },
    equal: { label: '重複值', values: [44, 44, 12, 32, 32, 20] }
  };
  const SEARCH_PRESETS = {
    equal: { label: '重複值', values: [3, 8, 14, 21, 21, 21, 32, 40, 48, 56, 67], target: 21 },
    gap: { label: '落在兩值之間', values: [-18, -7, 0, 5, 12, 19, 23, 31, 49], target: 20 },
    edge: { label: '超過上界', values: [2, 6, 12, 17, 25, 39, 50], target: 59 }
  };
  const HEAP_PRESETS = {
    grow: { label: '上浮', values: [12, 24, 16, 40, 31, 28, 22], input: 5 },
    sink: { label: '下沉', values: [4, 10, 6, 20, 15, 9, 38], input: 7 },
    empty: { label: '空堆', values: [], input: 8 }
  };
  const PATH_PRESETS = { weighted: '高費用捷徑', maze: '有牆的迷宮', empty: '空白地圖' };
  const BST_PRESETS = {
    skew: { label: '遞增失衡', values: [10, 20, 30, 40, 50], input: 60 },
    lr: { label: 'LR 雙旋', values: [30, 10], input: 20 },
    balanced: { label: '平衡分布', values: [30, 15, 45, 8, 22, 38, 52], input: 25 }
  };
  const HASH_PRESETS = {
    collision: { label: '同餘碰撞', values: [7, 14, 21, 28], capacity: 7, input: 35 },
    cluster: { label: '線性聚集', values: [10, 17, 24, 11], capacity: 7, input: 18 },
    spread: { label: '分散均勻', values: [12, 5, 19, 3], capacity: 7, input: 27 }
  };
  const ROWS = 5;
  const COLS = 9;

  function sortTrace(values, algorithm) {
    const items = values.map((value, original) => ({ value, original }));
    const sorted = new Set();
    const trace = [];
    let comparisons = 0;
    let swaps = 0;
    function frame(note, phase = 'ready', active = []) {
      trace.push({
        values: items.map(item => item.value), origins: items.map(item => item.original),
        sorted: [...sorted], active, note, phase, comparisons, swaps
      });
    }
    function compare(a, b) {
      comparisons++;
      frame(`比較 ${items[a].value} 和 ${items[b].value}。`, 'compare', [a, b]);
      return items[a].value - items[b].value;
    }
    function swap(a, b, note) {
      [items[a], items[b]] = [items[b], items[a]];
      swaps++;
      frame(note, 'swap', [a, b]);
    }
    frame({
      insertion: '左側逐漸形成有序區。新值從右邊插入。',
      selection: '每輪找出未排序區的最小值，放到最左邊。',
      bubble: '逐對比較相鄰值。每輪把最大值推到最右邊。'
    }[algorithm]);
    if (algorithm === 'insertion') {
      if (items.length) sorted.add(0);
      for (let index = 1; index < items.length; index++) {
        let cursor = index;
        while (cursor > 0 && compare(cursor - 1, cursor) > 0) {
          const value = items[cursor].value;
          swap(cursor - 1, cursor, `${value} 向左一格，繼續找插入位置。`);
          cursor--;
        }
        sorted.add(index);
        frame(`索引 0 到 ${index} 已經有序。`, 'settle');
      }
    } else if (algorithm === 'selection') {
      for (let index = 0; index < items.length - 1; index++) {
        let smallest = index;
        for (let cursor = index + 1; cursor < items.length; cursor++) {
          if (compare(smallest, cursor) > 0) {
            smallest = cursor;
            frame(`目前最小值是 ${items[smallest].value}。`, 'candidate', [smallest]);
          }
        }
        if (index !== smallest) swap(index, smallest, `把最小值 ${items[smallest].value} 放到索引 ${index}。`);
        sorted.add(index);
        frame(`索引 ${index} 已經定位。`, 'settle');
      }
    } else {
      for (let end = items.length - 1; end > 0; end--) {
        let swapped = false;
        for (let index = 0; index < end; index++) {
          if (compare(index, index + 1) > 0) {
            swap(index, index + 1, '相鄰值交換，大的往右。');
            swapped = true;
          }
        }
        sorted.add(end);
        frame(swapped ? `索引 ${end} 已經定位。` : '這一輪沒有發生交換，可以結束排序。', 'settle');
        if (!swapped) break;
      }
    }
    items.forEach((_, index) => sorted.add(index));
    frame('排序完成。', 'done');
    return trace;
  }

  function pathBoard(preset) {
    const terrain = Array(ROWS * COLS).fill(1);
    const start = 2 * COLS + 1;
    const goal = 2 * COLS + 7;
    if (preset === 'weighted') {
      [2, 4, 7, 27, 29, 32, 34, 40, 43].forEach(index => { terrain[index] = 0; });
      for (let index = start + 1; index < goal; index++) terrain[index] = 5;
    } else if (preset === 'maze') {
      [3, 6, 12, 15, 21, 30, 33, 39].forEach(index => { terrain[index] = 0; });
    }
    return { terrain, start, goal };
  }

  function pathTrace({ terrain, start, goal }, weighted) {
    const trace = [];
    const frontier = [start];
    const visited = new Set();
    const predecessor = Array(terrain.length).fill(-1);
    const distance = Array(terrain.length).fill(Infinity);
    distance[start] = 0;
    function record(current = -1, route = [], done = false) {
      trace.push({ current, frontier: frontier.slice(), visited: [...visited], distance: distance.slice(), route, done,
        cost: route.length ? route.slice(1).reduce((sum, index) => sum + terrain[index], 0) : null });
    }
    record();
    while (frontier.length) {
      const cursor = weighted ? frontier.reduce(
        (best, index, position) => distance[index] < distance[frontier[best]] ? position : best, 0
      ) : 0;
      const [node] = frontier.splice(cursor, 1);
      visited.add(node);
      if (node === goal) {
        const route = [];
        for (let index = goal; index !== -1; index = predecessor[index]) route.push(index);
        record(node, route.reverse(), true);
        return trace;
      }
      const col = node % COLS;
      const neighbors = [
        col < COLS - 1 ? node + 1 : -1,
        node >= COLS ? node - COLS : -1,
        node < terrain.length - COLS ? node + COLS : -1,
        col > 0 ? node - 1 : -1
      ];
      for (const index of neighbors) {
        if (index < 0 || !terrain[index] || visited.has(index)) continue;
        const next = distance[node] + (weighted ? terrain[index] : 1);
        if (next >= distance[index]) continue;
        if (distance[index] === Infinity) frontier.push(index);
        distance[index] = next;
        predecessor[index] = node;
      }
      record(node);
    }
    record(-1, [], true);
    return trace;
  }

  function searchTrace(values, target) {
    const trace = [{ left: 0, right: values.length, middle: -1, probes: 0, note: '整列都是候選範圍。' }];
    let left = 0;
    let right = values.length;
    let probes = 0;
    while (left < right) {
      const middle = Math.floor((left + right) / 2);
      const value = values[middle];
      const note = value < target ? `${value} < ${target}，左界移到 M + 1。` :
        value === target ? `${value} = ${target}，右界移到 M，繼續找第一筆。` :
        `${value} > ${target}，右界移到 M。`;
      trace.push({ left, right, middle, probes: ++probes, note });
      if (value < target) left = middle + 1;
      else right = middle;
    }
    const match = values[left] === target;
    trace.push({ left, right, middle: -1, probes, done: true, match,
      note: match ? `第一筆 ${target} 位於索引 ${left}。` : `找不到 ${target}。插入索引 ${left} 可維持有序。` });
    return trace;
  }

  function heapTrace(values, operation, value) {
    const heap = values.slice();
    const trace = [];
    let removed = null;
    let swaps = 0;
    function frame(note, active = [], done = false) {
      trace.push({ values: heap.slice(), active, removed, swaps, note, done });
    }
    frame(heap.length ? '每個父節點都小於或等於子節點，最小值在堆頂。' : '堆是空的。插入的第一個值會成為堆頂。');
    if (operation === 'insert') {
      heap.push(value);
      let child = heap.length - 1;
      frame(`把 ${value} 放在陣列尾端，對照它的父節點。`, [child]);
      while (child > 0) {
        const parent = Math.floor((child - 1) / 2);
        if (heap[parent] <= heap[child]) {
          frame(`父節點 ${heap[parent]} ≤ ${heap[child]}，上浮結束。`, [parent, child]);
          break;
        }
        const parentValue = heap[parent];
        [heap[parent], heap[child]] = [heap[child], heap[parent]];
        swaps++;
        frame(`${value} < ${parentValue}，和父節點交換。`, [parent, child]);
        child = parent;
      }
    } else if (operation === 'remove' && heap.length) {
      removed = heap[0];
      const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let parent = 0;
        frame(`取出 ${removed}，把尾端的 ${last} 搬到堆頂。`, [parent]);
        while (parent * 2 + 1 < heap.length) {
          const left = parent * 2 + 1;
          const right = left + 1;
          const smallest = right < heap.length && heap[right] < heap[left] ? right : left;
          if (heap[parent] <= heap[smallest]) {
            frame(`${heap[parent]} ≤ 較小的子節點 ${heap[smallest]}，下沉結束。`, [parent, smallest]);
            break;
          }
          const childValue = heap[smallest];
          [heap[parent], heap[smallest]] = [heap[smallest], heap[parent]];
          swaps++;
          frame(`${last} > ${childValue}，和較小的子節點交換。`, [parent, smallest]);
          parent = smallest;
        }
      }
    }
    if (operation) frame(heap.length ? `堆頂是 ${heap[0]}，所有父子關係都已符合堆序。` : '堆現在是空的。', [], true);
    return trace;
  }

  function cloneTree(node) {
    return node ? { key: node.key, left: cloneTree(node.left), right: cloneTree(node.right), height: node.height } : null;
  }
  const treeHeight = node => (node ? node.height : 0);
  const balanceFactor = node => (node ? treeHeight(node.left) - treeHeight(node.right) : 0);
  function refreshTree(node) {
    if (!node) return null;
    node.height = 1 + Math.max(treeHeight(node.left), treeHeight(node.right));
    return node;
  }
  function rotateRight(y) {
    const x = y.left;
    y.left = x.right;
    x.right = y;
    refreshTree(y);
    return refreshTree(x);
  }
  function rotateLeft(x) {
    const y = x.right;
    x.right = y.left;
    y.left = x;
    refreshTree(x);
    return refreshTree(y);
  }
  function balanceNode(node) {
    refreshTree(node);
    const bf = balanceFactor(node);
    if (bf > 1) {
      if (balanceFactor(node.left) < 0) node.left = rotateLeft(node.left);
      return rotateRight(node);
    }
    if (bf < -1) {
      if (balanceFactor(node.right) > 0) node.right = rotateRight(node.right);
      return rotateLeft(node);
    }
    return node;
  }
  function insertSilent(node, key, avl) {
    if (!node) return { key, left: null, right: null, height: 1 };
    if (key < node.key) node.left = insertSilent(node.left, key, avl);
    else if (key > node.key) node.right = insertSilent(node.right, key, avl);
    return avl ? balanceNode(node) : refreshTree(node);
  }
  function countTreeNodes(node) {
    return node ? 1 + countTreeNodes(node.left) + countTreeNodes(node.right) : 0;
  }
  function layoutBst(root, activeKeys = [], rotatedKeys = []) {
    const list = [];
    const edges = [];
    const inorder = [];
    let maxDepth = 0;
    function walkOrder(node, depth) {
      if (!node) return;
      maxDepth = Math.max(maxDepth, depth);
      walkOrder(node.left, depth + 1);
      inorder.push({ node, depth, rank: inorder.length });
      walkOrder(node.right, depth + 1);
    }
    walkOrder(root, 0);
    const total = inorder.length;
    const pos = new Map();
    inorder.forEach(({ node, depth, rank }) => {
      const x = total === 1 ? 50 : 9 + rank * 82 / (total - 1);
      const y = maxDepth === 0 ? 50 : 12 + depth * 76 / maxDepth;
      const state = rotatedKeys.includes(node.key) ? 'rotated' : activeKeys.includes(node.key) ? 'active' : '';
      pos.set(node.key, { x, y });
      list.push({ key: node.key, x, y, depth, bf: balanceFactor(node), state });
    });
    function walkEdges(node) {
      if (!node) return;
      const from = pos.get(node.key);
      for (const child of [node.left, node.right]) {
        if (!child) continue;
        const to = pos.get(child.key);
        const active = (activeKeys.includes(node.key) && activeKeys.includes(child.key)) ||
          (rotatedKeys.includes(node.key) && rotatedKeys.includes(child.key));
        edges.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, active });
        walkEdges(child);
      }
    }
    walkEdges(root);
    return { nodes: list, edges, values: inorder.map(item => item.node.key), height: treeHeight(root) };
  }

  function bstTrace(input, mode = 'bst', operation = 'idle', target) {
    const avl = mode === 'avl';
    let root = null;
    if (Array.isArray(input)) {
      for (const value of input) root = insertSilent(root, value, avl);
    } else if (input) {
      root = cloneTree(input);
    }
    const trace = [];
    let comparisons = 0;
    let rotations = 0;
    function snapshot(note, activeKeys = [], rotatedKeys = [], done = false, found = null) {
      const layout = layoutBst(root, activeKeys, rotatedKeys);
      trace.push({
        ...layout,
        tree: cloneTree(root),
        comparisons,
        rotations,
        note,
        done,
        found
      });
    }
    snapshot(root
      ? `${avl ? 'AVL 樹' : '普通 BST'} 目前高度 ${treeHeight(root)}，中序走訪必由小到大排列。`
      : '樹是空的。插入第一個數值就會成為樹根。', [], [], !operation || operation === 'idle');
    if (!operation || operation === 'idle') return trace;

    if (operation === 'insert') {
      if (!root) {
        root = { key: target, left: null, right: null, height: 1 };
        snapshot(`插入 ${target} 作為樹根。`, [target], [], true);
        return trace;
      }
      if (countTreeNodes(root) >= 15) {
        snapshot('最多示範 15 個節點，先刪掉幾個再插入。', [], [], true);
        return trace;
      }
      const path = [];
      let cursor = root;
      let duplicate = false;
      while (cursor) {
        comparisons++;
        path.push(cursor);
        if (target === cursor.key) {
          snapshot(`${target} 已經在樹裡，不重複插入。`, path.map(n => n.key), [], true);
          duplicate = true;
          break;
        }
        const goLeft = target < cursor.key;
        snapshot(`${target} ${goLeft ? '<' : '>'} ${cursor.key}，往${goLeft ? '左' : '右'}子樹找空位。`, path.map(n => n.key));
        const next = goLeft ? cursor.left : cursor.right;
        if (!next) {
          const leaf = { key: target, left: null, right: null, height: 1 };
          if (goLeft) cursor.left = leaf;
          else cursor.right = leaf;
          path.push(leaf);
          for (let i = path.length - 1; i >= 0; i--) refreshTree(path[i]);
          snapshot(`把 ${target} 接在 ${cursor.key} 的${goLeft ? '左' : '右'}邊。`, [cursor.key, target]);
          break;
        }
        cursor = next;
      }
      if (duplicate) return trace;
      if (avl) {
        for (let i = path.length - 2; i >= 0; i--) {
          const node = path[i];
          refreshTree(node);
          const bf = balanceFactor(node);
          if (Math.abs(bf) <= 1) continue;
          const replaceInParent = updated => {
            if (i === 0) root = updated;
            else if (path[i - 1].left === node) path[i - 1].left = updated;
            else path[i - 1].right = updated;
          };
          if (bf > 1) {
            if (balanceFactor(node.left) < 0) {
              const childKey = node.left.key;
              node.left = rotateLeft(node.left);
              rotations++;
              snapshot(`${node.key} 左邊過深（BF=${bf}）且是 LR 折彎，先左旋子節點 ${childKey}。`, [], [childKey, node.left.key]);
            }
            const oldKey = node.key;
            const rotated = rotateRight(node);
            replaceInParent(rotated);
            rotations++;
            snapshot(`右旋 ${oldKey}，讓 ${rotated.key} 升上來恢復平衡。`, [], [rotated.key, oldKey]);
          } else {
            if (balanceFactor(node.right) > 0) {
              const childKey = node.right.key;
              node.right = rotateRight(node.right);
              rotations++;
              snapshot(`${node.key} 右邊過深（BF=${bf}）且是 RL 折彎，先右旋子節點 ${childKey}。`, [], [childKey, node.right.key]);
            }
            const oldKey = node.key;
            const rotated = rotateLeft(node);
            replaceInParent(rotated);
            rotations++;
            snapshot(`左旋 ${oldKey}，讓 ${rotated.key} 升上來恢復平衡。`, [], [rotated.key, oldKey]);
          }
          for (let j = i - 1; j >= 0; j--) refreshTree(path[j]);
        }
      }
      snapshot(`完成插入 ${target}，目前樹高 ${treeHeight(root)}。`, [target], [], true);
      return trace;
    }

    if (operation === 'search') {
      let cursor = root;
      const visited = [];
      while (cursor) {
        comparisons++;
        visited.push(cursor.key);
        if (target === cursor.key) {
          snapshot(`找到 ${target}（共比較 ${comparisons} 次）。`, visited, [], true, true);
          return trace;
        }
        const goLeft = target < cursor.key;
        snapshot(`${target} ${goLeft ? '<' : '>'} ${cursor.key}，往${goLeft ? '左' : '右'}找。`, visited);
        cursor = goLeft ? cursor.left : cursor.right;
      }
      snapshot(`走到空位，樹裡沒有 ${target}（比較 ${comparisons} 次）。`, visited, [], true, false);
      return trace;
    }

    if (operation === 'delete') {
      function removeNode(node, key) {
        if (!node) return { node: null, removed: false };
        comparisons++;
        if (key < node.key) {
          snapshot(`${key} < ${node.key}，往左找要刪除的節點。`, [node.key]);
          const res = removeNode(node.left, key);
          node.left = res.node;
          if (!res.removed) return { node, removed: false };
        } else if (key > node.key) {
          snapshot(`${key} > ${node.key}，往右找要刪除的節點。`, [node.key]);
          const res = removeNode(node.right, key);
          node.right = res.node;
          if (!res.removed) return { node, removed: false };
        } else {
          if (!node.left || !node.right) {
            const replacement = node.left || node.right;
            snapshot(replacement ? `刪除 ${key}，由子節點 ${replacement.key} 接手。` : `刪除葉節點 ${key}。`, [key]);
            return { node: replacement, removed: true };
          }
          let succ = node.right;
          while (succ.left) succ = succ.left;
          snapshot(`${key} 有兩個子節點，改用右子樹最小值 ${succ.key} 補位。`, [key, succ.key]);
          node.key = succ.key;
          const res = removeNode(node.right, succ.key);
          node.right = res.node;
        }
        refreshTree(node);
        if (avl && Math.abs(balanceFactor(node)) > 1) {
          const oldKey = node.key;
          node = balanceNode(node);
          rotations++;
          snapshot(`刪除後 ${oldKey} 失衡，旋轉重新平衡。`, [], [node.key, oldKey]);
        }
        return { node, removed: true };
      }
      const outcome = removeNode(root, target);
      root = outcome.node;
      snapshot(outcome.removed ? `已刪除 ${target}，目前樹高 ${treeHeight(root)}。` : `樹裡沒有 ${target}，結構不變。`, [], [], true, outcome.removed);
    }
    return trace;
  }

  function hashSlotIndex(key, capacity) {
    return ((key % capacity) + capacity) % capacity;
  }

  function hashTrace(input, capacity = 7, strategy = 'chaining', operation = 'idle', key) {
    const probing = strategy === 'probing';
    const isSnapshot = Array.isArray(input) && input.some(item => Array.isArray(item) || item === null || (item && typeof item === 'object' && 'state' in item));
    let buckets;
    if (!isSnapshot) {
      buckets = Array.from({ length: capacity }, () => (probing ? null : []));
      for (const item of input) {
        const slot = hashSlotIndex(item, capacity);
        if (!probing) {
          if (!buckets[slot].includes(item)) buckets[slot].push(item);
        } else {
          for (let step = 0; step < capacity; step++) {
            const pos = (slot + step) % capacity;
            if (buckets[pos] === null || buckets[pos].key === item) {
              buckets[pos] = { key: item, state: 'occupied' };
              break;
            }
          }
        }
      }
    } else {
      buckets = probing
        ? input.map(cell => (cell ? { ...cell } : null))
        : input.map(chain => chain.slice());
    }

    const trace = [];
    let probes = 0;
    const countItems = () => (probing ? buckets.filter(c => c && c.state === 'occupied').length : buckets.reduce((sum, c) => sum + c.length, 0));
    function snap(note, activeSlot = -1, path = [], done = false, found = null) {
      const count = countItems();
      trace.push({
        buckets: probing ? buckets.map(c => (c ? { ...c } : null)) : buckets.map(c => c.slice()),
        capacity,
        strategy,
        count,
        loadFactor: (count / capacity).toFixed(2),
        probes,
        activeSlot,
        path: path.slice(),
        hashSlot: key === undefined ? -1 : hashSlotIndex(key, capacity),
        done,
        found,
        note
      });
    }

    const initialCount = countItems();
    snap(
      `雜湊函數 h(k) = k mod ${capacity}，目前共 ${initialCount} 筆（負載因子 α = ${(initialCount / capacity).toFixed(2)}）。`,
      -1,
      [],
      !operation || operation === 'idle'
    );
    if (!operation || operation === 'idle') return trace;

    const slot = hashSlotIndex(key, capacity);
    snap(`先算桶位：h(${key}) = ${key} mod ${capacity} = ${slot}。`, slot, [slot]);

    if (!probing) {
      const chain = buckets[slot];
      for (let i = 0; i < chain.length; i++) {
        probes++;
        if (chain[i] === key) {
          if (operation === 'insert') {
            snap(`桶 ${slot} 裡已經有 ${key}，不重複放入。`, slot, [slot], true, true);
          } else if (operation === 'search') {
            snap(`在桶 ${slot} 第 ${i + 1} 個位置找到 ${key}（檢查 ${probes} 次）。`, slot, [slot], true, true);
          } else {
            chain.splice(i, 1);
            snap(`從桶 ${slot} 移除了 ${key}。`, slot, [slot], true, true);
          }
          return trace;
        }
        snap(`比對桶 ${slot} 第 ${i + 1} 格的 ${chain[i]}，繼續往後找。`, slot, [slot]);
      }
      if (operation === 'insert') {
        chain.push(key);
        snap(`把 ${key} 接到桶 ${slot} 的尾端（目前鏈長 ${chain.length}）。`, slot, [slot], true, true);
      } else {
        snap(`桶 ${slot} 走到鏈尾都沒有 ${key}。`, slot, [slot], true, false);
      }
      return trace;
    }

    const path = [];
    let firstTombstone = -1;
    for (let step = 0; step < capacity; step++) {
      const pos = (slot + step) % capacity;
      const cell = buckets[pos];
      probes++;
      path.push(pos);
      if (cell === null) {
        if (operation === 'insert') {
          const targetSlot = firstTombstone !== -1 ? firstTombstone : pos;
          buckets[targetSlot] = { key, state: 'occupied' };
          snap(
            firstTombstone !== -1
              ? `確認沒有重複後，把 ${key} 放進先前記住的刪除格 ${targetSlot}。`
              : `第 ${pos} 格是空的，直接放入 ${key}。`,
            targetSlot,
            path,
            true,
            true
          );
        } else {
          snap(`探測到空格 ${pos}，表示表裡沒有 ${key}。`, pos, path, true, false);
        }
        return trace;
      }
      if (cell.state === 'tombstone') {
        if (firstTombstone === -1) firstTombstone = pos;
        snap(`第 ${pos} 格是刪除標記 ✕，不能停下來，繼續往下一格找。`, pos, path);
        continue;
      }
      if (cell.key === key) {
        if (operation === 'insert') {
          snap(`第 ${pos} 格已經存著 ${key}，不重複放入。`, pos, path, true, true);
        } else if (operation === 'search') {
          snap(`在第 ${pos} 格找到 ${key}（共探測 ${probes} 次）。`, pos, path, true, true);
        } else {
          buckets[pos] = { key: null, state: 'tombstone' };
          snap(`把第 ${pos} 格標成刪除標記 ✕，後面的碰撞鍵才找得到路。`, pos, path, true, true);
        }
        return trace;
      }
      snap(`第 ${pos} 格被 ${cell.key} 佔住了，線性往下一格 ${(pos + 1) % capacity} 探測。`, pos, path);
    }
    if (operation === 'insert' && firstTombstone !== -1) {
      buckets[firstTombstone] = { key, state: 'occupied' };
      snap(`繞一圈沒看到重複鍵，把 ${key} 放進刪除標記格 ${firstTombstone}。`, firstTombstone, path, true, true);
    } else if (operation === 'insert') {
      snap(`表已滿（${capacity} / ${capacity}），放不下 ${key} 了。`, -1, path, true, false);
    } else {
      snap(`繞完 ${capacity} 格都沒找到 ${key}。`, -1, path, true, false);
    }
    return trace;
  }

  const ICONS = {
    sort: 'M4 19h16M6 15V9m6 6V4m6 11V7',
    path: 'M4 18h4l4-6h4l4-6M4 18v-4m16-8h-4',
    search: 'M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm4 10 6 6',
    heap: 'M12 5v5m0 0H6v5m6-5h6v5M10 3h4v4h-4zM4 15h4v4H4zm12 0h4v4h-4z',
    bst: 'M12 4v4m0 0-5 5m5-5 5 5M7 13l-3 5m13-5 3 5M10 3h4v4h-4zM5 12h4v4H5zm10 0h4v4h-4z',
    hash: 'M4 5h16M4 12h16M4 19h16M8 5v14M16 5v14',
    prev: 'm14 6-6 6 6 6',
    next: 'm10 6 6 6-6 6',
    restart: 'M4 11a8 8 0 1 1 2 6m-2-2V9h6',
    play: 'm9 5 11 7-11 7z',
    pause: 'M9 5v14m6-14v14'
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;
  const pressed = (node, active) => node.setAttribute('aria-pressed', String(active));
  const disabled = (node, inactive) => node.setAttribute('aria-disabled', String(inactive));
  const presetButtons = presets => Object.entries(presets).map(([key, item]) =>
    `<button type="button" class="exploration-button exploration-chip" data-explore-preset="${key}" aria-pressed="false">${item.label || item}</button>`
  ).join('');
  const resetButton = '<button type="button" class="exploration-button exploration-chip" data-explore-reset>重設</button>';

  function wirePresets(panel, apply, reset) {
    const buttons = Array.from(panel.querySelectorAll('[data-explore-preset]'));
    function paint(selected) {
      buttons.forEach(button => pressed(button, button.dataset.explorePreset === selected));
    }
    buttons.forEach(button => button.addEventListener('click', () => apply(button.dataset.explorePreset)));
    panel.querySelector('[data-explore-reset]').addEventListener('click', reset);
    return paint;
  }

  function legend(items, dark = false) {
    return `<ul class="exploration-legend${dark ? ' exploration-legend-dark' : ''}" aria-label="圖例">${items.map(([state, label]) =>
      `<li><span data-explore-tone="${state}" aria-hidden="true"></span>${label}</li>`
    ).join('')}</ul>`;
  }

  function createPlayer(node, paint, announce, interval) {
    node.innerHTML = `<div class="exploration-player-buttons">
      <button type="button" class="exploration-button exploration-icon-button" data-explore-step="restart" aria-label="回到第一步" title="回到第一步">${icon('restart')}</button>
      <button type="button" class="exploration-button exploration-icon-button" data-explore-step="prev" aria-label="上一步" title="上一步">${icon('prev')}</button>
      <button type="button" class="exploration-button exploration-primary" data-explore-step="play"><span aria-hidden="true">${icon('play')}</span><b>播放</b></button>
      <button type="button" class="exploration-button exploration-icon-button" data-explore-step="next" aria-label="下一步" title="下一步">${icon('next')}</button>
      <button type="button" class="exploration-button exploration-end" data-explore-step="end">看結果</button>
    </div>
    <div class="exploration-timeline">
      <input type="range" min="0" max="0" value="0" aria-label="步驟">
      <span class="exploration-counter" data-explore-position aria-hidden="true">0 / 0</span>
    </div>`;
    const buttons = Object.fromEntries(Array.from(node.querySelectorAll('button')).map(button => [button.dataset.exploreStep, button]));
    const position = node.querySelector('[data-explore-position]');
    const range = node.querySelector('input');
    const view = node.ownerDocument.defaultView;
    let end = 0;
    let step = 0;
    let timer = null;

    function controls() {
      const playing = timer !== null;
      const action = playing ? '暫停' : '播放';
      if (buttons.play.lastElementChild.textContent !== action) {
        buttons.play.firstElementChild.innerHTML = icon(playing ? 'pause' : 'play');
        buttons.play.lastElementChild.textContent = action;
      }
      for (const name of ['restart', 'prev']) disabled(buttons[name], step === 0);
      for (const name of ['next', 'end']) disabled(buttons[name], step === end);
      disabled(buttons.play, end === 0);
      range.max = end;
      range.value = step;
      range.disabled = end === 0;
      range.setAttribute('aria-valuetext', `第 ${step} 步，共 ${end} 步`);
      position.textContent = `${step} / ${end}`;
    }

    function update(speak = false) {
      const note = paint(step);
      controls();
      if (speak && note) announce(note);
    }

    function stop() {
      if (timer !== null) view.clearInterval(timer);
      timer = null;
      controls();
    }

    function jump(next, speak = true) {
      stop();
      step = Math.max(0, Math.min(end, next));
      update(speak);
    }

    function play() {
      if (!end || timer !== null) return;
      if (step === end) step = 0;
      timer = view.setInterval(() => {
        step++;
        if (step >= end) stop();
        update(step === end);
      }, interval);
      update();
    }

    buttons.play.addEventListener('click', () => timer === null ? play() : stop());
    for (const [name, next] of Object.entries({ restart: () => 0, prev: () => step - 1, next: () => step + 1, end: () => end })) {
      buttons[name].addEventListener('click', () => {
        if (buttons[name].getAttribute('aria-disabled') !== 'true') jump(next());
      });
    }
    range.addEventListener('input', () => jump(Number(range.value)));
    return {
      stop, play, redraw: () => update(),
      setLength(length, first = 0) {
        end = length - 1;
        jump(first, false);
      }
    };
  }

  function readNumbers(text) {
    const terms = text.trim().split(/\s*[,，]\s*|\s+/);
    const values = terms.map(Number);
    return terms.length >= 2 && terms.length <= 12 &&
      terms.every((value, index) => /^[+-]?\d+$/.test(value) && Math.abs(values[index]) <= 99) ? values : null;
  }

  function duplicates(values) {
    return values.map((value, index) => values.indexOf(value) === values.lastIndexOf(value)
      ? '' : String.fromCharCode(97 + values.slice(0, index).filter(other => other === value).length));
  }

  function chartBars(node, frame, tags, min, max) {
    const span = max - min || 1;
    const zero = max === min ? 100 : max * 100 / span;
    node.style.setProperty('--exploration-count', frame.values.length);
    node.style.setProperty('--exploration-zero', zero + '%');
    node.setAttribute('aria-label', frame.values.map((value, index) =>
      value + tags[frame.origins[index]] + (frame.active.includes(index) ? '・目前操作' : frame.sorted.includes(index) ? '・有序' : '')
    ).join('，'));
    node.innerHTML = frame.values.map((value, index) => {
      const state = frame.active.includes(index) ? 'active' : frame.sorted.includes(index) ? 'settled' : 'quiet';
      const top = value < 0 ? zero : Math.max(0, zero - value * 100 / span);
      const size = Math.abs(value) * 100 / span;
      const tag = tags[frame.origins[index]];
      return `<li data-value="${value}" data-explore-bar="${state}"><span class="exploration-bar-slot">
        <span class="exploration-bar" style="--exploration-from:${top}%;--exploration-size:${size}%"></span>
      </span><span class="exploration-bar-label">${value}${tag ? `<sup>${tag}</sup>` : ''}</span></li>`;
    }).join('');
  }

  function mountSort(panel, { id, announce, reducedMotion }) {
    const renderTrack = (track, side) => `<div class="exploration-sort-card" data-explore-sort-track="${track}">
      <label class="exploration-track-heading"><span>${side}</span>
        <select class="exploration-input" aria-label="演算法 ${side}" data-explore-sort-algorithm="${track}">
          ${Object.entries(SORT_NAMES).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}
        </select>
      </label>
      <ol class="exploration-bars exploration-dark" role="img"></ol>
      <div class="exploration-track-metrics">
        <span>比較 <b data-explore-comparisons>0</b></span>
        <span>交換 <b data-explore-swaps>0</b></span>
      </div>
      <p class="exploration-track-note"></p>
    </div>`;
    panel.innerHTML = `<div class="exploration-mode-heading"><h4>${MODES.sort.title}</h4>
      <button type="button" class="exploration-button exploration-chip" data-explore-sort-edit>改數列</button>
    </div>
    <div class="exploration-player"></div>
    <div class="exploration-sort-tracks">${renderTrack('left', 'A')}${renderTrack('right', 'B')}</div>
    ${legend([['active', '目前操作'], ['settled', '有序區']])}
    <div class="exploration-presets exploration-mode-presets" role="group" aria-label="排序範例">${presetButtons(SORT_PRESETS)}${resetButton}</div>
    <div class="exploration-sort-editor">
      <form class="exploration-array-form" novalidate>
        <label for="${id}-array">數列</label>
        <div><input id="${id}-array" class="exploration-input" data-explore-sort-input type="text" spellcheck="false" autocomplete="off" maxlength="96" aria-describedby="${id}-array-error">
          <button type="submit" class="exploration-button">更新</button></div>
        <p id="${id}-array-error" class="exploration-error" hidden></p>
      </form>
      <div class="exploration-sort-source">
        <div class="exploration-sort-source-tools">
          <span id="${id}-sort-drag">拖曳換位</span>
          <div role="group" aria-label="移動選定數值">
            <button type="button" class="exploration-button exploration-compact" data-explore-nudge="-1" aria-label="往左移" title="往左移">${icon('prev')}</button>
            <button type="button" class="exploration-button exploration-compact" data-explore-nudge="1" aria-label="往右移" title="往右移">${icon('next')}</button>
          </div>
        </div>
        <div class="exploration-sort-handles" role="group" aria-labelledby="${id}-sort-drag"></div>
      </div>
    </div>`;

    const input = panel.querySelector('[data-explore-sort-input]');
    const error = panel.querySelector('.exploration-error');
    const handles = panel.querySelector('.exploration-sort-handles');
    const nudges = Array.from(panel.querySelectorAll('[data-explore-nudge]'));
    const tracks = Array.from(panel.querySelectorAll('[data-explore-sort-track]')).map(node => ({
      algorithm: node.querySelector('select'), chart: node.querySelector('.exploration-bars'),
      comparisons: node.querySelector('[data-explore-comparisons]'), swaps: node.querySelector('[data-explore-swaps]'),
      note: node.querySelector('.exploration-track-note')
    }));
    const view = panel.ownerDocument.defaultView;
    let values = [];
    let tags = [];
    let selected = 0;
    let preset = 'mixed';
    let drag = null;
    let skipClick = false;
    let min = 0;
    let max = 0;
    tracks[1].algorithm.value = 'selection';

    const player = createPlayer(panel.querySelector('.exploration-player'), step => tracks.map(track => {
      const frame = track.trace[Math.min(step, track.trace.length - 1)];
      chartBars(track.chart, frame, tags, min, max);
      track.comparisons.textContent = frame.comparisons;
      track.swaps.textContent = frame.swaps;
      track.note.textContent = frame.phase === 'done' && tags.some(Boolean)
        ? '排序完成。' + (frame.origins.every((original, index) =>
          index === 0 || frame.values[index - 1] !== frame.values[index] || frame.origins[index - 1] < original)
          ? '等值維持原順序。' : '等值的相對順序改了。')
        : frame.note;
      return `${SORT_NAMES[track.algorithm.value]}，${track.note.textContent} 比較 ${frame.comparisons} 次，交換 ${frame.swaps} 次。`;
    }).join(' '), announce, 300);

    function rebuild() {
      min = Math.min(0, ...values);
      max = Math.max(0, ...values);
      tags = duplicates(values);
      tracks.forEach(track => { track.trace = sortTrace(values, track.algorithm.value); });
      player.setLength(Math.max(...tracks.map(track => track.trace.length)));
    }

    function paintSelection() {
      Array.from(handles.children).forEach((button, index) => {
        button.dataset.exploreSortItem = index;
        button.setAttribute('aria-label', `索引 ${index}，數值 ${values[index]}`);
        pressed(button, index === selected);
      });
      disabled(nudges[0], selected === 0);
      disabled(nudges[1], selected === values.length - 1);
    }

    function clearError() {
      input.removeAttribute('aria-invalid');
      error.hidden = true;
      error.textContent = '';
    }

    function setValues(next) {
      values = next.slice();
      selected = 0;
      handles.style.setProperty('--exploration-count', values.length);
      const largest = Math.max(1, ...values.map(Math.abs));
      handles.innerHTML = values.map(value => `<button type="button" class="exploration-sort-handle"
        style="--exploration-grip-height:${18 + 54 * Math.abs(value) / largest}%"><span>${value}</span></button>`).join('');
      syncValues();
    }

    function syncValues() {
      input.value = values.join(', ');
      clearError();
      paintPresets(preset);
      paintSelection();
      rebuild();
    }

    const applyPreset = key => { preset = key; setValues(SORT_PRESETS[key].values); };
    const paintPresets = wirePresets(panel, applyPreset, () => {
      tracks[0].algorithm.value = 'insertion';
      tracks[1].algorithm.value = 'selection';
      applyPreset('mixed');
      announce('已還原排序數列。');
    });
    panel.querySelector('[data-explore-sort-edit]').addEventListener('click', () => {
      input.scrollIntoView({ block: 'center' });
      input.focus({ preventScroll: true });
    });
    panel.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      const next = readNumbers(input.value);
      if (!next) {
        error.textContent = '輸入 2～12 個 −99 到 99 的整數，以逗號或空格分隔。';
        error.hidden = false;
        input.setAttribute('aria-invalid', 'true');
        announce(error.textContent);
        return;
      }
      preset = '';
      setValues(next);
      announce('已更新數列。');
    });
    input.addEventListener('input', clearError);
    tracks.forEach(track => track.algorithm.addEventListener('change', rebuild));

    function move(from, to, focus = false) {
      if (to < 0 || to >= values.length || from === to) return;
      const children = Array.from(handles.children);
      const previous = children.map(button => button.getBoundingClientRect());
      const item = children[from];
      const anchor = (to < from ? children[to] : children[to + 1]) || null;
      if (typeof handles.moveBefore === 'function') handles.moveBefore(item, anchor);
      else handles.insertBefore(item, anchor);
      const [value] = values.splice(from, 1);
      values.splice(to, 0, value);
      selected = to;
      preset = '';
      syncValues();
      if (focus) {
        item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        item.focus({ preventScroll: true });
      }
      if (!reducedMotion()) {
        children.forEach((button, index) => {
          const shift = previous[index].left - button.getBoundingClientRect().left;
          if (shift) button.animate([{ transform: `translateX(${shift}px)` }, { transform: 'none' }], { duration: 180, easing: 'ease-out' });
        });
      }
      announce(`已把 ${value} 移到索引 ${to}。`, 150);
    }

    handles.addEventListener('click', event => {
      const button = event.target.closest('[data-explore-sort-item]');
      if (!button || skipClick) return;
      selected = Number(button.dataset.exploreSortItem);
      paintSelection();
    });
    handles.addEventListener('keydown', event => {
      const delta = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
      if (!delta || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const from = Number(event.target.dataset.exploreSortItem);
      if (!Number.isInteger(from) || from + delta < 0 || from + delta >= values.length) return;
      event.preventDefault();
      move(from, from + delta, true);
    });
    nudges.forEach(button => button.addEventListener('click', () => move(selected, selected + Number(button.dataset.exploreNudge))));

    handles.addEventListener('pointerdown', event => {
      const handle = event.target.closest('[data-explore-sort-item]');
      if (!handle || drag || event.button !== 0 || !event.isPrimary) return;
      const siblings = Array.from(handles.children);
      siblings.forEach(button => button.getAnimations().forEach(animation => animation.cancel()));
      const index = Number(handle.dataset.exploreSortItem);
      drag = {
        handle, pointer: event.pointerId, start: event.clientX, index, target: index,
        bounds: siblings.map(button => button.getBoundingClientRect()), moved: false
      };
      handle.setPointerCapture(event.pointerId);
    });
    handles.addEventListener('pointermove', event => {
      if (!drag || drag.pointer !== event.pointerId) return;
      const distance = event.clientX - drag.start;
      if (!drag.moved && Math.abs(distance) < 6) return;
      drag.moved = true;
      const centers = drag.bounds.map(rect => (rect.left + rect.right) / 2);
      drag.target = centers.reduce((closest, center, index) =>
        Math.abs(center - event.clientX) < Math.abs(centers[closest] - event.clientX) ? index : closest, 0);
      handles.dataset.dragging = 'true';
      drag.handle.dataset.grabbed = 'true';
      const shift = Math.max(centers[0] - drag.start, Math.min(centers.at(-1) - drag.start, distance));
      drag.handle.style.setProperty('--exploration-drag-x', shift + 'px');
      Array.from(handles.children).forEach((button, index) => {
        if (index === drag.target && index !== drag.index) button.dataset.drop = index < drag.index ? 'before' : 'after';
        else delete button.dataset.drop;
      });
    });
    function finishDrag(event, cancel = false) {
      if (!drag || (event && drag.pointer !== event.pointerId)) return;
      const previous = drag;
      drag = null;
      delete handles.dataset.dragging;
      delete previous.handle.dataset.grabbed;
      previous.handle.style.removeProperty('--exploration-drag-x');
      Array.from(handles.children).forEach(button => { delete button.dataset.drop; });
      if (previous.handle.hasPointerCapture(previous.pointer)) previous.handle.releasePointerCapture(previous.pointer);
      if (!previous.moved) return;
      skipClick = true;
      view.setTimeout(() => { skipClick = false; }, 0);
      if (cancel) announce('已取消移動。');
      else move(previous.index, previous.target, true);
    }
    handles.addEventListener('pointerup', finishDrag);
    handles.addEventListener('pointercancel', event => finishDrag(event, true));
    handles.addEventListener('lostpointercapture', event => finishDrag(event, true));
    panel.addEventListener('keydown', event => {
      if (drag && event.key === 'Escape') {
        event.preventDefault();
        finishDrag(null, true);
      }
    });
    applyPreset(preset);
    return { pause() { finishDrag(null, true); player.stop(); } };
  }

  const TOOLS = {
    wall: { label: '牆', glyph: '■' }, weight: { label: '費用 5', glyph: '◆' },
    start: { label: '起點' }, goal: { label: '終點' },
    erase: { label: '清除', glyph: '×' }
  };
  const PATH_ALGORITHMS = {
    bfs: { label: 'BFS', description: '依步數逐層展開。' },
    dijkstra: { label: 'Dijkstra', description: '取出累計費用最低的格子。' }
  };
  const coordinate = index => `第 ${Math.floor(index / COLS) + 1} 列，第 ${index % COLS + 1} 欄`;
  const endPath = frame => frame.done && !frame.route.length;

  function mountPath(panel, { announce }) {
    const renderStats = key => `<div class="exploration-path-card" data-explore-path-card="${key}"><dl>
      <div><dt>步數</dt><dd data-explore-metric="steps">—</dd></div>
      <div><dt>費用</dt><dd data-explore-metric="cost">—</dd></div>
      <div><dt>處理</dt><dd data-explore-metric="visited">0</dd></div>
    </dl><p>${PATH_ALGORITHMS[key].description}</p></div>`;
    panel.innerHTML = `<div class="exploration-mode-heading"><h4>${MODES.path.title}</h4></div>
    <div class="exploration-path-toolbar">
      <div class="exploration-path-tools" role="group" aria-label="地圖編輯工具">${Object.entries(TOOLS).map(([key, tool]) =>
        `<button type="button" class="exploration-button exploration-chip" data-explore-tool="${key}" aria-pressed="false">${tool.glyph ? `<span aria-hidden="true">${tool.glyph}</span>` : ''}${tool.label}</button>`
      ).join('')}</div>
    </div>
    <div class="exploration-player"></div>
    <div class="exploration-path-layout">
      <div class="exploration-dark exploration-map">
        <div class="exploration-map-views" role="group" aria-label="顯示演算法">${Object.entries(PATH_ALGORITHMS).map(([key, algorithm]) =>
          `<button type="button" class="exploration-button exploration-chip" data-explore-route="${key}" aria-pressed="false">${algorithm.label}</button>`
        ).join('')}</div>
        <div class="exploration-map-canvas">
          <div class="exploration-path-grid" role="grid" aria-label="路徑地圖，方向鍵移動，Enter 或空白鍵編輯" aria-rowcount="${ROWS}" aria-colcount="${COLS}">
            ${Array.from({ length: ROWS }, (_, row) => `<div class="exploration-path-row" role="row">${Array.from({ length: COLS }, (_, col) =>
              `<div role="gridcell"><button type="button" class="exploration-map-tile" tabindex="-1" data-explore-cell="${row * COLS + col}"><span aria-hidden="true"></span></button></div>`
            ).join('')}</div>`).join('')}
          </div>
          <svg class="exploration-map-line" viewBox="0 0 ${COLS * 100} ${ROWS * 100}" preserveAspectRatio="none" aria-hidden="true"><polyline vector-effect="non-scaling-stroke"/></svg>
        </div>
        ${legend([['active', '目前格'], ['frontier', '前緣'], ['visited', '已處理'], ['route', '路徑']], true)}
      </div>
      <div class="exploration-path-stats">
        ${Object.entries(PATH_ALGORITHMS).map(([key, algorithm]) => `<div class="exploration-path-summary"><h5>${algorithm.label}</h5>${renderStats(key)}</div>`).join('')}
        <p class="exploration-path-note" data-explore-path-note></p>
      </div>
    </div>
    <div class="exploration-presets exploration-mode-presets" role="group" aria-label="路徑範例">${presetButtons(PATH_PRESETS)}${resetButton}</div>`;

    const grid = panel.querySelector('[role="grid"]');
    const cells = Array.from(grid.querySelectorAll('[data-explore-cell]'));
    const routeLine = panel.querySelector('polyline');
    const routeButtons = Array.from(panel.querySelectorAll('[data-explore-route]'));
    const toolButtons = Array.from(panel.querySelectorAll('[data-explore-tool]'));
    const pathNote = panel.querySelector('[data-explore-path-note]');
    const stats = Object.fromEntries(Array.from(panel.querySelectorAll('[data-explore-path-card]')).map(node => [
      node.dataset.explorePathCard, Object.fromEntries(Array.from(node.querySelectorAll('dd')).map(metric => [metric.dataset.exploreMetric, metric]))
    ]));
    let preset = 'weighted';
    let algorithm = 'bfs';
    let tool = 'wall';
    let focusIndex = 0;
    let board;
    let sequences;
    cells[focusIndex].tabIndex = 0;

    function paint(step) {
      const snapshots = Object.fromEntries(Object.entries(sequences).map(([key, frames]) => [key, frames[Math.min(step, frames.length - 1)]]));
      const frame = snapshots[algorithm];
      const visited = new Set(frame.visited);
      const frontier = new Set(frame.frontier);
      const route = new Set(frame.route);
      cells.forEach((cell, index) => {
        const position = index === board.start ? 'start' : index === board.goal ? 'goal' : '';
        const terrain = position || (board.terrain[index] === 0 ? 'wall' : board.terrain[index] === 5 ? 'weight' : '');
        const state = index === frame.current && !frame.done ? 'active' : route.has(index) ? 'route' :
          visited.has(index) ? 'visited' : frontier.has(index) ? 'frontier' : '';
        const mark = { start: '起', goal: '終', wall: '■', weight: '5' }[terrain] ||
          { active: '●', route: '•', visited: '·', frontier: '○' }[state] || '';
        const cost = board.terrain[index];
        const name = position ? TOOLS[position].label : terrain === 'wall' ? '牆' : `費用 ${cost}`;
        const detail = state ? '，' + { active: '目前格', route: '路徑', visited: '已處理', frontier: '前緣' }[state] : '';
        const label = coordinate(index) + '，' + name + detail;
        if (cell.getAttribute('aria-label') !== label) cell.setAttribute('aria-label', label);
        if (cell.dataset.terrain !== terrain) cell.dataset.terrain = terrain;
        if (cell.dataset.exploreCellState !== state) cell.dataset.exploreCellState = state;
        if (cell.firstElementChild.textContent !== mark) cell.firstElementChild.textContent = mark;
      });
      routeLine.setAttribute('points', frame.route.map(index => `${(index % COLS + .5) * 100},${(Math.floor(index / COLS) + .5) * 100}`).join(' '));

      for (const [key, entry] of Object.entries(snapshots)) {
        const result = stats[key];
        result.steps.textContent = entry.route.length ? entry.route.length - 1 : endPath(entry) ? '無路' : '—';
        result.cost.textContent = entry.cost ?? '—';
        result.visited.textContent = entry.visited.length;
      }
      if (endPath(frame)) pathNote.textContent = '前緣已清空，起點與終點沒有連通。';
      else if (frame.done) {
        const bfs = snapshots.bfs;
        const dijkstra = snapshots.dijkstra;
        if (bfs.done && dijkstra.done && bfs.cost > dijkstra.cost) {
          pathNote.textContent = `Dijkstra 少花 ${bfs.cost - dijkstra.cost}，走 ${dijkstra.route.length - 1} 步。BFS 走 ${bfs.route.length - 1} 步。`;
        } else pathNote.textContent = `到達終點，走了 ${frame.route.length - 1} 步，費用 ${frame.cost}。`;
      } else if (frame.current === -1) pathNote.textContent = '先選工具改地圖。進入格子時，支付該格的費用。';
      else {
        const measure = algorithm === 'bfs' ? '已走步數' : '累計費用';
        pathNote.textContent = `取出${coordinate(frame.current)}。${measure} ${frame.distance[frame.current]}，前緣還有 ${frame.frontier.length} 格。`;
      }
      return PATH_ALGORITHMS[algorithm].label + '，' + pathNote.textContent;
    }
    const player = createPlayer(panel.querySelector('.exploration-player'), paint, announce, 230);

    function rebuild() {
      sequences = { bfs: pathTrace(board, false), dijkstra: pathTrace(board, true) };
      player.setLength(Math.max(sequences.bfs.length, sequences.dijkstra.length));
    }
    function selectTool(next) {
      tool = next;
      toolButtons.forEach(button => pressed(button, button.dataset.exploreTool === tool));
    }
    function selectAlgorithm(next) {
      algorithm = next;
      routeButtons.forEach(button => pressed(button, button.dataset.exploreRoute === algorithm));
    }
    function applyPreset(key) {
      preset = key;
      board = pathBoard(key);
      paintPresets(preset);
      rebuild();
    }
    const paintPresets = wirePresets(panel, applyPreset, () => {
      selectTool('wall');
      selectAlgorithm('bfs');
      applyPreset('weighted');
      announce('已還原地圖。');
    });
    toolButtons.forEach(button => button.addEventListener('click', () => selectTool(button.dataset.exploreTool)));
    routeButtons.forEach(button => button.addEventListener('click', () => {
      selectAlgorithm(button.dataset.exploreRoute);
      player.redraw();
    }));

    function setFocus(index, focus = false) {
      cells[focusIndex].tabIndex = -1;
      focusIndex = index;
      cells[index].tabIndex = 0;
      if (focus) {
        cells[index].focus({ preventScroll: true });
        cells[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
    function edit(index) {
      const { start, goal, terrain } = board;
      if (tool === 'start' || tool === 'goal') {
        if (index === start || index === goal) return;
        board[tool] = index;
        terrain[index] = 1;
      } else {
        if (index === start || index === goal) return;
        const value = tool === 'wall' ? 0 : tool === 'weight' ? 5 : 1;
        if (terrain[index] === 1 && value === 1) return;
        terrain[index] = terrain[index] === value ? 1 : value;
      }
      preset = '';
      paintPresets(preset);
      rebuild();
      announce(cells[index].getAttribute('aria-label'));
    }
    grid.addEventListener('click', event => {
      const cell = event.target.closest('[data-explore-cell]');
      if (!cell) return;
      const index = Number(cell.dataset.exploreCell);
      setFocus(index);
      edit(index);
    });
    grid.addEventListener('focusin', event => {
      const index = Number(event.target.dataset.exploreCell);
      if (Number.isInteger(index)) setFocus(index);
    });
    grid.addEventListener('keydown', event => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const index = Number(event.target.dataset.exploreCell);
      if (!Number.isInteger(index)) return;
      const col = index % COLS;
      const next = {
        ArrowLeft: col > 0 ? index - 1 : -1,
        ArrowRight: col < COLS - 1 ? index + 1 : -1,
        ArrowUp: index - COLS,
        ArrowDown: index + COLS
      }[event.key];
      if (!Number.isInteger(next) || next < 0 || next >= cells.length) return;
      event.preventDefault();
      setFocus(next, true);
    });
    selectTool(tool);
    selectAlgorithm(algorithm);
    applyPreset(preset);
    return { pause: player.stop };
  }

  function mountSearch(panel, { id, announce }) {
    panel.innerHTML = `<div class="exploration-mode-heading"><h4>${MODES.search.title}</h4></div>
    <div class="exploration-target">
      <label for="${id}-target">目標</label>
      <input id="${id}-target" class="exploration-input" data-explore-target type="number" min="-99" max="99" step="1" required>
      <input type="range" min="-99" max="99" value="21" aria-label="調整搜尋目標" data-explore-target-range>
    </div>
    <div class="exploration-player"></div>
    <div class="exploration-search-layout">
      <div class="exploration-dark exploration-search-figure">
        <div class="exploration-bounds" aria-hidden="true">
          <span class="exploration-search-bracket"></span><span class="exploration-bound" data-bound="left">L</span>
          <span class="exploration-bound" data-bound="right">R</span>
          <span class="exploration-bound" data-bound="meet">L = R</span>
        </div>
        <ol class="exploration-search-cells" aria-label="有序數列，選擇一個值可設為搜尋目標"></ol>
        ${legend([['frontier', '候選 [L, R)'], ['active', '中點 M'], ['settled', '第一筆符合']], true)}
      </div>
      <div class="exploration-search-summary">
        <div class="exploration-search-formula" aria-label="候選索引範圍">[<b data-explore-left></b>, <b data-explore-right></b>)</div>
        <p data-explore-search-note></p>
        <dl class="exploration-search-metrics">
          <div><dt>二分比較</dt><dd data-explore-probes>0</dd></div>
          <div><dt>逐項比較</dt><dd data-explore-linear>—</dd></div>
          <div><dt>插入索引</dt><dd data-explore-slot>—</dd></div>
        </dl>
      </div>
    </div>
    <div class="exploration-presets exploration-mode-presets" role="group" aria-label="搜尋範例">${presetButtons(SEARCH_PRESETS)}${resetButton}</div>`;
    const targetInput = panel.querySelector('[data-explore-target]');
    const targetRange = panel.querySelector('[data-explore-target-range]');
    const figure = panel.querySelector('.exploration-search-figure');
    const list = panel.querySelector('.exploration-search-cells');
    const left = panel.querySelector('[data-explore-left]');
    const right = panel.querySelector('[data-explore-right]');
    const probes = panel.querySelector('[data-explore-probes]');
    const linear = panel.querySelector('[data-explore-linear]');
    const slot = panel.querySelector('[data-explore-slot]');
    const note = panel.querySelector('[data-explore-search-note]');
    let values = [];
    let trace;
    let preset = 'equal';
    let target;
    let cells = [];

    const player = createPlayer(panel.querySelector('.exploration-player'), step => {
      const frame = trace[step];
      const leftPercent = frame.left * 100 / values.length;
      const rightPercent = frame.right * 100 / values.length;
      figure.style.setProperty('--exploration-left', leftPercent + '%');
      figure.style.setProperty('--exploration-right', rightPercent + '%');
      figure.dataset.exploreSearchReady = String(!frame.done);
      cells.forEach((cell, index) => {
        const candidate = index >= frame.left && index < frame.right;
        const state = frame.done && frame.match && index === frame.left ? 'match' :
          index === frame.middle ? 'active' : candidate ? 'candidate' : 'excluded';
        cell.dataset.exploreSearchCell = state;
        cell.setAttribute('aria-label', `索引 ${index}，數值 ${values[index]}` +
          (state === 'active' ? '，中點' : state === 'match' ? '，第一筆符合' : candidate ? '，候選' : '，已排除'));
        pressed(cell, values[index] === target);
      });
      left.textContent = frame.left;
      right.textContent = frame.right;
      probes.textContent = frame.probes;
      linear.textContent = frame.done ? (frame.match ? frame.left + 1 : values.length) : '—';
      slot.textContent = frame.done ? frame.left : '—';
      note.textContent = frame.note;
      return frame.note + ` 候選範圍左界 ${frame.left}，右界 ${frame.right}。`;
    }, announce, 560);

    function setTarget(next, fromInput = false) {
      target = next;
      if (!fromInput) targetInput.value = next;
      targetRange.value = next;
      trace = searchTrace(values, next);
      player.setLength(trace.length);
    }

    function applyPreset(key) {
      preset = key;
      values = SEARCH_PRESETS[key].values;
      figure.style.setProperty('--exploration-count', values.length);
      list.innerHTML = values.map((value, index) =>
        `<li><button type="button" class="exploration-search-value" data-explore-value-index="${index}"><span>${value}</span></button><span aria-hidden="true">${index}</span></li>`
      ).join('');
      cells = Array.from(list.querySelectorAll('button'));
      paintPresets(preset);
      setTarget(SEARCH_PRESETS[key].target);
    }
    const paintPresets = wirePresets(panel, applyPreset, () => {
      applyPreset('equal');
      announce('已還原搜尋範例。');
    });
    targetInput.addEventListener('input', () => {
      if (targetInput.validity.valid) setTarget(targetInput.valueAsNumber, true);
    });
    targetInput.addEventListener('change', () => {
      if (!targetInput.validity.valid) targetInput.value = target;
      else announce(`目標改為 ${target}。`);
    });
    targetRange.addEventListener('input', () => setTarget(targetRange.valueAsNumber));
    targetRange.addEventListener('change', () => announce(`目標改為 ${target}。`));
    list.addEventListener('click', event => {
      const cell = event.target.closest('[data-explore-value-index]');
      if (!cell) return;
      setTarget(values[Number(cell.dataset.exploreValueIndex)]);
      announce(`目標改為 ${target}。`);
    });
    applyPreset(preset);
    return { pause: player.stop };
  }

  function treePosition(index) {
    const depth = Math.floor(Math.log2(index + 1));
    const slot = index + 1 - 2 ** depth;
    return { x: (slot + .5) * 100 / 2 ** depth, y: 14 + depth * 24 };
  }

  function mountHeap(panel, { id, announce, reducedMotion }) {
    panel.innerHTML = `<div class="exploration-mode-heading"><h4>${MODES.heap.title}</h4></div>
    <form class="exploration-heap-tools">
      <label for="${id}-heap-value">數值</label>
      <input id="${id}-heap-value" class="exploration-input" data-explore-heap-input type="number" min="-99" max="99" step="1" required>
      <button type="submit" class="exploration-button" data-explore-heap-add>插入</button>
      <button type="button" class="exploration-button" data-explore-heap-remove>取出最小值</button>
    </form>
    <div class="exploration-player"></div>
    <div class="exploration-heap-layout">
      <div class="exploration-dark exploration-tree">
        <div class="exploration-tree-figure" role="img"></div>
        ${legend([['active', '目前操作'], ['settled', '堆頂']], true)}
      </div>
      <div class="exploration-heap-summary">
        <dl class="exploration-search-metrics">
          <div><dt>堆頂</dt><dd data-explore-heap-top>—</dd></div>
          <div><dt>取出</dt><dd data-explore-heap-output>—</dd></div>
          <div><dt>交換</dt><dd data-explore-heap-swaps>0</dd></div>
        </dl>
        <p data-explore-heap-note></p>
        <div class="exploration-heap-array">
          <h5>對應陣列</h5><ol aria-label="最小堆陣列"></ol>
          <code>parent(i) = ⌊(i − 1) / 2⌋</code>
        </div>
      </div>
    </div>
    <div class="exploration-presets exploration-mode-presets" role="group" aria-label="最小堆範例">${presetButtons(HEAP_PRESETS)}${resetButton}</div>`;
    const figure = panel.querySelector('.exploration-tree-figure');
    const array = panel.querySelector('.exploration-heap-array ol');
    const input = panel.querySelector('[data-explore-heap-input]');
    const add = panel.querySelector('[data-explore-heap-add]');
    const remove = panel.querySelector('[data-explore-heap-remove]');
    const top = panel.querySelector('[data-explore-heap-top]');
    const output = panel.querySelector('[data-explore-heap-output]');
    const swaps = panel.querySelector('[data-explore-heap-swaps]');
    const note = panel.querySelector('[data-explore-heap-note]');
    let trace;
    let index = 0;
    let preset = 'grow';

    const player = createPlayer(panel.querySelector('.exploration-player'), step => {
      index = step;
      const frame = trace[step];
      const nodes = frame.values.map((value, i) => ({
        value, ...treePosition(i), state: frame.active.includes(i) ? 'active' : i === 0 ? 'top' : ''
      }));
      figure.setAttribute('aria-label', nodes.length ? '依照樹的各層從左到右：' + frame.values.join('，') : '空堆');
      figure.innerHTML = nodes.length ? `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${nodes.slice(1).map((node, offset) => {
          const parent = nodes[Math.floor(offset / 2)];
          const active = parent.state === 'active' && node.state === 'active';
          return `<line x1="${parent.x}" y1="${parent.y}" x2="${node.x}" y2="${node.y}" vector-effect="non-scaling-stroke"${active ? ' data-active="true"' : ''}/>`;
        }).join('')}</svg>
        ${nodes.map((node, i) => `<span class="exploration-tree-node" data-explore-node="${i}" data-state="${node.state}" style="--exploration-x:${node.x}%;--exploration-y:${node.y}%">${node.value}</span>`).join('')}`
        : '<p class="exploration-tree-empty">空堆</p>';
      array.innerHTML = frame.values.map((value, i) =>
        `<li data-explore-heap-index="${i}" data-state="${nodes[i].state}" aria-label="索引 ${i}，數值 ${value}"><span>${value}</span><small aria-hidden="true">${i}</small></li>`
      ).join('');
      top.textContent = frame.values[0] ?? '—';
      output.textContent = frame.removed ?? '—';
      swaps.textContent = frame.swaps;
      note.textContent = frame.note;
      disabled(add, step < trace.length - 1 || frame.values.length >= 15);
      disabled(remove, step < trace.length - 1 || frame.values.length === 0);
      return (frame.removed === null ? '' : `取出 ${frame.removed}。`) + frame.note;
    }, announce, 500);

    function applyPreset(key) {
      preset = key;
      input.value = HEAP_PRESETS[key].input;
      trace = heapTrace(HEAP_PRESETS[key].values);
      paintPresets(preset);
      player.setLength(trace.length);
    }
    const paintPresets = wirePresets(panel, applyPreset, () => {
      applyPreset('grow');
      announce('已還原最小堆。');
    });
    function operate(action) {
      const button = action === 'insert' ? add : remove;
      if (button.getAttribute('aria-disabled') === 'true') {
        const current = trace[index];
        if (index < trace.length - 1) announce('到達結果後可執行下一筆操作。');
        else if (current.values.length === 15) announce('堆已達 15 個值，取出一筆即可繼續插入。');
        return;
      }
      trace = heapTrace(trace[index].values, action, input.valueAsNumber);
      preset = '';
      paintPresets(preset);
      const last = trace.length - 1;
      const first = reducedMotion() ? last : 1;
      player.setLength(trace.length, first);
      if (first < last) player.play();
      else announce(trace[last].note);
    }
    panel.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      operate('insert');
    });
    remove.addEventListener('click', () => operate('remove'));
    applyPreset(preset);
    return { pause: player.stop };
  }

  function mountBst(panel, { id, announce, reducedMotion }) {
    panel.innerHTML = `<div class="exploration-mode-heading"><h4>${MODES.bst.title}</h4>
      <div class="exploration-map-views" role="group" aria-label="樹種切換">
        <button type="button" class="exploration-button exploration-chip" data-explore-bst-mode="bst" aria-pressed="true">普通 BST</button>
        <button type="button" class="exploration-button exploration-chip" data-explore-bst-mode="avl" aria-pressed="false">AVL 平衡樹</button>
      </div>
    </div>
    <form class="exploration-heap-tools">
      <label for="${id}-bst-value">數值</label>
      <input id="${id}-bst-value" class="exploration-input" data-explore-bst-input type="number" min="-99" max="99" step="1" required>
      <button type="submit" class="exploration-button" data-explore-bst-action="insert">插入</button>
      <button type="button" class="exploration-button" data-explore-bst-action="search">搜尋</button>
      <button type="button" class="exploration-button" data-explore-bst-action="delete">刪除</button>
    </form>
    <div class="exploration-player"></div>
    <div class="exploration-heap-layout">
      <div class="exploration-dark exploration-tree">
        <div class="exploration-tree-figure exploration-bst-figure" role="img"></div>
        ${legend([['active', '比較路徑'], ['settled', '平衡旋轉']], true)}
      </div>
      <div class="exploration-heap-summary">
        <dl class="exploration-search-metrics">
          <div><dt>樹高</dt><dd data-explore-bst-height>0</dd></div>
          <div><dt>比較</dt><dd data-explore-bst-cmp>0</dd></div>
          <div><dt>旋轉</dt><dd data-explore-bst-rot>0</dd></div>
        </dl>
        <p data-explore-bst-note></p>
        <div class="exploration-heap-array">
          <h5>中序走訪（左 → 根 → 右）</h5><ol aria-label="中序走訪數列"></ol>
        </div>
      </div>
    </div>
    <div class="exploration-presets exploration-mode-presets" role="group" aria-label="BST 範例">${presetButtons(BST_PRESETS)}${resetButton}</div>`;

    const modeButtons = Array.from(panel.querySelectorAll('[data-explore-bst-mode]'));
    const input = panel.querySelector('[data-explore-bst-input]');
    const searchBtn = panel.querySelector('[data-explore-bst-action="search"]');
    const deleteBtn = panel.querySelector('[data-explore-bst-action="delete"]');
    const figure = panel.querySelector('.exploration-bst-figure');
    const orderList = panel.querySelector('.exploration-heap-array ol');
    const heightOut = panel.querySelector('[data-explore-bst-height]');
    const cmpOut = panel.querySelector('[data-explore-bst-cmp]');
    const rotOut = panel.querySelector('[data-explore-bst-rot]');
    const note = panel.querySelector('[data-explore-bst-note]');
    let treeMode = 'bst';
    let preset = 'skew';
    let history = BST_PRESETS.skew.values.slice();
    let trace = [];
    let currentStep = 0;

    const player = createPlayer(panel.querySelector('.exploration-player'), step => {
      currentStep = step;
      const frame = trace[step];
      figure.setAttribute('aria-label', frame.values.length ? `樹高 ${frame.height}，中序：` + frame.values.join('，') : '空樹');
      figure.innerHTML = frame.nodes.length ? `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${frame.edges.map(edge => `<line x1="${edge.x1}" y1="${edge.y1}" x2="${edge.x2}" y2="${edge.y2}" vector-effect="non-scaling-stroke"${edge.active ? ' data-active="true"' : ''}/>`).join('')}</svg>
        ${frame.nodes.map(node => `<span class="exploration-tree-node" data-explore-bst-node="${node.key}" data-state="${node.state}" style="--exploration-x:${node.x}%;--exploration-y:${node.y}%">${node.key}${treeMode === 'avl' ? `<small class="exploration-bf">${node.bf > 0 ? '+' + node.bf : node.bf}</small>` : ''}</span>`).join('')}`
        : '<p class="exploration-tree-empty">空樹</p>';
      orderList.innerHTML = frame.values.length
        ? frame.values.map(val => `<li><span>${val}</span></li>`).join('')
        : '<li><span>空</span></li>';
      heightOut.textContent = frame.height;
      cmpOut.textContent = frame.comparisons;
      rotOut.textContent = frame.rotations;
      note.textContent = frame.note;
      return frame.note;
    }, announce, 460);

    function applyPreset(key) {
      preset = key;
      history = BST_PRESETS[key].values.slice();
      input.value = BST_PRESETS[key].input;
      trace = bstTrace(history, treeMode);
      paintPresets(preset);
      player.setLength(trace.length);
    }
    const paintPresets = wirePresets(panel, applyPreset, () => {
      treeMode = 'bst';
      modeButtons.forEach(b => pressed(b, b.dataset.exploreBstMode === treeMode));
      applyPreset('skew');
      announce('已還原 BST 範例。');
    });

    function runOp(action) {
      if (!input.validity.valid) {
        input.reportValidity?.();
        return;
      }
      const val = input.valueAsNumber;
      const baseTree = trace[trace.length - 1]?.tree ?? null;
      trace = bstTrace(baseTree, treeMode, action, val);
      if (action === 'insert' && !history.includes(val) && countTreeNodes(baseTree) < 15) history.push(val);
      else if (action === 'delete') history = history.filter(v => v !== val);
      preset = '';
      paintPresets(preset);
      const last = trace.length - 1;
      const first = reducedMotion() ? last : Math.min(1, last);
      player.setLength(trace.length, first);
      if (first < last) player.play();
      else announce(trace[last].note);
    }

    modeButtons.forEach(button => button.addEventListener('click', () => {
      const next = button.dataset.exploreBstMode;
      if (next === treeMode) return;
      treeMode = next;
      modeButtons.forEach(b => pressed(b, b.dataset.exploreBstMode === treeMode));
      trace = bstTrace(history, treeMode);
      player.setLength(trace.length);
      announce(trace[0].note);
    }));
    panel.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      runOp('insert');
    });
    searchBtn.addEventListener('click', () => runOp('search'));
    deleteBtn.addEventListener('click', () => runOp('delete'));
    applyPreset(preset);
    return { pause: player.stop };
  }

  function mountHash(panel, { id, announce, reducedMotion }) {
    panel.innerHTML = `<div class="exploration-mode-heading"><h4>${MODES.hash.title}</h4>
      <div class="exploration-map-views" role="group" aria-label="碰撞處理方式">
        <button type="button" class="exploration-button exploration-chip" data-explore-hash-strategy="chaining" aria-pressed="true">鏈結法</button>
        <button type="button" class="exploration-button exploration-chip" data-explore-hash-strategy="probing" aria-pressed="false">線性探測</button>
        <button type="button" class="exploration-button exploration-chip" data-explore-hash-cap="7" aria-pressed="true">7 格</button>
        <button type="button" class="exploration-button exploration-chip" data-explore-hash-cap="11" aria-pressed="false">11 格</button>
      </div>
    </div>
    <form class="exploration-heap-tools">
      <label for="${id}-hash-key">鍵值</label>
      <input id="${id}-hash-key" class="exploration-input" data-explore-hash-input type="number" min="0" max="999" step="1" required>
      <button type="submit" class="exploration-button" data-explore-hash-action="insert">放入</button>
      <button type="button" class="exploration-button" data-explore-hash-action="search">查詢</button>
      <button type="button" class="exploration-button" data-explore-hash-action="delete">刪除</button>
    </form>
    <div class="exploration-player"></div>
    <div class="exploration-heap-layout">
      <div class="exploration-dark exploration-hash-stage">
        <div class="exploration-hash-formula" data-explore-hash-formula>h(k) = k mod 7</div>
        <ol class="exploration-hash-buckets" aria-label="雜湊桶位"></ol>
        ${legend([['active', '正在探測'], ['settled', '曾走過']], true)}
      </div>
      <div class="exploration-heap-summary">
        <dl class="exploration-search-metrics">
          <div><dt>筆數</dt><dd data-explore-hash-count>0 / 7</dd></div>
          <div><dt>負載 α</dt><dd data-explore-hash-load>0.00</dd></div>
          <div><dt>探測</dt><dd data-explore-hash-probes>0</dd></div>
        </dl>
        <p data-explore-hash-note></p>
      </div>
    </div>
    <div class="exploration-presets exploration-mode-presets" role="group" aria-label="雜湊範例">${presetButtons(HASH_PRESETS)}${resetButton}</div>`;

    const stratBtns = Array.from(panel.querySelectorAll('[data-explore-hash-strategy]'));
    const capBtns = Array.from(panel.querySelectorAll('[data-explore-hash-cap]'));
    const input = panel.querySelector('[data-explore-hash-input]');
    const searchBtn = panel.querySelector('[data-explore-hash-action="search"]');
    const deleteBtn = panel.querySelector('[data-explore-hash-action="delete"]');
    const formula = panel.querySelector('[data-explore-hash-formula]');
    const bucketsEl = panel.querySelector('.exploration-hash-buckets');
    const countOut = panel.querySelector('[data-explore-hash-count]');
    const loadOut = panel.querySelector('[data-explore-hash-load]');
    const probesOut = panel.querySelector('[data-explore-hash-probes]');
    const note = panel.querySelector('[data-explore-hash-note]');
    let strategy = 'chaining';
    let capacity = 7;
    let preset = 'collision';
    let history = HASH_PRESETS.collision.values.slice();
    let trace = [];

    const player = createPlayer(panel.querySelector('.exploration-player'), step => {
      const frame = trace[step];
      formula.textContent = `h(k) = k mod ${frame.capacity}`;
      const pathSet = new Set(frame.path);
      bucketsEl.innerHTML = frame.buckets.map((bucket, idx) => {
        const state = idx === frame.activeSlot ? 'active' : pathSet.has(idx) ? 'visited' : '';
        if (frame.strategy === 'chaining') {
          const items = bucket.length
            ? bucket.map(k => `<span class="exploration-hash-pill">${k}</span>`).join('<span class="exploration-hash-arrow" aria-hidden="true">→</span>')
            : '<span class="exploration-hash-empty">空</span>';
          return `<li data-slot="${idx}" data-state="${state}"><span class="exploration-hash-index">${idx}</span><div class="exploration-hash-chain">${items}</div></li>`;
        }
        const cell = bucket === null
          ? '<span class="exploration-hash-empty">空</span>'
          : bucket.state === 'tombstone'
            ? '<span class="exploration-hash-tombstone" title="已刪除標記">✕ 已刪</span>'
            : `<span class="exploration-hash-pill">${bucket.key}</span>`;
        return `<li data-slot="${idx}" data-state="${state}"><span class="exploration-hash-index">${idx}</span><div class="exploration-hash-chain">${cell}</div></li>`;
      }).join('');
      countOut.textContent = `${frame.count} / ${frame.capacity}`;
      loadOut.textContent = frame.loadFactor;
      probesOut.textContent = frame.probes;
      note.textContent = frame.note;
      return frame.note;
    }, announce, 460);

    function rebuildFromHistory() {
      trace = hashTrace(history, capacity, strategy);
      player.setLength(trace.length);
    }
    function applyPreset(key) {
      preset = key;
      const cfg = HASH_PRESETS[key];
      history = cfg.values.slice();
      capacity = cfg.capacity;
      capBtns.forEach(b => pressed(b, Number(b.dataset.exploreHashCap) === capacity));
      input.value = cfg.input;
      paintPresets(preset);
      rebuildFromHistory();
    }
    const paintPresets = wirePresets(panel, applyPreset, () => {
      strategy = 'chaining';
      stratBtns.forEach(b => pressed(b, b.dataset.exploreHashStrategy === strategy));
      applyPreset('collision');
      announce('已還原雜湊表範例。');
    });

    function runOp(action) {
      if (!input.validity.valid) {
        input.reportValidity?.();
        return;
      }
      const val = input.valueAsNumber;
      const baseBuckets = trace[trace.length - 1]?.buckets ?? history;
      trace = hashTrace(baseBuckets, capacity, strategy, action, val);
      if (action === 'insert' && !history.includes(val)) history.push(val);
      else if (action === 'delete') history = history.filter(v => v !== val);
      preset = '';
      paintPresets(preset);
      const last = trace.length - 1;
      const first = reducedMotion() ? last : Math.min(1, last);
      player.setLength(trace.length, first);
      if (first < last) player.play();
      else announce(trace[last].note);
    }

    stratBtns.forEach(btn => btn.addEventListener('click', () => {
      const next = btn.dataset.exploreHashStrategy;
      if (next === strategy) return;
      strategy = next;
      stratBtns.forEach(b => pressed(b, b.dataset.exploreHashStrategy === strategy));
      rebuildFromHistory();
      announce(trace[0].note);
    }));
    capBtns.forEach(btn => btn.addEventListener('click', () => {
      const next = Number(btn.dataset.exploreHashCap);
      if (next === capacity) return;
      capacity = next;
      capBtns.forEach(b => pressed(b, Number(b.dataset.exploreHashCap) === capacity));
      rebuildFromHistory();
      announce(trace[0].note);
    }));
    panel.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      runOp('insert');
    });
    searchBtn.addEventListener('click', () => runOp('search'));
    deleteBtn.addEventListener('click', () => runOp('delete'));
    applyPreset(preset);
    return { pause: player.stop };
  }

  const instances = new WeakMap();
  const factories = { sort: mountSort, path: mountPath, search: mountSearch, heap: mountHeap, bst: mountBst, hash: mountHash };
  const keys = Object.keys(MODES);
  let sequence = 0;

  function mount(element, { mode = element.dataset.explorationMode } = {}) {
    if (instances.has(element)) return instances.get(element);
    const id = 'exploration-studio-' + ++sequence;
    const doc = element.ownerDocument;
    const view = doc.defaultView;
    element.innerHTML = `<section class="exploration-studio" aria-labelledby="${id}-title">
      <header class="exploration-header"><h3 id="${id}-title">演算法工作台</h3>
        <div class="exploration-tabs" role="tablist" aria-label="實驗模式">
          ${keys.map(key => `<button type="button" role="tab" id="${id}-tab-${key}" aria-controls="${id}-panel-${key}" aria-selected="false" tabindex="-1" data-explore-mode="${key}">${icon(MODES[key].icon)}<span>${MODES[key].label}</span></button>`).join('')}
        </div>
      </header>
      ${keys.map(key => `<div class="exploration-panel" role="tabpanel" id="${id}-panel-${key}" aria-labelledby="${id}-tab-${key}" data-explore-panel="${key}" hidden></div>`).join('')}
      <span class="exploration-sr" role="status" aria-atomic="true"></span>
    </section>`;
    const tabs = Array.from(element.querySelectorAll('[data-explore-mode]'));
    const panels = Array.from(element.querySelectorAll('[data-explore-panel]'));
    const status = element.querySelector('[role="status"]');
    const media = view.matchMedia('(prefers-reduced-motion: reduce)');
    const controllers = {};
    let active;
    let statusTimer;
    function announce(note, delay = 35) {
      view.clearTimeout(statusTimer);
      status.textContent = '';
      statusTimer = view.setTimeout(() => { status.textContent = note; }, delay);
    }
    function select(key, focus = false) {
      const index = keys.indexOf(key);
      if (index < 0 || active === key) return;
      if (active) controllers[active].pause();
      view.clearTimeout(statusTimer);
      status.textContent = '';
      active = key;
      tabs.forEach((tab, position) => {
        tab.tabIndex = position === index ? 0 : -1;
        tab.setAttribute('aria-selected', String(position === index));
        panels[position].hidden = position !== index;
      });
      if (!controllers[key]) controllers[key] = factories[key](panels[index], { id: id + '-' + key, announce, reducedMotion: () => media.matches });
      if (focus) tabs[index].focus();
    }
    tabs.forEach(tab => {
      tab.addEventListener('click', () => select(tab.dataset.exploreMode));
      tab.addEventListener('keydown', event => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        const index = keys.indexOf(active);
        const next = { ArrowLeft: (index + keys.length - 1) % keys.length, ArrowRight: (index + 1) % keys.length, Home: 0, End: keys.length - 1 }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        select(keys[next], true);
      });
    });
    select(keys.includes(mode) ? mode : 'sort');
    const lifecycle = new view.AbortController();
    const listener = { signal: lifecycle.signal };
    const pause = () => Object.values(controllers).forEach(controller => controller.pause());
    doc.addEventListener('course:route', pause, listener);
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) pause(); }, listener);
    view.addEventListener('hashchange', pause, listener);
    view.addEventListener('beforeprint', pause, listener);
    const state = {
      select,
      destroy() {
        lifecycle.abort();
        pause();
        view.clearTimeout(statusTimer);
        element.replaceChildren();
        instances.delete(element);
      }
    };
    instances.set(element, state);
    return state;
  }

  function unmount(element) {
    instances.get(element)?.destroy();
  }

  return { mount, unmount, sortTrace, pathBoard, pathTrace, searchTrace, heapTrace, bstTrace, hashTrace };
});
