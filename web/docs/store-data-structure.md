# Pinia Chat Store 数据结构说明

## 一、Store 顶层结构

```js
// src/stores/chat.js
{
  state: {
    sessions: {},          // 会话映射表
    currentSessionId: null, // 当前激活会话 ID
    userId: '...',          // 当前用户 ID
    userName: '...'         // 当前用户名
  }
}
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `sessions` | `Object` | 会话映射表，key 为 sessionId，value 为会话对象 |
| `currentSessionId` | `string \| null` | 当前激活的会话 ID，getter 据此返回对应会话数据 |
| `userId` | `string` | 当前用户 ID，从 localStorage 初始化，APP 通过 `syncFromBridge` 更新 |
| `userName` | `string` | 当前用户名，同上 |

---

## 二、会话映射表（sessions）

以 `sessionId` 为 key 的字典结构：

```
sessions = {
  "7488060495248245688": { messages, isStreaming, abortController, ... },
  "7488060495248245689": { messages, isStreaming, abortController, ... },
  ...
}
```

**设计意图**：每个会话独立持有自己的消息列表和流式状态，切换会话时不中断其他会话的 SSE 连接。

---

## 三、会话对象（Session）

每个 session 包含以下属性：

```js
sessions[sessionId] = {
  messages: [],           // 消息列表
  isStreaming: false,     // 是否正在流式输出
  abortController: null,  // SSE 中断控制器
  streamBuffer: null,     // 流式缓冲器（streamBuffer 实例）
  streamTimeout: null,    // 后台流式超时定时器
  interrupt: null         // 澄清/追问状态
}
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `messages` | `Array<Message>` | 该会话的所有消息（用户 + AI） |
| `isStreaming` | `boolean` | 当前是否有 SSE 流正在输出 |
| `abortController` | `AbortController \| null` | 用于终止 SSE fetch 请求，`null` 表示无活跃流 |
| `streamBuffer` | `StreamBuffer \| null` | rAF 批量缓冲器实例，流式输出期间存在，结束后置 `null` |
| `streamTimeout` | `Timer \| null` | 后台会话超时定时器（切走时启动 10 分钟超时，切回时取消） |
| `interrupt` | `Interrupt \| null` | 当前澄清/追问状态，`null` 表示非澄清模式 |

---

## 四、消息对象（Message）

### 4.1 用户消息

```js
{
  id: 'user-1722240000000',
  sessionId: '7488060495248245688',
  role: 'user',
  content: '你好',
  attachments: null,
  status: 'done',
  createdAt: 1722240000000
}
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 消息 ID，创建时为 `user-{timestamp}`，无后端 messageId |
| `sessionId` | `string` | 所属会话 ID |
| `role` | `'user'` | 消息角色，固定为 `user` |
| `content` | `string` | 用户输入的文本内容 |
| `attachments` | `Array \| null` | 附件信息，无附件时为 `null` |
| `status` | `'done'` | 消息状态，用户消息固定为 `done` |
| `createdAt` | `number` | 创建时间戳（ms） |

### 4.2 AI 消息（流式输出中 / 完成后）

```js
{
  id: 'assistant-1722240000000',  // 或后端返回的 message_id
  sessionId: '7488060495248245688',
  role: 'assistant',
  content: '你好！有什么可以帮你的吗？',
  status: 'done',
  segments: [],
  format: undefined,
  card: null,
  actions: {},
  buttons: undefined,
  chapters: undefined,
  isInterrupt: undefined,
  isViolation: undefined,
  createdAt: 1722240000000
}
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 消息 ID。创建时为 `assistant-{timestamp}`，`event:done` 携带 `message_id` 时替换为后端真实 ID |
| `sessionId` | `string` | 所属会话 ID |
| `role` | `'assistant'` | 消息角色，固定为 `assistant` |
| `content` | `string` | AI 回复的文本内容（流式期间逐步增长） |
| `status` | `'streaming' \| 'done' \| 'error'` | 消息状态：`streaming`=流式输出中（三点动画），`done`=完成，`error`=出错 |
| `segments` | `Array<Segment>` | 分段内容列表，支持 text/markdown 混合格式。由 streamBuffer 维护 |
| `format` | `'text' \| 'markdown' \| undefined` | 内容格式标识。`undefined` 表示未指定（默认按 text 处理） |
| `card` | `Object \| null` | 卡片数据对象。历史接口 `content_type === 'card'` 时解析 JSON 存入此字段 |
| `actions` | `Object` | 点赞/踩状态：`{ like: boolean, dislike: boolean }` |
| `buttons` | `Array \| undefined` | 气泡附属交互按钮（`event:ui` 推送），`undefined` 表示无按钮 |
| `chapters` | `Array \| undefined` | 追问/澄清的章节数据（`event:interrupt` 或历史 `ext_metadata.chapters`） |
| `isInterrupt` | `boolean \| undefined` | 是否为澄清/追问消息，`true` 时 MessageItem 特殊渲染 |
| `isViolation` | `boolean \| undefined` | 是否因违规被终止，`true` 时显示违规提示样式 |
| `createdAt` | `number` | 创建时间戳（ms） |

