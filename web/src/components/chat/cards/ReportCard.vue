<template>
  <div class="tool-card report-card" @click="handleClick">
    <div class="card-icon">📄</div>
    <div class="card-body">
      <h4 class="card-title">{{ data.title || data.reportName || '报告' }}</h4>
      <p class="card-desc">{{ data.description || data.companyName || '' }}</p>
      <span class="card-date" v-if="data.date">{{ data.date }}</span>
    </div>
    <div class="card-arrow">›</div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'
const props = defineProps({ data: { type: Object, default: () => ({}) } })
function handleClick() {
  // 模板项目：点击卡片可跳转详情页，按需实现
  console.log('[ReportCard] clicked', props.data)
}
</script>

<style scoped>
.tool-card { display: flex; align-items: center; padding: 12px; background: #fff; border-radius: 10px; margin: 8px 0; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.tool-card:active { background: #f5f5f5; }
.card-icon { font-size: 24px; margin-right: 10px; flex-shrink: 0; }
.card-body { flex: 1; min-width: 0; }
.card-title { font-size: 14px; font-weight: 500; color: #1c1f23; margin: 0 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-desc { font-size: 12px; color: #889099; margin: 0; }
.card-date { font-size: 11px; color: #aab; }
.card-arrow { color: #ccc; font-size: 18px; margin-left: 6px; }
</style>
