<template>
  <!-- interrupt 澄清模式 -->
  <div ref="wrapperRef" class="agent-input-wrapper">
    <div v-show="interrupt" class="agent-input interrupt-mode">
      <!-- 顶部操作栏（提交后隐藏） -->
      <!-- <div v-if="!resumeSubmitted && interrupt.chips && interrupt.chips.length" class="options-header"></div> -->
      <div v-if="!resumeSubmitted" class="options-header">
        <button
          v-if="interrupt?.skipable"
          type="button"
          class="skip-btn"
          @click="handleInterruptSkip"
        >
          跳过
        </button>
        <span class="options-hint">请选择或者输入</span>
        <button type="button" class="close-btn" @click="handleInterruptClose">
          <span class="icon-placeholder icon-close"
            ><img src="@/assets/icon-close.png" alt=""
          /></span>
        </button>
      </div>

      <!-- interrupt chips 列表（提交后隐藏） -->
      <div
        v-if="!resumeSubmitted && interrupt?.chips && interrupt?.chips.length"
        class="options-list"
      >
        <div
          v-for="(chip, index) in interrupt?.chips"
          :key="index"
          type="button"
          class="option-item"
          :class="{ selected: selectedInterruptChips.includes(index) }"
          @click="handleInterruptChipClick(index, chip)"
        >
          <input
            v-if="interrupt?.input_type === 'multi_chip'"
            type="checkbox"
            class="option-checkbox"
            :checked="selectedInterruptChips.includes(index)"
            @click.stop="toggleMultiChip(index)"
          />
          <span class="option-number">{{ index + 1 }}</span>
          <span
            v-if="interrupt?.input_type === 'multi_chip'"
            class="option-text"
            @click.stop="toggleMultiChip(index)"
            >{{ chip }}</span
          >
          <span v-else class="option-text">{{ chip }}</span>
          <span
            v-if="interrupt?.input_type !== 'multi_chip'"
            class="icon-placeholder icon-arrow"
            ><img src="@/assets/icon-arrow.png" />
          </span>
        </div>
      </div>

      <!-- 多选确认按钮（提交后隐藏） -->
      <div
        v-if="
          !resumeSubmitted &&
          interrupt?.input_type === 'multi_chip' &&
          interrupt?.chips &&
          interrupt?.chips.length
        "
        class="interrupt-confirm-row"
      >
        <button
          type="button"
          class="confirm-btn"
          :disabled="!selectedInterruptChips.length"
          @click="handleInterruptConfirm"
        >
          确认选择 ({{ selectedInterruptChips.length }})
        </button>
      </div>

      <!-- 底部输入区域 -->
      <div class="options-footer">
        <div class="footer-input-field">
          <!-- <van-field :model-value="modelValue" :placeholder="(interrupt.chips && interrupt.chips.length) ? '没有合适的选项，请输入' : '请输入'" :border="false" class="footer-custom-input"
            @update:model-value="$emit('update:modelValue', $event)" @keyup.enter="$emit('send')" /> -->
          <!-- <textarea
            v-show="!interruptVocieMode"
            ref="interruptTextareaRef"
            :value="modelValue"
            class="interrupt-textarea"
            :placeholder="
              interrupt.chips && interrupt.chips.length
                ? '没有合适的选项，请输入'
                : '请输入'
            "
            @focus="inputFocus"
            @input="handleInterruptInput"
            @keydown.enter.exact.prevent="$emit('send')"
          ></textarea> -->

          <van-field
            v-show="!interruptVocieMode"
            ref="interruptTextareaRef"
            v-model="inputValue"
            rows="1"
            autosize
            class="interrupt-textarea"
            type="textarea"
            :placeholder="
              interrupt?.chips && interrupt?.chips.length
                ? '没有合适的选项，请输入'
                : '请输入'
            "
            @focus="inputFocus"
            @input="handleInterruptInput"
            @keydown.enter.exact.prevent="$emit('send')"
          >
            <template #label>
              <img
                class="icon-edit-input"
                src="@/assets/icon-edit.png"
                alt=""
              />
            </template>
          </van-field>
          <button
            v-show="interruptVocieMode"
            type="button"
            class="voice-input-btn"
          >
            {{ isPressing ? "正在说话···" : "按住说话" }}
          </button>
        </div>
        <div
          v-show="!inputValue.trim()"
          class="footer-mic-btn"
          @click="voiceClick"
        >
          <!-- @mousedown="voiceStart"
          @mouseup="voiceCancel"
          @mouseleave="voiceCancel"
          @touchstart.prevent="voiceStart"
          @touchcancel.prevent="voiceCancel"
          @touchend.prevent="voiceCancel"
          @touchmove.prevent="voiceMove" -->
          <img
            v-if="interruptVocieMode"
            src="@/assets/spend.png"
            alt="voice"
            class="mic-icon"
          />
          <img v-else src="@/assets/mike.png" alt="voice" class="mic-icon" />
        </div>
        <button
          v-if="inputValue.trim()"
          type="button"
          class="footer-send-btn"
          @click="handleSendClick"
        >
          <img src="@/assets/send.png" alt="send" class="mic-icon" />
        </button>
      </div>
    </div>

    <!-- 无备选答案状态（输入框） -->
    <div v-show="!interrupt" class="agent-input">
      <!-- 上传文件预览（输入框上方） -->
      <div v-if="uploadedFiles.length" class="upload-preview">
        <div
          v-for="(file, index) in uploadedFiles"
          :key="index"
          class="upload-item"
        >
          <img
            v-if="file.isImage"
            :src="file.previewUrl"
            class="upload-thumb"
            @click="handlePreviewImage(file)"
          />
          <div v-else class="upload-file-icon">
            <span class="file-label">{{ file.name }}</span>
          </div>
          <!-- 上传中 loading 遮罩 -->
          <div v-if="file.uploading" class="upload-loading">
            <span class="loading-spinner"></span>
          </div>
          <button
            type="button"
            class="upload-remove"
            @click="removeUploadedFile(index)"
          >
            <span>x</span>
          </button>
        </div>
      </div>
      <!-- 上传文件".pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"（输入框上方） -->
      <div
        v-if="uploadedFilesList.length"
        class="upload-preview preview-max-height"
      >
        <div
          v-for="(file, index) in uploadedFilesList"
          :key="index"
          class="attachment-card"
        >
          <img
            v-if="file.newType == 'doc' || file.newType == 'docx'"
            class="file-icon"
            src="@/assets/docx.png"
            alt="file"
          />
          <img
            v-else-if="file.newType == 'xlsx' || file.newType == 'xls'"
            class="file-icon"
            src="@/assets/xlsx.png"
            alt="file"
          />
          <img
            v-else-if="file.newType == 'txt'"
            class="file-icon"
            src="@/assets/txt.png"
            alt="file"
          />
          <img
            v-else-if="file.newType == 'ppt' || file.newType == 'pptx'"
            class="file-icon"
            src="@/assets/ppt.png"
            alt="file"
          />
          <img
            v-else-if="file.newType == 'pdf'"
            class="file-icon"
            src="@/assets/pdf.png"
            alt="file"
          />
          <div class="file-info">
            <div class="file-name">{{ file.showName }}</div>
            <div class="file-size">大小：{{ file.size }}</div>
          </div>
          <img
            class="delete-icon"
            src="@/assets/shanchu.png"
            alt="delete"
            @click="removeUploadedPdfFile(index)"
          />
          <!-- 上传中 loading 遮罩 -->
          <div v-if="file.uploading" class="upload-loading">
            <span class="loading-spinner"></span>
          </div>
        </div>
      </div>
      <!-- 输入行 -->
      <div class="input-row">
        <!-- 弹出菜单 -->
        <div v-if="showFabMenu" class="fab-menu">
          <button type="button" class="fab-menu-item" @click="handleSelectFile">
            <svg
              class="fab-menu-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <span class="fab-menu-text">文件</span>
          </button>
          <!-- 相册功能暂时隐藏 -->
          <!-- <button type="button" class="fab-menu-item" @click="handleSelectPhoto">
            <svg class="fab-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
            <span class="fab-menu-text">相册</span>
          </button> -->
        </div>

        <div class="fab-menu-btn" @click="toggleFabMenu">
          <!-- <img src="@/assets/plus3x.png" alt="plus" class="plus-icon" /> -->
        </div>
        <div class="input-field">
          <!-- <textarea
            v-show="!isVoiceInputMode"
            ref="textareaRef"
            :value="modelValue"
            class="textarea-input"
            placeholder="请输入您想咨询的问题"
            @focus="inputFocus"
            @input="handleInput"
            @keydown.enter.exact.prevent="$emit('send')"
          ></textarea> -->
          <van-field
            v-show="!isVoiceInputMode"
            ref="textareaRef"
            v-model="inputValue"
            rows="1"
            autosize
            class="textarea-input"
            type="textarea"
            placeholder="请输入您想咨询的问题"
            @focus="inputFocus"
            @input="handleInput"
            @keydown.enter.exact.prevent="$emit('send')"
          />
          <button
            v-show="isVoiceInputMode"
            type="button"
            class="voice-input-btn"
          >
            {{ isPressing ? "正在说话···" : "按住说话" }}
          </button>
        </div>
        <div v-show="!inputValue.trim() && isVoiceInputMode" class="mic-btn">
          <img src="@/assets/spend.png" alt="voice" class="mic-icon" />
        </div>
        <div
          v-show="!inputValue.trim() && !isStreaming && !isVoiceInputMode"
          class="mic-btn"
          @click="voiceClick"
        >
          <!-- @mousedown="voiceStart"
          @mouseup="voiceCancel"
          @mouseleave="voiceCancel"
          @touchstart.prevent="voiceStart"
          @touchcancel.prevent="voiceCancel"
          @touchend.prevent="voiceCancel"
          @touchmove.prevent="voiceMove" -->
          <img src="@/assets/mike.png" alt="voice" class="mic-icon" />
        </div>
        <div v-if="isStreaming" class="stop-btn" @click="handleStop">
          <img src="@/assets/stop.png" class="stop-img" />
        </div>
        <button
          v-if="inputValue.trim() && !isVoiceInputMode"
          type="button"
          class="footer-send-btn"
          @click="handleSendClick"
        >
          <img src="@/assets/send.png" alt="send" class="mic-icon" />
        </button>
      </div>
    </div>
  </div>
  <!-- 隐藏的文件选择器 -->
  <input
    ref="fileInput"
    type="file"
    accept="image/*"
    multiple
    style="display: none"
    @change="handleFileChange"
  />
  <input
    ref="pdfFileInput"
    type="file"
    :accept="pdfFlieAccept"
    style="display: none"
    @change="handlePdfFileChange"
  />

  <!-- 图片大图预览 -->
  <div v-if="previewImage" class="image-preview-overlay" @click="closePreview">
    <img :src="previewImage" class="image-preview-full" />
  </div>
