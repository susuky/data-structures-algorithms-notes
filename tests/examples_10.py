# 第 10 章可執行範例與小型暴力比對；Python 3.10+

def subsets(items):
    """items 中的位置視為不同選項；若值相同，輸出可能值相同。"""
    answer, path = [], []

    def dfs(i):
        if i == len(items):
            answer.append(path.copy())
            return
        dfs(i + 1)                 # 不選第 i 個
        path.append(items[i])      # 選擇
        dfs(i + 1)                 # 探索
        path.pop()                 # 撤銷

    dfs(0)
    return answer


def unique_permutations(items):
    values = sorted(items)
    used = [False] * len(values)
    answer, path = [], []

    def dfs():
        if len(path) == len(values):
            answer.append(path.copy())
            return
        for j, value in enumerate(values):
            if used[j]:
                continue
            # 同層中，先使用前一個相同值，固定相同值的相對次序。
            if j > 0 and values[j] == values[j - 1] and not used[j - 1]:
                continue
            used[j] = True
            path.append(value)
            dfs()
            path.pop()
            used[j] = False

    dfs()
    return answer


def choose_k_sum(numbers, k, target):
    """恰選 k 個位置、每個至多一次；回傳不重複的值組合。"""
    if k < 0 or any(x <= 0 for x in numbers):
        raise ValueError("k 必須非負，數值必須為正整數")
    values = sorted(numbers)
    n = len(values)
    prefix = [0]
    for x in values:
        prefix.append(prefix[-1] + x)
    answer, path = [], []

    def dfs(start, need, remain):
        if need == 0:
            if remain == 0:
                answer.append(path.copy())
            return
        if n - start < need:
            return
        smallest = prefix[start + need] - prefix[start]
        largest = prefix[n] - prefix[n - need]
        if remain < smallest or remain > largest:
            return
        for j in range(start, n - need + 1):
            if j > start and values[j] == values[j - 1]:
                continue
            if values[j] > remain:
                break
            path.append(values[j])
            dfs(j + 1, need - 1, remain - values[j])
            path.pop()

    dfs(0, k, target)
    return answer


def queens_columns(n):
    """每個解是一串欄編號，第 r 個值表示第 r 列皇后的欄。"""
    if n < 0:
        raise ValueError("n 必須非負")
    columns, diagonal_down, diagonal_up = set(), set(), set()
    path, answer = [], []

    def dfs(row):
        if row == n:
            answer.append(path.copy())
            return
        for col in range(n):
            if (col in columns or row - col in diagonal_down
                    or row + col in diagonal_up):
                continue
            columns.add(col)
            diagonal_down.add(row - col)
            diagonal_up.add(row + col)
            path.append(col)
            dfs(row + 1)
            path.pop()
            columns.remove(col)
            diagonal_down.remove(row - col)
            diagonal_up.remove(row + col)

    dfs(0)
    return answer


def nonadjacent_slots(n):
    if n < 0:
        raise ValueError("n 必須非負")
    answer, path = [], []

    def dfs(i):
        if i >= n:
            answer.append(path.copy())
            return
        dfs(i + 1)
        path.append(i)
        dfs(i + 2)  # 下一格不能選
        path.pop()

    dfs(0)
    return answer


def balanced_parentheses(n):
    if n < 0:
        raise ValueError("n 必須非負")
    answer, path = [], []

    def dfs(opened, closed):
        if closed == n:
            answer.append("".join(path))
            return
        if opened < n:
            path.append("(")
            dfs(opened + 1, closed)
            path.pop()
        if closed < opened:
            path.append(")")
            dfs(opened, closed + 1)
            path.pop()

    dfs(0, 0)
    return answer


