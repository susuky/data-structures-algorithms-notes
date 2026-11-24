"""Integer arithmetic, number theory and combinations."""
import itertools
import math


def factorial_zeroes(n):
    if n < 0:
        raise ValueError('n must be nonnegative')
    total = 0
    while n:
        n //= 5
        total += n
    return total


def gcd(a, b):
    a, b = abs(a), abs(b)
    while b:
        a, b = b, a % b
    return a


def primes_up_to(n):
    if n < 2:
        return []
    prime = [True] * (n + 1)
    prime[0] = prime[1] = False
    p = 2
    while p * p <= n:
        if prime[p]:
            for multiple in range(p * p, n + 1, p):
                prime[multiple] = False
        p += 1
    return [value for value in range(2, n + 1) if prime[value]]


def choose(n, k):
    if n < 0 or k < 0 or k > n:
        return 0
    k = min(k, n - k)
    if k == 0:
        return 1
    row = [1] + [0] * k
    for i in range(1, n + 1):
        for j in range(min(i, k), 0, -1):
            row[j] += row[j - 1]
    return row[k]


if __name__ == '__main__':
    for n in range(301):
        value = str(math.factorial(n))
        assert factorial_zeroes(n) == len(value) - len(value.rstrip('0'))
        expected = [p for p in range(2, n + 1) if all(p % d for d in range(2, math.isqrt(p) + 1))]
        assert primes_up_to(n) == expected
    for a, b in itertools.product(range(-50, 51), repeat=2):
        assert gcd(a, b) == math.gcd(a, b)
    for n in range(40):
        for k in range(n + 1):
            assert choose(n, k) == math.comb(n, k)
    assert choose(3, 4) == choose(3, -1) == 0
    print('chapter 15: factorial, gcd, sieve and Pascal cases passed')