</template>

<script setup>
import { ref, nextTick, watch, onMounted, onUnmounted } from "vue";
import { showToast } from "vant";
import { uploadFile } from "@/api/chat";
import {
  getFileType,
  byteToKB,
  middleEllipsis,
  debounce,
} from "@/utils/common";

/**
 * 智能体底部输入区域组件（固定在页面底部）
 *
 * 双状态设计：
 * - 备选答案模式：AI 回复附带选项时，展示选项列表 + 底部输入框
 *   支持：选择选项、跳过、关闭、手动输入发送
 * - 普通输入模式：展示语音按钮 + 文本输入框 + 发送按钮
 *   支持：语音输入、文本输入发送、FAB 更多选项
 */
const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
  // interrupt 澄清数据
  interrupt: {
    type: Object,
    default: null,
    // { qa_index, chips, input_type, skipable }
  },
  // 是否正在流式输出
  isStreaming: {
    type: Boolean,
    default: false,
  },
});

const inputValue = ref("");

watch(
  () => props.modelValue,
  (newVal) => {
    inputValue.value = newVal;
  }
);

const emit = defineEmits([
  "update:modelValue",
  "fab",
  "voice",
  "voiceClick",
  "send",
  "stop",
  "inputHeightChange",
  "filesChange",
  "interruptSelect",
  "interruptConfirm",
  "interruptSkip",
  "interruptClose",
]);
//文件限制类型常量
const pdfFlieAccept = ref(".pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx");
// FAB 弹出菜单
const showFabMenu = ref(false);
const fileInput = ref(null);
const textareaRef = ref(null);
const wrapperRef = ref(null);
const interruptTextareaRef = ref(null);
// interrupt 多选状态
const selectedInterruptChips = ref([]);

