# Kanban Column Markdown Export

## TL;DR

> **Quick Summary**: Add a "Export to Markdown" option in the KanbanColumnHeader's three-dot menu that exports all cards in the current column (including properties, property values, and comments) as a downloadable `.md` file.
>
> **Deliverables**:
> - New `markdownExporter.ts` module with column export logic
> - Modified `kanbanColumnHeader.tsx` with export menu item accessible to all logged-in users
> - i18n strings for the new menu item
>
> **Estimated Effort**: Quick
> **Parallel Execution**: NO - sequential (3 tasks, tightly coupled)
> **Critical Path**: Task 1 (exporter) → Task 2 (menu wiring) → Task 3 (i18n + build verification)

---

## Context

### Original Request
用户希望在 Kanban 看板视图的列头部（KanbanColumnHeader）的 `...` 菜单中添加一个 "Export to Markdown" 功能，导出当前列的所有卡片内容为 Markdown 格式，包含卡片的属性、属性值和评论。

### Interview Summary
**Key Discussions**:
- 入口位置：确认在 KanbanColumnHeader 的三点菜单
- 权限要求：所有登录用户都可导出（不限 ManageBoardProperties）
- 导出格式：Markdown (.md)
- 导出范围：按列导出，含卡片属性、属性值、评论
- 评论数据：CommentBlock (type='comment')，文本在 title 字段，作者在 modifiedBy，时间在 createAt

**Research Findings**:
- KanbanColumnHeader.tsx 现有菜单被 `BoardPermissionGate permissions={[Permission.ManageBoardProperties]}` 包裹，需调整结构使导出对所有用户可见
- `group.cards: Card[]` 直接可用，无需额外 API 请求
- 评论已在 Redux store 中预加载（`store/comments.ts` 的 `getCardComments(cardId)` selector）
- 用户名需通过 `store/users.ts` 的 `getUser(userId)` selector 解析
- 属性值导出复用 `propsRegistry.get(template.type).exportValue()` 模式（与 csvExporter.ts 一致）

### Metis Review
**Identified Gaps** (addressed):
- 评论加载架构：已确认 `loadBoardData` reducer 预加载所有评论块到 Redux store
- 权限门控：导出项需放在 `BoardPermissionGate` 外部，使用 `ViewBoard` 权限或无权限门控
- 下载模式：复用 csvExporter.ts 的 `document.createElement('a')` + blob 下载模式

---

## Work Objectives

### Core Objective
在 KanbanColumnHeader 三点菜单中添加 "Export to Markdown" 选项，允许所有登录用户导出当前列的卡片数据（含评论）为 Markdown 文件。

### Concrete Deliverables
- `webapp/src/markdownExporter.ts` — 新建的 Markdown 导出器
- `webapp/src/components/kanban/kanbanColumnHeader.tsx` — 修改，添加导出菜单项
- `webapp/i18n/en.json` — 添加 i18n 翻译字符串

### Definition of Done
- [ ] 在 Kanban 看板视图的任意列头部，hover 后点击 `...` 菜单能看到 "Export to Markdown"
- [ ] 点击后下载一个 `.md` 文件，文件名格式为 `{boardTitle}-{columnTitle}.md`
- [ ] Markdown 内容包含：看板标题、列标题、每张卡片的标题+属性+属性值+评论
- [ ] 所有登录用户（含 Viewer 角色）都能看到并使用此功能
- [ ] `cd webapp && npm run check` 通过（ESLint + Stylelint）
- [ ] `make webapp` 构建成功

### Must Have
- 导出菜单项对所有登录用户可见（不限 ManageBoardProperties 权限）
- 导出内容包含卡片的所有可见属性和属性值
- 导出内容包含每张卡片的评论（文本、作者用户名、时间）
- 下载文件为 `.md` 格式
- 遵循现有 csvExporter.ts 的代码模式

