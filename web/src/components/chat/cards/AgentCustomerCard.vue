<template>
  <div class="agent-customer-card">
    <div
      v-for="(chapter, idx) in chapters"
      :key="idx"
      class="chapter-item"
    >
      <span class="chapter-index">{{ idx + 1 }}</span>
      <div class="chapter-text">{{ chapterText(chapter) }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, defineProps } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
})

const chapters = computed(() => (Array.isArray(props.data) ? props.data : []))

// chapters 元素结构不固定，兼容 title/name/content/text 常见字段
function chapterText(chapter) {
  if (chapter == null) return ''
  if (typeof chapter === 'string') return chapter
  return chapter.title || chapter.name || chapter.content || chapter.text || ''
}
</script>

<style scoped>
.agent-customer-card { margin-top: 8px; background: #fff; border-radius: 10px; padding: 8px 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); }
.chapter-item { display: flex; align-items: flex-start; padding: 6px 0; }
.chapter-index { flex-shrink: 0; width: 18px; height: 18px; margin-right: 8px; margin-top: 1px; font-size: 12px; line-height: 18px; text-align: center; color: #1989fa; background: rgba(25, 137, 250, 0.1); border-radius: 50%; }
.chapter-text { font-size: 13px; color: #1c1f23; line-height: 20px; }
</style>
