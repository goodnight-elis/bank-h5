<template>
  <div class="agent-header">
    <button
      type="button"
      class="icon-btn menu-btn"
      aria-label="菜单"
      @click="openDrawer"
    >
      <span class="menu-icon" aria-hidden="true">
        <img style="width: 24px;" src="@/assets/menu.png" />
        <!-- <span></span>
        <span></span>
        <span></span> -->
      </span>
    </button>
    <!-- 历史对话胶囊 -->
    <button
      v-if="showHistoryCapsule"
      type="button"
      class="history-toggle"
      aria-label="历史对话"
      @click="emit('clickHistoryCapsule')"
    >
      <span class="history-toggle-text">历史对话</span>
      <img style="width: 16px; height: 16px" src="@/assets/up.png" alt="" />
    </button>

    <button
      type="button"
      class="icon-btn close-btn"
      aria-label="关闭"
      @click="$emit('close')"
    >
      <img style="width: 24px;" src="@/assets/close-webView.png" />  
    </button>

    <!-- 抽屉 -->
    <van-popup
      v-model:show="isDrawerVisible"
      position="left"
      :style="{
        width: '80%',
        background: '#F7F8FA',
        maxWidth: '300px',
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }"
      :close-on-click-overlay="true"
      :close-on-popstate="true"
      class="more-drawer-popup"
      @touchstart="onDrawerTouchStart"
      @touchmove="onDrawerTouchMove"
      @touchend="onDrawerTouchEnd"
      teleport="#app"
      :safe-area-inset-bottom="true"
      :safe-area-inset-top="true"
    >
      <div class="drawer-content">
        <button
          type="button"
          class="new-chat-btn"
          @click="handleDrawerAction('newChat')"
        >
          <img
            src="@/assets/create.png"
            alt="新建对话"
            class="new-chat-icon"
            aria-hidden="true"
          />
          <span class="new-chat-title">新建对话</span>
        </button>

        <nav class="drawer-menu" aria-label="功能菜单">
          <!-- <button
            type="button"
            class="drawer-menu-item"
            @click="handleDrawerAction('settings')"
          >
            <img
              src="@/assets/love.png"
              alt="偏好设置"
              class="preference-icon"
              aria-hidden="true"
            />
            <span class="drawer-menu-text">偏好设置</span>
            <span class="drawer-arrow" aria-hidden="true"></span>
          </button> -->
          <button
            type="button"
            class="drawer-menu-item"
            @click="handleDrawerAction('history')"
          >
            <img
              src="@/assets/report.png"
              alt="报告历史"
              class="report-icon"
              aria-hidden="true"
            />
            <span class="drawer-menu-text">报告历史</span>
            <span class="drawer-arrow" aria-hidden="true">
              <img
                src="@/assets/right-arrow.png"
                alt="报告历史"
                width="20px"
                height="20px"
                aria-hidden="true"
              />
            </span>
          </button>
        </nav>
        <van-divider />
        <section class="dialog-history" aria-label="对话历史">
          <div class="dialog-history-header">
            <h2 class="dialog-history-title">对话历史</h2>
          </div>
          <!-- 加载中状态 -->
          <div v-if="loading" class="history-loading">
            <van-loading type="spinner" color="#ff6b35"></van-loading>
          </div>
          <!-- 空状态 -->
          <div
            v-else-if="sessions.length === 0 && !loading"
            class="history-empty"
          >
            <van-empty description="暂无对话历史" image-size="200" />
          </div>
          <!-- 会话列表 -->
          <div
            v-else-if="sessions.length !== 0 && !loading"
            class="dialog-history-list"
            :class="{ 'is-batch-delete': isBatchDeleteMode }"
            @touchstart.stop
            @touchmove.stop
            @touchend.stop
            @contextmenu.prevent
            @copy.prevent
            @selectstart.prevent
          >
            <van-pull-refresh
              v-model="refreshing"
              success-text="刷新成功"
              @refresh="onPullRefresh"
            >
            <div
              v-for="session in sessions"
              :key="session.id"
              class="history-item-wrapper"
            >
              <div
                class="history-item"
                :class="{
                  'is-active': session.id === chatStore.currentSessionId,
                  'is-selected':
                    isBatchDeleteMode && isSessionSelected(session.id),
                  'is-long-press':
                    longPressSessionId === session.id &&
                    session.id !== chatStore.currentSessionId,
                }"
                :data-session-id="session.id"
                @click="handleHistoryClick(session.id)"
                @touchstart="onHistoryTouchStart(session.id, $event)"
                @touchend="onHistoryTouchEnd"
                @mousedown.stop="onHistoryMouseDown(session.id, $event)"
                @mouseup.stop="onHistoryMouseUp"
                @touchmove="onHistoryTouchMove"
              >
                <span class="history-item-text">{{ session.title }}</span>
                <!-- 非批量删除模式下的三个点按钮 -->
                <button
                  v-if="session.id === chatStore.currentSessionId"
                  type="button"
                  class="history-item-more"
                  aria-label="更多操作"
                  @click.stop="openActionMenu(session, $event)"
                  @touchstart.stop
                  @mousedown.stop
                >
                  <span class="dots-icon" aria-hidden="true">
                    <img
                      style="width: 20px; height: 20px"
                      src="@/assets/his.png"
                      alt=""
                    />
                    <!-- <span></span>
                    <span></span> -->
                    <!-- <span></span> -->
                  </span>
                </button>
                <!-- 批量删除模式下的复选框 -->
                <span v-if="isBatchDeleteMode" class="checkbox-wrapper">
                  <span v-if="isSessionSelected(session.id)">
                    <img
                      style="width: 20px; height: 20px; margin-top: 3px"
                      src="@/assets/mult1.png"
                      alt=""
                    />
                  </span>
                  <span v-else>
                    <img
                      style="width: 20px; height: 20px; margin-top: 3px"
                      src="@/assets/mult2.png"
                      alt=""
                    />
                  </span>
                  <!-- <span
                    class="checkbox"
                    :class="{ 'is-checked': isSessionSelected(session.id) }"
                  >
                    <span
                      v-if="isSessionSelected(session.id)"
                      class="checkbox-icon"
                    ></span>
                  </span> -->
                </span>
              </div>
            </div>
            </van-pull-refresh>
          </div>
        </section>

        <!-- 批量删除操作栏 -->
        <div v-if="isBatchDeleteMode" class="batch-delete-actions">
          <!-- <div class="batch-delete-select-all">
            <span class="checkbox-wrapper">
              <span
                class="checkbox"
                :class="{ 'is-checked': isAllSelected }"
                @click="toggleSelectAll"
              >
                <span v-if="isAllSelected" class="checkbox-icon"></span>
              </span>
            </span>
            <span class="select-all-text">{{
              isAllSelected ? "取消全选" : "全选"
            }}</span>
          </div> -->
          <div class="batch-delete-buttons">
            <button
              type="text"
              class="batch-delete-cancel-btn"
              @click="exitBatchDeleteMode"
            >
              取消
            </button>
            <button
              type="text"
              class="batch-delete-confirm-btn"
              :disabled="selectedSessions.length === 0"
              @click="openBatchDeleteModal"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 历史对话操作菜单 -->
    <Teleport to="body">
      <div
        v-if="isActionMenuVisible && !isBatchDeleteMode && selectedSession"
        class="action-menu-overlay"
        @click="onOverLayClick"
      >
        <div
          class="action-menu-popup"
          :style="{
            top: menuPosition.top + 'px',
            left: menuPosition.left + 'px',
          }"
          @click.stop
        >
          <button
            type="button"
            class="action-menu-item edit-item"
            @click="openEditModal"
          >
            <img
              style="width: 20px; height: 20px"
              src="@/assets/edit2.png"
              alt=""
            />
            <span style="margin-left: 4px">修改标题</span>
          </button>
          <button
            type="button"
            class="action-menu-item"
            @click="enterBatchDeleteMode($event)"
          >
            <img
              style="width: 20px; height: 20px"
              src="@/assets/listDo.png"
              alt=""
            />
            <span style="margin-left: 4px">批量删除</span>
          </button>
          <button
            type="button"
            class="action-menu-item delete-item"
            @click="openDeleteModal"
          >
            <img
              style="width: 20px; height: 20px"
              src="@/assets/delte1.png"
              alt=""
            />
            <span style="margin-left: 1px">删除</span>
          </button>
        </div>
      </div>
    </Teleport>

    <!-- 删除确认弹窗 -->
    <van-popup
      v-model:show="isDeleteModalVisible"
      :style="{ width: '80%', maxWidth: '320px', borderRadius: '12px' }"
      :close-on-click-overlay="true"
      teleport="#app"
      :safe-area-inset-bottom="true"
      :safe-area-inset-top="true"
      class="confirm-modal-popup"
    >
      <div class="confirm-modal">
        <h3 class="modal-title">删除内容</h3>
        <p class="modal-message">删除内容后将无法恢复，确认删除选中内容？</p>
        <div class="modal-actions">
          <button
            type="button"
            class="modal-btn cancel-btn"
            @click="closeDeleteModal"
          >
            取消
          </button>
          <button
            type="button"
            class="modal-btn confirm-btn delete-confirm-btn"
            @click="confirmDelete"
          >
            确认
          </button>
        </div>
      </div>
    </van-popup>

    <!-- 批量删除确认弹窗 -->
    <van-popup
      v-model:show="isBatchDeleteModalVisible"
      :style="{ width: '80%', maxWidth: '320px', borderRadius: '12px' }"
      :close-on-click-overlay="true"
      class="confirm-modal-popup"
      teleport="#app"
      :safe-area-inset-bottom="true"
      :safe-area-inset-top="true"
    >
      <div class="confirm-modal">
        <h3 class="modal-title">批量删除</h3>
        <p class="modal-message">删除内容后将无法恢复，确认删除选中内容？</p>
        <div class="modal-actions">
          <button
            type="button"
            class="modal-btn cancel-btn"
            @click="closeBatchDeleteModal"
          >
            取消
          </button>
          <button
            type="button"
            class="modal-btn confirm-btn delete-confirm-btn"
            @click="confirmBatchDelete"
          >
            删除
          </button>
        </div>
      </div>
    </van-popup>

    <!-- 修改标题弹窗 -->
    <van-popup
      v-model:show="isEditModalVisible"
      :style="{ width: '80%', maxWidth: '320px', borderRadius: '12px' }"
      :close-on-click-overlay="true"
      class="edit-modal-popup"
      teleport="#app"
      :safe-area-inset-bottom="true"
      :safe-area-inset-top="true"
    >
      <div class="edit-modal">
        <h3 class="modal-title">修改标题</h3>
        <div class="input-wrapper">
          <input
            v-model="editTitleValue"
            type="text"
            id="nokeyboardinput"
            class="title-input"
            placeholder="请输入标题"
            maxlength="512"
          />
        </div>
        <div class="modal-actions">
          <button
            type="button"
            class="modal-btn cancel-btn"
            @click="closeEditModal"
          >
            取消
          </button>
          <button
            type="button"
            class="modal-btn confirm-btn edit-confirm-btn"
            @click="confirmEdit"
          >
            确认
          </button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
