# Spec: File Tree Explorer v2 — scale, performance and product depth

|           |                                                    |
| --------- | -------------------------------------------------- |
| Status    | Draft for review                                   |
| Author    | Diana Samkova                                      |
| Date      | 2026-11-09                                         |
| Builds on | v1 (the rebuild: virtualized ARIA tree, 10k items) |

## 1. Why

v1 shows a polished, accessible tree, but at 10,000 items it never has to work hard: on a fast laptop it produces no long tasks at all. A file manager's real problems start when the drive is too big to send in one response, when search has to run somewhere other than the main thread, and when every interaction has a measured budget.

v2 makes the explorer handle **1,000,000 items** with lazy loading, proves its speed with **budgets checked in CI**, and adds the product features people expect from a drive: a sortable list view, filters, storage insights, bulk actions, and live updates.

## 2. Baseline (measured 2026-11-09)

### In the browser, 10,000 items, production build

| Interaction                                | Fast laptop   | CPU throttled 6× (mid-range phone) |
| ------------------------------------------ | ------------- | ---------------------------------- |
| Load the drive (generate, normalize, draw) | 183 ms        | 985 ms, longest task 239 ms        |
| Type "report" (6 keys)                     | no long tasks | 2 long tasks, longest 60 ms        |
| 40 × ↓ while browsing                      | no long tasks | 1 long task, 66 ms                 |
| Select a folder (builds "Move to" list)    | no long tasks | 2 long tasks, longest 113 ms       |
| DOM nodes with 33 rows on screen           | 9,651         | —                                  |

A "long task" blocks the main thread for more than 50 ms; users feel it as lag.

### The model, in Node (fast machine)

| Operation                          | 100,000 items | 1,000,000 items |
| ---------------------------------- | ------------: | --------------: |
| Response size (JSON)               |         13 MB |      **133 MB** |
| `normalizeTree`                    |        275 ms |    **4,155 ms** |
| `searchTree` (one keystroke)       |         57 ms |    **1,291 ms** |
| `getVisibleRows`, all folders open |         11 ms |          471 ms |
| `moveNode` (one optimistic move)   |     **55 ms** |    **1,344 ms** |
| Item count for the status bar      |         14 ms |          296 ms |
| `listFolders` (Move to picker)     |         11 ms |          178 ms |

### What the numbers say

1. **Loading everything at once stops working** between 100k and 1M items: the payload and the normalization alone take seconds.
2. **`moveNode` is O(n), not O(1).** It spreads the whole `nodes` object (`{ ...tree.nodes }`) to stay immutable. TECH.md currently says a move "only copies the three objects it touches"; that is wrong and must be corrected.
3. **Some work runs on every render** that shouldn't: the status bar counts all nodes with `Object.keys`, and while searching, the expanded set is rebuilt on every focus change.
4. **The "Move to" picker is the heaviest DOM** on the page: 1,036 `<option>` elements and a `canMove` check per folder, built whenever the selection changes.

## 3. Goals, budgets and non-goals

### Budgets (checked in CI, Chromium, CPU throttled 6×)

| Budget                                                           | Target                             |
| ---------------------------------------------------------------- | ---------------------------------- |
| Long tasks while typing in search, moving focus, opening folders | none over 50 ms                    |
| First rows on screen, 1,000,000-item drive                       | under 1 s                          |
| Search results on the 1,000,000-item drive (95th percentile)     | under 300 ms                       |
| Opening a folder with 10,000 children                            | first page < 200 ms                |
| Initial JavaScript (gzipped)                                     | ≤ 130 KB; new features lazy-loaded |
| DOM nodes with the tree on screen                                | under 1,500                        |

Accessibility stays where v1 left it: axe reports no violations in light and dark mode, and every feature works with the keyboard alone.

### Non-goals

- A real backend, accounts or authentication. The mock server stays in the browser, now in a Web Worker.
- Conflict resolution beyond "the server's version wins, and the user is told".
- Touch drag and drop. Touch users keep the "Move to" picker and the action menu.

