import { defineStore } from "pinia";
import { markRaw } from "vue";
import router from "../router";
import { createSSE } from "../utils/sse";
import { createStreamBuffer } from "../utils/streamBuffer";
import {
  createSession,
  chat,
  sendMessage,
  getMessages,
  resumeMessage,
  getTaskStatus,
} from "../api/chat";
import {
  getUserId,
  getUserName,
  setUserId,
  setUserName,
  setAppSessionId,
  setEmpNo,
  getAppSessionId,
  getEmpNo,
  setToken,
  getToken,
} from "../utils/appContext";
import { getAppHeaders } from "@/utils/appContext";
import axios from "axios";
/**
 * 对话状态管理 Pinia Store（多会话架构）
 *
 * 核心设计：
 * - sessions: 以 sessionId 为 key 的映射表，每个会话独立持有消息列表、流式状态、abortController
 * - currentSessionId: 当前激活的会话 ID，getter 据此返回对应会话的数据
 * - 切换会话时不中断其他会话的 SSE 连接，旧会话的流式输出在后台继续
 *
 * 流式性能：
 * - streamBuffer: rAF 批量缓冲，把 token 级的高频响应式写入合并成每帧一次
 */
export const useChatStore = defineStore("chat", {
  state: () => ({
    /** 会话映射表 { [sessionId]: { messages, isStreaming, abortController, streamBuffer } } */
    sessions: {},
    /** 当前激活的会话 ID */
    currentSessionId: null,
    /** 当前用户 ID（从 localStorage 读取，APP 通过 syncFromBridge 更新） */
    userId: getUserId() || "test_user",
    userName: getUserName() || "test",
    appSessionId: getAppSessionId() || "",
    empNo: getEmpNo() || "",
    Token: getToken() || "",
    // 任务轮询定时器映射，方便多个任务用 里边内容是intervalId(定时器id)，sessionId 对应的会话ID, retryCount，请求次数，过60次不请求
    taskPollers: {},
    isHistoryView: false
  }),

  getters: {
    /**
     * 获取当前会话对象
     */
    currentSession: (state) => {
      if (!state.currentSessionId) return null;
      return state.sessions[state.currentSessionId] || null;
    },

    /**
     * 获取当前会话的消息列表
     */
    currentMessages: (state) => {
      const session = state.sessions[state.currentSessionId];
      return session ? session.messages : [];
    },

    /**
     * 当前会话是否正在流式输出
     */
    isStreaming: (state) => {
      const session = state.sessions[state.currentSessionId];
      return session ? session.isStreaming : false;
    },
  },

  actions: {
    /**
     * JS 桥统一同步方法
     * 一次调用同时更新 localStorage（appContext）和 store 状态
     * @param {object} params
     * @param {string} [params.userId]
     * @param {string} [params.userName]
     * @param {string} [params.appSessionId]
     */
    syncFromBridge(userId, userName, appSessionId, empNo) {
      if (userId) {
        setUserId(userId);
        this.userId = userId;
      }
      if (userName) {
        setUserName(userName);
        this.userName = userName;
      }
      if (appSessionId) {
        setAppSessionId(appSessionId);
        setToken(appSessionId);
        this.appSessionId = appSessionId;
      }
      if (empNo) {
        setEmpNo(empNo);
        this.empNo = empNo;
      }
    },

    /**
     * 初始化全局事件监听（H5 关闭终止所有 SSE、页面可见时 flush 缓冲区）
     * 在 store 创建时自动执行一次
     */
    _initGlobalListeners() {
      // H5 页面关闭时终止所有 SSE 连接（APP 退出 WebView 时触发）
      if (typeof window !== "undefined") {
        window.addEventListener("pagehide", () => {
          Object.keys(this.sessions).forEach((sid) => {
            const s = this.sessions[sid];
            if (s.abortController) {
              s.abortController.abort();
              s.abortController = null;
            }
            if (s.streamBuffer) {
              s.streamBuffer.flush();
              s.streamBuffer = null;
            }
            if (s.streamTimeout) {
              clearTimeout(s.streamTimeout);
              s.streamTimeout = null;
            }
            s.isStreaming = false;
          });
          // 关闭清掉所有定时器
          Object.keys(this.taskPollers).forEach((taskId) => {
            const poller = this.taskPollers[taskId];
            if (poller?.intervalId) {
              clearInterval(poller.intervalId);
            }
          });
        });
      }

      // 页面重新可见时 flush 所有流式缓冲区
      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            Object.values(this.sessions).forEach((s) => {
              if (s.streamBuffer && s.isStreaming) {
                s.streamBuffer.flush();
              }
            });
          }
        });
      }
    },

    /**
     * 创建新会话
     * 调用后端接口 POST /v1/session/create 获取真实 session_id
     * 访前报告跳转来源 source
     * 访前报告ID reportId
     * @returns {Promise<string>} 后端返回的 sessionId
     */
    async createSession(source = "", linkedpreVisitPeported = "") {
      let sessionId = ``; // 兑底 ID，接口失败时使用
      try {
        const res = await createSession();
        // request.js 已统一处理错误，这里只需要验证返回数据
        // 后端返回 { session_id, user_id, title, status, created_at }
        if (res && res.sessionId) {
          sessionId = res.sessionId;
        }
      } catch (err) {
        console.error("[Chat] 创建会话接口失败:", err);
        // 错误已在 request.js 中统一提示
      }
      // 初始化会话对象：空消息列表、非流式、无 abortController
      this.sessions[sessionId] = {
        _sessionId: sessionId,
        messages: [],
        isStreaming: false,
        abortController: null,
        streamBuffer: null,
        streamTimeout: null, // 流式超时定时器
        interrupt: null, // interrupt 状态（追问/澄清）
        pendingTaskLoadHistory: false,
      };
      // 设为当前会话
      this.currentSessionId = sessionId;
      // 如果从访前报告生成 去执行stream接口
      if (source === "pre_visitreport") {
        this.send("写拜访纪要", [], [], {}, linkedpreVisitPeported);
      }
      return sessionId;
    },

    /**
     * 切换当前会话（不中断其他会话的 SSE）
     * 切走的会话如果是流式中，启动 10 分钟超时；切回的会话取消超时
     * @param {string} sessionId - 目标会话 ID
     */
    setSessionId(sessionId) {
      // 如果目标会话不存在，自动创建
      if (!this.sessions[sessionId]) {
        this.sessions[sessionId] = {
          _sessionId: sessionId,
          messages: [],
          isStreaming: false,
          abortController: null,
          streamBuffer: null,
          streamTimeout: null,
          interrupt: null,
          pendingTaskLoadHistory: false,
        };
      }

      const oldSessionId = this.currentSessionId;

      // 切走的会话：如果是流式中，启动 10 分钟超时
      if (oldSessionId && oldSessionId !== sessionId) {
        const oldSession = this.sessions[oldSessionId];
        if (oldSession && oldSession.isStreaming && !oldSession.streamTimeout) {
          const STREAM_TIMEOUT = 10 * 60 * 1000;
          oldSession.streamTimeout = setTimeout(() => {
            console.warn(
              "[Chat] 后台会话超时（10分钟），自动停止:",
              oldSessionId
            );
            this.stop(oldSessionId);
          }, STREAM_TIMEOUT);
        }
      }

      // 切回的会话：取消超时
      const targetSession = this.sessions[sessionId];
      if (targetSession && targetSession.streamTimeout) {
        clearTimeout(targetSession.streamTimeout);
        targetSession.streamTimeout = null;
      }

      this.currentSessionId = sessionId;
    },

    /**
     * 发送用户消息（统一走流式）
     *
     * @param {string} userText - 用户输入的文本
     * @param {string[]} [fileIds=[]] - 附件文件 ID 列表
     * @param {Array} [attachments=[]] - 附件信息
     */
    async send(
      userText,
      fileIds = [],
      attachments = [],
      options = {},
      linkedpreVisitPeported = ""
    ) {
      // options.hideUserMessage 时允许发送空消息（不在对话流中产生空气泡）
      if (!options.hideUserMessage) {
        if (!userText.trim() && fileIds.length === 0) return;
      }

      // 确保当前会话存在
      if (!this.currentSessionId) {
        await this.createSession();
      }

      await this._sendStream(
        userText,
        fileIds,
        attachments,
        options,
        linkedpreVisitPeported
      );
    },

    /**
     * 流式对话模式
     * 调用 POST /v1/chat/stream，后端返回 SSE，逐步写入消息列表
     */
    async _sendStream(
      userText,
      fileIds = [],
      attachments = [],
      options = {},
      linkedpreVisitPeported
    ) {
      const session = this.sessions[this.currentSessionId];
      const sessionId = this.currentSessionId;
      // 防止连点
      if (session.isStreaming) {
        return;
      }
      // 添加用户消息（options.hideUserMessage 为真时跳过，避免空气泡）
      if (!options.hideUserMessage) {
        session.messages.push({
          id: `user-${Date.now()}`,
          sessionId,
          role: "user",
          content: userText,
          attachments: attachments.length ? attachments : null,
          status: "done",
          createdAt: Date.now(),
        });
      }

      // 添加 AI 消息占位（支持多段对话）
      session.messages.push({
        id: `assistant-${Date.now()}`,
        sessionId,
        role: "assistant",
        content: "",
        status: "streaming",
        segments: [], // 多段对话内容
        createdAt: Date.now(),
      });
      // 获取响应式代理引用
      const aiMsg = session.messages[session.messages.length - 1];
      session.isStreaming = true;

      // 创建流式缓冲器：增量先累积，每帧（rAF）最多写入一次响应式状态，
      // 把 token 级的高频 mutation 合并，避免逐字重渲染导致卡顿
      const streamBuffer = createStreamBuffer(aiMsg);
      session.streamBuffer = streamBuffer;

      // 构造请求体并打印日志
      const requestBody = sendMessage.formatBody(
        sessionId,
        userText,
        fileIds,
        this.userId,
        this.userName,
        linkedpreVisitPeported
      );
      // console.log("[SSE] 发送消息 →", {
      //   url: sendMessage.url,
      //   sessionId,
      //   userText,
      //   body: requestBody,
      // });

      session.abortController = markRaw(
        createSSE(sendMessage.url, {
          body: requestBody,

          onMessage: (chunk, eventType) => {
            this._handleSSEEvent(
              session,
              aiMsg,
              streamBuffer,
              chunk,
              eventType
            );
          },

          onDone: () => {
            console.log("[SSE] _sendStream onDone");
            if (session.isStreaming) {
              streamBuffer.flush();
              session.streamBuffer = null;
              aiMsg.status = "done";
              session.isStreaming = false;
              session.abortController = null;
            }
            if (session.pendingTaskLoadHistory) {
              session.pendingTaskLoadHistory = false;
              this.loadHistory();
            }
          },

          onError: (err) => {
            console.error("[SSE] 流式对话错误:", err);
            streamBuffer.flush();
            session.streamBuffer = null;
            aiMsg.status = "error";
            session.isStreaming = false;
            session.abortController = null;
          },
        })
      );
    },

    /**
     * 停止指定会话的流式响应（不影响其他会话）
     * abort 后 sse.js 不会再回调 onDone/onError，需在此自行收尾：
     * 冲刷缓冲区（保留已收到的内容）+ 停止打字机 + 标记消息完成
     * @param {string} [sessionId] - 目标会话 ID，默认停止当前会话
     */
    stop(sessionId) {
      const targetId = sessionId || this.currentSessionId;
      const session = this.sessions[targetId];
      if (!session) return;

      // 终止 SSE
      if (session.abortController) {
        session.abortController.abort();
        session.abortController = null;
      }
      // 冲刷流式缓冲区：保留已接收的内容，避免丢失最后一帧
      if (session.streamBuffer) {
        session.streamBuffer.flush();
        session.streamBuffer = null;
      }
      // 清除超时定时器
      if (session.streamTimeout) {
        clearTimeout(session.streamTimeout);
        session.streamTimeout = null;
      }
      // 将流式中的消息标记为完成，避免光标一直闪烁
      const streamingMsgIndex = session.messages.findIndex(
        (m) => m.role === "assistant" && m.status === "streaming"
      );
      if (streamingMsgIndex !== -1) {
        const streamingMsg = session.messages[streamingMsgIndex];
        if (streamingMsg) {
          if (!streamingMsg.content || !streamingMsg.content.trim()) {
            session.messages.splice(streamingMsgIndex, 1);
          } else {
            streamingMsg.status = "done";
          }
        }
      }
      session.isStreaming = false;
    },

    /**
     * 加载历史消息
     * 调用后端接口 GET /v1/chat/history/{session_id}
     * 将返回的消息列表映射到本地会话结构
     */
    async loadHistory() {
      if (!this.currentSessionId) return;

      try {
        // 获取历史记录, 不打开打字机
        this.isHistoryView = false;
        const res = await getMessages(this.currentSessionId);
        const session = this.sessions[this.currentSessionId];
        if (!session || !res) return;
        // request.js 已统一处理错误，这里只需要验证返回数据
        const messagesList = Array.isArray(res)
          ? res
          : Array.isArray(res?.messages)
          ? res.messages
          : [];
        // 将后端消息映射为前端消息结构
        session.messages = messagesList.map((msg, index) => {
          const mapped = {
            id: msg.id || `history-${index}`,
            sessionId: this.currentSessionId,
            role: msg.role || "assistant",
            content: "",
            format: undefined,
            card: null,
            status: "done",
            actions: {},
            createdAt: msg.created_at || Date.now(),
          };

          // 根据 content_type 区分渲染模式
          if (msg.content_type === "card") {
            // 卡片消息：content 是 JSON 字符串，解析为 card 对象
            try {
              mapped.card = JSON.parse(msg.content);
            } catch (e) {
              console.warn("[Chat] 历史卡片 JSON 解析失败:", msg.content, e);
              mapped.content = msg.content || "";
            }
          } else if (msg.content_type === "markdown") {
            mapped.format = "markdown";
            try {
              const parsed = JSON.parse(msg.content);
              // JSON 格式：提取 info 和 buttons
              mapped.content = parsed.info;
              mapped.buttons = parsed.buttons || [];
              mapped.format = "markdown";
            } catch (e) {
              // 不是 JSON，按纯 Markdown 文本处理
              mapped.content = msg.content || "";
            }
          } else if (msg.content_type === "report") {
            mapped.format = "markdown";
            try {
              const parsed = JSON.parse(msg.content);
              // JSON 格式：提取 info 和 buttons
              mapped.content = parsed.info;
              mapped.buttons = parsed.buttons || [];
            } catch (e) {
              // 不是 JSON，按纯 Markdown 文本处理
              mapped.content = msg.content || "";
            }
          } else if (msg.content_type === "clarification") {
            mapped.format = undefined;
            mapped.isInterrupt = true;
            mapped.content = msg.content || "";
            if (
              msg.ext_metadata?.chapters &&
              msg.ext_metadata.chapters.length
            ) {
              mapped.chapters = msg.ext_metadata.chapters;
            }
            if (msg.role === "assistant" && index === messagesList.length - 1) {
              session.interrupt = msg.ext_metadata;
              // if (msg.ext_metadata.chips.length === 0) {
              //   mapped.buttons = msg.ext_metadata.skipable
              //     ? [
              //         {
              //           id: "btn-skip",
              //           text: "跳过",
              //           action: "interrupt-skip",
              //         },

              //         {
              //           text: "关闭",
              //           id: "btn-close",
              //           action: "interrupt-close",
              //         },
              //       ]
              //     : [
              //         {
              //           text: "关闭",
              //           id: "btn-close",
              //           action: "interrupt-close",
              //         },
              //       ];
              // }
            }
          } else {
            // 纯文本消息（默认）
            mapped.content = msg.content || "";
            mapped.format = "markdown";
          }

          // 映射点赞/踩状态
          // fbk_liked: 0=不喜欢, 1=喜欢, NULL=未反馈
          if (msg.fbk_liked === 0) {
            mapped.actions = { like: false, dislike: true };
          } else if (msg.fbk_liked === 1) {
            mapped.actions = { like: true, dislike: false };
          } else {
            mapped.actions = { dislike: false, like: false };
          }
          // 从 ext_metadata 提取 chapters（追问/澄清消息的章节数据）

          // 保证最后一条是AI发送的，保证是澄清消息

          return mapped;
        });
      } catch (err) {
        console.error("加载历史消息失败:", err);
        // 错误已在 request.js 中统一提示
      }
    },

    /**
     * 清空当前会话的消息（不影响其他会话）
     */
    clearCurrentSession() {
      const session = this.sessions[this.currentSessionId];
      if (!session) return;
      session.messages = [];
      session.isStreaming = false;
      session.interrupt = null;
      // 终止正在进行的 SSE
      if (session.abortController) {
        session.abortController.abort();
        session.abortController = null;
      }
      // 取消流式缓冲区（内容已清空，无需 flush）
      if (session.streamBuffer) {
        session.streamBuffer.cancel();
        session.streamBuffer = null;
      }
    },
    /**
     * 公共 SSE 事件处理（_sendStream 和 resumeInterrupt 共享）
     *
     * event 类型：
     * - message: 正文流式输出（type=content，delta 增量）
     * - ui: 气泡附属交互控件（chips/buttons，覆盖型）
     * - card: 全局独立卡片（异步生成完成，可能需等待流式结束）
     * - interrupt: 追问/澄清（暂停正文，展示交互 UI，回答走 resume）
     * - task: 异步任务通知（轻提示，不中断流）
     * - done: 流式结束（携带 message_id）
     * - violation: 内容违规，强制终止
     * - error: 系统/业务错误
     *
     * @param {Object} session - 会话对象
     * @param {Object} aiMsg - 当前 AI 消息（响应式）
     * @param {Object} streamBuffer - 流式缓冲器
     * @param {Object} chunk - 解析后的 SSE 数据
     * @param {string} eventType - SSE event 类型
     */
    _handleSSEEvent(session, aiMsg, streamBuffer, chunk, eventType) {
      // console.log("[SSE] event:", eventType, "chunk:", chunk);
      // event: violation - 内容违规，清除消息，abort SSE
      if (eventType === "violation") {
        if (streamBuffer) {
          streamBuffer.cancel();
          session.streamBuffer = null;
          session.isStreaming = false;
        }
        if (aiMsg) {
          aiMsg.content = chunk?.msg || "内容违规";
          aiMsg.status = "done";
          aiMsg.isViolation = true;
        }
        if (session.abortController) {
          session.abortController.abort();
          session.abortController = null;
        }
        if (session.interrupt) {
          session.interrupt = null;
        }
        if (session.pendingTaskLoadHistory) {
          session.pendingTaskLoadHistory = false;
          this.loadHistory();
        }
        return;
      }

      // event: error - 系统/业务错误
      if (eventType === "error") {
        if (aiMsg) {
          aiMsg.content = chunk?.msg || "系统错误";
          aiMsg.status = "error";
        }
        if (streamBuffer) {
          streamBuffer.cancel();
          session.streamBuffer = null;
          session.isStreaming = false;
        }

        if (session.abortController) {
          session.abortController.abort();
          session.abortController = null;
        }
        if (session.interrupt) {
          session.interrupt = null;
        }
        if (session.pendingTaskLoadHistory) {
          session.pendingTaskLoadHistory = false;
          this.loadHistory();
        }
        return;
      }

      // event: interrupt - 追问/澄清，暂停正文渲染
      if (eventType === "interrupt") {
        // 终止 SSE（暂停了正文流）
        if (session.abortController) {
          session.abortController.abort();
          session.abortController = null;
        }
        if (session.streamBuffer) {
          session.streamBuffer.flush();
          session.streamBuffer = null;
        }
        session.isStreaming = false;
        // 复用现有 streaming 消息（首次追问），否则 push 新消息
        const streamingMsg = session.messages.find(
          (m) => m.role === "assistant" && m.status === "streaming"
        );
        if (streamingMsg) {
          streamingMsg.content = chunk?.question || "";
          streamingMsg.status = "done";
          streamingMsg.isInterrupt = true;
          streamingMsg.chapters = chunk?.chapters || [];
          // streamingMsg.buttons =
          //   chunk?.chips.length === 0
          //     ? chunk?.skipable
          //       ? [
          //           {
          //             id: "btn-skip",
          //             text: "跳过",
          //             action: "interrupt-skip",
          //           },

          //           {
          //             text: "关闭",

          //             id: "btn-close",
          //             action: "interrupt-close",
          //           },
          //         ]
          //       : [
          //           {
          //             text: "关闭",
          //             action: "interrupt-close",
          //             id: "btn-close",
          //           },
          //         ]
          //     : [];
        } else {
          // 第二次及后续追问：新增一条 assistant 消息
          session.messages.push({
            id: `assistant-interrupt-${Date.now()}`,
            sessionId: this.currentSessionId,
            role: "assistant",
            content: chunk?.question || "",
            status: "done",
            isInterrupt: true,
            chapters: chunk?.chapters || [],
            segments: [],
            createdAt: Date.now(),
            // 更改成按钮形式在没有选项的情况下
            // buttons:
            //   chunk?.chips.length === 0
            //     ? chunk?.skipable
            //       ? [
            //           {
            //             id: "btn-skip",
            //             text: "跳过",
            //             action: "interrupt-skip",
            //           },

            //           {
            //             text: "关闭",

            //             id: "btn-close",
            //             action: "interrupt-close",
            //           },
            //         ]
            //       : [
            //           {
            //             text: "关闭",
            //             action: "interrupt-close",
            //             id: "btn-close",
            //           },
            //         ]
            //     : [],
          });
        }
        // 存储 interrupt 数据到 session
        session.interrupt = {
          qa_index: chunk?.qa_index,
          question: chunk?.question || "",
          chips: chunk?.chips || [],
          input_type: chunk?.input_type || "text",
          skipable: chunk?.skipable !== false,
          chapters: chunk?.chapters || [],
        };
        return;
      }

      // event: task - 异步任务通知，仅记录 taskId
      if (eventType === "task") {
        console.log("[SSE] event:task, task_id:", chunk?.task_id);
        // 后端推送消息了, 软提醒不要了
        // if (chunk?.message) {
        //   import("vant").then(({ showToast }) => showToast(chunk.message));
        // }
        if (chunk?.task_id) {
          this._startTaskPolling(chunk.task_id, this.currentSessionId);
        }
        return;
      }

      // event: finish - 收尾当前流式消息（send 流专用；resume 流的 finish 在 resumeInterrupt 内单独处理）
      if (eventType === "finish") {
        if (streamBuffer) {
          streamBuffer.flush();
          session.streamBuffer = null;
        }
        // 空内容则移除气泡，否则标记完成（与 resume 的 finish 收尾一致）
        if (
          aiMsg &&
          !aiMsg.content &&
          (!aiMsg.segments || aiMsg.segments.length === 0)
        ) {
          const idx = session.messages.indexOf(aiMsg);
          if (idx !== -1) session.messages.splice(idx, 1);
        } else if (aiMsg) {
          aiMsg.status = "done";
        }
        if (session.streamTimeout) {
          clearTimeout(session.streamTimeout);
          session.streamTimeout = null;
        }
        if (session.pendingTaskLoadHistory) {
          session.pendingTaskLoadHistory = false;
          this.loadHistory();
        }
        session.isStreaming = false;
        session.abortController = null;
        session.interrupt = null;
        return;
      }

      // event: done - 流式结束，messageId 唯一来源
      if (eventType === "done") {
        const messageId = chunk?.message_id || "";
        if (messageId) {
          //保存原id, 确保打字机流结束后,for循环messageItem的key改变,导致组件重建
          if (!aiMsg._key) aiMsg._key = aiMsg.id
          aiMsg.id = messageId;
        }
        streamBuffer.flush();
        session.streamBuffer = null;
        if (session.streamTimeout) {
          clearTimeout(session.streamTimeout);
          session.streamTimeout = null;
        }
        if (session.pendingTaskLoadHistory) {
          session.pendingTaskLoadHistory = false;
          this.loadHistory();
        }
        if (session.interrupt) {
          session.interrupt = null;
        }
        aiMsg.status = "done";
        session.isStreaming = false;
        session.abortController = null;
        return;
      }

      // event: ui - 气泡附属交互控件（覆盖型）
      if (eventType === "ui") {
        if (!aiMsg) {
          return;
        }
        if (chunk.type === "buttons" && chunk.buttons) {
          aiMsg.buttons = chunk.buttons;
        } else if (chunk.data) {
          aiMsg.buttons = chunk.data;
        }
        return;
      }

      // event: message - 正文流式输出
      if (chunk.type === "content" || chunk.type === "markdown") {
        if (streamBuffer) {
          const isMarkdown =
            chunk.type === "markdown" || chunk.format === "markdown";
          const newFormat = isMarkdown ? "markdown" : "text";
          streamBuffer.setFormat(newFormat);
          streamBuffer.appendContent(chunk.delta);
        }
      } else {
        console.warn("[SSE] 未识别的数据块格式:", chunk);
      }
    },

    /**
     * 续推被 interrupt 暂停的对话（SSE 流式）
     * 响应格式与 _sendStream 相同，额外支持 event:finish 结束澄清环节
     * @param {object} data - { qa_index, answer?, is_skip?, is_close? }
     */
    async resumeInterrupt(data) {
      const session = this.sessions[this.currentSessionId];
      if (!session || !session.interrupt) return;
      // 防止连点
      if (session.isStreaming) {
        return;
      }

      const sessionId = this.currentSessionId;
      let answerText = "";
      let action = "";
      if (data.is_skip) {
        answerText = "略过此问题";
        action = "skip";
      } else if (data.is_close) {
        answerText = "";
        action = "terminate";
      } else {
        answerText = data.answer || "";
        action = "answer";
      }
      if (answerText) {
        session.messages.push({
          id: `user-${Date.now()}`,
          sessionId,
          role: "user",
          content: answerText,
          status: "done",
          createdAt: `${Date.now()}`,
        });
      }
      // 立即创建新 AI 消息（status: streaming），让三点加载动画立刻出现
      const isCloseMode = data.is_close;

      if (!isCloseMode) {
        session.messages.push({
          id: `assistant-${Date.now()}`,
          sessionId,
          role: "assistant",
          content: "",
          status: "streaming",
          segments: [],
          createdAt: Date.now(),
        });
      }
      const aiMsg = session.messages[session.messages.length - 1];
      const streamBuffer = isCloseMode ? null : createStreamBuffer(aiMsg);

      if (!isCloseMode) {
        session.streamBuffer = streamBuffer;
      }
      session.isStreaming = true;

      // 构造 SSE 请求
      const resumeUrl = resumeMessage.url + "/" + sessionId;
      const resumeBody = resumeMessage.formatBody(sessionId, {
        ...data,
        action: action,
        userId: this.userId,
      });
      console.log("[SSE] resume 发送 →", { url: resumeUrl, body: resumeBody });

      session.abortController = markRaw(
        createSSE(resumeUrl, {
          body: resumeBody,

          onMessage: (chunk, eventType) => {
            this._handleSSEEvent(
              session,
              aiMsg,
              streamBuffer,
              chunk,
              eventType
            );
          },

          onDone: () => {
            console.log("[SSE] resumeInterrupt onDone, aiMsg:", aiMsg);
            if (session.isStreaming) {
              if (streamBuffer) {
                streamBuffer.flush();
                session.streamBuffer = null;
              }
              if (aiMsg) {
                // 流结束时消息仍为空，移除空气泡
                if (
                  !aiMsg.content &&
                  (!aiMsg.segments || aiMsg.segments.length === 0)
                ) {
                  const idx = session.messages.indexOf(aiMsg);
                  if (idx !== -1) session.messages.splice(idx, 1);
                } else {
                  aiMsg.status = "done";
                }
              }
              session.isStreaming = false;
              session.abortController = null;
              if (session.pendingTaskLoadHistory) {
                session.pendingTaskLoadHistory = false;
                this.loadHistory();
              }
            }
          },

          onError: (err) => {
            console.error("[SSE] resume 流式错误:", err);
            if (streamBuffer) {
              streamBuffer.flush();
              session.streamBuffer = null;
            }
            if (aiMsg) {
              aiMsg.status = "error";
            }
            session.isStreaming = false;
            session.abortController = null;
          },
        })
      );
    },

    /**
     * 跳过当前 interrupt
     */
    async skipInterrupt(qaIndex) {
      await this.resumeInterrupt({
        qa_index: qaIndex,
        is_skip: true,
        is_close: false,
      });
    },

    /**
     * 关闭当前 interrupt
     */
    async closeInterrupt(qaIndex) {
      await this.resumeInterrupt({
        qa_index: qaIndex,
        is_skip: false,
        is_close: true,
      });
    },

    /**
     * 清除当前会话的 interrupt 状态（不发起请求）
     * 跳过/关闭/已回答时仅清除面板状态
     */
    clearInterrupt() {
      const session = this.sessions[this.currentSessionId];
      if (session) session.interrupt = null;
    },

    /**
     * 打开 Markdown 展示页（检测到后端返回 Markdown 格式时自动调用）
     * 通过路由跳转到 MarkdownView，传递 messageId 实现流式更新
     * @param {string} messageId - 消息 ID（MarkdownView 通过 chatStore 读取响应式内容）
     * @param {string} title - 页面标题
     */
    openMarkdownPopup(messageId, title = "文档") {
      // 通过路由跳转打开 MarkdownView 页面
      // MarkdownView 会根据 messageId 从 chatStore 读取消息内容，实现流式更新
      router.push({
        path: "/markdown-view",
        query: { title, messageId },
      });
    },

    /**
     * 重试失败的消息（在当前会话内操作）
     * @param {Object} message - 需要重试的消息对象
     */
    async retry(message) {
      const session = this.sessions[this.currentSessionId];
      if (!session) return;

      // 找到对应的用户消息索引
      const userMsgIndex = session.messages.findIndex(
        (m) => m.id === message.id
      );
      if (userMsgIndex === -1) return;

      // 删除 AI 回复消息（用户消息的下一条）
      session.messages.splice(userMsgIndex + 1, 1);
      // 删除用户消息
      session.messages.splice(userMsgIndex, 1);

      // 重新发送
      await this.send(message.content);
    },

    /**
     * 开始异步任务轮询
     *
     */
    _startTaskPolling(taskId, sessionId) {
      // 防止重复轮询
      if (this.taskPollers[taskId]) return;
      const POLL_INTERVAL = window.smartstaring.POLL_INTERVAL; //间隔
      const MAX_RETRIES = window.smartstaring.MAX_RETRIES; //最大次数
      const poller = {
        intervalId: null,
        sessionId,
        retryCount: 0,
      };
      poller.intervalId = setInterval(async () => {
        poller.retryCount++;
        if (poller.retryCount > MAX_RETRIES) {
          console.log("该任务查询60次没完成，自动断了,任务id是", taskId);
          this._stopTaskPolling(taskId);
          return;
        }
        try {
          const res = await getTaskStatus(taskId);
          if (res.status === "completed") {
            // 成功了停止轮询
            this._stopTaskPolling(taskId);
            if (res.sessionId && res.sessionId === this.currentSessionId) {
              const session = this.sessions[this.currentSessionId];
              if (session && !session.isStreaming && !session.interrupt) {
                await this.loadHistory();
              } else {
                if (session) {
                  session.pendingTaskLoadHistory = true;
                  console.log("正在澄清或对话，等完成了在执行加载历史");
                }
              }
            }
          }
        } catch (error) {
          console.log(error, "异步任务报错，自动关停");
          this._stopTaskPolling(taskId);
        }
      }, POLL_INTERVAL);
      this.taskPollers[taskId] = poller;
    },

    /**
     * 停止指定任务的轮询定时器
     * @param {string} taskId - 任务 ID
     */
    _stopTaskPolling(taskId) {
      const poller = this.taskPollers[taskId];
      if (poller) {
        clearInterval(poller.intervalId);
        delete this.taskPollers[taskId];
        console.log("停止该任务轮询", taskId);
      }
    },
  },
});