/**
 * 智能体对话页顶部导航栏
 *
 * 功能：
 * - 左侧菜单按钮：打开抽屉，展示新建对话、偏好设置、报告历史、对话历史列表
 * - 中间历史胶囊：显示上一期会话标题，点击触发纵向翻页切换到历史视图（由父组件控制）
 * - 右侧关闭按钮：返回上一页
 * - 对话历史列表：支持点击跳转、点击左侧三个点弹出修改标题/删除操作菜单
 *
 * Props:
 * - previousSession: 上一期会话数据，为 null 时不显示历史胶囊
 * - arrowDirection: 胶囊箭头方向 'up' | 'down'
 */
import { ref, computed, nextTick, watch, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { showToast, Divider } from "vant";
import { useChatStore } from "../../stores/chat";
import { getSessions, getGuidance } from "../../api/chat";
import { updateSessionTitle, batchDeleteSessions } from "../../api/session";

import { vibrate } from '@/utils/envAdapter'

const router = useRouter();
const route = useRoute();
const chatStore = useChatStore();
const isDrawerVisible = ref(false);
const isActionMenuVisible = ref(false);
const isDeleteModalVisible = ref(false);
const isEditModalVisible = ref(false);
const isBatchDeleteMode = ref(false);
const isBatchDeleteModalVisible = ref(false);
const selectedSession = ref(null);
const editTitleValue = ref("");
const menuPosition = ref({ top: 0, left: 0 });

/** 当前长按中的 session ID，用于控制高亮样式 */
const longPressSessionId = ref(null);

/** 长按状态控制 */
let longpressTimer = null;
const LONGPRESS_DELAY = 1000;
// 长按 不要触发浏览器Click
let longPressFired = false;
let suppressOverlayTimer = null;
watch(
  () => isDrawerVisible.value,
  (val) => {
    if (val == false) {
      exitBatchDeleteMode();
    }
  }
);
onUnmounted(() => {
  if (longpressTimer) {
    clearTimeout(longpressTimer);
  }
  if (suppressOverlayTimer) {
    clearTimeout(suppressOverlayTimer);
  }
});
/**
 * 按下事件（触摸或鼠标）
 */
function onHistoryTouchStart(sessionId, event) {
  console.log("触发了按下鼠标");
  if (isBatchDeleteMode.value) return;
  if (longpressTimer) {
    clearTimeout(longpressTimer);
    longpressTimer = null;
  }
  const currentItem = event.currentTarget;
  longpressTimer = setTimeout(() => {
    longPressSessionId.value = sessionId;
    const session = sessions.value.find((s) => s.id === sessionId);
    if (session) {
      const rect = currentItem.getBoundingClientRect();
      const menuHeight = 132;
      menuPosition.value = {
        top: rect.top - menuHeight - 4,
        left: Math.max(0, rect.right - 120),
      };
      selectedSession.value = session;
      isActionMenuVisible.value = true;
      longPressFired = true;
      clearTimeout(suppressOverlayTimer);
      suppressOverlayTimer = setTimeout(() => {
        longPressFired = false;
      }, 1000);
      nextTick(() => {
        const menuEl = document.querySelector(".action-menu-popup");
        if (menuEl) {
          const menuRect = menuEl.getBoundingClientRect();
          menuPosition.value = {
            top: rect.top - menuRect.height - 4,
            left: Math.max(0, rect.right - 120),
          };
        }
      });
      vibrate();
    }
  }, LONGPRESS_DELAY);
}

/**
 * 抬起事件（触摸或鼠标）
 */
function onHistoryTouchEnd() {
  if (longpressTimer) {
    clearTimeout(longpressTimer);
    longpressTimer = null;
  }
}

/**
 * 滑动或光标移出时取消长按判定
 */
function onHistoryMouseDown(sessionId, event) {
  onHistoryTouchStart(sessionId, event);
}

function onHistoryMouseUp() {
  if (longpressTimer) {
    clearTimeout(longpressTimer);
    longpressTimer = null;
  }
}

function onHistoryTouchMove() {
  if (longpressTimer) {
    clearTimeout(longpressTimer);
    longpressTimer = null;
  }
}
// 批量删除相关
const selectedSessions = ref([]);

// 计算属性：是否全选
const isAllSelected = computed(() => {
  return (
    sessions.value.length > 0 &&
    selectedSessions.value.length === sessions.value.length
  );
});

/** 历史会话列表（从后端接口获取） */
const sessions = ref([]);

/** 列表是否正在加载中（仅用于抽屉首次/手动重拉时展示 loading 骨架，下拉刷新不触发） */
const loading = ref(false);

/** 下拉刷新状态（van-pull-refresh v-model，与 loading 解耦避免刷新时列表被 v-if 掉） */
const refreshing = ref(false);

const props = defineProps({
  /** 是否显示历史对话胶囊 */
  showHistoryCapsule: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["close", "clickHistoryCapsule"]);

/**
 * 打开抽屉，并调用接口刷新历史会话列表
 */
async function openDrawer() {
  isDrawerVisible.value = true;
  await fetchSessions();
}

/**
 * 获取历史会话列表
 * 调用 GET /v1/chat/history/session/list/{user_id}
 * @param {Object} [options]
 * @param {boolean} [options.silent=false] 静默模式：下拉刷新时不切换 loading 避免列表被 v-if 掉
 */
async function fetchSessions({ silent = false } = {}) {
  if (!silent) loading.value = true;
  try {
    const res = await getSessions(chatStore.userId);
    // request.js 已统一处理错误，这里只需要验证返回数据
    // 兼容两种返回格式：直接返回数组 或 { sessions: [] }
    const sessionsList = Array.isArray(res)
      ? res
      : Array.isArray(res?.sessions)
      ? res.sessions
      : [];
    // 后端返回 { user_id, sessions, count }，映射为前端结构
    sessions.value = sessionsList.map((s) => ({
      id: s.session_id || s.id,
      title: s.title || "未命名会话",
      status: s.status || "",
      createdAt: s.created_at || "",
    }));
  } catch (err) {
    console.error("获取历史会话失败:", err);
    // 接口失败时不清空列表，保留上次数据
    // 错误已在 request.js 中统一提示
  } finally {
    if (!silent) loading.value = false;
  }
}

/**
 * 下拉刷新：以 silent 模式重拉列表，保证列表内容不闪。
 * 失败时 refreshing 仍会置回 false，van-pull-refresh 会自动收起。
 */
async function onPullRefresh() {
  try {
    await fetchSessions({ silent: true });
  } finally {
    refreshing.value = false;
  }
}

function closeDrawer() {
  isBatchDeleteMode.value = false;
  selectedSessions.value = [];
  isBatchDeleteModalVisible.value = false;
  isActionMenuVisible.value = false;
  isEditModalVisible.value = false;
  isDeleteModalVisible.value = false;
  isDrawerVisible.value = false;
}

// 暴露方法供父组件调用
defineExpose({ openDrawer, closeDrawer });

/**
 * 抽屉内右滑关闭手势
 */
let drawerTouchStartX = 0;
let drawerTouchStartY = 0;
let drawerSwiping = false;

function onDrawerTouchStart(e) {
  const touch = e.touches[0];
  drawerTouchStartX = touch.clientX;
  drawerTouchStartY = touch.clientY;
  drawerSwiping = true;
}

function onDrawerTouchMove(e) {
  if (!drawerSwiping) return;
  const touch = e.touches[0];
  const deltaX = touch.clientX - drawerTouchStartX;
  const deltaY = touch.clientY - drawerTouchStartY;
  // 水平滑动为主且向左滑动时阻止纵向滚动
  if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < 0) {
    // 只在事件可取消时才阻止默认行为
    if (e.cancelable) {
      e.preventDefault();
    }
  }
}

function onDrawerTouchEnd(e) {
  if (!drawerSwiping) return;
  drawerSwiping = false;
  const touch = e.changedTouches[0];
  const deltaX = touch.clientX - drawerTouchStartX;
  const deltaY = touch.clientY - drawerTouchStartY;
  // 左滑（右往左）超过 60px 且水平位移大于垂直位移，关闭抽屉
  if (deltaX < -60 && Math.abs(deltaX) > Math.abs(deltaY)) {
    closeDrawer();
  }
}

/**
 * 点击三个点 - 显示操作菜单（修改标题/删除）
 * 菜单定位在三个点按钮的下方，靠左对齐
 */
function openActionMenu(session, event) {
  console.log("点击3个点");

  selectedSession.value = session;
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  const menuHeight = 132;
  // 菜单右对齐到三个点下方，并避免超出左侧屏幕
  menuPosition.value = {
    top: rect.top - menuHeight - 4,
    left: Math.max(0, rect.right - 120),
  };

  isActionMenuVisible.value = true;
  // nextTick(() => {
  //   const menuEl = document.querySelector(".action-menu-popup");
  //   if (menuEl) {
  //     const menuRect = menuEl.getBoundingClientRect();
  //     menuPosition.value = {
  //       top: rect.top - menuRect.height - 4,
  //       left: Math.max(0, rect.right - 120),
  //     };
  //   }
  // });
  // 触觉反馈（如果支持）
  // if (navigator.vibrate) {
  //   navigator.vibrate(10);
  // }
}
/**
 * 关闭操作菜单
 */
function onOverLayClick() {
  if (longPressFired) {
    longPressFired = false;
    return;
  }
  closeActionMenu();
}
/**
 * 关闭操作菜单
 */
function closeActionMenu() {
  isActionMenuVisible.value = false;
  console.log(isActionMenuVisible.value, "关闭操作");
  longPressSessionId.value = null;
}

/**
 * 打开删除确认弹窗
 */
function openDeleteModal() {
  if (!selectedSession.value) return;
  isActionMenuVisible.value = false;
  longPressSessionId.value = null;
  isDeleteModalVisible.value = true;
}

/**
 * 关闭删除确认弹窗
 */
function closeDeleteModal() {
  isDeleteModalVisible.value = false;
  selectedSession.value = null;
}

/**
 * 确认删除
 * 调用 DELETE /v1/session/{session_id}
 */
async function confirmDelete() {
  if (!selectedSession.value) return;

  const sessionId = selectedSession.value.id;
  const isCurrentSession = sessionId === chatStore.currentSessionId;
  try {
    await batchDeleteSessions([sessionId]);
    // 从列表中移除
    sessions.value = sessions.value.filter((s) => s.id !== sessionId);
    showToast("删除成功");
    if (isCurrentSession) {
      router.push("/chat");
    }
  } catch (err) {
    console.error("删除会话失败:", err);
    showToast("删除失败");
  }
  closeDeleteModal();
}

/**
 * 打开修改标题弹窗
 */
function openEditModal() {
  if (!selectedSession.value) return;
  isActionMenuVisible.value = false;
  longPressSessionId.value = null;
  editTitleValue.value = selectedSession.value.title;
  isEditModalVisible.value = true;
}

/**
 * 关闭修改标题弹窗
 */
function closeEditModal() {
  isEditModalVisible.value = false;
  selectedSession.value = null;
  editTitleValue.value = "";
}

/**
 * 确认修改标题
 * 调用 PUT /v1/session/{session_id}/title
 */
async function confirmEdit() {
  if (!selectedSession.value) return;

  const newTitle = editTitleValue.value.trim();
  if (!newTitle) {
    showToast("标题不能为空");
    return;
  }

  try {
    await updateSessionTitle(selectedSession.value.id, newTitle);
    // 更新列表中的标题
    const session = sessions.value.find(
      (s) => s.id === selectedSession.value.id
    );
    if (session) {
      session.title = newTitle;
    }
    showToast("修改成功");
  } catch (err) {
    console.error("修改标题失败:", err);
    showToast("修改失败");
  }
  closeEditModal();
}

/**
 * 抽屉菜单操作分发
 * @param {'newChat'|'settings'|'history'} type - 操作类型
 */
async function handleDrawerAction(type) {
  if (type === "newChat") {
    // 跳转到 /chat，由 Chat.vue 路由 watcher 统一创建会话
    // 如果没有聊天不允许创建新会话
    if (
      chatStore.currentMessages.length === 1 &&
      chatStore.currentMessages[0].isWelcome
    ) {
      showToast("当前会话已是新会话，无需再次创建");
      return;
    }
    // 防止在新建对话路径没有ID参数时，push不生效问题
    if (route.path === "/chat") {
      await chatStore.createSession();
      const text = await getGuidance(chatStore.currentSessionId);
      console.log("提示初始化", text);
      const session = chatStore.currentSession;
      if (!session || session.messages.length > 0) return;
      session.messages.push({
        id: `assistant-welcome-${Date.now()}`,
        sessionId: chatStore.currentSessionId,
        role: "assistant",
        content: text,
        attachments: [],
        status: "done",
        isWelcome: true,
        createdAt: Date.now(),
      });
    }
    router.push("/chat");
    closeDrawer();
  } else if (type === "settings") {
    router.push("/preference");
    closeDrawer();
  } else if (type === "history") {
    router.push("/report-history");
    closeDrawer();
  }
}

/**
 * 点击历史会话项，跳转到对应对话页
 * - 操作菜单打开时不响应点击，避免误触
 * - 点击当前会话时不跳转，避免无意义刷新
 * - 批量删除模式下切换选中状态
 * @param {string} sessionId - 目标会话 ID
 */
function handleHistoryClick(sessionId) {
  console.log(isActionMenuVisible.value, "点击时候的活动状态");
  console.log(isBatchDeleteMode.value, "点击时候的批量删除状态");

  // 如果操作菜单打开中，不处理点击
  if (isActionMenuVisible.value) {
    return;
  }
  // 批量删除模式下，切换选中状态
  if (isBatchDeleteMode.value) {
    toggleSessionSelection(sessionId);
    return;
  }
  if (longpressTimer) {
    console.log("有定时器");
    clearTimeout(longpressTimer);
    longpressTimer = null;
  }
  // 点击当前会话不跳转
  if (sessionId === chatStore.currentSessionId) {
    closeDrawer();
    return;
  }
  closeDrawer();
  router.push(`/chat/${sessionId}`);
}

/**
 * 检查会话是否被选中
 * @param {string} sessionId - 会话 ID
 * @returns {boolean}
 */
function isSessionSelected(sessionId) {
  return selectedSessions.value.includes(sessionId);
}

/**
 * 切换单个会话的选中状态
 * @param {string} sessionId - 会话 ID
 */
function toggleSessionSelection(sessionId) {
  const index = selectedSessions.value.indexOf(sessionId);
  if (index > -1) {
    selectedSessions.value.splice(index, 1);
  } else {
    selectedSessions.value.push(sessionId);
  }
}

/**
 * 全选/取消全选
 */
function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedSessions.value = [];
  } else {
    selectedSessions.value = sessions.value.map((s) => s.id);
  }
}