## 4. Performance work

### 4.1 Virtualization

**Today:** the tree is a flat list rendered with TanStack Virtual, fixed 32 px rows (no measuring), overscan 12. This part is already right: about 30 rows exist in the DOM for any drive size.

**Next:**

- **Virtualize the "Move to" picker.** Replace the native `<select>` with a filterable combobox (WAI-ARIA combobox + listbox) whose options are virtualized. Build the list only when it opens. This removes about 1,000 DOM nodes and the 113 ms task on selection.
- **The list view (F2) reuses the same virtualizer**, so tree and list share one row model.
- **Sticky path header (optional):** while scrolling deep inside a folder, show its path pinned at the top of the tree, as code editors do. It tells the user where they are in a 1M-item drive.

### 4.2 Memoization and algorithmic fixes

Each fix ships with a before/after number in TECH.md.

| #   | Problem                                                                                       | Fix                                                                                                                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a   | `moveNode` copies every node (O(n))                                                           | **Bucketed node store:** nodes split into 256 buckets by id hash; a move copies only the buckets it touches. Stays immutable, so TanStack Query and React memoization keep working. Alternative considered: a mutable store with a version counter (faster, but loses cheap snapshots for rollback). |
| b   | Status bar counts all nodes on every render                                                   | Keep `count` on the tree; normalize sets it, moves don't change it.                                                                                                                                                                                                                                  |
| c   | While searching, any state change (even focus) rebuilds the expanded set and the visible rows | Memoize on `state.expandedIds` and `state.search` only, not the whole state.                                                                                                                                                                                                                         |
| d   | Every visible row re-renders when focus or selection moves                                    | A memoized `TreeRow` with primitive props and stable callbacks (`useEffectEvent`), so a focus change re-renders two rows, not thirty.                                                                                                                                                                |
| e   | Search lowercases every name on every keystroke                                               | A search index built once per tree: lowercased names in a flat array. On the 1M drive search moves to the worker (4.4).                                                                                                                                                                              |
| f   | "Move to" builds all options and runs `canMove` per folder on every selection                 | Build lazily on open; check rules only for rendered options (4.1).                                                                                                                                                                                                                                   |
| g   | Manual memoization is easy to get wrong                                                       | Try the React Compiler after a–f and keep it only if the profiler shows a gain. TanStack Virtual is flagged as incompatible with it, so the tree component may need to opt out.                                                                                                                      |

**How it's measured:** React Profiler for render counts, Chrome's Performance panel for long tasks, and the performance panel described in 4.5.

### 4.3 Canvas: where it helps and where it doesn't

**Not for the tree rows.** After virtualization only about 30 rows are in the DOM, so the DOM isn't the bottleneck. Drawing rows on a canvas would lose screen-reader support, text selection, find-in-page, browser zoom and high-contrast mode, and would need a hidden accessible copy of every visible row. The cost is high and there is nothing to gain.

**For views with thousands of marks on screen at once:**

- **Storage insights treemap (F4):** thousands of rectangles, redrawn on hover and resize. Canvas draws them in one pass; an accessible table of the same data sits next to it.
- **Search hit minimap (F5, optional):** a thin strip beside the tree's scrollbar showing where matches are across the whole list, like a code editor's minimap. With 1M rows and thousands of hits, it's one canvas column, cheap to redraw.

### 4.4 Loading in chunks: lazy folders and infinite pages

**API (mock server, now in a Web Worker):**

```ts
getChildren(dataset, folderId | null, { cursor, limit = 200 }): { items, nextCursor, total }
getPath(dataset, id): ApiNode[]                // ancestors, for deep links (?file=)
search(dataset, query, { cursor, limit = 200 }): { matches, ancestors, nextCursor, total }
moveNodes(dataset, ids, target, versions): { moved, failed: { id, reason }[] }
```

**Client:**

