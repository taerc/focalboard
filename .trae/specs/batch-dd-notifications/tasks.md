# Tasks

- [x] Task 1: 定义缓冲区数据结构并重构 Backend struct
  - [x] SubTask 1.1: 新增 `entry` struct，包含 `board`、`card`、`action` 三个字段
  - [x] SubTask 1.2: 新增 `userBuffer` struct，包含 `username`、`entries []entry`、`seen map[string]bool`（去重集合）
  - [x] SubTask 1.3: 修改 `Backend` struct：移除 `msgQueue map[uint64]time.Time`，新增 `buffers map[string]*userBuffer`、`flushTicker *time.Ticker`、`done chan struct{}`
  - [x] SubTask 1.4: 将 `dedupInterval` 常量重命名为 `batchInterval`

- [x] Task 2: 修改 `New` 构造函数
  - [x] SubTask 2.1: 初始化 `buffers` 为空 map
  - [x] SubTask 2.2: 初始化 `done` channel

- [x] Task 3: 修改 `Start` 方法，启动后台刷新 goroutine
  - [x] SubTask 3.1: 创建 `batchInterval` 间隔的 `time.Ticker`，赋值给 `flushTicker`
  - [x] SubTask 3.2: 启动 goroutine，循环 select `ticker.C` 和 `done`，收到 `ticker.C` 时调用 `flushAll`，收到 `done` 时退出

- [x] Task 4: 修改 `ShutDown` 方法，刷新剩余消息并停止 goroutine
  - [x] SubTask 4.1: 发送 `done` 信号停止 goroutine
  - [x] SubTask 4.2: 调用 `flushAll` 发送剩余缓冲区消息
  - [x] SubTask 4.3: 停止 `flushTicker`

- [x] Task 5: 重构 `BlockChanged` 方法，改为缓冲写入
  - [x] SubTask 5.1: 保留现有的 board/card/userID/who 提取逻辑
  - [x] SubTask 5.2: 保留现有的 actionVerb 映射逻辑（Add/Update → 编辑，Delete → 删除）
  - [x] SubTask 5.3: 调用新的 `addToBuffer(userID, who, board, card, actionVerb)` 将条目写入缓冲区，替换原来的立即发送逻辑
  - [x] SubTask 5.4: 移除对 `shouldSend` 和 `SendRequest` 的直接调用

- [x] Task 6: 实现 `addToBuffer` 方法
  - [x] SubTask 6.1: 加锁，获取或创建该 userID 对应的 `userBuffer`
  - [x] SubTask 6.2: 缓存 username 到 `userBuffer.username`
  - [x] SubTask 6.3: 构建去重 key `board|card|action`，若已存在于 `seen` 则跳过
  - [x] SubTask 6.4: 若不存在，将 entry 追加到 `entries`，并在 `seen` 中标记

- [x] Task 7: 实现 `flushAll` 方法
  - [x] SubTask 7.1: 加锁，遍历所有 `userBuffer`
  - [x] SubTask 7.2: 跳过空缓冲区
  - [x] SubTask 7.3: 为每个非空缓冲区构建聚合消息（标题行 `XXX 正在编辑看板` + 编号的操作列表行）
  - [x] SubTask 7.4: 调用 `robot.Signature()` + `robot.SendText` + `SendRequest` 发送消息
  - [x] SubTask 7.5: 清空该用户的 `entries` 和 `seen`，解锁

- [x] Task 8: 移除旧的 `shouldSend` 方法
  - [x] SubTask 8.1: 删除 `shouldSend` 方法
  - [x] SubTask 8.2: 移除不再使用的 `"hash/fnv"` import

- [x] Task 9: 编译验证
  - [x] SubTask 9.1: 运行 `go build` 确认无编译错误
  - [x] SubTask 9.2: 运行 `go vet` 确认无静态分析问题

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1, Task 2
- Task 4 depends on Task 3
- Task 5 depends on Task 6
- Task 6 depends on Task 1
- Task 7 depends on Task 1
- Task 8 depends on Task 5
- Task 9 depends on all prior tasks