/**
 * 进入批量删除模式
 */
function enterBatchDeleteMode(event) {
  if (event) event.stopPropagation();
  isActionMenuVisible.value = false;
  console.log(isActionMenuVisible.value, "批量删除开启");
  longPressSessionId.value = null;
  isBatchDeleteMode.value = true;
  selectedSessions.value = [];
}

/**
 * 退出批量删除模式
 */
function exitBatchDeleteMode() {
  isBatchDeleteMode.value = false;
  console.log(isBatchDeleteMode.value, "批量删除关闭");

  selectedSessions.value = [];
}

/**
 * 打开批量删除确认弹窗
 */
function openBatchDeleteModal() {
  if (selectedSessions.value.length === 0) {
    showToast("请选择要删除的对话");
    return;
  }
  isBatchDeleteModalVisible.value = true;
}

/**
 * 关闭批量删除确认弹窗
 */
function closeBatchDeleteModal() {
  isBatchDeleteModalVisible.value = false;
}

/**
 * 确认批量删除
 */
async function confirmBatchDelete() {
  if (selectedSessions.value.length === 0) return;
  const includesCurrentSession = selectedSessions.value.includes(
    chatStore.currentSessionId
  );
  try {
    // 调用批量删除接口
    await batchDeleteSessions(selectedSessions.value);

    // 从列表中移除已删除的会话
    sessions.value = sessions.value.filter(
      (s) => !selectedSessions.value.includes(s.id)
    );

    showToast(`成功删除 ${selectedSessions.value.length} 条对话`);
    if (includesCurrentSession) {
      router.push("/chat");
    }
    // 退出批量删除模式
    exitBatchDeleteMode();
  } catch (err) {
    console.error("批量删除会话失败:", err);
    showToast("删除失败，请重试");
  }

  closeBatchDeleteModal();
}
</script>

