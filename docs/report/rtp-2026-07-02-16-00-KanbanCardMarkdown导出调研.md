# Kanban Card 单个卡片 Markdown 导出 — 技术调研与实现方案

> **调研时间**：2026-07-02  
> **调研方法**：代码库逆向分析（前端全链路）  
> **项目**：Focalboard（Mattermost 社区分支）  
> **调研目标**：梳理 Kanban Card 在 Kanban 视图中的渲染逻辑，分析如何复用 KanbanColumnHeader 的 Export to Markdown 逻辑，为单个卡片添加 Markdown 导出功能提供完整实现方案

---

## 1. 术语澄清

| 术语 | 说明 |
|------|------|
| **Kanban Column Header** | 看板视图中的列头部组件，含三点菜单，已有 "Export to Markdown" |
| **Kanban Card** | 看板视图中的单个卡片，含三点菜单（CardActionsMenu），目前有 Delete/Duplicate/Copy link |
| **CardActionsMenu** | 卡片三点菜单的菜单组件，位于 `components/cardActionsMenu/` |
| **BoardGroup** | 按属性分组后的卡片集合，包含 `option`（分组选项）和 `cards`（卡片数组） |
| **MarkdownExporter** | Markdown 导出器类，位于 `webapp/src/markdownExporter.ts`，已有 `exportColumnMarkdown` 方法 |

---

## 2. 组件树与数据流分析

### 2.1 页面组件层级

```
Kanban (kanban.tsx)
├── KanbanColumnHeader (kanbanColumnHeader.tsx)   ← 列头部，有 Export to Markdown
│   └── MenuWrapper > Menu
│       └── Menu.Text "Export to Markdown" → MarkdownExporter.exportColumnMarkdown()
│
└── KanbanColumn (kanbanColumn.tsx)               ← 列容器
    └── KanbanCard (kanbanCard.tsx)               ← 单个卡片
        └── MenuWrapper > CardActionsMenu         ← 卡片菜单（Delete/Duplicate/Copy link）
```

### 2.2 关键数据流

```
Kanban 组件持有:
  board: Board          — 看板数据（含 cardProperties 属性定义）
  activeView: BoardView — 当前视图（含 visiblePropertyIds 可见属性）
  cards: Card[]         — 所有卡片
  groupByProperty       — 分组属性

KanbanColumnHeader 获取:
  commentsByCard: 通过 Redux selector: state.comments.commentsByCard
  usersById:      通过 Redux selector: state.users.boardUsers

KanbanCard 获取:
  card: Card           — 单个卡片（通过 props）
  board: Board         — 看板（通过 props）
  visiblePropertyTemplates — 可见属性模板（通过 props）
  但 没有 activeView, commentsByCard, usersById
```

### 2.3 现有导出链路（KanbanColumnHeader → MarkdownExporter）

```
KanbanColumnHeader.onExportMarkdown()
  ↓
  MarkdownExporter.exportColumnMarkdown(board, activeView, group, groupByProperty, commentsByCard, usersById, intl)
    ↓
    generateMarkdown(board, activeView, group, commentsByCard, usersById, intl)
      ↓ 遍历 group.cards 每个 card
      ├── 输出卡片标题 + 图标 (## 层级)
      ├── 输出可见属性列表
      ├── 输出评论
      └── 输出分隔线
    ↓
    Blob → <a> download → .md file
```

---

## 3. 关键文件清单

| 文件 | 作用 | 状态 |
|------|------|------|
| `webapp/src/markdownExporter.ts` | Markdown 导出器类，已有 `exportColumnMarkdown` | **已有**，需新增 `exportCardMarkdown` |
| `webapp/src/markdownExporter.test.ts` | 单元测试，覆盖 `exportColumnMarkdown` | **已有**，需新增单卡测试 |
| `webapp/src/components/kanban/kanbanCard.tsx` | KanbanCard 组件，含 `CardActionsMenu` | **需修改**，添加 Export to Markdown |
| `webapp/src/components/kanban/kanbanCard.scss` | KanbanCard 样式 | **无需修改** |
| `webapp/src/components/kanban/kanbanColumnHeader.tsx` | 列头部，已有 Export to Markdown 调用 | **参考模板** |
| `webapp/src/components/kanban/kanban.tsx` | Kanban 视图主组件，组合所有子组件 | **需修改**，传递数据给 KanbanCard |
| `webapp/src/components/cardActionsMenu/cardActionsMenu.tsx` | 卡片菜单组件 | **已有** children 插槽，直接使用 |
| `webapp/src/components/cardActionsMenu/cardActionsMenuIcon.tsx` | 卡片菜单图标按钮 | **无需修改** |
| `webapp/i18n/en.json` | 国际化字符串 | **需修改**，添加新翻译 |

