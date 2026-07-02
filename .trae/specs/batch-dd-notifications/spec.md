# 钉钉通知消息聚合 Spec

## Why
当前钉钉通知后端在每次 BlockChangeEvent 时立即发送一条消息，导致短时间内大量重复/碎片化消息刷屏。需要将同一用户一段时间内的操作聚合为一条消息发送，减少消息发送次数，提升可读性。

## What Changes
- 移除现有的 `shouldSend` 逐条去重逻辑和 `msgQueue` 字段
- 新增按用户维度的消息缓冲区，缓存该用户在时间窗口内的操作条目
- 在缓冲区内按 `看板+card+操作` 三元组去重，相同组合只保留一条
- 新增后台定时器（5 分钟间隔），周期性将所有用户缓冲区中的条目聚合成一条消息发送到钉钉
- 聚合消息格式如下：
  ```
  XXX 正在编辑看板
  1 编辑了 看板A 的 card1
  2 删除了 看板A 的 card2
  3 编辑了 看板B 的 card3
  ```
- `ShutDown` 时刷新剩余缓冲区中的未发送消息

## Impact
- Affected code: `server/services/notify/notifydd/dd_backend.go`

## ADDED Requirements

### Requirement: 消息缓冲与聚合
系统 SHALL 将同一用户在 5 分钟时间窗口内产生的所有看板操作事件缓冲，到期后聚合为一条钉钉消息发送。

#### Scenario: 单用户多次操作同一 card
- **WHEN** 用户 A 在 5 分钟内对看板 X 的 card1 执行了 3 次"编辑"操作
- **THEN** 聚合消息中 card1 的"编辑"操作只出现一行

#### Scenario: 单用户对不同 card 的操作
- **WHEN** 用户 A 在 5 分钟内对看板 X 的 card1 编辑、card2 删除
- **THEN** 聚合消息包含两行，分别为"编辑了 X 的 card1"和"删除了 X 的 card2"

#### Scenario: 同一 card 的不同操作
- **WHEN** 用户 A 在 5 分钟内对看板 X 的 card1 先编辑后删除
- **THEN** 聚合消息包含两行，分别为"编辑了 X 的 card1"和"删除了 X 的 card2"

#### Scenario: 多用户并行操作
- **WHEN** 用户 A 和用户 B 各自操作不同看板
- **THEN** 每个用户分别生成独立的聚合消息

#### Scenario: 缓冲区为空
- **WHEN** 定时器触发时某用户缓冲区无条目
- **THEN** 不为该用户发送任何消息

#### Scenario: 机器人未配置
- **WHEN** `robot.AccessToken` 为空
- **THEN** 不执行任何发送操作

### Requirement: 定时刷新机制
系统 SHALL 在 Backend 启动时启动一个后台 goroutine，每 5 分钟刷新所有用户缓冲区。

#### Scenario: 正常刷新
- **WHEN** 定时器触发
- **THEN** 遍历所有用户缓冲区，为每个非空缓冲区构建聚合消息并发送，然后清空该缓冲区

### Requirement: 关闭时刷新
系统 SHALL 在 `ShutDown` 时停止定时器并刷新剩余缓冲区中未发送的消息。

#### Scenario: 关闭时有未发送消息
- **WHEN** `ShutDown` 被调用且缓冲区有条目
- **THEN** 发送所有剩余聚合消息后停止 goroutine

## REMOVED Requirements

### Requirement: 逐条消息去重
**Reason**: 被 5 分钟时间窗口内的聚合+去重机制取代
**Migration**: `shouldSend` 方法和 `msgQueue` 字段被移除，去重逻辑整合进缓冲区的 `看板+card+操作` 三元组去重
