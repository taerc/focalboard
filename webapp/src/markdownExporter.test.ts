// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {createIntl} from 'react-intl'

import {Board, BoardGroup, createBoard} from './blocks/board'
import {BoardView, createBoardView} from './blocks/boardView'
import {Card, createCard} from './blocks/card'
import {CommentBlock, createCommentBlock} from './blocks/commentBlock'
import {IUser} from './user'
import {MarkdownExporter} from './markdownExporter'

const intl = createIntl({locale: 'en-us'})

const Internals = MarkdownExporter as unknown as {
    escapeMarkdown: (text: string) => string
}

let capturedMarkdown: string
const originalBlob = global.Blob

function makeBoard(): Board {
    const board = createBoard()
    board.id = 'board-1'
    board.title = 'Project Board'
    board.icon = '📊'
    board.cardProperties = [
        {id: 'prop-status', name: 'Status', type: 'text', options: []},
        {id: 'prop-priority', name: 'Priority', type: 'text', options: []},
    ]
    return board
}

function makeView(board: Board): BoardView {
    const view = createBoardView()
    view.boardId = board.id
    view.fields.visiblePropertyIds = ['prop-status', 'prop-priority']
    return view
}

function makeCard(id: string, title: string, properties: Record<string, string | string[]>): Card {
    const card = createCard()
    card.id = id
    card.title = title
    card.fields.icon = 'i'
    card.fields.properties = properties
    return card
}

function makeComment(id: string, text: string, author: string, createAt: number): CommentBlock {
    const comment = createCommentBlock()
    comment.id = id
    comment.title = text
    comment.modifiedBy = author
    comment.createAt = createAt
    return comment
}

function makeUser(id: string, username: string): IUser {
    return {
        id,
        username,
        email: '',
        nickname: '',
        firstname: '',
        lastname: '',
        props: {},
        create_at: Date.now(),
        update_at: Date.now(),
        is_bot: false,
        is_guest: false,
        roles: '',
    }
}

beforeEach(() => {
    capturedMarkdown = ''

    URL.createObjectURL = jest.fn(() => 'mock-blob-url')
    URL.revokeObjectURL = jest.fn()

    global.Blob = jest.fn((parts: BlobPart[]) => {
        capturedMarkdown = parts.map((p) => String(p)).join('')
        return {size: 0, type: 'text/markdown;charset=utf-8'} as Blob
    }) as unknown as typeof Blob

    const mockAnchor = {
        style: {},
        setAttribute: jest.fn(),
        click: jest.fn(),
    }
    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLAnchorElement)
    jest.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => node)
    jest.spyOn(document.body, 'removeChild').mockImplementation((node: Node) => node)
})

afterEach(() => {
    global.Blob = originalBlob
    jest.restoreAllMocks()
})

