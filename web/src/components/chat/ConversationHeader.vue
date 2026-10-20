<template>
  <!-- 对话页头部：问候语 + 重要信息汇报卡片 -->
  <!-- 每次对话（新增/历史）都会展示此区域 -->
  <div class="conversation-header">
    <!-- 问候语区域 -->
    <section class="hero-section">
      <div class="greeting-row">
        <div class="avatar-container">
          <img src="@/assets/IP3x.png" alt="" class="greeting-icon" />
        </div>
        <div class="text-section">
          <h1 class="greeting-title">{{ greetingText }}</h1>
          <p class="greeting-subtitle">我是掌银小助，有事随时找我</p>
        </div>
      </div>
      <!-- <div class="report-time">
        <span>{{ reportTimeText }}</span>
        <span class="down-arrow" aria-hidden="true">↓</span>
      </div> -->
    </section>

    <!-- 重要信息汇报卡片网格 -->
    <section class="summary-grid" aria-label="重要信息汇报">
      <button
        v-for="item in summaryItems"
        :key="item.label"
        type="button"
        class="summary-card"
        @click="handleCardClick(item)"
      >
        <div class="card-content">
          <span class="card-main">
            <strong class="card-number">{{ item.count }}</strong>
            <span class="card-label">{{ item.label }}</span>
          </span>
          <img src="@/assets/router.png" alt="" class="card-arrow" />
        </div>
      </button>
    </section>
  </div>
</template>

<script setup>
/**
 * 对话页头部组件（随消息列表滚动）
 *
 * 展示内容：
 * - 根据时段动态问候语（早上好/中午好/下午好/晚上好）
 * - 汇报时间文案
 * - 重要信息汇报卡片网格（待办事项、异常交易等）
 * 点击卡片跳转到对应功能页。
 */
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getToDoCount, getToDounreadCount } from "../../api/chat";
import { jumpChatBIApp } from "@/utils/common";
import { showToast } from "vant";

const router = useRouter();

/**
 * 根据当前小时数动态生成问候语
 * 5-11点：早上好 | 12-13点：中午好 | 14-17点：下午好 | 其他：晚上好
 */
const greetingText = computed(() => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "早上好";
  if (hour >= 12 && hour < 14) return "中午好";
  if (hour >= 14 && hour < 18) return "下午好";
  return "晚上好";
});

/**
 * 汇报时间文案（后续可对接后端实时数据）
 */
const reportTimeText = computed(() => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `截至 ${hours}:${minutes}，有以下重要信息汇报`;
});

/**
 * 汇报卡片数据（后续对接后端接口获取实时数据）
 * count: 待处理数量 | label: 卡片标题 | path: 点击跳转路径
 * isLiked: 是否已点赞 | isDisliked: 是否已点踩
 */
const summaryItems = ref([
  {
    count: 0,
    label: "待办事项",
    path: "",
    isLiked: false,
    isDisliked: false,
  },
  {
    count: 0,
    label: "动账提醒",
    path: "",
    isLiked: false,
    isDisliked: false,
  },
]);

onMounted(async () => {
  const data = {
    homePageFlg: true,
    firstCall: true,
  };
  // Promise.all([
  //   getToDoCount(data),
  //   getToDounreadCount(data)
  // ]).then(([todoRes, unreadRes]) => {
  //   summaryItems[0].count = todoRes
  //   console.log('334334', todoRes, unreadRes)
  // });
  const res = await getToDoCount(data);
  summaryItems.value[0].count = res?.data;
  summaryItems.value[0].path = res?.url;
  const resA = await getToDounreadCount(data);
  summaryItems.value[1].count = resA?.data;
  summaryItems.value[1].path = resA?.url;
});
/**
 * 卡片点击事件：跳转到对应功能页
 * @param {Object} item - 卡片数据
 */
function handleCardClick(item) {
  if (item.path) {
    //app跳转 判断桥方法是否存在
    jumpChatBIApp(item.path);
  } else {
    showToast("跳转失败");
  }
}
</script>

<style scoped>
/* 对话头部容器 */
.conversation-header {
  flex-shrink: 0;
}

/* 问候语区域 */
.hero-section {
  margin-bottom: 24px;
}

.greeting-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.avatar-container {
  width: 100px;
  height: auto;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.greeting-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.text-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.greeting-title {
  margin: 0;
  font-size: 24px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: 0.5px;
  color: #202328;
}

.greeting-subtitle {
  margin: 0;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
  color: #8e98a6;
}

.report-time {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.4;
  letter-spacing: 0.5px;
  color: #8e98a6;
  white-space: nowrap;
}

.down-arrow {
  transform: translateY(-1px);
}

/* 汇报卡片网格：两列布局 */
/* .summary-grid {
  display: flex;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 20px;
  justify-content: space-between;
} */
.summary-grid {
  display: grid;                              /* ← flex → grid */
  grid-template-columns: repeat(2, 1fr);      /* 现在真正生效了 */
  gap: 12px;                                  /* 间距固定 12px，不再受容器宽度影响 */
  margin-bottom: 20px;
  /* justify-content: space-between 删掉 */
}

/* 单张汇报卡片 */
.summary-card {
  position: relative;
  display: flex;
  flex-direction: column;
  /* width: 171.5px; */
  min-height: 66px;
  padding: 12px 18px 13px 18px;
  background: rgba(255, 255, 255, 0.92);
  border: 0;
  border-radius: 13px;
  box-shadow: -2px 0px 4px 0px rgba(0, 0, 0, 0.02),
    2px 0px 4px 0px rgba(0, 0, 0, 0.02), 0px 2px 4px 0px rgba(0, 0, 0, 0.02);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 0.15s;
}

.summary-card:active {
  transform: scale(0.98);
}

/* 卡片内容区域 */
.card-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 10px;
}

/* 卡片底部互动图标区域 */
.card-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

/* 互动按钮 */
.action-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.action-btn:active {
  transform: scale(0.9);
}

/* 互动图标 */
.action-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  transition: all 0.2s ease;
}

/* 激活状态的按钮 */
.action-btn.active .action-icon {
  filter: brightness(0.85);
  transform: scale(1.1);
}

/* 卡片左侧：数字 + 标签 */
.card-main {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.card-number {
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  color: #151920;
}

.card-label {
  font-size: 14px;
  font-weight: 430;
  line-height: 1;
  color: #1f252c;
}

/* 卡片右侧箭头图标（CSS 绘制） */
.card-arrow {
  position: relative;
  width: 13px;
  margin-top: 19px;
  flex: 0 0 auto;
  left: 1px;
}

/* 小屏幕适配（360px 以下） */
@media (max-width: 360px) {
  .conversation-header {
    padding: 0;
  }

  .summary-grid {
    gap: 10px;
  }

  .report-time {
    font-size: 14px;
  }
}
</style>
