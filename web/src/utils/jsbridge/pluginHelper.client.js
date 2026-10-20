import { useAppStore } from "../../stores/app.js";
import pluginHelper from "./pluginHelper.js";
import requestApi from "./request.js";

// ✅ 改为延迟初始化，不再在顶层执行
let _appStore = null;
function getAppStore() {
  if (!_appStore) {
    _appStore = useAppStore();
  }
  return _appStore;
}

/**
 * 获取JS桥版本列表
 */
function getJsbridgeVersion() {
  requestApi({
    url: "/api/v1/publics/qry/dicts/noAuth",
    method: "post",
    loadMask: "NO",
    data: {
      dicTypeIds: ["JS_BRIDGE_VERSION"],
    },
  }).then((result) => {
    console.log("🚀 ~ getJsbridgeVersion ~ result:", result);
    const { data } = result;
    const { JS_BRIDGE_VERSION: list } = data || {};
    if (Array.isArray(list) && list.length > 0) {
      window.pluginHelper.device.setSessionAsync({
        SESS_KEY: "JS_BRIDGE_VERSION",
        SESS_DATA: JSON.stringify(list),
        cacheType: "1",
      });
      getAppStore().setJsBridgeVersion(list);
    }
  });
}

window.onload = () => {
  // 获取JS桥版本列表
  isInApp() && getJsbridgeVersion();
};

/**
 * 获取系统信息
 * @returns {object}
 */
function getSystemInfo() {
  const temp = window.pluginHelper.device.getSystemInfo();
  const result = temp ? JSON.parse(temp).result : {};
  return {
    appVersion: result.appVersion || "", // APP版本，如：'2.3.2'
    model: result.model || "", // 手机型号，如 'iPhone 13'
    osType: result.platform || "", // 手机系统：'iOS' 或 'Android'
    sysVersion: result.systemVersion || "", // 手机系统版本，如 '15.0.1'
  };
}

/**
 * 判断是否在APP
 */
function isInApp() {
  return window.navigator.userAgent.indexOf("NbcbPalmBankVer") !== -1;
}

/**
 * 判断版本号大小
 */
function compareVersion(appVersion, jsbVersion) {
  for (let i = 0; i < appVersion.length; i++) {
    if (+appVersion[i] > +jsbVersion[i]) {
      return 1;
    } else if (+appVersion[i] < +jsbVersion[i]) {
      return -1;
    }
  }
  return 0;
}

/**
 * 判断js桥是否存在当前app版本
 */
function IsJsBridgeExist(JSbridgeName) {
  try {
    const noCheck = [
      "getSession",
      "setSession",
      "getStorage",
      "setStorage",
      "request",
      "getSystemInfo",
      "setSessionAsync",
    ];
    if (noCheck.includes(JSbridgeName)) return true;

    const appStore = getAppStore(); // ✅ 改为延迟调用

    // 获取格个JS桥版本信息
    let jsbridgeVersionList = appStore.jsBridgeVersion;
    console.log("🚀 ~ jsbridgeVersionList111:", jsbridgeVersionList);

    if (
      !jsbridgeVersionList ||
      (jsbridgeVersionList && jsbridgeVersionList.length === 0) ||
      !appStore.appCurrentVersion
    ) {
      try {
        if (!appStore.appCurrentVersion) {
          const data = getSystemInfo();
          console.log("data.appVersion>>>", data);
          appStore.setAppVersion(data.appVersion);
        }

        if (
          !jsbridgeVersionList ||
          (jsbridgeVersionList && jsbridgeVersionList.length === 0)
        ) {
          let versionList = [];
          const res = pluginHelper.device.getSession({
            SESS_KEY: "JS_BRIDGE_VERSION",
            cacheType: "1",
          });
          if (res.result && JSON.parse(res.result).data) {
            versionList = JSON.parse(res.result).data;
            if (typeof versionList === "string") {
              versionList = JSON.parse(versionList);
            }
          }
          if (Array.isArray(versionList) && versionList.length > 0) {
            appStore.setJsBridgeVersion(versionList);
            // 重新获取
            jsbridgeVersionList = appStore.jsBridgeVersion;
          }
        }
      } catch (e) {
        console.error(`JS桥校验数据解析报错：${e}`);
      }
    }

    console.log("🚀 ~ jsbridgeVersionList222:", jsbridgeVersionList);
    const jsbridgeInfo = jsbridgeVersionList.find(
      (item) => item.dictId === JSbridgeName
    );
    console.log("🚀 ~ IsJsBridgeExist ~ jsbridgeInfo:", jsbridgeInfo);

    if (!jsbridgeInfo || (jsbridgeInfo && !jsbridgeInfo.extVal1)) {
      return false;
    }

    // 当前JS桥最低APP版本号码支持
    const jsbridgeVersion = jsbridgeInfo.extVal1.split(".");
    // 当前APP版本号
    let appVersion = [];
    if (appStore.appCurrentVersion) {
      appVersion = appStore.appCurrentVersion.split(".");
    }
    // 比较版本号
    const versionFlag = compareVersion(appVersion, jsbridgeVersion);
    console.log("🚀 ~ JS桥最低APP版本号码支持比较versionFlag:", versionFlag);
    return versionFlag >= 0;
  } catch (e) {
    console.error("JS桥最低APP版本号码支持比较失败：", e);
    return true;
  }
}

/**
 * 输出JS桥调用报错信息
 * @param {String} bridgeType JS桥名称
 * @param {String} errorMessage 错误信息
 */
function outputErrorMessage(bridgeType, errorMessage) {
  console.error(`调用JS桥${bridgeType}异常：${errorMessage}`);
}

