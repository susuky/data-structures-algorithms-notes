(function () {
  'use strict';
  const data = JSON.parse(document.getElementById('category-meta').textContent);
  const input = document.getElementById('category-search');
  const select = document.getElementById('category-group-filter');
  const count = document.getElementById('category-count');
  const empty = document.getElementById('category-empty');

  for (const name of new Set(data.map(item => item.group))) {
    const option = document.createElement('option');
    option.value = name; option.textContent = name; select.append(option);
  }
  function filter() {
    const terms = input.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    let total = 0;
    document.querySelectorAll('.category-grid li').forEach(item => {
      const match = (!select.value || item.dataset.group === select.value)
        && terms.every(term => item.dataset.keywords.toLocaleLowerCase().includes(term));
      item.hidden = !match;
      if (match) total++;
    });
    document.querySelectorAll('.category-group').forEach(group => {
      group.hidden = ![...group.querySelectorAll('.category-grid li')].some(item => !item.hidden);
    });
    count.textContent = total + ' / ' + data.length + ' 類';
    empty.hidden = total > 0;
  }
  input.addEventListener('input', filter);
  select.addEventListener('change', filter);
  document.getElementById('category-filter-form').addEventListener('submit', event => {
    event.preventDefault(); filter();
  });

  const lessons = new Map();
  const experiments = new Map();
  for (const item of data) {
    const heading = document.getElementById(item.lesson);
    if (!heading) continue;
    heading.dataset.syllabus = (heading.dataset.syllabus || '') + ' ' + item.name + ' ' + item.label;
    if (!lessons.has(heading)) lessons.set(heading, { names: [], panels: [] });
    const lesson = lessons.get(heading);
    lesson.names.push(item.name);
    const unit = heading.closest('.lesson-unit');
    const panel = unit && [...unit.querySelectorAll('[data-model], [data-lab]')]
      .find(element => (element.dataset.model || element.dataset.lab) === item.model);
    if (panel) {
      if (!panel.id) panel.id = 'category-lab-' + item.lesson + '-' + item.model;
      experiments.set(item.name, panel);
      if (!lesson.panels.includes(panel)) lesson.panels.push(panel);
    }
  }
  document.querySelectorAll('.lesson-unit').forEach(unit => {
    const heading = unit.querySelector('h3[id]');
    if (!heading || lessons.has(heading)) return;
    const panels = [...unit.querySelectorAll('[data-model], [data-lab]')];
    if (!panels.length) return;
    panels.forEach((panel, index) => {
      if (!panel.id) panel.id = 'lesson-lab-' + heading.id + '-' + index;
    });
    lessons.set(heading, { names: [], panels });
  });
  document.querySelectorAll('[data-category-experiment]').forEach(link => {
    const panel = experiments.get(link.dataset.categoryExperiment);
    if (panel) link.href = '#' + panel.id;
  });
  for (const [heading, lesson] of lessons) {
    const tags = document.createElement('div');
    tags.className = 'lesson-tags';
    tags.setAttribute('aria-label', '類別與互動圖解');
    for (const name of lesson.names) {
      const tag = document.createElement('span');
      tag.lang = 'en'; tag.textContent = name; tags.append(tag);
    }
    if (lesson.panels.length) {
      const link = document.createElement('a');
      link.className = 'lesson-demo-link';
      link.href = '#' + lesson.panels[0].id;
      link.textContent = '操作圖解 ↗';
      tags.append(link);
    }
    heading.after(tags);
  }
  filter();
})();