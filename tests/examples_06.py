"""Chapter 06: original, executable examples. Python 3.10+, standard library."""
from __future__ import annotations
from collections import deque
from dataclasses import dataclass


@dataclass
class Node:
    value: int
    left: Node | None = None
    right: Node | None = None


def preorder(root: Node | None) -> list[int]:
    if root is None:
        return []
    result, stack = [], [root]
    while stack:
        node = stack.pop()
        result.append(node.value)
        # LIFO: push right first so left is visited first.
        if node.right is not None:
            stack.append(node.right)
        if node.left is not None:
            stack.append(node.left)
    return result


def inorder(root: Node | None) -> list[int]:
    result = []

    def visit(node: Node | None) -> None:
        if node is None:
            return
        visit(node.left)
        result.append(node.value)
        visit(node.right)

    visit(root)
    return result


def tree_height(root: Node | None) -> int:
    # Height is measured in edges: empty = -1, leaf = 0.
    if root is None:
        return -1
    return 1 + max(tree_height(root.left), tree_height(root.right))


def level_order(root: Node | None) -> list[list[int]]:
    if root is None:
        return []
    result, queue = [], deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.value)
            if node.left is not None:
                queue.append(node.left)
            if node.right is not None:
                queue.append(node.right)
        result.append(level)
    return result


def bst_search(root: Node | None, target: int) -> Node | None:
    while root is not None:
        if root.value == target:
            return root
        root = root.left if target < root.value else root.right
    return None


def is_valid_bst(root: Node | None) -> bool:
    # Strict BST: duplicate keys are not permitted.
    stack = [(root, None, None)]
    while stack:
        node, lower, upper = stack.pop()
        if node is None:
            continue
        if lower is not None and node.value <= lower:
            return False
        if upper is not None and node.value >= upper:
            return False
        stack.append((node.right, node.value, upper))
        stack.append((node.left, lower, node.value))
    return True


def dfs_reachable(graph: list[list[int]], start: int) -> set[int]:
    seen, stack = {start}, [start]
    while stack:
        node = stack.pop()
        for neighbor in graph[node]:
            if neighbor not in seen:
                seen.add(neighbor)  # Mark before pushing.
                stack.append(neighbor)
    return seen


def shortest_path(graph: list[list[int]], start: int,
                  target: int) -> list[int] | None:
    parent = {start: None}
    queue = deque([start])
    while queue:
        node = queue.popleft()
        if node == target:
            path = []
            while node is not None:
                path.append(node)
                node = parent[node]
            return path[::-1]
        for neighbor in graph[node]:
            if neighbor not in parent:
                parent[neighbor] = node
                queue.append(neighbor)
    return None


def grid_distance(grid: list[list[int]]) -> int:
    # 0 = open, 1 = wall. Return the number of moves, not cells.
    if not grid:
        return -1
    rows, cols = len(grid), len(grid[0])
    if any(len(row) != cols for row in grid):
        raise ValueError('grid must be rectangular')
    if cols == 0:
        return -1
    if grid[0][0] or grid[-1][-1]:
        return -1
    queue = deque([(0, 0, 0)])
    seen = {(0, 0)}
    while queue:
        row, col, distance = queue.popleft()
        if (row, col) == (rows - 1, cols - 1):
            return distance
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = row + dr, col + dc
            if (0 <= nr < rows and 0 <= nc < cols
                    and grid[nr][nc] == 0 and (nr, nc) not in seen):
                seen.add((nr, nc))
                queue.append((nr, nc, distance + 1))
    return -1


def leaf_sum(root: Node | None) -> int:
    if root is None:
        return 0
    total, stack = 0, [root]
    while stack:
        node = stack.pop()
        if node.left is None and node.right is None:
            total += node.value
        if node.right is not None:
            stack.append(node.right)
        if node.left is not None:
            stack.append(node.left)
    return total


def component_sizes(graph: list[list[int]]) -> list[int]:
    # graph must be undirected; every edge is represented both ways.
    seen, sizes = set(), []
    for start in range(len(graph)):
        if start in seen:
            continue
        seen.add(start)
        stack, size = [start], 0
        while stack:
            node = stack.pop()
            size += 1
            for neighbor in graph[node]:
                if neighbor not in seen:
                    seen.add(neighbor)
                    stack.append(neighbor)
        sizes.append(size)
    return sizes