/**
 * 是否已提交 resume 操作
 * 提交后隐藏选项列表和顶部操作栏，只保留输入框，防止多次触发
 * 当 interrupt prop 变化（新选项到来或清除）时自动重置
 */
const resumeSubmitted = ref(false);

// interrupt 事件处理
function handleInterruptChipClick(index, chip) {
  if (resumeSubmitted.value) return; // 防止多次触发
  // 关闭 fab 菜单（如果打开）
  showFabMenu.value = false;
  if (props.interrupt?.input_type === "single_chip") {
    // 单选：点击即发送
    resumeSubmitted.value = true;
    emit("interruptSelect", {
      qa_index: props.interrupt.qa_index,
      value: chip,
    });
  } else if (props.interrupt?.input_type === "multi_chip") {
    // 多选：点击选项不处理，由复选框控制
    return;
  } else {
    // 默认 text 模式，点击即发送
    resumeSubmitted.value = true;
    emit("interruptSelect", {
      qa_index: props.interrupt.qa_index,
      value: chip,
    });
  }
  emitHeightChange();
}

function toggleMultiChip(index) {
  const idx = selectedInterruptChips.value.indexOf(index);
  if (idx >= 0) {
    selectedInterruptChips.value.splice(idx, 1);
  } else {
    selectedInterruptChips.value.push(index);
  }
}