/**
 * @api {注意} 由于掌银项目的封装和挂载,调用方法时pluginHelper.device路径换成this.DEVICE 写在前面
 * @apiGroup  前言
 * @apiDescription  调用js桥方法时需要注意的地方,根据项目的具体封装或挂载为准,具体文件可参考 pluginHelper.client.js
 * <br/>由于掌银项目的封装和挂载,调用方法时pluginHelper.device路径换成this.DEVICE
 *
 * @apiParamExample {json} 示例
 * pluginHelper.device.closeWebView() // 未挂载时调用
 * this.DEVICE.closeWebView() //已在main.js的入口文件上挂载,可用this直接调用
 */
(function () {
  /**
   * 调用客户端方法
   *
   * <br>
   *
   * @param funcName
   *            {string} 方法名,js与客户端约定
   * @param jsonData
   *            {string} 传递参数
   *
   * @callback responseData 回调参数{json}<br>
   *           eg. {func : **,data: **}
   */
  // 异步调用
  var _callHandler = function (funcName, jsonData) {
    if (isInApp()) {
      let flag = IsJsBridgeExist(funcName);
      if (!flag) return false;
    }
    window.WebViewJavascriptBridge.callHandler(funcName, jsonData);
  };
  //同步调用
  var _callHandlerSync = function (funcName, jsonData) {
    if (isInApp()) {
      let flag = IsJsBridgeExist(funcName);
      if (!flag) return false;
    }
    return isInApp()
      ? window.WebViewJavascriptBridge.callHandlerSync(funcName, jsonData)
      : "msg:调用成功，请在客户端使用改功能!";
  };

  var _connectWebViewJavascriptBridge = function (callback) {
    if (window.WebViewJavascriptBridge) {
      callback(WebViewJavascriptBridge);
    } else {
      document.addEventListener(
        "WebViewJavascriptBridgeReady",
        function () {
          callback(WebViewJavascriptBridge);
        },
        false
      );
    }
  };

  var _nativeCall = function (bridge) {
    bridge.init(function (message, responseCallback) {
      responseCallback && responseCallback();
    });
  };

  // 开启jsbridge监听
  _connectWebViewJavascriptBridge(_nativeCall);

  var client = {
    /* 修改 */
    _getPageTitle: function (pageId) {
      var page = $(pageId);
      var cfg = {
        title: page.attr("title"),
      };
      var leftCfg = page.attr("data-btnLeft").split("|");
      cfg.leftButton = generyTitleConf(leftCfg);
      var rightCfg = page.attr("data-btnRight").split("|");
      cfg.rightButton = generyTitleConf(rightCfg);
      var theme = page.data("theme");
      cfg.theme = theme;
      cfg.titleBgColor = page.attr("titleBgColor");
      cfg.titleImgLink = page.attr("titleImgLink");
      var rightExtraCfg =
        page.attr("data-btnRightExtra") &&
        page.attr("data-btnRightExtra").split("|");
      cfg.rightButtonExtra = generyTitleConf(rightExtraCfg);
      cfg.titleTxtColor = page.attr("titleTxtColor");
      return cfg;
    },

    /**
     * @final
     * @description 判断是否为浏览器进入
     */

    isWeb: false,
    chnlId: window.VUE_APP_chnlId, //企业web渠道号
    isGateWay: window.VUE_APP_ISGATEWAY, //是否走网关请求
    isMessageEncrypt: window.VUE_APP_isMessageEncrypt, //是否加密
    upsSid: "",
    timeOffSet: "0",

    request: (params, success, failure) => {
      const {
        url = "", //请求接口
        method = "post", //请求方法
        data = null, //请求入参
        config = {}, //可选的配置选项
      } = params;

      const {
        customParaChange = false, // 判断接口请求是否使用默认值  customParaChange = false为使用默认值
        upload = {}, // 个别接口需要的对象属性
        cacheFlag = "noCache", // 是否需要全量覆盖（添加缓存cacheKey的接口再次调用时需要判断）默认为cacheFlag='noCache'不覆盖
        cacheKey = "", // 判断接口是否需要缓存
      } = config;

      // 请求头
      const headers = {
        "Content-Type": "application/json",
        mock: "false",
        "CB-SESSION": "",
        "CURRENT-VERSION": "",
        ...config.headers,
      };

      // 全局参数
      let cfg = {};
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let configObj = {};

        // 判断接口传值是否需要重新发起缓存的接口,若需要缓存cacheFlag='cache',将全量覆盖所有传参,默认为不缓存
        if (cacheFlag === "noCache") {
          //正常调用接口，不需要重新调起缓存的接口

          //判断接口请求是否使用传参默认值
          if (customParaChange === false) {
            //customParaChange = false为使用默认值
            let date = new Date();
            let time = date.getTime(); //时间戳
            // 默认需要传的参数
            configObj = {
              url: url, //接口请求地址
              method: method, //接口请求方法
              responseType: "", //响应类型
              headers: headers, //接口请求头
            };

            if (method === "post") {
              configObj["body"] = {
                //接口请求体
                requestData: data, //data为需要传递的参数
                requestId: time,
                timestamp: time,
              };
            }

            if (cacheKey) {
              //接口是否需要缓存，若需要就加该属性（少数接口需要使用，比如:访客模块）
              configObj["cacheKey"] = cacheKey;
            }
          } else {
            // customParaChange = true 可修改需要用到的参数,不走默认值
            let date = new Date();
            let time = date.getTime(); //时间戳
            // 默认需要传的参数
            configObj = {
              url: url, //接口请求地址
              method: method, //接口请求方法
              headers: headers, //接口请求头
              upload: upload,
            };

            // if (upload) {
            //     configObj.headers['Content-Type'] = "multipart/form-data"
            //   }
            if (method === "post") {
              configObj["body"] = {
                //接口请求体
                ...data, //data为需要传递的参数
                requestId: time,
                timestamp: time,
              };
            }
          }

          cfg.config = configObj;
          cfg.successCallback = pluginHelper.getFunctionName(success);
          cfg.failCallback = pluginHelper.getFunctionName(failure);
          _callHandler("request", JSON.stringify(cfg));
        } else if (cacheFlag === "cache") {
          //需要缓存cacheFlag='cache',将所有的东西全部覆盖

          let _params = params;
          delete _params.config.cacheFlag; //该属性只作为判断条件，在入参里需删除

          cfg = params;
          _callHandler("request", JSON.stringify(cfg));
        }
      } catch (error) {
        outputErrorMessage("request", error);
      }
    },

    // 获取坐标间距离
    getCoordinateDistance: (data) => {
      try {
        let temp = _callHandlerSync(
          "getCoordinateDistance",
          JSON.stringify(data)
        );
        return temp;
      } catch (error) {
        outputErrorMessage("getCoordinateDistance", error);
      }
    },

    // //ocr图片裁剪
    OCRScaner: (data, success, failure, cancel) => {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {
          ...data,
        };

        console.log("OCRScaner入参", cfg);

        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        cfg.cancelCallback = pluginHelper.getFunctionName(cancel);
        _callHandler("OCRScaner", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("OCRScaner", error);
      }
    },

    // forceUpdate 异步强制更新
    forceUpdate: (data) => {
      try {
        _callHandler("forceUpdate", JSON.stringify(data));
      } catch (error) {
        outputErrorMessage("forceUpdate", error);
      }
    },

    // 人脸指纹状态查询
    ifaaCheckStatus: function (
      payload,
      trancId,
      verifyType,
      userId,
      trancType,
      success,
      failure
    ) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }

        const config = {
          payload,
          trancId,
          verifyType,
          userId,
          trancType,
        };
        let cfg = {
          config,
        };

        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);

        _callHandler("ifaaCheckStatus", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("ifaaCheckStatus", error);
      }
    },

    // 人脸指纹注册接口
    ifaaRegister: function (
      payload,
      trancId,
      verifyType,
      userId,
      trancType,
      reasonTitle,
      success,
      failure
    ) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let config = {
          payload: payload,
          trancId: trancId,
          verifyType: verifyType,
          userId: userId,
          trancType: trancType,
          reasonTitle: reasonTitle,
        };
        let cfg = {
          config: config,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        _callHandler("ifaaRegister", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("ifaaRegister", error);
      }
    },

    //  人脸指纹注销接口
    ifaaUnregister: function (
      payload,
      trancId,
      verifyType,
      userId,
      trancType,
      success,
      failure
    ) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let config = {
          payload: payload,
          trancId: trancId,
          verifyType: verifyType,
          userId: userId,
          trancType: trancType,
        };
        let cfg = {
          config: config,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        _callHandler("ifaaUnregister", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("ifaaUnregister", error);
      }
    },

    // 人脸指纹核实
    ifaaVerify: function (
      payload,
      trancId,
      verifyType,
      userId,
      trancType,
      success,
      failure
    ) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let config = {
          payload: payload,
          trancId: trancId,
          verifyType: verifyType,
          userId: userId,
          trancType: trancType,
        };
        let cfg = {
          config: config,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        _callHandler("ifaaVerify", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("ifaaVerify", error);
      }
    },

    // 获取设备支持指纹还是人脸
    ifaaVerifyType: function () {
      try {
        let temp = _callHandlerSync("ifaaVerifyType", JSON.stringify({}));

        return temp;
      } catch (error) {
        outputErrorMessage("ifaaVerifyType", error);
      }
    },

    // 调用人脸识别
    livingCheck: function (success, failure, cancel) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {};
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        cfg.cancelCallback = pluginHelper.getFunctionName(cancel);
        _callHandler("livingCheck", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("livingCheck", error);
      }
    },

    //  crypt 加密解密
    crypt: function (type, key, text, operation) {
      try {
        let cfg = {
          type: type,
          key: key,
          text: text,
          operation: operation,
        };
        let temp = _callHandlerSync("crypt", JSON.stringify(cfg));
        return temp;
      } catch (error) {
        outputErrorMessage("crypt", error);
      }
    },

    // sm2Crypt sm2加密
    sm2Crypt: function (text) {
      try {
        let cfg = {
          text: text,
        };
        let temp = _callHandlerSync("sm2Crypt", JSON.stringify(cfg));
        return temp;
      } catch (error) {
        outputErrorMessage("sm2Crypt", error);
      }
    },

    // boardLineChange 版面切换
    boardLineChange: function (text, success, failure) {
      try {
        let cfg = {
          token: text,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        _callHandler("boardLineChange", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("boardLineChange", error);
      }
    },

    // 获取session
    getSession: function (data) {
      try {
        let cfg = {
          ...data,
        };
        let temp = _callHandlerSync("getSession", JSON.stringify(cfg));
        return temp;
      } catch (error) {
        outputErrorMessage("getSession", error);
      }
    },

    //设置session
    setSession: function (data) {
      try {
        let cfg = {
          ...data,
        };
        let temp = _callHandlerSync("setSession", JSON.stringify(cfg));
        return temp;
      } catch (error) {
        outputErrorMessage("setSession", error);
      }
    },

    /**
     * 在客户端中，异步存储数据
     * @param {*} data
     *  {
     *    SESS_KEY: 'key值名称',
     *    cacheType: '1', // 1-持久存储，0-临时存储
     *    SESS_DATA: JSON.stringify(userData) // 存储的数据
     *   },
     * @param {*} callback 回调函数：function(){}
     */
    setSessionAsync: function (data, callback) {
      try {
        let cfg = {
          ...data,
        };
        cfg.callback = pluginHelper.getFunctionName(callback);
        let temp = _callHandler("setSessionAsync", JSON.stringify(cfg));
        return temp;
      } catch (error) {
        outputErrorMessage("setSessionAsync", error);
      }
    },

    /**
     * @create by k10876 刘勇 2024-03-01 星期五 09:59:19
     * @update by k10876 刘勇 2024-03-01 星期五 09:59:19
     * @desc 更新登录信息，客户端获取到登录信息后会更新客户端存储的登录信息，
     *       其中IOS是同步操作，Android是异步操作，为了确保前端能够及时获取到登录信息，
     *       特意在成功回调中返回loginInfo，用于前端取数据
     * @params {Object} data 接口请求参数
     * @params {Function} success 成功回调 function(loginInfo) {}
     * @params {Function} failure 失败回调 function(error) {}
     */
    updateLoginInfo: function (data, success, failure) {
      // data 取值
      // data: {
      //   header: {
      //     responseType: 'json',
      //     'CB-SESSION': this.$userData.sessionId,
      //     ...getSystemInfo() // 获取客户端设备信息：src/utils/util.js
      //   },
      //   body: { refreshToken: this.$userData.refreshToken }
      // };

      let cfg = {
        url: "/api/v1/basicService/appLogin/getSessionInfo",
        ...data,
      };

      cfg.successCallback = pluginHelper.getFunctionName(success);
      cfg.failCallback = pluginHelper.getFunctionName(failure);

      _callHandler("updateLoginInfo", JSON.stringify(cfg));
    },

    // 调用静默登录
    silentLogin: function (data, success, failure) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {
          ...data,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        _callHandler("silentLogin", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("silentLogin", error);
      }
    },

    // 打开营销地图
    openMKTMap: function (data) {
      try {
        let cfg = {
          ...data,
        };
        let temp = _callHandlerSync("openMKTMap", JSON.stringify(cfg));
        return temp;
      } catch (error) {
        outputErrorMessage("openMKTMap", error);
      }
    },

    // 回到登录页
    navigateTo: function (url = "app://login") {
      try {
        let cfg = {
          url: url,
        };
        let temp = _callHandlerSync("navigateTo", JSON.stringify(cfg));
        return temp;
      } catch (error) {
        outputErrorMessage("navigateTo", error);
      }
    },

    // 打开其他页面(设备租赁)
    openOtherApp: function (data) {
      try {
        let cfg = {
          appConfig: data,
        };
        let temp = _callHandlerSync("openOtherApp", JSON.stringify(cfg));
        if (temp.indexOf("-100") !== -1) {
          alert("未安装相关应用，无法跳转！");
        }
        return temp;
      } catch (error) {
        outputErrorMessage("openOtherApp", error);
      }
    },

    // 营销地图操作
    mapInteractive: function (cfg) {
      try {
        _callHandler("mapInteractive", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("mapInteractive", error);
      }
    },

    // 图片分享
    multiShare: function (data) {
      try {
        let cfg = {
          ...data,
        };
        return _callHandler("multiShare", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("multiShare", error);
      }
    },

    //  上传图片/视频
    openPhoto: function (data, success, failure, cancel) {
      if (window.IFRAME_FLAG) {
        window.parent.postMessage(
          {
            jsBridge: "openPhoto",
            data,
          },
          "*"
        );
        return;
      }
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {
          ...data,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        cfg.cancelCallback = pluginHelper.getFunctionName(cancel);
        _callHandler("openPhoto", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("openPhoto", error);
      }
    },

    // 拍照或从手机相册中选图
    chooseMultiplePhotos: function (data, success, failure, cancel) {
      if (window.IFRAME_FLAG) {
        window.parent.postMessage(
          {
            jsBridge: "chooseMultiplePhotos",
            data,
          },
          "*"
        );
        return;
      }
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {
          config: data,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        cfg.cancelCallback = pluginHelper.getFunctionName(cancel);
        _callHandler("chooseMultiplePhotos", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("chooseMultiplePhotos", error);
      }
    },

    // 保存图片
    savePhoto: function (data, success, failure) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {
          config: data,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        _callHandler("savePhoto", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("savePhoto", error);
      }
    },

    // 水印相机
    waterMarkCamera: function (data) {
      try {
        let cfg = {
          ...data,
        };
        _callHandler("waterMarkCamera", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("waterMarkCamera", error);
      }
    },

    // 打开/关闭水印
    openWatermark: function (open, text) {
      try {
        let cfg = {
          open: open, //关闭/打开
          config: {
            //水印配置
            size: 14,
            color: "#666666",
            alpha: 0.1,
            angle: 5.652,
            text: text,
          },
        };
        let temp = _callHandlerSync("openWatermark", JSON.stringify(cfg));
        return temp;
      } catch (error) {
        outputErrorMessage("openWatermark", error);
      }
    },

    // 旋转屏幕
    rotation: function (data) {
      if (window.IFRAME_FLAG) {
        window.parent.postMessage(
          {
            jsBridge: "rotation",
            data,
          },
          "*"
        );
        return;
      }
      try {
        let cfg = {
          ...data,
        };
        _callHandler("rotation", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("rotation", error);
      }
    },

    // 上传文件
    openFile: function (success, failure, cancel) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {};

        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        cfg.cancelCallback = pluginHelper.getFunctionName(cancel);
        _callHandler("openFile", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("openFile", error);
      }
    },

    // 获取键盘高度
    getKeyboardHeight: (success, failure, cancel) => {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {};

        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        cfg.cancelCallback = pluginHelper.getFunctionName(cancel);
        _callHandler("getKeyboardHeight", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("getKeyboardHeight", error);
      }
    },

    // 展示图片(url转图片base64)
    getPhoto: function (data, success, failure) {
      if (window.IFRAME_FLAG) {
        window.parent.postMessage(
          {
            jsBridge: "getPhoto",
            data,
          },
          "*"
        );
        return;
      }
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {
          ...data,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        _callHandler("getPhoto", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("getPhoto", error);
      }
    },

    // 图片水印处理
    processPhoto: function (data, success, failure) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {
          ...data,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        _callHandler("processPhoto", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("processPhoto", error);
      }
    },

    // 裁剪图片
    cropPhoto: function (data, success, failure, cancel) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {
          ...data,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        cfg.cancelCallback = pluginHelper.getFunctionName(cancel);
        _callHandler("cropPhoto", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("cropPhoto", error);
      }
    },

    // 经纬度获取地址信息(逆地理编码)
    getLocationReGeocode: function (data, success, failure) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {
          ...data,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        _callHandler("getLocationReGeocode", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("getLocationReGeocode", error);
      }
    },

    // 地址转经纬度
    getCoordinateFromAddress: function (data, success, failure) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {
          ...data,
        };
        console.log("getCoordinateFromAddress", cfg);
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        _callHandler("getCoordinateFromAddress", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("getCoordinateFromAddress", error);
      }
    },

    /**
     * 打开其他功能页面
     * @description 该功能打开其他功能页面或工程页面,常用的只有url属性。
     * @param {Object} data
     * @param {Number} height 打开的WebView高度（取值0到1）
     * @param {Object} navigationBar 导航栏配置对象(需要时传递该对象及其配置项，如下案例)
     * @param {String} hidden 是否隐藏导航栏true/false(导航栏配置项)
     * @param {String} isEnabled 导航栏按钮是否能点击true/false(导航栏配置项)
     * @param {String} backgroundColor 导航栏背景色(导航栏配置项)
     * @param {String} title 标题配置文字及颜色(导航栏配置项)
     * @param {Array} left 左边按钮的配置(导航栏配置项)
     * 1. enabled:是否可点击;
     * 2. fontSize:字体大小;
     * 3. title:标题;
     * 4. titleColor:标题颜色;
     * 5. callback:点击事件的回调;
     * 6. image:按钮图片;
     * 7. type:按钮类型 1: 左按钮1 ; 3:左按钮2;
     * 8. extra:扩展信息;
     * 9. imageSize:图片大小{width:宽;height:高}
     * @param {Array} right 右边按钮的配置(导航栏配置项):
     * 1. enabled:是否可点击;
     * 2. fontSize:字体大小;
     * 3. title:标题;
     * 4. titleColor:标题颜色;
     * 5. callback:点击事件的回调;
     * 6. image:按钮图片;
     * 7. type:按钮类型 2: 右按钮1 ; 4:右按钮2;
     * 8. extra:扩展信息;
     * 9. imageSize:图片大小{width:宽;height:高}
     * @param {Object} statusBar 状态栏配置(导航栏配置项)
     * 1.hidden:是否隐藏状态栏true/false
     * 2.style:状态栏模式 dark深色/light浅色
     * @param {String} hidden 是否隐藏导航栏(导航栏配置项)
     * @param {String} closeAction 是否关闭容器 1 关闭当前容器 2关闭所有容器
     * @param {String} url 页面地址
     * @param {String} landscapeNeedTop（仅对安卓有效） 1-横屏时不需要顶部导航栏  0或者不传-表示横屏时需要导航栏
     * @example {json} 代码案例
     * pluginHelper.device.openWebView({
     *   // height: 0.9, // 按需设置，表示webview的高度只到手机屏幕的90%，默认100%，可通过pluginHelper.device.resizeWebViewHeight({ height: 取值0到1 })重置指定高度
     *   navigationBar: {
     *       hidden: false,
     *       title: { title: '客户账单', titleColor: '#333333' },
     *       backgroundColor: '#ffffff',
     *       left: [
     *         {
     *           color: '#000000',
     *           type: 'back',
     *           callback: this.onLeftClick()
     *         }
     *       ]
     *     },
     *  url: 'https://www.baidu.com',
     *  landscapeNeedTop:'1'
     * });
     *
     */
    openWebView: function (data) {
      if (window.IFRAME_FLAG) {
        window.parent.postMessage(
          {
            jsBridge: "openWebView",
            data,
          },
          "*"
        );
        return;
      }
      try {
        // Ios
        // 文件在线预览时，屏蔽屏幕右上角的图标（...），避免文件被下载
        if (data.navigationBar && data.navigationBar.right) {
          delete data.navigationBar.right;
        }

        var cfg = {
          config: data,
        };
        _callHandler("openWebView", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("openWebView", error);
      }
    },

    /**
     * 异步重置webView的高度
     * @param {Object} config 高度配置：{ height: 0到1取值 }
     */
    resizeWebViewHeight: function (config = { height: 1 }) {
      try {
        var cfg = {
          config: config,
        };
        _callHandler("resizeWebView", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("resizeWebView", error);
      }
    },

    // 同步关闭键盘
    closeSearchKeyboard: () => {
      try {
        _callHandlerSync("closeSearchKeyboard", JSON.stringify({}));
      } catch (error) {
        outputErrorMessage("closeSearchKeyboard", error);
      }
    },

    // 设置导航栏
    setNavigationBar: function (data) {
      try {
        var cfg = {
          config: data,
        };
        _callHandler("setNavigationBar", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("setNavigationBar", error);
      }
    },

    // 录音
    record: function (data, success, failure, cancel) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {
          ...data,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        cfg.cancelCallback = pluginHelper.getFunctionName(cancel);
        _callHandler("record", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("record", error);
      }
    },

    // 播放录音
    playRecord: function (data, success, failure, end) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {
          ...data,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        cfg.endCallback = pluginHelper.getFunctionName(end);
        _callHandler("playRecord", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("playRecord", error);
      }
    },

    // 停止播放录音
    stopPlayRecord: function (data, success, failure) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {
          ...data,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        _callHandler("stopPlayRecord", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("stopPlayRecord", error);
      }
    },

    // 音频识别
    audioRecognizer: function (data, callback, failure) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {
          ...data,
        };
        // cfg.callback = 'WebViewJavascriptBridge._handleMessageFromNative'; //传给客户端的方法  默认传'WebViewJavascriptBridge._handleMessageFromNative'
        cfg.callback = pluginHelper.getFunctionName4Static(callback);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        _callHandler("audioRecognizer", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("audioRecognizer", error);
      }
    },

    // 删除录音
    deleteRecord: function (data, success, failure) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {
          ...data,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        _callHandler("deleteRecord", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("deleteRecord", error);
      }
    },

    // clipboardText 复制文本到粘贴板
    clipboardText: function (data, success, failure) {
      if (window.IFRAME_FLAG) {
        window.parent.postMessage(
          {
            jsBridge: "clipboardText",
            data,
          },
          "*"
        );
        return;
      }
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {
          ...data,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        _callHandler("clipboardText", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("clipboardText", error);
      }
    },

    mapNavigation: function (data) {
      try {
        const cfg = { ...data, viaPoints: JSON.stringify(data.viaPoints) };
        return _callHandler("mapNavigation", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("mapNavigation", error);
      }
    },

    // setH5Cache 保存H5缓存
    setH5Cache: function (data) {
      try {
        let cfg = {
          ...data,
        };
        return _callHandler("setH5Cache", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("setH5Cache", error);
      }
    },

    //  getH5Cache 获取H5缓存
    getH5Cache: function (data, callback) {
      callback = pluginHelper.getFunctionName(callback);
      try {
        var cfg = {
          ...data,
          callback: callback,
        };
        _callHandler("getH5Cache", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("getH5Cache", error);
      }
    },

    // addBackListener 添加返回按钮回调监听
    addBackListener: function (data, callback) {
      callback = pluginHelper.getFunctionName(callback);
      try {
        var cfg = {
          ...data,
          callback: callback,
        };
        _callHandler("addBackListener", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("addBackListener", error);
      }
    },

    // removeBackListener 移除返回按钮回调监听
    removeBackListener: function (data, callback) {
      callback = pluginHelper.getFunctionName(callback);
      try {
        var cfg = {
          ...data,
          callback: callback,
        };
        _callHandler("removeBackListener", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("removeBackListener", error);
      }
    },

    // showKeyboard 打开键盘
    showKeyboard: function (data, callback) {
      try {
        let config = {
          ...data,
        };
        let cfg = {
          config: config,
        };
        cfg.callback = pluginHelper.getFunctionName4Static(callback);
        _callHandler("showKeyboard", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("showKeyboard", error);
      }
    },

    // H5页面 唤起键盘
    showSearchKeyboard: function (callback, searchCallback) {
      try {
        let cfg = {
          config: {},
        };
        cfg.callback = pluginHelper.getFunctionName4Static(callback);
        cfg.searchCallback = pluginHelper.getFunctionName(searchCallback);
        _callHandler("showSearchKeyboard", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("showSearchKeyboard", error);
      }
    },

    // dismissKeyboard 关闭键盘
    dismissKeyboard: function () {
      try {
        _callHandler("dismissKeyboard", JSON.stringify({}));
      } catch (error) {
        outputErrorMessage("dismissKeyboard", error);
      }
    },

    // 该功能获取状态栏高度(同步调用)
    getStatusBarHeight: function () {
      try {
        let temp = _callHandlerSync("getStatusBarHeight", JSON.stringify({}));
        return temp;
      } catch (error) {
        outputErrorMessage("getStatusBarHeight", error);
      }
    },

    // getBottomHeight 屏幕底部高度
    getBottomHeight: function () {
      try {
        let temp = _callHandlerSync("getBottomHeight", JSON.stringify({}));
        return temp;
      } catch (error) {
        outputErrorMessage("getBottomHeight", error);
      }
    },

    // trackLogin 神策用户登录
    trackLogin: function (data) {
      try {
        var cfg = {
          ...data,
        };
        return _callHandlerSync("trackLogin", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("trackLogin", error);
      }
    },

    // trackEvent 神策代码埋点追踪事件
    trackEvent: function (data) {
      try {
        var cfg = {
          ...data,
        };
        return _callHandlerSync("trackEvent", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("trackEvent", error);
      }
    },

    // clearAllCacheData 清除缓存
    clearAllCacheData: function () {
      try {
        let temp = _callHandlerSync("clearAllCacheData", JSON.stringify({}));
        return temp;
      } catch (error) {
        outputErrorMessage("clearAllCacheData", error);
      }
    },

    // getAllCacheSize 获取缓存大小
    getAllCacheSize: function () {
      try {
        let temp = _callHandlerSync("getAllCacheSize", JSON.stringify({}));
        return temp;
      } catch (error) {
        outputErrorMessage("getAllCacheSize", error);
      }
    },

    // 分享公用方法跳转(有客户端弹窗)
    sharePages: function (data, success, failure, cancel) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }

        // imgUrl 如果不传，则默认使用宁波银行的logo
        if (!data.imgUrl)
          data.imgUrl = `${window.configVUE.cdnUrl}staticResource/nbLogo.jpg`;

        let config = {
          ...data,
        };
        let cfg = {
          config: config,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        cfg.cancelCallback = pluginHelper.getFunctionName(cancel);

        _callHandler("sharePages", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("sharePages", error);
      }
    },

    // 分享公用方法跳转(无客户端弹窗)
    shareTo: function (data, success, failure, cancel) {
      if (window.IFRAME_FLAG) {
        window.parent.postMessage(
          {
            jsBridge: "shareTo",
            data,
          },
          "*"
        );
        return;
      }
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }

        // imgUrl 如果不传，则默认使用宁波银行的logo
        if (!data.imgUrl)
          data.imgUrl = `${window.configVUE.cdnUrl}staticResource/nbLogo.jpg`;

        let config = {
          ...data,
        };
        let cfg = {
          config: config,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        cfg.cancelCallback = pluginHelper.getFunctionName(cancel);
        _callHandler("shareTo", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("shareTo", error);
      }
    },

    // 客户端信息 getSystemInfo
    getSystemInfo: function () {
      try {
        let temp = _callHandlerSync("getSystemInfo", JSON.stringify({}));
        return temp;
      } catch (error) {
        outputErrorMessage("getSystemInfo", error);
      }
    },

    /**
     * 异步获取客户端相关信息：
     * {
     *    SDKVersion, // SDK版本
     *    bottomHeight, // 底部状态栏高度
     *    topHeight, // 顶部状态栏高度
     *    url: 'http://aap-test.nbcb.com.cn:20380/cbanker', // 掌银APP URL前缀
     *    version: '2.6.2' // 掌银APP版本号
     * }
     * @param {Function} success // 成功回调: (result) => {}
     * @param {Function} failure // 失败回调: (error) => {}
     */
    getSysInfoAsync: function (success, failure) {
      try {
        const cfg = {
          success: pluginHelper.getFunctionName(success),
          fail: pluginHelper.getFunctionName(failure),
        };
        _callHandler("getSystemInformation", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("getSystemInformation", error);
      }
    },

    /**
     * 安卓设置状态栏
     * Android手机如果想要页面铺满整个屏幕，必须先设置状态栏
     * @param {Object} config
     * {
     *    hidden: true,  // 页面是否允许铺满状态栏，true是，false否
     *    style: '' // 状态栏样式：light / dark
     * }
     */
    setStatusBar: function (config = { hidden: true }) {
      try {
        const cfg = {
          config,
        };
        _callHandler("setStatusBar", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("setStatusBar", error);
      }
    },

    //  scanQRCode 调起扫一扫
    scanQRCode: function (data, success, failure, cancel) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = { config: data };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        cfg.cancelCallback = pluginHelper.getFunctionName(cancel);
        _callHandler("scanQRCode", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("scanQRCode", error);
      }
    },

    // 生成二维码 geneQRCode
    geneQRCode: function (data, success) {
      try {
        let cfg = {
          config: data,
        };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        _callHandler("geneQRCode", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("geneQRCode", error);
      }
    },

    // 异步设置值 cfg{key: key, data: data}
    setStorage: function (cfg) {
      return new Promise(function (resolve, reject) {
        let func = function (res) {
          res = res == "(null)" ? "{}" : res;
          res = pluginHelper.isEmpty(res) ? "{}" : res;
          resolve(res);
        };
        let funcName = pluginHelper.getFunctionName(func);
        let cfg = {
          key: cfg.key,
          data: cfg.data,
          success: funcName,
        };
        _callHandler("setStorage", JSON.stringify(cfg));
      });
    },

    // 同步设置值storage
    setStorageSync: function (cfg) {
      const key = cfg.key || "__storageItem__"; // 公共key
      const data = cfg.data;
      try {
        if (pluginHelper.isEmpty(key)) {
          return;
        }
        let temp = _callHandlerSync("setStorage", JSON.stringify(cfg));
        return temp;
      } catch (error) {
        outputErrorMessage("setStorage", error);
      }
    },

    // 异步取值 cfg{key: key, clear: true/false,success: 回调}
    getStorage: function (cfg) {
      return new Promise(function (resolve, reject) {
        let func = function (data) {
          data = data == "(null)" ? "{}" : data;
          data = pluginHelper.isEmpty(data) ? "{}" : data;
          if (clear) pluginHelper.device.removeStorage(cfg.key);
          resolve(data);
        };
        let funcName = pluginHelper.getFunctionName(func);
        let cfg = {
          key: cfg.key,
          success: funcName,
        };
        _callHandler("getStorage", JSON.stringify(cfg));
      });
    },

    // 同步取值
    getStorageSync: function (key, clear) {
      try {
        let cfg = {
          key: key,
        };
        let data = _callHandlerSync("getStorage", JSON.stringify(cfg));
        data = data == "(null)" ? "{}" : data;
        data = pluginHelper.isEmpty(data) ? "{}" : JSON.parse(data);

        // 清空
        if (clear) {
          setTimeout(() => {
            pluginHelper.device.removeStorage(key);
          }, 0);
        }
        return data;
      } catch (error) {
        outputErrorMessage("getStorage", error);
      }
    },

    // 根据key,清理存储
    removeStorage: function (key, success) {
      if (!success) {
        success = function () {
          console.log(`[${key}] has been deleted successfully!!!`);
        };
      }
      var cfg = {
        key: key,
        success: pluginHelper.getFunctionName(success),
      };
      _callHandler("removeStorage", JSON.stringify(cfg));
    },

    // 打开第三方APP
    openThirdPartyApp: function (data) {
      try {
        _callHandler("openThirdPartyApp", JSON.stringify(data));
      } catch (error) {
        outputErrorMessage("openThirdPartyApp", error);
      }
    },

    // 获取当前位置坐标数据（冥王星）
    getLocation: function (data, success, failure) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = { ...(data || {}) };
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        _callHandler("getLocation", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("getLocation", error);
      }
    },

    /**
     * 获取选中位置坐标数据
     * @param {Number 半径} radius
     * @param {Function 返回体 } callback
     */
    getSiteFromLimit: function (radius, callback) {
      callback = pluginHelper.getFunctionName(callback);
      try {
        var json = {
          radius: radius,
          callback: callback,
        };
        _callHandler("getSiteFromLimit", JSON.stringify(json));
      } catch (error) {
        outputErrorMessage("getSiteFromLimit", error);
      }
    },

    /**
     * @create by k13495 2023/12/21/15:54:34
     * @update by k13495 2023/12/21/15:54:34
     * @desc 从地图中获取网点信息（不带范围限制）
     * @param {Function} callback 回调函数
     * 成功回调function(data){}返回数据：data = {
     * 	"latitude": '29.946123',
     * 	"longitude": '121.23425'
     * 	"city":'宁波市',
     * 	"address":'同济路155号',
     * 	"coordinatesystem": 'GCJ-02'
     * 	"country": '中国'
     * 	"district": '江北区'
     * 	"poiName": '欣捷集团总部大楼'
     * 	"province": '浙江省'
     * 	"standardAddress": '浙江省宁波市江北区同济路'
     * }
     * @param {Object} config 配置（非必要）
     *  config: {
     *    circle: 'circle', // 是否绘制范围圆圈，可选
     *    fillColor: '', // 填充色，可选
     *    strokeColor: '', // 边线颜色，可选
     *    strokeWidth: '', // 边线宽度，可选
     *    radius: '1000', // 半径，单位米，可选
     *    zoomLevel: '12', // 缩放等级，可选
     *    lonAndLat: '121.468051,29.948580' // 中心点经纬度：'经度,纬度'，可选
     *  }
     */
    getSiteFromMap: function (callback, config = {}) {
      callback = pluginHelper.getFunctionName(callback);
      try {
        var json = {
          ...config,
          callback: callback,
        };
        _callHandler("getSiteFromMap", JSON.stringify(json));
      } catch (error) {
        outputErrorMessage("getSiteFromMap", error);
      }
    },

    mapNavigationExt: (data) => {
      try {
        const cfg = { ...data, viaPoints: JSON.stringify(data.viaPoints) };
        return _callHandler("mapNavigationExt", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("mapNavigationExt", error);
      }
    },

    // 预览图片
    previewImage: function (data) {
      if (window.IFRAME_FLAG) {
        window.parent.postMessage(
          {
            jsBridge: "previewImage",
            data,
          },
          "*"
        );
        return;
      }
      try {
        _callHandler("previewImage", JSON.stringify(data));
      } catch (error) {
        outputErrorMessage("previewImage", error);
      }
    },

    // 开启等待层
    openToast: function (msg) {
      msg = msg || "加载中...";
      try {
        var cfg = {
          config: {
            message: msg,
            duration: 10000, // 持续时间最大只能到10秒
            type: "loading",
          },
        };
        _callHandler("openToast", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("openToast", error);
      }
    },

    // 关闭等待层
    closeToast: function (timeout) {
      timeout = timeout ? timeout : 100;
      setTimeout(function () {
        try {
          _callHandlerSync("closeToast", JSON.stringify({}));
        } catch (error) {
          outputErrorMessage("closeToast", error);
        }
      }, timeout);
    },
    // 振动
    vibrate: function (time) {
      try {
        _callHandlerSync("vibrate", time);
      } catch (error) {
        outputErrorMessage("vibrate", error);
      }
    },
    // 关闭webview页面
    closeWebView: function () {
      try {
        return _callHandlerSync("closeWebView", JSON.stringify({}));
      } catch (error) {
        outputErrorMessage("closeWebView", error);
      }
    },

    //语音输入
    speechInput: function (success, failure, cancel) {
      try {
        if (
          pluginHelper.isEmpty(failure) ||
          !pluginHelper.isFunction(failure)
        ) {
          failure = (rsp) =>
            isInApp() ? alert(rsp.MSG) : console.log(rsp.MSG);
        }
        let cfg = {};
        cfg.successCallback = pluginHelper.getFunctionName(success);
        cfg.failCallback = pluginHelper.getFunctionName(failure);
        cfg.cancelCallback = pluginHelper.getFunctionName(cancel);
        _callHandler(
          IsJsBridgeExist("speechInputForAgent")
            ? "speechInputForAgent"
            : "speechInput",
          JSON.stringify(cfg)
        );
      } catch (error) {
        outputErrorMessage("speechInput", error);
      }
    },

    // 摇一摇
    shakeEvent: function (data, callback) {
      callback = pluginHelper.getFunctionName(callback);
      try {
        var cfg = {
          ...data,
          callback: callback,
        };
        _callHandler("shakeEvent", JSON.stringify(cfg));
      } catch (error) {
        outputErrorMessage("shakeEvent", error);
      }
    },

    // 打开系统设置
    openSystemSettings: () => {
      try {
        return _callHandlerSync("openSystemSettings", JSON.stringify({}));
      } catch (error) {
        outputErrorMessage("openSystemSettings", error);
      }
    },

    // 获取通知开关
    notificationIsOpen: () => {
      try {
        return _callHandlerSync("notificationIsOpen", JSON.stringify({}));
      } catch (error) {
        outputErrorMessage("notificationIsOpen", error);
      }
    },

    // 同步调用，唤起默认浏览器
    goToBrowser: function (url = "") {
      try {
        let cfg = {
          url: url,
        };
        let temp = _callHandlerSync("goToBrowser", JSON.stringify(cfg));
        return temp;
      } catch (error) {
        outputErrorMessage("goToBrowser", error);
      }
    },

    /**
     * 手机热点是否开启
     * @returns { "result": '1' // '1'-开启 '0'-关闭 }
     */
    hotspotIsOpen: () => {
      try {
        return _callHandlerSync("hotspotIsOpen", JSON.stringify({}));
      } catch (error) {
        outputErrorMessage("hotspotIsOpen", error);
      }
    },
  };

  window.pluginHelper.device = Object.assign(pluginHelper.device, client);
})();
