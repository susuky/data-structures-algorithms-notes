"""Chapter 13: original, executable examples. Python 3.10+, standard library."""
from __future__ import annotations
from heapq import heappop, heappush
from math import inf


def range_add(n: int, updates: list[tuple[int, int, int]]) -> list[int]:
    if n < 0:
        raise ValueError('n must be nonnegative')
    difference = [0] * (n + 1)
    for left, right, delta in updates:
        if not 0 <= left <= right < n:
            raise ValueError('invalid inclusive interval')
        difference[left] += delta
        difference[right + 1] -= delta
    result, running = [], 0
    for i in range(n):
        running += difference[i]
        result.append(running)
    return result


class TrieNode:
    def __init__(self) -> None:
        self.children: dict[str, TrieNode] = {}
        self.end = False


class Trie:
    def __init__(self) -> None:
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.end = True

    def _walk(self, text: str) -> TrieNode | None:
        node = self.root
        for char in text:
            if char not in node.children:
                return None
            node = node.children[char]
        return node

    def search(self, word: str) -> bool:
        node = self._walk(word)
        return node is not None and node.end

    def starts_with(self, prefix: str) -> bool:
        return self._walk(prefix) is not None


def popcount(value: int) -> int:
    if value < 0:
        raise ValueError('this implementation requires a nonnegative integer')
    count = 0
    while value:
        value &= value - 1
        count += 1
    return count


def merge_closed(intervals: list[tuple[int, int]]) -> list[list[int]]:
    if any(left > right for left, right in intervals):
        raise ValueError('left endpoint exceeds right endpoint')
    merged: list[list[int]] = []
    for left, right in sorted(intervals):
        if not merged or left > merged[-1][1]:
            merged.append([left, right])
        else:
            merged[-1][1] = max(merged[-1][1], right)
    return merged


def pow_mod(base: int, exponent: int, modulus: int) -> int:
    if exponent < 0 or modulus <= 0:
        raise ValueError('requires exponent >= 0 and modulus > 0')
    result = 1 % modulus
    base %= modulus
    while exponent:
        if exponent & 1:
            result = result * base % modulus
        base = base * base % modulus
        exponent >>= 1
    return result


def dijkstra(graph: list[list[tuple[int, int]]], start: int) -> list[float | int]:
    if any(weight < 0 for edges in graph for _, weight in edges):
        raise ValueError('Dijkstra requires nonnegative weights')
    distance = [inf] * len(graph)
    distance[start] = 0
    heap = [(0, start)]
    while heap:
        cost, node = heappop(heap)
        if cost != distance[node]:
            continue  # An old, more expensive entry.
        for neighbor, weight in graph[node]:
            candidate = cost + weight
            if candidate < distance[neighbor]:
                distance[neighbor] = candidate
                heappush(heap, (candidate, neighbor))
    return distance


def cheapest_with_stops(graph: list[list[tuple[int, int]]], start: int,
                        target: int, max_stops: int) -> int | None:
    # max_stops counts intermediate vertices, so max_edges = max_stops + 1.
    if max_stops < -1:
        raise ValueError('max_stops must be at least -1')
    if any(weight < 0 for edges in graph for _, weight in edges):
        raise ValueError('requires nonnegative weights')
    max_edges = max_stops + 1
    distance = [[inf] * (max_edges + 1) for _ in graph]
    distance[start][0] = 0
    heap = [(0, start, 0)]
    while heap:
        cost, node, used = heappop(heap)
        if cost != distance[node][used]:
            continue
        if node == target:
            return cost
        if used == max_edges:
            continue
        for neighbor, weight in graph[node]:
            candidate = cost + weight
            if candidate < distance[neighbor][used + 1]:
                distance[neighbor][used + 1] = candidate
                heappush(heap, (candidate, neighbor, used + 1))
    return None


def peak_load(n: int, intervals: list[tuple[int, int]]) -> int:
    counts = range_add(n, [(left, right, 1) for left, right in intervals])
    return max(counts, default=0)


def xor_unique(values: list[int]) -> int:
    # Exactly one value occurs once; every other value occurs twice.
    result = 0
    for value in values:
        result ^= value
    return result


def products_except_self_mod(values: list[int], modulus: int) -> list[int]:
    if modulus <= 0:
        raise ValueError('modulus must be positive')
    result = [1 % modulus] * len(values)
    prefix = 1 % modulus
    for i, value in enumerate(values):
        result[i] = prefix
        prefix = prefix * value % modulus
    suffix = 1 % modulus
    for i in range(len(values) - 1, -1, -1):
        result[i] = result[i] * suffix % modulus
        suffix = suffix * values[i] % modulus
    return result


def min_rooms(intervals: list[tuple[int, int]]) -> int:
    # Positive-length, half-open intervals [start, end).
    if any(start >= end for start, end in intervals):
        raise ValueError('meetings must have positive duration')
    ends: list[int] = []
    answer = 0
    for start, end in sorted(intervals):
        while ends and ends[0] <= start:
            heappop(ends)
        heappush(ends, end)
        answer = max(answer, len(ends))
    return answer


