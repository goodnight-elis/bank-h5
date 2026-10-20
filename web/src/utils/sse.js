/**
 * SSE (Server-Sent Events) 封装
 * 基于 fetch + ReadableStream 实现流式数据接收
 *
 * 遵循 SSE 规范（https://html.spec.whatwg.org/multipage/server-sent-events.html）：
 * - 消息�?\n\n（双换行）分�?
 * - 支持多行 data: 拼接
 * - 捕获 event: 字段传递给回调
 * - 正确处理 TextDecoder stream 模式收尾
 */

import { getAuthHeaders as getAppHeaders } from "./envAdapter";
import { goToLogin } from "./envAdapter";
import { showFailToast,showConfirmDialog } from "vant";
/**
 * 创建 SSE 连接
 * @param {string} url - 请求地址
 * @param {object} options - 配置选项
 * @param {object} options.body - 请求�?
 * @param {object} options.headers - 请求�?
 * @param {function} options.onMessage - 收到消息回调
 * @param {function} options.onDone - 完成回调（仅执行一次）
 * @param {function} options.onError - 错误回调
 * @returns {object} 包含 abort 方法的对�?
 */
export function createSSE(url, { body, headers, onMessage, onDone, onError }) {
  const controller = new AbortController();
  let finished = false; // 防止 onDone 重复执行

  // 注入 APP 上下文请求头（Authorization / X-User-Id / X-App-Session-Id�?
  const requestHeaders = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    ...getAppHeaders(),
    ...headers,
  };

  console.log("[SSE] fetch 请求 →", { url, method: "POST", body: body });
  fetch(url, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentData = ""; // 累积当前消息�?data 行（支持多行拼接�?
      let currentEvent = ""; // 当前消息�?event 类型

      /**
       * 处理一条完整的 SSE 消息
       * SSE 消息�?\n\n 分隔，可能包含多�?data:
       * @param {string} eventType - SSE event 字段�?
       */
      function dispatchMessage(eventType) {
        if (!currentData) return;
        const data = currentData.trim();
        currentData = ""; // 重置

        // 过滤空数�?
        if (!data) return;

        // 新规范：所有结束信号统一�?event:done 处理，不再处�?[DONE] 纯文�?

        try {
          const parsed = JSON.parse(data);
          // 接收后端的的数据，如果发送的是对象并且没有event
          // 做判�?
          // console.log("当前接收的event", eventType);
          console.log("当前接收的event", eventType,"当前接收的data", data);
          // console.log("转换后的Data", parsed);

          // 临时调试：打印非 message 事件的完整数据（message 是流式增量，数据量大不打印）
          // if (eventType && eventType !== "message") {
          //   console.log(
          //     `[SSE-DEBUG] event:${eventType} →`,
          //     parsed,
          //     "原始data:",
          //     data
          //   );
          // }
          onMessage?.(parsed, eventType || "");
        } catch (e) {
          console.warn("[SSE] JSON 解析失败:", data, e);
        }
      }

      /**
       * 处理缓冲区中的完整消息（�?\n\n 分隔�?
       */
      function processBuffer() {
        // �?\n\n 分割完整消息
        const messages = buffer.split("\n\n");
        // 最后一段可能不完整，保留到下次
        buffer = messages.pop() || "";

        for (const msg of messages) {
          if (!msg.trim()) continue;

          // 按行解析，拼接多�?data: 和捕�?event:
          const lines = msg.split("\n");
          currentEvent = ""; // 每条消息重置 event
          for (const line of lines) {
            // 忽略注释行（: 开头）和空�?
            if (line.startsWith(":") || line === "") continue;
            // 捕获 event: 字段
            if (line.startsWith("event:")) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              const value = line.slice(5);
              // 多行 data: �?\n 拼接（SSE 规范�?
              currentData += (currentData ? "\n" : "") + value;
            }
          }
          // 消息结束，分发（传入 event 类型�?
          dispatchMessage(currentEvent);
        }
      }

      /**
       * 收尾：确�?onDone 只执行一�?
       */
      function finish() {
        if (finished) return;
        finished = true;
        onDone?.();
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 修复缺陷 6：stream 模式收尾�?flush 剩余字节
        const rawText = decoder.decode(value, { stream: true });
        buffer += rawText;
        // 接口报错统一处理
        if(rawText.includes('errorCode')) {
          let dataSse =JSON.parse(rawText);
          // 401登出
          if(dataSse?.errorCode === "120401") {
              // 会话过期：弹窗确认后跳转，不允许取消
              showConfirmDialog({
                title: "提示",
                message: "会话已过期，请重新登录",
                confirmButtonText: "确定",
                showCancelButton: false, // 不显示取消按�?
                closeOnOverlayClick: false, // 点击遮罩层不关闭
                closeOnClickAction: false, // 点击按钮后不自动关闭（等待跳转完成）
              })
                .then(() => {
                  // 确认后执行跳�?
                  goToLogin();
                })
                .catch(() => {
                  // 理论上不会走到这里（没有取消按钮�?
                });
              break; 
          }
          // �?01登出, 报错信息统一处理
          const errorMsg = dataSse?.errorMsg || "请求失败";
          showFailToast(errorMsg);
          throw new Error(dataSse?.errorMsg);
        }
        
        if (rawText.includes("interrupt")) {
          console.log(
            "[SSE-DEBUG] 包含 interrupt 的原始数据块:",
            JSON.stringify(rawText)
          );
        }
        processBuffer();
      }

      // 修复缺陷 6：循环结束后 flush TextDecoder 剩余字节
      buffer += decoder.decode(new Uint8Array());
      // 修复缺陷 3：处理最后残留的 buffer
      if (buffer.trim()) {
        currentEvent = "";
        const lines = buffer.split("\n");
        for (const line of lines) {
          if (line.startsWith(":") || line === "") continue;
          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            const value = line.slice(5);
            currentData += (currentData ? "\n" : "") + value;
          }
        }
        dispatchMessage(currentEvent);
      }

      finish();
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        onError?.(err);
      }
    });

  return {
    abort: () => controller.abort(),
  };
}
