import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', {
  state: () => ({
      jsBridgeVersion: [],
      appCurrentVersion: '',
      isIOS: false,  // 是否IOS系统
      keyboardHeight:0 //ios 键盘高度
    }),
  actions: {
    setAppVersion(version) {
      this.appCurrentVersion = version;
    },
    setJsBridgeVersion(list) {
      this.jsBridgeVersion = list;
    },
    setJsBridgeIsIOS(isIOS) {
      this.isIOS = isIOS;
    },
    setKeyboardHeightIOS(keyboardHeight) {
      this.keyboardHeight = keyboardHeight;
    }
  }
});