def _bounded_reference(graph, start, target, max_edges):
    # Exact-edge dynamic programming, used as an independent test oracle.
    costs = [inf] * len(graph)
    costs[start] = 0
    answer = costs[target]
    for _ in range(max_edges):
        next_costs = [inf] * len(graph)
        for node, edges in enumerate(graph):
            for neighbor, weight in edges:
                next_costs[neighbor] = min(next_costs[neighbor], costs[node] + weight)
        costs = next_costs
        answer = min(answer, costs[target])
    return None if answer == inf else answer


def tests() -> None:
    assert range_add(6, [(1, 4, 3), (3, 5, -2)]) == [0, 3, 3, 1, 1, -2]
    assert range_add(0, []) == []
    assert peak_load(7, [(0, 2), (2, 5), (4, 6)]) == 2
    assert peak_load(0, []) == 0
    assert range_add(1, [(0, 0, 7), (0, 0, -7)]) == [0]
    trie = Trie()
    for word in ['car', 'cart', 'cat', '貓咪', 'car']:
        trie.insert(word)
    assert trie.search('car') and trie.search('貓咪')
    assert not trie.search('ca') and trie.starts_with('ca')
    assert not trie.starts_with('cab') and trie.starts_with('')
    assert not trie.search('')
    trie.insert('')
    assert trie.search('')
    assert popcount(0) == 0 and popcount(0b101100) == 3
    assert popcount((1 << 130) | 1) == 2
    assert xor_unique([13, 8, 13, -4, 8]) == -4
    intervals = [(7, 9), (2, 5), (4, 8), (12, 12)]
    assert merge_closed(intervals) == [[2, 9], [12, 12]]
    assert intervals == [(7, 9), (2, 5), (4, 8), (12, 12)]
    assert merge_closed([]) == []
    assert merge_closed([(1, 3), (3, 4)]) == [[1, 4]]
    assert merge_closed([(1, 2), (3, 4)]) == [[1, 2], [3, 4]]
    assert pow_mod(7, 13, 11) == 2
    assert pow_mod(3, 0, 1) == 0
    for base in range(-8, 9):
        for exponent in range(15):
            for modulus in range(1, 18):
                assert pow_mod(base, exponent, modulus) == pow(base, exponent, modulus)
    assert products_except_self_mod([2, 0, 3], 6) == [0, 0, 0]
    assert products_except_self_mod([2, 3, 4], 6) == [0, 2, 0]
    assert products_except_self_mod([], 8) == []
    assert products_except_self_mod([9], 7) == [1]
    assert min_rooms([(1, 4), (4, 6), (2, 3)]) == 2
    assert min_rooms([]) == 0
    assert min_rooms([(1, 2), (2, 3)]) == 1
    graph = [[(1, 8), (2, 2)], [(3, 1)], [(1, 3), (3, 9)], [], []]
    assert dijkstra(graph, 0) == [0, 5, 2, 6, inf]
    limited = [[(1, 1), (3, 5)], [(2, 1)], [(3, 1)], [(4, 1)], []]
    assert cheapest_with_stops(limited, 0, 4, 2) == 6
    assert cheapest_with_stops(limited, 0, 4, 3) == 4
    assert cheapest_with_stops(limited, 0, 4, 0) is None
    assert cheapest_with_stops(limited, 0, 0, -1) == 0
    assert cheapest_with_stops(limited, 0, 4, -1) is None
    # Exercise 5: retaining only the most remaining edges loses the cheap path.
    remaining_only = [[(2, 100), (1, 1)], [(2, 1)], [(3, 1)], []]
    assert cheapest_with_stops(remaining_only, 0, 3, 2) == 3
    zero_cycle = [[(1, 0)], [(0, 0), (2, 1)], []]
    assert dijkstra(zero_cycle, 0) == [0, 0, 1]
    assert cheapest_with_stops(zero_cycle, 0, 2, 1) == 1
    try:
        dijkstra([[(1, -1)], []], 0)
    except ValueError:
        pass
    else:
        raise AssertionError('negative weights must be rejected')
    # Fixed seed: independently cross-check both shortest-path implementations.
    import random
    rng = random.Random(137)
    for _ in range(120):
        n = rng.randrange(1, 7)
        graph = [[(v, rng.randrange(7)) for v in range(n)
                  if rng.random() < 0.25] for _ in range(n)]
        target, bound = rng.randrange(n), rng.randrange(7)
        assert cheapest_with_stops(graph, 0, target, bound - 1) == \
            _bounded_reference(graph, 0, target, bound)
        reference = _bounded_reference(graph, 0, target, n - 1)
        assert dijkstra(graph, 0)[target] == (inf if reference is None else reference)


if __name__ == '__main__':
    tests()