<style scoped>
.new-chat-title {
  font-family: PingFang SC;
  font-size: 14px;
  font-weight: bold;
  line-height: 22px;
  color: #1c1f23;
}
.agent-header {
  /* flex-shrink: 0; */
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: calc(env(safe-area-inset-top) + 20px) 12px 0;
  /* padding: 24px 24px; */
  /* background: rgba(254, 253, 253, 0.8); */
  background: linear-gradient(180deg, #f6f5f5 58%, #f3f3f700 100%);
  z-index: 100;
}

.icon-btn {
  width: 41px;
  height: 41px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border: 0;
  border-radius: 50%;
  box-shadow: 0 8px 24px rgba(37, 45, 61, 0.04);
  cursor: pointer;
  transition: background 0.3s, transform 0.2s;
}
.menu-btn {
  margin-left: -5px;
}
.close-btn {
  margin-right: -5px;
}
.icon-btn:active {
  background: #f5f5f5;
  transform: scale(0.96);
}

.menu-icon {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: flex-start;
}

.menu-icon span {
  display: block;
  width: 15px;
  height: 2px;
  background: #20242a;
  border-radius: 999px;
}

.menu-icon span:nth-child(2) {
  width: 11px;
}

.close-icon {
  position: relative;
  width: 20px;
  height: 20px;
}

.close-icon::before,
.close-icon::after {
  position: absolute;
  top: 9px;
  left: 0;
  width: 20px;
  height: 2px;
  content: "";
  background: #2a2d34;
  border-radius: 999px;
}

.close-icon::before {
  transform: rotate(45deg);
}

.close-icon::after {
  transform: rotate(-45deg);
}

.history-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 14px;
  background: rgba(255, 255, 255, 0.9);
  border: 0;
  border-radius: 24px;
  box-shadow: 0 8px 24px rgba(37, 45, 61, 0.04);
  color: #1f252d;
  font-size: 14px;
  font-weight: 400;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s;
}