function handleInterruptConfirm() {
  if (
    !props.interrupt ||
    !selectedInterruptChips.value.length ||
    resumeSubmitted.value
  )
    return;
  resumeSubmitted.value = true;
  const values = selectedInterruptChips.value.map(
    (i) => props.interrupt.chips[i]
  );
  const answer = values.join(",");
  emit("interruptConfirm", { qa_index: props.interrupt.qa_index, answer });
  selectedInterruptChips.value = [];
}

function handleInterruptSkip() {
  if (!props.interrupt || resumeSubmitted.value) return;
  resumeSubmitted.value = true;
  emit("interruptSkip", { qa_index: props.interrupt.qa_index });
  emitHeightChange();
}

function handleInterruptClose() {
  if (!props.interrupt || resumeSubmitted.value) return;
  resumeSubmitted.value = true;
  emit("interruptClose", { qa_index: props.interrupt.qa_index });
  emitHeightChange();
}

// 上传文件相关
const uploadedFiles = ref([]);
const previewImage = ref(null);
// 上传文件pdf等数据
const pdfFileInput = ref(null);
const uploadedFilesList = ref([]);

// 语音输入模式
const isVoiceInputMode = ref(false);
// 澄清语音
const interruptVocieMode = ref(false);
// 语音按钮按住延迟
const LONG_PASS_DELAY = 300;
// ui形式是否录音
const isPressing = ref(false);
// 录音状态锁
let isRecording = ref(false);
// 定时器
let voiceTimer = null;
// 上移多少像素进行取消
let CANCEL_OFFSET = -60;
// 上移多少像素进行取消
let isSliderCancel = ref(false);
// 按下按钮的y坐标
let startY = 0;
/**
 * 切换语音输入模式
 */
function toggleVoiceInput() {
  isVoiceInputMode.value = !isVoiceInputMode.value;
}
// 澄清模式切换语音
function toggleInteterruptVoice() {
  interruptVocieMode.value = !interruptVocieMode.value;
}
function voiceClick() {
  emit("voiceClick", true);
}
// 录音开始
function voiceStart(e) {
  isPressing.value = true;
  isSliderCancel.value = false;
  startY = e.touches ? e.touches[0].clientY : e.clientY;
  voiceTimer = setTimeout(() => {
    isRecording.value = true;
    console.log("开始录音");
    emit("voice", true);
  }, LONG_PASS_DELAY);
}

// 录音结束
function voiceCancel() {
  clearTimeout(voiceTimer);
  voiceTimer = null;
  if (isRecording.value) {
    if (isSliderCancel.value) {
      console.log("上划取消");
      emit("voice", false);
    } else {
      console.log("松手取消");
      emit("voice", false);
    }
  }
  isPressing.value = false;
  isRecording.value = false;
  isSliderCancel.value = false;
}

// 上移事件
function voiceMove(e) {
  if (!isPressing.value) return;
  const currentY = e.touches[0].clientY;
  const offsetY = currentY - startY;
  if (offsetY < CANCEL_OFFSET) {
    isSliderCancel.value = true;
  } else {
    isSliderCancel.value = false;
  }
}
/**
 * 处理输入事件，动态调整 textarea 高度
 */
function handleInput(event) {
  const value = event.target.value;
  emit("update:modelValue", value);
  // nextTick(() => {
  //   emitHeightChange();
  // });
}

/**
 * 处理澄清输入事件
 */
function handleInterruptInput(event) {
  const value = event.target.value;
  emit("update:modelValue", value);
  // nextTick(() => {
  //   emitHeightChange();
  // });
}
function inputFocus() {
  nextTick(() => {
    emitHeightChange();
  });
}
/**
 * 切换 FAB 弹出菜单
 */
function toggleFabMenu() {
  showFabMenu.value = !showFabMenu.value;
}

/**
 * 选择文件
 */
function handleSelectFile() {
  showFabMenu.value = false;
  if (pdfFileInput.value) {
    pdfFileInput.value.accept = pdfFlieAccept.value;
    pdfFileInput.value.click();
  }
}

/**
 * 选择相册（图片）
 */
function handleSelectPhoto() {
  showFabMenu.value = false;
  if (fileInput.value) {
    fileInput.value.accept = "image/*";
    fileInput.value.click();
  }
}

