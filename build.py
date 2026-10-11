#!/usr/bin/env python3
"""Build a deterministic, standalone DSA textbook using Python's standard library."""
from __future__ import annotations
import argparse
import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CHAPTERS = [
    ('學習與分析', 'Big O、遞迴與 Python 的真實成本', '打好基礎'),
    ('陣列與字串', '雙指標、滑動視窗與前綴和', '打好基礎'),
    ('雜湊', '存在性、計數與前綴狀態', '打好基礎'),
    ('鏈結串列', '快慢指標、反轉與指標不變量', '選對結構'),
    ('堆疊與佇列', '解析、deque 與單調結構', '選對結構'),
    ('樹與圖', 'DFS、BFS、BST 與 visited', '選對結構'),
    ('堆積', 'heapq、Top K 與串流合併', '選對結構'),
    ('貪婪', '交換論證、排序與反例', '設計解法'),
    ('二分搜尋', '邊界、答案空間與單調判定', '設計解法'),
    ('回溯', '生成、剪枝與狀態復原', '設計解法'),
    ('動態規劃', '狀態、轉移、記憶化與填表', '設計解法'),
    ('面試工具箱', '解題流程、模板與原創模擬題', '整合與延伸'),
    ('進階補給', '差分、Trie、位元與最短路徑', '整合與延伸'),
]
KEYWORDS = [
    'Big O recursion complexity Python',
    'array arrays string strings two pointers sliding window prefix sum',
    'hash hashing map set counting',
    'linked list fast slow reverse dummy',
    'stack queue deque monotonic',
    'tree graph DFS BFS BST visited',
    'heap heapq top k merge',
    'greedy exchange sorting',
    'binary search lower_bound upper_bound bisect',
    'backtracking pruning undo',
    'dynamic programming DP memoization tabulation',
    'interview template complexity',
    'difference array trie bit intervals modular Dijkstra',
]
LABS = [
    ('two-pointers', '雙指標', '找出有序陣列中總和等於目標的一組索引。', 'chapter-02',
     [('array', '有序整數（2–12 個，逗號分隔）', '1, 3, 4, 6, 8, 11', 'text'), ('target', '目標總和', '10', 'number')],
     '左邊太小就往右，右邊太大就往左；前提是陣列已排序。', 'O(n) 時間、O(1) 額外空間。'),
    ('sliding-window', '滑動視窗', '固定長度 k 的連續子陣列，哪一段總和最大？', 'chapter-02',
     [('array', '整數（1–12 個，可含負數）', '4, -2, 5, 1, -3, 6, 2', 'text'), ('k', '視窗長度 k', '3', 'number')],
     'sum 永遠等於目前視窗內元素總和；移動時只減掉離開者、加上進入者。', 'O(n) 時間、O(1) 額外空間；負數也適用固定長度視窗。'),
    ('binary-search', '二分搜尋', '尋找第一個大於或等於 target 的位置（lower_bound）。', 'chapter-09',
     [('array', '有序整數（0–12 個；可留空）', '1, 3, 3, 3, 7, 9, 12', 'text'), ('target', 'target', '3', 'number')],
     '使用半開區間 [lo, hi)；lo 左側一定小於 target，hi 右側（含 hi）一定不小於 target。', 'O(log n) 時間、O(1) 額外空間；空陣列回傳插入位置 0。'),
    ('bfs', '廣度優先搜尋', '在無向、無權圖上找出起點到各節點的最少邊數。', 'chapter-06',
     [('edges', 'A–F 的邊（逗號分隔；可留空）', 'A-B, A-C, B-D, C-D, D-E, E-F', 'text'), ('start', '起點（A–F）', 'A', 'text')],
     '節點第一次入列就標記 visited。FIFO 保證距離按層增加，不重複入列。', '原 BFS 為 O(V+E) 時間、O(V) 額外空間；本圖固定 6 個節點。'),
    ('backtracking', '回溯與剪枝', '從 1…n 各取最多一次，列出總和等於 target 的子集合。', 'chapter-10',
     [('n', 'n（1–6）', '4', 'number'), ('target', 'target（0–30）', '5', 'number')],
     '每一層決定下一個數字選或不選；返回上一層前，必須把 path 與 sum 還原。', '最壞 O(n·2ⁿ) 含輸出複製；遞迴路徑 O(n)，另計答案空間。'),
    ('dp', '動態規劃', '每種硬幣可用不限次，湊出 amount 所需的最少硬幣數。', 'chapter-11',
     [('coins', '硬幣面額（1–6 個，正整數 1–20）', '1, 3, 4', 'text'), ('amount', 'amount（0–18）', '6', 'number')],
     'dp[s] 是湊出總額 s 的最少硬幣數；每個依賴 dp[s−coin] 都是已經完成的更小狀態。', 'O(amount × 面額數) 時間、O(amount) 空間；∞ 表示目前無法湊出。'),
]

class ChapterParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.articles = []
        self.headings = []
        self.ids = []
        self.refs = []
        self.current = None
        self.forbidden = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if attrs.get('href', '').startswith('#'):
            self.refs.append(attrs['href'][1:])
        if tag == 'article':
            self.articles.append(attrs)
        if tag == 'h3':
            self.current = {'id': attrs.get('id'), 'text': ''}
        if tag in ('script', 'iframe', 'html', 'head', 'body'):
            self.forbidden.append(tag)
    def handle_data(self, data):
        if self.current is not None:
            self.current['text'] += data
    def handle_endtag(self, tag):
        if tag == 'h3' and self.current is not None:
            self.headings.append(self.current)
            self.current = None


def lab_markup():
    blocks = []
    for i, (key, title, question, chapter, fields, invariant, cost) in enumerate(LABS, 1):
        form = ''.join(f'<label for="{key}-{name}">{html.escape(label)}<input id="{key}-{name}" name="{name}" type="{typ}" value="{html.escape(value)}" autocomplete="off" {'step=1' if typ == 'number' else ''}></label>' for name, label, value, typ in fields)
        blocks.append(f'''<section class="algorithm-lab" id="lab-{key}" data-lab="{key}" aria-labelledby="{key}-title">
<div class="lab-heading"><span class="lab-number">{i:02}</span><div><h3 id="{key}-title">{title}</h3><p>{question}</p></div><a href="#{chapter}" class="lab-chapter-link">讀相關章節</a></div>
<form class="lab-inputs js-only" novalidate>{form}<button type="submit" class="button secondary">套用輸入</button><p class="lab-error" role="alert" hidden></p></form>
<div class="lab-controls js-only"><button type="button" data-action="prev" aria-label="{title}上一步">上一步</button><button type="button" data-action="next" aria-label="{title}下一步">下一步 <span aria-hidden="true">→</span></button><button type="button" data-action="reset" aria-label="{title}重新開始">重新開始</button><span class="lab-step" aria-live="off"></span></div>
<div class="lab-stage js-only"><div class="lab-visual" aria-label="{title}目前狀態"></div><dl class="lab-vars"></dl><p class="lab-explanation" role="status" aria-live="polite" aria-atomic="true"></p></div>
<div class="lab-principle"><strong>不變量</strong><p>{invariant}</p><small>{cost} 以上不含教學追蹤紀錄。</small></div>
<noscript><p class="lab-noscript">啟用 JavaScript 即可逐步操作本實驗。先<a href="#{chapter}">閱讀章節中的完整步驟、圖解與 Python 範例</a>。</p></noscript>
</section>''')
    return '\n'.join(blocks)


