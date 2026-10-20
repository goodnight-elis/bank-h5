/**
 * useSafeArea - 安全区域适配组合式函数
 *
 * 通过 CSS env(safe-area-inset-*) 获取安全区域值，
 * 将安全区域值写入 CSS 变量，供全局样式使用。
 *
 * 使用方式：
 *   // 在 App.vue 或根组件中调用一次
 *   useSafeArea()
 *
 *   // CSS 中使用
 *   .header { padding-top: var(--safe-top, 0); }
 *   .footer { padding-bottom: var(--safe-bottom, 0); }
 */

/**
 * 初始化安全区域适配
 */
export function useSafeArea() {
  /**
   * 更新安全区域 CSS 变量
   */
  function updateSafeArea() {
    const root = document.documentElement
    root.style.setProperty('--safe-top', 'env(safe-area-inset-top, 0px)')
    root.style.setProperty('--safe-bottom', 'env(safe-area-inset-bottom, 0px)')
    root.style.setProperty('--safe-left', 'env(safe-area-inset-left, 0px)')
    root.style.setProperty('--safe-right', 'env(safe-area-inset-right, 0px)')
  }

  // 初始化
  updateSafeArea()

  // 监听屏幕方向变化（横竖屏切换时重新计算）
  if (typeof window !== 'undefined') {
    window.addEventListener('orientationchange', () => {
      setTimeout(updateSafeArea, 300)
    })

    window.addEventListener('resize', () => {
      updateSafeArea()
    })
  }

  return {
    updateSafeArea
  }
}