/**
 * 处理文件选择：本地预览（上传接口暂注释）
 */
function handleFileChange(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  // 最多上传 1 个文件
  if (uploadedFiles.value.length >= 1) {
    showToast("最多只能上传1个文件");
    event.target.value = "";
    return;
  }

  for (const file of Array.from(files)) {
    const isImage = file.type.startsWith("image/");
    const previewUrl = isImage ? URL.createObjectURL(file) : null;

    // 直接加入列表（带本地预览），模拟上传成功
    uploadedFiles.value.push({
      fileId: null, // TODO: 上传接口就绪后替换为真实 fileId
      name: file.name,
      isImage,
      previewUrl,
      uploading: false, // 暂不显示 loading
    });

    // TODO: 上传接口就绪后启用以下代码
    // const fileIndex = uploadedFiles.value.length - 1
    // uploadedFiles.value[fileIndex].uploading = true
    // emit('filesChange', uploadedFiles.value)
    // emitHeightChange()
    // try {
    //   const res = await uploadFile(file)
    //   const item = uploadedFiles.value[fileIndex]
    //   if (item) {
    //     item.fileId = res?.fileId || res?.id || res?.file_id
    //     item.uploading = false
    //     if (res?.url) item.previewUrl = res.url
    //   }
    // } catch (err) {
    //   const item = uploadedFiles.value[fileIndex]
    //   if (item?.previewUrl && item.isImage) URL.revokeObjectURL(item.previewUrl)
    //   uploadedFiles.value.splice(fileIndex, 1)
    //   showToast('文件上传失败')
    // }

    emit("filesChange", uploadedFiles.value);
    emitHeightChange();
  }

  // 重置 input 以便可以重复选择同一文件
  event.target.value = "";
}

/**
 * 移除已上传文件
 */
function removeUploadedFile(index) {
  const removed = uploadedFiles.value[index];
  if (removed?.previewUrl && removed.isImage) {
    URL.revokeObjectURL(removed.previewUrl);
  }
  uploadedFiles.value.splice(index, 1);
  emit("filesChange", uploadedFiles.value);
  emitHeightChange();
}

/**
 * 处理文件选择：pdf,ppt,xlxs等（上传接口暂注释）
 */
const MAX_SINGLE_SIZE = 2 * 1024 * 1024; // 2MB
function handlePdfFileChange(event) {
  const files = Array.from(event.target.files);
  if (!files || files.length === 0) return;
  // 文件个数限制1条
  if (files.length + uploadedFilesList.value.length > 1) {
    showToast(`最多只能上传1个文件！`);
    return;
  }
  for (const file of files) {
    // 直接加入列表，模拟上传成功
    // 大小校验 2MB
    if (file.size > MAX_SINGLE_SIZE) {
      showToast(`文件大小不能超过2MB！`);
      uploadedFilesList.value = [];
      return;
    }
    uploadedFilesList.value.push({
      fileId: null, // TODO: 上传接口就绪后替换为真实 fileId
      name: file.name,
      showName: middleEllipsis(file.name, 10, 6), // 截取文案，前10，后6，中间省略号
      size: byteToKB(file.size),
      newType: getFileType(file),
      uploading: false, // 暂不显示 loading
    });

    // TODO: 上传接口就绪后启用以下代码
    // const fileIndex = uploadedFiles.value.length - 1
    // uploadedFiles.value[fileIndex].uploading = true
    // emit('filesChange', uploadedFiles.value)
    // emitHeightChange()
    // try {
    //   const res = await uploadFile(file)
    //   const item = uploadedFiles.value[fileIndex]
    //   if (item) {
    //     item.fileId = res?.fileId || res?.id || res?.file_id
    //     item.uploading = false
    //     if (res?.url) item.previewUrl = res.url
    //   }
    // } catch (err) {
    //   const item = uploadedFiles.value[fileIndex]
    //   if (item?.previewUrl && item.isImage) URL.revokeObjectURL(item.previewUrl)
    //   uploadedFiles.value.splice(fileIndex, 1)
    //   showToast('文件上传失败')
    // }

    emit("filesChange", uploadedFilesList.value);
    emitHeightChange();
  }

  // 重置 input 以便可以重复选择同一文件
  event.target.value = "";
}

/**
 * 移除已上传文件pdf
 */
function removeUploadedPdfFile(index) {
  const removed = uploadedFilesList.value[index];
  // if (removed?.previewUrl && removed.isImage) {
  //   URL.revokeObjectURL(removed.previewUrl)
  // }
  uploadedFilesList.value.splice(index, 1);
  emit("filesChange", uploadedFilesList.value);
  emitHeightChange();
}

