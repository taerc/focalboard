// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {IntlShape} from 'react-intl'

import {Board, BoardGroup, IPropertyTemplate} from './blocks/board'
import {BoardView} from './blocks/boardView'
import {Card} from './blocks/card'
import {CommentBlock} from './blocks/commentBlock'
import {IUser} from './user'
import {Utils} from './utils'
import propsRegistry from './properties'

class MarkdownExporter {
    static exportColumnMarkdown(
        board: Board,
        activeView: BoardView,
        group: BoardGroup,
        groupByProperty: IPropertyTemplate | undefined,
        commentsByCard: {[cardId: string]: CommentBlock[]},
        usersById: {[userId: string]: IUser},
        intl: IntlShape,
    ): void {
        const markdown = MarkdownExporter.generateMarkdown(board, activeView, group, commentsByCard, usersById, intl)

        const blob = new Blob([markdown], {type: 'text/markdown;charset=utf-8'})
        const url = URL.createObjectURL(blob)

        const filename = `${Utils.sanitizeFilename(`${board.title}-${group.option.value}`)}.md`
        const link = document.createElement('a')
        link.style.display = 'none'
        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        document.body.appendChild(link)

        link.click()

        URL.revokeObjectURL(url)
        document.body.removeChild(link)
    }

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

    private static generateMarkdown(
        board: Board,
        activeView: BoardView,
        group: BoardGroup,
        commentsByCard: {[cardId: string]: CommentBlock[]},
        usersById: {[userId: string]: IUser},
        intl: IntlShape,
    ): string {
        const lines: string[] = []
        const boardIcon = board.icon || ''
        const boardTitle = MarkdownExporter.escapeMarkdown(board.title || 'Untitled')

        lines.push(`# ${boardIcon} ${boardTitle}`)
        lines.push('')
        lines.push(`> **Column**: ${MarkdownExporter.escapeMarkdown(group.option.value)} | **Cards**: ${group.cards.length}`)
        lines.push('')
        lines.push('---')
        lines.push('')

        const visibleProperties = board.cardProperties.filter((template: IPropertyTemplate) =>
            activeView.fields.visiblePropertyIds.includes(template.id),
        )

        group.cards.forEach((card: Card) => {
            const cardIcon = card.fields.icon || ''
            const cardTitle = MarkdownExporter.escapeMarkdown(card.title || 'Untitled')
            lines.push(`## ${cardIcon} ${cardTitle}`)
            lines.push('')

            if (visibleProperties.length > 0) {
                lines.push('**Properties:**')
                visibleProperties.forEach((template: IPropertyTemplate) => {
                    const propertyName = MarkdownExporter.escapeMarkdown(template.name)
                    const propertyValue = MarkdownExporter.formatPropertyValue(card.fields.properties[template.id], template, card, intl)
                    lines.push(`- ${propertyName}: ${propertyValue}`)
                })
                lines.push('')
            }

            const commentsSection = MarkdownExporter.formatComments(card.id, commentsByCard, usersById)
            if (commentsSection) {
                lines.push(commentsSection)
                lines.push('')
            }

            lines.push('---')
            lines.push('')
        })

        const exportDate = new Date().toLocaleDateString()
        lines.push(`*Exported from Focalboard on ${exportDate}*`)

        return lines.join('\n')
    }

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

        lines.push(`# ${boardIcon} ${boardTitle}`)
        lines.push('')

        const cardIcon = card.fields.icon || ''
        const cardTitle = MarkdownExporter.escapeMarkdown(card.title || 'Untitled')
        lines.push(`## ${cardIcon} ${cardTitle}`)
        lines.push('')

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

        const commentsSection = MarkdownExporter.formatComments(card.id, commentsByCard, usersById)
        if (commentsSection) {
            lines.push(commentsSection)
            lines.push('')
        }

        const exportDate = new Date().toLocaleDateString()
        lines.push('---')
        lines.push(`*Exported from Focalboard on ${exportDate}*`)

        return lines.join('\n')
    }

    private static escapeMarkdown(text: string): string {
        return text.replace(/([|\\`*_{}[\]()#+\-.!])/g, '\\$1')
    }

    private static formatPropertyValue(
        value: string | string[] | undefined,
        template: IPropertyTemplate,
        card: Card,
        intl: IntlShape,
    ): string {
        let propertyValue = value
        const property = propsRegistry.get(template.type)
        if (property.type === 'createdBy') {
            propertyValue = card.createdBy
        }
        if (property.type === 'updatedBy') {
            propertyValue = card.modifiedBy
        }
        const exported = property.exportValue(propertyValue, card, template, intl)

        // exportValue wraps in quotes and encodes # as hashSignToken; strip for markdown
        return MarkdownExporter.escapeMarkdown(exported.replace(/^"|"$/g, '').replace(/___hash_sign___/g, '#'))
    }

    private static formatComments(
        cardId: string,
        commentsByCard: {[cardId: string]: CommentBlock[]},
        usersById: {[userId: string]: IUser},
    ): string {
        const comments = commentsByCard[cardId]
        if (!comments || comments.length === 0) {
            return ''
        }

        const lines: string[] = ['**Comments:**']
        comments.forEach((comment: CommentBlock) => {
            const user = usersById[comment.modifiedBy]
            const username = user ? user.username : comment.modifiedBy
            lines.push(MarkdownExporter.formatComment(comment, username))
        })

        return lines.join('\n')
    }

    private static formatComment(comment: CommentBlock, username: string): string {
        const escapedUsername = MarkdownExporter.escapeMarkdown(username)
        const date = new Date(comment.createAt).toLocaleDateString()
        const text = MarkdownExporter.escapeMarkdown(comment.title || '')
        return `- *${escapedUsername} - ${date}*: ${text}`
    }
}

export {MarkdownExporter}