.history-toggle:active {
  background: #e9eaec;
}

/* 抽屉样式 */
.more-drawer-popup {
  background: #f7f8fa;
}

.drawer-content {
  padding: 36px 12px 32px;
  height: 100%;
  overflow: visible;
  display: flex;
  flex-direction: column;
}

.new-chat-btn {
  width: 100%;
  height: 48px;
  display: flex;
  /* margin: 0 auto; */
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 18px;
  background: #fbf4ef;
  border: 1px solid #f2c7ad;
  border-radius: 10px;
  color: #1f252d;
  font-size: 15px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
}

.new-chat-icon {
  width: 24px;
  height: 24px;
}

.drawer-menu {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 24px;
}

.drawer-menu-item {
  width: 100%;
  height: 32px;
  display: grid;
  grid-template-columns: 22px 1fr 16px;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: 0;
  color: #1c1f23;
  font-size: 14px;
  font-weight: bold;
  text-align: left;
  cursor: pointer;
}

.drawer-menu-text {
  line-height: 22px;
}

.preference-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  background: none;
}

.report-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  border: none;
  transform: none;
}

.drawer-arrow {
  position: relative;
  justify-self: end;
}

.dialog-history {
  flex: 1;
  flex-shrink: 1;
  overflow: hidden;
  /* margin-top: 26px;
  padding: 21px 12px 0;
  border-top: 1px solid #eceef1;
  max-height: calc(100vh - 280px);
  overflow-y: auto; */
}
/* .dialog-history-list {
  margin-top: 26px;
  padding: 21px 12px 0;
  border-top: 1px solid #eceef1;
  max-height: calc(100vh - 375px);
  overflow-y: auto;
  padding-bottom: env(safe-area-inset-bottom);
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
} */
.dialog-history-list {
  height: 100%;
  overflow-y: auto;
  padding-bottom: env(safe-area-inset-bottom);
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
.dialog-history-list * {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}

/* .dialog-history-list.is-batch-delete {
  max-height: calc(100vh - 396px - env(safe-area-inset-bottom));
  padding-bottom: 70px;
} */

.dialog-history-list.is-batch-delete {
  max-height: calc(100vh - 304px - env(safe-area-inset-bottom));
  padding-bottom: 70px;
}

.dialog-history-title {
  margin: 0;
  color: #9ca3ad;
  font-size: 12px;
  font-weight: 400;
  line-height: 1;
}

.dialog-history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.batch-delete-btn {
  padding: 4px 10px;
  background: transparent;
  border: 1px solid #ff4d4f;
  border-radius: 4px;
  color: #ff4d4f;
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s;
}

.batch-delete-btn:active {
  background: #ff4d4f;
  color: #fff;
}

.batch-cancel-btn {
  padding: 4px 10px;
  background: #f5f5f5;
  border: 0;
  border-radius: 4px;
  color: #666;
  font-size: 12px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s;
}

.batch-cancel-btn:active {
  background: #e8e8e8;
}

.history-header-more {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: 0;
  cursor: pointer;
}

/* 加载中 / 空状态提示 */
.history-loading,
.history-empty {
  padding: 16px 0;
  color: #9ca3ad;
  font-size: 13px;
  text-align: center;
}

.history-item-wrapper {
  position: relative;
}

.history-item {
  display: flex;
  align-items: center;
  width: 100%;
  height: 38px;
  padding: 0 12px;
  gap: 8px;
  background: transparent;
  color: #20262e;
  font-size: 14px;
  font-weight: 400;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}

/* 左侧三个点按钮 */
.history-item-more {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  padding: 0;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.dots-icon {
  display: flex;
  color: #a5a5a5;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.dots-icon span {
  display: block;
  width: 3px;
  height: 3px;
  background: #a5a5a5;
  border-radius: 50%;
}

.history-item-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 当前会话高亮 */
.history-item.is-active {
  background: #fff;
  color: #1c1f23;
  font-weight: 500;
  border-radius: 10px;
}

.history-item.is-long-press {
  background: #fff;
}

/* 批量删除模式下的选中项高亮 */
/* .history-item.is-selected {
  background: rgba(255, 117, 56, 0.16);
} */

/* 操作菜单弹窗样式 */
.action-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0);
  /* background: green; */
}

