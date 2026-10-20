<template>
  <div class="tool-card fq-report" @click="handleView">
    <div class="card-icon">📊</div>
    <div class="card-body">
      <h4 class="card-title">{{ title }}</h4>
      <p class="card-desc" v-if="description">{{ description }}</p>
      <span class="card-date" v-if="date">{{ date }}</span>
    </div>
    <button type="button" class="view-btn" @click.stop="handleView">查看报告</button>
  </div>
</template>

<script setup>
import { computed, defineProps, defineEmits } from 'vue'

const props = defineProps({
  reportData: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['viewReport'])

const title = computed(() => props.reportData?.title || props.reportData?.reportName || '报告')
const description = computed(() => props.reportData?.description || props.reportData?.companyName || '')
const date = computed(() => props.reportData?.date || '')

function handleView() {
  emit('viewReport', props.reportData)
}
</script>

<style scoped>
.tool-card { display: flex; align-items: center; padding: 12px; background: #fff; border-radius: 10px; margin: 8px 0; cursor: pointer; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); }
.tool-card:active { background: #f5f5f5; }
.card-icon { font-size: 24px; margin-right: 10px; flex-shrink: 0; }
.card-body { flex: 1; min-width: 0; }
.card-title { font-size: 14px; font-weight: 500; color: #1c1f23; margin: 0 0 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-desc { font-size: 12px; color: #889099; margin: 0; }
.card-date { font-size: 11px; color: #aab; }
.view-btn { flex-shrink: 0; margin-left: 8px; padding: 6px 12px; font-size: 12px; color: #fff; background: #1989fa; border: none; border-radius: 16px; }
</style>
