# Checklist

- [x] Backend struct 已移除 `msgQueue`，新增 `buffers`、`flushTicker`、`done` 字段
- [x] `dedupInterval` 常量已重命名为 `batchInterval`，值为 5 分钟
- [x] `New` 函数正确初始化 `buffers` map 和 `done` channel
- [x] `Start` 方法启动了 `batchInterval` 间隔的 Ticker 和后台 goroutine
- [x] 后台 goroutine 在 `ticker.C` 时调用 `flushAll`，在 `done` 时退出
- [x] `ShutDown` 方法发送 `done` 信号、调用 `flushAll`、停止 Ticker
- [x] `BlockChanged` 方法不再直接发送消息，改为调用 `addToBuffer` 缓冲
- [x] `addToBuffer` 按 `board|card|action` 三元组去重，重复条目不追加
- [x] `flushAll` 为每个非空用户缓冲区构建格式正确的聚合消息
- [x] 聚合消息标题行格式为 `XXX 正在编辑看板`
- [x] 聚合消息操作列表每行编号从 1 开始，格式为 `N 操作了 看板 的 card`
- [x] `flushAll` 发送后清空对应用户的 `entries` 和 `seen`
- [x] 缓冲区为空时不发送消息
- [x] `robot.AccessToken` 为空时不发送消息
- [x] `shouldSend` 方法已删除
- [x] `hash/fnv` import 已移除
- [x] `go build` 编译通过
- [x] `go vet` 无警告
