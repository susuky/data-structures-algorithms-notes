"""Chapter 20: integer geometry and event sweeps."""


def cross(origin, a, b):
    return (a[0] - origin[0]) * (b[1] - origin[1]) - (a[1] - origin[1]) * (b[0] - origin[0])


def segments_intersect(a, b, c, d):
    def on_segment(p, q, r):
        return (cross(p, q, r) == 0 and
                min(p[0], q[0]) <= r[0] <= max(p[0], q[0]) and
                min(p[1], q[1]) <= r[1] <= max(p[1], q[1]))
    ab_c, ab_d = cross(a, b, c), cross(a, b, d)
    cd_a, cd_b = cross(c, d, a), cross(c, d, b)
    if ((ab_c > 0 and ab_d < 0) or (ab_c < 0 and ab_d > 0)) and ((cd_a > 0 and cd_b < 0) or (cd_a < 0 and cd_b > 0)):
        return True
    return on_segment(a, b, c) or on_segment(a, b, d) or on_segment(c, d, a) or on_segment(c, d, b)


def convex_hull(points):
    points = sorted(set(points))
    if len(points) <= 1:
        return points
    lower, upper = [], []
    for point in points:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], point) <= 0:
            lower.pop()
        lower.append(point)
    for point in reversed(points):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], point) <= 0:
            upper.pop()
        upper.append(point)
    return lower[:-1] + upper[:-1]


def interval_union_and_peak(intervals):
    changes = {}
    for left, right in intervals:
        if left > right:
            raise ValueError('left exceeds right')
        if left == right:
            continue
        changes[left] = changes.get(left, 0) + 1
        changes[right] = changes.get(right, 0) - 1
    active = length = peak = 0
    previous = None
    for x in sorted(changes):
        if previous is not None and active > 0:
            length += x - previous
        active += changes[x]
        peak = max(peak, active)
        previous = x
    return length, peak


if __name__ == '__main__':
    from itertools import combinations, product
    from fractions import Fraction
    checks = 0
    assert segments_intersect((0, 0), (4, 4), (0, 4), (4, 0))
    assert segments_intersect((0, 0), (2, 0), (2, 0), (5, 0))
    assert not segments_intersect((0, 0), (1, 0), (2, 0), (4, 0))
    assert segments_intersect((1, 1), (1, 1), (0, 0), (2, 2))
    grid = list(product(range(3), repeat=2))
    for mask in range(1 << len(grid)):
        points = [p for i, p in enumerate(grid) if mask >> i & 1]
        hull = convex_hull(points + points[:2])
        assert len(hull) == len(set(hull))
        if len(hull) >= 3:
            assert all(cross(hull[i - 2], hull[i - 1], hull[i]) > 0 for i in range(len(hull)))
            assert all(cross(hull[i - 1], hull[i], p) >= 0 for i in range(len(hull)) for p in points)
        elif len(hull) == 2:
            assert all(cross(*hull, p) == 0 for p in points)
            assert hull == [min(points), max(points)]
        else:
            assert hull == sorted(set(points))
        checks += 1
    possibilities = [(a, b) for a in range(-2, 3) for b in range(a, 4)]
    for intervals in product(possibilities, repeat=3):
        coverage = [sum(a <= x < b for a, b in intervals) for x in range(-2, 4)]
        assert interval_union_and_peak(intervals) == (sum(c > 0 for c in coverage), max(coverage))
        checks += 1
    print(f'Chapter 20: {checks} hull and sweep checks passed')
