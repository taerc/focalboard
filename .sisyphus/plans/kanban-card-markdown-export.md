# Kanban Card Single-Card Markdown Export

## TL;DR

> **Quick Summary**: Add an "Export to Markdown" menu item to the KanbanCard's context menu (CardActionsMenu) so users can export a SINGLE card to Markdown. Reuses the existing MarkdownExporter helper methods (escapeMarkdown, formatPropertyValue, formatComments) from the KanbanColumnHeader export feature.
>
> **Deliverables**:
> - New `exportCardMarkdown()` + `generateCardMarkdown()` methods in existing `markdownExporter.ts`
> - Modified `kanbanCard.tsx` with Export to Markdown menu item via CardActionsMenu children
> - Modified `kanban.tsx` passing `activeView` prop to KanbanCard
> - Updated `kanbanCard.test.tsx` snapshots (children added)
> - New i18n key `KanbanCard.export-markdown`
> - New test cases for `exportCardMarkdown` in `markdownExporter.test.ts`
>
> **Estimated Effort**: Quick
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 (exporter method) → Task 3 (component wiring) → Final verification

---

## Context

### Original Request
用户希望在看板视图的卡片（KanbanCard）上添加 "Export to Markdown" 功能，类似 KanbanColumnHeader 的导出功能，但区别是：KanbanColumnHeader 导出整列所有卡片，而 KanbanCard 只导出单个卡片。用户明确要求尽量复用 KanbanColumnHeader 的导出逻辑。

### Interview Summary
**Key Discussions**:
- 入口位置：KanbanCard 的三点菜单（CardActionsMenu），通过 children 插槽添加
- 导出范围：单个卡片 + 其评论
- 复用策略：复用 MarkdownExporter 的所有私有方法（escapeMarkdown, formatPropertyValue, formatComments, formatComment）
- 数据获取：KanbanCard 需新增 Redux selectors 获取 commentsByCard 和 usersById（与 KanbanColumnHeader 相同模式）

**Research Findings**:
- `MarkdownExporter` 已有 `exportColumnMarkdown` 方法和 4 个可复用私有方法
- `CardActionsMenu` 已有 `children` prop 插槽，`cardDialog.tsx` 是唯一已使用此模式的组件
- `KanbanCard` 目前不接收 `activeView` prop，需从 `Kanban.tsx` 传递
- `kanbanCard.test.tsx` 有快照测试，添加 children 后需要更新快照
- `KanbanColumnHeader.export-markdown` i18n key 已存在，新增 `KanbanCard.export-markdown`

### Metis Review
**Identified Gaps** (addressed):
- CardActionsMenu 范围：确认通过 children 在 kanbanCard.tsx 添加是安全的，不会影响其他视图（Gallery/Table/Calendar/CardDialog）
- 快照测试影响：kanbanCard.test.tsx 有快照，添加 children 后必须更新快照
- children 模式参考：cardDialog.tsx 是唯一已使用 children 的组件，作为参考模式
- Redux Hooks 规则：useAppSelector 必须在组件顶层调用，不能在回调或循环中

---

## Work Objectives

### Core Objective
在 KanbanCard 的 CardActionsMenu 中添加 "Export to Markdown" 菜单项，允许用户导出单个卡片（含属性和评论）为 Markdown 文件，复用现有 MarkdownExporter 的格式化逻辑。

### Concrete Deliverables
- `webapp/src/markdownExporter.ts` — 新增 `exportCardMarkdown` + `generateCardMarkdown` 方法
- `webapp/src/markdownExporter.test.ts` — 新增单卡导出测试用例
- `webapp/src/components/kanban/kanbanCard.tsx` — 添加 props、Redux selectors、导出菜单项
- `webapp/src/components/kanban/kanban.tsx` — 传递 `activeView` 给 KanbanCard
- `webapp/src/components/kanban/kanbanCard.test.tsx` — 更新快照
- `webapp/i18n/en.json` — 添加 `KanbanCard.export-markdown` 翻译

