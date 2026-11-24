"""Random algorithms with injectable draws and exact probability checks."""
from fractions import Fraction
import itertools
import random


def fisher_yates(values, rng=None):
    result = list(values)
    rng = rng or random.Random()
    for i in range(len(result) - 1, 0, -1):
        j = rng.randrange(i + 1)
        result[i], result[j] = result[j], result[i]
    return result


def weighted_moments(outcomes, weights):
    if len(outcomes) != len(weights) or not outcomes:
        raise ValueError('one weight per outcome required')
    if any(weight < 0 for weight in weights) or sum(weights) == 0:
        raise ValueError('nonnegative weights with positive total required')
    total = sum(weights)
    mean = sum(Fraction(weight, total) * value for value, weight in zip(outcomes, weights))
    variance = sum(Fraction(weight, total) * (value - mean) ** 2 for value, weight in zip(outcomes, weights))
    return mean, variance


def reservoir_sample(stream, k, rng=None):
    if k < 0:
        raise ValueError('k must be nonnegative')
    rng = rng or random.Random()
    sample = []
    for i, value in enumerate(stream):
        if i < k:
            sample.append(value)
        elif k:
            j = rng.randrange(i + 1)
            if j < k:
                sample[j] = value
    return sample


def randbelow_from_seven(bound, rand7):
    if not 1 <= bound <= 7:
        raise ValueError('bound must be between 1 and 7')
    usable = 7 // bound * bound
    while True:
        value = rand7() - 1
        if not 0 <= value < 7:
            raise ValueError('rand7 must return an integer from 1 to 7')
        if value < usable:
            return value % bound


class DrawTape:
    def __init__(self, values):
        self.values = iter(values)

    def randrange(self, stop):
        value = next(self.values)
        assert 0 <= value < stop
        return value


if __name__ == '__main__':
    permutations = {}
    for draws in itertools.product(range(4), range(3), range(2)):
        result = tuple(fisher_yates('ABCD', DrawTape(draws)))
        permutations[result] = permutations.get(result, 0) + 1
    assert len(permutations) == 24 and set(permutations.values()) == {1}
    probabilities = {}
    for draws in itertools.product(range(3), range(4), range(5)):
        result = tuple(sorted(reservoir_sample('ABCDE', 2, DrawTape(draws))))
        probabilities[result] = probabilities.get(result, 0) + Fraction(1, 60)
    assert len(probabilities) == 10 and set(probabilities.values()) == {Fraction(1, 10)}
    assert reservoir_sample([], 3) == []
    assert reservoir_sample('AB', 5) == ['A', 'B']
    assert reservoir_sample('AB', 0) == []
    assert weighted_moments([-3, 0, 5], [1, 2, 1]) == (Fraction(1, 2), Fraction(33, 4))
    for bound in range(1, 8):
        counts = [0] * bound
        usable = 7 // bound * bound
        for value in range(1, usable + 1):
            counts[randbelow_from_seven(bound, lambda: value)] += 1
        assert len(set(counts)) == 1
    draws = iter([7, 6, 3])
    assert randbelow_from_seven(5, lambda: next(draws)) == 2
    print('chapter 17: every 4-item shuffle and 5-choose-2 reservoir path has exact uniform probability; rejection and moments passed')
