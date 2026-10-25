# 資料結構與演算法

[線上閱讀](https://susuky.github.io/data-structures-algorithms-notes/) · [單檔 HTML](index.html) · [原始碼 ZIP](data-structures-algorithms-source.zip)

13 章繁體中文教材，包含圖解、逐步範例、Python 程式、練習解答與 6 個互動實驗。

## 閱讀

開啟 `index.html` 即可閱讀；HTML、CSS、JavaScript 與 SVG 均內嵌，可離線使用。

- 第一次學習：從第 01 章開始；準備面試：從第 12 章的解題流程與模擬題開始。
- `/` 開啟全書搜尋，`Esc` 關閉。支援中文、英文演算法名稱與程式；點擊結果會展開命中的解答。
- 章節與小節有固定錨點，可分享連結並使用瀏覽器的上一頁／下一頁。
- 書籤、完成進度與閱讀位置保存在目前瀏覽器。清除網站資料會移除紀錄。
- 支援淺色、深色、跟隨系統、手機目錄與鍵盤操作。
- 重點句使用螢光筆標記，Python 程式依語法上色；配色隨主題切換。
- 「列印全書與答案」會展開全部解答；列印結束後還原原本狀態。
- 停用 JavaScript 時仍可閱讀全部章節、圖解與程式。

## 章節

| 章 | 主題 | 內容 |
|---|---|---|
| 01 | 學習與分析 | Big O／Θ、遞迴、不變量、Python 操作成本 |
| 02 | 陣列與字串 | 雙指標、固定與可變視窗、前綴和 |
| 03 | 雜湊 | 存在性、計數、前綴狀態、最長不重複子字串 |
| 04 | 鏈結串列 | 快慢指標、反轉、dummy、回文檢查與結構還原 |
| 05 | 堆疊與佇列 | 解析、deque、單調堆疊與單調佇列 |
| 06 | 樹與圖 | DFS、BFS、BST、網格狀態、Kahn 拓樸排序 |
| 07 | 堆積 | heapq、Top K、串流與合併 |
| 08 | 貪婪 | 交換論證、區間選取、工作排程、反例 |
| 09 | 二分搜尋 | 四種邊界、bisect、單調判定、答案二分 |
| 10 | 回溯 | 子集合、排列、組合、去重、剪枝與撤銷 |
| 11 | 動態規劃 | 狀態、轉移、記憶化、填表、壓縮、方案重建 |
| 12 | 面試工具箱 | 解題流程、模板、成本速查、模擬題 |
| 13 | 進階補給 | 差分、Trie、位元、Union-Find、區間、模數、最短路徑 |

各節直接列出輸入、輸出、邊界與範例，並附 LeetCode 題號及延伸閱讀。範例使用 Python 3.10 以上版本。

## 互動實驗

每個實驗可修改輸入，並用「上一步／下一步／重新開始」觀察狀態。

| 實驗 | 觀察重點 |
|---|---|
| 雙指標 | 有序陣列的兩數總和與候選範圍排除 |
| 滑動視窗 | 固定長度視窗的加入、移除與最佳區間 |
| 二分搜尋 | 半開區間、重複值、空陣列與 lower bound |
| BFS | FIFO、首次入列、最少邊數與不可達節點 |
| 回溯 | 選擇、撤銷、剪枝與保存答案 |
| 動態規劃 | 最少硬幣數的依賴、更新與方案重建 |

實驗使用小型輸入，並保留逐步快照；教材的複雜度分析計算演算法本身。各實驗的輸入範圍列在欄位旁。

## 原始檔與建置

建置使用 Python 標準函式庫：

```sh
python build.py
```

| 路徑 | 用途 |
|---|---|
| `chapters/01.html` … `13.html` | 章節正文 |
| `source/shell.html` | 閱讀介面 |
| `source/styles.css` | 共用樣式 |
| `source/app.js` | 導覽、搜尋、儲存、主題與列印 |
| `source/labs.js` | 演算法追蹤與互動實驗 |
| `build.py` | 驗證、Python 語法上色並產生 `index.html` |
| `tests/examples_*.py` | 與正文同步的 Python 實作及驗證 |
| `tests/test_build.py` | 建置、錨點、Python 語法與實作同步檢查 |
| `tests/test_labs.js` | 互動演算法與獨立基準交叉比對 |
| `tests/test_dom.mjs` | 導覽、搜尋、書籤、列印與操作狀態 |
| `tests/test_browser.js` | Chromium 操作及版面檢查 |

修改 `chapters/` 或 `source/` 後執行建置。輸出使用 UTF-8 與 LF；同一份來源產生相同的 HTML。缺章、重複 ID、失效內部連結或章節中的腳本會使建置失敗。

推送至 `main` 後，GitHub Actions 會驗證並更新 `index.html` 與原始碼 ZIP。

## 驗證

Python：

```sh
python tests/test_build.py
for f in tests/examples_*.py; do python "$f" || exit; done
```

上述迴圈使用 Bash，可在 Linux、macOS 或 WSL 執行；也可逐一執行 `python tests/examples_01.py` 至 `examples_13.py`。

Node.js 18 以上版本：

```sh
node --check source/app.js
node --check source/labs.js
node tests/test_labs.js
node tests/test_dom.mjs
```

Python 範例與 JavaScript 演算法使用小範圍窮舉、獨立基準與具體邊界案例交叉驗證。`test_build.py` 也比較正文與範例檔中的函式／class，避免測試程式和讀者看到的實作分離。

已安裝 Playwright 與 Chromium 時，可執行瀏覽器檢查：

```sh
CHROMIUM_PATH=/usr/bin/chromium node tests/test_browser.js
DSA_SCREENSHOTS=/tmp/dsa-qa CHROMIUM_PATH=/usr/bin/chromium node tests/test_browser.js
```

第二個指令會保留桌面、手機、深色主題與實驗畫面的截圖。教材本身與其餘檢查不依賴 Playwright。