### Must NOT Have (Guardrails)
- ❌ 不新增后端 API（纯前端导出，与 CSV 导出一致）
- ❌ 不修改 csvExporter.ts 或 archiver.ts（新增独立导出器）
- ❌ 不添加 WebSocket 事件（导出是纯客户端操作）
- ❌ 不过度抽象（不创建通用 Exporter 基类）
- ❌ 不添加多余的 JSDoc 注释（遵循现有代码风格）
- ❌ 不修改 KanbanColumnHeader 的现有菜单项（Hide/Delete/Color）
- ❌ 不在 readonly 模式下隐藏导出按钮（readonly 用户也应能导出）

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (jest + @swc/jest transformer)
- **Automated tests**: YES (Tests-after) — 添加单元测试验证 Markdown 生成逻辑
- **Framework**: jest (via `npm run test` in webapp/)
- **If TDD**: N/A — tests after implementation

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) - Navigate to Kanban view, hover column header, click menu, verify download
- **Code quality**: Use Bash (npm run check) - ESLint + Stylelint
- **Build**: Use Bash (make webapp) - Webpack build success

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Create markdownExporter.ts [quick]
└── Task 2: Add i18n strings [quick]

Wave 2 (After Wave 1):
└── Task 3: Wire export menu into KanbanColumnHeader [quick]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
└── Task F3: Real manual QA (unspecified-high)
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

