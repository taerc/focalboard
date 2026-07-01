# Learnings — Kanban Column Markdown Export

## Task 1: markdownExporter.ts + markdownExporter.test.ts

### Implementation Patterns
- **Export download pattern**: Follows `csvExporter.ts` — `document.createElement('a')` + `link.click()` + Blob. Added cleanup (`URL.revokeObjectURL` + `removeChild`) which csvExporter lacks.
- **Property exportValue**: `propsRegistry.get(template.type).exportValue()` wraps values in double quotes and replaces `#` with `___hash_sign___` (CSV-specific encoding from `properties/types.tsx`). For markdown, strip quotes via `.replace(/^"|"$/g, '')` and restore `#` via `.replace(/___hash_sign___/g, '#')` before calling `escapeMarkdown()`.
- **createdBy/updatedBy**: Same as csvExporter — check `property.type === 'createdBy'` and use `card.createdBy`/`card.modifiedBy` before calling `exportValue()`.
- **CommentBlock fields**: Text is in `.title`, author in `.modifiedBy`, timestamp in `.createAt`.

### Test Patterns
- **Browser API mocking**: jsdom doesn't have `URL.createObjectURL`/`revokeObjectURL` — assign `jest.fn()` directly. Mock `global.Blob` to capture content synchronously: `global.Blob = jest.fn((parts) => { captured = parts.join(''); return mockBlob })`.
- **DOM element mocking**: `jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLAnchorElement)` — needed to avoid jsdom navigation on `link.click()`.
- **Private method testing**: Access via `as unknown as { escapeMarkdown: (text) => string }` — not `as any`, so compliant with the no-`as any` rule.
- **createIntl**: `createIntl({locale: 'en-us'})` from `react-intl` — standalone, no provider needed.
- **Date assertions**: Use `new Date(timestamp).toLocaleDateString()` in both impl and test to avoid locale-specific hardcoding.
- **Card icon**: `createCard()` defaults `fields.icon` to `''`. Set it explicitly in test mocks (TestBlockFactory uses `'i'`).

### Lint Gotchas
- **no-useless-escape**: Inside regex character classes, `[` doesn't need escaping — only `]` and `-` (in non-edge positions) and `\` do. Correct: `/([|\\`*_{}[\]()#+\-.!])/g`
- **comma-dangle**: Project enforces trailing commas in multi-line parameter lists. `eslint --fix` handles this.
- **lines-around-comment**: Requires blank line before standalone comments. Auto-fixed by eslint.
- **Unused `window` declaration**: Only declare `declare let window: IAppWindow` if actually using `window` (csvExporter uses `window.openInNewBrowser`; markdownExporter doesn't).
- **Unused imports**: Remove `IPropertyTemplate` from test imports if not directly referenced.

### File Structure
- `webapp/src/markdownExporter.ts` — 148 lines, class with 1 public + 5 private static methods
- `webapp/src/markdownExporter.test.ts` — 5 tests across 2 describe blocks, all passing
- Tests: `npx jest src/markdownExporter.test.ts --verbose --coverage=false` — 5/5 pass
- Lint: `npx eslint --ext .ts src/markdownExporter.ts src/markdownExporter.test.ts` — clean
