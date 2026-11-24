"""Chapter 19: graph algorithms with explicit edge identities."""
from collections import deque
from math import inf


def minimum_spanning_forest(n, edges):
    parent, size = list(range(n)), [1] * n
    def find(node):
        while node != parent[node]:
            parent[node] = parent[parent[node]]
            node = parent[node]
        return node
    chosen, cost = [], 0
    for edge_id in sorted(range(len(edges)), key=lambda i: edges[i][2]):
        a, b, weight = edges[edge_id]
        a, b = find(a), find(b)
        if a == b:
            continue
        if size[a] < size[b]:
            a, b = b, a
        parent[b] = a
        size[a] += size[b]
        chosen.append(edge_id)
        cost += weight
    return cost, chosen


def eulerian_circuit(n, edges):
    if n == 0:
        return [] if not edges else None
    adjacency = [[] for _ in range(n)]
    for edge_id, (a, b) in enumerate(edges):
        adjacency[a].append((b, edge_id))
        adjacency[b].append((a, edge_id))
    if any(len(neighbors) % 2 for neighbors in adjacency):
        return None
    start = next((v for v in range(n) if adjacency[v]), 0)
    stack, circuit = [start], []
    used = [False] * len(edges)
    while stack:
        node = stack[-1]
        while adjacency[node] and used[adjacency[node][-1][1]]:
            adjacency[node].pop()
        if adjacency[node]:
            neighbor, edge_id = adjacency[node].pop()
            used[edge_id] = True
            stack.append(neighbor)
        else:
            circuit.append(stack.pop())
    if len(circuit) != len(edges) + 1:
        return None
    return circuit[::-1]


def strongly_connected_components(n, edges):
    graph = [[] for _ in range(n)]
    for a, b in edges:
        graph[a].append(b)
    discovery, low = [-1] * n, [0] * n
    active, stack, components = [False] * n, [], []
    timer = 0
    def visit(node):
        nonlocal timer
        discovery[node] = low[node] = timer
        timer += 1
        stack.append(node)
        active[node] = True
        for neighbor in graph[node]:
            if discovery[neighbor] == -1:
                visit(neighbor)
                low[node] = min(low[node], low[neighbor])
            elif active[neighbor]:
                low[node] = min(low[node], discovery[neighbor])
        if low[node] == discovery[node]:
            component = []
            while True:
                top = stack.pop()
                active[top] = False
                component.append(top)
                if top == node:
                    break
            components.append(component)
    for node in range(n):
        if discovery[node] == -1:
            visit(node)
    return components


def biconnected_components(n, edges):
    # Undirected, parallel edges allowed; self-loops are excluded by contract.
    adjacency = [[] for _ in range(n)]
    for edge_id, (a, b) in enumerate(edges):
        if a == b:
            raise ValueError('use distinct endpoints')
        adjacency[a].append((b, edge_id))
        adjacency[b].append((a, edge_id))
    discovery, low = [-1] * n, [0] * n
    edge_stack, blocks, bridges, cuts = [], [], [], set()
    timer = 0
    def visit(node, parent_edge=-1):
        nonlocal timer
        discovery[node] = low[node] = timer
        timer += 1
        children = 0
        for neighbor, edge_id in adjacency[node]:
            if edge_id == parent_edge:
                continue
            if discovery[neighbor] == -1:
                children += 1
                edge_stack.append(edge_id)
                visit(neighbor, edge_id)
                low[node] = min(low[node], low[neighbor])
                if low[neighbor] > discovery[node]:
                    bridges.append(edge_id)
                if low[neighbor] >= discovery[node]:
                    if parent_edge != -1 or children > 1:
                        cuts.add(node)
                    block = []
                    while True:
                        top = edge_stack.pop()
                        block.append(top)
                        if top == edge_id:
                            break
                    blocks.append(block)
            elif discovery[neighbor] < discovery[node]:
                edge_stack.append(edge_id)
                low[node] = min(low[node], discovery[neighbor])
    for node in range(n):
        if discovery[node] == -1:
            visit(node)
    return {'blocks': blocks, 'cuts': sorted(cuts), 'bridges': bridges}


def bellman_ford(n, edges, start):
    distance = [inf] * n
    distance[start] = 0
    for _ in range(n - 1):
        changed = False
        for a, b, weight in edges:
            if distance[a] != inf and distance[a] + weight < distance[b]:
                distance[b] = distance[a] + weight
                changed = True
        if not changed:
            break
    if any(distance[a] != inf and distance[a] + weight < distance[b]
           for a, b, weight in edges):
        raise ValueError('reachable negative cycle')
    return distance


def zero_one_bfs(n, edges, start):
    graph = [[] for _ in range(n)]
    for a, b, weight in edges:
        if weight not in (0, 1):
            raise ValueError('weights must be 0 or 1')
        graph[a].append((b, weight))
    distance = [inf] * n
    distance[start] = 0
    queue = deque([(start, 0)])
    while queue:
        node, known = queue.popleft()
        if known != distance[node]:
            continue
        for neighbor, weight in graph[node]:
            candidate = known + weight
            if candidate < distance[neighbor]:
                distance[neighbor] = candidate
                if weight == 0:
                    queue.appendleft((neighbor, candidate))
                else:
                    queue.append((neighbor, candidate))
    return distance


