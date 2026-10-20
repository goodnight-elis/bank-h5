<template>
  <div class="report-page">
    <!-- 顶部导航栏 -->
    <div class="report-header">
      <button class="back-btn" @click="handleBack">
        <img
          src="/src/assets/back-btn.png"
          style="width: 24px; height: 24px;"
          alt=""
        />
      </button>
      <h1 class="header-title">历史报告</h1>
      <button class="more-btn">
        <van-popover v-model:show="showPoer" style="position: relative">
          <div
            @click="toggleBatchMode"
            style="
              display: flex;
              position: absolute;
              width: 132px;
              height: 54px;
              right: -20px;
              border-radius: 12px;
              background: #fefdfc;
              border: 1px solid #ffffff;
              padding-top: 15px;
              padding-left: 10px;
              box-shadow: 0px 4px 16px 0px rgba(0, 0, 0, 0.05);
            "
          >
            <img
              src="/src/assets/listDo.png"
              style="width: 22px; height: 22px"
              alt=""
            />
            <span
              style="
                line-height: 22px;
                font-size: 14px;
                color: #1c1f23;
                margin-left: 5px;
              "
              >批量操作</span
            >
          </div>
          <template #reference>
            <img src="/src/assets/moreBtn.png" style="width: 40px" alt="" />
          </template>
        </van-popover>
      </button>
    </div>

    <!-- Tab 切换 + 内容区域 -->
    <van-tabs
      v-model:active="activeTab"
      :swipeable="true"
      class="tabs-class"
      :duration="0.3"
      background="none"
      line-width="20px"
      v-if="!isBatchMode"
    >
      <van-tab
        v-for="tab in tabs"
        :key="tab.value"
        :title="tab.label"
        :name="tab.value"
      >
        <van-pull-refresh
          v-model="refreshing"
          success-text="刷新成功"
          @refresh="onRefresh"
        >
          <div class="report-list">
            <div
              v-for="report in filteredReports"
              :key="report.id"
              class="report-item"
              @click="handleReportClick(report)"
            >
              <div class="report-body">
                <h3 class="report-title">{{ report?.title }}</h3>
                <div class="report-meta">
                  <span class="report-tag" :class="'tag-' + report.reportType">{{
                    getTypeLabel(report.reportType)
                  }}</span>
                  <span class="report-date">{{
                    formatDate(report.createdAt)
                  }}</span>
                </div>
              </div>
            </div>
            <div v-if="filteredReports.length === 0 && !loading" class="empty-state">
              <van-empty description="暂无数据" image-size="200" />
            </div>
          </div>
        </van-pull-refresh>
      </van-tab>
    </van-tabs>

    <!-- 批量模式下的报告列表 -->
    <van-pull-refresh
      class="report-list-batch-wrap"
      v-model="refreshing"
      success-text="刷新成功"
      @refresh="onRefresh"
      v-if="isBatchMode"
    >
      <div class="report-list-batch">
        <div
          v-for="report in filteredReports"
          :key="report.id"
          class="report-item"
          @click="toggleSelect(report.id)"
        >
        <!-- <input
          type="checkbox"
          class="report-checkbox"
          :checked="selectedIds.has(report.id)"
          @click.stop
          @change="toggleSelect(report.id)"
        /> -->
        <div class="report-checked">
          <span v-if="isReportslected(report.id)">
            <img src="@/assets/mult1.png" alt="" />
          </span>
          <span v-else>
            <img src="@/assets/mult2.png" alt="" />
          </span>
        </div>
        <div class="report-body">
          <h3 class="report-title">{{ report.title }}</h3>
          <div class="report-meta">
            <span class="report-tag" :class="'tag-' + report.reportType">{{
              getTypeLabel(report.reportType)
            }}</span>
            <span class="report-date">{{ formatDate(report.createdAt) }}</span>
          </div>
        </div>
        </div>
        <div v-if="filteredReports.length === 0 && !loading" class="empty-state">
          <van-empty description="暂无数据" image-size="200" />
        </div>
      </div>
    </van-pull-refresh>

    <!-- 批量操作栏 -->
    <div class="batch-actions" v-if="isBatchMode">
      <label class="select-all">
        <!-- <input
          type="checkbox"
          :checked="isAllSelected"
          @change="toggleSelectAll"
          style="border-radius: 24px"
        /> -->
        <div
          style="
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
          "
          v-if="isAllSelected"
          @click="toggleSelectAll"
        >
          <img
            style="width: 20px; height: 20px"
            src="@/assets/mult1.png"
            alt=""
          />
        </div>
        <div
          style="
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
          "
          v-else
          @click="toggleSelectAll"
        >
          <img
            style="width: 20px; height: 20px"
            src="@/assets/mult2.png"
            alt=""
          />
        </div>
        <span style='fontSize: 12px'>全选</span>
      </label>
      <div class="batch-right">
        <button class="cancel-btn" @click="toggleBatchMode">取消</button>
        <button
          class="delete-btn"
          :disabled="selectedIds.size === 0"
          @click="showDeleteConfirm"
        >
          删除<span v-if="selectedIds.size > 0">({{ selectedIds.size }})</span>
        </button>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div class="modal-overlay" v-if="showDeleteModal" @click="cancelDelete">
      <div class="modal-content" @click.stop>
        <h3 class="modal-title">删除内容</h3>
        <p class="modal-message">删除内容后将无法恢复，确认删除选中内容？</p>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="cancelDelete">取消</button>
          <button class="modal-btn confirm" @click="confirmDelete">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  Tab as VanTab,
  Tabs as VanTabs,
  PullRefresh as VanPullRefresh,
} from "vant";
import { getReportList, batchDeleteReports } from "@/api/report";
import { getTypeLabel } from "@/utils/common";
import { useChatStore } from "@/stores/chat";

