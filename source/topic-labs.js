/* Shared controls and visuals for model-provided traces. */
(function () {
  'use strict';

  const models = window.TopicModels || {};
  const players = [];
  const defaultNodeHeight = 18;
  const nodeStates = {active: '目前', done: '已處理', muted: '淡化'};

  // Each group shares a zero baseline and scale across its frames.
  const valueSeries = {
    'prefix-sum': [['資料'], ['prefix']],
    'matrix-cost': [['這一列成本']],
    'monotonic-queue': [['資料', '候選值', '各窗最大值', '最大值']],
    'recursion-sum': [['資料', '這層區間']],
    'segment-tree': [['原數列', '修改後']],
    'fenwick-tree': [['數列', '修改後'], ['BIT 總和', 'BIT']],
    'insertion-sort': [['陣列', '結果']],
    'merge-sort': [['輸入', '左段', '右段', '已合併', '結果']],
    'inversion-count': [['輸入', '有序片段', '已合併', '原始輸入']],
    'counting-sort': [['計數／邊界']],
    'bucket-sort': [['輸入', '結果']],
    'radix-sort': [['陣列', '結果']],
    quickselect: [['候選', '較小', '相等', '較大', '答案']],
    'pascal-combinations': [['組合數', '最後一列']],
    'weighted-moments': [['結果'], ['權重']],
    'minimax-tree': [['葉分數']],
    'sweep-line': [['淨變化']]
  };

  function element(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = String(value);
    return node;
  }

  function svgElement(tag, attributes) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes || {})) {
      node.setAttribute(key, String(value));
    }
    return node;
  }

  function svgText(text, attributes) {
    const node = svgElement('text', attributes);
    node.textContent = text;
    return node;
  }

  function display(value) {
    return typeof value === 'object' ? JSON.stringify(value) : value;
  }

  function cellData(value) {
    return value && typeof value === 'object' && 'text' in value ? value : {text: display(value)};
  }

  function numericCell(value) {
    const text = cellData(value).text;
    if (typeof text === 'number') return Number.isFinite(text) ? text : null;
    if (typeof text !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return null;
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
  }

  function seriesScales(model, frames) {
    const scales = new Map();
    for (const labels of valueSeries[model] || []) {
      const scale = {min: 0, max: 0};
      for (const label of labels) scales.set(label, scale);
    }
    for (const frame of frames) {
      for (const row of frame.rows || []) {
        const scale = scales.get(row.label);
        if (!scale) continue;
        for (const cell of row.cells) {
          const number = numericCell(cell);
          if (number === null) continue;
          scale.min = Math.min(scale.min, number);
          scale.max = Math.max(scale.max, number);
        }
      }
    }
    return scales;
  }

  function scrollRegion(className, label) {
    const wrapper = element('div', className);
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', label);
    return wrapper;
  }

  function drawRow(row, previous, scale) {
    const group = element('div', 'topic-data-row');
    const label = element('strong', 'topic-row-label', row.label);
    const list = element('ol', 'topic-cells');
    list.setAttribute('role', 'list');
    list.setAttribute('aria-label', row.label);
    const numbers = scale && row.cells.map(numericCell);
    const bars = numbers && numbers.length > 1 && numbers.every(value => value !== null);
    const span = bars ? scale.max - scale.min || 1 : 1;
    if (bars) {
      const zero = scale.max === 0 && scale.min === 0 ? 100 : scale.max / span * 100;
      list.classList.add('topic-bars');
      list.style.setProperty('--bar-count', numbers.length);
      list.style.setProperty('--bar-zero', zero + '%');
    }
    for (const [index, raw] of row.cells.entries()) {
      const value = cellData(raw);
      const before = previous && index < previous.cells.length ? cellData(previous.cells[index]) : null;
      const changed = before && before.text !== value.text;
      const item = element('li', value.state || '');
      item.classList.toggle('topic-changed', !!changed);
      item.append(element('span', 'topic-cell-value', value.text));
      if (value.state && nodeStates[value.state]) {
        item.append(element('span', 'sr-only', '（' + nodeStates[value.state] + '）'));
      }
      if (bars) {
        const number = numbers[index];
        const prior = changed ? numericCell(before) : null;
        const track = element('span', 'topic-bar-track');
        track.setAttribute('aria-hidden', 'true');
        const bar = element('span', 'topic-bar');
        if (number < 0) bar.classList.add('is-negative');
        const height = Math.abs(number) / span * 100;
        const start = prior === null ? height : Math.sign(prior) === Math.sign(number) ? Math.abs(prior) / span * 100 : 0;
        bar.style.setProperty('--bar-size', height + '%');
        bar.style.setProperty('--bar-start', start + '%');
        if (!number) bar.hidden = true;
        track.append(bar);
        const position = element('span', 'topic-bar-index', index);
        position.setAttribute('aria-hidden', 'true');
        item.append(track, position);
      }
      list.append(item);
    }
    if (!row.cells.length) list.append(element('li', 'empty', '空'));
    group.append(label);
    if (bars) {
      const scroller = scrollRegion('topic-bar-scroll', row.label + '數值圖');
      scroller.append(list);
      group.append(scroller);
    } else {
      group.append(list);
    }
    return group;
  }

  function drawTable(data, previous, title) {
    const table = element('table');
    const caption = element('caption', 'sr-only', title);
    const head = element('thead');
    const headings = element('tr');
    for (const name of data.columns) {
      const th = element('th', null, name);
      th.scope = 'col';
      headings.append(th);
    }
    head.append(headings);
    const sameColumns = previous && data.columns.length === previous.columns.length &&
      data.columns.every((column, i) => previous.columns[i] === column);
    const oldRows = new Map(sameColumns ? previous.rows.map(row => [display(row[0]), row]) : []);
    const body = element('tbody');
    for (const values of data.rows) {
      const row = element('tr');
      const before = oldRows.get(display(values[0]));
      values.forEach((value, i) => {
        const cell = element(i === 0 ? 'th' : 'td', null, display(value));
        if (i === 0) cell.scope = 'row';
        if (before && display(before[i]) !== display(value)) cell.classList.add('topic-changed');
        row.append(cell);
      });
      body.append(row);
    }
    table.append(caption, head, body);
    return table;
  }

  function nodeSize(label, height = defaultNodeHeight) {
    const width = [...label].reduce((sum, char) => sum + (char.codePointAt(0) > 255 ? 15 : 9), 0);
    return Math.max(height, (width + height * .8) / 2);
  }

  // Intersect the track with the rounded end of the node instead of drawing through its label.
  function nodeEndpoint(node, target, gap = 2) {
    const dx = target.x - node.x;
    const dy = target.y - node.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const shoulder = node.halfWidth - node.halfHeight;
    const top = node.halfHeight / Math.abs(uy);
    const horizontal = top * Math.abs(ux);
    const curved = shoulder * Math.abs(ux) + Math.sqrt(Math.max(0, node.halfHeight ** 2 - (shoulder * uy) ** 2));
    const distance = (horizontal <= shoulder ? top : curved) + gap;
    return {x: node.x + ux * distance, y: node.y + uy * distance};
  }

  function layoutGraph(data, compact) {
    const halfHeight = compact ? 10 : defaultNodeHeight;
    const nodes = new Map((data.nodes || []).map(source => {
      const id = String(source.id);
      const label = String(source.label ?? id);
      return [id, {...source, id, label, halfWidth: nodeSize(label, halfHeight), halfHeight}];
    }));
    const limits = {left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity};
    function include(x, y, padX, padY) {
      limits.left = Math.min(limits.left, x - padX);
      limits.right = Math.max(limits.right, x + padX);
      limits.top = Math.min(limits.top, y - padY);
      limits.bottom = Math.max(limits.bottom, y + padY);
    }
    for (const node of nodes.values()) {
      include(node.x, node.y, node.halfWidth + 8, node.halfHeight + 8);
    }
    const center = (limits.top + limits.bottom) / 2;
    const groups = new Map();
    for (const edge of data.edges || []) {
      const from = nodes.get(String(edge.from));
      const to = nodes.get(String(edge.to));
      if (!from || !to) continue;
      const pairKey = JSON.stringify([from.id, to.id].sort());
      if (!groups.has(pairKey)) groups.set(pairKey, []);
      groups.get(pairKey).push({...edge, from, to});
    }
    const edges = [];
    for (const group of groups.values()) {
      group.forEach((edge, lane) => {
        const {from, to} = edge;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.hypot(dx, dy);
        if (!distance) {
          const side = from.y > center ? 1 : -1;
          const height = (49 + lane * 20) * side;
          const reach = from.halfWidth + 17 + lane * 7;
          const start = nodeEndpoint(from, {x: from.x - reach, y: from.y + height});
          const end = nodeEndpoint(to, {x: to.x + reach, y: to.y + height});
          const left = from.x - reach;
          const right = from.x + reach;
          const tip = from.y + height;
          edge.path = 'M ' + start.x + ' ' + start.y + ' C ' + left + ' ' + tip + ' ' + right + ' ' + tip + ' ' + end.x + ' ' + end.y;
          edge.labelX = from.x;
          edge.labelY = (start.y + 3 * tip) / 4 + side * 6;
          include(from.x, tip, reach, 8);
        } else {
          const direction = from.id < to.id ? 1 : -1;
          const gap = (lane - (group.length - 1) / 2) * 58 * direction;
          const control = {
            x: (from.x + to.x) / 2 - dy / distance * gap,
            y: (from.y + to.y) / 2 + dx / distance * gap
          };
          const start = nodeEndpoint(from, control);
          const end = nodeEndpoint(to, control);
          edge.path = 'M ' + start.x + ' ' + start.y + ' Q ' + control.x + ' ' + control.y + ' ' + end.x + ' ' + end.y;
          edge.labelX = (start.x + 2 * control.x + end.x) / 4 + dy / distance * 8 * direction;
          edge.labelY = (start.y + 2 * control.y + end.y) / 4 - dx / distance * 8 * direction;
          include(control.x, control.y, 5, 5);
        }
        if (edge.label !== undefined) {
          include(edge.labelX, edge.labelY, nodeSize(String(edge.label)), 11);
        }
        edges.push(edge);
      });
    }
    return {nodes, edges, limits, compact};
  }

  function fitGraph(graphs) {
    const limits = graphs.filter(graph => graph?.nodes.size).map(graph => graph.limits);
    if (!limits.length) return '0 0 400 180';
    const left = Math.min(...limits.map(box => box.left));
    const right = Math.max(...limits.map(box => box.right));
    const top = Math.min(...limits.map(box => box.top));
    const bottom = Math.max(...limits.map(box => box.bottom));
    const width = Math.max(330, right - left + 32);
    const height = Math.max(188, bottom - top + 24);
    return [(left + right - width) / 2, (top + bottom - height) / 2, width, height].join(' ');
  }

  function edgeDescription(edge) {
    const {from, to, directed, label, state} = edge;
    return from.label + (directed ? ' → ' : ' — ') + to.label +
      (label === undefined ? '' : '（' + label + '）') +
      (state && nodeStates[state] ? '，' + nodeStates[state] : '');
  }

  function drawGraph(graph, title, prefix, viewBox) {
    const svg = svgElement('svg', {viewBox, role: 'img', 'aria-label': title, 'aria-describedby': prefix + '-description'});
    const description = svgElement('desc', {id: prefix + '-description'});
    const nodes = [...graph.nodes.values()];
    description.textContent = [
      '節點 ' + nodes.map(node => node.label + (node.state ? '（' + (nodeStates[node.state] || node.state) + '）' : '')).join('、'),
      graph.edges.map(edgeDescription).join('；')
    ].filter(Boolean).join('。');
    svg.append(description);
    const defs = svgElement('defs');
    for (const state of ['plain', 'active', 'done', 'muted']) {
      const marker = svgElement('marker', {id: prefix + '-arrow-' + state, viewBox: '0 0 9 10', refX: 9, refY: 5, markerWidth: 9, markerHeight: 10, markerUnits: 'userSpaceOnUse', orient: 'auto'});
      marker.append(svgElement('path', {d: 'M0 0 L9 5 L0 10z', class: 'topic-arrow ' + state}));
      defs.append(marker);
    }
    svg.append(defs);
    const edges = svgElement('g');
    const labels = svgElement('g');
    graph.edges.forEach((edge, index) => {
      const properties = {'data-trace-edge': index, class: 'topic-edge ' + (edge.state || '')};
      const line = svgElement('path', {...properties, d: edge.path, fill: 'none'});
      if (edge.directed) {
        const state = nodeStates[edge.state] ? edge.state : 'plain';
        line.setAttribute('marker-end', 'url(#' + prefix + '-arrow-' + state + ')');
      }
      edges.append(line);
      if (edge.label !== undefined) {
        labels.append(svgText(String(edge.label), {...properties, class: 'topic-edge-label', x: edge.labelX, y: edge.labelY}));
      }
    });
    svg.append(edges, labels);
    for (const node of nodes) {
      const group = svgElement('g', {
        class: 'topic-node ' + (node.state || '') + (graph.compact ? ' is-compact' : ''),
        'data-topic-node': node.id,
        transform: 'translate(' + node.x + ' ' + node.y + ')'
      });
      group.append(
        svgElement('rect', {class: 'topic-node-ring', x: -node.halfWidth - 5, y: -node.halfHeight - 5, width: 2 * node.halfWidth + 10, height: 2 * node.halfHeight + 10, rx: node.halfHeight + 5}),
        svgElement('rect', {class: 'topic-node-body', x: -node.halfWidth, y: -node.halfHeight, width: 2 * node.halfWidth, height: 2 * node.halfHeight, rx: node.halfHeight}),
        svgText(node.label, {'text-anchor': 'middle', 'dominant-baseline': 'central'})
      );
      svg.append(group);
    }
    return svg;
  }

  function updateGraphSelection(plot, layout, selected) {
    const connected = new Set([selected]);
    const edges = new Set();
    const related = [];
    layout.edges.forEach((edge, index) => {
      if (edge.from.id !== selected && edge.to.id !== selected) return;
      edges.add(String(index));
      connected.add(edge.from.id);
      connected.add(edge.to.id);
      related.push(edgeDescription(edge));
    });
    plot.classList.toggle('has-selection', selected !== '');
    for (const node of plot.querySelectorAll('[data-topic-node]')) {
      node.classList.toggle('is-linked', connected.has(node.dataset.topicNode));
      node.classList.toggle('is-selected', node.dataset.topicNode === selected);
    }
    for (const edge of plot.querySelectorAll('[data-trace-edge]')) {
      edge.classList.toggle('is-linked', edges.has(edge.dataset.traceEdge));
    }
    return related;
  }

  const controlIcons = {
    prev: 'M14 5 7 12l7 7',
    next: 'm10 5 7 7-7 7',
    play: 'M8 5v14l11-7z',
    pause: 'M9 5v14m6-14v14',
    reset: 'M5 6v5h5M5.5 11a7 7 0 1 1 1 6',
    quiz: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Zm10-2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z'
  };

  function buttonLabel(button, action, label) {
    const icon = svgElement('svg', {viewBox: '0 0 24 24', 'aria-hidden': 'true'});
    icon.append(svgElement('path', {d: controlIcons[action]}));
    button.replaceChildren(icon, element('span', '', label));
  }

  function init(panel, index) {
    const key = panel.dataset.model;
    const model = models[key];
    if (!model) return;

    const prefix = panel.id || 'topic-scene-' + key + '-' + index;
    panel.id = prefix;
    panel.classList.add('is-ready');
    panel.setAttribute('role', 'region');
    const title = element('h4', 'topic-lab-title', model.title);
    title.id = prefix + '-title';
    panel.setAttribute('aria-labelledby', title.id);
    const header = element('header', 'topic-lab-header');
    header.append(title);

    const presets = element('div', 'topic-presets');
    presets.setAttribute('role', 'group');
    presets.setAttribute('aria-label', '範例輸入');
    const presetList = [];
    for (const preset of model.presets || []) {
      const button = element('button', null, preset.label);
      button.type = 'button';
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        for (const [name, value] of Object.entries(preset.values)) {
          if (fields.has(name)) fields.get(name).value = value;
        }
        applyInput();
      });
      presets.append(button);
      presetList.push({preset, button});
    }
    if (presetList.length) header.append(presets);

    const settings = element('details', 'topic-settings');
    const summary = element('summary', null, '調整輸入');
    const form = element('form', 'topic-inputs');
    form.noValidate = true;
    form.setAttribute('aria-labelledby', title.id);
    const fields = new Map();
    for (const definition of model.inputs) {
      const field = element('div', 'topic-field');
      const label = element('label', null, definition.label);
      const input = element('input');
      input.id = prefix + '-' + definition.name;
      label.htmlFor = input.id;
      input.name = definition.name;
      input.type = definition.type || 'text';
      input.value = definition.value;
      input.spellcheck = false;
      input.autocapitalize = 'none';
      input.setAttribute('autocorrect', 'off');
      if (input.type === 'number') input.step = 'any';
      field.append(label, input);
      form.append(field);
      fields.set(definition.name, input);
    }
    const apply = element('button', 'topic-apply', '套用輸入');
    apply.type = 'submit';
    const error = element('p', 'topic-error');
    error.id = prefix + '-error';
    error.hidden = true;
    error.tabIndex = -1;
    error.setAttribute('role', 'alert');
    form.append(apply, error);
    settings.append(summary, form);

    const controls = element('div', 'topic-controls');
    const transport = element('div', 'topic-transport');
    transport.setAttribute('role', 'group');
    transport.setAttribute('aria-label', '播放控制');
    const buttons = {};
    for (const [action, label] of [['prev', '上一步'], ['play', '播放'], ['next', '下一步'], ['reset', '重設']]) {
      const button = element('button');
      button.type = 'button';
      button.dataset.topicAction = action;
      buttonLabel(button, action, label);
      buttons[action] = button;
      transport.append(button);
    }
    const quizBtn = element('button', 'topic-quiz-toggle');
    quizBtn.type = 'button';
    quizBtn.dataset.topicAction = 'quiz';
    quizBtn.setAttribute('aria-pressed', 'false');
    quizBtn.setAttribute('aria-label', '先猜這步，遮住說明');
    buttonLabel(quizBtn, 'quiz', '先猜');
    buttons.quiz = quizBtn;
    transport.append(quizBtn);
    const speedLabel = element('label', 'topic-speed-label');
    speedLabel.append(element('span', '', '速度'));
    const speed = element('select', 'topic-speed');
    speed.id = prefix + '-speed';
    speedLabel.htmlFor = speed.id;
    for (const [value, label] of [['1200', '慢'], ['700', '中'], ['300', '快']]) {
      const option = element('option', null, label);
      option.value = value;
      speed.append(option);
    }
    speed.value = '700';
    speedLabel.append(speed);
    transport.append(speedLabel);
    const scrubber = element('div', 'topic-scrubber');
    const range = element('input', 'topic-timeline');
    range.type = 'range';
    range.min = '0';
    range.step = '1';
    range.value = '0';
    range.setAttribute('aria-label', model.title + '步驟');
    const position = element('span', 'topic-position');
    position.setAttribute('aria-hidden', 'true');
    scrubber.append(range, position);
    controls.append(transport, scrubber);

    const stage = element('div', 'topic-stage');
    const visual = element('div', 'topic-visual');
    const graphArea = element('div', 'topic-graph');
    const graphScroll = scrollRegion('topic-graph-scroll', model.title + '圖形');
    const graphTools = element('div', 'topic-graph-tools');
    const nodeLabel = element('label', 'topic-node-label', '追蹤節點');
    const nodeSelect = element('select', 'topic-node-select');
    nodeSelect.id = prefix + '-node';
    nodeLabel.htmlFor = nodeSelect.id;
    nodeLabel.append(nodeSelect);
    const zoom = element('button', 'topic-zoom', '放大圖形');
    zoom.type = 'button';
    zoom.setAttribute('aria-pressed', 'false');
    graphTools.append(nodeLabel, zoom);
    const traceLabel = element('p', 'topic-trace-label');
    traceLabel.setAttribute('role', 'status');
    graphArea.append(graphScroll, graphTools, traceLabel);
    const table = scrollRegion('topic-table-scroll', model.title + '資料表');
    const primaryRows = element('div', 'topic-primary-rows');
    visual.append(graphArea, table, primaryRows);

    const narrative = element('div', 'topic-narrative');
    const phase = element('h5', 'topic-phase');
    const revealBtn = element('button', 'topic-quiz-reveal', '先想這一步會怎麼變，點我看說明');
    revealBtn.type = 'button';
    revealBtn.hidden = true;
    const explanation = element('p', 'topic-explanation');
    explanation.setAttribute('role', 'status');
    explanation.setAttribute('aria-live', 'polite');
    explanation.setAttribute('aria-atomic', 'true');
    const vars = element('dl', 'topic-vars');
    narrative.append(phase, revealBtn, explanation, vars);
    const supportingRows = element('div', 'topic-supporting-rows');
    stage.append(visual, narrative, supportingRows);
    panel.append(header, controls, stage, settings);

    let frames = [];
    let graphs = [];
    let graphBox = '';
    let barScales = new Map();
    let selected = '';
    let lastOptions = '';
    let step = 0;
    let timer = null;
    let quizMode = false;
    let revealed = false;

    function syncQuiz() {
      const hide = quizMode && !revealed;
      explanation.classList.toggle('is-quiz-hidden', hide);
      revealBtn.hidden = !hide;
      quizBtn.setAttribute('aria-pressed', String(quizMode));
    }

    function stop() {
      explanation.setAttribute('aria-live', 'polite');
      traceLabel.setAttribute('aria-live', 'polite');
      if (timer !== null) clearTimeout(timer);
      timer = null;
      buttonLabel(buttons.play, 'play', '播放');
      buttons.play.setAttribute('aria-pressed', 'false');
      panel.dataset.playing = 'false';
    }

    function showSelection() {
      const graph = graphs[step];
      const svg = graphScroll.firstElementChild;
      if (!graph?.nodes.size || !svg) return;
      const related = updateGraphSelection(svg, graph, selected);
      traceLabel.hidden = selected === '';
      if (selected !== '') {
        const text = related.length ? related.join(' · ') : graph.nodes.get(selected).label + ' 沒有相連的邊';
        if (traceLabel.textContent !== text) traceLabel.textContent = text;
      }
    }

    function renderGraph(graph, frameTitle) {
      graphArea.hidden = !graph;
      if (!graph) return;
      graphTools.hidden = !graph.nodes.size;
      if (!graph.nodes.size) {
        graphScroll.replaceChildren(element('p', 'topic-empty', '空圖'));
        traceLabel.hidden = true;
        return;
      }
      const nodes = [...graph.nodes.values()];
      const optionsKey = JSON.stringify(nodes.map(node => [node.id, node.label]));
      if (optionsKey !== lastOptions) {
        const all = element('option', null, '全部節點');
        all.value = '';
        nodeSelect.replaceChildren(all, ...nodes.map(node => {
          const option = element('option', null, node.label);
          option.value = node.id;
          return option;
        }));
        lastOptions = optionsKey;
      }
      if (!graph.nodes.has(selected)) selected = '';
      nodeSelect.value = selected;
      nodeSelect.disabled = !nodes.length;
      graphScroll.replaceChildren(drawGraph(graph, frameTitle, prefix, graphBox));
      showSelection();
    }

    function render() {
      const frame = frames[step];
      if (!frame) return;
      const previous = frames[step - 1];
      const end = frames.length - 1;
      panel.dataset.step = String(step);
      panel.dataset.done = String(step === end);
      range.max = String(end);
      range.value = String(step);
      range.style.setProperty('--topic-progress', (end ? step / end * 100 : 0) + '%');
      position.textContent = (step + 1) + ' / ' + frames.length;
      range.setAttribute('aria-valuetext', position.textContent + '，' + frame.title);
      buttons.prev.disabled = step === 0;
      buttons.next.disabled = step === end;
      buttons.play.disabled = end === 0;
      phase.textContent = frame.title;
      explanation.textContent = frame.explanation;
      const stats = Object.entries(frame.vars || {});
      vars.hidden = !stats.length;
      vars.replaceChildren(...stats.map(([name, value]) => {
        const group = element('div');
        group.classList.toggle('topic-changed', Object.hasOwn(previous?.vars || {}, name) && display(previous.vars[name]) !== display(value));
        group.append(element('dt', null, name), element('dd', null, display(value)));
        return group;
      }));

      const graph = graphs[step];
      renderGraph(graph, frame.title);
      table.hidden = !frame.table;
      if (frame.table) table.replaceChildren(drawTable(frame.table, previous?.table, frame.title));
      const previousRows = new Map((previous?.rows || []).map(row => [row.label, row]));
      const rows = (frame.rows || []).map(row => drawRow(row, previousRows.get(row.label), barScales.get(row.label)));
      const hasMainFigure = !!(graph || frame.table);
      primaryRows.replaceChildren(...(hasMainFigure ? [] : rows));
      primaryRows.hidden = hasMainFigure || !rows.length;
      supportingRows.replaceChildren(...(hasMainFigure ? rows : []));
      supportingRows.hidden = !hasMainFigure || !rows.length;
      visual.dataset.kind = graph ? 'graph' : frame.table ? 'table' : 'sequence';
      visual.hidden = !hasMainFigure && !rows.length;
      stage.classList.toggle('topic-narrative-only', visual.hidden);
      syncQuiz();
      if (step === end) stop();
    }

    function clearError() {
      error.hidden = true;
      form.removeAttribute('aria-describedby');
      for (const input of fields.values()) {
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
      }
    }

    function applyInput(focusError = true) {
      stop();
      const values = Object.fromEntries([...fields].map(([name, input]) => [name, input.value]));
      let next;
      try {
        next = model.run(values);
        if (!Array.isArray(next) || !next.length) throw Error('這組輸入沒有可播放的步驟。');
      } catch (err) {
        clearError();
        const invalid = fields.get(err.field);
        error.textContent = err.message;
        error.hidden = false;
        form.setAttribute('aria-describedby', error.id);
        if (invalid) {
          invalid.setAttribute('aria-invalid', 'true');
          invalid.setAttribute('aria-describedby', error.id);
        }
        if (focusError) (invalid || error).focus();
        return;
      }
      clearError();
      frames = next;
      graphs = frames.map(frame => frame.graph && layoutGraph(frame.graph, key === 'sweep-line'));
      graphBox = fitGraph(graphs);
      barScales = seriesScales(key, frames);
      selected = '';
      step = 0;
      revealed = false;
      const chosen = presetList.find(({preset}) => Object.entries(preset.values).every(([name, value]) => values[name] === String(value)));
      for (const entry of presetList) entry.button.setAttribute('aria-pressed', String(entry === chosen));
      render();
    }

    function tick() {
      if (document.hidden || panel.closest('[hidden]') || step >= frames.length - 1) {
        stop();
        return;
      }
      step++;
      revealed = false;
      // Allow the last frame's explanation to be announced when playback ends.
      if (step === frames.length - 1) explanation.setAttribute('aria-live', 'polite');
      render();
      if (step < frames.length - 1) timer = setTimeout(tick, Number(speed.value));
    }

    function goTo(value) {
      stop();
      step = value;
      revealed = false;
      render();
    }

    buttons.prev.addEventListener('click', () => goTo(Math.max(0, step - 1)));
    buttons.next.addEventListener('click', () => goTo(Math.min(frames.length - 1, step + 1)));
    buttons.reset.addEventListener('click', () => goTo(0));
    quizBtn.addEventListener('click', () => {
      quizMode = !quizMode;
      revealed = false;
      syncQuiz();
    });
    revealBtn.addEventListener('click', () => {
      revealed = true;
      syncQuiz();
    });
    panel.addEventListener('keydown', event => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target.closest('input, select, textarea, button, a, .topic-table-scroll, .topic-graph-scroll, .topic-bar-scroll')) return;
      if (event.key === 'ArrowLeft' && step > 0) {
        event.preventDefault();
        goTo(step - 1);
      } else if (event.key === 'ArrowRight' && step < frames.length - 1) {
        event.preventDefault();
        goTo(step + 1);
      }
    });
    buttons.play.addEventListener('click', () => {
      if (timer !== null) {
        stop();
        return;
      }
      if (step === frames.length - 1) {
        step = 0;
        render();
      }
      explanation.setAttribute('aria-live', 'off');
      traceLabel.setAttribute('aria-live', 'off');
      buttonLabel(buttons.play, 'pause', '暫停');
      buttons.play.setAttribute('aria-pressed', 'true');
      panel.dataset.playing = 'true';
      timer = setTimeout(tick, Number(speed.value));
    });
    speed.addEventListener('change', () => {
      if (timer === null) return;
      clearTimeout(timer);
      timer = setTimeout(tick, Number(speed.value));
    });
    range.addEventListener('input', () => goTo(Number(range.value)));
    form.addEventListener('submit', event => {
      event.preventDefault();
      applyInput();
    });
    form.addEventListener('input', () => {
      clearError();
      for (const {button} of presetList) button.setAttribute('aria-pressed', 'false');
    });
    nodeSelect.addEventListener('change', () => {
      selected = nodeSelect.value;
      showSelection();
    });
    graphScroll.addEventListener('click', event => {
      const node = event.target.closest('[data-topic-node]');
      if (!node) return;
      selected = selected === node.dataset.topicNode ? '' : node.dataset.topicNode;
      nodeSelect.value = selected;
      showSelection();
    });
    zoom.addEventListener('click', () => {
      const enlarged = graphScroll.classList.toggle('is-zoomed');
      zoom.setAttribute('aria-pressed', String(enlarged));
      zoom.textContent = enlarged ? '縮小圖形' : '放大圖形';
      if (!enlarged) graphScroll.scrollLeft = 0;
    });

    applyInput(false);
    players.push({panel, stop});
  }

  document.querySelectorAll('.topic-lab[data-model]').forEach(init);
  for (const event of ['hashchange', 'beforeprint']) window.addEventListener(event, () => players.forEach(player => player.stop()));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) players.forEach(player => player.stop());
  });
  document.addEventListener('course:route', () => players.forEach(player => player.stop()));
  window.TopicPlayers = {models, players};
})();
