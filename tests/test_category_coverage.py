"""Coverage of the 73 requested categories and their actual lesson/model links."""
import json
import subprocess
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = ["Array","String","Hash Table","Math","Dynamic Programming","Sorting","Greedy","Binary Search","Depth-First Search","Database","Bit Manipulation","Matrix","Prefix Sum","Tree","Two Pointers","Breadth-First Search","Heap (Priority Queue)","Simulation","Counting","Graph Theory","Stack","Binary Tree","Sliding Window","Enumeration","Design","Backtracking","Number Theory","Union-Find","Segment Tree","Linked List","Ordered Set","Monotonic Stack","Divide and Conquer","Combinatorics","Trie","Queue","Bitmask","Binary Indexed Tree","Recursion","Hash Function","Geometry","Memoization","Shortest Path","Binary Search Tree","Topological Sort","String Matching","Rolling Hash","Game Theory","Monotonic Queue","Interactive","Data Stream","Brainteaser","Merge Sort","Minimax","Doubly-Linked List","Randomized","Counting Sort","Iterator","Concurrency","Suffix Array","Quickselect","Sweep Line","Probability and Statistics","Minimum Spanning Tree","Bucket Sort","Shell","Meet in the Middle","Reservoir Sampling","Eulerian Circuit","Radix Sort","Strongly Connected Component","Rejection Sampling","Biconnected Component"]

class Units(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.units = {}
        self.active = None
    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == 'section':
            self.stack.append(self.active)
            if 'lesson-unit' in attrs.get('class', '').split():
                self.active = attrs['data-lesson']
                self.units[self.active] = {'models': set(), 'headings': set()}
        if self.active:
            unit = self.units[self.active]
            if attrs.get('data-lab'):
                unit['models'].add(attrs['data-lab'])
            if attrs.get('data-model'):
                unit['models'].add(attrs['data-model'])
            if tag == 'h3':
                unit['headings'].add(attrs.get('id'))
    def handle_endtag(self, tag):
        if tag == 'section':
            self.active = self.stack.pop()

class CategoryCoverage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.entries = []
        for file in (ROOT / 'source').glob('categories-*.json'):
            cls.entries.extend(json.loads(file.read_text(encoding='utf-8')))
        cls.units = {}
        for chapter in (ROOT / 'chapters').glob('*.html'):
            parser = Units()
            parser.feed(chapter.read_text(encoding='utf-8'))
            cls.units.update(parser.units)
        script = """const fs=require('fs');
const keys=Object.keys(require('./source/labs.js').algorithms);
for(const file of fs.readdirSync('source').filter(f=>/^models-.*\\.js$/.test(f)))keys.push(...Object.keys(require('./source/'+file)));
console.log(JSON.stringify(keys));"""
        result = subprocess.run(['node', '-e', script], cwd=ROOT, capture_output=True, text=True, check=True)
        cls.models = json.loads(result.stdout)
    def test_exact_requested_categories(self):
        names = [item['name'] for item in self.entries]
        self.assertEqual(len(names), 73)
        self.assertEqual(len(set(names)), 73)
        self.assertEqual(set(names), set(EXPECTED))
    def test_every_category_opens_a_real_unit_and_model(self):
        for item in self.entries:
            with self.subTest(category=item['name']):
                self.assertIn(item['lesson'], self.units)
                unit = self.units[item['lesson']]
                self.assertIn(item['lesson'], unit['headings'])
                self.assertIn(item['model'], unit['models'])
                self.assertIn(item['model'], self.models)
                self.assertTrue(item['label'].strip())
                for related in item.get('related', []):
                    self.assertIn(related, self.units)
    def test_model_keys_do_not_collide(self):
        self.assertEqual(len(self.models), len(set(self.models)))
    def test_source_order_matches_requested_image(self):
        order = json.loads((ROOT / 'source/category-order.json').read_text(encoding='utf-8'))
        self.assertEqual(order, EXPECTED)

if __name__ == '__main__':
    unittest.main()
