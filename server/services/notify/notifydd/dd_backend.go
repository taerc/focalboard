// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package notifydd

import (
	"fmt"
	"hash/fnv"
	"os"
	"sync"
	"time"

	"github.com/mattermost/focalboard/server/services/notify"
	"github.com/mattermost/focalboard/server/services/store"

	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

const (
	backendName   = "notifyDD"
	dedupInterval = 5 * time.Minute
)

type Backend struct {
	logger   mlog.LoggerIFace
	level    mlog.Level
	store    store.Store
	robot    Robot
	msgQueue map[uint64]time.Time
	mu       sync.Mutex
}

func New(logger mlog.LoggerIFace, level mlog.Level, store store.Store) *Backend {
	robot := Robot{
		AccessToken: os.Getenv("MM_BOARDS_DINGTALK_ACCESS_TOKEN"),
		Secret:      os.Getenv("MM_BOARDS_DINGTALK_SECRET"),
	}
	return &Backend{
		logger:   logger,
		level:    level,
		store:    store,
		robot:    robot,
		msgQueue: make(map[uint64]time.Time),
	}
}

// shouldSend 检查消息是否应该发送。
// 5 分钟内相同的消息只发送一次，超过 5 分钟的记录自动清理。
func (b *Backend) shouldSend(msg string) bool {
	b.mu.Lock()
	defer b.mu.Unlock()

	now := time.Now()
	// 清理超过 5 分钟的记录
	for key, ts := range b.msgQueue {
		if now.Sub(ts) >= dedupInterval {
			delete(b.msgQueue, key)
		}
	}

	// 使用消息哈希作为 key，避免存储完整消息内容
	h := fnv.New64a()
	h.Write([]byte(msg))
	key := h.Sum64()

	if _, exists := b.msgQueue[key]; exists {
		return false
	}

	b.msgQueue[key] = now
	return true
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

	// 推送到钉钉机器人（5 分钟内相同的消息不重复推送）
	if b.robot.AccessToken != "" && b.shouldSend(msg) {
		webhook := b.robot.Signature()
		payload := b.robot.SendText(msg, nil, nil, false)
		SendRequest(webhook, payload)
	}

	return nil
}

func (b *Backend) Name() string {
	return backendName
}