---

## 4. MarkdownExporter 现有代码分析

### 4.1 导出的方法签名

```typescript
// 现有：导出整列（多张卡片）
static exportColumnMarkdown(
    board: Board,
    activeView: BoardView,
    group: BoardGroup,           // 包含 group.option + group.cards[]
    groupByProperty: IPropertyTemplate | undefined,
    commentsByCard: {[cardId: string]: CommentBlock[]},
    usersById: {[userId: string]: IUser},
    intl: IntlShape,
): void
```

### 4.2 内部方法

| 方法 | 可见性 | 作用 |
|------|--------|------|
| `generateMarkdown(...)` | `private static` | 生成列级别的 Markdown 文本 |
| `escapeMarkdown(text)` | `private static` | 转义 Markdown 特殊字符 |
| `formatPropertyValue(value, template, card, intl)` | `private static` | 格式化属性值 |
| `formatComments(cardId, commentsByCard, usersById)` | `private static` | 格式化评论块 |
| `formatComment(comment, username)` | `private static` | 格式化单条评论 |

### 4.3 输出格式示例

```markdown
# 📊 Project Board

> **Column**: To Do | **Cards**: 2

---

## i Task A

**Properties:**
- Status: Todo
- Priority: High

**Comments:**
- *alice - 1/15/2024*: Looks good

---

## i Task B

**Properties:**
- Status: Todo
- Priority: Low

---

*Exported from Focalboard on 7/2/2026*
```

---

## 5. 实现方案

### 5.1 方案选择：纯前端，复用现有 MarkdownExporter

**推荐方案**：在 `MarkdownExporter` 中新增 `exportCardMarkdown` 方法，复用 `formatPropertyValue`、`formatComments`、`formatComment`、`escapeMarkdown` 等私有方法。

**理由**：
1. 已有 `MarkdownExporter` 类结构完整，只需新增方法
2. 所有格式化逻辑可完全复用
3. `CardActionsMenu` 已有 `children` 插槽，可直接传入额外的菜单项
4. 不新增后端 API，纯前端操作

### 5.2 涉及文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `webapp/src/markdownExporter.ts` | **修改** | 新增 `exportCardMarkdown` 方法和 `generateCardMarkdown` 方法 |
| `webapp/src/markdownExporter.test.ts` | **修改** | 新增单卡导出测试用例 |
| `webapp/src/components/kanban/kanbanCard.tsx` | **修改** | 在 CardActionsMenu 中添加 "Export to Markdown" 菜单项 |
| `webapp/src/components/kanban/kanban.tsx` | **可选修改** | 传递 `activeView`、`commentsByCard`、`usersById` 给 KanbanCard |
| `webapp/i18n/en.json` | **修改** | 添加 `KanbanCard.export-markdown` 翻译 |

### 5.3 实现步骤

#### 步骤 1：在 MarkdownExporter 中新增 `exportCardMarkdown` 方法

**文件**：`webapp/src/markdownExporter.ts`