### Definition of Done
- [ ] 在 Kanban 看板视图中，卡片的 `...` 菜单能看到 "Export to Markdown"
- [ ] 点击后下载 `.md` 文件，文件名为 `{boardTitle}-{cardTitle}.md`
- [ ] Markdown 内容包含：看板标题、卡片标题、卡片可见属性、卡片评论
- [ ] 所有登录用户都能使用此功能（不受 readonly 限制）
- [ ] `cd webapp && npm run check` 通过（ESLint + Stylelint）
- [ ] `cd webapp && npm run test` 通过（含新增测试和更新后的快照）
- [ ] `make webapp` 构建成功

### Must Have
- 导出菜单项在 CardActionsMenu 中通过 children 插槽添加
- 复用 MarkdownExporter 的 escapeMarkdown、formatPropertyValue、formatComments、formatComment 私有方法
- KanbanCard 通过 useAppSelector 获取 commentsByCard 和 usersById（与 KanbanColumnHeader 相同）
- 导出文件名格式：`{boardTitle}-{cardTitle}.md`（使用 Utils.sanitizeFilename）
- 导出内容包含卡片的可见属性（基于 activeView.fields.visiblePropertyIds）
- 导出内容包含卡片评论（文本、作者用户名、时间）
- 新增 exportCardMarkdown 的单元测试
- 更新 kanbanCard.test.tsx 快照

### Must NOT Have (Guardrails)
- ❌ 不新增后端 API（纯前端导出）
- ❌ 不修改 CardActionsMenu 组件本身（只通过 children 传入菜单项）
- ❌ 不修改 KanbanColumnHeader 的现有导出功能
- ❌ 不修改 markdownExporter.ts 的现有 exportColumnMarkdown 方法（只新增方法）
- ❌ 不影响其他视图（Gallery/Table/Calendar）的 CardActionsMenu 使用
- ❌ 不使用 `as any` 类型断言
- ❌ 不添加多余的 JSDoc 注释（遵循现有代码风格）
- ❌ 不在 readonly 模式下隐藏导出按钮（readonly 用户也应能导出）
- ❌ 不创建通用 Exporter 基类或过度抽象

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (jest + @swc/jest transformer)
- **Automated tests**: YES (Tests-after) — 新增 exportCardMarkdown 测试，更新 kanbanCard 快照
- **Framework**: jest (via `cd webapp && npm run test`)
- **If TDD**: N/A — tests after implementation

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Unit tests**: Use Bash (npx jest) — 运行特定测试文件验证
- **Code quality**: Use Bash (npm run check) — ESLint + Stylelint
- **Build**: Use Bash (make webapp) — Webpack build success
- **UI QA**: Use Playwright (webapp-testing skill) — 导航到 Kanban 视图，点击卡片菜单，验证导出

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - foundation):
├── Task 1: Add exportCardMarkdown method to MarkdownExporter + tests [quick]
└── Task 2: Add i18n translation string [quick]

Wave 2 (After Wave 1 - component wiring):
└── Task 3: Wire export menu into KanbanCard + pass activeView from Kanban + update snapshots [quick]

