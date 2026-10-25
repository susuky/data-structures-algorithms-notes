# 第 11 章可執行範例與小型暴力比對；Python 3.10+

from functools import cache
from math import inf


def minimum_coins_memo(coins, amount):
    values = tuple(sorted(set(coins)))
    if amount < 0 or any(c <= 0 for c in values):
        raise ValueError("amount 必須非負，硬幣面額必須為正整數")

    @cache
    def best(remain):
        if remain == 0:
            return 0
        answer = inf
        for coin in values:
            if coin > remain:
                break
            answer = min(answer, 1 + best(remain - coin))
        return answer

    answer = best(amount)
    return -1 if answer == inf else answer


def minimum_coins(coins, amount):
    values = sorted(set(coins))
    if amount < 0 or any(c <= 0 for c in values):
        raise ValueError("amount 必須非負，硬幣面額必須為正整數")
    dp = [float("inf")] * (amount + 1)
    dp[0] = 0
    for total in range(1, amount + 1):
        for coin in values:
            if coin > total:
                break
            dp[total] = min(dp[total], dp[total - coin] + 1)
    return -1 if dp[amount] == float("inf") else dp[amount]


def minimum_coin_solution(coins, amount):
    """回傳一組最少硬幣；無解為 None，金額 0 為 []。"""
    values = sorted(set(coins))
    if amount < 0 or any(coin <= 0 for coin in values):
        raise ValueError("amount 必須非負，硬幣面額必須為正整數")
    dp = [float("inf")] * (amount + 1)
    chosen = [0] * (amount + 1)
    dp[0] = 0
    for total in range(1, amount + 1):
        for coin in values:
            if coin > total:
                break
            candidate = dp[total - coin] + 1
            if candidate < dp[total]:
                dp[total] = candidate
                chosen[total] = coin
    if dp[amount] == float("inf"):
        return None
    answer = []
    while amount:
        coin = chosen[amount]
        answer.append(coin)
        amount -= coin
    return answer

def knapsack_01(items, capacity):
    """items 為 (正整數重量, 價值)；可不選，總重至多 capacity。"""
    if capacity < 0:
        raise ValueError("capacity 必須非負")
    dp = [0] * (capacity + 1)
    for weight, value in items:
        if weight <= 0:
            raise ValueError("重量必須為正整數")
        for limit in range(capacity, weight - 1, -1):
            dp[limit] = max(dp[limit], dp[limit - weight] + value)
    return dp[capacity]


def lcs_length(a, b):
    """子序列可跳過元素，但不能改變相對次序。"""
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]


def minimum_grid_path(grid):
    """只能往右或下；None 是障礙。回傳最小總和，無路可走則 None。"""
    if not grid:
        return None
    rows, cols = len(grid), len(grid[0])
    if any(len(row) != cols for row in grid):
        raise ValueError("grid 必須為矩形")
    if cols == 0:
        return None
    infinity = float("inf")
    dp = [infinity] * cols
    for r in range(rows):
        for c in range(cols):
            cost = grid[r][c]
            if cost is None:
                dp[c] = infinity
            elif r == 0 and c == 0:
                dp[c] = cost
            else:
                above = dp[c]  # 尚未覆寫，仍是上一列
                left = dp[c - 1] if c > 0 else infinity
                dp[c] = min(above, left) + cost
    return None if dp[-1] == infinity else dp[-1]


def cooldown_profit(prices):
    """可多次交易，最多持有一股；賣出後隔天不能買入。"""
    hold = sold = float("-inf")
    rest = 0
    for price in prices:
        if price < 0:
            raise ValueError("價格必須非負")
        old_hold, old_sold, old_rest = hold, sold, rest
        hold = max(old_hold, old_rest - price)
        sold = old_hold + price
        rest = max(old_rest, old_sold)
    return max(rest, sold)  # 只有不持股狀態是已實現的收益


def count_step_sequences(n, steps=(1, 3, 4)):
    choices = sorted(set(steps))
    if n < 0 or any(step <= 0 for step in choices):
        raise ValueError("n 必須非負，步長必須為正整數")
    dp = [0] * (n + 1)
    dp[0] = 1
    for total in range(1, n + 1):
        for step in choices:
            if step > total:
                break
            dp[total] += dp[total - step]
    return dp[n]


