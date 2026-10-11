"""第 02 章可執行範例與窮舉對照。"""
from itertools import product


def two_sum_sorted(nums: list[int], target: int):
    """前置條件：nums 已依非遞減順序排序。回傳兩個不同索引或 None。"""
    left, right = 0, len(nums) - 1
    while left < right:
        current = nums[left] + nums[right]
        if current == target:
            return left, right
        if current < target:
            left += 1
        else:
            right -= 1
    return None


def longest_budget_window(nums: list[int], budget: int) -> tuple[int, int]:
    """回傳最長合法半開區間；同長時取最早者。僅接受非負整數。"""
    if budget < 0 or any(value < 0 for value in nums):
        raise ValueError("budget 與元素必須非負")
    left = 0
    total = 0
    best = (0, 0)
    for right, value in enumerate(nums):
        total += value
        while total > budget:
            total -= nums[left]
            left += 1
        if right + 1 - left > best[1] - best[0]:
            best = (left, right + 1)
    return best


def build_prefix(nums: list[int]) -> list[int]:
    prefix = [0]
    for value in nums:
        prefix.append(prefix[-1] + value)
    return prefix


def range_sum(prefix: list[int], left: int, right: int) -> int:
    if not 0 <= left <= right < len(prefix):
        raise ValueError("區間必須符合 0 <= left <= right <= n")
    return prefix[right] - prefix[left]


def remove_value(nums: list[int], unwanted: int) -> int:
    """原地穩定壓縮；僅前 write 個元素是有效輸出。"""
    write = 0
    for read in range(len(nums)):
        if nums[read] != unwanted:
            nums[write] = nums[read]
            write += 1
    return write


def max_fixed_window_sum(nums: list[int], k: int) -> int:
    if not 1 <= k <= len(nums):
        raise ValueError("k 必須介於 1 與陣列長度之間")
    current = sum(nums[i] for i in range(k))
    best = current
    for right in range(k, len(nums)):
        current += nums[right] - nums[right - k]
        best = max(best, current)
    return best


def min_length_at_least(nums: list[int], target: int) -> int:
    """最短非空區間：元素非負、target > 0；無解回傳 0。"""
    if target <= 0 or any(value < 0 for value in nums):
        raise ValueError("target 必須為正，元素必須非負")
    left, total = 0, 0
    best = len(nums) + 1
    for right, value in enumerate(nums):
        total += value
        while total >= target:
            best = min(best, right - left + 1)
            total -= nums[left]
            left += 1
    return 0 if best == len(nums) + 1 else best


if __name__ == "__main__":
    checked = 0
    for length in range(6):
        for values in product((0, 1, 3), repeat=length):
            nums = list(values)
            for budget in range(6):
                candidates = [(l, r) for l in range(length + 1)
                              for r in range(l, length + 1)
                              if sum(nums[l:r]) <= budget]
                expected = max(candidates, key=lambda pair: (pair[1] - pair[0], -pair[0]))
                assert longest_budget_window(nums, budget) == expected
            prefix = build_prefix(nums)
            for left in range(length + 1):
                for right in range(left, length + 1):
                    assert range_sum(prefix, left, right) == sum(nums[left:right])
            for target in range(1, 7):
                lengths = [r - l for l in range(length)
                           for r in range(l + 1, length + 1)
                           if sum(nums[l:r]) >= target]
                assert min_length_at_least(nums, target) == min(lengths, default=0)
            for unwanted in (0, 1, 3, 8):
                copy = nums[:]
                valid = remove_value(copy, unwanted)
                assert copy[:valid] == [x for x in nums if x != unwanted]
            checked += 1
    for length in range(6):
        for values in product((-2, 0, 3), repeat=length):
            nums = list(values)
            ordered = sorted(nums)
            for target in range(-4, 7):
                expected = any(ordered[i] + ordered[j] == target
                               for i in range(length) for j in range(i + 1, length))
                result = two_sum_sorted(ordered, target)
                assert (result is not None) == expected
                if result is not None:
                    i, j = result
                    assert 0 <= i < j < length and ordered[i] + ordered[j] == target
            for k in range(1, length + 1):
                assert max_fixed_window_sum(nums, k) == max(
                    sum(nums[i:i + k]) for i in range(length - k + 1))
    assert two_sum_sorted([-6, -2, 1, 5, 9], 6) == (2, 3)
    assert longest_budget_window([2, 1, 3, 1, 1, 2], 5) == (1, 4)
    assert build_prefix([3, -2, 5, 1]) == [0, 3, 1, 6, 7]
    assert range_sum(build_prefix([3, -2, 5, 1]), 1, 4) == 4
    for call in (lambda: longest_budget_window([4, -3, 2], 3),
                 lambda: longest_budget_window([], -1),
                 lambda: max_fixed_window_sum([], 1),
                 lambda: max_fixed_window_sum([1], 0),
                 lambda: min_length_at_least([1], 0),
                 lambda: min_length_at_least([-1], 1),
                 lambda: range_sum([0, 2], 1, 2)):
        try:
            call()
            raise AssertionError("不合法輸入應被拒絕")
        except ValueError:
            pass
    print(f"chapter 02: {checked} nonnegative arrays + signed-array and boundary checks passed")
