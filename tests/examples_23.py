import re
import sqlite3
import subprocess
import os
import shutil
from collections import Counter, deque
from pathlib import Path
from threading import Condition, Lock, Thread

RANK_SQL = """
WITH totals AS (
    SELECT customer, SUM(amount) AS total
    FROM orders
    GROUP BY customer
), ranked AS (
    SELECT customer, total,
           DENSE_RANK() OVER (ORDER BY total DESC) AS place
    FROM totals
)
SELECT customer, total, place
FROM ranked
WHERE place <= ?
ORDER BY place, customer;
"""

def spending_rank(orders, top):
    with sqlite3.connect(":memory:") as connection:
        connection.execute("CREATE TABLE orders(customer TEXT, amount INTEGER)")
        connection.executemany("INSERT INTO orders VALUES (?, ?)", orders)
        return connection.execute(RANK_SQL, (top,)).fetchall()

SHELL_PIPELINE = """export LC_ALL=C
tr -cs 'A-Za-z' '\\n' |
tr 'A-Z' 'a-z' |
sed '/^$/d' |
sort |
uniq -c |
sort -k1,1nr -k2,2"""

def shell_word_counts(text):
    bash = Path("C:/Program Files/Git/bin/bash.exe") if os.name == "nt" else shutil.which("bash")
    completed = subprocess.run([str(bash), "-c", SHELL_PIPELINE], input=text,
                               text=True, capture_output=True, check=True)
    return [(word, int(count)) for count, word in
            (line.split() for line in completed.stdout.splitlines())]

class LockedCounter:
    def __init__(self):
        self.value = 0
        self.lock = Lock()

    def increment(self):
        with self.lock:
            self.value += 1

class BoundedMailbox:
    def __init__(self, capacity):
        if capacity < 1:
            raise ValueError("capacity 至少為 1")
        self.capacity = capacity
        self.items = deque()
        self.changed = Condition()

    def put(self, value):
        with self.changed:
            self.changed.wait_for(lambda: len(self.items) < self.capacity)
            self.items.append(value)
            self.changed.notify_all()

    def get(self):
        with self.changed:
            self.changed.wait_for(lambda: bool(self.items))
            value = self.items.popleft()
            self.changed.notify_all()
            return value

def interleaved_increment(schedule, locked=False):
    if sorted(schedule) != list("AABB"):
        raise ValueError("排程須含兩個 A 與兩個 B")
    value, owner = 0, None
    phase, local, pending = {"A": 0, "B": 0}, {}, deque(schedule)
    while pending:
        worker = pending.popleft()
        if locked and owner not in (None, worker):
            pending.append(worker)
            continue
        if phase[worker] == 0:
            if locked:
                owner = worker
            local[worker] = value
        else:
            value = local[worker] + 1
            owner = None
        phase[worker] += 1
    return value

def query_secret(n, query):
    if n < 1:
        raise ValueError("n 至少為 1")
    low, high = 1, n
    while low <= high:
        middle = (low + high) // 2
        answer = query(middle)
        if answer == 0:
            return middle
        if answer > 0:
            low = middle + 1
        else:
            high = middle - 1
    raise ValueError("回覆與候選區間矛盾")

def verify_displayed_queries():
    import html
    chapter = (Path(__file__).resolve().parents[1] / "chapters/23.html").read_text(encoding="utf-8")
    queries = [html.unescape(code) for code in re.findall(
        r'<pre><code class="language-sql">(.*?)</code></pre>', chapter, re.S)]
    expected = [[("A", 20, 1), ("B", 20, 1), ("C", 7, 2)],
                [("A", 2, 25), ("B", 1, 10), ("C", 0, 0)]]
    assert len(queries) == len(expected)
    with sqlite3.connect(":memory:") as database:
        for query, result in zip(queries, expected):
            assert database.execute(query).fetchall() == result
    shell = re.findall(r'<pre><code class="language-bash">(.*?)</code></pre>', chapter, re.S)
    assert len(shell) == 1 and html.unescape(shell[0]) == SHELL_PIPELINE

def run_tests():
    verify_displayed_queries()
    import itertools
    import random
    rng = random.Random(23)
    for _ in range(100):
        orders = [(rng.choice("ABCDE"), rng.randrange(-3, 20)) for _ in range(rng.randrange(15))]
        totals = Counter()
        for person, amount in orders:
            totals[person] += amount
        values = sorted(set(totals.values()), reverse=True)
        expected = sorted([(p, t, values.index(t) + 1) for p, t in totals.items()],
                          key=lambda row: (row[2], row[0]))
        for top in range(1, 4):
            assert spending_rank(orders, top) == [row for row in expected if row[2] <= top]
    assert spending_rank([("A", 10), ("A", 10), ("B", 20), ("C", 5)], 1) == [("A", 20, 1), ("B", 20, 1)]
    with sqlite3.connect(":memory:") as db:
        db.executescript("""CREATE TABLE customers(id TEXT);
CREATE TABLE orders(customer TEXT, amount INTEGER);
INSERT INTO customers VALUES ('A'), ('B'), ('C');
INSERT INTO orders VALUES ('A', 20), ('A', 5), ('B', 10);""")
        result = db.execute("""SELECT c.id, COUNT(o.customer), COALESCE(SUM(o.amount), 0)
FROM customers AS c LEFT JOIN orders AS o ON o.customer = c.id
GROUP BY c.id ORDER BY c.id""").fetchall()
        assert result == [("A", 2, 25), ("B", 1, 10), ("C", 0, 0)]
    for text in ("Tea, coffee TEA. tea!", "", "...", "X2y x_Y", "one\ntwo\none\n"):
        expected = Counter(re.findall("[A-Za-z]+", text.lower()))
        assert shell_word_counts(text) == sorted(expected.items(), key=lambda pair: (-pair[1], pair[0]))
    for schedule in set(itertools.permutations("AABB")):
        assert interleaved_increment(schedule, True) == 2
        assert interleaved_increment(schedule, False) in (1, 2)
    assert interleaved_increment("ABAB") == 1
    assert interleaved_increment("AABB") == 2
    counter = LockedCounter()
    def increment_many():
        for _ in range(2000):
            counter.increment()
    threads = [Thread(target=increment_many, daemon=True) for _ in range(4)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(5)
        assert not thread.is_alive()
    assert counter.value == 8000
    mailbox, consumed = BoundedMailbox(2), []
    def produce():
        for i in range(100):
            mailbox.put(i)
        mailbox.put(None)
    def consume():
        while True:
            item = mailbox.get()
            if item is None:
                return
            consumed.append(item)
    producer, consumer = Thread(target=produce, daemon=True), Thread(target=consume, daemon=True)
    consumer.start()
    producer.start()
    producer.join(5)
    consumer.join(5)
    assert not producer.is_alive() and not consumer.is_alive()
    assert consumed == list(range(100))
    for n in range(1, 130):
        for secret in range(1, n + 1):
            queries = []
            def query(guess):
                queries.append(guess)
                return (secret > guess) - (secret < guess)
            assert query_secret(n, query) == secret
            assert len(queries) <= n.bit_length()
            assert len(queries) == len(set(queries))

if __name__ == "__main__":
    run_tests()
    print("examples_23: SQLite、Git Bash、執行緒同步與互動查詢通過")