.action-menu-popup {
  position: fixed;
  z-index: 10001;
  min-width: 120px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.action-menu-item {
  width: 100%;
  /* height: 44px; */
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 10px 12px 6px 10px;
  background: #fff;
  border: 0;
  color: #1c1f23;
  font-size: 14px;
  font-family: PingFang SC;
  font-weight: 400;
  cursor: pointer;
  transition: background 0.2s;
}
:deep(.van-icon) {
  margin-right: 2px;
}
.action-menu-item:active {
  background: #f5f5f5;
}

.edit-item {
  color: #1c1f23;
}

.delete-item {
  color: #ff4d4f;
}
.batch-delete-item {
  color: #e32525;
}
.action-item-icon {
  width: 18px;
  height: 18px;
}

.edit-action-icon {
  position: relative;
}

.edit-action-icon::before {
  position: absolute;
  top: 0;
  left: 0;
  content: "";
  width: 14px;
  height: 14px;
  border: 1.5px solid currentColor;
  border-radius: 2px;
  transform: rotate(-45deg);
}

.edit-action-icon::after {
  position: absolute;
  top: 8px;
  left: 8px;
  content: "";
  width: 9px;
  height: 1.5px;
  background: currentColor;
  border-radius: 1px;
  transform: rotate(-45deg);
}

.delete-action-icon {
  position: relative;
  width: 16px;
  height: 16px;
}

.delete-action-icon::before {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 1.5px;
  background: currentColor;
  border-radius: 1px;
  transform: translate(-50%, -50%) rotate(45deg);
}

.delete-action-icon::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 1.5px;
  background: currentColor;
  border-radius: 1px;
  transform: translate(-50%, -50%) rotate(-45deg);
}

