import { defineStore } from "pinia";

export const useUserInfo = defineStore("user", {
  state: () => ({
    userInfo: {},
  }),
  actions: {
    setUserInfo(data) {
      this.userInfo = data;
    },
  },
});