def build(root: Path = ROOT, output: Path | None = None):
    output = output or root / 'index.html'
    missing = [f'{i:02}.html' for i in range(1, 14) if not (root / 'chapters' / f'{i:02}.html').is_file()]
    if missing:
        raise ValueError('無法建置：缺少 chapters/' + ', chapters/'.join(missing) + '。不會以假內容替代。')
    all_ids = set()
    all_refs = []
    contents, meta, sidebar, cards = [], [], [], []
    previous_group = None
    for i, (short, description, group) in enumerate(CHAPTERS, 1):
        path = root / 'chapters' / f'{i:02}.html'
        content = path.read_text(encoding='utf-8')
        parser = ChapterParser()
        parser.feed(content)
        chapter_id = f'chapter-{i:02}'
        if len(parser.articles) != 1 or parser.articles[0].get('id') != chapter_id:
            raise ValueError(f'{path.name}: 必須恰有一個 article，id 為 {chapter_id}')
        if parser.forbidden:
            raise ValueError(f'{path.name}: 不可包含 {parser.forbidden}')
        if any(not h['id'] for h in parser.headings):
            raise ValueError(f'{path.name}: 每個 h3 都需要穩定的 id')
        for identifier in parser.ids:
            if identifier in all_ids:
                raise ValueError(f'重複 id: {identifier}')
            all_ids.add(identifier)
        all_refs.extend(parser.refs)
        title = parser.articles[0].get('data-title', short)
        meta.append({'id': chapter_id, 'number': f'{i:02}', 'title': title, 'short': short, 'keywords': KEYWORDS[i - 1], 'topics': parser.headings})
        contents.append(content)
        if group != previous_group:
            sidebar.append(f'<li class="nav-group">{group}</li>')
            previous_group = group
        sidebar.append(f'<li><a class="chapter-link" data-chapter="{chapter_id}" href="#{chapter_id}"><span class="chapter-number">{i:02}</span><span>{html.escape(short)}</span><span class="nav-done" aria-hidden="true"></span></a></li>')
        cards.append(f'<li><a href="#{chapter_id}"><span class="map-number">{i:02}</span><span class="map-content"><strong>{html.escape(short)}</strong><span class="map-summary">{html.escape(description)}</span></span><small class="map-part">{group}</small><span class="map-arrow" aria-hidden="true">↗</span></a></li>')
    source = root / 'source'
    replacements = {'STYLES': (source / 'styles.css').read_text(), 'APP_JS': (source / 'app.js').read_text(), 'LABS_JS': (source / 'labs.js').read_text(), 'CHAPTERS': '\n'.join(contents), 'CHAPTER_META': json.dumps(meta, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c'), 'SIDEBAR': '\n'.join(sidebar), 'CHAPTER_MAP': '\n'.join(cards), 'LABS': lab_markup(), 'TOPIC_COUNT': str(sum(len(ch['topics']) for ch in meta))}
    rendered = (source / 'shell.html').read_text()
    for key, value in replacements.items():
        rendered = rendered.replace('{{' + key + '}}', value)
    if re.search(r'\{\{[A-Z_]+\}\}', rendered):
        raise ValueError('有未替換的建置變數')
    # Validate final unique IDs and internal links, including shell + chapters.
    final = ChapterParser()
    final.feed(rendered)
    ids = set()
    for identifier in final.ids:
        if identifier in ids:
            raise ValueError(f'整合後 id 重複: {identifier}')
        ids.add(identifier)
    broken = sorted({ref for ref in final.refs if ref and ref not in ids})
    if broken:
        raise ValueError('無效的內部連結: ' + ', '.join(broken))
    output.write_text(rendered, encoding='utf-8')
    return {'chapters': len(meta), 'topics': sum(len(ch['topics']) for ch in meta), 'bytes': output.stat().st_size, 'path': str(output)}

if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--root', type=Path, default=ROOT)
    cli.add_argument('--output', type=Path)
    args = cli.parse_args()
    try:
        result = build(args.root.resolve(), args.output)
    except (ValueError, OSError) as error:
        cli.exit(1, str(error) + '\n')
    print(json.dumps(result, ensure_ascii=False))