/**
 * 点击图片预览大图
 */
function handlePreviewImage(file) {
  if (file.previewUrl) {
    previewImage.value = file.previewUrl;
  }
}

/**
 * 关闭大图预览
 */
function closePreview() {
  previewImage.value = null;
}

/**
 * 清空所有已上传文件
 */
function clearUploadedFiles() {
  uploadedFiles.value.forEach((file) => {
    if (file.previewUrl && file.isImage) {
      URL.revokeObjectURL(file.previewUrl);
    }
  });
  uploadedFiles.value = [];
  emit("filesChange", []);
  emitHeightChange();
}

/**
 * 通知父组件当前输入框容器总高度
 */
const emitHeightChange = () => {
  nextTick(() => {
    setTimeout(() => {
      const el = wrapperRef.value;
      if (el) {
        emit("inputHeightChange", el.offsetHeight);
      }
    }, 20);
  });
};

/**
 * 监听 modelValue 变化，清空时重置 textarea 高度
 */
watch(
  () => props.inputValue,
  (val) => {
    if (!val) {
      nextTick(() => {
        const el = textareaRef.value;
        if (el) {
          // el.style.height = "auto";
        }
        const interruptEl = interruptTextareaRef.value;
        if (interruptEl) {
          // interruptEl.style.height = "auto";
        }
        emitHeightChange();
      });
    }
  }
);

/**
 * 监听 interrupt 变化（进入/退出澄清模式、chips 长度变化），通知父组件更新高度
 */
watch(
  () => props.interrupt,
  () => {
    // 新选项到来或 interrupt 清除时，重置提交状态
    resumeSubmitted.value = false;
    // 每次勾选存的index如果没用上 切换的时候清空
    selectedInterruptChips.value = [];
    emitHeightChange();
  },
  { deep: true }
);

/**
 * 自由文本输入触发 resume 的检测：
 * 当 isStreaming 变为 true 且处于 interrupt 模式，说明 resume 已被调用，隐藏选项区域
 */
watch(
  () => props.isStreaming,
  (streaming) => {
    if (streaming && props.interrupt && !resumeSubmitted.value) {
      resumeSubmitted.value = true;
    }
  }
);

/**
 * 组件挂载时发送初始高度
 */
onMounted(() => {
  emitHeightChange();
});
onUnmounted(() => {
  clearTimeout(voiceTimer);
});
/**
 * 处理发送按钮点击：将附件数据随 send 事件一起传递给父组件
 */
function handleSendClick() {
  const allFiles = [
    ...uploadedFiles.value.map((f) => ({
      type: "image",
      name: f.name,
      previewUrl: f.previewUrl,
      fileId: f.fileId,
    })),
    ...uploadedFilesList.value.map((f) => ({
      type: "file",
      name: f.name,
      showName: f.showName,
      size: f.size,
      newType: f.newType,
      fileId: f.fileId,
    })),
  ];
  //清空附件
  uploadedFiles.value = [];
  uploadedFilesList.value = [];
  // 发送附件给父组件
  emit("send", allFiles);
}

/**
 * 处理停止按钮点击
 * 调用停止接口（预留，暂无真实调用）
 */
function handleStop() {
  console.log("[AgentInput] 用户点击停止按钮");
  // TODO: 调用停止接口
  // await stopStream(sessionId)
  // 通知父组件停止流式输出
  emit("stop");
}
</script>

<style scoped>
/* 底部容器：固定定位，覆盖到底部（含苹果安全区），不透明 */
.agent-input-wrapper {
  flex-shrink: 0;
  /* position: fixed;
  left: -2px;
  right: 0;
  bottom: 0;
  z-index: 50; */
  padding: 15px 12px 10px;
}

.agent-input {
  position: relative;
  min-height: 56px;
  height: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 8px;
  /* background: rgba(255, 255, 255, 0.6); */
  background-color: #fefdfc;
  /* border: 1px solid #c7b5b5; */
  border-radius: 28px;
  box-shadow: 0 10px 30px rgba(76, 61, 47, 0.08);
}

/* 输入行（横向排列按钮和输入框） */
.input-row {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  /* gap: 15px; */
  width: 100%;
}

/* 顶部操作栏 */
.options-header {
  display: flex;
  align-items: center;
  padding-bottom: 6px;
  border-bottom: 1px solid #f0f0f0;
}

.skip-btn {
  width: 50px;
  height: 24px;
  padding: 4px 12px;
  background: transparent;
  border: 0.5px solid #d9d9d9;
  border-radius: 24px;
  color: #1c1f23;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
  box-sizing: border-box;
  position: absolute;
}