def best_nonadjacent(values):
    before_previous = previous = 0
    for value in values:
        current = max(previous, before_previous + value)
        before_previous, previous = previous, current
    return previous


def minimum_palindrome_insertions(text):
    n = len(text)
    if n == 0:
        return 0
    dp = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):
        for left in range(n - length + 1):
            right = left + length - 1
            if text[left] == text[right]:
                dp[left][right] = dp[left + 1][right - 1] if length > 2 else 0
            else:
                dp[left][right] = 1 + min(dp[left + 1][right],
                                         dp[left][right - 1])
    return dp[0][n - 1]


def minimum_assignment(cost):
    """n 個人各分配一份不同工作；cost[人][工作] 為代價。"""
    n = len(cost)
    if any(len(row) != n for row in cost):
        raise ValueError("cost 必須為方陣")
    size = 1 << n
    dp = [float("inf")] * size
    dp[0] = 0
    for mask in range(size):
        person = mask.bit_count()
        if person == n:
            continue
        for job in range(n):
            if not (mask & (1 << job)):
                next_mask = mask | (1 << job)
                dp[next_mask] = min(dp[next_mask],
                                    dp[mask] + cost[person][job])
    return dp[-1]

def run_tests():
    from itertools import combinations, permutations, product
    from random import Random

    rng = Random(20261011)
    assert minimum_coins([1, 3, 4], 6) == 2
    assert minimum_coins_memo(iter([1, 3, 4]), 6) == 2
    assert minimum_coins(iter([1, 3, 4]), 6) == 2
    assert minimum_coins([2, 4], 3) == -1
    assert minimum_coins([], 0) == 0
    assert minimum_coins([], 3) == -1
    assert minimum_coin_solution([1, 3, 4], 6) == [3, 3]
    assert minimum_coin_solution(iter([1, 3, 4]), 6) == [3, 3]
    assert minimum_coin_solution([], 0) == []
    assert minimum_coin_solution([2], 3) is None
    for _ in range(200):
        coins = [rng.randint(1, 9) for _ in range(rng.randrange(7))]
        amount = rng.randrange(26)
        # 獨立 BFS：每條邊增加一枚硬幣，首次抵達即最少枚數。
        from collections import deque
        queue = deque([(0, 0)])
        seen = {0}
        expected = -1
        while queue:
            total, count = queue.popleft()
            if total == amount:
                expected = count
                break
            for coin in coins:
                nxt = total + coin
                if nxt <= amount and nxt not in seen:
                    seen.add(nxt)
                    queue.append((nxt, count + 1))
        assert minimum_coins(coins, amount) == expected
        assert minimum_coins_memo(coins, amount) == expected
        solution = minimum_coin_solution(coins, amount)
        if expected == -1:
            assert solution is None
        else:
            assert len(solution) == expected and sum(solution) == amount
            assert all(coin in coins for coin in solution)
    assert knapsack_01([(2, 4), (3, 5), (4, 7)], 5) == 9
    assert knapsack_01(iter([(2, 4), (3, 5), (4, 7)]), 5) == 9
    assert knapsack_01([(2, 4)], 4) == 4  # 同一件不可取兩次
    assert knapsack_01([], 5) == 0
    for _ in range(200):
        items = [(rng.randint(1, 6), rng.randint(-4, 10))
                 for _ in range(rng.randrange(8))]
        capacity = rng.randrange(15)
        expected = max(sum(v for _, v in selected)
                       for k in range(len(items) + 1)
                       for selected in combinations(items, k)
                       if sum(w for w, _ in selected) <= capacity)
        assert knapsack_01(items, capacity) == expected

    def subsequences(text):
        return [''.join(text[i] for i in range(len(text)) if mask & (1 << i))
                for mask in range(1 << len(text))]

    assert lcs_length('CABA', 'ACBA') == 3
    for _ in range(200):
        a = ''.join(rng.choice('ABC') for _ in range(rng.randrange(7)))
        b = ''.join(rng.choice('ABC') for _ in range(rng.randrange(7)))
        common = set(subsequences(a)) & set(subsequences(b))
        assert lcs_length(a, b) == max(map(len, common))
        longest_palindrome = max(len(s) for s in subsequences(a) if s == s[::-1])
        assert minimum_palindrome_insertions(a) == len(a) - longest_palindrome
    assert minimum_palindrome_insertions('ABCA') == 1
    assert minimum_palindrome_insertions('ABC') == 2
    assert minimum_palindrome_insertions('') == 0

    def brute_grid(board, r=0, c=0):
        if r >= len(board) or c >= len(board[0]) or board[r][c] is None:
            return float('inf')
        if r == len(board) - 1 and c == len(board[0]) - 1:
            return board[r][c]
        return board[r][c] + min(brute_grid(board, r + 1, c),
                                 brute_grid(board, r, c + 1))

    assert minimum_grid_path([[2, 1, 5, 2], [4, None, 2, 1], [1, 3, 1, 2]]) == 13
    assert minimum_grid_path([]) is None
    assert minimum_grid_path([[]]) is None
    assert minimum_grid_path([[0]]) == 0
    assert minimum_grid_path([[None]]) is None
    assert minimum_grid_path([[1, None], [None, 2]]) is None
    for _ in range(200):
        board = [[None if rng.randrange(5) == 0 else rng.randint(-3, 7)
                  for _ in range(rng.randint(1, 4))]]
        cols = len(board[0])
        for row in range(rng.randrange(4)):
            board.append([None if rng.randrange(5) == 0 else rng.randint(-3, 7)
                          for _ in range(cols)])
        snapshot = [row.copy() for row in board]
        expected = brute_grid(board)
        assert minimum_grid_path(board) == (None if expected == float('inf') else expected)
        assert board == snapshot

    def brute_trade(prices, day=0, holding=False, blocked=False, cash=0):
        if day == len(prices):
            return float('-inf') if holding else cash
        candidates = [brute_trade(prices, day + 1, holding, False, cash)]
        if holding:
            candidates.append(brute_trade(prices, day + 1, False, True, cash + prices[day]))
        elif not blocked:
            candidates.append(brute_trade(prices, day + 1, True, False, cash - prices[day]))
        return max(candidates)

    assert cooldown_profit([2, 5, 1, 4, 6]) == 5
    assert cooldown_profit([1, 2, 3, 0, 2]) == 3
    assert cooldown_profit(iter([1, 2, 3, 0, 2])) == 3
    assert cooldown_profit([]) == 0
    for n in range(7):
        for prices in product(range(3), repeat=n):
            assert cooldown_profit(prices) == brute_trade(prices)

    def brute_steps(n):
        if n == 0:
            return 1
        return sum(brute_steps(n - step) for step in (1, 3, 4) if step <= n)

    assert [count_step_sequences(i) for i in range(6)] == [1, 1, 1, 2, 4, 6]
    assert count_step_sequences(5, iter([1, 3, 4])) == 6
    for n in range(13):
        assert count_step_sequences(n) == brute_steps(n)
    for _ in range(200):
        values = [rng.randint(-5, 12) for _ in range(rng.randrange(10))]
        expected = max(sum(values[i] for i in range(len(values)) if mask & (1 << i))
                       for mask in range(1 << len(values))
                       if not (mask & (mask << 1)))
        assert best_nonadjacent(values) == expected
    assert best_nonadjacent([4, -1, 6, 3]) == 10
    assert best_nonadjacent([-3, -2]) == 0
    assert minimum_assignment([[6, 2, 4], [3, 5, 1], [2, 6, 4]]) == 5
    for n in range(7):
        for _ in range(15):
            costs = [[rng.randint(-4, 10) for _ in range(n)] for _ in range(n)]
            expected = min(sum(costs[i][job] for i, job in enumerate(order))
                           for order in permutations(range(n)))
            assert minimum_assignment(costs) == expected
    for function, args in [(minimum_coins, ([0], 1)),
                           (minimum_coins_memo, ([1], -1)),
                           (knapsack_01, ([(0, 1)], 2)),
                           (minimum_grid_path, ([[1], [2, 3]],)),
                           (cooldown_profit, ([-1],)),
                           (count_step_sequences, (2, [0])),
                           (minimum_assignment, ([[1, 2]],))]:
        try:
            function(*args)
        except ValueError:
            pass
        else:
            raise AssertionError('expected ValueError')


if __name__ == '__main__':
    run_tests()
