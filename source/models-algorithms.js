(function (root) {
  'use strict';
  const models = {};
  const copy = value => JSON.parse(JSON.stringify(value));
  const field = (name, label, value, type = 'text') => ({name, label, value, type});
  const preset = (label, values) => ({label, values});
  const row = (label, cells) => ({label, cells});
  const marked = (values, active = -1, done = -1) => values.map((value, i) => ({text: String(value), state: i === active ? 'active' : i <= done ? 'done' : ''}));
  function integer(value, min, max, label) {
    if (String(value).trim() === '' || !Number.isInteger(Number(value)) || Number(value) < min || Number(value) > max) throw Error(label + '請填 ' + min + '–' + max + ' 的整數。');
    return Number(value);
  }
  function numbers(raw, {min = -9999, max = 9999, whole = true, maxLength = 12, empty = true} = {}) {
    const text = String(raw ?? '').trim();
    if (!text && empty) return [];
    const tokens = text.split(/[,，]/).map(value => value.trim());
    if (!text || tokens.length > maxLength || tokens.some(value => !value || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max || (whole && !Number.isInteger(Number(value))))) {
      throw Error('請填最多 ' + maxLength + ' 個' + (whole ? '整數' : '數值') + '，範圍 ' + min + '–' + max + '，以逗號分隔。');
    }
    return tokens.map(Number);
  }
  function chars(value, maxLength = 30, empty = true) {
    const letters = Array.from(String(value ?? ''));
    if (letters.length > maxLength || (!empty && !letters.length)) throw Error('請填' + (empty ? '最多 ' : '1–') + maxLength + ' 個字元。');
    return letters;
  }
  function recorder() {
    const frames = [];
    return {frames, push(title, explanation, rows = [], vars = {}, extra = {}) { frames.push(copy({title, explanation, rows, vars, ...extra})); }};
  }
  const arrayFields = [field('array', '整數，逗號分隔', '7, 2, 5, 1, 2')];

  models['insertion-sort'] = {
    title: '插入排序：把新值插進有序前段', inputs: arrayFields,
    presets: [preset('未排序', {array: '7,2,5,1,2'}), preset('已排序', {array: '1,2,2,4'}), preset('反向', {array: '5,4,3,2,1'})],
    run(input) {
      const a = numbers(input.array), trace = recorder();
      trace.push('建立有序前段', '第一個值已經有序，接著逐一插入右側的新值。', [row('陣列', marked(a, -1, 0))], {長度: a.length});
      for (let i = 1; i < a.length; i++) {
        const value = a[i]; let j = i;
        trace.push('取出 ' + value, '把目前值握在手上，從有序前段的最右邊比較。', [row('陣列', marked(a, i, i - 1))], {i, j, 手上的值: value});
        while (j > 0 && a[j - 1] > value) {
          a[j] = a[j - 1]; j--;
          trace.push('較大的值往右移', a[j] + ' 大於 ' + value + '，把它往右挪一格，空位移到 ' + j + '。', [row('陣列', a.map((v, p) => ({text: p === j ? '空位' : String(v), state: p === j ? 'active' : ''})))], {i, 空位: j, 手上的值: value});
        }
        a[j] = value;
        trace.push('放進空位', '前 ' + (i + 1) + ' 個值已經有序，相等時保留原先順序。', [row('陣列', marked(a, j, i))], {i, 插入位置: j});
      }
      trace.push('排序完成', '所有位置都已加入有序前段。', [row('結果', marked(a, -1, a.length - 1))], {}, {result: a});
      return trace.frames;
    }
  };

  models['merge-sort'] = {
    title: '合併排序：兩邊只看最前端', inputs: arrayFields,
    presets: [preset('四個值', {array: '7,2,5,1'}), preset('重複值', {array: '3,1,3,1'}), preset('空輸入', {array: ''})],
    run(input) {
      const values = numbers(input.array), trace = recorder();
      trace.push('從整列開始', '切分到每段只剩一個值，再由下往上合併。', [row('輸入', values)], {});
      function sort(a, depth) {
        if (a.length < 2) return a.slice();
        const mid = Math.floor(a.length / 2);
        trace.push('分成兩段', '左右兩段各自排序，合併時再利用各自的有序性。', [row('左段', a.slice(0, mid)), row('右段', a.slice(mid))], {深度: depth});
        const left = sort(a.slice(0, mid), depth + 1), right = sort(a.slice(mid), depth + 1), out = [];
        let i = 0, j = 0;
        while (i < left.length || j < right.length) {
          const explanation = j >= right.length ? '右列已用完，將左列剩餘值依序接上。' : i >= left.length ? '左列已用完，將右列剩餘值依序接上。' : left[i] <= right[j] ? '左側前端較小或相等，將它接到輸出尾端。' : '右側前端較小，將它接到輸出尾端。';
          const useLeft = j >= right.length || (i < left.length && left[i] <= right[j]);
          const value = useLeft ? left[i++] : right[j++]; out.push(value);
          trace.push('取出 ' + value, explanation, [row('左側剩下', left.slice(i)), row('右側剩下', right.slice(j)), row('已合併', out)], {深度: depth, i, j});
        }
        return out;
      }
      const result = sort(values, 0);
      trace.push('排序完成', '最上層合併完成，每一層的有序結果都已接起來。', [row('結果', result)], {}, {result});
      return trace.frames;
    }
  };

  models['inversion-count'] = {
    title: '分治：合併時一次算一批逆序對', inputs: arrayFields,
    presets: [preset('跨線逆序', {array: '2,4,1,3'}), preset('全反向', {array: '5,4,3,2,1'}), preset('全相等', {array: '2,2,2'})],
    run(input) {
      const values = numbers(input.array), trace = recorder();
      trace.push('把每一對歸到一個區域', '左右內部的對數遞迴計算，合併時只計跨線的對。', [row('輸入', values)]);
      function solve(a) {
        if (a.length < 2) return {values: a.slice(), count: 0};
        const mid = Math.floor(a.length / 2), l = solve(a.slice(0, mid)), r = solve(a.slice(mid));
        const out = []; let i = 0, j = 0, count = l.count + r.count;
        while (i < l.values.length && j < r.values.length) {
          if (l.values[i] <= r.values[j]) out.push(l.values[i++]);
          else {
            const addition = l.values.length - i, value = r.values[j++]; count += addition; out.push(value);
            trace.push('新增 ' + addition + ' 對', value + ' 小於左側所有剩餘值，一次加上 ' + addition + '。', [row('左側剩下', l.values.slice(i)), row('右側剩下', r.values.slice(j)), row('已合併', out)], {本子問題對數: count, 本次增加: addition});
          }
        }
        out.push(...l.values.slice(i), ...r.values.slice(j));
        trace.push('這個子問題完成', '左內部、右內部與跨線對數合在一起。', [row('有序片段', out)], {本子問題對數: count});
        return {values: out, count};
      }
      const result = solve(values).count;
      trace.push('逆序對總數：' + result, '相等值沒有算入逆序對。', [row('原始輸入', values)], {逆序對: result}, {result});
      return trace.frames;
    }
  };

  models['counting-sort'] = {
    title: '計數排序：用累積數量找到落點', inputs: [field('array', '0–9 的整數', '2,0,2,1')],
    presets: [preset('相同鍵的順序', {array: '2,0,2,1'}), preset('缺少中間鍵', {array: '5,0,5,0'}), preset('空輸入', {array: ''})],
    run(input) {
      const a = numbers(input.array, {min: 0, max: 9}), trace = recorder(), k = Math.max(0, ...a), counts = Array(k + 1).fill(0), out = Array(a.length).fill(null);
      const pairs = a.map((key, index) => ({key, index}));
      const show = () => [row('鍵', counts.map((_, i) => i)), row('計數／邊界', counts), row('輸出（值@原索引）', out.map(item => item ? item.key + '@' + item.index : '·'))];
      trace.push('統計每一種鍵', '@ 後面是原始索引，用來追蹤相同鍵的順序。', [row('輸入', pairs.map(item => item.key + '@' + item.index)), ...show()]);
      for (const item of pairs) { counts[item.key]++; trace.push('計入鍵 ' + item.key, '這個鍵的數量增加一。', show(), {原始索引: item.index}); }
      for (let i = 1; i < counts.length; i++) counts[i] += counts[i - 1];
      trace.push('改成前綴總數', '現在每格表示小於等於此鍵的筆數，也就是該區塊的右邊界。', show());
      for (let i = pairs.length - 1; i >= 0; i--) {
        const item = pairs[i], index = --counts[item.key]; out[index] = item;
        trace.push('放入 ' + item.key + '@' + item.index, '從右往左處理，同鍵較晚的資料使用較右的位置。', show(), {寫入索引: index});
      }
      const result = {values: out.map(item => item.key), indices: out.map(item => item.index)};
      trace.push('穩定排序完成', '同鍵資料的原始索引保持遞增。', show(), {}, {result}); return trace.frames;
    }
  };

  models['bucket-sort'] = {
    title: '桶排序：先按區間分散', inputs: [field('array', '0 ≤ x < 1，逗號分隔', '0.78,0.17,0.39,0.26')],
    presets: [preset('分散', {array: '0.78,0.17,0.39,0.26'}), preset('擠在同桶', {array: '0.99,0.98,0.97,0.96'}), preset('空輸入', {array: ''})],
    run(input) {
      const a = numbers(input.array, {min: 0, max: 1, whole: false}), trace = recorder();
      if (a.some(v => v === 1)) throw Error('每個值需小於 1。');
      const buckets = Array.from({length: a.length}, () => []), show = () => buckets.map((bucket, i) => row('桶 ' + i, bucket));
      trace.push('建立 ' + a.length + ' 個桶', '值 x 放到 floor(n×x) 號桶，桶內使用插入排序。', [row('輸入', a), ...show()]);
      for (const value of a) {
        const index = Math.min(a.length - 1, Math.floor(value * a.length)), bucket = buckets[index]; bucket.push(value);
        trace.push('放進桶 ' + index, value + ' 落在這個桶的數值區間。', show(), {值: value, 桶: index});
        let j = bucket.length - 1;
        while (j > 0 && bucket[j - 1] > value) { bucket[j] = bucket[j - 1]; j--; }
        bucket[j] = value;
        trace.push('桶內已排序', '只在同一桶中移動，其他桶的資料位置保持不變。', show(), {桶: index, 插入位置: j});
      }
      const result = buckets.flat(); trace.push('依桶編號串接', '小編號桶中的值都小於大編號桶，順序可以直接接上。', [row('結果', result)], {}, {result}); return trace.frames;
    }
  };

  models['radix-sort'] = {
    title: '基數排序：低位順序一路保留', inputs: [field('array', '0–9999 的整數', '170,45,75,90,802,24,2,66')],
    presets: [preset('三位數', {array: '170,45,75,90,802,24,2,66'}), preset('兩輪', {array: '21,13,12,22'}), preset('全零', {array: '0,0,0'})],
    run(input) {
      let a = numbers(input.array, {min: 0, max: 9999}); const trace = recorder(), maximum = Math.max(0, ...a);
      trace.push('從個位開始', '每輪穩定地分桶，保留前面已排好的低位順序。', [row('陣列', a)]);
      for (let place = 1; place <= maximum; place *= 10) {
        const buckets = Array.from({length: 10}, () => []);
        for (const value of a) buckets[Math.floor(value / place) % 10].push(value);
        trace.push('按 ' + place + ' 位分桶', '同數位的值依原順序加入桶中。', buckets.map((bucket, i) => row('數位 ' + i, bucket)), {位權: place});
        a = buckets.flat();
        trace.push('這一輪完成', '現在已按最低 ' + (Math.log10(place) + 1) + ' 位排序。', [row('陣列', a)], {位權: place});
      }
      trace.push('所有數位完成', '從低位到高位的穩定排列，形成完整整數順序。', [row('結果', a)], {}, {result: a}); return trace.frames;
    }
  };

  models.quickselect = {
    title: 'Quickselect：只留下目標所在群組', inputs: [field('array', '整數，逗號分隔', '7,2,5,2,9'), field('k', '第 k 小（從 1 起算）', '3', 'number')],
    presets: [preset('第三小', {array: '7,2,5,2,9', k: 3}), preset('全相等', {array: '8,8,8,8', k: 3}), preset('最大值', {array: '1,3,2,5,4', k: 5})],
    run(input) {
      let a = numbers(input.array, {empty: false}), k = integer(input.k, 1, a.length, 'k') - 1;
      const trace = recorder(); trace.push('目標排名 ' + (k + 1), '用候選中間位置當 pivot，重播時會沿著相同路徑。', [row('候選', a)], {k});
      while (true) {
        const pivot = a[Math.floor(a.length / 2)], smaller = a.filter(v => v < pivot), equal = a.filter(v => v === pivot), larger = a.filter(v => v > pivot);
        trace.push('以 ' + pivot + ' 切成三群', '較小值、相等值、較大值的數量決定目標在哪裡。', [row('較小', smaller), row('相等', equal), row('較大', larger)], {pivot, k});
        if (k < smaller.length) { a = smaller; trace.push('留下較小群', '目標排名落在較小群，k 保持原值。', [row('候選', a)], {k}); }
        else if (k < smaller.length + equal.length) { trace.push('找到答案 ' + pivot, '目標落在相等群，群中的值都是答案。', [row('答案', [pivot])], {k}, {result: pivot}); break; }
        else { k -= smaller.length + equal.length; a = larger; trace.push('留下較大群', '跳過前兩群，k 扣掉已排除的元素數。', [row('候選', a)], {k}); }
      }
      return trace.frames;
    }
  };

  models['factorial-zeroes'] = {
    title: '階乘尾端零：逐層數因數 5', inputs: [field('n', 'n（0–1000000）', '100', 'number')],
    presets: [preset('100!', {n: 100}), preset('25!', {n: 25}), preset('0!', {n: 0})],
    run(input) {
      const n = integer(input.n, 0, 1000000, 'n'), trace = recorder(), contributions = [];
      let remaining = n, total = 0, power = 1;
      trace.push('尋找 2×5 配對', '因數 2 足夠，逐層數出 n! 中有多少個因數 5。', [row('n', [n])], {累計: total});
      while (remaining) {
        remaining = Math.floor(remaining / 5); power *= 5; total += remaining;
        contributions.push([power, remaining, total]);
        trace.push('計算 ' + power + ' 的倍數', '本層再貢獻 ' + remaining + ' 個因數 5。', [], {累計: total}, {table: {columns: ['因數層', '本層數量', '累計'], rows: contributions}});
      }
      trace.push(n + '! 尾端有 ' + total + ' 個零', '把每一層的因數 5 相加，得到 10 的總因數數量。', [], {尾端零數: total}, {result: total}); return trace.frames;
    }
  };

  models['euclid-gcd'] = {
    title: '最大公因數：餘數接著算', inputs: [field('a', 'a', '84', 'number'), field('b', 'b', '30', 'number')],
    presets: [preset('84 與 30', {a: 84, b: 30}), preset('互質', {a: 35, b: 12}), preset('其中一個是零', {a: 0, b: 18})],
    run(input) {
      let a = Math.abs(integer(input.a, -1000000, 1000000, 'a')), b = Math.abs(integer(input.b, -1000000, 1000000, 'b'));
      const trace = recorder(), history = [];
      trace.push('取正長度', 'gcd(a,b) 與 gcd(b,a%b) 的答案相同，餘數會讓問題變小。', [row('a, b', [a, b])]);
      while (b) {
        const remainder = a % b; history.push([a, b, remainder]);
        trace.push(a + ' = ' + Math.floor(a / b) + ' × ' + b + ' + ' + remainder, '下一輪留下除數與餘數。', [row('下一組', [b, remainder])], {餘數: remainder}, {table: {columns: ['a', 'b', 'a % b'], rows: history}});
        [a, b] = [b, remainder];
      }
      trace.push('gcd = ' + a, '餘數到達 0，最後的 a 就是最大公因數。', [row('答案', [a])], {}, {result: a}); return trace.frames;
    }
  };

  models['prime-sieve'] = {
    title: '質數篩：劃掉小質數的倍數', inputs: [field('n', '上限 n（0–80）', '30', 'number')],
    presets: [preset('篩到 30', {n: 30}), preset('49 的平方邊界', {n: 49}), preset('沒有質數', {n: 1})],
    run(input) {
      const n = integer(input.n, 0, 80, 'n'), prime = Array(n + 1).fill(true), trace = recorder();
      prime[0] = false; if (n >= 1) prime[1] = false;
      const show = active => [row('候選整數', prime.map((yes, value) => ({text: String(value), state: value === active ? 'active' : yes ? '' : 'muted'})))];
      trace.push('0 與 1 先排除', '依序尋找還沒被劃掉的 p，再從 p² 開始劃掉它的倍數。', show(-1));
      for (let p = 2; p * p <= n; p++) {
        if (!prime[p]) continue;
        const removed = [];
        for (let value = p * p; value <= n; value += p) { if (prime[value]) removed.push(value); prime[value] = false; }
        trace.push('用質數 ' + p + ' 篩一輪', '從 ' + p * p + ' 開始。本輪新增排除：' + (removed.join('、') || '無') + '。', show(p), {p, 起點: p * p});
      }
      const result = prime.flatMap((yes, value) => yes ? [value] : []);
      trace.push('剩下 ' + result.length + ' 個質數', '每個合數都會被不超過其平方根的某個質因數劃掉。', [row('質數', result)], {}, {result}); return trace.frames;
    }
  };

  models['pascal-combinations'] = {
    title: '組合數：一列 Pascal 三角形', inputs: [field('n', '人數 n（0–12）', '5', 'number'), field('k', '選取 k 人', '2', 'number')],
    presets: [preset('5 選 2', {n: 5, k: 2}), preset('6 選 3', {n: 6, k: 3}), preset('全選', {n: 5, k: 5})],
    run(input) {
      const n = integer(input.n, 0, 12, 'n'), originalK = integer(input.k, 0, n, 'k'), k = Math.min(originalK, n - originalK), values = [1, ...Array(k).fill(0)], trace = recorder();
      trace.push('從 C(0,0)=1 開始', '選 k 人與留下 n−k 人的數量相同，所以只保留較短的一側。', [row('選取人數', values.map((_, i) => i)), row('組合數', values)], {有效k: k});
      for (let i = 1; i <= n; i++) {
        for (let j = Math.min(i, k); j > 0; j--) {
          const same = values[j], previous = values[j - 1]; values[j] += values[j - 1];
          trace.push('C(' + i + ',' + j + ') = ' + values[j], same + ' 種不選最後一人，' + previous + ' 種選最後一人，兩群加起來。', [row('組合數', marked(values, j))], {已處理人數: i, 選取人數: j});
        }
      }
      trace.push('C(' + n + ',' + originalK + ') = ' + values[k], '每輪由右往左更新，來源一直是上一列的數值。', [row('最後一列', values)], {}, {result: values[k]}); return trace.frames;
    }
  };

  models['kmp-matching'] = {
    title: 'KMP：失敗時沿用共同字首', inputs: [field('text', '文字（最多 30 字元）', 'abababaca'), field('pattern', '模式（最多 12 字元）', 'ababaca')],
    presets: [preset('回退再接上', {text: 'abababaca', pattern: 'ababaca'}), preset('重疊匹配', {text: 'aaaa', pattern: 'aa'}), preset('空模式', {text: 'abc', pattern: ''})],
    run(input) {
      const text = chars(input.text), pattern = chars(input.pattern, 12), trace = recorder(), pi = Array(pattern.length).fill(0), result = [];
      trace.push('先看模式自己的重複', 'pi 儲存每個字首的最長共同字首與字尾長度。', [row('模式', pattern), row('pi', pi)]);
      if (!pattern.length) { const positions = Array.from({length: text.length + 1}, (_, i) => i); trace.push('空模式匹配每個間隙', '長度 n 的文字有 n+1 個字元間隙。', [row('起點', positions)], {}, {result: positions}); return trace.frames; }
      for (let i = 1; i < pattern.length; i++) {
        let j = pi[i - 1];
        while (j && pattern[i] !== pattern[j]) {
          const before = j; j = pi[j - 1];
          trace.push('建立 pi：候選長度 ' + before + ' → ' + j, '索引 ' + i + ' 的 ' + pattern[i] + ' 接不上 ' + pattern[before] + '，沿 pi[' + (before - 1) + '] 回退，仍然比對同一個字元。', [row('模式', pattern.map((char, position) => ({text: char, state: position === i || position === j ? 'active' : ''}))), row('pi', pi)], {建表位置: i, 回退前: before, 回退後: j});
        }
        if (pattern[i] === pattern[j]) j++; pi[i] = j;
        trace.push('pi[' + i + '] = ' + j, '目前片段可沿用的共同字首字尾長度為 ' + j + '。', [row('模式', marked(pattern, i)), row('pi', marked(pi, i))], {i, j});
      }
      let j = 0;
      for (let i = 0; i < text.length; i++) {
        while (j && text[i] !== pattern[j]) {
          const before = j; j = pi[j - 1];
          trace.push('匹配長度 ' + before + ' → ' + j, '目前字元 ' + text[i] + ' 比對失敗，文字指標留在原位，試用較短的共同字首。', [row('文字', marked(text, i)), row('模式', marked(pattern, j)), row('pi', pi)], {i, j});
        }
        if (text[i] === pattern[j]) j++;
        trace.push('處理文字索引 ' + i, '已連續匹配 ' + j + ' 個字元。', [row('文字', marked(text, i)), row('模式', marked(pattern, -1, j - 1))], {i, j});
        if (j === pattern.length) {
          result.push(i - pattern.length + 1); j = pi[j - 1];
          trace.push('找到起點 ' + result.at(-1), '回到長度 ' + j + '，保留可能重疊的字首。', [row('已找到的起點', result)], {i, j});
        }
      }
      trace.push('比對完成', result.length ? '依序找到 ' + result.length + ' 個匹配。' : '文字掃描完畢，沒有完整匹配。', [row('起點', result)], {}, {result}); return trace.frames;
    }
  };

  const hash = (letters, base, modulus) => letters.reduce((value, char) => (value * base + char.codePointAt(0)) % modulus, 0);
  const hashFields = [field('base', 'base（1–257）', '31', 'number'), field('modulus', 'modulus（2–1009）', '101', 'number')];
  models['polynomial-hash'] = {
    title: '雜湊函數：每次接上一個字元', inputs: [field('text', '文字（最多 16 字元）', 'cat'), ...hashFields],
    presets: [preset('cat', {text: 'cat', base: 31, modulus: 101}), preset('ab 的小模數', {text: 'ab', base: 1, modulus: 7}), preset('ba 的小模數', {text: 'ba', base: 1, modulus: 7})],
    run(input) {
      const text = chars(input.text, 16), base = integer(input.base, 1, 257, 'base'), modulus = integer(input.modulus, 2, 1009, 'modulus'), trace = recorder(), history = []; let value = 0;
      trace.push('h 從 0 開始', '每個字元依序帶入 h=(h×base+碼點)%modulus。', [row('字串', text)], {base, modulus, h: value});
      text.forEach((char, i) => {
        const previous = value, point = char.codePointAt(0); value = (value * base + point) % modulus; history.push([char, point, previous, value]);
        trace.push('加入 ' + char, '(' + previous + '×' + base + '+' + point + ') % ' + modulus + ' = ' + value, [row('字串', marked(text, i))], {h: value}, {table: {columns: ['字元', '碼點', '原 h', '新 h'], rows: history}});
      });
      trace.push('雜湊值 ' + value, '查表時先用此值找槽位，再在槽位內比對原始鍵。', [row('h', [value])], {}, {result: value}); return trace.frames;
    }
  };

  models['rolling-hash'] = {
    title: '滾動雜湊：刪左、位移、加右', inputs: [field('text', '文字（最多 30 字元）', 'ababc'), field('pattern', '模式（最多 12 字元）', 'abc'), ...hashFields],
    presets: [preset('找到 abc', {text: 'ababc', pattern: 'abc', base: 31, modulus: 101}), preset('看見碰撞', {text: 'abac', pattern: 'ba', base: 1, modulus: 7}), preset('重疊', {text: 'aaaa', pattern: 'aa', base: 31, modulus: 101})],
    run(input) {
      const text = chars(input.text), pattern = chars(input.pattern, 12), base = integer(input.base, 1, 257, 'base'), modulus = integer(input.modulus, 2, 1009, 'modulus'), trace = recorder(), result = [], m = pattern.length;
      if (!m) { const positions = Array.from({length: text.length + 1}, (_, i) => i); trace.push('空模式匹配每個間隙', '依照介面定義回傳 0 到 n。', [row('起點', positions)], {}, {result: positions}); return trace.frames; }
      if (m > text.length) { trace.push('模式比文字長', '文字中沒有容得下整個模式的視窗。', [row('文字', text), row('模式', pattern)], {}, {result}); return trace.frames; }
      let high = 1; for (let i = 1; i < m; i++) high = high * base % modulus;
      const target = hash(pattern, base, modulus); let value = hash(text.slice(0, m), base, modulus);
      trace.push('建立第一個視窗', '目標雜湊為 ' + target + '，最左字元的權重為 ' + high + '。', [row('模式', pattern)], {target, high});
      for (let left = 0; left + m <= text.length; left++) {
        const window = text.slice(left, left + m), sameHash = value === target, sameText = sameHash && window.every((char, i) => char === pattern[i]);
        if (sameHash && sameText) result.push(left);
        trace.push('檢查起點 ' + left, sameHash ? (sameText ? '雜湊相同，逐字也相同，加入答案。' : '雜湊相同，但原字串不同；這次碰撞略過。') : '雜湊不同，移到下一個視窗。', [row('視窗', window), row('模式', pattern), row('已找到起點', result)], {left, h: value, 目標: target});
        if (left + m < text.length) {
          const old = value, removed = text[left].codePointAt(0) * high, tail = text[left + m].codePointAt(0);
          const withoutLeft = ((value - removed) % modulus + modulus) % modulus;
          value = (withoutLeft * base + tail) % modulus;
          trace.push('視窗右移一格', '先扣除最左字元的位權項，再乘 base、加入新字元 ' + text[left + m] + '。', [row('下一個視窗', text.slice(left + 1, left + m + 1))], {原h: old, 扣左後: withoutLeft, 新h: value});
        }
      }
      trace.push('搜尋完成', '所有雜湊相等的候選都已逐字確認。', [row('匹配起點', result)], {}, {result}); return trace.frames;
    }
  };

  models['suffix-array'] = {
    title: '後綴陣列：排名長度每輪加倍', inputs: [field('text', '文字（最多 16 字元）', 'banana')],
    presets: [preset('banana', {text: 'banana'}), preset('重複字元', {text: 'aaaaa'}), preset('空字串', {text: ''})],
    run(input) {
      const text = chars(input.text, 16), n = text.length, trace = recorder(); let sa = Array.from({length: n}, (_, i) => i), rank = text.map(c => c.codePointAt(0));
      trace.push('單字元作為起始排名', '每輪用前半與後半排名，排列兩倍長度的片段。', [row('字元', text), row('初始排名', rank)]);
      for (let width = 1; width < n; width *= 2) {
        const pair = i => [rank[i], i + width < n ? rank[i + width] : -1];
        sa.sort((i, j) => pair(i)[0] - pair(j)[0] || pair(i)[1] - pair(j)[1]);
        const next = Array(n).fill(0);
        for (let j = 1; j < n; j++) { const a = pair(sa[j - 1]), b = pair(sa[j]); next[sa[j]] = next[sa[j - 1]] + (a[0] !== b[0] || a[1] !== b[1] ? 1 : 0); }
        trace.push('比較長度 ' + width * 2 + ' 的片段', '相同 pair 共用排名，字尾之外用 −1 讓短後綴排在前面。', [row('依原索引的新排名', next)], {半段長度: width}, {table: {columns: ['起點', '後綴', '排名 pair', '新排名'], rows: sa.map(i => [i, text.slice(i).join(''), pair(i).join(', '), next[i]])}});
        rank = next; if (rank[sa[n - 1]] === n - 1) break;
      }
      trace.push('後綴順序完成', '輸出保存起點，相同字首的後綴會相鄰。', [row('後綴陣列', sa)], {}, {table: {columns: ['起點', '後綴'], rows: sa.map(i => [i, text.slice(i).join('')])}, result: sa}); return trace.frames;
    }
  };

  function labels(raw) {
    const text = String(raw ?? '').trim(); if (!text) return [];
    const items = text.split(/[,，]/).map(value => value.trim());
    if (items.length > 12 || items.some(value => !value || Array.from(value).length > 12)) throw Error('請填最多 12 筆標籤，每筆 1–12 字，以逗號分隔。');
    return items;
  }
  function drawTape(raw, needed) {
    const draws = numbers(raw, {min: 0, max: 1, whole: false, maxLength: 24});
    if (draws.some(value => value >= 1) || draws.length < needed) throw Error('請填至少 ' + needed + ' 個 0 ≤ u < 1 的抽籤值。');
    return draws;
  }
  const tapeValue = '0.8,0.2,0.6,0.1,0.9,0.4,0.7,0.3,0.5,0.15,0.85,0.25';
  models['fisher-yates'] = {
    title: 'Fisher–Yates：逐一確定最後的位置', inputs: [field('items', '資料標籤，逗號分隔', 'A,B,C,D'), field('draws', '抽籤值 u（0 ≤ u < 1）', tapeValue)],
    presets: [preset('四張牌', {items: 'A,B,C,D', draws: tapeValue}), preset('每次抽第一張', {items: 'A,B,C,D', draws: '0,0,0'}), preset('每次留在原位', {items: 'A,B,C,D', draws: '0.99,0.99,0.99'})],
    run(input) {
      const a = labels(input.items), draws = drawTape(input.draws, Math.max(0, a.length - 1)), trace = recorder(); let step = 0;
      trace.push('從最後一格開始', '抽籤清單讓每一步可以重播；第 i 格的候選是索引 0…i。', [row('資料', a)]);
      for (let i = a.length - 1; i > 0; i--) {
        const u = draws[step++], j = Math.floor(u * (i + 1));
        trace.push('在 0…' + i + ' 中抽到 ' + j, 'floor(' + u + '×' + (i + 1) + ')=' + j + '，將索引 ' + i + ' 與 ' + j + ' 交換。', [row('交換前', a.map((v, p) => ({text: v, state: p === i || p === j ? 'active' : p > i ? 'done' : ''})))], {i, j, u});
        [a[i], a[j]] = [a[j], a[i]];
        trace.push('確定位置 ' + i, '之後只處理左側尚未確定的部分。', [row('交換後', a.map((v, p) => ({text: v, state: p >= i ? 'done' : ''})))], {已確定位置: i});
      }
      trace.push('洗牌完成', '每一步的候選數依序是 n、n−1、…、2。', [row('結果', a)], {}, {result: a}); return trace.frames;
    }
  };

  models['weighted-moments'] = {
    title: '期望與變異數：按機率加權', inputs: [field('outcomes', '結果（整數）', '-3,0,5'), field('weights', '對應權重（非負整數）', '1,2,1')],
    presets: [preset('抽獎報酬', {outcomes: '-3,0,5', weights: '1,2,1'}), preset('固定結果', {outcomes: '5', weights: '1'}), preset('公平骰子', {outcomes: '1,2,3,4,5,6', weights: '1,1,1,1,1,1'})],
    run(input) {
      const outcomes = numbers(input.outcomes, {min: -100, max: 100, empty: false}), weights = numbers(input.weights, {min: 0, max: 100, empty: false}), trace = recorder();
      if (outcomes.length !== weights.length || weights.every(weight => !weight)) throw Error('每個結果各需一個權重，且權重總和需大於 0。');
      const total = weights.reduce((a, b) => a + b, 0), history = []; let mean = 0, variance = 0;
      const format = value => String(Number(value.toFixed(6)));
      trace.push('權重除以總和 ' + total, '每個結果的機率是它的權重占總權重的比例。', [row('結果', outcomes), row('權重', weights)], {總權重: total});
      for (let i = 0; i < outcomes.length; i++) {
        const probability = weights[i] / total, addition = probability * outcomes[i]; mean += addition;
        history.push([outcomes[i], weights[i] + '/' + total, format(addition), format(mean)]);
        trace.push('加入結果 ' + outcomes[i] + ' 的貢獻', '機率 × 結果 = ' + format(addition) + '。', [], {目前期望: format(mean)}, {table: {columns: ['結果', '機率', '本項貢獻', '累計期望'], rows: history}});
      }
      const varianceRows = [];
      for (let i = 0; i < outcomes.length; i++) {
        const difference = outcomes[i] - mean, addition = weights[i] / total * difference * difference; variance += addition;
        varianceRows.push([outcomes[i], format(difference), format(addition)]);
        trace.push('計算離平均的平方距離', '結果 ' + outcomes[i] + ' 對變異數貢獻 ' + format(addition) + '。', [], {期望: format(mean), 目前變異數: format(variance)}, {table: {columns: ['結果', '離平均距離', '加權平方距離'], rows: varianceRows}});
      }
      trace.push('分布計算完成', '期望描述加權平均，變異數描述結果在平均周圍的波動。', [], {期望: format(mean), 變異數: format(variance)}, {result: {mean, variance}}); return trace.frames;
    }
  };

  models['reservoir-sampling'] = {
    title: '水塘取樣：串流抵達時保留 k 筆', inputs: [field('items', '抵達資料，逗號分隔', 'A,B,C,D,E'), field('k', '保留筆數 k（0–12）', '2', 'number'), field('draws', '抽籤值 u（0 ≤ u < 1）', '0.5,0.9,0.1,0.8,0.2,0.6,0.4,0.7,0.3,0.5,0.15,0.85')],
    presets: [preset('五筆保留兩筆', {items: 'A,B,C,D,E', k: 2, draws: '0.5,0.9,0.1'}), preset('保留一筆', {items: 'A,B,C,D', k: 1, draws: '0.1,0.8,0.2'}), preset('資料少於容量', {items: 'A,B', k: 4, draws: ''})],
    run(input) {
      const items = labels(input.items), k = integer(input.k, 0, 12, 'k'), draws = drawTape(input.draws, k ? Math.max(0, items.length - k) : 0), trace = recorder(), sample = []; let step = 0;
      trace.push('準備容量 ' + k + ' 的水塘', '前 k 筆直接加入，之後每筆都抽索引 0…i。', [row('串流', items), row('水塘', sample)], {k});
      items.forEach((item, i) => {
        if (i < k) { sample.push(item); trace.push('加入 ' + item, '水塘還有空位，直接放進來。', [row('串流', marked(items, i)), row('水塘', sample)], {已看筆數: i + 1}); }
        else if (k) {
          const u = draws[step++], j = Math.floor(u * (i + 1)), replaced = j < k ? sample[j] : null;
          if (j < k) sample[j] = item;
          trace.push('第 ' + (i + 1) + ' 筆抽到 j=' + j, j < k ? item + ' 取代水塘位置 ' + j + ' 的 ' + replaced + '。' : 'j 已超出水塘位置，這筆略過。', [row('串流', marked(items, i)), row('水塘', sample)], {已看筆數: i + 1, j, u, 本筆入選率: k + '/' + (i + 1)});
        }
      });
      trace.push('取樣完成', k === 0 ? '容量為 0，結果為空樣本。' : '串流掃描結束，保留 ' + sample.length + ' 筆資料。', [row('樣本', sample)], {}, {result: sample}); return trace.frames;
    }
  };

  models['rejection-sampling'] = {
    title: '拒絕取樣：每個答案分到相同數量的來源', inputs: [field('bound', '目標個數 bound（1–7）', '5', 'number'), field('draws', 'rand7 抽籤序列（1–7）', '7,6,3,1,5,7,2,4')],
    presets: [preset('七轉五', {bound: 5, draws: '7,6,3,1,5,7,2,4'}), preset('七轉三', {bound: 3, draws: '1,2,3,4,5,6,7'}), preset('全部被拒絕', {bound: 5, draws: '6,7,7,6'})],
    run(input) {
      const bound = integer(input.bound, 1, 7, 'bound'), draws = numbers(input.draws, {min: 1, max: 7, maxLength: 24}), usable = Math.floor(7 / bound) * bound, trace = recorder(), samples = []; let rejected = 0;
      trace.push('接受 1…' + usable, '接受區間含 ' + usable + ' 個值，可以平均分給 ' + bound + ' 個答案。', [row('來源值', Array.from({length: 7}, (_, i) => ({text: String(i + 1), state: i < usable ? '' : 'muted'})))], {接受率: usable + '/7'});
      draws.forEach((raw, i) => {
        if (raw <= usable) samples.push((raw - 1) % bound); else rejected++;
        trace.push('抽到 ' + raw, raw <= usable ? '接受，(' + raw + '−1) % ' + bound + ' = ' + samples.at(-1) + '。' : '這個來源位於多出的尾段，略過並讀下一次抽籤。', [row('候選序列', marked(draws, i)), row('已接受樣本', samples)], {已處理抽籤: i + 1, 拒絕次數: rejected});
      });
      trace.push('清單處理完成', '這份抽籤清單產生 ' + samples.length + ' 個樣本；每個合法結果有相同數量的來源值。', [row('樣本', samples)], {拒絕次數: rejected}, {result: {samples, rejected}}); return trace.frames;
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = models;
  else root.TopicModels = Object.assign(root.TopicModels || {}, models);
})(typeof globalThis !== 'undefined' ? globalThis : this);
