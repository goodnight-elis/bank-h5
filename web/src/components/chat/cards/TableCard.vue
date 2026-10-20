<template>
  <div class="tool-card table-card">
    <div class="card-header">
      <span class="card-title">{{ data.title || '数据表格' }}</span>
    </div>
    <div class="card-content">
      <p>{{ data.summary || '点击查看详细数据' }}</p>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'
defineProps({ data: { type: Object, default: () => ({}) } })
</script>

<style scoped>
.tool-card { padding: 12px; background: #fff; border-radius: 10px; margin: 8px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.card-title { font-size: 14px; font-weight: 500; color: #1c1f23; }
.card-content { font-size: 13px; color: #666; margin-top: 8px; }
</style>
