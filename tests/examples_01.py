"""第 01 章可執行範例。Python 3.10+，僅使用標準函式庫。"""
from itertools import product


def count_position_pairs(n: int) -> int:
    """計算 0 <= j < i < n 的位置對數，不儲存所有位置對。"""
    if n < 0:
        raise ValueError("n 必須非負")
    pairs = 0
    for i in range(n):
        for j in range(i):
            pairs += 1
    return pairs


def linear_total(nums: list[int]) -> int:
    total = 0
    for value in nums:
        total += value
    return total


def recursive_total(nums: list[int]) -> int:
    """以半開區間分治；不建立 nums 的切片。"""
    def total(lo: int, hi: int) -> int:
        if lo == hi:
            return 0
        if hi - lo == 1:
            return nums[lo]
        mid = (lo + hi) // 2
        left = total(lo, mid)
        right = total(mid, hi)
        return left + right

    return total(0, len(nums))


def halving_steps(n: int) -> int:
    if n < 0:
        raise ValueError("n 必須非負")
    steps = 0
    while n > 0:
        n //= 2
        steps += 1
    return steps


def join_tokens(tokens: list[str]) -> str:
    return "".join(tokens)


if __name__ == "__main__":
    for n in range(100):
        assert count_position_pairs(n) == n * (n - 1) // 2
        assert halving_steps(n) == n.bit_length()
    checked = 0
    for length in range(7):
        for values in product((-2, 0, 3), repeat=length):
            nums = list(values)
            assert linear_total(nums) == sum(nums)
            assert recursive_total(nums) == sum(nums)
            checked += 1
    assert recursive_total([7, -2, 5, 4]) == 14
    assert join_tokens([]) == ""
    assert join_tokens(["資料", "與", "演算法"]) == "資料與演算法"
    for fn in (count_position_pairs, halving_steps):
        try:
            fn(-1)
            raise AssertionError("負數應被拒絕")
        except ValueError:
            pass
    print(f"chapter 01: {checked} arrays + counting and boundary checks passed")