.skip-btn:active {
  background: #f5f5f5;
}

.options-hint {
  flex: 1;
  text-align: center;
  font-size: 14px;
  color: #889099;
}

.close-btn {
  /* width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  cursor: pointer;
  flex-shrink: 0; */

  background: transparent;
  border: 0;
  cursor: pointer;
  flex-shrink: 0;
  position: absolute;
  top: 9px;
  right: 15px;
}

/* 通用图标占位 */
.icon-placeholder {
  font-size: 16px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon-arrow img {
  width: 20px;
}

.mic-icon {
  width: 24px;
  /* height: 24px; */
  /* margin-top: 6px; */
  object-fit: contain;
}

/* 选项列表 */
.options-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  max-height: 180px; /* 最多显示 5 个（5 × 52px） */
  overflow-y: auto;
  scrollbar-width: none;
}

.options-list::-webkit-scrollbar {
  display: none;
}

.option-item {
  width: 100%;
  min-height: auto;
  display: flex;
  align-items: center;
  padding: 12px 0px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid #f0f0f0;
  color: #1f252d;
  font-size: 15px;
  font-weight: 400;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;
  gap: 12px;
}

.option-item:last-child {
  border-bottom: 0;
}

.option-item:active {
  /* background: #f5f5f5; */
}

/* interrupt 选中状态（仅非多选模式） */
.option-item.selected {
  background: transparent;
  border-color: #f0f0f0;
}

.option-item.selected .option-number {
  background: #e8e8e8;
  color: #a0a2a7;
}

/* interrupt 多选复选框 */
.option-checkbox {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin-right: 0;
  accent-color: #ff7538;
  cursor: pointer;
}

/* interrupt 多选确认行 */
.interrupt-confirm-row {
  display: flex;
  justify-content: center;
  padding: 8px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.confirm-btn {
  width: 100%;
  padding: 12px 0;
  background: #ff7538;
  color: #fff;
  border: none;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.confirm-btn:disabled {
  opacity: 0.5;
}

.confirm-btn:active {
  background: #e56a3a;
}

.option-number {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eceff1;
  color: #889099;
  font-size: 12px;
  font-weight: 500;
  border-radius: 50%;
  flex-shrink: 0;
}

.option-text {
  flex: 1;
  line-height: 1.4;
  /* 新增：多行文本溢出省略 */
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  letter-spacing: 0.02em;
  overflow: hidden;
  font-size: 14px;
}

/* 底部输入区域 */
.options-footer {
  display: flex;
  align-items: flex-end;
  padding: 8px 0;
  gap: 8px;
}

.footer-input-field {
  flex: 1;
  min-width: 0;
}

.interrupt-textarea {
  box-sizing: border-box !important; /* ← 核心 */
  width: 100%;
  min-height: 42px; /* 1 行：21 + 20 = 41px，取整 42 */
  max-height: 104px; /* ← 改这里：精确 4 行 */
  padding: 10px 16px;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  line-height: 22px;
  color: #2b2f35;
  resize: none;
  overflow-y: auto; /* 超过 4 行出现滚动条 */
  font-family: inherit;
  outline: none;
}

.interrupt-textarea::placeholder {
  color: #a0a2a7;
}
.interrupt-textarea :deep(.van-field__control) {
  max-height: 90px;
}
.interrupt-textarea :deep(.van-field__control)::placeholder {
  color: #a0a2a7;
  max-height: 90px;
}
.textarea-input :deep(.van-field__control) {
  max-height: 90px;
}
.textarea-input :deep(.van-field__control)::placeholder {
  color: #a0a2a7;
  max-height: 90px;
}
.textarea-input {
  box-sizing: border-box !important;
  width: 100%;
  min-height: 42px; /*  现在是「总高」42px */
  max-height: 110px;
  padding: 8px;
  background: transparent;
  border: none;
  font-size: 15px;
  line-height: 22px; /* 42 - 10×2 = 22，正好填满内容区 */
  color: #2b2f35;
  resize: none;
  overflow-y: auto;
  font-family: inherit;
}
.textarea-input::placeholder {
  color: #a0a2a7;
}

.textarea-input:focus {
  outline: none;
}
.footer-mic-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(37, 45, 61, 0.08);
  cursor: pointer;
  margin-bottom: 1px;
  flex-shrink: 0;
  transition: all 0.3s;
}

.footer-mic-btn:active {
  opacity: 0.6;
}

.stop-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 99px;
  box-shadow: 0 4px 10px 0px rgba(199, 199, 199, 0.35);
  border: 1px solid #ffffff;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.3s;
  /* position: relative;
  top: -2px; */
}

