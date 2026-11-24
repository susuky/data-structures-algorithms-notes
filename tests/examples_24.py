from collections import Counter, deque
from itertools import combinations

def triples_with_sum(values, target):
    answer = []
    for i in range(len(values)):
        for j in range(i + 1, len(values)):
            for k in range(j + 1, len(values)):
                if values[i] + values[j] + values[k] == target:
                    answer.append((i, j, k))
    return answer

def subset_sums(values):
    sums = [0]
    for value in values:
        sums += [total + value for total in sums]
    return sums

def count_subset_sums(values, target):
    middle = len(values) // 2
    left = subset_sums(values[:middle])
    right = Counter(subset_sums(values[middle:]))
    return sum(right[target - total] for total in left)

def simulate_fcfs(jobs):
    if any(arrival < 0 or duration <= 0 for arrival, duration in jobs):
        raise ValueError("到達時間須非負，處理時間須為正")
    ordered = sorted(enumerate(jobs), key=lambda item: (item[1][0], item[0]))
    now, result = 0, []
    for identifier, (arrival, duration) in ordered:
        start = max(now, arrival)
        finish = start + duration
        result.append((identifier, start, finish, start - arrival))
        now = finish
    return result

def run_tests():
    import random
    rng = random.Random(24)
    for n in range(10):
        for _ in range(50):
            values = [rng.randrange(-5, 6) for _ in range(n)]
            target = rng.randrange(-8, 9)
            expected = [ids for ids in combinations(range(n), 3)
                        if sum(values[i] for i in ids) == target]
            assert triples_with_sum(values, target) == expected
            brute = sum(sum(values[i] for i in range(n) if mask & (1 << i)) == target
                        for mask in range(1 << n))
            assert count_subset_sums(values, target) == brute
    assert count_subset_sums([0, 0, 0], 0) == 8
    assert count_subset_sums([], 0) == 1
    assert count_subset_sums([], 1) == 0
    for _ in range(200):
        jobs = [(rng.randrange(20), rng.randrange(1, 6)) for _ in range(rng.randrange(9))]
        waiting, current, remaining = deque(), None, 0
        expected, starts, now = [], {}, 0
        while len(expected) < len(jobs):
            if current is not None and remaining == 0:
                expected.append((current, starts[current], now,
                                 starts[current] - jobs[current][0]))
                current = None
            for identifier, (arrival, _) in enumerate(jobs):
                if arrival == now:
                    waiting.append(identifier)
            if current is None and waiting:
                current = waiting.popleft()
                starts[current] = now
                remaining = jobs[current][1]
            if current is not None:
                remaining -= 1
            now += 1
        assert simulate_fcfs(jobs) == expected
    assert simulate_fcfs([(0, 3), (1, 2), (8, 1)]) == [(0, 0, 3, 0), (1, 3, 5, 2), (2, 8, 9, 0)]

if __name__ == "__main__":
    run_tests()
    print("examples_24: 列舉、折半子集合與事件模擬通過")
