/**
 * @create by k10872 2022/06/22/20:32:35
 * @update by k10872 2022/06/22/20:32:35
 * @desc 二次封装请求（ 是否走客户端通过 window.configVUE.requestByClient 确定 ）
 */
// import Vue from 'vue';
import { showDialog } from "vant";
import { useChatStore } from "../../stores/chat.js";
let _chatStore = null;
function getChatStore() {
  if (!_chatStore) {
    _chatStore = useChatStore();
  }
  return _chatStore;
}
/**
 * 获取系统信息
 * @returns {object}
 */
function getSystemInfo() {
  const temp = window.pluginHelper.device.getSystemInfo();
  const result = temp ? JSON.parse(temp).result : {};
  return {
    appVersion: result.appVersion || '', // APP版本，如：'2.3.2'
    model: result.model || '', // 手机型号，如 'iPhone 13'
    osType: result.platform || '', // 手机系统：'iOS' 或 'Android'
    sysVersion: result.systemVersion || '', // 手机系统版本，如 '15.0.1'
  };
}

// request请求动画显示/隐藏管理类
class RequestManager {
  constructor() {
    // 使用Map来存储每一个请求的标识符何状态
    this.requests = new Map();
    // 全局标志，标志是否至少有一个请求需要显示等待动画
    this.isLoading = false;

    // 用于存储能够正常请求的request
    this.requestMap = new Map();
  }

  // 显示一个新的请求
  startRequest({ requestId, loadMask, url }) {
    this.requests.set(requestId, { isLoading: loadMask, url });

    // 如果这是第一个需要显示等待动画的请求，则打开等待动画
    if (loadMask && !this.isLoading) {
      this.isLoading = true;

      // 显示loading动画
      showLoading();
    }
  }

  // 结束一个请求
  endRequest(requestId) {
    const request = this.requests.get(requestId);
    if (request) {
      this.requests.delete(requestId);
      // 全部接口请求结束，则关闭等待动画
      setTimeout(() => {
        if (this.requests.size === 0) {
          this.isLoading = false;

          // 关闭loading动画
          closeLoading();
        }
      }, 300);
    }
  }

  // 检查是否至少有一个请求需要显示等待动画
  isAnyLoading() {
    return this.isLoading;
  }
}

const requestManager = new RequestManager();

// 显示loading动画
const showLoading = () => {
  window.pluginHelper.device.openToast();
};

// 关闭loading动画
const closeLoading = () => {
  window.pluginHelper.device.closeToast();
};

/**
 * 走客户端
 * @param {object} params
 * @param {Function} resolve
 * @param {Function} reject
 */
function deviceRequest(params, resolve, reject) {
  let { requestId, isDialog } = params;
  delete params.requestId;
  delete params.isDialog;
  isDialog = isDialog === 'NO' ? false : true;

  // 特殊错误码，需退出系统重新登录
  const codeObj = {
    '070034': 'session未获取，请重新登录',
    '011010': '会话超时，请重新登录',
    '070013': '账号已在其他设备登录，如非本人操作请尽快修改密码',
  };
  window.pluginHelper.device.request(
    params,
    (result) => {
      // 这个不要删
      console.log(`【${params.name || ''}${params.url}】响应体:`, result);

      // 结束请求，同时判断是否关闭等待动画
      requestManager.endRequest(requestId);

      if (result.STATUS && codeObj[result.STATUS]) {
        showDialog({
          title: '温馨提示',
          message: codeObj[result.STATUS],
          confirmButtonColor: '#FF7538',
        }).then(() => {
          // 判断当前设备类型：安卓 | 苹果 | 鸿蒙
          const systemInfo = window.pluginHelper.device.getSystemInfo();
          let URL = 'app://login';
          if (
            systemInfo.indexOf('android') > -1 ||
            systemInfo.indexOf('HarmonyOS') > -1
          ) {
            URL = '/login/LoginActivity';
          }
          // 回到登录界面
          window.pluginHelper.device.navigateTo(URL);
          // 关闭水印
          window.pluginHelper.device.openWatermark(false);
        });
        return;
      }

      if (result.STATUS !== '000000') {
        // 070016 - 暂无权限错误码 - 无需 Dialog
        if (
          result.STATUS &&
          (result.STATUS === '070016' || result.STATUS === '999999')
        )
          isDialog = false;
        const { MSG } = result;
        if (isDialog) {
          if (result.STATUS !== '070080') {
            showDialog({
              title: '温馨提示',
              message: MSG,
              confirmButtonColor: '#FF7538',
            });
          }
        }
        reject(result);
      } else {
        resolve(result);
      }
    },
    (error) => {
      // 结束请求，同时判断是否关闭等待动画
      requestManager.endRequest(requestId);
      console.log(`【${params.name || ''}${params.url}】响应体error:`, error);

      reject(error);

      if (isDialog) {
        // 提取 STATUS 和 MSG
        const STATUS = error.STATUS;
        const MSG = error.MSG || error.toString();

        // 判断是否是特殊错误码
        if (STATUS && codeObj[STATUS]) {
         showDialog({
            title: '温馨提示',
            message: codeObj[STATUS],
            confirmButtonColor: '#FF7538',
          }).then(() => {
            // 判断是否为鸿蒙设备，执行对应跳转
            const systemInfo = window.pluginHelper.device.getSystemInfo();
            if (systemInfo.indexOf('HarmonyOS') > -1) {
              window.pluginHelper.device.navigateTo('/login/LoginActivity');
              window.pluginHelper.device.openWatermark(false);
            }
            // 其他设备（如安卓、iOS）可根据需要扩展
          });
          return;
        }

        // 非特殊错误码，正常弹窗提示
        showDialog({
          title: '温馨提示',
          message: MSG,
          confirmButtonColor: '#FF7538',
        });
      }
    }
  );
}

