// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package notifydd

import (
	"fmt"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/mattermost/focalboard/server/services/notify"
	"github.com/mattermost/focalboard/server/services/store"

	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

const (
	backendName   = "notifyDD"
	batchInterval = 5 * time.Minute
)

type entry struct {
	board  string
	card   string
	action string
}

type userBuffer struct {
	username string
	entries  []entry
	seen     map[string]bool
}

type Backend struct {
	logger      mlog.LoggerIFace
	level       mlog.Level
	store       store.Store
	robot       Robot
	buffers     map[string]*userBuffer
	flushTicker *time.Ticker
	done        chan struct{}
	mu          sync.Mutex
}

func New(logger mlog.LoggerIFace, level mlog.Level, store store.Store) *Backend {
	robot := Robot{
		AccessToken: os.Getenv("MM_BOARDS_DINGTALK_ACCESS_TOKEN"),
		Secret:      os.Getenv("MM_BOARDS_DINGTALK_SECRET"),
	}
	return &Backend{
		logger:  logger,
		level:   level,
		store:   store,
		robot:   robot,
		buffers: make(map[string]*userBuffer),
		done:    make(chan struct{}),
	}
}

func (b *Backend) Start() error {
	b.flushTicker = time.NewTicker(batchInterval)
	go func() {
		for {
			select {
			case <-b.flushTicker.C:
				b.flushAll()
			case <-b.done:
				return
			}
		}
	}()
	return nil
}

func (b *Backend) ShutDown() error {
	close(b.done)
	if b.flushTicker != nil {
		b.flushTicker.Stop()
	}
	b.flushAll()
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

	actionVerb := "编辑"
	switch evt.Action {
	case notify.Add:
		actionVerb = "编辑"
	case notify.Update:
		actionVerb = "编辑"
	case notify.Delete:
		actionVerb = "删除"
	}

	b.logger.Log(b.level, fmt.Sprintf("%s 在 %s %s %s", who, board, actionVerb, card))
	b.addToBuffer(userID, who, board, card, actionVerb)

	return nil
}

// addToBuffer 将一条操作记录加入用户的缓冲区。
// 相同的 看板+card+操作 组合只记录一次。
func (b *Backend) addToBuffer(userID, username, board, card, action string) {
	b.mu.Lock()
	defer b.mu.Unlock()

	buf, ok := b.buffers[userID]
	if !ok {
		buf = &userBuffer{
			seen: make(map[string]bool),
		}
		b.buffers[userID] = buf
	}
	buf.username = username

	key := board + "|" + card + "|" + action
	if buf.seen[key] {
		return
	}
	buf.seen[key] = true
	buf.entries = append(buf.entries, entry{
		board:  board,
		card:   card,
		action: action,
	})
}

// flushAll 将所有用户缓冲区中的条目聚合成消息发送到钉钉，然后清空缓冲区。
func (b *Backend) flushAll() {
	b.mu.Lock()
	defer b.mu.Unlock()

	if b.robot.AccessToken == "" {
		// 机器人未配置，清空缓冲区
		b.buffers = make(map[string]*userBuffer)
		return
	}

	for userID, buf := range b.buffers {
		if len(buf.entries) == 0 {
			continue
		}

		// 构建聚合消息
		msg := fmt.Sprintf("%s 刚编辑了看板:\n", buf.username)
		for i, e := range buf.entries {
			msg += fmt.Sprintf("%d %s了 %s 的 %s\n", i+1, e.action, e.board, e.card)
		}
		msg = strings.TrimRight(msg, "\n")

		webhook := b.robot.Signature()
		payload := b.robot.SendText(msg, nil, nil, false)
		SendRequest(webhook, payload)

		// 清空该用户的缓冲区
		buf.entries = nil
		buf.seen = make(map[string]bool)
		delete(b.buffers, userID)
	}
}

func (b *Backend) Name() string {
	return backendName
}
