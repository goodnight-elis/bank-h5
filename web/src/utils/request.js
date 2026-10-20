import axios from "axios";
import { showFailToast, showConfirmDialog } from "vant";
import { getAppHeaders } from "./appContext";
import { goToLogin } from "@/utils/common.js";
// 环境配置
const config = {
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: import.meta.env.VITE_API_TIMEOUT || 30000,
};

// 创建 axios 实例
const service = axios.create({
  baseURL: config.baseURL,
  timeout: config.timeout,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * 请求拦截器：注入 Authorization / X-User-Id / X-App-Session-Id
 */
service.interceptors.request.use(
  (config) => {
    const appHeaders = getAppHeaders();
    config.headers = {
      ...config.headers,
      ...appHeaders
    }
    // get 请求添加时间戳, 防止缓存
    if (config.method?.toUpperCase() === "GET") {
      config.params = {
        ...config.params,
        _t: Date.now(),
      }
    }
    return config;
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器
 * 成功：errorCode === '000000' → 返回 data
 * 会话过期：errorCode === '120401' → 弹确认框，跳转登录
 * 失败：其他 → 弹 toast 提示 errorMsg
 */
service.interceptors.response.use(
  (response) => {
    const res = response.data;

    if (res.errorCode === "000000") {
      return res.data;
    }

    if (res.errorCode === "120401") {
      // 会话过期：弹窗确认后跳转，不允许取消
      showConfirmDialog({
        title: "提示",
        message: "会话已过期，请重新登录",
        confirmButtonText: "确定",
        showCancelButton: false, // 不显示取消按钮
        closeOnOverlayClick: false, // 点击遮罩层不关闭
        closeOnClickAction: false, // 点击按钮后不自动关闭（等待跳转完成）
      })
        .then(() => {
          // 确认后执行跳转
          console.log("后续处理");
          goToLogin();
        })
        .catch(() => {
          // 理论上不会走到这里（没有取消按钮）
        });
      return Promise.reject(new Error("会话已过期"));
    }

    // 业务错误：弹 toast 提示
    const errorMsg = res.errorMsg || "请求失败";
    showFailToast(errorMsg);
    return Promise.reject(new Error(errorMsg));
  },
  (error) => {
    // HTTP 层错误
    let message = "网络请求失败";
    if (error.response) {
      message = `请求失败 (${error.response.status})`;
    } else if (error.code === "ECONNABORTED") {
      message = "请求超时";
    } else if (error.message === "Network Error") {
      message = "网络连接失败";
    }
    showFailToast(message);
    return Promise.reject(error);
  }
);

/**
 * 通用请求方法
 */
const request = (config) => {
  const { url, method = "GET", params, data } = config;

  const axiosConfig = {
    method: method.toLowerCase(),
    url,
  };

  // 根据请求方法处理参数
  if (method.toUpperCase() === "GET" || method.toUpperCase() === "DELETE") {
    axiosConfig.params = params || data;
  } else {
    axiosConfig.data = data || params;
  }

  return service(axiosConfig);
};

export default request;
