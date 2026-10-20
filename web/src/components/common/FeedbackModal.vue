<template>
  <van-popup
    v-model:show="visible"
    position="bottom"
    :style="popupStyle"
    :closeable="true"
    teleport="body"
    :z-index="3000"
    close-icon="cross"
    class="feedback"
    close-icon-position="top-right"
    @close="handleClose"
    safe-area-inset-bottom
  >
    <div class="feedback-modal">
      <!-- 标题 -->
      <h2 class="feedback-title">反馈</h2>

      <!-- 快速反馈按钮（点击填充到输入框） -->
      <div class="feedback-tags">
        <button
          v-for="tag in quickTags"
          :key="tag"
          type="button"
          class="feedback-tag"
          @click="fillTag(tag)"
        >
          {{ tag }}
        </button>
      </div>

      <!-- 详细描述 -->
      <textarea
        v-model="detailText"
        class="feedback-textarea"
        id="nokeyboardinput"
        @blur="handlerBlur"
        @focus="handlerFocus"
        placeholder="(如需要)请展开描述你的使用体验或反馈建议"
        :maxlength="500"
      />

      <!-- 提交按钮 -->
      <button
        type="button"
        class="feedback-submit"
        :disabled="!detailText.trim()"
        @click="handleSubmit"
      >
        提交
      </button>
    </div>
  </van-popup>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted , nextTick } from "vue";
import { useAppStore } from "@/stores/app";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  messageId: {
    type: String,
    default: "",
  },
});

const appStore = useAppStore();
const keyboardHeight = ref(0); //键盘高度
let kbQueryTimer = null; // focus 后延迟查询键盘高度的定时器
let kbResetTimer = null; // blur 后延迟归零的定时器

// 动态 popup 样式：用键盘高度替代 safe-area
const popupStyle = computed(() => {
  const kb = keyboardHeight.value;
  return {
    borderRadius: "16px 16px 0 0",
    maxHeight: kb > 0 ? `calc(100vh - ${kb}px - 60px)` : "70vh",
    bottom: kb + "px",
    transition: "bottom 0.25s ease, max-height 0.25s ease",
  };
});
/**键盘高度变化后滚动到底, 保证最新消息可见 */
const oldKeyboardHeight = ref(0);
watch(keyboardHeight, (newVal, oldVal) => {
  if (appStore.isIOS) {
    // 9键和26键切换保留值, 为切换后第一次点击键盘唤起保留高度
    oldKeyboardHeight.value = oldVal;
    nextTick(() => {
      // 处理内容高度计算下不来问题
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 300);
    });
  }
});

onMounted(() => {
});
onUnmounted(() => {
  clearTimeout(kbQueryTimer);
  clearTimeout(kbResetTimer);
});
const isBlur = ref(false);
/*** 输入框聚焦: 键盘即将弹起 */
function handlerFocus(e) {
  if (!appStore.isIOS) return; 
  //通过input或textarea标签属性id=nokeyboardinput  判断是否需要计算高度
  isBlur.value = false;
  console.log("handlerFocus+++++++++++++");
  clearTimeout(kbResetTimer);
  if (keyboardHeight.value === 0) {
    keyboardHeight.value = appStore.keyboardHeight ||380; // 预估值
  }
  // 分段抵消原生上推(键盘动画期间原生可能多次调整 contentInset)
  window.scrollTo(0, 0);
  setTimeout(() => window.scrollTo(0, 0), 100);
  clearTimeout(kbQueryTimer);
  // IOS 键盘弹出动画约 250 - 300ms,延迟后再向原生查询真实高度
  kbQueryTimer = setTimeout(() => {
    try {
      window.scrollTo(0, 0);
      const bridge = window.pluginHelper?.device;
      if (!bridge?.getKeyboardHeight) return;
      try {
        // 因9键换26键等问题, 无法获取键盘高度 兼容
        if (oldKeyboardHeight.value > 0) {
          keyboardHeight.value = JSON.parse(
            JSON.stringify(oldKeyboardHeight.value || 380)
          );
          appStore.setKeyboardHeightIOS(keyboardHeight.value)
        }  
        bridge.getKeyboardHeight(
          (success) => {
            console.log(success); //success为回调成功后返回的结果
            // 如果失去焦点了,不再赋值;
            console.log(isBlur.value, "isBlur.value");
            if (isBlur.value) return;
            const h = Number(success.keyboardHeight) || 0;
            if (h > 0) {
              keyboardHeight.value = h;
              appStore.setKeyboardHeightIOS(keyboardHeight.value)
            }  
          },
          (failure) => {
            console.log(failure); //failure为回调失败后返回的结果
          }
        );
      } catch (error) {
        keyboardHeight.value = 380;
      }
    } catch (error) {
      keyboardHeight.value = 380;
    }
  }, 350);
}

/** 输入框失焦: 键盘即将收起 */
function handlerBlur(e) {
  if (!appStore.isIOS) return; 
  // 已失焦, 去获取键盘高度里处理判断是否赋值
  isBlur.value = true;
  console.log("失焦handlerBlur");
  clearTimeout(kbQueryTimer);
  clearTimeout(kbResetTimer);
  // 延迟归零: 输入框之间切换时新的focuesin会取消该重置, 避免抖动
  // 键盘手气动画较快, 100ms 足够区分真实收起与焦点切换
  kbResetTimer = setTimeout(() => {
    keyboardHeight.value = 0;
    appStore.setKeyboardHeightIOS(keyboardHeight.value)
    window.scrollTo(0, 0);
  }, 100);
}

const emit = defineEmits(["update:modelValue", "submit"]);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

// 快速反馈标签
const quickTags = [
  "指令理解有误",
  "事实错误",
  "缺乏专业深度",
  "违法有害",
  "信源过时",
];

// 详细描述
const detailText = ref("");

/**
 * 点击标签，将内容填充到输入框
 */
function fillTag(tag) {
  detailText.value = tag;
}

function handleSubmit() {
  if (!detailText.value.trim()) return;
  emit("submit", {
    messageId: props.messageId,
    detail: detailText.value.trim(),
  });
  // 重置状态
  detailText.value = "";
  visible.value = false;
}

function handleClose() {
  detailText.value = "";
  visible.value = false;
}
</script>

<style scoped>
.feedback-modal {
  padding: 16px;
}

.feedback-title {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
  text-align: center;
  margin: 0 0 20px;
  /* padding-right: 28px; */
}

.feedback-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.feedback-tag {
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1.4;
}

.feedback-tag:active {
  background: #f5f5f5;
  border-color: #d0d0d0;
}

.feedback-textarea {
  width: 100%;
  height: 120px;
  padding: 14px;
  background: #f7f8fa;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  color: #1c1f23;
  resize: none;
  box-sizing: border-box;
  margin-bottom: 20px;
  line-height: 1.6;
}

.feedback-textarea::placeholder {
  color: #899099;
}

.feedback-textarea:focus {
  outline: none;
}

.feedback-submit {
  width: 100%;
  padding: 14px;
  background: #d9d9d9;
  color: #999;
  border: none;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.feedback-submit:active {
  opacity: 0.8;
}

.feedback-submit:not(:disabled) {
  background: #ff7538;
  color: #fff;
}

.feedback-submit:disabled {
  background: #d9d9d9;
  color: #999;
  cursor: not-allowed;
}
.feedback :deep(.van-popup__close-icon) {
  color: #1C1F23;
}
.feedback :deep(.van-popup__close-icon--top-right) {
  top: 20px;
  font-size: 20px;
}

</style>