describe('MarkdownExporter', () => {
    describe('exportColumnMarkdown', () => {
        test('should export multiple cards with properties and comments', () => {
            const board = makeBoard()
            const view = makeView(board)
            const card1 = makeCard('card-1', 'Task A', {'prop-status': 'Todo', 'prop-priority': 'High'})
            const card2 = makeCard('card-2', 'Task B', {'prop-status': 'Todo', 'prop-priority': 'Low'})
            const comment1 = makeComment('cmt-1', 'Looks good', 'user-1', 1705312800000)
            const group: BoardGroup = {
                option: {id: 'opt-todo', value: 'To Do', color: 'propColorBlue'},
                cards: [card1, card2],
            }
            const commentsByCard: {[cardId: string]: CommentBlock[]} = {
                'card-1': [comment1],
            }
            const usersById: {[userId: string]: IUser} = {
                'user-1': makeUser('user-1', 'alice'),
            }

            MarkdownExporter.exportColumnMarkdown(board, view, group, undefined, commentsByCard, usersById, intl)

            expect(capturedMarkdown).toContain('# 📊 Project Board')
            expect(capturedMarkdown).toContain('> **Column**: To Do | **Cards**: 2')
            expect(capturedMarkdown).toContain('## i Task A')
            expect(capturedMarkdown).toContain('## i Task B')
            expect(capturedMarkdown).toContain('**Properties:**')
            expect(capturedMarkdown).toContain('- Status: Todo')
            expect(capturedMarkdown).toContain('- Priority: High')
            expect(capturedMarkdown).toContain('- Priority: Low')
            expect(capturedMarkdown).toContain('**Comments:**')
            const expectedDate = new Date(1705312800000).toLocaleDateString()
            expect(capturedMarkdown).toContain(`- *alice - ${expectedDate}*: Looks good`)
            expect(capturedMarkdown).toContain('*Exported from Focalboard on')
        })

        test('should handle empty column with no cards', () => {
            const board = makeBoard()
            const view = makeView(board)
            const group: BoardGroup = {
                option: {id: 'opt-done', value: 'Done', color: 'propColorGreen'},
                cards: [],
            }

            MarkdownExporter.exportColumnMarkdown(board, view, group, undefined, {}, {}, intl)

            expect(capturedMarkdown).toContain('# 📊 Project Board')
            expect(capturedMarkdown).toContain('> **Column**: Done | **Cards**: 0')
            expect(capturedMarkdown).toContain('*Exported from Focalboard on')
            expect(capturedMarkdown).not.toContain('## ')
            expect(capturedMarkdown).not.toContain('**Properties:**')
            expect(capturedMarkdown).not.toContain('**Comments:**')
        })

        test('should not include comments section when card has no comments', () => {
            const board = makeBoard()
            const view = makeView(board)
            const card1 = makeCard('card-1', 'Task A', {'prop-status': 'Todo', 'prop-priority': 'High'})
            const group: BoardGroup = {
                option: {id: 'opt-todo', value: 'To Do', color: 'propColorBlue'},
                cards: [card1],
            }

            MarkdownExporter.exportColumnMarkdown(board, view, group, undefined, {}, {}, intl)

            expect(capturedMarkdown).toContain('## i Task A')
            expect(capturedMarkdown).toContain('**Properties:**')
            expect(capturedMarkdown).toContain('- Status: Todo')
            expect(capturedMarkdown).not.toContain('**Comments:**')
        })
    })

    describe('exportCardMarkdown', () => {
        test('should export single card with properties and comments', () => {
            const board = makeBoard()
            const view = makeView(board)
            const card = makeCard('card-1', 'Task A', {'prop-status': 'Todo', 'prop-priority': 'High'})
            const comment1 = makeComment('cmt-1', 'Looks good', 'user-1', 1705312800000)
            const commentsByCard: {[cardId: string]: CommentBlock[]} = {
                'card-1': [comment1],
            }
            const usersById: {[userId: string]: IUser} = {
                'user-1': makeUser('user-1', 'alice'),
            }

            MarkdownExporter.exportCardMarkdown(board, view, card, commentsByCard, usersById, intl)

            expect(capturedMarkdown).toContain('# 📊 Project Board')
            expect(capturedMarkdown).toContain('## i Task A')
            expect(capturedMarkdown).toContain('**Properties:**')
            expect(capturedMarkdown).toContain('- Status: Todo')
            expect(capturedMarkdown).toContain('- Priority: High')
            expect(capturedMarkdown).toContain('**Comments:**')
            const expectedDate = new Date(1705312800000).toLocaleDateString()
            expect(capturedMarkdown).toContain(`- *alice - ${expectedDate}*: Looks good`)
            expect(capturedMarkdown).toContain('*Exported from Focalboard on')
            // Should NOT contain column header
            expect(capturedMarkdown).not.toContain('> **Column**:')
        })

        test('should not include comments section when card has no comments', () => {
            const board = makeBoard()
            const view = makeView(board)
            const card = makeCard('card-1', 'Task A', {'prop-status': 'Todo', 'prop-priority': 'High'})

            MarkdownExporter.exportCardMarkdown(board, view, card, {}, {}, intl)

            expect(capturedMarkdown).toContain('## i Task A')
            expect(capturedMarkdown).toContain('**Properties:**')
            expect(capturedMarkdown).toContain('- Status: Todo')
            expect(capturedMarkdown).not.toContain('**Comments:**')
        })

        test('should not include properties section when no visible properties', () => {
            const board = makeBoard()
            const view = makeView(board)
            view.fields.visiblePropertyIds = []
            const card = makeCard('card-1', 'Task A', {'prop-status': 'Todo', 'prop-priority': 'High'})

            MarkdownExporter.exportCardMarkdown(board, view, card, {}, {}, intl)

            expect(capturedMarkdown).toContain('## i Task A')
            expect(capturedMarkdown).not.toContain('**Properties:**')
            expect(capturedMarkdown).not.toContain('- Status:')
        })
    })

    describe('escapeMarkdown', () => {
        test('should escape special markdown characters', () => {
            expect(Internals.escapeMarkdown('*bold*')).toBe('\\*bold\\*')
            expect(Internals.escapeMarkdown('_italic_')).toBe('\\_italic\\_')
            expect(Internals.escapeMarkdown('#heading')).toBe('\\#heading')
            expect(Internals.escapeMarkdown('[link](url)')).toBe('\\[link\\]\\(url\\)')
            expect(Internals.escapeMarkdown('a|b')).toBe('a\\|b')
            expect(Internals.escapeMarkdown('back`tick')).toBe('back\\`tick')
            expect(Internals.escapeMarkdown('a+b-c.d!e{f}g')).toBe('a\\+b\\-c\\.d\\!e\\{f\\}g')
            expect(Internals.escapeMarkdown('back\\slash')).toBe('back\\\\slash')
        })

        test('should leave plain text unchanged', () => {
            expect(Internals.escapeMarkdown('hello world')).toBe('hello world')
            expect(Internals.escapeMarkdown('Task 123')).toBe('Task 123')
        })
    })
})
