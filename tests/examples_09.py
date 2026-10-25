"""第 09 章的二分邊界、單調答案空間與暴力對照。"""
from bisect import bisect_left, bisect_right
from itertools import combinations_with_replacement, product


def lower_bound(values, target):
    lo, hi = 0, len(values)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if values[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo


def upper_bound(values, target):
    lo, hi = 0, len(values)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if values[mid] <= target:
            lo = mid + 1
        else:
            hi = mid
    return lo


def first_true(n, predicate):
    """predicate 在 [0, n) 先 False 後 True；全 False 回傳 n。"""
    if n < 0:
        raise ValueError("搜尋範圍長度不可為負")
    lo, hi = 0, n
    while lo < hi:
        mid = (lo + hi) // 2
        if predicate(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo


def minimum_capacity(weights, days):
    """依序運送正整數重量；每天裝入一段，可使用少於 days 天。"""
    if days <= 0:
        raise ValueError("天數必須為正整數")
    if any(weight <= 0 for weight in weights):
        raise ValueError("重量必須為正整數")
    if not weights:
        return 0

    def feasible(capacity):
        used_days, load = 1, 0
        for weight in weights:
            if load + weight > capacity:
                used_days += 1
                if used_days > days:
                    return False
                load = 0
            load += weight
        return used_days <= days

    lo, hi = max(weights), sum(weights)
    while lo < hi:
        mid = lo + (hi - lo) // 2
        if feasible(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo


def brute_capacity(weights, days):
    """枚舉切割位置，獨立驗證容量而不重用 greedy checker。"""
    if not weights:
        return 0
    best = sum(weights)
    for mask in range(1 << (len(weights) - 1)):
        if 1 + mask.bit_count() > days:
            continue
        largest = load = weights[0]
        for i in range(1, len(weights)):
            if mask & (1 << (i - 1)):
                largest = max(largest, load)
                load = 0
            load += weights[i]
        best = min(best, max(largest, load))
    return best


def run_tests():
    values = [2, 4, 4, 4, 9]
    assert lower_bound(values, 4) == 1
    assert upper_bound(values, 4) == 4
    assert lower_bound([], 4) == upper_bound([], 4) == 0
    assert lower_bound(values, 10) == len(values)
    assert upper_bound(values, 1) == 0
    for size in range(7):
        for case in combinations_with_replacement(range(-2, 3), size):
            for target in range(-3, 4):
                assert lower_bound(case, target) == bisect_left(case, target)
                assert upper_bound(case, target) == bisect_right(case, target)
    for n in range(20):
        for boundary in range(n + 1):
            assert first_true(n, lambda x, b=boundary: x >= b) == boundary
    calls = []
    assert first_true(0, lambda x: calls.append(x)) == 0
    assert calls == []
    try:
        first_true(-1, lambda x: True)
    except ValueError:
        pass
    else:
        raise AssertionError("應拒絕負範圍長度")
    assert minimum_capacity([3, 2, 4, 1, 3], 3) == 5
    assert minimum_capacity([3, 2, 4, 1, 3], 1) == 13
    assert minimum_capacity([3, 2, 4, 1, 3], 8) == 4
    assert minimum_capacity([], 2) == 0
    for size in range(1, 6):
        for case in product(range(1, 4), repeat=size):
            for days in range(1, size + 2):
                assert minimum_capacity(case, days) == brute_capacity(case, days)
    for weights, days in (([1], 0), ([1, 0], 2), ([-2], 1)):
        try:
            minimum_capacity(weights, days)
        except ValueError:
            pass
        else:
            raise AssertionError("應拒絕無效輸入")


if __name__ == "__main__":
    run_tests()
