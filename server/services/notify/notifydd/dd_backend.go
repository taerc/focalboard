// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package notifydd

import (
	"fmt"
	"os"

	"github.com/mattermost/focalboard/server/services/notify"
	"github.com/mattermost/focalboard/server/services/store"

	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

const (
	backendName = "notifyDD"
)

type Backend struct {
	logger mlog.LoggerIFace
	level  mlog.Level
	store  store.Store
	robot  Robot
}

func New(logger mlog.LoggerIFace, level mlog.Level, store store.Store) *Backend {
	robot := Robot{
		AccessToken: os.Getenv("MM_BOARDS_DINGTALK_ACCESS_TOKEN"),
		Secret:      os.Getenv("MM_BOARDS_DINGTALK_SECRET"),
	}
	return &Backend{
		logger: logger,
		level:  level,
		store:  store,
		robot:  robot,
	}
}

func (b *Backend) Start() error {
	return nil
}

func (b *Backend) ShutDown() error {
	_ = b.logger.Flush()
	return nil
}

func (b *Backend) BlockChanged(evt notify.BlockChangeEvent) error {
	var board string
	var card string
	var userID string
	var who string

	if evt.Card == nil || len(evt.Card.Title) < 3 {
		return nil
	}

	if evt.Board != nil {
		board = evt.Board.Title
	}
	if evt.Card != nil {
		card = evt.Card.Title
	}
	if evt.ModifiedBy != nil {
		userID = evt.ModifiedBy.UserID
		if user, err := b.store.GetUserByID(userID); err == nil && user != nil {
			who = user.Username
		} else {
			who = userID
		}
	}

	actionVerb := "操作"
	switch evt.Action {
	case notify.Add:
		actionVerb = "新增"
	case notify.Update:
		actionVerb = "更新"
	case notify.Delete:
		actionVerb = "删除"
	}

	msg := fmt.Sprintf("%s 在 %s %s %s", who, board, actionVerb, card)
	b.logger.Log(b.level, msg)

	// 推送到钉钉机器人
	if b.robot.AccessToken != "" {
		webhook := b.robot.Signature()
		payload := b.robot.SendText(msg, nil, nil, false)
		SendRequest(webhook, payload)
	}

	return nil
}

func (b *Backend) Name() string {
	return backendName
}
