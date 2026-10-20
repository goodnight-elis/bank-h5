/**
 * 流式输出 rAF 批量缓冲器
 *
 * 问题：
 *   SSE token 级分块时，每个 chunk 直接写入响应式状态（aiMsg.content += delta）
 *   会触发一次 Vue render flush。一秒几十次 mutation → 几十次重渲染 → 移动端卡顿。
 *
 * 解法：
 *   增量先累积到「非响应式」缓冲区，每帧（requestAnimationFrame）最多 flush 一次，
 *   把 N 次响应式写入合并成 1 次。
 *
 * 适用：流式增量（节流/合并）。注意这不是防抖——防抖要等「静止」才触发，
 * 而流式输出持续产生增量，永远不会静止，所以流式场景应用 rAF/节流，而非防抖。
 */

/**
 * 创建一个针对单个响应式消息对象的流式缓冲器
 * @param {object} target - 响应式消息对象（如 aiMsg）
 * @returns {{ appendContent, setContent, flush, cancel, setFormat }}
 */
export function createStreamBuffer(target) {
  // 非响应式累积区（plain string，写入不触发响应式）
  let pendingContent = ''
  let rafId = null
  // 当前分段格式（'text' | 'markdown'）
  let currentFormat = 'text'
  // 分段列表：[{ content: string, format: 'text' | 'markdown' }]
  let segments = []
  // 当前正在累积的分段
  let currentSegment = null

  /** 把缓冲区写入响应式目标并清空 */
  function applyPending() {
    if (pendingContent) {
      // 如果有分段，追加到当前分段
      if (currentSegment) {
        currentSegment.content += pendingContent
        // 同步到 target.segments
        target.segments = [...segments]
        // 同步更新 content，供 watcher 追踪（如 MessageList 滚动）
        target.content += pendingContent
      } else {
        // 无分段模式，直接追加到 content（向后兼容）
        target.content += pendingContent
      }
      pendingContent = ''
    }
  }

  /** 调度下一帧 flush（同一帧内多次调用只生效一次） */
  function schedule() {
    if (rafId != null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      applyPending()
    })
  }

  /**
   * 切换格式，创建新分段
   * @param {'text' | 'markdown'} format
   */
  function switchFormat(format) {
    if (format === currentFormat) return
    // 先冲刷当前缓冲区
    applyPending()
    // 更新格式
    currentFormat = format
    // 创建新分段
    currentSegment = { content: '', format }
    segments.push(currentSegment)
  }

  return {
    /** 追加内容增量（高频，走 rAF 合并） */
    appendContent(delta) {
      if (!delta) return
      pendingContent += delta
      schedule()
    },
    /**
     * 设置当前格式（如果格式变化，自动创建新分段）
     * @param {'text' | 'markdown'} format
     */
    setFormat(format) {
      if (!format) return
      // 如果是第一个分段，初始化
      if (segments.length === 0) {
        currentFormat = format
        currentSegment = { content: '', format }
        segments.push(currentSegment)
        target.segments = [...segments]
        return
      }
      // 格式变化时切换
      switchFormat(format)
    },
    /**
     * 同步冲刷缓冲区并取消未执行的 rAF
     * 在 onDone / onError / stop 时调用，确保最后一个增量不丢。
     */
    flush() {
      if (rafId != null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      applyPending()
    },
    /**
     * 直接整体覆盖 content（低频，如后端返回完整 content）
     * 先冲掉已缓冲的增量再覆盖，避免顺序错乱。
     */
    setContent(text) {
      // 先调用 flush 冲刷缓冲区（flush 必须定义在 setContent 之前）
      this.flush()
      target.content = text
    },
    /** 仅取消未执行的 rAF（不写入），用于内容已清空的销毁场景 */
    cancel() {
      if (rafId != null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      pendingContent = ''
    }
  }
}
