# streamBuffer 流式缓冲器工作流程

## 一、解决什么问题

SSE 流式输出是 **token 级别** 推送的（后端每生成一个字发一个 chunk）。

如果每个 chunk 直接写入 Vue 响应式对象：

```
chunk "你" → aiMsg.content += "你" → 触发 Vue 渲染
chunk "好" → aiMsg.content += "好" → 触发 Vue 渲染
chunk "，" → aiMsg.content += "，" → 触发 Vue 渲染
...一秒 30-50 次 → 移动端卡顿
```

**streamBuffer 的作用**：把 N 次响应式写入合并成每帧（16.6ms）最多 1 次。

---

## 二、核心原理

```
SSE chunk（高频）
  │
  ▼
pendingContent += delta     ← 普通字符串，非响应式，不触发渲染
  │
  ▼
schedule()                  ← requestAnimationFrame 调度（每帧最多一次）
  │
  ▼
applyPending()              ← 一次性写入响应式对象
  │
  ▼
target.content += pending   ← 触发 1 次 Vue 渲染
```

**关键区别**：
- **不是防抖**：防抖等"静止"才触发，流式输出永远不会静止
- **是 rAF 节流**：每帧（~16.6ms）最多执行一次写入

---

## 三、内部状态

```js
let pendingContent = ''    // 非响应式缓冲区（累积 delta）
let rafId = null           // 当前 rAF 的 ID（null 表示空闲）
let currentFormat = 'text' // 当前格式（'text' | 'markdown'）
let segments = []          // 分段列表
let currentSegment = null  // 当前正在累积的分段
```

---

## 四、API 详解

### 4.1 appendContent(delta)

**用途**：追加内容增量（最高频调用）

```
调用：appendContent("你")
  → pendingContent += "你"
  → schedule()
      → if (rafId != null) return  // 同一帧内不重复调度
      → rafId = requestAnimationFrame(() => {
            rafId = null
            applyPending()         // 写入 target.content
          })
```

**同一帧内多次调用**：

```
帧 1：
  appendContent("你")  → pendingContent = "你"，调度 rAF
  appendContent("好")  → pendingContent = "你好"，rAF 已存在不重复调度
  appendContent("世")  → pendingContent = "你好世"，rAF 已存在不重复调度

rAF 触发 → applyPending() → target.content += "你好世"（1 次渲染）
```

### 4.2 setFormat(format)

**用途**：设置当前内容格式（text / markdown）

```
调用：setFormat('markdown')
  │
  ├─ segments 为空（首次）
  │   → 初始化 currentSegment = { content: '', format: 'markdown' }
  │   → segments.push(currentSegment)
  │   → target.segments = [...segments]
  │
  └─ segments 不为空且格式变化
      → switchFormat('markdown')
          → applyPending()        // 先 flush 当前缓冲
          → currentFormat = 'markdown'
          → currentSegment = { content: '', format: 'markdown' }
          → segments.push(currentSegment)  // 创建新分段
```

**实际场景**：后端一条流内可能混合 text 和 markdown 格式，格式变化时自动分段。

### 4.3 flush()

**用途**：立即同步写入，取消未执行的 rAF

```
调用：flush()
  → if (rafId != null) cancelAnimationFrame(rafId)
  → rafId = null
  → applyPending()  // 立即写入
```

**调用时机**：
- `event:done` — 流正常结束
- `event:finish` — 澄清环节结束
- `onError` — 流出错
- `stop()` — 用户主动停止
- `event:violation` — 合规拦截

**为什么需要 flush**：最后一个 chunk 可能还在 pendingContent 里没写入，rAF 还没来得及执行。flush 确保不丢数据。

### 4.4 setContent(text)

**用途**：直接覆盖 content（低频）

```
调用：setContent("完整内容")
  → this.flush()          // 先冲掉缓冲区
  → target.content = text // 直接覆盖
```

### 4.5 cancel()

**用途**：只取消 rAF，不写入。用于空气泡清理等场景。

```
调用：cancel()
  → if (rafId != null) cancelAnimationFrame(rafId)
  → rafId = null
  → pendingContent = ''   // 丢弃缓冲内容
```

---

## 五、applyPending 写入逻辑

```js
function applyPending() {
  if (pendingContent) {
    if (currentSegment) {
      // 有分段：同时写入 segment 和 content
      currentSegment.content += pendingContent
      target.segments = [...segments]   // 触发 segments 响应式
      target.content += pendingContent  // 触发 content 响应式
    } else {
      // 无分段：直接写入 content
      target.content += pendingContent
    }
    pendingContent = ''
  }
}
```

**双写原因**：`segments` 用于分段渲染（MixedFormat），`content` 用于向后兼容（纯文本/Markdown 渲染、滚动追踪等）。

---

## 六、完整数据流

```
后端 SSE 推送（token 级别）：

  event:message  data:{"delta":"你","format":"text"}
  event:message  data:{"delta":"好","format":"text"}
  event:message  data:{"delta":"\n\n","format":"markdown"}
  event:message  data:{"delta":"**加粗**","format":"markdown"}

                    ↓

chatStore._handleSSEEvent 处理：

  streamBuffer.setFormat('text')
  streamBuffer.appendContent("你")
  streamBuffer.setFormat('text')
  streamBuffer.appendContent("好")
  streamBuffer.setFormat('markdown')    ← 格式变化，创建新分段
  streamBuffer.appendContent("\n\n")
  streamBuffer.setFormat('markdown')
  streamBuffer.appendContent("**加粗**")

                    ↓

streamBuffer 内部（非响应式累积）：

  pendingContent = "你好"
  segments = [{ content: "你好", format: "text" }]

  （格式切换时 flush → 创建新分段）

  pendingContent = "\n\n**加粗**"
  segments = [
    { content: "你好", format: "text" },
    { content: "\n\n**加粗**", format: "markdown" }
  ]

                    ↓

rAF 触发 → applyPending → 写入响应式对象（1 次渲染）：

  aiMsg.content = "你好\n\n**加粗**"
  aiMsg.segments = [
    { content: "你好", format: "text" },
    { content: "\n\n**加粗**", format: "markdown" }
  ]

                    ↓

MessageItem.vue 渲染：

  segments 有内容 → 分段渲染
    ├─ segment[0]: 纯文本 "你好"
    └─ segment[1]: Markdown "**加粗**" → 渲染为加粗文本
```

---

## 七、生命周期

```
创建：chatStore._sendStream() / resumeInterrupt()
  │
  └─ const streamBuffer = createStreamBuffer(aiMsg)
     └─ session.streamBuffer = streamBuffer
  │
使用：SSE 流期间
  │
  ├─ appendContent(delta)  ← 每个 event:message chunk
  ├─ setFormat(format)     ← 每个 chunk 携带格式时
  │
结束：
  │
  ├─ 正常结束（event:done）→ flush() → 写入剩余缓冲
  ├─ 澄清结束（event:finish）→ flush() → 检查空气泡
  ├─ 用户停止（stop()）→ flush() → 标记 done
  ├─ 出错（onError）→ flush() → 标记 error
  └─ 页面关闭（pagehide）→ flush() → abort SSE
```

---

## 八、性能对比

| 场景 | 无 streamBuffer | 有 streamBuffer |
|------|----------------|----------------|
| 1 秒 50 个 chunk | 50 次 Vue 渲染 | ~3 次（60fps = 每帧 1 次） |
| 移动端 CPU 占用 | 高（频繁 DOM 更新） | 低（帧级合并） |
| 流式输出流畅度 | 卡顿明显 | 流畅 |
| 数据丢失风险 | 无 | flush 保证不丢 |
