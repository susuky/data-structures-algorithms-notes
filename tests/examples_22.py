from functools import lru_cache

def winning_moves(stones, max_take):
    if stones < 0 or max_take < 1:
        raise ValueError("石子數須非負，每回合至少可取一顆")
    win = [False] * (stones + 1)
    choice = [None] * (stones + 1)
    for remaining in range(1, stones + 1):
        for take in range(1, min(max_take, remaining) + 1):
            if not win[remaining - take]:
                win[remaining], choice[remaining] = True, take
                break
    return win, choice

def minimax_value(leaves):
    if not leaves or len(leaves) & (len(leaves) - 1):
        raise ValueError("葉節點數必須為 2 的次方")
    def visit(left, right, maximize):
        if right - left == 1:
            return leaves[left]
        middle = (left + right) // 2
        a = visit(left, middle, not maximize)
        b = visit(middle, right, not maximize)
        return max(a, b) if maximize else min(a, b)
    return visit(0, len(leaves), True)

def alpha_beta(leaves):
    if not leaves or len(leaves) & (len(leaves) - 1):
        raise ValueError("葉節點數必須為 2 的次方")
    visited = []
    def visit(left, right, maximize, alpha, beta):
        if right - left == 1:
            visited.append(left)
            return leaves[left]
        middle = (left + right) // 2
        best = float("-inf") if maximize else float("inf")
        for start, end in ((left, middle), (middle, right)):
            value = visit(start, end, not maximize, alpha, beta)
            if maximize:
                best = max(best, value)
                alpha = max(alpha, best)
            else:
                best = min(best, value)
                beta = min(beta, best)
            if alpha >= beta:
                break
        return best
    return visit(0, len(leaves), True, float("-inf"), float("inf")), visited

def turn_off_pairs(bits):
    if any(bit not in (0, 1) for bit in bits):
        raise ValueError("每盞燈須為 0 或 1")
    on = [i for i, bit in enumerate(bits) if bit]
    if len(on) % 2:
        return None
    return list(zip(on[::2], on[1::2]))

def run_tests():
    import itertools
    import random
    rng = random.Random(22)
    for maximum in range(1, 8):
        win, move = winning_moves(70, maximum)
        for n in range(71):
            assert win[n] == (n % (maximum + 1) != 0)
            if win[n]:
                assert 1 <= move[n] <= min(maximum, n)
                assert not win[n - move[n]]
    for exponent in range(7):
        for _ in range(50):
            leaves = [rng.randrange(-20, 21) for _ in range(2 ** exponent)]
            current, maximize = list(leaves), exponent % 2 == 1
            while len(current) > 1:
                select = max if maximize else min
                current = [select(current[i:i + 2]) for i in range(0, len(current), 2)]
                maximize = not maximize
            value, visited = alpha_beta(leaves)
            assert minimax_value(leaves) == current[0] == value
            assert 1 <= len(visited) <= len(leaves)
    assert minimax_value([3, 5, 2, 9]) == 3
    assert alpha_beta([3, 5, 2, 9])[1] == [0, 1, 2]
    for n in range(9):
        for bits in itertools.product((0, 1), repeat=n):
            moves = turn_off_pairs(bits)
            assert (moves is None) == (sum(bits) % 2 == 1)
            if moves is not None:
                after = list(bits)
                for a, b in moves:
                    assert a != b
                    after[a] ^= 1
                    after[b] ^= 1
                assert not any(after)
            for a, b in itertools.combinations(range(n), 2):
                after = list(bits)
                after[a] ^= 1
                after[b] ^= 1
                assert sum(after) % 2 == sum(bits) % 2

if __name__ == "__main__":
    run_tests()
    print("examples_22: 勝負狀態、Minimax、alpha-beta 與奇偶不變量通過")