const router = useRouter();
const chatStore = useChatStore();
const showPoer = ref(false);
const tabs = [
  { label: "全部", value: "all" },
  { label: "访前报告", value: "pre_visitreport" },
  { label: "综合方案", value: "f11_comprehensive_solution" },
  { label: "拜访纪要", value: "post_visit_review" },
];

/**
 * 检查是否被选中
 * @param {string} reportId
 * @returns {boolean}
 */
function isReportslected(reportId) {
  return selectedIds.value.has(reportId);
}

const activeTab = ref("all");
const reports = ref([]);
const loading = ref(false);
/** 下拉刷新状态（van-pull-refresh v-model） */
const refreshing = ref(false);

// 批量选择模式
const isBatchMode = ref(false);
const selectedIds = ref(new Set());
const showDeleteModal = ref(false);

/** 页面初始化时获取报告列表 */
onMounted(() => {
  fetchReports();
});

async function fetchReports() {
  loading.value = true;
  try {
    const data = await getReportList(chatStore.userId);
    // 接口返回结构: { data: { reports: [], total: 0 } }
    reports.value = Array.isArray(data?.reports) ? data.reports : [];
  } catch (err) {
    console.error("获取报告列表失败:", err);
    reports.value = [];
    // 错误已在 request.js 中统一提示
  } finally {
    loading.value = false;
  }
}

/**
 * 下拉刷新：全量重拉报告列表
 * 注意：切换 tab 时不会自动重拉，filteredReports 只是本地 filter；
 * 批量模式下同样共享 reports 数据源，refreshing 状态互斥复用即可。
 */
async function onRefresh() {
  try {
    await fetchReports();
  } finally {
    refreshing.value = false;
  }
}

/** tab 切换过滤：仅本地过滤，不触发接口 */
const filteredReports = computed(() => {
  if (activeTab.value === "all") return reports.value;
  return reports.value.filter((r) => r.reportType === activeTab.value);
});

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 批量选择模式切换
function toggleBatchMode() {
  if (!isBatchMode.value) {
    showPoer.value = false;
  }
  isBatchMode.value = !isBatchMode.value;
  selectedIds.value.clear();
}

// 切换单个报告选择
function toggleSelect(id) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id);
  } else {
    selectedIds.value.add(id);
  }
}

// 全选/取消全选
const isAllSelected = computed(() => {
  return (
    filteredReports.value.length > 0 &&
    selectedIds.value.size === filteredReports.value.length
  );
});

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value.clear();
  } else {
    filteredReports.value.forEach((r) => selectedIds.value.add(r.id));
  }
}

// 显示删除确认
function showDeleteConfirm() {
  if (selectedIds.value.size === 0) return;
  showDeleteModal.value = true;
}

// 取消删除
function cancelDelete() {
  showDeleteModal.value = false;
}

// 确认删除
async function confirmDelete() {
  if (selectedIds.value.size === 0) return;

  try {
    await batchDeleteReports(Array.from(selectedIds.value));
    showDeleteModal.value = false;
    // 从本地列表中移除已删除的报告
    reports.value = reports.value.filter((r) => !selectedIds.value.has(r.id));
    selectedIds.value.clear();
    isBatchMode.value = false;
  } catch (err) {
    console.error("批量删除报告失败:", err);
    // 错误已在 request.js 中统一提示
  }
}

function handleBack() {
  const sessionId = chatStore.currentSessionId;
  if (sessionId) {
    router.replace(`/chat/${sessionId}`);
    return;
  }
  router.back();
}

function handleReportClick(report) {
  if (!report.id) {
    console.warn("报告缺少 reportId:", report);
    return;
  }
  const title = getTypeLabel(report.reportType) || "报告详情";
  let query = {
    title,
    reportId: report.id,
  };
  switch (report.reportType) {
    case "pre_visitreport":
      query.reportType = "pre_visitreport";
      break;
    default:
  }
  router.push({
    path: "/markdown-view",
    query,
  });
}
</script>

<style scoped>
.report-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
  background: #f7f8fa;
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  overflow: hidden;
}

