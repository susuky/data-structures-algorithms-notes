"""Executable examples for sorting, selection and divide-and-conquer."""
import itertools
import random


def insertion_sort(values):
    result = list(values)
    for i in range(1, len(result)):
        value = result[i]
        j = i
        while j > 0 and result[j - 1] > value:
            result[j] = result[j - 1]
            j -= 1
        result[j] = value
    return result


def merge_sort(values):
    if len(values) < 2:
        return list(values)
    middle = len(values) // 2
    left = merge_sort(values[:middle])
    right = merge_sort(values[middle:])
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result


def count_inversions(values):
    def solve(items):
        if len(items) < 2:
            return list(items), 0
        middle = len(items) // 2
        left, count_left = solve(items[:middle])
        right, count_right = solve(items[middle:])
        merged = []
        count = count_left + count_right
        i = j = 0
        while i < len(left) and j < len(right):
            if left[i] <= right[j]:
                merged.append(left[i])
                i += 1
            else:
                merged.append(right[j])
                count += len(left) - i
                j += 1
        merged.extend(left[i:])
        merged.extend(right[j:])
        return merged, count
    return solve(list(values))[1]


def counting_sort(records, maximum):
    if maximum < 0:
        raise ValueError('maximum must be nonnegative')
    counts = [0] * (maximum + 1)
    for key, label in records:
        if not 0 <= key <= maximum:
            raise ValueError('key outside range')
        counts[key] += 1
    for key in range(1, len(counts)):
        counts[key] += counts[key - 1]
    result = [None] * len(records)
    for record in reversed(records):
        key = record[0]
        counts[key] -= 1
        result[counts[key]] = record
    return result


def bucket_sort(values):
    values = list(values)
    if any(not 0 <= value < 1 for value in values):
        raise ValueError('values must be in [0, 1)')
    n = len(values)
    if n == 0:
        return []
    buckets = [[] for _ in range(n)]
    for value in values:
        bucket = buckets[min(n - 1, int(value * n))]
        bucket.append(value)
        i = len(bucket) - 1
        while i > 0 and bucket[i - 1] > value:
            bucket[i] = bucket[i - 1]
            i -= 1
        bucket[i] = value
    return [value for bucket in buckets for value in bucket]


def radix_sort(values):
    result = list(values)
    if any(not isinstance(value, int) or value < 0 for value in result):
        raise ValueError('values must be nonnegative integers')
    maximum = max(result, default=0)
    place = 1
    while place <= maximum:
        buckets = [[] for _ in range(10)]
        for value in result:
            buckets[value // place % 10].append(value)
        result = [value for bucket in buckets for value in bucket]
        place *= 10
    return result


def quickselect(values, k, rng=None):
    remaining = list(values)
    if not 0 <= k < len(remaining):
        raise ValueError('k must be a valid zero-based index')
    rng = rng or random.Random()
    while True:
        pivot = rng.choice(remaining)
        smaller = [value for value in remaining if value < pivot]
        equal = [value for value in remaining if value == pivot]
        larger = [value for value in remaining if value > pivot]
        if k < len(smaller):
            remaining = smaller
        elif k < len(smaller) + len(equal):
            return pivot
        else:
            k -= len(smaller) + len(equal)
            remaining = larger


if __name__ == '__main__':
    cases = 0
    for length in range(7):
        for values in itertools.product(range(3), repeat=length):
            values = list(values)
            expected = sorted(values)
            assert insertion_sort(values) == expected
            assert merge_sort(values) == expected
            assert radix_sort(values) == expected
            assert count_inversions(values) == sum(a > b for i, a in enumerate(values) for b in values[i + 1:])
            records = [(value, i) for i, value in enumerate(values)]
            assert counting_sort(records, 2) == sorted(records, key=lambda item: item[0])
            for k in range(length):
                assert quickselect(values, k, random.Random(17 + k)) == expected[k]
            cases += 1
    for values in [[], [0.0], [0.99, 0.1, 0.2, 0.1], [0.999, 0.998, 0.997], [0.0, 0.999999]]:
        assert bucket_sort(values) == sorted(values)
    assert merge_sort([-4, 2, -4, 0]) == [-4, -4, 0, 2]
    assert radix_sort([170, 45, 75, 90, 802, 24, 2, 66]) == [2, 24, 45, 66, 75, 90, 170, 802]
    print(f'chapter 14: {cases} exhaustive arrays plus boundary cases passed')
