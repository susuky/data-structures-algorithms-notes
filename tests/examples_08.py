"""第 08 章的可執行範例與窮舉對照測試；Python 3，僅標準函式庫。"""
from itertools import permutations, combinations, product


def select_intervals(intervals):
    """選最多個互不重疊半開區間 [start, end)；要求 start < end。"""
    if any(start >= end for start, end in intervals):
        raise ValueError("區間必須有正長度")
    chosen = []
    last_end = None
    for start, end in sorted(intervals, key=lambda x: (x[1], x[0])):
        if last_end is None or start >= last_end:
            chosen.append((start, end))
            last_end = end
    return chosen


def schedule_shortest_first(durations):
    """所有工作在時間 0 可開始，回傳順序及總等待時間。"""
    if any(duration < 0 for duration in durations):
        raise ValueError("工時不可為負")
    order = sorted(durations)
    elapsed = total_wait = 0
    for duration in order:
        total_wait += elapsed
        elapsed += duration
    return order, total_wait


def can_reach_end(jumps):
    """jumps[i] 是由 i 往右最多前進的步數；空陣列視為可完成。"""
    if any(jump < 0 for jump in jumps):
        raise ValueError("步數不可為負")
    farthest = 0
    for i, jump in enumerate(jumps):
        if i > farthest:
            return False
        farthest = max(farthest, i + jump)
        if farthest >= len(jumps) - 1:
            return True
    return True


def brute_interval_count(intervals):
    best = 0
    for count in range(len(intervals) + 1):
        for subset in combinations(intervals, count):
            ordered = sorted(subset)
            if all(ordered[i - 1][1] <= ordered[i][0]
                   for i in range(1, len(ordered))):
                best = max(best, count)
    return best


def waiting_time(order):
    elapsed = total = 0
    for duration in order:
        total += elapsed
        elapsed += duration
    return total


def run_tests():
    sample = [(0, 4), (1, 3), (3, 5), (4, 7), (5, 8), (7, 9)]
    assert select_intervals(sample) == [(1, 3), (3, 5), (5, 8)]
    assert select_intervals([]) == []
    assert select_intervals([(-4, -2), (-2, 0), (-3, 1)]) == [(-4, -2), (-2, 0)]
    assert select_intervals([(0, 2), (0, 2), (2, 3)]) == [(0, 2), (2, 3)]
    universe = [(0, 1), (0, 3), (1, 2), (1, 4), (2, 3), (3, 4)]
    for size in range(len(universe) + 1):
        for case in combinations(universe, size):
            assert len(select_intervals(case)) == brute_interval_count(case)
    assert schedule_shortest_first([6, 2, 4]) == ([2, 4, 6], 8)
    assert schedule_shortest_first([]) == ([], 0)
    assert schedule_shortest_first([0, 3, 0]) == ([0, 0, 3], 0)
    for jobs in ([3, 1, 2], [5, 0, 2, 2], [4], [7, 2, 6, 1]):
        assert schedule_shortest_first(jobs)[1] == min(map(waiting_time, permutations(jobs)))
    assert can_reach_end([2, 1, 0, 1]) is False
    assert can_reach_end([2, 2, 0, 1]) is True
    assert can_reach_end([]) is True
    assert can_reach_end([0]) is True
    assert can_reach_end([0, 1]) is False
    for size in range(7):
        for jumps in product(range(3), repeat=size):
            reachable = {0}
            for i in range(size):
                if i in reachable:
                    reachable.update(range(i + 1, min(size, i + jumps[i] + 1)))
            expected = not jumps or size - 1 in reachable
            assert can_reach_end(jumps) == expected
    for invalid in ([(1, 1)], [(2, 1)]):
        try:
            select_intervals(invalid)
        except ValueError:
            pass
        else:
            raise AssertionError("應拒絕非正長度區間")
    for function in (schedule_shortest_first, can_reach_end):
        try:
            function([-1])
        except ValueError:
            pass
        else:
            raise AssertionError("應拒絕負值")


if __name__ == "__main__":
    run_tests()