- [x] 1. Create Markdown Exporter Module

  **What to do**:
  - 创建 `webapp/src/markdownExporter.ts`，实现 `MarkdownExporter` 类
  - 实现 `exportColumnMarkdown()` 静态方法，接收 `board`, `activeView`, `group: BoardGroup`, `groupByProperty`, `commentsByCard: {[cardId: string]: CommentBlock[]}`, `usersById: {[userId: string]: IUser}`, `intl` 参数
  - 实现私有方法 `generateMarkdown()` 生成 Markdown 字符串
  - 实现私有方法 `escapeMarkdown()` 转义特殊字符
  - 实现私有方法 `formatComment()` 格式化评论为 Markdown
  - 实现私有方法 `formatProperty()` 格式化属值为 Markdown
  - 使用 `Blob` + `document.createElement('a')` 下载文件（参考 csvExporter.ts）
  - 文件名格式：`{boardTitle}-{columnOptionValue}.md`，使用 `Utils.sanitizeFilename()`
  - 创建 `webapp/src/markdownExporter.test.ts`，测试 Markdown 生成逻辑

  **Markdown 输出格式**:
  ```markdown
  # {boardIcon} {boardTitle}

  > **Column**: {columnOptionValue} | **Cards**: {count}

  ---

  ## {cardIcon} {cardTitle}

  **Properties:**
  - {propertyName1}: {propertyValue1}
  - {propertyName2}: {propertyValue2}

  **Comments:**
  - *{username} - {date}*: {commentText}
  - *{username} - {date}*: {commentText}

  ---

  ## {cardIcon} {cardTitle}
  ...

  ---
  *Exported from Focalboard on {date}*
  ```

  **Must NOT do**:
  - 不创建通用 Exporter 基类
  - 不添加后端 API 调用
  - 不使用 `as any` 类型断言
  - 不添加多余的 JSDoc（遵循 csvExporter.ts 的注释风格）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单文件创建，逻辑清晰，参考 csvExporter.ts 模式
  - **Skills**: []
    - 无需特殊技能，纯 TypeScript 代码编写

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):

  **Pattern References** (existing code to follow):
  - `webapp/src/csvExporter.ts` — CSV 导出器的完整实现模式，新导出器应严格参考此文件的代码结构：类定义、静态方法、私有方法、下载逻辑
  - `webapp/src/csvExporter.ts:16-49` — `exportTableCsv()` 方法的下载逻辑（`document.createElement('a')` + `link.click()`），新导出器复用此模式
  - `webapp/src/csvExporter.ts:55-95` — `generateTableArray()` 的属性值导出逻辑，使用 `propsRegistry.get(template.type).exportValue()`，新导出器复用此模式
  - `webapp/src/archiver.ts:21-47` — `exportArchive()` 的 blob 下载逻辑（`URL.createObjectURL`），作为备选下载模式参考

  **API/Type References** (contracts to implement against):
  - `webapp/src/blocks/board.ts:150-153` — `BoardGroup` 类型定义：`{option: IPropertyOption, cards: Card[]}`
  - `webapp/src/blocks/board.ts:95-100` — `IPropertyTemplate` 类型定义（属性模板）
  - `webapp/src/blocks/board.ts:88-92` — `IPropertyOption` 类型定义（属性选项，含 value/color）
  - `webapp/src/blocks/card.ts:13-15` — `Card` 类型定义（extends Block）
  - `webapp/src/blocks/commentBlock.ts:5-7` — `CommentBlock` 类型定义（Block & {type: 'comment'}）
  - `webapp/src/blocks/block.ts:26-44` — `Block` 接口定义（id, title, fields, createdBy, modifiedBy, createAt 等）
  - `webapp/src/properties/types.tsx:54-62` — `PropertyType.exportValue()` 方法签名，用于导出属性值

  **Test References** (testing patterns to follow):
  - `webapp/src/components/kanban/kanbanColumnHeader.test.tsx` — KanbanColumnHeader 的测试文件，参考其测试结构
  - `webapp/src/csvExporter.ts` — 无独立测试文件，但可参考其纯函数风格编写可测试代码

  **External References**:
  - 无外部依赖，纯前端实现

  **WHY Each Reference Matters**:
  - `csvExporter.ts` 是最直接的参考模板，新导出器应与之保持一致的代码风格和下载模式
  - `BoardGroup` 类型定义了输入数据的结构，导出器需要处理 `group.option`（列信息）和 `group.cards`（卡片列表）
  - `CommentBlock` 的评论文本在 `title` 字段（不是 `fields`），作者在 `modifiedBy`，时间在 `createAt` — 这是关键的数据结构理解
  - `propsRegistry.get(template.type).exportValue()` 是导出属性值的标准方法，必须复用以保持一致性

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Markdown exporter generates correct output
    Tool: Bash (node/jest)
    Preconditions: markdownExporter.ts 和 markdownExporter.test.ts 已创建
    Steps:
      1. cd webapp && npx jest markdownExporter.test.ts --verbose
      2. 检查测试输出
    Expected Result: 所有测试通过，测试覆盖：空列、有卡片无评论、有卡片有评论、多属性
    Failure Indicators: 测试失败或未覆盖评论导出
    Evidence: .sisyphus/evidence/task-1-markdown-exporter-test.txt

  Scenario: Markdown content structure verification
    Tool: Bash (node REPL)
    Preconditions: markdownExporter.ts 已创建
    Steps:
      1. cd webapp && node -e "const {MarkdownExporter} = require('./src/markdownExporter'); console.log(MarkdownExporter.generateMarkdown(...))"
      2. 检查输出包含：# 标题、## 卡片标题、Properties 列表、Comments 列表
    Expected Result: 输出包含所有必需的 Markdown 结构元素
    Failure Indicators: 缺少评论部分或属性部分
    Evidence: .sisyphus/evidence/task-1-markdown-structure.txt
  ```

  **Commit**: YES
  - Message: `feat(export): add Markdown exporter module`
  - Files: `webapp/src/markdownExporter.ts`, `webapp/src/markdownExporter.test.ts`
  - Pre-commit: `cd webapp && npx jest markdownExporter.test.ts`

---

- [x] 2. Add i18n Translation String

  **What to do**:
  - 在 `webapp/i18n/en.json` 中添加新的翻译键
  - 键名：`KanbanColumnHeader.export-markdown`
  - 默认值：`Export to Markdown`
  - 运行 `cd webapp && npm run i18n-extract` 确保翻译被正确提取

  **Must NOT do**:
  - 不修改现有的翻译键
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
  - `webapp/i18n/en.json` — 现有翻译文件，参考已有键的格式（如 `ViewHeader.export-csv`, `ViewHeader.export-board-archive`）

  **API/Type References**:
  - 无

  **WHY Each Reference Matters**:
  - 参考现有翻译键的命名模式（`ComponentName.action-name`）确保一致性

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: i18n string exists
    Tool: Bash (grep)
    Preconditions: en.json 已修改
    Steps:
      1. grep "KanbanColumnHeader.export-markdown" webapp/i18n/en.json
      2. 检查输出包含 "Export to Markdown"
    Expected Result: 找到键值对
    Failure Indicators: 未找到或值不正确
    Evidence: .sisyphus/evidence/task-2-i18n-check.txt
  ```

  **Commit**: YES
  - Message: `feat(i18n): add export markdown translation string`
  - Files: `webapp/i18n/en.json`
  - Pre-commit: none

---