/**
 * @create by k10876 2022/07/22/09:07:47
 * @update by k10876 2022/07/22/09:07:47
 * @desc 判断是否走客户端或mock数据
 * params = {
 *   url : '',                                 // 请求地址（params对象属性）
 *   method : 'post',                          // 请求方法类型（params对象属性，默认post，可自定义）
 *   data : {                                  // 请求时的入参（params对象属性）
 *     param1: '',
 *     param2: '',
 *     ...
 *   },
 *   noToken: true                             // 请求头token校验,如果config.noToken不传，则默认接口请求头有sessionId
 *   config : {                                // 请求相关的配置（params对象属性，整个对象可不传，有需要使用的对象属性即可配置）
 *     customParaChange : false,               // 判断接口请求是否使用默认值
 *     headers : {                             //接口请求头
 *       "Content-Type": "application/json",
 *       "mock": "false",
 *     },
 *     upload : {},                            //（config对象属性,个别接口的入参对象属性）
 *     cacheFlag : 'noCache',                  // 是否全量覆盖(有缓存的接口再次调用时需要,该属性为判断属性，传参时记得删除)
 *     cacheKey : ''                           // 需要离线缓存加该属性
 *   }
 * }
 */
const requestApp = (params) => {
  const chatStore = getChatStore(); // ✅ 改为延迟调用
  // 记录开始请求时间
  const requestStartTime = new Date().getTime();
  params.requestId = `request_${requestStartTime}`;

  // 是否加载等待动画，如果等于'NO'表示不加载
  const { loadMask, url, requestId } = params;

  // 发起请求，判断是否需要打开等待动画
  requestManager.startRequest({
    url,
    requestId,
    loadMask: loadMask === 'NO' ? false : true,
  });

  console.log(`【${params.name || ''}${params.url}】接口入参：`, params.data);

  return new Promise((resolve, reject) => {
    if (!params.method) params.method = 'post';

    // get 请求 参数拼接
    const { method, data, url } = params;
    if (url && method === 'get' && data && Object.keys(data).length) {
      let temp = [];
      Object.keys(data).forEach((item) => {
        temp.push(`${item}=${data[item]}`);
      });

      if (temp.length) params.url = params.url + '?' + temp.join('&');
    }

    if (!params.config) params.config = {};
    if (!params.config.headers) params.config.headers = {};

    /**
     * @create by k10876 2022/08/03/15:12:57
     * @update by k10876 2022/08/03/15:12:57
     * @desc 判断请求方式 requestByClient=true && isWxWorkChat=false 走客户端
     */
    try {
      const sessionId = chatStore.appSessionId;
      if (!params.noToken && sessionId) {
        params.config.headers = {
          ...params.config.headers,
          sessionId,
        };
      }

      params.config.headers = {
        ...params.config.headers,
        responseType: params.responseType || 'json',
        'CB-SESSION': sessionId || '',
        ...getSystemInfo(),
      };
    } catch (error) {
      console.log('调用客户端请求方法error>>>', error);
    }

    deviceRequest(params, resolve, reject);
  });
};

export default requestApp;
