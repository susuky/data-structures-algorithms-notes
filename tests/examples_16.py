"""Exact matching, polynomial hashes and suffix sorting."""
import itertools


def prefix_function(pattern):
    pi = [0] * len(pattern)
    for i in range(1, len(pattern)):
        j = pi[i - 1]
        while j and pattern[i] != pattern[j]:
            j = pi[j - 1]
        if pattern[i] == pattern[j]:
            j += 1
        pi[i] = j
    return pi


def kmp_find_all(text, pattern):
    if not pattern:
        return list(range(len(text) + 1))
    pi = prefix_function(pattern)
    matches = []
    j = 0
    for i, char in enumerate(text):
        while j and char != pattern[j]:
            j = pi[j - 1]
        if char == pattern[j]:
            j += 1
        if j == len(pattern):
            matches.append(i - len(pattern) + 1)
            j = pi[j - 1]
    return matches


def polynomial_hash(text, base=257, modulus=1_000_000_007):
    if base < 1 or modulus < 2:
        raise ValueError('base >= 1 and modulus >= 2 required')
    value = 0
    for char in text:
        value = (value * base + ord(char)) % modulus
    return value


def rabin_karp(text, pattern, base=257, modulus=1_000_000_007):
    if base < 1 or modulus < 2:
        raise ValueError('base >= 1 and modulus >= 2 required')
    n, m = len(text), len(pattern)
    if m == 0:
        return list(range(n + 1))
    if m > n:
        return []
    high = pow(base, m - 1, modulus)
    target = polynomial_hash(pattern, base, modulus)
    value = polynomial_hash(text[:m], base, modulus)
    matches = []
    for left in range(n - m + 1):
        if value == target and text[left:left + m] == pattern:
            matches.append(left)
        if left + m < n:
            value = (value - ord(text[left]) * high) % modulus
            value = (value * base + ord(text[left + m])) % modulus
    return matches


def suffix_array(text):
    n = len(text)
    suffixes = list(range(n))
    rank = [ord(char) for char in text]
    width = 1
    while width < n:
        key = lambda i: (rank[i], rank[i + width] if i + width < n else -1)
        suffixes.sort(key=key)
        updated = [0] * n
        for j in range(1, n):
            updated[suffixes[j]] = updated[suffixes[j - 1]] + (key(suffixes[j]) != key(suffixes[j - 1]))
        rank = updated
        if rank[suffixes[-1]] == n - 1:
            break
        width *= 2
    return suffixes


if __name__ == '__main__':
    cases = 0
    for n in range(8):
        for letters in itertools.product('ab', repeat=n):
            text = ''.join(letters)
            assert suffix_array(text) == sorted(range(n), key=lambda i: text[i:])
            for m in range(4):
                for parts in itertools.product('ab', repeat=m):
                    pattern = ''.join(parts)
                    expected = [i for i in range(n + 1) if text.startswith(pattern, i)]
                    assert kmp_find_all(text, pattern) == expected
                    assert rabin_karp(text, pattern, 2, 3) == expected
                    cases += 1
    assert prefix_function('ababaca') == [0, 0, 1, 2, 3, 0, 1]
    assert polynomial_hash('ab', 31, 101) == 75
    assert kmp_find_all('資料資料', '資料') == [0, 2]
    assert suffix_array('香蕉香') == [1, 2, 0]
    print(f'chapter 16: {cases} exact-match cases, collision cases and suffix orders passed')
