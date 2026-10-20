# AI Agent 全栈模板

一个可直接投入生产的 AI Agent 模板：Vue 3 移动端前端 + Node.js SSE 流式后端。

## 特性

- **SSE 流式输出**：Token 级实时输出，配合 rAF 批量缓冲（移动端零卡顿）
- **多会话并发**：最多 3 个并发 SSE 流，支持后台继续接收
- **工具卡片**：可扩展的卡片注册表，用于异步工具结果（报告、表格等）
- **JSBridge 可选**：既可在浏览器独立运行，也可通过 JSBridge 嵌入原生 App
- **移动优先**：Vue 3 + Vant 4 + 安全区（safe-area）适配
- **Mock 后端**：零复杂依赖的 Node.js Express 服务器，提供逼真的流式模拟

## 架构

```
ai-agent-fullstack/
├── web/                # Vue 3 + Vite 前端
│   ├── src/
│   │   ├── components/chat/   # SSE 渲染、卡片、消息
│   │   ├── stores/chat.js     # 多会话 SSE 管理器 + streamBuffer
│   │   ├── utils/sse.js       # SSE fetch+ReadableStream 解析器
│   │   ├── utils/streamBuffer.js  # rAF 批量写入（核心性能特性）
│   │   └── utils/envAdapter.js    # JSBridge / Web 双模式适配器
│   └── docs/           # SSE 协议规范
├── server/             # Node.js Express 后端（Mock）
│   ├── routes/         # /chat /session /file
│   └── services/       # sseMock.js、store.js
└── docker-compose.yml
```

## 快速开始

### 1. 后端
```bash
cd server
npm install
npm run dev        # http://localhost:3000
```

### 2. 前端
```bash
cd web
cp .env.example .env.development
npm install
npm run dev        # http://localhost:5173
```

打开 http://localhost:5173，在登录页输入任意用户 ID 即可开始聊天。

## SSE 协议

前端期望的消息格式如下（详见 `web/docs/SSE-Protocol.md`）：

```
event: message
data: {"type": "content", "delta": "hello", "format": "markdown"}

event: card
data: {"type": "tool_result", "toolName": "report", "data": {...}}

event: done
data: {"message_id": "msg_001"}

event: message
data: [DONE]
```

## 接入你自己的 LLM

将 `server/services/sseMock.js` 替换为真实的 LLM 调用即可，唯一的约定是：

1. 每收到一个分块，写入 `event: message\ndata: {"type":"content","delta":"...", "format":"markdown"}\n\n`
2. 结束时写入 `event: done\ndata: {"message_id":"..."}\n\n` + `event: message\ndata: [DONE]\n\n`

## 部署

```bash
docker-compose up -d
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3、Vite 5、Vant 4、Pinia |
| 后端 | Node.js、Express、multer |
| 流式传输 | Server-Sent Events (SSE) |
| 认证 | localStorage JWT / JSBridge（可选） |

## 许可证

MIT
