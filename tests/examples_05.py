"""第 05 章：堆疊、佇列與單調結構。"""
from collections import deque
from itertools import product


def valid_brackets(text):
    """只接受六種括號；其他字元拋 ValueError。"""
    partner = {")": "(", "]": "[", "}": "{"}
    stack = []
    valid = True
    for ch in text:
        if ch in "([{":
            stack.append(ch)
        elif ch in partner:
            if not stack or stack[-1] != partner[ch]:
                valid = False
            else:
                stack.pop()
        else:
            raise ValueError("輸入只能包含括號")
    return valid and not stack


def evaluate_rpn(tokens):
    """逆波蘭式整數運算，// 採 Python 向下取整。"""
    stack = []
    for token in tokens:
        if token not in {"+", "-", "*", "//"}:
            stack.append(int(token))
            continue
        if len(stack) < 2:
            raise ValueError("運算元不足")
        b, a = stack.pop(), stack.pop()
        if token == "+":
            stack.append(a + b)
        elif token == "-":
            stack.append(a - b)
        elif token == "*":
            stack.append(a * b)
        else:
            stack.append(a // b)
    if len(stack) != 1:
        raise ValueError("運算式不完整")
    return stack[0]


def next_greater_indices(values):
    answer = [-1] * len(values)
    stack = []  # 未找到右側「嚴格較大」值的索引。
    for i, value in enumerate(values):
        while stack and values[stack[-1]] < value:
            answer[stack.pop()] = i
        stack.append(i)
    return answer


def sliding_maximum(values, k):
    if not 1 <= k <= len(values):
        raise ValueError("k 必須介於 1 與資料長度之間")
    candidates = deque()  # 索引遞增，對應值嚴格遞減。
    answer = []
    for i, value in enumerate(values):
        while candidates and candidates[0] <= i - k:
            candidates.popleft()
        while candidates and values[candidates[-1]] <= value:
            candidates.pop()
        candidates.append(i)
        if i >= k - 1:
            answer.append(values[candidates[0]])
    return answer


def first_bracket_error(text):
    """只接受括號；回傳第一個無法配對的關閉位置，否則最早未關閉位置。"""
    partner = {")": "(", "]": "[", "}": "{"}
    stack = []
    for i, ch in enumerate(text):
        if ch in "([{":
            stack.append((ch, i))
        elif ch in partner:
            if not stack or stack[-1][0] != partner[ch]:
                return i
            stack.pop()
        else:
            raise ValueError("輸入只能包含括號")
    return stack[0][1] if stack else None


def expect_error(fn, error=ValueError):
    try:
        fn()
    except error:
        return
    raise AssertionError("應拋出指定例外")


def run_tests():
    for s in ("", "{}", "[(){}]", "()[]{}", "((()))"):
        assert valid_brackets(s)
    for s in ("(", "]", "([)]", "())(", "[({})"):
        assert not valid_brackets(s)
    expect_error(lambda: valid_brackets("(x)"))
    expect_error(lambda: valid_brackets(")x"))
    assert evaluate_rpn(["8", "3", "-", "2", "*"]) == 10
    assert evaluate_rpn(["-7", "3", "//"]) == -3
    assert evaluate_rpn(["2", "4", "+"]) == 6
    assert evaluate_rpn(["-5"]) == -5
    for invalid in ([], ["+"], ["1", "2"], ["3", "?"]):
        expect_error(lambda: evaluate_rpn(invalid))
    expect_error(lambda: evaluate_rpn(["2", "0", "//"]), ZeroDivisionError)
    assert next_greater_indices([18, 15, 15, 20, 17]) == [3, 3, 3, -1, -1]
    assert sliding_maximum([4, 1, 3, 3, 0, 5], 3) == [4, 3, 3, 5]
    for n in range(7):
        for values in product(range(3), repeat=n):
            expected = []
            for i, value in enumerate(values):
                expected.append(next((j for j in range(i + 1, n) if values[j] > value), -1))
            assert next_greater_indices(values) == expected
            for k in range(1, n + 1):
                naive = [max(values[i:i + k]) for i in range(n - k + 1)]
                assert sliding_maximum(values, k) == naive
    for values, k in [([], 1), ([1], 0), ([1], 2)]:
        expect_error(lambda: sliding_maximum(values, k))
    assert first_bracket_error("[()]") is None
    assert first_bracket_error("([)]") == 2
    assert first_bracket_error("()[(") == 2
    assert first_bracket_error(")") == 0


if __name__ == "__main__":
    run_tests()