### 4.3 历史消息（loadHistory 映射后）

历史消息经过映射，额外字段说明：

| 后端字段 | 映射到 | 说明 |
|----------|--------|------|
| `msg.id` | `id` | 后端消息 ID |
| `msg.role` | `role` | 消息角色 |
| `msg.content` | `content` / `card` | 根据 `content_type` 分流：`card` → 解析 JSON 存入 `card`，`markdown` → `content` + `format:'markdown'`，其他 → `content` + `format:'text'` |
| `msg.content_type` | — | 内容类型：`card` / `markdown` / 其他（默认 text） |
| `msg.created_at` | `createdAt` | 创建时间 |
| `msg.fbk_liked` | `actions` | 反馈状态：`0`=踩，`1`=赞，`NULL`=未反馈 |
| `msg.ext_metadata.chapters` | `chapters` + `isInterrupt` | 追问/澄清章节数据 |

---

## 五、分段对象（Segment）

`segments` 数组中的每个元素：

```js
{
  content: '这是一段 **Markdown** 内容',
  format: 'markdown'
}
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `content` | `string` | 该分段的内容文本 |
| `format` | `'text' \| 'markdown'` | 该分段的渲染格式 |

**分段产生时机**：后端一条流内格式发生变化时（如从 text 切换到 markdown），streamBuffer 自动创建新分段。

---

## 六、澄清状态对象（Interrupt）

存储在 `session.interrupt` 中：

```js
{
  qa_index: 2,
  question: '请问您想查询哪个城市的数据？',
  chips: ['北京', '上海', '广州', '深圳'],
  input_type: 'text',
  skipable: true,
  chapters: [{ title: '城市选择', options: [...] }]
}
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `qa_index` | `number` | 当前追问轮次索引，resume 时回传后端 |
| `question` | `string` | 追问/澄清的提问文本 |
| `chips` | `Array<string>` | 备选答案选项列表（AgentInput 渲染为可点击按钮） |
| `input_type` | `string` | 输入类型：`text`=文本，`single`=单选，`multi`=多选 |
| `skipable` | `boolean` | 是否允许跳过（`true` 时显示"跳过"按钮） |
| `chapters` | `Array` | 章节数据，用于结构化展示追问内容 |

---

## 七、Getters

| Getter | 返回类型 | 说明 |
|--------|---------|------|
| `currentSession` | `Session \| null` | 当前激活的会话对象 |
| `currentMessages` | `Array<Message>` | 当前会话的消息列表 |
| `isStreaming` | `boolean` | 当前会话是否正在流式输出 |
| `isFirstSession` | `boolean` | 当前会话是否为第一个创建的会话（用于判断是否显示历史对话胶囊） |

---

## 八、数据关系图

```
chatStore (Pinia)
  │
  ├─ sessions (会话映射表)
  │    │
  │    ├─ [sessionId_A] (Session)
  │    │    ├─ messages[] (Message[])
  │    │    │    ├─ user message      { role:'user', status:'done' }
  │    │    │    ├─ assistant message  { role:'assistant', status:'streaming', segments:[...] }
  │    │    │    ├─ interrupt message  { role:'assistant', isInterrupt:true, chapters:[...] }
  │    │    │    └─ card message       { role:'assistant', card:{...} }
  │    │    │
  │    │    ├─ isStreaming: boolean
  │    │    ├─ abortController: AbortController | null
  │    │    ├─ streamBuffer: StreamBuffer | null
  │    │    ├─ streamTimeout: Timer | null
  │    │    └─ interrupt: Interrupt | null
  │    │         ├─ qa_index
  │    │         ├─ question
  │    │         ├─ chips[]
  │    │         ├─ input_type
  │    │         ├─ skipable
  │    │         └─ chapters[]
  │    │
  │    └─ [sessionId_B] (Session)
  │         └─ ... (独立的消息列表和流式状态)
  │
  ├─ currentSessionId → 指向 sessions 中的某个 key
  ├─ userId
  └─ userName
```
