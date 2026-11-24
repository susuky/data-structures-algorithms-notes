from collections import OrderedDict
import heapq

class Link:
    def __init__(self, key=None, value=None):
        self.key, self.value = key, value
        self.prev = self.next = None

class LRUCache:
    def __init__(self, capacity):
        if capacity < 0:
            raise ValueError("capacity 必須大於或等於 0")
        self.capacity, self.nodes = capacity, {}
        self.head, self.tail = Link(), Link()
        self.head.next, self.tail.prev = self.tail, self.head

    def _detach(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _append(self, node):
        last = self.tail.prev
        last.next = node
        node.prev, node.next = last, self.tail
        self.tail.prev = node

    def get(self, key):
        if key not in self.nodes:
            return None
        node = self.nodes[key]
        self._detach(node)
        self._append(node)
        return node.value

    def put(self, key, value):
        if key in self.nodes:
            node = self.nodes[key]
            node.value = value
            self._detach(node)
        else:
            node = Link(key, value)
            self.nodes[key] = node
        self._append(node)
        if len(self.nodes) > self.capacity:
            victim = self.head.next
            self._detach(victim)
            del self.nodes[victim.key]

def move_after(node, anchor):
    if node is anchor or anchor.next is node:
        return
    node.prev.next = node.next
    node.next.prev = node.prev
    following = anchor.next
    anchor.next = node
    node.prev, node.next = anchor, following
    following.prev = node

class FlatIterator:
    def __init__(self, rows):
        self.rows = iter(rows)
        self.current = iter(())

    def __iter__(self):
        return self

    def __next__(self):
        while True:
            try:
                return next(self.current)
            except StopIteration:
                self.current = iter(next(self.rows))

class MedianStream:
    def __init__(self):
        self.low, self.high = [], []

    def add(self, value):
        heapq.heappush(self.low, -value)
        heapq.heappush(self.high, -heapq.heappop(self.low))
        if len(self.high) > len(self.low):
            heapq.heappush(self.low, -heapq.heappop(self.high))

    def median(self):
        if not self.low:
            raise ValueError("加入至少一筆資料後再讀取中位數")
        if len(self.low) > len(self.high):
            return -self.low[0]
        return (-self.low[0] + self.high[0]) / 2

def run_tests():
    import random
    rng = random.Random(21)
    for capacity in range(5):
        cache, reference = LRUCache(capacity), OrderedDict()
        for _ in range(200):
            key, value = rng.randrange(6), rng.randrange(-5, 6)
            if rng.randrange(3):
                cache.put(key, value)
                reference[key] = value
                reference.move_to_end(key)
                if len(reference) > capacity:
                    reference.popitem(last=False)
            else:
                expected = reference.get(key)
                if key in reference:
                    reference.move_to_end(key)
                assert cache.get(key) == expected
            nodes, node = [], cache.head
            while node.next is not None:
                assert node.next.prev is node
                node = node.next
                if node is not cache.tail:
                    nodes.append(node.key)
            assert nodes == list(reference)
            assert len(cache.nodes) <= capacity
    for destination in range(5):
        cache = LRUCache(5)
        for i in range(5):
            cache.put(i, i)
        move_after(cache.nodes[2], cache.nodes[destination])
        result, node = [], cache.head.next
        while node is not cache.tail:
            assert node.next.prev is node
            result.append(node.key)
            node = node.next
        expected = list(range(5))
        if destination != 2:
            expected.remove(2)
            expected.insert(expected.index(destination) + 1, 2)
        assert result == expected
    assert list(FlatIterator([[], [1, 2], [], [3], []])) == [1, 2, 3]
    assert list(FlatIterator([])) == []
    calls = []
    def source():
        for i in range(3):
            calls.append(i)
            yield [i]
    iterator = FlatIterator(source())
    assert calls == []
    assert next(iterator) == 0 and calls == [0]
    assert list(iterator) == [1, 2]
    for _ in range(2):
        try:
            next(iterator)
        except StopIteration:
            pass
        else:
            raise AssertionError("耗盡後應持續 StopIteration")
    for _ in range(60):
        stream, values = MedianStream(), []
        for _ in range(30):
            value = rng.randrange(-30, 31)
            values.append(value)
            stream.add(value)
            ordered = sorted(values)
            n = len(ordered)
            expected = (ordered[(n - 1) // 2] + ordered[n // 2]) / 2
            assert stream.median() == expected
            assert len(stream.low) in (len(stream.high), len(stream.high) + 1)
            assert not stream.high or -stream.low[0] <= stream.high[0]

if __name__ == "__main__":
    run_tests()
    print("examples_21: LRU、雙向連結、惰性迭代與串流中位數通過")