```typescript
// 新增：导出单个卡片
static exportCardMarkdown(
    board: Board,
    activeView: BoardView,
    card: Card,
    commentsByCard: {[cardId: string]: CommentBlock[]},
    usersById: {[userId: string]: IUser},
    intl: IntlShape,
): void {
    const markdown = MarkdownExporter.generateCardMarkdown(board, activeView, card, commentsByCard, usersById, intl)

    const blob = new Blob([markdown], {type: 'text/markdown;charset=utf-8'})
    const url = URL.createObjectURL(blob)

    const filename = `${Utils.sanitizeFilename(`${board.title}-${card.title || 'Untitled'}`)}.md`
    const link = document.createElement('a')
    link.style.display = 'none'
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    document.body.appendChild(link)

    link.click()

    URL.revokeObjectURL(url)
    document.body.removeChild(link)
}

// 新增：生成单个卡片的 Markdown 内容
private static generateCardMarkdown(
    board: Board,
    activeView: BoardView,
    card: Card,
    commentsByCard: {[cardId: string]: CommentBlock[]},
    usersById: {[userId: string]: IUser},
    intl: IntlShape,
): string {
    const lines: string[] = []
    const boardIcon = board.icon || ''
    const boardTitle = MarkdownExporter.escapeMarkdown(board.title || 'Untitled')

    // 看板标题
    lines.push(`# ${boardIcon} ${boardTitle}`)
    lines.push('')

    // 卡片信息头
    const cardIcon = card.fields.icon || ''
    const cardTitle = MarkdownExporter.escapeMarkdown(card.title || 'Untitled')
    lines.push(`## ${cardIcon} ${cardTitle}`)
    lines.push('')

    // 可见属性 —— 复用 formatPropertyValue
    const visibleProperties = board.cardProperties.filter((template: IPropertyTemplate) =>
        activeView.fields.visiblePropertyIds.includes(template.id),
    )
    if (visibleProperties.length > 0) {
        lines.push('**Properties:**')
        visibleProperties.forEach((template: IPropertyTemplate) => {
            const propertyName = MarkdownExporter.escapeMarkdown(template.name)
            const propertyValue = MarkdownExporter.formatPropertyValue(card.fields.properties[template.id], template, card, intl)
            lines.push(`- ${propertyName}: ${propertyValue}`)
        })
        lines.push('')
    }

    // 评论 —— 复用 formatComments
    const commentsSection = MarkdownExporter.formatComments(card.id, commentsByCard, usersById)
    if (commentsSection) {
        lines.push(commentsSection)
        lines.push('')
    }

    // 导出信息
    const exportDate = new Date().toLocaleDateString()
    lines.push('---')
    lines.push(`*Exported from Focalboard on ${exportDate}*`)

    return lines.join('\n')
}
```

#### 步骤 2：修改 KanbanCard 添加 Export to Markdown 菜单项

**文件**：`webapp/src/components/kanban/kanbanCard.tsx`

需要为 KanbanCard 新增以下 props：
- `activeView: BoardView`
- `commentsByCard: {[cardId: string]: CommentBlock[]}`
- `usersById: {[userId: string]: IUser}`

然后在 `CardActionsMenu` 的 children 中传入导出菜单项：

```typescript
// 新增 imports
import {MarkdownExporter} from '../../markdownExporter'
import {BoardView} from '../../blocks/boardView'
import {CommentBlock} from '../../blocks/commentBlock'
import {IUser} from '../../user'
import {useAppSelector} from '../../store/hooks'
import CompassIcon from '../../widgets/icons/compassIcon'

// 新增 props
type Props = {
    card: Card
    board: Board
    activeView: BoardView                  // 新增
    visiblePropertyTemplates: IPropertyTemplate[]
    isSelected: boolean
    visibleBadges: boolean
    onClick?: (e: React.MouseEvent, card: Card) => void
    readonly: boolean
    onDrop: (srcCard: Card, dstCard: Card) => void
    showCard: (cardId?: string) => void
    isManualSort: boolean
}

// 在组件内部新增 Redux 选择器
const commentsByCard = useAppSelector((state) => state.comments?.commentsByCard || {})
const usersById = useAppSelector((state) => state.users?.boardUsers || {})

// 新增导出处理函数
const onExportMarkdown = useCallback(() => {
    MarkdownExporter.exportCardMarkdown(board, activeView, card, commentsByCard, usersById, intl)
}, [board, activeView, card, commentsByCard, usersById, intl])

// 在 CardActionsMenu 中添加 children
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

#### 步骤 3：修改 Kanban.tsx 传递 activeView 给 KanbanCard

**文件**：`webapp/src/components/kanban/kanban.tsx`

```typescript
// 在 KanbanCard 渲染处添加 activeView 属性
<KanbanCard
    card={card}
    board={board}
    activeView={activeView}  // 新增
    visiblePropertyTemplates={visiblePropertyTemplates}
    visibleBadges={visibleBadges}
    key={card.id}
    readonly={props.readonly}
    isSelected={props.selectedCardIds.includes(card.id)}
    onClick={props.onCardClicked}
    onDrop={onDropToCard}
    showCard={props.showCard}
    isManualSort={isManualSort}
/>
```

#### 步骤 4：添加 i18n 翻译

**文件**：`webapp/i18n/en.json`

```json
{
    "KanbanCard.export-markdown": "Export to Markdown"
}
```

然后运行 `npm run i18n-extract` 提取翻译。

### 5.4 导出 Markdown 示例输出（单卡）

```markdown
# 📊 Project Board

## i Task A

**Properties:**
- Status: Todo
- Priority: High

**Comments:**
- *alice - 1/15/2024*: Looks good

---
*Exported from Focalboard on 7/2/2026*
```

