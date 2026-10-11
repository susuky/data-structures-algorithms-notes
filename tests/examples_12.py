"""第 12 章的原創 mock、可重用模板與測試。"""
from collections import deque
from itertools import product


def longest_label_window(labels, k):
    """回傳至多 k 種標籤的最長半開區間；同長時選最早。"""
    if k < 0:
        raise ValueError("k 不可為負")
    counts = {}
    left = 0
    best = (0, 0)
    for right, label in enumerate(labels):
        counts[label] = counts.get(label, 0) + 1
        while len(counts) > k:
            old = labels[left]
            counts[old] -= 1
            if counts[old] == 0:
                del counts[old]
            left += 1
        if right + 1 - left > best[1] - best[0]:
            best = (left, right + 1)
    return best


def shortest_route(graph, start, goal):
    """無權有向圖；鄰接順序決定同長路徑的選擇。"""
    parent = {start: None}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        if node == goal:
            path = []
            while node is not None:
                path.append(node)
                node = parent[node]
            return path[::-1]
        for neighbor in graph.get(node, ()):
            if neighbor not in parent:
                parent[neighbor] = node
                queue.append(neighbor)
    return []


def first_at_least(values, target):
    lo, hi = 0, len(values)
    while lo < hi:
        mid = (lo + hi) // 2
        if values[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo


def count_target_sum(values, target):
    """連續非空子陣列總和；支援負值。"""
    seen = {0: 1}
    total = answer = 0
    for value in values:
        total += value
        answer += seen.get(total - target, 0)
        seen[total] = seen.get(total, 0) + 1
    return answer


def brute_window(labels, k):
    best = (0, 0)
    for left in range(len(labels) + 1):
        for right in range(left, len(labels) + 1):
            if len(set(labels[left:right])) <= k and right - left > best[1] - best[0]:
                best = (left, right)
    return best


def run_tests():
    assert longest_label_window(["A", "B", "A", "C", "C", "B", "B"], 2) == (3, 7)
    assert longest_label_window([], 2) == (0, 0)
    assert longest_label_window(["X", "Y"], 0) == (0, 0)
    assert longest_label_window(["X", "Y"], 5) == (0, 2)
    for n in range(7):
        for labels in product("ABC", repeat=n):
            for k in range(4):
                assert longest_label_window(labels, k) == brute_window(labels, k)
    graph = {"S": ["A", "B"], "A": ["C"], "B": ["C", "T"], "C": ["S", "T"], "T": []}
    assert shortest_route(graph, "S", "T") == ["S", "B", "T"]
    assert shortest_route(graph, "S", "S") == ["S"]
    assert shortest_route(graph, "T", "S") == []
    assert shortest_route({"S": ["A", "A"], "A": ["S"]}, "S", "T") == []
    assert shortest_route({}, "S", "T") == []
    # 所有三節點有向圖（含自環），用 Floyd-Warshall 獨立驗證 BFS 距離。
    nodes = ["0", "1", "2"]
    for mask in range(1 << 9):
        tiny = {node: [] for node in nodes}
        distance = [[0 if i == j else float("inf") for j in range(3)] for i in range(3)]
        for i in range(3):
            for j in range(3):
                if mask & (1 << (3 * i + j)):
                    tiny[nodes[i]].append(nodes[j])
                    distance[i][j] = min(distance[i][j], 1)
        for k in range(3):
            for i in range(3):
                for j in range(3):
                    distance[i][j] = min(distance[i][j], distance[i][k] + distance[k][j])
        for i, start in enumerate(nodes):
            for j, goal in enumerate(nodes):
                path = shortest_route(tiny, start, goal)
                if distance[i][j] == float("inf"):
                    assert path == []
                else:
                    assert len(path) - 1 == distance[i][j]
                    assert path[0] == start and path[-1] == goal
                    assert all(v in tiny[u] for u, v in zip(path, path[1:]))
    try:
        longest_label_window(["A"], -1)
    except ValueError:
        pass
    else:
        raise AssertionError("應拒絕負 k")
    assert first_at_least([], 1) == 0
    assert first_at_least([1, 3, 3, 5], 3) == 1
    assert first_at_least([1, 3, 3, 5], 6) == 4
    assert count_target_sum([2, -2, 2], 2) == 3
    assert count_target_sum([0, 0], 0) == 3
    assert count_target_sum([], 0) == 0
    for n in range(6):
        for values in product((-1, 0, 1), repeat=n):
            for target in range(-2, 3):
                brute = sum(sum(values[left:right]) == target
                            for left in range(n) for right in range(left + 1, n + 1))
                assert count_target_sum(values, target) == brute


if __name__ == "__main__":
    run_tests()
