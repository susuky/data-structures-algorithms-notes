"""第 04 章：鏈結串列。執行 python3 tests/examples_04.py。"""
from dataclasses import dataclass
from typing import Optional


@dataclass(eq=False)
class Node:
    value: int
    next: Optional["Node"] = None


def from_values(values):
    dummy = Node(0)
    tail = dummy
    for value in values:
        tail.next = Node(value)
        tail = tail.next
    return dummy.next


def to_values(head):
    """僅用於有限、無環串列；測試工具不算進解法的額外空間。"""
    result = []
    while head is not None:
        result.append(head.value)
        head = head.next
    return result


def reverse(head):
    prev, cur = None, head
    while cur is not None:
        following = cur.next
        cur.next = prev
        prev, cur = cur, following
    return prev


def middle_second(head):
    """偶數長度時回傳第二個中點；空串列回傳 None。"""
    slow = fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
    return slow


def cycle_entry(head):
    slow = fast = head
    while fast is not None and fast.next is not None:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            seeker = head
            while seeker is not slow:
                seeker = seeker.next
                slow = slow.next
            return seeker
    return None


def remove_from_end(head, k):
    """移除倒數第 k 個節點；k 無效時拋 ValueError 且不修改串列。"""
    if k <= 0:
        raise ValueError("k 必須為正整數")
    dummy = Node(0, head)
    slow = fast = dummy
    for _ in range(k):
        fast = fast.next
        if fast is None:
            raise ValueError("k 大於串列長度")
    while fast.next is not None:
        slow = slow.next
        fast = fast.next
    slow.next = slow.next.next
    return dummy.next


def merge_sorted(a, b):
    """兩串列必須無環、遞增（可重複），且不能共享任何節點。"""
    dummy = Node(0)
    tail = dummy
    while a is not None and b is not None:
        if a.value <= b.value:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a if a is not None else b
    return dummy.next


def expect_value_error(fn):
    try:
        fn()
    except ValueError:
        return
    raise AssertionError("應拋出 ValueError")


def run_tests():
    assert to_values(reverse(from_values([6, 2, 9]))) == [9, 2, 6]
    for n in range(15):
        values = list(range(n))
        head = from_values(values)
        nodes, cur = [], head
        while cur is not None:
            nodes.append(cur)
            cur = cur.next
        backwards = reverse(head)
        assert to_values(backwards) == values[::-1]
        cur = backwards
        for node in reversed(nodes):
            assert cur is node  # 原節點重接，不能只交換 value。
            cur = cur.next
        assert cur is None
        restored = reverse(backwards)
        assert restored is head
        mid = middle_second(restored)
        assert mid is (nodes[n // 2] if n else None)
        assert cycle_entry(restored) is None
        for k in range(1, n + 1):
            result = remove_from_end(from_values(values), k)
            assert to_values(result) == values[:n - k] + values[n - k + 1:]
        for invalid in (-1, 0, n + 1):
            head2 = from_values(values)
            expect_value_error(lambda: remove_from_end(head2, invalid))
            assert to_values(head2) == values
    for n in range(1, 12):
        for entrance in range(n):
            nodes = [Node(i) for i in range(n)]
            for left, right in zip(nodes, nodes[1:]):
                left.next = right
            nodes[-1].next = nodes[entrance]
            assert cycle_entry(nodes[0]) is nodes[entrance]
    for av, bv in [([], []), ([], [1]), ([1], []), ([1, 4, 8], [2, 4, 7]),
                   ([2, 2], [2, 2]), ([-4, 0], [-3, 9])]:
        assert to_values(merge_sorted(from_values(av), from_values(bv))) == sorted(av + bv)
    a, b = Node(2), Node(2)
    result = merge_sorted(a, b)
    assert result is a and a.next is b and b.next is None  # 相等時取 a，保持穩定。


if __name__ == "__main__":
    run_tests()
