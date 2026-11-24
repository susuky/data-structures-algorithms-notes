# 資料結構與演算法

[線上閱讀](https://susuky.github.io/data-structures-algorithms-notes/) · [73 類索引](index.html#topic-categories) · [單檔 HTML](index.html) · [原始碼 ZIP](data-structures-algorithms-source.zip)

**24 章、159 個閱讀單元、73 類、70 種逐步模型，外加 6 個可以直接動手改資料的工作台實驗。** 從最基礎的陣列、雙指標一路寫到平衡樹、進階圖論、水塘取樣、SQL 跟多執行緒。這份筆記的寫法是「先拿一組具體輸入跑跑看，再回頭拆解背後的理由」——像是 KMP 比對失敗時，剛比過的前綴怎麼直接接續；線段樹改了一個葉節點，沿路哪些區間會跟著重算；圖上的 low-link 又是在哪一步被拉低。每個單元都把關鍵圖解、複雜度拆解和可執行的 Python 實作放在同一頁，練習題的解答則收在摺疊區裡，方便你先自己想過再展開對答案。

## 打開就能動手玩

首頁上方的工作台有六個分頁，不用寫程式就能直接拖曳、改輸入、看每一步怎麼變：

| 實驗 | 可以怎麼操作 | 重點觀察什麼 |
|---|---|---|
| 排序 | 直接拖曳數列換位，或輸入自己的數字；左右兩欄各選插入、選擇或氣泡排序 | 比較與交換次數差多少，還有相等數值的先後順序有沒有跑掉 |
| 最短路徑 | 自己畫牆壁、高費用地形，或直接拖改起點跟終點 | BFS 只看步數，Dijkstra 會算總花費，兩條路何時會分開走 |
| 二分搜尋 | 輸入目標值或直接點數列裡的數字，切換重複值跟越界範例 | 候選區間 `[L, R)` 怎麼對半縮、重複值怎麼停在第一筆 |
| 最小堆 | 插入數字或取出最小值 | 樹狀圖跟底層陣列怎麼同步更新，上浮與下沉做了幾次交換 |
| BST / AVL | 用同一組數字切換普通 BST 與 AVL，並直接插入、搜尋或刪除 | 遞增輸入怎麼把普通 BST 拖成一條長鏈，AVL 又是怎麼靠旋轉把樹高壓回來 |
| 雜湊表 | 輸入鍵值放入、查詢或刪除，切換鏈結法、線性探測與桶數（7 格／11 格） | 同餘碰撞時鏈長怎麼變、線性探測怎麼聚成一團，以及刪除標記（✕）為什麼不能省 |

[互動實驗](index.html#algorithm-labs) 下面還留著 6 個經典題型的逐步推演，跟各章對應單元的連結。讀正文時，點單元旁的「互動」或「操作圖解」就會直接跳到那一段的模型。

## 怎麼讀比較順

這整份教材已經把 HTML、CSS、JavaScript、SVG 圖表和所有程式碼包進單一檔案 `index.html` 裡，直接用瀏覽器打開就能看，斷網也不受影響。

- **從題型找單元**：打開 [73 類索引](index.html#topic-categories)（`#topic-categories`），直接打中文或英文名稱（例如「線段樹」、「Segment Tree」或「sampling」），也可以搭配群組下拉選單一起篩選。
- **專心讀一節，或一口氣看整章**：頂部可以切換「單元／全章」，側欄選小節，每節底部也有上一節跟下一節的連結。
- **邊看邊猜下一步**：每一個逐步播放器都支援改範例、展開「調整輸入」自己填測資，也能用「上一步／下一步」、播放調速、拖曳時間軸，或按鍵盤的 `←` / `→` 方向鍵一步步推進。如果你想練反應，打開「先猜」按鈕就能先遮住文字說明，想完再點開對答案；切換頁面時播放會自動暫停。
- **查某個關鍵字或函式**：按 `/` 或點右上角搜尋，中英文名稱、正文跟程式碼都能找，點結果會直接開到那一節並展開對應摺疊區。
- **進度留在自己瀏覽器裡**：書籤、章節完成打勾、深淺主題跟上次讀到的位置都會存在本機瀏覽器。
- **手機與列印**：手機上從左側目錄抽屜切章節，太寬的表格跟圖表都可以左右滑；按列印會自動展開全書跟所有練習解答；就算瀏覽器關掉 JavaScript，正文、靜態圖跟程式碼依然能完整閱讀。

把本資料夾與 `system-design-notes` 並排放在同一上層資料夾，就能從目錄或桌面頂列切換教材。

## 24 章

| 章 | 主題 | 主要內容 | 單元數 |
|---|---|---|---|
| [01](index.html#chapter-01) | 學習與分析 | Big O、遞迴與 Python 的真實成本 | 7 |
| [02](index.html#chapter-02) | 陣列與字串 | 雙指標、滑動視窗與前綴和 | 8 |
| [03](index.html#chapter-03) | 雜湊 | 存在性、計數與前綴狀態 | 10 |
| [04](index.html#chapter-04) | 鏈結串列 | 快慢指標、反轉與指標不變量 | 7 |
| [05](index.html#chapter-05) | 堆疊與佇列 | 解析、deque 與單調結構 | 7 |
| [06](index.html#chapter-06) | 樹與圖 | DFS、BFS、BST 與拓樸排序 | 10 |
| [07](index.html#chapter-07) | 堆積 | heapq、Top K 與串流合併 | 8 |
| [08](index.html#chapter-08) | 貪婪 | 交換論證、排序與反例 | 9 |
| [09](index.html#chapter-09) | 二分搜尋 | 邊界、答案空間與單調判定 | 10 |
| [10](index.html#chapter-10) | 回溯 | 生成、剪枝與狀態復原 | 8 |
| [11](index.html#chapter-11) | 動態規劃 | 狀態、轉移、記憶化與填表 | 10 |
| [12](index.html#chapter-12) | 面試工具箱 | 解題流程、模板與原創模擬題 | 9 |
| [13](index.html#chapter-13) | 進階補給 | 差分、Trie、Union-Find 與最短路徑 | 10 |
| [14](index.html#chapter-14) | 排序與選擇 | 穩定排序、分治、計數、桶與第 k 小 | 7 |
| [15](index.html#chapter-15) | 數學與組合 | 因數、質數、計數與組合數 | 4 |
| [16](index.html#chapter-16) | 字串比對與索引 | KMP、雜湊、滾動雜湊與後綴陣列 | 4 |
| [17](index.html#chapter-17) | 機率與取樣 | 洗牌、期望值、水塘與拒絕取樣 | 4 |
| [18](index.html#chapter-18) | 區間與有序集合 | 線段樹、Fenwick Tree 與平衡搜尋樹 | 4 |
| [19](index.html#chapter-19) | 圖的連通與路徑 | 生成樹、Euler、SCC、雙連通與最短路 | 6 |
| [20](index.html#chapter-20) | 幾何與掃描線 | 方向、凸包與事件順序 | 3 |
| [21](index.html#chapter-21) | 設計與串流 | LRU、雙向串列、迭代器與中位數 | 4 |
| [22](index.html#chapter-22) | 遊戲與不變量 | 取石子、Minimax 與奇偶推理 | 3 |
| [23](index.html#chapter-23) | 資料查詢與協作 | SQL、Shell、執行緒與互動評測 | 4 |
| [24](index.html#chapter-24) | 列舉、折半與模擬 | 縮小搜尋量，推進事件狀態 | 3 |

Python 範例使用 3.10 以上版本。第 23 章另附 SQL 與 Shell 範例；各章的來源連結可直接追到文件、教材或論文。

## 73 類對照

下表保留分類圖片中的全部英文標籤，按網站群組整理。點章號會直接開啟該類的單元；最短路徑另列第 13 章的 Dijkstra，方便和第 19 章的 Bellman–Ford、0–1 BFS 對照。

### 陣列與字串（7 類）

| 英文標籤 | 中文 | 章 |
|---|---|---|
| Array | 陣列 | [02](index.html#c02-two-pointers) |
| String | 字串 | [03](index.html#c03-unique-window) |
| Hash Table | 雜湊表 | [03](index.html#c03-complement) |
| Matrix | 矩陣 | [11](index.html#c11-matrix) |
| Prefix Sum | 前綴和 | [02](index.html#c02-prefix) |
| Two Pointers | 雙指標 | [02](index.html#c02-two-pointers) |
| Sliding Window | 滑動視窗 | [02](index.html#c02-fixed-window) |

### 線性與優先結構（6 類）

| 英文標籤 | 中文 | 章 |
|---|---|---|
| Heap (Priority Queue) | 堆積／優先佇列 | [07](index.html#c07-topk) |
| Stack | 堆疊 | [05](index.html#c05-monotonic-stack) |
| Linked List | 鏈結串列 | [04](index.html#c04-reverse) |
| Monotonic Stack | 單調堆疊 | [05](index.html#c05-monotonic-stack) |
| Queue | 佇列 | [06](index.html#c06-graph-bfs) |
| Monotonic Queue | 單調佇列 | [05](index.html#c05-monotonic-deque) |

### 樹與圖（9 類）

| 英文標籤 | 中文 | 章 |
|---|---|---|
| Depth-First Search | 深度優先搜尋 | [06](index.html#c06-dfs) |
| Tree | 樹 | [06](index.html#c06-dfs) |
| Breadth-First Search | 廣度優先搜尋 | [06](index.html#c06-graph-bfs) |
| Graph Theory | 圖論 | [06](index.html#c06-graph-bfs) |
| Binary Tree | 二元樹 | [06](index.html#c06-dfs) |
| Union-Find | 聯集查找 | [13](index.html#c13-union-find) |
| Trie | 字首樹 | [13](index.html#c13-trie) |
| Binary Search Tree | 二元搜尋樹 | [06](index.html#c06-bst) |
| Topological Sort | 拓樸排序 | [06](index.html#c06-topological) |

### 搜尋與狀態（6 類）

| 英文標籤 | 中文 | 章 |
|---|---|---|
| Dynamic Programming | 動態規劃 | [11](index.html#c11-tabulation) |
| Greedy | 貪婪法 | [08](index.html#c08-intervals) |
| Binary Search | 二分搜尋 | [09](index.html#c09-invariant) |
| Backtracking | 回溯 | [10](index.html#c10-tree) |
| Recursion | 遞迴 | [01](index.html#c01-recursion) |
| Memoization | 記憶化 | [11](index.html#c11-memo) |

### 排序與分治（7 類）

| 英文標籤 | 中文 | 章 |
|---|---|---|
| Sorting | 排序 | [14](index.html#c14-sorting) |
| Divide and Conquer | 分治 | [14](index.html#c14-divide-conquer) |
| Merge Sort | 合併排序 | [14](index.html#c14-merge-sort) |
| Counting Sort | 計數排序 | [14](index.html#c14-counting-sort) |
| Quickselect | 快速選取 | [14](index.html#c14-quickselect) |
| Bucket Sort | 桶排序 | [14](index.html#c14-bucket-sort) |
| Radix Sort | 基數排序 | [14](index.html#c14-radix-sort) |

### 數學與計數（3 類）

| 英文標籤 | 中文 | 章 |
|---|---|---|
| Math | 數學 | [15](index.html#c15-math) |
| Number Theory | 數論 | [15](index.html#c15-number-theory) |
| Combinatorics | 組合數學 | [15](index.html#c15-combinatorics) |

### 數學與位元（3 類）

| 英文標籤 | 中文 | 章 |
|---|---|---|
| Bit Manipulation | 位元運算 | [13](index.html#c13-bits) |
| Counting | 計數 | [03](index.html#c03-frequency) |
| Bitmask | 位元遮罩 | [13](index.html#c13-bits) |

### 區間與有序結構（3 類）

| 英文標籤 | 中文 | 章 |
|---|---|---|
| Segment Tree | 線段樹 | [18](index.html#c18-segment-tree) |
| Ordered Set | 有序集合 | [18](index.html#c18-ordered-set) |
| Binary Indexed Tree | Fenwick 樹 | [18](index.html#c18-fenwick) |

### 字串索引（4 類）

| 英文標籤 | 中文 | 章 |
|---|---|---|
| Hash Function | 雜湊函數 | [16](index.html#c16-hash-function) |
| String Matching | 字串比對 | [16](index.html#c16-string-matching) |
| Rolling Hash | 滾動雜湊 | [16](index.html#c16-rolling-hash) |
| Suffix Array | 後綴陣列 | [16](index.html#c16-suffix-array) |

### 進階圖論（5 類）

| 英文標籤 | 中文 | 章 |
|---|---|---|
| Shortest Path | 最短路徑 | [19](index.html#c19-bellman-ford) · [13](index.html#c13-dijkstra) |
| Minimum Spanning Tree | 最小生成樹 | [19](index.html#c19-mst) |
| Eulerian Circuit | 歐拉迴路 | [19](index.html#c19-euler) |
| Strongly Connected Component | 強連通分量 | [19](index.html#c19-scc) |
| Biconnected Component | 雙連通分量 | [19](index.html#c19-biconnected) |

### 幾何與掃描（2 類）

| 英文標籤 | 中文 | 章 |
|---|---|---|
| Geometry | 幾何 | [20](index.html#c20-convex-hull) |
| Sweep Line | 掃描線 | [20](index.html#c20-sweep-line) |

### 隨機與取樣（4 類）

| 英文標籤 | 中文 | 章 |
|---|---|---|
| Randomized | 隨機化 | [17](index.html#c17-randomized) |
| Probability and Statistics | 機率與統計 | [17](index.html#c17-probability) |
| Reservoir Sampling | 水塘取樣 | [17](index.html#c17-reservoir) |
| Rejection Sampling | 拒絕取樣 | [17](index.html#c17-rejection) |

### 設計與串流（4 類）

| 英文標籤 | 中文 | 章 |
|---|---|---|
| Design | 資料結構設計 | [21](index.html#c21-design) |
| Data Stream | 資料串流 | [21](index.html#c21-data-stream) |
| Doubly-Linked List | 雙向鏈結串列 | [21](index.html#c21-doubly-linked) |
| Iterator | 迭代器 | [21](index.html#c21-iterator) |

### 博弈與推理（3 類）

| 英文標籤 | 中文 | 章 |
|---|---|---|
| Game Theory | 賽局理論 | [22](index.html#c22-game-theory) |
| Brainteaser | 推理與不變量 | [22](index.html#c22-brainteaser) |
| Minimax | 極大極小搜尋 | [22](index.html#c22-minimax) |

### 查詢與協作（4 類）

| 英文標籤 | 中文 | 章 |
|---|---|---|
| Database | 資料庫查詢 | [23](index.html#c23-database) |
| Interactive | 互動問答題 | [23](index.html#c23-interactive) |
| Concurrency | 並行與同步 | [23](index.html#c23-concurrency) |
| Shell | Shell 文字處理 | [23](index.html#c23-shell) |

### 列舉與模擬（3 類）

| 英文標籤 | 中文 | 章 |
|---|---|---|
| Simulation | 模擬 | [24](index.html#c24-simulation) |
| Enumeration | 列舉 | [24](index.html#c24-enumeration) |
| Meet in the Middle | 折半搜尋 | [24](index.html#c24-meet-in-middle) |

## 70 種互動模型

70 種按模型識別碼計算。原有 14 種包含雙指標、BFS、二分搜尋、回溯與動態規劃；四組新模型共 56 種，共用一套逐步播放器。

| 模型檔 | 數量 | 內容 |
|---|---|---|
| [source/labs.js](source/labs.js) | 14 | 核心陣列、線性結構、搜尋、貪婪、DP、Union-Find |
| [source/models-core.js](source/models-core.js) | 12 | 遞迴、前綴和、計數、樹走訪、BST、拓樸排序、Trie、位元 |
| [source/models-algorithms.js](source/models-algorithms.js) | 19 | 排序與選取、數學、KMP、雜湊、後綴陣列、機率與取樣 |
| [source/models-structures.js](source/models-structures.js) | 11 | 線段樹、Fenwick、AVL、生成樹、連通分量、最短路、幾何 |
| [source/models-applied.js](source/models-applied.js) | 14 | LRU、串流、迭代器、遊戲、SQL、Shell、並行、列舉與模擬 |

互動圖顯示目前處理的元素、已完成的部分及尚未處理的部分，搭配文字與變數值逐步說明。可以先猜下一步，再點一次確認；輸入不合格式時，欄位旁會提示如何修改。

## 原始檔與建置

在專案資料夾執行：

```sh
python build.py
```

建置只使用 Python 標準函式庫，產生可獨立開啟的 `index.html`。修改 `chapters/` 或 `source/` 後重新建置。

| 路徑 | 用途 |
|---|---|
| `chapters/01.html`–`24.html` | 正文、圖解、程式、練習與互動入口 |
| `source/shell.html` | 閱讀介面 |
| `source/reader.js`、`reader.css` | 單元／全章切換、逐節導覽、響應式版面 |
| `source/app.js`、`styles.css` | 全文搜尋、儲存、主題、列印與基礎樣式 |
| `source/categories-*.json`、`category-order.json` | 73 類的中英文名稱、群組、單元、模型與排列 |
| `source/category-ui.js` | 中英文分類篩選、群組篩選與直達互動的入口 |
| `source/labs.js`、`labs-interactive.css` | 原有 14 種互動模型與操作介面 |
| `source/models-*.js` | 四組新模型的輸入、案例與逐步狀態 |
| `source/topic-labs.js`、`topic-labs.css` | 56 種新模型共用的圖、表、輸入與播放控制 |
| `source/exploration-studio.js`、`exploration-studio.css` | 六種工作台實驗（排序、最短路徑、二分搜尋、最小堆、BST/AVL、雜湊表）的模型與介面 |
| `build.py` | 組合單檔教材、程式上色、檢查錨點與內部連結 |
| `tests/examples_01.py`–`examples_24.py` | 與正文同步的 Python 實作及驗證 |

分類資料分為 `categories-core.json`、`categories-algorithms.json`、`categories-structures.json`、`categories-applied.json`。新增類別時，同時填入單元與模型識別碼；建置及分類測試會核對入口。

## 驗證

### 建置、正文與模型

```sh
python build.py
python tests/test_build.py
python tests/test_category_coverage.py
node tests/test_labs.js
node tests/test_extended_labs.js
node tests/test_models_core.js
node tests/test_models_algorithms.js
node tests/test_models_structures.js
node tests/test_models_applied.js
node tests/test_exploration_studio.js
node tests/test_dom.mjs
```

`test_build.py` 檢查章節、錨點、Python 語法，並將正文函式及 class 與範例檔逐一比對。`test_category_coverage.py` 核對 73 類、單元與互動入口。模型測試以獨立基準、小規模窮舉及不變量檢查結果和中間狀態。

24 組 Python 範例可各自執行，例如 `python tests/examples_19.py`。PowerShell 可一次執行全部：

```powershell
Get-ChildItem tests/examples_*.py | ForEach-Object { python $_.FullName }
```

### 真實瀏覽器

三支腳本直接用 Chromium 開啟本機 HTML：

| 測試 | 範圍 |
|---|---|
| `tests/test_browser.js` | 全部 159 個單元的桌面與手機版面、單元／全章切換、搜尋、書籤、原有 14 種模型、列印及停用 JavaScript |
| `tests/test_topic_browser.js` | 73 類連結與直達實驗入口、中英文與群組篩選、56 種新模型的案例和步驟、自訂輸入、錯誤提示、播放與切頁暫停、手機溢位與鍵盤操作 |
| `tests/test_exploration_browser.js` | 六種工作台的拖曳、鍵盤、改圖、搜尋邊界、堆、BST/AVL 旋轉、雜湊碰撞、路由暫停，以及 390／320px 淺色與深色版面 |

使用 [Playwright Library](https://playwright.dev/docs/library)。以下把測試套件放到自己指定的工具資料夾；已有 Playwright 環境時，把 `NODE_PATH` 指向該環境的 `node_modules` 即可。Chrome 路徑依實際安裝位置調整。

```powershell
$testTools = Join-Path $env:LOCALAPPDATA "learn-cs-test-tools"
npm install --prefix $testTools playwright
$env:NODE_PATH = Join-Path $testTools "node_modules"
$env:CHROMIUM_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
node tests/test_browser.js
node tests/test_topic_browser.js
node tests/test_exploration_browser.js
```

設定 `COURSE_SCREENSHOTS` 可另存瀏覽器檢查畫面。

## 參考

逐步圖解與閱讀方式參考 [Designed to Scale](https://designed-to-scale.vercel.app/#/) 及同作者的 [Algo Lab](https://byte-sized-algorithms.vercel.app/)。各章的技術內容附原始文件、教材或論文連結。