- Each folder's children are an infinite query: `['children', dataset, folderId]`, pages of 200 sorted items. Pages feed one normalized node store (4.2 a), so lookups stay by id.
- Folders know their `childCount` before they're loaded, so the tree can show "Invoices (1,204)" and correct `aria-setsize` values.
- The row model inserts **skeleton rows** for a page being fetched and a **"load more" sentinel row** at the end of a loaded range. When the sentinel enters the virtual window, the next page is fetched. Screen readers hear "Loading more items in Invoices".
- **Prefetch** a folder's first page on hover or keyboard focus, so opening feels instant.
- **Cancel** a folder's requests when it's collapsed before they finish (`AbortSignal`).
- `*` (open all siblings) runs at most 4 requests at a time.
- **Search runs on the server**, debounced 150 ms, with the previous request aborted. It returns matches with their ancestors, so the result is still shown as a tree.
- **Deep links:** `?file=` calls `getPath`, then loads the pages that contain each ancestor.
- **Moves** stay optimistic. If the target folder isn't loaded, only its count changes and its pages are refetched. If the item's sorted position falls outside the loaded range, it isn't inserted locally.
- **Generating 1M items** happens in the worker and takes about 2.5 s. The UI shows "Preparing a drive with 1,000,000 items…" with progress, and the main thread stays free.

### 4.5 Making performance visible

- **Performance panel** (`?perf=1`, also a toggle in the header): frames per second, long tasks in the last 10 s, last search time, rows in the DOM, nodes loaded, JS heap. A reviewer can open the demo and see the numbers.
- **CI performance test** (Playwright, CPU throttled 6×): types in search, moves focus, opens folders on the 1M drive, and fails if any budget in section 3 is exceeded.
- **Bundle budget** with `size-limit`: fails CI when initial JS goes over 130 KB gzipped.
- **TECH.md** gets a "Performance" section with before/after numbers for each fix.

## 5. Product features

Effort: S = up to 1 day, M = 2–3 days, L = 4–6 days.

### F1. A 1,000,000-item drive — L

**Story:** As someone with a huge shared drive, I can browse and search it without waiting for all of it to download.

- A third drive in the header: "1,000,000 items".
- Opening it shows the root within 1 s; folders load page by page as I open and scroll them (4.4).
- Search covers the whole drive, not only loaded folders.
- All v1 keyboard, drag and drop, and "Move to" behavior works unchanged.

### F2. List view — M

**Story:** As someone looking for the biggest or newest files, I can switch to a table and sort it.

- A Tree / List switch; the choice is kept in the URL (`?view=list`).
- Columns: Name, Size, Modified, Type. Click or press Enter on a header to sort; `aria-sort` on the header.
- The list shows one folder at a time, with a path bar above it. Double-click or Enter opens a folder, Backspace goes up.
- Uses the same virtualizer and selection model as the tree. On the 1M drive sorting happens on the server.

### F3. Filters — M

**Story:** As someone cleaning up, I can find "PDFs over 1 MB changed this month".

- Filter chips for type (Documents, PDFs, Images, Video, Audio, Spreadsheets, Code, Archives), size (over 1 MB, 100 MB, 1 GB) and date modified (7 days, 30 days, this year).
- Each chip shows how many items it matches. Filters combine with search and are kept in the URL.
- Works in tree and list view. "Clear filters" in the empty state.

### F4. Storage insights — M

**Story:** As someone whose drive is full, I can see what takes up space and act on it.

- A panel showing a **treemap** of the selected folder (canvas, 4.3): area is size, colour is file type.
- Hover or focus shows the name, size and share of the folder. Click to open that folder in the treemap; a path bar goes back up.
- **"Largest files"** list beside it, with Reveal and "Move to".
- An accessible table with the same data is always available.
- Folder sizes are aggregated on the server and updated on every move.
- Lazy-loaded: none of its code is in the initial bundle.

### F5. Search hit minimap — S (optional)

A canvas strip next to the tree's scrollbar marks where search matches are in the list; clicking it scrolls there. Hidden from screen readers, which get the match count from the status bar instead.

