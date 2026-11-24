"""Chapter 18: mutable range sums and an AVL ordered set."""
from __future__ import annotations


class SegmentTree:
    def __init__(self, values):
        self.n = len(values)
        self.size = 1
        while self.size < self.n:
            self.size *= 2
        self.tree = [0] * (2 * self.size)
        self.tree[self.size:self.size + self.n] = values
        for p in range(self.size - 1, 0, -1):
            self.tree[p] = self.tree[2 * p] + self.tree[2 * p + 1]

    def assign(self, index, value):
        if not 0 <= index < self.n:
            raise IndexError(index)
        p = self.size + index
        self.tree[p] = value
        while p > 1:
            p //= 2
            self.tree[p] = self.tree[2 * p] + self.tree[2 * p + 1]

    def sum(self, left, right):
        if not 0 <= left <= right <= self.n:
            raise IndexError((left, right))
        left += self.size
        right += self.size
        answer = 0
        while left < right:
            if left & 1:
                answer += self.tree[left]
                left += 1
            if right & 1:
                right -= 1
                answer += self.tree[right]
            left //= 2
            right //= 2
        return answer


class Fenwick:
    def __init__(self, values):
        self.n = len(values)
        self.bit = [0] + list(values)
        for i in range(1, self.n + 1):
            parent = i + (i & -i)
            if parent <= self.n:
                self.bit[parent] += self.bit[i]

    def add(self, index, delta):
        if not 0 <= index < self.n:
            raise IndexError(index)
        i = index + 1
        while i <= self.n:
            self.bit[i] += delta
            i += i & -i

    def prefix(self, end):
        if not 0 <= end <= self.n:
            raise IndexError(end)
        answer = 0
        while end:
            answer += self.bit[end]
            end -= end & -end
        return answer

    def sum(self, left, right):
        if not 0 <= left <= right <= self.n:
            raise IndexError((left, right))
        return self.prefix(right) - self.prefix(left)


class AVLNode:
    def __init__(self, key):
        self.key = key
        self.left = self.right = None
        self.height = 1


def height(node):
    return node.height if node else 0


def refresh(node):
    node.height = 1 + max(height(node.left), height(node.right))
    return node


def rotate_right(top):
    root = top.left
    top.left = root.right
    root.right = refresh(top)
    return refresh(root)


def rotate_left(top):
    root = top.right
    top.right = root.left
    root.left = refresh(top)
    return refresh(root)


def balance(node):
    refresh(node)
    if height(node.left) - height(node.right) > 1:
        if height(node.left.left) < height(node.left.right):
            node.left = rotate_left(node.left)
        return rotate_right(node)
    if height(node.right) - height(node.left) > 1:
        if height(node.right.right) < height(node.right.left):
            node.right = rotate_right(node.right)
        return rotate_left(node)
    return node


class OrderedSet:
    def __init__(self):
        self.root = None

    def add(self, key):
        def insert(node):
            if node is None:
                return AVLNode(key)
            if key < node.key:
                node.left = insert(node.left)
            elif key > node.key:
                node.right = insert(node.right)
            return balance(node)
        self.root = insert(self.root)

    def discard(self, key):
        def remove(node, value):
            if node is None:
                return None
            if value < node.key:
                node.left = remove(node.left, value)
            elif value > node.key:
                node.right = remove(node.right, value)
            elif node.left is None:
                return node.right
            elif node.right is None:
                return node.left
            else:
                successor = node.right
                while successor.left:
                    successor = successor.left
                node.key = successor.key
                node.right = remove(node.right, successor.key)
            return balance(node)
        self.root = remove(self.root, key)

    def lower_bound(self, key):
        node, answer = self.root, None
        while node:
            if node.key >= key:
                answer, node = node.key, node.left
            else:
                node = node.right
        return answer

    def values(self):
        def walk(node):
            if node:
                yield from walk(node.left)
                yield node.key
                yield from walk(node.right)
        return list(walk(self.root))


def compressed_counts(values):
    coordinates = sorted(set(values))
    rank = {value: i for i, value in enumerate(coordinates)}
    counts = Fenwick([0] * len(coordinates))
    answer = []
    for value in values:
        i = rank[value]
        answer.append(counts.prefix(i))
        counts.add(i, 1)
    return answer


def _check_avl(node, lo=float('-inf'), hi=float('inf')):
    if node is None:
        return 0
    assert lo < node.key < hi
    left = _check_avl(node.left, lo, node.key)
    right = _check_avl(node.right, node.key, hi)
    assert abs(left - right) <= 1
    assert node.height == 1 + max(left, right)
    return node.height


if __name__ == '__main__':
    from itertools import product, permutations
    import random
    checks = 0
    for n in range(6):
        for seq in product((-2, 0, 3), repeat=n):
            values = list(seq)
            segment, bit = SegmentTree(values), Fenwick(values)
            for left in range(n + 1):
                for right in range(left, n + 1):
                    assert segment.sum(left, right) == sum(values[left:right])
                    assert bit.sum(left, right) == sum(values[left:right])
                    checks += 2
            for i in range(n):
                old = values[i]
                values[i] = 7 - i
                segment.assign(i, values[i])
                bit.add(i, values[i] - old)
                assert segment.sum(0, n) == bit.sum(0, n) == sum(values)
                checks += 1
    for order in permutations(range(6)):
        ordered = OrderedSet()
        for key in order:
            ordered.add(key)
            _check_avl(ordered.root)
        for key in order:
            ordered.discard(key)
            _check_avl(ordered.root)
            checks += 1
        assert ordered.values() == []
    rng, ordered, reference = random.Random(18), OrderedSet(), set()
    for _ in range(1500):
        key = rng.randrange(-30, 31)
        if rng.randrange(2):
            ordered.add(key)
            reference.add(key)
        else:
            ordered.discard(key)
            reference.discard(key)
        _check_avl(ordered.root)
        assert ordered.values() == sorted(reference)
        assert ordered.lower_bound(key) == min((x for x in reference if x >= key), default=None)
        checks += 3
    for seq in product((-10**9, 2, 10**9), repeat=5):
        assert compressed_counts(seq) == [sum(v < seq[i] for v in seq[:i]) for i in range(len(seq))]
        checks += 1
    print(f'Chapter 18: {checks} independent range, AVL, and rank checks passed')