/* 弹窗样式 */
.confirm-modal-popup,
.edit-modal-popup {
  background: none;
}

.confirm-modal,
.edit-modal {
  padding: 24px;
  background: #f7f8fa;
  border-radius: 12px;
}

.modal-title {
  margin: 0 0 16px;
  color: #1c1f23;
  font-size: 16px;
  font-weight: bold;
  line-height: 24px;
  text-align: center;
}

.modal-message {
  margin: 0 0 24px;
  color: #1c1f23;
  font-size: 14px;
  font-weight: normal;
  line-height: 22px;
  text-align: center;
}

.input-wrapper {
  margin-bottom: 24px;
}

.title-input {
  width: 100%;
  height: 40px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  color: #333;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
  outline: none;
  transition: all 0.2s;
}

.title-input:focus {
  background: #fff;
  border-color: none;
}

.title-input::placeholder {
  color: #999;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.modal-btn {
  flex: 1;
  height: 48px;
  padding: 0 16px;
  background: transparent;
  border: 0;
  border-radius: 240px;
  color: #333;
  font-size: 14px;
  font-weight: 400;
  line-height: 36px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: #fff;
  color: #666;
}

.cancel-btn:active {
  background: #e8e8e8;
}

.confirm-btn {
  background: #ff7538;
  color: #fff;
  box-shadow: 0px 4px 16px 0px rgba(170, 99, 68, 0.1);
}