### F6. Multi-select and bulk moves — M

**Story:** As someone reorganizing, I can move fifty files at once.

- Shift+click and Shift+↑↓ select a range; Ctrl/⌘+click toggles one; Ctrl/⌘+A selects all items in the focused folder. `aria-multiselectable="true"`.
- Dragging a selection moves all of it; the drag image shows a count. Cut, paste and "Move to" work for the selection.
- One optimistic update for the whole batch. If the server refuses some items, only those roll back, and the toast says "Moved 48 of 50 items. 2 couldn't be moved", with details.
- The details panel shows totals for the selection.

### F7. Live updates from another tab — M

**Story:** As someone working with others, I see their changes without reloading.

- Open the demo in two tabs: a move in one appears in the other within a second (BroadcastChannel stands in for a server push).
- Changed rows get a short highlight; a screen reader hears "Team moved to Archive by another user".
- Every node has a version. A move based on an old version is refused (409) with "This item was changed by someone else. The tree is up to date now, try again."
- An item being dragged that's moved elsewhere meanwhile can't be dropped, and the hint says why.

### F8. Rename, new folder, delete to Trash — M

- F2 or "Rename" in the action menu edits a name in place; Enter saves, Esc cancels. Empty names, duplicates in the folder, and `/` are refused with a reason.
- "New folder" in the current folder, named "Untitled folder", then renamed in place.
- Delete moves items to a Trash folder; Undo in the toast; Trash can be emptied.
- An action menu on each row (the ⋯ button, or Shift+F10) gives single-pointer access to every action.

### F9. Preview — S

Images show a thumbnail and Markdown files a rendered preview in the details panel. The Markdown renderer is lazy-loaded.

### F10. Changes that survive a reload — S

The mock server saves its state to IndexedDB; a "Reset demo" button restores the sample data.

## 6. Plan

| Phase | Content                                                                                | Effort   |
| ----- | -------------------------------------------------------------------------------------- | -------- |
| P0    | Performance panel, CI budgets, fixes 4.2 a–f, virtualized "Move to", corrected TECH.md | 2–3 days |
| P1    | Worker server, lazy folders, infinite pages, server search, 1M drive (F1)              | 4–6 days |
| P2    | List view and filters (F2, F3)                                                         | 4–5 days |
| P3    | Storage insights (F4), optional minimap (F5)                                           | 2–3 days |
| P4    | Multi-select and bulk moves (F6)                                                       | 2–3 days |
| P5    | Live updates (F7)                                                                      | 2 days   |
| P6    | Rename, new folder, Trash, preview, persistence (F8–F10)                               | 3–4 days |

**Recommended for the portfolio: P0 to P3.** They show measured performance work, a large dataset, and data visualization. P4 to P6 add product completeness and can follow later.

Every phase keeps: tests at the agreed coverage level, axe clean in both themes, keyboard parity, and a TECH.md update with numbers.

## 7. Risks

| Risk                                                              | Mitigation                                                                                                                                  |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A partially loaded tree makes moves, counts and focus much harder | One normalized store; folders carry `childCount`; the row model is the only place that knows about unloaded ranges; heavy unit tests on it. |
| 1M items in the worker use a lot of memory on phones              | Measure in P1. Fallback: generate each folder's children on demand from a seed (no full copy in memory), and keep a smaller search index.   |
| Bundle grows with each feature                                    | Lazy-load F4, F5, F9; `size-limit` in CI.                                                                                                   |
| 100% coverage slows down feature work                             | Decide the threshold before P1 (see questions).                                                                                             |

## 8. Open questions

1. Which phases do we build? The recommendation is P0 to P3.
2. 1,000,000 items, or 250,000 to keep phones comfortable?
3. Keep the 100% coverage threshold, or 95% so tests stay about behavior?
4. Where does v2 go: the current PR, or a new PR after the rebuild is merged? A separate PR keeps the rebuild reviewable.
5. Deploy to GitHub Pages now (v1), or after P0?