- [ ] 3. Wire Export Menu into KanbanColumnHeader

  **What to do**:
  - 修改 `webapp/src/components/kanban/kanbanColumnHeader.tsx`
  - 在现有 `BoardPermissionGate` 外部添加一个新的 `MenuWrapper` + `IconButton`（用于导出），或者在现有 Menu 中添加导出项但放在 Gate 外部
  - **推荐方案**：重构现有菜单结构，将导出项放在 `BoardPermissionGate` 外部
  - 具体：在 `{!props.readonly &&` 块之前，添加一个新的导出按钮+菜单（独立于现有 ManageBoardProperties 菜单）
  - 或者：将导出项添加到现有 Menu 内部，但将整个 MenuWrapper 移到 BoardPermissionGate 外部（这样 Hide/Delete/Color 仍然需要权限，但 Export 不需要）— 但这会改变现有菜单的权限行为
  - **最终推荐**：添加独立的导出 MenuWrapper，放在现有 `BoardPermissionGate` 之前

  **代码结构**:
  ```tsx
  // 在 <div className='octo-spacer'/> 之后，{!props.readonly && 之前
  <MenuWrapper>
      <IconButton icon={<OptionsIcon/>}/>
      <Menu>
          <Menu.Text
              id='exportMarkdown'
              name={intl.formatMessage({id: 'KanbanColumnHeader.export-markdown', defaultMessage: 'Export to Markdown'})}
              icon={<CompassIcon icon='file-document-outline'/>}
              onClick={() => onExportMarkdown(board, activeView, group, groupByProperty, intl)}
          />
      </Menu>
  </MenuWrapper>
  ```

  **Wait** — 这样会有两个 `...` 按钮。更好的方案：

  **最终方案**：将导出项添加到现有 Menu 内部，但将现有 MenuWrapper 从 `BoardPermissionGate` 中移出。在 Menu 内部，Hide/Delete/Color 仍然用 `{canEditBoardProperties && ...}` 条件包裹（已有 `canEditBoardProperties` 变量在 L51），导出项无条件渲染。

  **具体修改**:
  1. 将 L163-193 的 `<BoardPermissionGate>` 包裹从 MenuWrapper 外部移除
  2. 在 Menu 内部，Hide 项前添加 Export 项（无条件）
  3. Hide/Delete/Color 项保持原有条件（`canEditBoardProperties` 已在 L51 计算）
  4. 这样：所有登录用户能看到菜单和导出项；只有有 ManageBoardProperties 权限的用户能看到 Hide/Delete/Color

  **数据获取**（注意 React Hooks 规则 — 不能在循环中调用 hooks）:
  - 评论：在组件顶层使用 `useAppSelector((state) => state.comments?.commentsByCard)` 获取整个 commentsByCard map，然后在导出时按 cardId 查找
  - 用户：在组件顶层使用 `useAppSelector((state) => state.users?.users)` 获取整个 users map，然后按 userId 查找
  - 收集数据后传递给 `MarkdownExporter.exportColumnMarkdown()`
  - **关键**：不要在 `group.cards.map()` 循环内调用 `useAppSelector`，这会违反 React Hooks 规则

  **Must NOT do**:
  - 不删除或修改现有的 Hide/Delete/Color 菜单项
  - 不改变 Hide/Delete/Color 的权限要求
  - 不添加后端 API 调用
  - 不在 readonly 模式下隐藏导出功能

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单文件修改，参考现有模式
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Wave 1)
  - **Blocks**: F1, F2, F3
  - **Blocked By**: Task 1, Task 2

  **References**:

  **Pattern References**:
  - `webapp/src/components/kanban/kanbanColumnHeader.tsx:161-193` — 现有菜单结构，导出项需插入此处
  - `webapp/src/components/viewHeader/viewHeaderActionsMenu.tsx:79-95` — `onExportCsvTrigger` 函数模式（try/catch + sendFlashMessage），导出触发函数参考此模式
  - `webapp/src/components/viewHeader/viewHeaderActionsMenu.tsx:106-110` — `Menu.Text` 菜单项模式，导出菜单项参考此模式

  **API/Type References**:
  - `webapp/src/store/comments.ts:83-87` — `getCardComments(cardId)` selector，返回 `CommentBlock[]`
  - `webapp/src/store/users.ts:132` — `getUser(userId)` selector，返回 `IUser|undefined`
  - `webapp/src/store/hooks.ts` — `useAppSelector` hook
  - `webapp/src/blocks/board.ts:150-153` — `BoardGroup` 类型
  - `webapp/src/hooks/permissions.tsx:51` — `canEditBoardProperties` 已在组件中计算

  **Test References**:
  - `webapp/src/components/kanban/kanbanColumnHeader.test.tsx` — 现有测试，修改后需确保不破坏

  **WHY Each Reference Matters**:
  - `kanbanColumnHeader.tsx:161-193` 是要修改的代码区域，必须理解现有菜单结构和权限门控
  - `viewHeaderActionsMenu.tsx` 提供了导出触发函数的标准模式（flash message + error handling）
  - `getCardComments` 和 `getUser` 是获取评论和用户数据的 Redux selector，必须在组件中使用 `useAppSelector` 调用

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Export menu item visible for all users
    Tool: Playwright (webapp-testing skill)
    Preconditions: Focalboard server running at localhost:8000, user logged in
    Steps:
      1. Navigate to http://localhost:8000
      2. Click on a board with Kanban view
      3. Hover over a column header (e.g., "Blocked")
      4. Click the '...' (OptionsIcon) button
      5. Check menu items
    Expected Result: "Export to Markdown" appears in the menu alongside "Hide" and "Delete"
    Failure Indicators: Menu not visible or export item missing
    Evidence: .sisyphus/evidence/task-3-menu-visible.png

  Scenario: Export downloads markdown file
    Tool: Playwright (webapp-testing skill)
    Preconditions: Kanban board with cards and comments
    Steps:
      1. Hover over column header
      2. Click '...' menu
      3. Click "Export to Markdown"
      4. Wait for download
      5. Read downloaded .md file
    Expected Result: .md file downloaded with filename `{boardTitle}-{columnTitle}.md`
    Failure Indicators: No download triggered or wrong filename
    Evidence: .sisyphus/evidence/task-3-download.md

  Scenario: Markdown content includes comments
    Tool: Playwright + Bash
    Preconditions: Card has at least one comment
    Steps:
      1. Export column to markdown
      2. Read the downloaded .md file
      3. Search for "Comments:" section
      4. Verify comment text, author username, and date are present
    Expected Result: Comments section present with text, author, date
    Failure Indicators: Missing comments section or missing author/date
    Evidence: .sisyphus/evidence/task-3-comments-verify.txt

  Scenario: Empty column export
    Tool: Playwright
    Preconditions: Column has no cards
    Steps:
      1. Hover over empty column header
      2. Click '...' → "Export to Markdown"
      3. Read downloaded file
    Expected Result: .md file with header but "No cards" message
    Failure Indicators: Error or crash on empty column
    Evidence: .sisyphus/evidence/task-3-empty-column.md

  Scenario: Card with no comments
    Tool: Playwright + Bash
    Preconditions: Card exists but has zero comments
    Steps:
      1. Export column
      2. Read .md file
      3. Check card section
    Expected Result: Card present with properties but no "Comments:" section (or "No comments")
    Failure Indicators: Error when accessing comments for card with none
    Evidence: .sisyphus/evidence/task-3-no-comments.md
  ```

  **Commit**: YES
  - Message: `feat(kanban): add export to markdown in column header menu`
  - Files: `webapp/src/components/kanban/kanbanColumnHeader.tsx`
  - Pre-commit: `cd webapp && npm run check`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 3 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `cd webapp && npm run check` (ESLint + Stylelint). Run `cd webapp && npm run test` (jest). Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `webapp-testing` skill)
  Start Focalboard server (`./bin/focalboard-server`). Open browser to http://localhost:8000. Navigate to a Kanban board. Hover over a column header. Click `...` menu. Verify "Export to Markdown" appears. Click it. Verify `.md` file downloads. Open the file and verify: board title, column title, card titles, properties, comments all present. Test with empty column. Test with card that has no comments.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

---

## Commit Strategy

- **1**: `feat(export): add Markdown exporter module` - `webapp/src/markdownExporter.ts`, `webapp/src/markdownExporter.test.ts`
- **2**: `feat(i18n): add export markdown translation string` - `webapp/i18n/en.json`
- **3**: `feat(kanban): add export to markdown in column header menu` - `webapp/src/components/kanban/kanbanColumnHeader.tsx`

---

## Success Criteria

### Verification Commands
```bash
cd webapp && npm run check          # Expected: 0 errors, 0 warnings
cd webapp && npm run test           # Expected: all tests pass
make webapp                         # Expected: build success
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] ESLint + Stylelint pass
- [ ] Webpack build success