/* .footer-stop-btn:active {
  opacity: 0.8;
  transform: scale(0.95);
} */

.stop-btn .stop-img {
  width: 24px;
  background: #ffffff;
  border-radius: 3px;
}

.footer-send-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ff7a45;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.3s;
  background-color: #fff;
  box-shadow: 0px 4px 10px 0px rgba(199, 199, 199, 0.35);
  /* position: relative;
  top: -2px; */
}

.footer-send-btn:active {
  opacity: 0.8;
}

/* FAB 弹出菜单 */
.fab-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  width: 77px;
  height: 50px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  z-index: 100;
}

/* 上传文件预览区域 */
.upload-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0 4px;
  width: 100%;
}

.upload-item {
  position: relative;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
}

.upload-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
}

.upload-file-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f6f8;
  border-radius: 8px;
}

.file-label {
  font-size: 10px;
  color: #666;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  padding: 0 4px;
}

.upload-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #333;
  color: #fff;
  border: 0;
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  z-index: 2;
}

.upload-remove:active {
  opacity: 0.8;
}

/* (非图片)文件上次保留两个数， 多余滑动*/
.preview-max-height {
  max-height: 140px;
  overflow-y: auto;
}

/* 上传中pdf */
.attachment-card {
  width: 100%;
  height: 60px;
  background: linear-gradient(101deg, #fffbf9c4 0%, #fff7f4b8 99%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: 0.5px solid #f0f0f0;
}

.file-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  margin-right: 10px;
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 210px;
}

.file-size {
  font-size: 12px;
  color: #999;
  width: 210px;
}

.delete-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  margin-left: 8px;
  cursor: pointer;
  position: relative;
  left: -8px;
}

/* 上传中 loading 遮罩 */
.upload-loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  z-index: 1;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 图片大图预览 */
.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.image-preview-full {
  max-width: 95vw;
  max-height: 95vh;
  object-fit: contain;
}

.fab-menu-item {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: 0;
  cursor: pointer;
  font-size: 13px;
  color: #333;
}

.fab-menu-item:active {
  background: #f5f5f5;
}

.fab-menu-icon {
  width: 16px;
  height: 16px;
  color: #333;
  flex-shrink: 0;
}

.fab-menu-text {
  font-size: 13px;
  color: #333;
}

/* 普通输入框模式 */
.fab-menu-btn {
  visibility: hidden;
  pointer-events: none;
  /* width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.3s;  */
}

.fab-menu-btn:active {
  background: #f5f5f5;
}

.plus-icon {
  width: 200px;
  height: 75px;
  margin-top: 6px;
  object-fit: contain;
}

.input-field {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-end;
}

/* 语音输入模式按钮 */
.voice-input-btn {
  width: 100%;
  height: 42px;
  background: transparent;
  border: 0;
  font-size: 15px;
  color: #a0a2a7;
  text-align: center;
  cursor: pointer;
  padding: 10px 0;
}

/* 语音输入模式：按住说话文字 */
.voice-display {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 42px;
  padding: 10px 0;
}

.voice-text {
  font-size: 15px;
  color: #a0a2a7;
}

.voice-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.mic-btn {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 4px 16px rgba(37, 45, 61, 0.05);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.3s;
  /* position: relative;
  top: -2px; */
}

.mic-btn:active {
  opacity: 0.6;
}

/* .stop-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ff4d4f;
  border-radius: 50%;
  box-shadow: 0 4px 16px rgba(255, 77, 79, 0.3);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.3s;
  margin-left: 8px;
}

.stop-btn:active {
  opacity: 0.8;
  transform: scale(0.95);
} */

.stop-icon-inner {
  width: 14px;
  height: 14px;
  background: #ffffff;
  border-radius: 3px;
}
.interrupt-mode {
  background: #fefdfc;
  box-shadow: 0px 4px 16px 0px rgba(170, 99, 68, 0.1);
  padding: 7px 12px 0px 12px;
}
.icon-close img {
  width: 20px;
  position: relative;
  right: -5px;
}
.interrupt-textarea :deep(.van-field__label) {
  width: 9px;
  position: absolute;
  left: 0px;
  bottom: 4px;
  margin-bottom: 1px;
  margin-right: 10px;
}
.interrupt-textarea :deep(.icon-edit-input) {
  width: 20px;
  /* align-items: flex-end; */
}
:deep(.van-cell):after {
  border: none;
}
:deep(.van-cell) {
  /* padding: unset; */
}
:deep(.interrupt-textarea .van-field__control) {
  line-height: 24px;
  padding-left: 13px;
}
</style>