Wave FINAL (After ALL tasks — 3 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
└── Task F3: Real manual QA (unspecified-high + webapp-testing)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | - | 3 |
| 2 | - | 3 |
| 3 | 1, 2 | F1, F2, F3 |

### Agent Dispatch Summary

- **Wave 1**: **2** tasks - T1 → `quick`, T2 → `quick`
- **Wave 2**: **1** task - T3 → `quick`
- **FINAL**: **3** tasks - F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`

---

## TODOs

- [x] 1. Add `exportCardMarkdown` Method to MarkdownExporter + Unit Tests

  **What to do**:
  - 修改 `webapp/src/markdownExporter.ts`，新增 `exportCardMarkdown` 公开静态方法和 `generateCardMarkdown` 私有静态方法
  - `exportCardMarkdown` 签名：`(board: Board, activeView: BoardView, card: Card, commentsByCard: {[cardId: string]: CommentBlock[]}, usersById: {[userId: string]: IUser}, intl: IntlShape): void`
  - 复用现有的 `escapeMarkdown`、`formatPropertyValue`、`formatComments`、`formatComment` 私有方法
  - 文件名格式：`{boardTitle}-{cardTitle}.md`（使用 `Utils.sanitizeFilename`）
  - 下载逻辑复用 `exportColumnMarkdown` 的模式：`Blob` → `URL.createObjectURL` → `<a>.click()` → `URL.revokeObjectURL`
  - `generateCardMarkdown` 输出格式（与列导出的单卡部分一致，去掉列头部）：
    ```markdown
    # {boardIcon} {boardTitle}

    ## {cardIcon} {cardTitle}

    **Properties:**
    - {propertyName1}: {propertyValue1}
    - {propertyName2}: {propertyValue2}

    **Comments:**
    - *{username} - {date}*: {commentText}

    ---
    *Exported from Focalboard on {date}*
    ```
  - 修改 `webapp/src/markdownExporter.test.ts`，新增 `exportCardMarkdown` 测试用例：
    - 测试1：导出带属性和评论的单卡（验证标题、属性、评论都存在）
    - 测试2：导出无评论的卡片（验证不包含 Comments 部分）
    - 测试3：导出无属性的卡片（验证不包含 Properties 部分）

  **Must NOT do**:
  - 不修改现有的 `exportColumnMarkdown` 方法及其签名
  - 不修改现有的 `generateMarkdown` 私有方法
  - 不将私有方法改为公开（保持 private static）
  - 不使用 `as any` 类型断言

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单文件修改 + 测试，逻辑清晰，参考现有 exportColumnMarkdown 模式
  - **Skills**: []
    - 无需特殊技能，纯 TypeScript 代码编写

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):

  **Pattern References** (existing code to follow):
  - `webapp/src/markdownExporter.ts:14-39` — `exportColumnMarkdown()` 方法完整实现，新方法 `exportCardMarkdown` 应严格参考此模式的下载逻辑（Blob → URL → <a> → click → revoke）
  - `webapp/src/markdownExporter.ts:41-94` — `generateMarkdown()` 私有方法，新方法 `generateCardMarkdown` 应参考此方法的卡片渲染逻辑（L64-88），去掉外层的列头部和 forEach 循环
  - `webapp/src/markdownExporter.ts:96-98` — `escapeMarkdown()` 私有方法，直接复用
  - `webapp/src/markdownExporter.ts:100-118` — `formatPropertyValue()` 私有方法，直接复用
  - `webapp/src/markdownExporter.ts:120-145` — `formatComments()` 和 `formatComment()` 私有方法，直接复用

  **API/Type References**:
  - `webapp/src/blocks/board.ts:150-153` — `BoardGroup` 类型（参考，但新方法不使用 BoardGroup，改用单个 Card）
  - `webapp/src/blocks/card.ts:13-15` — `Card` 类型定义
  - `webapp/src/blocks/commentBlock.ts:5-7` — `CommentBlock` 类型定义
  - `webapp/src/blocks/boardView.ts` — `BoardView` 类型，需访问 `activeView.fields.visiblePropertyIds`

  **Test References**:
  - `webapp/src/markdownExporter.test.ts:101-170` — 现有 `exportColumnMarkdown` 的 3 个测试用例，新测试应参考其 mock 设置（Blob mock、URL mock、document.createElement mock）和数据构造方式（makeBoard、makeView、makeCard、makeComment、makeUser 辅助函数）

  **WHY Each Reference Matters**:
  - `exportColumnMarkdown` 是最直接的参考模板，新方法应与之保持一致的代码风格和下载模式
  - `generateMarkdown` 的 L64-88 是单卡片渲染的核心逻辑，新方法 `generateCardMarkdown` 应提取这部分逻辑
  - 现有测试的 mock 设置可直接复用，只需调整测试数据为单个 Card 而非 BoardGroup

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: exportCardMarkdown generates correct markdown for card with properties and comments
    Tool: Bash (npx jest)
    Preconditions: markdownExporter.ts 和 markdownExporter.test.ts 已修改
    Steps:
      1. cd webapp && npx jest markdownExporter.test.ts --verbose
      2. 检查测试输出包含 exportCardMarkdown 测试用例
    Expected Result: 所有测试通过，包括新增的 3 个 exportCardMarkdown 测试用例
    Failure Indicators: 测试失败或 exportCardMarkdown 测试未执行
    Evidence: .sisyphus/evidence/task-1-exporter-test-output.txt

  Scenario: exportCardMarkdown does not modify existing exportColumnMarkdown
    Tool: Bash (npx jest)
    Preconditions: markdownExporter.ts 已修改
    Steps:
      1. cd webapp && npx jest markdownExporter.test.ts --verbose
      2. 检查 exportColumnMarkdown 的 3 个现有测试仍然通过
    Expected Result: 现有测试全部通过，无回归
    Failure Indicators: 现有测试失败
    Evidence: .sisyphus/evidence/task-1-no-regression.txt
  ```

  **Commit**: YES
  - Message: `feat(export): add exportCardMarkdown method to MarkdownExporter`
  - Files: `webapp/src/markdownExporter.ts`, `webapp/src/markdownExporter.test.ts`
  - Pre-commit: `cd webapp && npx jest markdownExporter.test.ts`

---

- [x] 2. Add i18n Translation String

  **What to do**:
  - 在 `webapp/i18n/en.json` 中添加新的翻译键
  - 键名：`KanbanCard.export-markdown`
  - 默认值：`Export to Markdown`
  - 运行 `cd webapp && npm run i18n-extract` 确保翻译被正确提取
  - 注意：已存在 `KanbanColumnHeader.export-markdown` 键（L189），新键是 `KanbanCard.export-markdown`，两者独立

  **Must NOT do**:
  - 不修改现有的翻译键（包括 `KanbanColumnHeader.export-markdown`）
  - 不添加非英语翻译（其他语言由翻译流程处理）
  - 不创建新的 i18n 配置文件

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单行 JSON 修改，极简任务
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `webapp/i18n/en.json:189` — 现有 `KanbanColumnHeader.export-markdown` 键，参考其格式添加新键
  - `webapp/i18n/en.json` 中的 `CardActionsMenu.*` 键（如 `CardActionsMenu.delete`、`CardActionsMenu.duplicate`、`CardActionsMenu.copyLink`）— 参考卡片菜单相关键的命名模式

  **WHY Each Reference Matters**:
  - 参考现有 `KanbanColumnHeader.export-markdown` 确保新键命名一致（`ComponentName.action-name`）
  - 参考现有 `CardActionsMenu.*` 键确认卡片菜单的 i18n 命名空间

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: i18n string exists and is extractable
    Tool: Bash (grep + npm run i18n-extract)
    Preconditions: en.json 已修改
    Steps:
      1. grep "KanbanCard.export-markdown" webapp/i18n/en.json
      2. 检查输出包含 "Export to Markdown"
      3. cd webapp && npm run i18n-extract
      4. 检查无新增 missing key 警告
    Expected Result: 键值对存在且 i18n-extract 无报错
    Failure Indicators: 未找到键或 i18n-extract 报告 missing key
    Evidence: .sisyphus/evidence/task-2-i18n-check.txt
  ```

  **Commit**: YES
  - Message: `feat(i18n): add KanbanCard export-markdown translation`
  - Files: `webapp/i18n/en.json`
  - Pre-commit: none

---

- [x] 3. Wire Export Menu into KanbanCard + Pass activeView + Update Snapshots

  **What to do**:
  - 修改 `webapp/src/components/kanban/kanbanCard.tsx`：
    1. 新增 import：`MarkdownExporter`、`BoardView`、`CommentBlock`、`IUser`、`useAppSelector`、`CompassIcon`、`Menu`
    2. 在 `Props` 类型中新增 `activeView: BoardView` 属性
    3. 在组件内部顶层（不在回调中）添加 Redux selectors：
       ```typescript
       const commentsByCard = useAppSelector((state) => state.comments?.commentsByCard || {})
       const usersById = useAppSelector((state) => state.users?.boardUsers || {})
       ```
    4. 添加 `onExportMarkdown` 回调函数（useCallback）：
       ```typescript
       const onExportMarkdown = useCallback(() => {
           try {
               MarkdownExporter.exportCardMarkdown(board, props.activeView, card, commentsByCard, usersById, intl)
               sendFlashMessage({content: intl.formatMessage({id: 'ViewHeader.export-complete', defaultMessage: 'Export complete!'}), severity: 'normal'})
           } catch (e) {
               Utils.logError(`ExportMarkdown ERROR: ${e}`)
               sendFlashMessage({content: intl.formatMessage({id: 'ViewHeader.export-failed', defaultMessage: 'Export failed!'}), severity: 'high'})
           }
       }, [board, props.activeView, card, commentsByCard, usersById, intl])
       ```
    5. 在 `CardActionsMenu` 的 children 中添加导出菜单项：
       ```tsx
       <CardActionsMenu
           cardId={card!.id}
           boardId={card!.boardId}
           onClickDelete={handleDeleteButtonOnClick}
           onClickDuplicate={() => {...}}
       >
           <Menu.Text
               id='exportMarkdown'
               name={intl.formatMessage({id: 'KanbanCard.export-markdown', defaultMessage: 'Export to Markdown'})}
               icon={<CompassIcon icon='export-variant'/>}
               onClick={onExportMarkdown}
           />
       </CardActionsMenu>
       ```

  - 修改 `webapp/src/components/kanban/kanban.tsx`：
    - 在渲染 `<KanbanCard>` 处，添加 `activeView={activeView}` prop（L291-303 区域）

  - 更新 `webapp/src/components/kanban/kanbanCard.test.tsx`：
    - 更新现有快照（因为 children 改变了渲染输出）
    - 在测试 props 中添加 `activeView` mock 数据
    - 运行 `cd webapp && npx jest kanbanCard.test.tsx --updateSnapshot` 更新快照
    - 验证更新后的快照包含 "Export to Markdown" 文本

  **Must NOT do**:
  - 不修改 `CardActionsMenu` 组件本身（`cardActionsMenu.tsx`）— 只通过 children 传入
  - 不修改 `kanbanColumnHeader.tsx` 的现有导出功能
  - 不修改 `markdownExporter.ts`（Task 1 已完成）
  - 不在其他视图（Gallery/Table/Calendar）中添加导出功能
  - 不在 readonly 模式下隐藏导出菜单项
  - 不使用 `as any` 类型断言
  - 不在回调函数或循环中调用 `useAppSelector`（React Hooks 规则）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 3 个文件修改，参考现有模式（KanbanColumnHeader 的 Redux selector 和 cardDialog 的 children 模式）
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Wave 1)
  - **Blocks**: F1, F2, F3
  - **Blocked By**: Task 1 (需要 exportCardMarkdown 方法), Task 2 (需要 i18n key)

  **References** (CRITICAL):

  **Pattern References** (existing code to follow):
  - `webapp/src/components/kanban/kanbanColumnHeader.tsx:58-59` — Redux selector 模式：`useAppSelector((state) => state.comments?.commentsByCard || {})` 和 `useAppSelector((state) => state.users?.boardUsers || {})`，KanbanCard 应完全复用此模式
  - `webapp/src/components/kanban/kanbanColumnHeader.tsx:97-111` — `onExportMarkdown` 回调函数模式（try/catch + sendFlashMessage），KanbanCard 应参考此模式
  - `webapp/src/components/kanban/kanbanColumnHeader.tsx:188-193` — Menu.Text 菜单项模式（id + name + icon + onClick），KanbanCard 的导出项应参考此模式
  - `webapp/src/components/cardDialog.tsx` — 唯一已使用 CardActionsMenu `children` prop 的组件，参考其 children 传入模式

  **API/Type References**:
  - `webapp/src/components/cardActionsMenu/cardActionsMenu.tsx:20-26` — CardActionsMenu 的 Props 类型，包含 `children?: ReactNode`
  - `webapp/src/components/cardActionsMenu/cardActionsMenu.tsx:80` — `{props.children}` 渲染位置（在 Menu 末尾，Copy link 之后）
  - `webapp/src/components/kanban/kanbanCard.tsx:23-34` — KanbanCard 现有 Props 类型，需在此添加 `activeView: BoardView`
  - `webapp/src/components/kanban/kanbanCard.tsx:93-121` — 现有 CardActionsMenu 使用方式，需在闭合标签前添加 children
  - `webapp/src/components/kanban/kanban.tsx:290-303` — KanbanCard 渲染处，需添加 `activeView={activeView}` prop
  - `webapp/src/store/hooks.ts` — `useAppSelector` hook 导入路径
  - `webapp/src/blocks/boardView.ts` — `BoardView` 类型导入路径
  - `webapp/src/blocks/commentBlock.ts` — `CommentBlock` 类型导入路径
  - `webapp/src/user.ts` — `IUser` 类型导入路径
  - `webapp/src/widgets/icons/compassIcon.tsx` — `CompassIcon` 导入路径（默认导出）
  - `webapp/src/widgets/menu/menu.tsx` — `Menu` 组件导入路径（用于 Menu.Text）
  - `webapp/src/components/flashMessages.ts` — `sendFlashMessage` 导入路径

  **Test References**:
  - `webapp/src/components/kanban/kanbanCard.test.tsx` — 现有测试文件（4 个测试含快照），需更新快照并在 mock props 中添加 activeView
  - `webapp/src/components/kanban/__snapshots__/kanbanCard.test.tsx.snap` — 现有快照文件，更新后应包含 "Export to Markdown"

  **WHY Each Reference Matters**:
  - `kanbanColumnHeader.tsx:58-59` 是获取评论和用户数据的标准模式，KanbanCard 必须完全复用
  - `cardDialog.tsx` 是唯一已使用 children 的参考，确认 children 机制可行
  - `kanbanCard.tsx:23-34` 的 Props 类型是修改目标，需添加 activeView
  - `kanban.tsx:290-303` 是 KanbanCard 的渲染处，必须传递 activeView prop
  - 快照测试更新是必须的，否则测试会因 children 变更而失败

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Export menu item visible in card context menu
    Tool: Playwright (webapp-testing skill)
    Preconditions: Focalboard server running at localhost:8000, user logged in, Kanban board with cards
    Steps:
      1. Navigate to http://localhost:8000
      2. Click on a board with Kanban view
      3. Find a card on the board
      4. Click the '...' (OptionsIcon) button on the card
      5. Check menu items in the opened CardActionsMenu
    Expected Result: "Export to Markdown" appears in the menu after "Copy link"
    Failure Indicators: Menu not visible or export item missing
    Evidence: .sisyphus/evidence/task-3-card-menu-visible.png

  Scenario: Export downloads single card markdown file
    Tool: Playwright (webapp-testing skill)
    Preconditions: Kanban board with a card that has properties and comments
    Steps:
      1. Click card's '...' menu
      2. Click "Export to Markdown"
      3. Wait for download
      4. Read downloaded .md file
    Expected Result: .md file downloaded with filename `{boardTitle}-{cardTitle}.md`
    Failure Indicators: No download triggered or wrong filename
    Evidence: .sisyphus/evidence/task-3-card-download.md

  Scenario: Markdown content includes single card data only
    Tool: Playwright + Bash
    Preconditions: Kanban board with multiple cards in the same column
    Steps:
      1. Export card A (not card B) via card menu
      2. Read the downloaded .md file
      3. Search for card A's title — should be present
      4. Search for card B's title — should NOT be present
    Expected Result: Only card A's data in the exported file, not card B
    Failure Indicators: Card B's title found in the file (exported entire column instead of single card)
    Evidence: .sisyphus/evidence/task-3-single-card-only.txt

  Scenario: Card with no comments exports without comments section
    Tool: Playwright + Bash
    Preconditions: Card exists with properties but zero comments
    Steps:
      1. Export the card via card menu
      2. Read .md file
      3. Check for "Comments:" section
    Expected Result: Properties present, no "Comments:" section
    Failure Indicators: Error or empty comments section present
    Evidence: .sisyphus/evidence/task-3-no-comments.md

  Scenario: Export works in readonly mode
    Tool: Playwright
    Preconditions: Board in readonly mode (or user with ViewBoard permission only)
    Steps:
      1. Navigate to readonly board
      2. Click card's '...' menu
      3. Verify "Export to Markdown" is visible
      4. Click it
    Expected Result: Export works in readonly mode
    Failure Indicators: Menu item hidden or click does nothing in readonly
    Evidence: .sisyphus/evidence/task-3-readonly-export.png

  Scenario: Updated snapshots pass
    Tool: Bash (npx jest)
    Preconditions: kanbanCard.test.tsx 已修改，快照已更新
    Steps:
      1. cd webapp && npx jest kanbanCard.test.tsx --verbose
    Expected Result: 所有测试通过，包括更新后的快照
    Failure Indicators: 快照不匹配或测试失败
    Evidence: .sisyphus/evidence/task-3-snapshot-test.txt
  ```

  **Commit**: YES
  - Message: `feat(kanban): add export to markdown in card menu`
  - Files: `webapp/src/components/kanban/kanbanCard.tsx`, `webapp/src/components/kanban/kanban.tsx`, `webapp/src/components/kanban/kanbanCard.test.tsx`
  - Pre-commit: `cd webapp && npm run check && npx jest kanbanCard.test.tsx`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 3 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
>
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `cd webapp && npm run check` (ESLint + Stylelint). Run `cd webapp && npm run test` (jest). Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `webapp-testing` skill)
  Start Focalboard server (`./bin/focalboard-server`). Open browser to http://localhost:8000. Navigate to a Kanban board. Click a card's `...` menu. Verify "Export to Markdown" appears. Click it. Verify `.md` file downloads. Open the file and verify: board title, card title, properties, comments all present. Test with card that has no comments. Test readonly mode.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

---

## Commit Strategy

- **1**: `feat(export): add exportCardMarkdown method to MarkdownExporter` - `webapp/src/markdownExporter.ts`, `webapp/src/markdownExporter.test.ts`
- **2**: `feat(i18n): add KanbanCard export-markdown translation` - `webapp/i18n/en.json`
- **3**: `feat(kanban): add export to markdown in card menu` - `webapp/src/components/kanban/kanbanCard.tsx`, `webapp/src/components/kanban/kanban.tsx`, `webapp/src/components/kanban/kanbanCard.test.tsx`

---

## Success Criteria

### Verification Commands
```bash
cd webapp && npm run check          # Expected: 0 errors, 0 warnings
cd webapp && npm run test           # Expected: all tests pass (including new + updated snapshots)
make webapp                         # Expected: build success
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass (including updated kanbanCard snapshots)
- [ ] ESLint + Stylelint pass
- [ ] Webpack build success
