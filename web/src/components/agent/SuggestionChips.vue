<template>
  <div v-if="chips && chips.length" class="suggestion-chips">
    <button
      v-for="(chip, index) in chips"
      :key="index"
      type="button"
      class="chip-item"
      @click="$emit('select', chip)"
    >
      {{ chip }}
    </button>
  </div>
</template>

<script setup>
/**
 * 快捷胶囊组件（固定在输入框上方）
 *
 * 展示 AI 回复附带的快捷操作按钮，点击后直接发送对应内容。
 * 与备选答案（AgentInput options）互斥：有备选答案时隐藏胶囊。
 * 支持字符串数组或对象数组 [{ label, value, mode }] 格式。
 */
defineProps({
  chips: {
    type: Array,
    default: () => [],
    // ['集团客户全景视图', '定制化访前报告', '产业链上下游...']
  },
});

defineEmits(["select"]);
</script>

<style scoped>
.suggestion-chips {
  flex-shrink: 0;
  /* position: fixed;
  right: 24px;
  bottom: 105px;
  left: 16px;
  z-index: 49; */
  display: flex;
  gap: 6px;
  overflow-x: auto;
  align-items: center;
  padding: 10px 12px  5px 12px;
  /* 隐藏滚动条 */
  scrollbar-width: none;
  -ms-overflow-style: none;
  /* background: linear-gradient(180deg, #f7f8fa 0%, #f7f0eb 93%); */
}

.suggestion-chips::-webkit-scrollbar {
  display: none;
}

.chip-item {
  box-sizing: border-box;
  flex-shrink: 0;
  height: 32px;
  padding: 0 10px;
  background: #ffffff;
  border: 0.5px solid #d9d9d9;
  border-radius: 8px;
  color: #1f252d;
  font-size: 14px;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
}

.chip-item:active {
  background: #f5f5f5;
  border-color: #d9d9d9;
}
</style>
