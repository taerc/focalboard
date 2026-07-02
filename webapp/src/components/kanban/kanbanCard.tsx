// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState, useCallback, useMemo} from 'react'
import {useIntl} from 'react-intl'

import {Board, IPropertyTemplate} from '../../blocks/board'
import {BoardView} from '../../blocks/boardView'
import {Card} from '../../blocks/card'
import {useSortable} from '../../hooks/sortable'
import {MarkdownExporter} from '../../markdownExporter'
import mutator from '../../mutator'
import {useAppSelector} from '../../store/hooks'
import TelemetryClient, {TelemetryActions, TelemetryCategory} from '../../telemetry/telemetryClient'
import {Utils} from '../../utils'
import CompassIcon from '../../widgets/icons/compassIcon'
import Menu from '../../widgets/menu'
import MenuWrapper from '../../widgets/menuWrapper'
import Tooltip from '../../widgets/tooltip'
import ConfirmationDialogBox, {ConfirmationDialogBoxProps} from '../confirmationDialogBox'
import {sendFlashMessage} from '../flashMessages'
import PropertyValueElement from '../propertyValueElement'
import './kanbanCard.scss'
import CardBadges from '../cardBadges'
import CardActionsMenu from '../cardActionsMenu/cardActionsMenu'
import CardActionsMenuIcon from '../cardActionsMenu/cardActionsMenuIcon'

export const OnboardingCardClassName = 'onboardingCard'

type Props = {
    card: Card
    board: Board
    activeView: BoardView
    visiblePropertyTemplates: IPropertyTemplate[]
    isSelected: boolean
    visibleBadges: boolean
    onClick?: (e: React.MouseEvent, card: Card) => void
    readonly: boolean
    onDrop: (srcCard: Card, dstCard: Card) => void
    showCard: (cardId?: string) => void
    isManualSort: boolean
}

const KanbanCard = (props: Props) => {
    const {card, board} = props
    const intl = useIntl()
    const commentsByCard = useAppSelector((state) => state.comments?.commentsByCard || {})
    const usersById = useAppSelector((state) => state.users?.boardUsers || {})
    const [isDragging, isOver, cardRef] = useSortable('card', card, !props.readonly, props.onDrop)
    const visiblePropertyTemplates = props.visiblePropertyTemplates || []
    let className = props.isSelected ? 'KanbanCard selected' : 'KanbanCard'
    if (props.isManualSort && isOver) {
        className += ' dragover'
    }

    const [showConfirmationDialogBox, setShowConfirmationDialogBox] = useState<boolean>(false)
    const handleDeleteCard = useCallback(() => {
        if (!card) {
            Utils.assertFailure()
            return
        }
        TelemetryClient.trackEvent(TelemetryCategory, TelemetryActions.DeleteCard, {board: board.id, card: card.id})
        mutator.deleteBlock(card, 'delete card')
    }, [card, board.id])

    const confirmDialogProps: ConfirmationDialogBoxProps = useMemo(() => {
        return {
            heading: intl.formatMessage({id: 'CardDialog.delete-confirmation-dialog-heading', defaultMessage: 'Confirm card delete!'}),
            confirmButtonText: intl.formatMessage({id: 'CardDialog.delete-confirmation-dialog-button-text', defaultMessage: 'Delete'}),
            onConfirm: handleDeleteCard,
            onClose: () => {
                setShowConfirmationDialogBox(false)
            },
        }
    }, [handleDeleteCard])

    const handleDeleteButtonOnClick = useCallback(() => {
        // user trying to delete a card with blank name
        // but content present cannot be deleted without
        // confirmation dialog
        if (card?.title === '' && card?.fields?.contentOrder?.length === 0) {
            handleDeleteCard()
            return
        }
        setShowConfirmationDialogBox(true)
    }, [handleDeleteCard, card.title, card?.fields?.contentOrder?.length])

    const handleOnClick = useCallback((e: React.MouseEvent) => {
        if (props.onClick) {
            props.onClick(e, card)
        }
    }, [props.onClick, card])

    const onExportMarkdown = useCallback(() => {
        try {
            MarkdownExporter.exportCardMarkdown(board, props.activeView, card, commentsByCard, usersById, intl)
            sendFlashMessage({
                content: intl.formatMessage({id: 'ViewHeader.export-complete', defaultMessage: 'Export complete!'}),
                severity: 'normal',
            })
        } catch (e) {
            Utils.logError(`ExportMarkdown ERROR: ${e}`)
            sendFlashMessage({
                content: intl.formatMessage({id: 'ViewHeader.export-failed', defaultMessage: 'Export failed!'}),
                severity: 'high',
            })
        }
    }, [board, props.activeView, card, commentsByCard, usersById, intl])

    return (
        <>
            <div
                ref={props.readonly ? () => null : cardRef}
                className={`${className}`}
                draggable={!props.readonly}
                style={{opacity: isDragging ? 0.5 : 1}}
                onClick={handleOnClick}
            >
                {!props.readonly &&
                <MenuWrapper
                    className={'optionsMenu'}
                    stopPropagationOnToggle={true}
                >
                    <CardActionsMenuIcon/>
                    <CardActionsMenu
                        cardId={card!.id}
                        boardId={card!.boardId}
                        onClickDelete={handleDeleteButtonOnClick}
                        onClickDuplicate={() => {
                            TelemetryClient.trackEvent(TelemetryCategory, TelemetryActions.DuplicateCard, {board: board.id, card: card.id})
                            mutator.duplicateCard(
                                card.id,
                                board.id,
                                false,
                                'duplicate card',
                                false,
                                {},
                                async (newCardId) => {
                                    props.showCard(newCardId)
                                },
                                async () => {
                                    props.showCard(undefined)
                                },
                            )
                        }}
                    >
                        <Menu.Text
                            id='exportMarkdown'
                            name={intl.formatMessage({id: 'KanbanCard.export-markdown', defaultMessage: 'Export to Markdown'})}
                            icon={<CompassIcon icon='export-variant'/>}
                            onClick={onExportMarkdown}
                        />
                    </CardActionsMenu>
                </MenuWrapper>
                }

                <div className='octo-icontitle'>
                    { card.fields.icon ? <div className='octo-icon'>{card.fields.icon}</div> : undefined }
                    <div
                        key='__title'
                        className='octo-titletext'
                    >
                        {card.title || intl.formatMessage({id: 'KanbanCard.untitled', defaultMessage: 'Untitled'})}
                    </div>
                </div>
                {visiblePropertyTemplates.map((template) => (
                    <Tooltip
                        key={template.id}
                        title={template.name}
                    >
                        <PropertyValueElement
                            board={board}
                            readOnly={true}
                            card={card}
                            propertyTemplate={template}
                            showEmptyPlaceholder={false}
                        />
                    </Tooltip>
                ))}
                {props.visibleBadges && <CardBadges card={card}/>}
            </div>

            {showConfirmationDialogBox && <ConfirmationDialogBox dialogBox={confirmDialogProps}/>}

        </>
    )
}

export default React.memo(KanbanCard)
