"""Standard-library build validation. Test fixtures never enter chapters/."""
import importlib.util
import ast
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('course_build', ROOT / 'build.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


def fixture(root):
    root = Path(root)
    root.mkdir(parents=True, exist_ok=True)
    (root / 'chapters').mkdir(exist_ok=True)
    shutil.copytree(ROOT / 'source', root / 'source', dirs_exist_ok=True)
    for i in range(1, 14):
        number = f'{i:02}'
        (root / 'chapters' / f'{number}.html').write_text(f'''<article id="chapter-{number}" data-title="測試章 {number}"><h2>第 {number} 章測試</h2><p>這只是測試資料，不是正式教材。</p><h3 id="c{number}-intro">測試概念 binary search {number}</h3><p>不變量與邊界是解題的重要工具。</p><figure><svg viewBox="0 0 600 220" role="img" aria-labelledby="test-svg-{number}"><title id="test-svg-{number}">測試用圖</title><rect x="20" y="30" width="560" height="160" fill="#edf5f2"/><text x="70" y="115" fill="#183d33">狀態 → 不變量 → 正確性</text></svg></figure><h3 id="c{number}-exercise">測試練習</h3><details><summary>參考解答</summary><p id="c{number}-answer">這是供搜尋與列印測試的答案。</p><pre><code class="language-python">assert 1 + 1 == 2</code></pre></details><table><tr><th>變數</th><th>值</th></tr><tr><td>left</td><td>0</td></tr></table></article>''', encoding='utf-8')
    return root


class BuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='dsa-build-test-')
        self.root = fixture(self.temp.name)
    def tearDown(self):
        self.temp.cleanup()
    def test_build_is_standalone_and_deterministic(self):
        info = builder.build(self.root)
        output = (self.root / 'index.html').read_text(encoding='utf-8')
        self.assertEqual(info['chapters'], 13)
        self.assertEqual(info['topics'], 26)
        self.assertEqual(output.count('data-lab="'), 6)
        self.assertNotIn('<script src=', output)
        self.assertNotIn('<link rel="stylesheet"', output)
        self.assertNotIn('{{CHAPTERS}}', output)
        builder.build(self.root)
        self.assertEqual(output, (self.root / 'index.html').read_text(encoding='utf-8'))
    def test_missing_chapter_fails_without_output(self):
        (self.root / 'chapters' / '07.html').unlink()
        with self.assertRaisesRegex(ValueError, '07.html'):
            builder.build(self.root)
        self.assertFalse((self.root / 'index.html').exists())
    def test_duplicate_id_is_rejected(self):
        path = self.root / 'chapters' / '03.html'
        path.write_text(path.read_text(encoding='utf-8').replace('c03-intro', 'c01-intro'), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, '重複'):
            builder.build(self.root)
    def test_broken_deep_anchor_is_rejected(self):
        path = self.root / 'chapters' / '02.html'
        path.write_text(path.read_text(encoding='utf-8').replace('</article>', '<a href="#missing">bad</a></article>'), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, '無效的內部連結'):
            builder.build(self.root)
    def test_embedded_script_is_rejected(self):
        path = self.root / 'chapters' / '05.html'
        path.write_text(path.read_text(encoding='utf-8').replace('</article>', '<script>1</script></article>'), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, '不可包含'):
            builder.build(self.root)
    def test_cli_missing_reports_nonzero(self):
        (self.root / 'chapters' / '13.html').unlink()
        result = subprocess.run([sys.executable, str(ROOT / 'build.py'), '--root', str(self.root)], capture_output=True, text=True, encoding='utf-8')
        self.assertEqual(result.returncode, 1)
        self.assertIn('13.html', result.stderr)


class CodeBlocks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.current = None
        self.blocks = []
    def handle_starttag(self, tag, attrs):
        if tag == 'pre':
            self.current = []
    def handle_data(self, data):
        if self.current is not None:
            self.current.append(data)
    def handle_endtag(self, tag):
        if tag == 'pre' and self.current is not None:
            self.blocks.append(''.join(self.current))
            self.current = None


class ChapterExamplesTests(unittest.TestCase):
    def test_displayed_python_matches_executable_examples(self):
        for chapter in sorted((ROOT / 'chapters').glob('*.html')):
            parser = CodeBlocks()
            parser.feed(chapter.read_text(encoding='utf-8'))
            examples = ast.parse((ROOT / 'tests' / f'examples_{chapter.stem}.py').read_text(encoding='utf-8'))
            definitions = {node.name: ast.dump(node) for node in examples.body if isinstance(node, (ast.FunctionDef, ast.ClassDef))}
            for index, code in enumerate(parser.blocks, 1):
                with self.subTest(chapter=chapter.name, block=index):
                    for node in ast.parse(code).body:
                        if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                            self.assertEqual(ast.dump(node), definitions.get(node.name), node.name)

if __name__ == '__main__':
    import sys
    if len(sys.argv) == 3 and sys.argv[1] == '--fixture':
        root = fixture(sys.argv[2])
        print(json.dumps(builder.build(root), ensure_ascii=False))
    else:
        unittest.main()