---

## 6. 复用分析：KanbanColumnHeader 导出逻辑的可复用点

### 6.1 可直接复用的方法

| MarkdownExporter 方法 | 复用方式 | 修改量 |
|----------------------|---------|--------|
| `escapeMarkdown(text)` | 直接复用（private static，在类内部调用） | 0 |
| `formatPropertyValue(value, template, card, intl)` | 直接复用（private static） | 0 |
| `formatComments(cardId, commentsByCard, usersById)` | 直接复用（private static） | 0 |
| `formatComment(comment, username)` | 直接复用（private static） | 0 |
| 下载逻辑（Blob → URL → <a> download） | 复制模式，调整文件名 | 文件名改为 `board-title-card-title.md` |

### 6.2 需要新写的方法

| 方法 | 说明 |
|------|------|
| `exportCardMarkdown(...)` | 公开入口，参数从 `BoardGroup` 简化为单个 `Card` |
| `generateCardMarkdown(...)` | 生成单卡 Markdown，去掉了列级别的头部（Column 信息）和遍历多卡片的循环 |

### 6.3 差异总结

| 对比维度 | KanbanColumnHeader 导出（整列） | KanbanCard 导出（单卡） |
|---------|-------------------------------|------------------------|
| 输入数据 | `BoardGroup`（含多张 cards） | 单个 `Card` |
| 文件名 | `board-title-column-name.md` | `board-title-card-title.md` |
| 内容范围 | 整个列的所有卡片 | 单张卡片 + 其评论 |
| Markdown 层级 | `# 看板标题` → Column 头 → `## 卡片` 循环 | `# 看板标题` → `## 卡片标题`（单次） |
| 评论 | 遍历所有卡片评论 | 只输出该卡片的评论 |
| 属性 | 可见属性（visiblePropertyIds） | 可见属性（visiblePropertyIds） |

---

## 7. 实施检查清单

- [ ] 修改 `webapp/src/markdownExporter.ts` — 新增 `exportCardMarkdown` + `generateCardMarkdown`
- [ ] 修改 `webapp/src/components/kanban/kanbanCard.tsx` — 添加 props、Redux selector、导出菜单项
- [ ] 修改 `webapp/src/components/kanban/kanban.tsx` — 传递 `activeView` 给 KanbanCard
- [ ] 添加 i18n 翻译字符串到 `webapp/i18n/en.json`
- [ ] 运行 `npm run i18n-extract` 提取翻译
- [ ] 运行 `npm run check` 检查 ESLint + Stylelint
- [ ] 运行 `npm run test` 运行单元测试（含 markdownExporter.test.ts）
- [ ] 构建测试：`make webapp`
- [ ] 手动测试：验证导出 Markdown 文件格式正确

---

## 8. 信息来源

| 来源 | 类型 | 说明 |
|------|------|------|
| `webapp/src/markdownExporter.ts` | 源码 | Markdown 导出器（核心复用对象） |
| `webapp/src/markdownExporter.test.ts` | 源码 | 已有列导出测试 |
| `webapp/src/components/kanban/kanbanColumnHeader.tsx` | 源码 | 列头部（已有导出入口，参考实现） |
| `webapp/src/components/kanban/kanbanCard.tsx` | 源码 | 卡片组件（需修改的目标） |
| `webapp/src/components/kanban/kanban.tsx` | 源码 | Kanban 视图主组件 |
| `webapp/src/components/kanban/kanbanColumn.tsx` | 源码 | 列容器 |
| `webapp/src/components/cardActionsMenu/cardActionsMenu.tsx` | 源码 | 卡片菜单组件（有 children 插槽） |
| `webapp/src/components/cardActionsMenu/cardActionsMenuIcon.tsx` | 源码 | 卡片菜单图标 |
| `webapp/src/blocks/card.ts` | 源码 | 卡片数据模型 |
| `webapp/src/blocks/board.ts` | 源码 | 看板数据模型（含 BoardGroup 类型） |
| `webapp/src/blocks/commentBlock.ts` | 源码 | 评论块数据模型 |
| `webapp/i18n/en.json` | 源码 | 国际化字符串 |
| `docs/report/rtp-2026-07-01-10-00-群组管理Markdown导出方案.md` | 研究报告 | 上一份 Markdown 导出调研报告 |

---

*本报告基于 Focalboard 代码库的直接分析，所有源码引用均来自项目本地仓库。*