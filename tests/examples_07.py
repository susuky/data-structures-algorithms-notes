"""第 07 章：二元堆積、top-k、資料流與合併。"""
import heapq
from itertools import count, product


def largest_k(numbers, k):
    """回傳最大的至多 k 個數，降序排列；相同數值按出現次數計。"""
    if k < 0:
        raise ValueError("k 不可為負")
    if k == 0:
        return []
    heap = []
    for value in numbers:
        if len(heap) < k:
            heapq.heappush(heap, value)
        elif value > heap[0]:
            heapq.heapreplace(heap, value)
    return sorted(heap, reverse=True)


class KthLargest:
    """add 回傳目前第 k 大；不足 k 筆則回傳 None。"""
    def __init__(self, k):
        if k <= 0:
            raise ValueError("k 必須為正整數")
        self.k = k
        self.heap = []

    def add(self, value):
        if len(self.heap) < self.k:
            heapq.heappush(self.heap, value)
        elif value > self.heap[0]:
            heapq.heapreplace(self.heap, value)
        return self.heap[0] if len(self.heap) == self.k else None


def merge_sorted_streams(streams):
    """每條輸入須已依遞增排序；同來源只保留下一個候選。"""
    heap = []
    for source, stream in enumerate(streams):
        iterator = iter(stream)
        try:
            value = next(iterator)
        except StopIteration:
            continue
        heap.append((value, source, iterator))
    heapq.heapify(heap)
    while heap:
        value, source, iterator = heapq.heappop(heap)
        yield value
        try:
            following = next(iterator)
        except StopIteration:
            continue
        heapq.heappush(heap, (following, source, iterator))


class StablePriorityQueue:
    """priority 越小越先取出；相同 priority 保持加入順序。"""
    def __init__(self):
        self.heap = []
        self.serial = count()

    def push(self, priority, payload):
        heapq.heappush(self.heap, (priority, next(self.serial), payload))

    def pop(self):
        return heapq.heappop(self.heap)[2]


def expect_value_error(fn):
    try:
        fn()
    except ValueError:
        return
    raise AssertionError("應拋出 ValueError")


def run_tests():
    assert largest_k([11, 4, 8, 15, 7, 13], 3) == [15, 13, 11]
    assert largest_k([], 3) == []
    assert largest_k([4, 4], 5) == [4, 4]
    expect_value_error(lambda: largest_k([1], -1))
    expect_value_error(lambda: KthLargest(0))
    for n in range(7):
        for numbers in product(range(-1, 2), repeat=n):
            for k in range(n + 2):
                assert largest_k(iter(numbers), k) == sorted(numbers, reverse=True)[:k]
            for k in range(1, n + 2):
                tracker = KthLargest(k)
                for i, value in enumerate(numbers):
                    result = tracker.add(value)
                    prefix = sorted(numbers[:i + 1], reverse=True)
                    assert result == (prefix[k - 1] if len(prefix) >= k else None)
                    assert len(tracker.heap) <= k
                    for child in range(1, len(tracker.heap)):
                        assert tracker.heap[(child - 1) // 2] <= tracker.heap[child]
    cases = [[], [[], []], [[-2, 5, 10], [1, 5], [0, 6, 9]],
             [[1, 1], [1], []], [[], [-5]], [[4]]]
    for streams in cases:
        expected = sorted(value for stream in streams for value in stream)
        assert list(merge_sorted_streams(iter(s) for s in streams)) == expected
    q = StablePriorityQueue()
    a, b, c = {"name": "A"}, {"name": "B"}, {"name": "C"}
    q.push(2, a)
    q.push(1, b)
    q.push(2, c)
    assert q.pop() is b
    assert q.pop() is a
    assert q.pop() is c
    heap = [4, 8, 6]
    heapq.heapify(heap)
    assert heapq.heappushpop(heap, 2) == 2 and heap[0] == 4
    assert heapq.heapreplace(heap, 2) == 4 and heap[0] == 2


if __name__ == "__main__":
    run_tests()
