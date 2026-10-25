"""第 03 章可執行範例與窮舉對照。"""
from itertools import product


def first_repeated(nums: list[int]):
    """回傳掃描時首先重複出現的整數；無重複回傳 None。"""
    seen = set()
    for value in nums:
        if value in seen:
            return value
        seen.add(value)
    return None


def count_equal_pairs(nums: list[int]) -> int:
    freq = {}
    pairs = 0
    for value in nums:
        old_count = freq.get(value, 0)
        pairs += old_count
        freq[value] = old_count + 1
    return pairs


def two_sum_any(nums: list[int], target: int):
    first_index = {}
    for index, value in enumerate(nums):
        complement = target - value
        if complement in first_index:
            return first_index[complement], index
        first_index.setdefault(value, index)
    return None


def count_subarrays_sum(nums: list[int], target: int) -> int:
    freq = {0: 1}
    prefix = 0
    answer = 0
    for value in nums:
        prefix += value
        answer += freq.get(prefix - target, 0)
        freq[prefix] = freq.get(prefix, 0) + 1
    return answer


def longest_subarray_sum(nums: list[int], target: int) -> tuple[int, int]:
    """回傳最長非空符合區間，同長取最早；無解回傳 (0, 0)。"""
    first_position = {0: 0}
    prefix = 0
    best = (0, 0)
    for end, value in enumerate(nums, start=1):
        prefix += value
        needed = prefix - target
        if needed in first_position:
            start = first_position[needed]
            if end - start > best[1] - best[0]:
                best = (start, end)
        first_position.setdefault(prefix, end)
    return best


def longest_unique_window(text: str) -> tuple[int, int]:
    """最長無重複字元區間；同長取最早，回傳半開邊界。"""
    last_position = {}
    left = 0
    best = (0, 0)
    for right, char in enumerate(text):
        left = max(left, last_position.get(char, -1) + 1)
        if right + 1 - left > best[1] - best[0]:
            best = (left, right + 1)
        last_position[char] = right
    return best


def group_anagrams(words: list[str]) -> list[list[str]]:
    """只接受 a 到 z；保留各組輸入順序及分組首次出現順序。"""
    groups = {}
    for word in words:
        counts = [0] * 26
        for char in word:
            if not "a" <= char <= "z":
                raise ValueError("只接受小寫英文字母 a 到 z")
            counts[ord(char) - ord("a")] += 1
        key = tuple(counts)
        groups.setdefault(key, []).append(word)
    return list(groups.values())


if __name__ == "__main__":
    checked = 0
    for length in range(7):
        for values in product((-1, 0, 2), repeat=length):
            nums = list(values)
            expected_repeat = next((nums[i] for i in range(length) if nums[i] in nums[:i]), None)
            assert first_repeated(nums) == expected_repeat
            assert count_equal_pairs(nums) == sum(nums[i] == nums[j]
                for i in range(length) for j in range(i + 1, length))
            for target in range(-3, 5):
                candidates = [(l, r) for l in range(length)
                              for r in range(l + 1, length + 1)
                              if sum(nums[l:r]) == target]
                assert count_subarrays_sum(nums, target) == len(candidates)
                expected = max(candidates, key=lambda pair: (pair[1] - pair[0], -pair[0]), default=(0, 0))
                assert longest_subarray_sum(nums, target) == expected
                result = two_sum_any(nums, target)
                expected_exists = any(nums[i] + nums[j] == target
                    for i in range(length) for j in range(i + 1, length))
                assert (result is not None) == expected_exists
                if result is not None:
                    i, j = result
                    assert 0 <= i < j < length and nums[i] + nums[j] == target
            checked += 1
    assert first_repeated([8, 3, 8, 3]) == 8
    assert count_equal_pairs([4, 4, 7, 4, 7]) == 4
    assert count_subarrays_sum([2, -1, 2, 1, -2], 2) == 4
    assert count_subarrays_sum([0, 0, 0], 0) == 6
    assert longest_subarray_sum([1, -1, 1], 1) == (0, 3)
    assert two_sum_any([1, 2, 8, 9], 10) == (1, 2)
    assert two_sum_any([3, 3, 7], 10) == (0, 2)
    for text, expected in [("", (0, 0)), ("aaaa", (0, 1)), ("abba", (0, 2)),
                           ("tmmzuxt", (2, 7)), ("資🙂料🙂", (0, 3))]:
        assert longest_unique_window(text) == expected
    assert group_anagrams(["arc", "b", "car", "", "", "rab", "bar"]) == [
        ["arc", "car"], ["b"], ["", ""], ["rab", "bar"]]
    assert group_anagrams([]) == []
    try:
        group_anagrams(["É"])
        raise AssertionError("字母表限制應被檢查")
    except ValueError:
        pass
    # 相同 hash 不代表相同鍵；容器仍以相等性區分。
    class Colliding:
        def __init__(self, value):
            self.value = value
        def __hash__(self):
            return 0
        def __eq__(self, other):
            return isinstance(other, Colliding) and self.value == other.value
    assert len({Colliding(1), Colliding(2), Colliding(1)}) == 2
    print(f"chapter 03: {checked} arrays + grouping and collision checks passed")