/* 顶部导航栏 */
.report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 12px;
  /* background: #fff; */
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn,
.more-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
}

.back-arrow {
  display: block;
  width: 10px;
  height: 10px;
  border-left: 2px solid #333;
  border-bottom: 2px solid #333;
  transform: rotate(45deg);
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.more-dots {
  display: block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #333;
  box-shadow: 8px 0 0 #333, -8px 0 0 #333;
}

/* Tab - van-tabs 滑动切换 */
:deep(.van-tabs) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 12px;
}

:deep(.van-tabs__wrap) {
  z-index: 9;
}

:deep(.van-tab--active) {
  color: #1a1a1a;
  font-weight: 600;
}

:deep(.van-tabs__line) {
  background: #ff6b35;
}

:deep(.van-tabs__content) {
  flex: 1;
  overflow: hidden;
}

:deep(.van-tab__panel) {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* 批量操作栏 */
.batch-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 12px;
  gap: 12px;
  /* padding-bottom: 12px */
  background: #f5f6f8;
  border-bottom: 1px solid #e5e5e5;
}

.batch-mode-list {
  padding-bottom: 16px;
}

.select-all {
  height: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: #1a1a1a;
  cursor: pointer;
}
.select-all span {
  line-height: 1;
}
.batch-right {
  display: flex;
  flex: 1;
  gap: 8px;
}

.cancel-btn {
  padding: 8px 16px;
  /* width: 133px; */
  flex: 1;
  height: 48px;
  font-size: 14px;
  color: #1c1f23;
  background: #fff;
  border: none;
  border-radius: 240px;
  cursor: pointer;
}

.delete-btn {
  padding: 8px 16px;
  font-size: 14px;
  flex: 1;
  /* width: 133px; */
  height: 48px;
  color: #fff;
  background: #ff4e4e;
  border: none;
  border-radius: 240px;
  cursor: pointer;
}

.delete-btn:disabled {
  cursor: not-allowed;
}

/* 报告列表 */
/* 列表容器：滚动交给外层 .van-tab__panel / .report-list-batch-wrap，本层不再叠 overflow 避免嵌套滚动打架 */
.report-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100%;
}
.report-list-batch-wrap {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.report-list-batch {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 20px 0 12px;
  min-height: 100%;
}

.report-item {
  width: 100%;
  min-height: 66px;
  /* padding: 12px; */
  display: flex;
  gap: 4px;
  box-sizing: border-box;
  border-width: 0px 0px 0.5px 0px;
  border-style: solid;
  border-color: #d9d9d9;
  cursor: pointer;
  align-items: center;
}

.report-checkbox {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin-top: 2px;
  cursor: pointer;
}

.report-item:active {
  background: #f9f9f9;
}

.report-body {
  flex: 1;
  min-width: 0;
}

.report-title {
  width: 100%;
  font-size: 14px;
  font-weight: 500;
  color: #1c1f23;
  line-height: 22px;
  letter-spacing: 0.02em;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.report-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.report-tag {
  width: 54px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 2px 4px;
  font-size: 11px;
  border-radius: 2px;
}

.tag-pre_visitreport {
  color: #ff4e4e;
  border: 0.5px solid #ff4e4e;
}

.tag-f11_comprehensive_solution {
  color: #ff9500;
  border-color: #ff9500;
}

.tag-post_visit_review {
  color: #357bf4;
  border: 0.5px solid #357bf4;
}

.report-date {
  font-size: 12px;
  color: #889099;
  line-height: 16px;
  letter-spacing: 0.02em;
}

.empty-state {
  padding: 60px 16px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

/* 删除确认弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: #f7f8fa;
  border-radius: 12px;
  padding: 24px;
  width: 280px;
  max-width: 80%;
}

.modal-title {
  color: #1c1f23;
  font-size: 16px;
  font-weight: bold;
  line-height: 24px;
  margin: 0 0 12px;
  text-align: center;
}

.modal-message {
  font-size: 14px;
  color: #1c1f23;
  margin: 0 0 24px;
  line-height: 22px;
  text-align: center;
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

.modal-btn.cancel {
  background: #fff;
  color: #666;
}

.modal-btn.confirm {
  background: #ff4d4f;
  color: #fff;
  text-align: center;
}
.tabs-class :deep(.van-tab--line) {
  color: #889099;
}
.tabs-class :deep(.van-tab--active) {
  color: #1c1f23;
}
:deep(.van-tab) {
  flex: unset;
  padding: 5px 12px;
}

/* ← 新增：圆圈容器 */
.report-checked {
  flex-shrink: 0; /* 关键：圆圈不被压缩 */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.report-checked img {
  width: 20px;
  height: 20px;
}

.select-all input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border: 1.5px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
}

.select-all input[type="checkbox"]:checked {
  background: #ff6b35;
  border-color: #ff6b35;
}

.select-all input[type="checkbox"]:checked::after {
  content: "";
  position: absolute;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
</style>