def word_exists(board, word):
    """矩形字元格；上下左右相鄰，同一次路徑不得重複使用格子。"""
    if not word:
        return True
    if not board:
        return False
    rows, cols = len(board), len(board[0])
    if any(len(row) != cols for row in board):
        raise ValueError("board 必須為矩形")
    if cols == 0 or len(word) > rows * cols:
        return False
    used = set()

    def dfs(r, c, i):
        if (r < 0 or r >= rows or c < 0 or c >= cols
                or (r, c) in used or board[r][c] != word[i]):
            return False
        used.add((r, c))
        try:
            if i == len(word) - 1:
                return True
            return any(dfs(r + dr, c + dc, i + 1)
                       for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        finally:
            used.remove((r, c))  # 成功提早回傳時也必定撤銷

    return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))

def run_tests():
    from itertools import combinations, permutations, product
    from random import Random

    assert subsets([]) == [[]]
    for n in range(8):
        result = subsets(list(range(n)))
        expected = {tuple(c) for k in range(n + 1)
                    for c in combinations(range(n), k)}
        assert len(result) == 2 ** n
        assert {tuple(x) for x in result} == expected
        assert len({id(x) for x in result}) == len(result)
    assert unique_permutations([]) == [[]]
    for n in range(6):
        for values in product(range(3), repeat=n):
            result = unique_permutations(values)
            expected = set(permutations(values))
            assert len(result) == len(expected)
            assert {tuple(x) for x in result} == expected
    rng = Random(20261011)
    for _ in range(200):
        values = [rng.randint(1, 7) for _ in range(rng.randrange(9))]
        snapshot = values.copy()
        k = rng.randrange(10)
        target = rng.randrange(25)
        expected = {tuple(sorted(c)) for c in combinations(values, k)
                    if sum(c) == target}
        result = choose_k_sum(values, k, target)
        assert {tuple(c) for c in result} == expected
        assert len(result) == len(expected)
        assert values == snapshot
    assert choose_k_sum([1, 2, 2, 4, 5], 3, 8) == [[1, 2, 5], [2, 2, 4]]
    assert choose_k_sum([], 0, 0) == [[]]
    assert choose_k_sum([], 0, 1) == []
    for n, count in [(0, 1), (1, 1), (2, 0), (3, 0), (4, 2), (5, 10)]:
        result = queens_columns(n)
        assert len(result) == count
        assert len({tuple(solution) for solution in result}) == count
        for solution in result:
            assert len(solution) == n
            assert len(set(solution)) == n
            assert len({r - c for r, c in enumerate(solution)}) == n
            assert len({r + c for r, c in enumerate(solution)}) == n
    assert [1, 3, 0, 2] in queens_columns(4)
    for n in range(10):
        expected = {tuple(i for i in range(n) if mask & (1 << i))
                    for mask in range(1 << n) if not (mask & (mask << 1))}
        actual = nonadjacent_slots(n)
        assert {tuple(x) for x in actual} == expected
        assert len(actual) == len(expected)
    for n, count in enumerate([1, 1, 2, 5, 14, 42]):
        actual = balanced_parentheses(n)
        assert len(actual) == len(set(actual)) == count
        for word in actual:
            balance = 0
            assert len(word) == 2 * n
            for ch in word:
                balance += 1 if ch == '(' else -1
                assert balance >= 0
            assert balance == 0
    board = [list('AB'), list('CD')]
    snapshot = [row.copy() for row in board]
    assert word_exists(board, 'ABDC')
    assert not word_exists(board, 'ABA')
    assert not word_exists(board, 'ABCA')
    assert not word_exists(board, 'ABCDE')
    assert word_exists(board, '')
    assert word_exists([], '')
    assert not word_exists([], 'A')
    assert not word_exists([[], []], 'A')
    assert word_exists([['A']], 'A')
    assert not word_exists([['A']], 'AA')
    assert board == snapshot
    for function, args in [(choose_k_sum, ([0, 1], 1, 1)),
                           (choose_k_sum, ([1], -1, 0)),
                           (queens_columns, (-1,)),
                           (nonadjacent_slots, (-1,)),
                           (balanced_parentheses, (-1,)),
                           (word_exists, ([[], ['A']], 'A')),
                           (word_exists, ([['A'], []], 'A'))]:
        try:
            function(*args)
        except ValueError:
            pass
        else:
            raise AssertionError('expected ValueError')


if __name__ == '__main__':
    run_tests()