def grid_one_break(grid: list[list[int]]) -> int:
    # At most one wall cell may be entered; start/end must be open.
    if not grid:
        return -1
    rows, cols = len(grid), len(grid[0])
    if any(len(row) != cols for row in grid):
        raise ValueError('grid must be rectangular')
    if cols == 0:
        return -1
    if grid[0][0] or grid[-1][-1]:
        return -1
    queue = deque([(0, 0, 0, 0)])  # row, col, used, moves
    seen = {(0, 0, 0)}
    while queue:
        row, col, used, moves = queue.popleft()
        if (row, col) == (rows - 1, cols - 1):
            return moves
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = row + dr, col + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                next_used = used + grid[nr][nc]
                state = (nr, nc, next_used)
                if next_used <= 1 and state not in seen:
                    seen.add(state)
                    queue.append((nr, nc, next_used, moves + 1))
    return -1


def topological_order(graph: list[list[int]]) -> list[int] | None:
    """邊 u → v 表示 u 必須先於 v；有環回傳 None，空圖回傳 []。"""
    indegree = [0] * len(graph)
    for neighbors in graph:
        for neighbor in neighbors:
            indegree[neighbor] += 1
    ready = deque(node for node, degree in enumerate(indegree) if degree == 0)
    order = []
    while ready:
        node = ready.popleft()
        order.append(node)
        for neighbor in graph[node]:
            indegree[neighbor] -= 1
            if indegree[neighbor] == 0:
                ready.append(neighbor)
    return order if len(order) == len(graph) else None


def tests() -> None:
    tree = Node(12, Node(5, Node(2), Node(9)), Node(18, None, Node(21)))
    assert preorder(tree) == [12, 5, 2, 9, 18, 21]
    assert inorder(tree) == [2, 5, 9, 12, 18, 21]
    assert level_order(tree) == [[12], [5, 18], [2, 9, 21]]
    assert is_valid_bst(tree)
    assert tree_height(tree) == 2
    assert tree_height(None) == -1 and tree_height(Node(3)) == 0
    assert bst_search(tree, 9) is tree.left.right
    assert bst_search(tree, 7) is None
    bad = Node(12, Node(5), Node(18, Node(9), None))
    assert not is_valid_bst(bad)  # 9 respects parent 18, violates ancestor 12.
    assert not is_valid_bst(Node(4, Node(4)))
    assert is_valid_bst(None)
    assert preorder(None) == inorder(None) == level_order(None) == []
    assert bst_search(None, 1) is None
    assert leaf_sum(tree) == 32
    assert leaf_sum(None) == 0
    assert leaf_sum(Node(-8)) == -8
    graph = [[1, 2], [0, 3], [0, 3], [1, 2, 4], [3], []]
    assert dfs_reachable(graph, 0) == {0, 1, 2, 3, 4}
    assert shortest_path(graph, 0, 4) == [0, 1, 3, 4]
    assert shortest_path(graph, 0, 0) == [0]
    assert shortest_path(graph, 0, 5) is None
    assert component_sizes(graph) == [5, 1]
    assert component_sizes([]) == []
    assert component_sizes([[], [], []]) == [1, 1, 1]
    assert dfs_reachable([[0, 1, 1], []], 0) == {0, 1}
    assert shortest_path([[0, 1, 1], []], 0, 1) == [0, 1]
    board = [[0, 0, 1, 0], [1, 0, 0, 0], [0, 0, 1, 0]]
    assert grid_distance(board) == 5
    assert grid_distance([[0]]) == 0
    assert grid_distance([[1]]) == -1
    assert grid_distance([]) == -1
    assert grid_distance([[0, 1], [1, 0]]) == -1
    assert grid_one_break([[0, 1], [1, 0]]) == 2
    assert grid_one_break([[0, 1, 1, 0]]) == -1
    assert grid_one_break([[0]]) == 0
    assert grid_one_break(board) == 5
    for distance in (grid_distance, grid_one_break):
        assert distance([[], []]) == -1
        for ragged in ([[], [0]], [[0], []], [[0, 0], [0]]):
            try:
                distance(ragged)
            except ValueError:
                pass
            else:
                raise AssertionError('非矩形網格應拋 ValueError')
    dependencies = [[2], [2, 3], [4], [4], []]
    order = topological_order(dependencies)
    assert order == [0, 1, 2, 3, 4]
    position = {node: index for index, node in enumerate(order)}
    assert all(position[u] < position[v]
               for u, neighbors in enumerate(dependencies) for v in neighbors)
    assert topological_order([]) == []
    assert topological_order([[], []]) == [0, 1]
    assert topological_order([[1, 1], []]) == [0, 1]
    assert topological_order([[0]]) is None
    assert topological_order([[1], [0], []]) is None
    # Every 3-by-3 grid with open endpoints: allowing a wall break cannot hurt.
    for mask in range(1 << 7):
        flat = [0] + [(mask >> i) & 1 for i in range(7)] + [0]
        board = [flat[i:i + 3] for i in range(0, 9, 3)]
        plain, with_break = grid_distance(board), grid_one_break(board)
        if plain != -1:
            assert 0 <= with_break <= plain


if __name__ == '__main__':
    tests()