def _components(n, edges, skip_vertex=None, skip_edge=None):
    graph = [[] for _ in range(n)]
    for i, (a, b, *_) in enumerate(edges):
        if i != skip_edge and a != skip_vertex and b != skip_vertex:
            graph[a].append(b)
            graph[b].append(a)
    visited, count = {skip_vertex}, 0
    for start in range(n):
        if start in visited:
            continue
        count += 1
        stack = [start]
        visited.add(start)
        while stack:
            for neighbor in graph[stack.pop()]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    stack.append(neighbor)
    return count


def _brute_blocks(n, edges):
    candidates = []
    for mask in range(1 << n):
        vertices = [v for v in range(n) if mask >> v & 1]
        if len(vertices) < 2:
            continue
        rank = {v: i for i, v in enumerate(vertices)}
        selected = [i for i, (a, b) in enumerate(edges) if a in rank and b in rank]
        sub = [(rank[edges[i][0]], rank[edges[i][1]]) for i in selected]
        if _components(len(vertices), sub) == 1 and all(
                _components(len(vertices), sub, skip_vertex=v) <= 1
                for v in range(len(vertices))):
            candidates.append((mask, tuple(selected)))
    return sorted(block for mask, block in candidates
                  if not any(mask != larger and mask & larger == mask for larger, _ in candidates))


if __name__ == '__main__':
    from itertools import combinations, product
    from collections import Counter
    import random
    rng, checks = random.Random(19), 0
    for n in range(1, 7):
        for _ in range(120):
            possible = list(combinations(range(n), 2))
            rng.shuffle(possible)
            edges = possible[:rng.randrange(min(8, len(possible)) + 1)]
            if edges and rng.randrange(2):
                edges.append(rng.choice(edges))
            blocks = biconnected_components(n, edges)
            baseline = _components(n, edges)
            assert blocks['cuts'] == [v for v in range(n) if _components(n, edges, skip_vertex=v) > baseline]
            assert sorted(blocks['bridges']) == [i for i in range(len(edges)) if _components(n, edges, skip_edge=i) > baseline]
            assert sorted(e for block in blocks['blocks'] for e in block) == list(range(len(edges)))
            assert sorted(tuple(sorted(block)) for block in blocks['blocks']) == _brute_blocks(n, edges)
            for block in blocks['blocks']:
                vs = sorted({v for i in block for v in edges[i]})
                mapping = {v: i for i, v in enumerate(vs)}
                sub = [(mapping[edges[i][0]], mapping[edges[i][1]]) for i in block]
                assert all(_components(len(vs), sub, skip_vertex=v) <= 1 for v in range(len(vs)))
            weighted = [(a, b, rng.randrange(-3, 7)) for a, b in edges]
            cost, chosen = minimum_spanning_forest(n, weighted)
            target = n - baseline
            best = min((sum(weighted[i][2] for i in subset)
                        for subset in combinations(range(len(edges)), target)
                        if _components(n, [edges[i] for i in subset]) == baseline), default=0)
            assert cost == best and len(chosen) == target
            circuit = eulerian_circuit(n, edges)
            degrees = Counter(v for edge in edges for v in edge)
            active = {v for v in range(n) if degrees[v]}
            connected = _components(n, edges) - (n - len(active)) <= 1
            possible_cycle = all(v % 2 == 0 for v in degrees.values()) and connected
            assert (circuit is not None) == possible_cycle
            if circuit:
                assert circuit[0] == circuit[-1]
                assert Counter(tuple(sorted(pair)) for pair in zip(circuit, circuit[1:])) == Counter(tuple(sorted(e)) for e in edges)
            checks += 7
    assert eulerian_circuit(1, [(0, 0), (0, 0)]) == [0, 0, 0]
    for n in range(1, 5):
        pairs = [(a, b) for a in range(n) for b in range(n) if a != b]
        for _ in range(250):
            edges = [edge for edge in pairs if rng.randrange(3) == 0]
            reach = [[a == b for b in range(n)] for a in range(n)]
            for a, b in edges:
                reach[a][b] = True
            for k in range(n):
                for a in range(n):
                    for b in range(n):
                        reach[a][b] |= reach[a][k] and reach[k][b]
            labels = {}
            for i, component in enumerate(strongly_connected_components(n, edges)):
                for v in component:
                    labels[v] = i
            assert all((labels[a] == labels[b]) == (reach[a][b] and reach[b][a]) for a in range(n) for b in range(n))
            weighted = [(a, b, rng.randrange(2)) for a, b in edges]
            assert zero_one_bfs(n, weighted, 0) == bellman_ford(n, weighted, 0)
            checks += 2
    assert bellman_ford(4, [(0, 1, 4), (0, 2, 5), (2, 1, -3), (1, 3, 2)], 0) == [0, 2, 5, 4]
    assert bellman_ford(3, [(1, 2, -1), (2, 1, -1)], 0) == [0, inf, inf]
    try:
        bellman_ford(3, [(0, 1, 0), (1, 2, -1), (2, 1, 0)], 0)
        raise AssertionError('negative cycle missed')
    except ValueError:
        checks += 1
    print(f'Chapter 19: {checks} graph checks passed')