.confirm-btn:active {
  background: #e68900;
}

.delete-confirm-btn {
  background: #ff4d4f;
}

.delete-confirm-btn:active {
  background: #e64547;
}

.new-chat-btn:active,
.drawer-menu-item:active,
.history-item:active {
  opacity: 0.7;
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.2s ease;
}

.drawer-fade-enter-active .more-drawer,
.drawer-fade-leave-active .more-drawer {
  transition: transform 0.2s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-fade-enter-from .more-drawer,
.drawer-fade-leave-to .more-drawer {
  transform: translateX(-100%);
}

/* 批量删除操作栏 */
.batch-delete-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0 16px;
  padding-bottom: calc(
    env(safe-area-inset-bottom)
  ); /* 适配 iPhone 底部安全区 */
  padding-bottom: calc(
    const(safe-area-inset-bottom)
  ); /* 适配 iPhone 底部安全区 */
  background: #f7f8fa;
  z-index: 1000;
}

.batch-delete-select-all {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.select-all-text {
  color: #20262e;
  font-size: 14px;
  font-weight: 400;
}

.selected-count {
  margin-left: auto;
  color: #9ca3ad;
  font-size: 12px;
}

.batch-delete-buttons {
  display: flex;
  gap: 12px;
}

.batch-delete-cancel-btn,
.batch-delete-confirm-btn {
  flex: 1;
  height: 40px;
  background: transparent;
  border: 0;
  color: #3d3d3d;
  font-size: 14px;
  font-weight: normal;
  cursor: pointer;
  transition: all 0.2s;
}

.batch-delete-cancel-btn:active {
  background: #e8e8e8;
}

.batch-delete-confirm-btn {
  color: #ff4e4e;
}

.batch-delete-confirm-btn:active {
  color: #ff4e4e;
}

.batch-delete-confirm-btn:disabled {
  color: #ff4e4e;
  cursor: not-allowed;
}

/* 复选框样式 */
.checkbox-wrapper {
  flex-shrink: 0;
  display: inline-block;
}

.checkbox {
  position: relative;
  display: inline-block;
  width: 18px;
  height: 18px;
  background: #fff;
  border: 1.5px solid #d9d9d9;
  border-radius: 100%;
  cursor: pointer;
  transition: all 0.2s;
}

.checkbox.is-checked {
  background: #ff7538;
}

.checkbox-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 7px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: translate(-50%, -60%) rotate(45deg);
}
</style>

