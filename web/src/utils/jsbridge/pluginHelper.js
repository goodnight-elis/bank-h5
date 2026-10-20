/**
 * 掌银JS桥
 */
import { extend } from "./untils";

export default window.pluginHelper = {
  idSeed: 10000,
  globalDate: "", // 记录当前提交时间
  globalTarget: "", // 记录当前提交对象
  adNewUkVersion: "5.03", // 1、最新uk验证 2.提供getNewSession和setNewSession插件
  // 3、查看票面信息横屏 4、k线图横屏
  iosNewUkVersion: "5.05", // 对于最新uk版本获取写成公共变量。1、最新uk验证
  // 2.提供getNewSession和setNewSession插件 3、查看票面信息横屏
  // 4、k线图横屏
  adukFVersion: "5.05", //修改uk激活键盘、提示付款申请修改金额
  iosukFVersion: "5.05",
  adSixVersion: "6.00", // android6.0版本控制 修改內容：1. 捷算卡忘记密码安全认证修改
  // 2.即期牌价交易菜单版本控制
  iosSixVersion: "6.00", // ios6.0版本控制 修改內容：1. 捷算卡忘记密码安全认证修改 2.即期牌价交易菜单版本控制
  adFxVersion: "6.08", //安卓的支持收款名片的最低版本
  iosFxVersion: "6.05", //ios的支持
  adSdkVersion: "6.15", // 安卓SDK升级版本
  iosSdkVersion: "6.13", // iosSDK升级版本
  extend: function () {
    return extend(...arguments);
  },

  /**
   * String转换为JSON
   *
   * @param str
   * @returns {Object}
   * @constructor
   */
  JsonEval: function (str) {
    return eval("(" + str + ")");
  },
  /**
   * @description 返回一个id
   *
   * @returns {string}
   *
   * @example pluginHelper.id()
   */
  id: function () {
    return "yt_gen_" + ++pluginHelper.idSeed;
  },
  /**
   * @private
   * @description 获取唯一id
   * @returns {String} id
   * @example var _id = YTPlutoNbcbJSBridge.util.id();
   */
  staticId: function () {
    return "pluto_static_gen_" + ++pluginHelper.idSeed;
  },
  /**
   * @description 转换为字符
   *
   * @param v
   *            {object}
   * @returns {string}
   *
   * @example pluginHelper.toString(v)
   */
  toString: function (v) {
    return Object.prototype.toString.apply(v);
  },
  /**
   * @description 判断值是否已定义
   *
   * @param v
   *            {*}
   * @returns {boolean}
   *
   * @example pluginHelper.isDefined(v)
   */
  isDefined: function (v) {
    return typeof v !== "undefined";
  },
  /**
   * @description 是否为空
   *
   * @param v
   *            {*} 值
   * @param allowBlank
   *            {boolean} 是否允许空
   * @returns {boolean|*}
   *
   * @example pluginHelper.isEmpty(v)
   */
  isEmpty: function (v, allowBlank) {
    return (
      v === null ||
      v === undefined ||
      String(v).toUpperCase() === "NULL" ||
      (pluginHelper.isArray(v) && !v.length) ||
      (!allowBlank ? v === "" : false)
    );
  },
  /**
   * @description 是否是数组
   *
   * @param v
   * @returns {boolean}
   * @example pluginHelper.isArray(v)
   */
  isArray: function (v) {
    return pluginHelper.toString(v) === "[object Array]";
  },
  /**
   * @description 是否是日期
   *
   * @param v
   * @returns {boolean}
   *
   * @example pluginHelper.isDate(v)
   */
  isDate: function (v) {
    return pluginHelper.toString(v) === "[object Date]";
  },
  /**
   * @description 是否是对象
   *
   * @param v
   * @returns {boolean}
   *
   * @example pluginHelper.isObject(v)
   */
  isObject: function (v) {
    return !!v && pluginHelper.toString(v) === "[object Object]";
  },

  /**
   * @description 对象属性是否都有值
   *
   * @param v
   * @returns {boolean}
   *
   * @example pluginHelper.isObjectHasValue(v)
   */
  isObjectHasValue: function (v) {
    if (Object.keys(v).length === 0) return false;
    for (const key in v) {
      console.log(key);
      if (!v[key]) {
        return false;
      }
    }
    return true;
  },
  /**
   * @description 是否是函数
   *
   * @param v
   * @returns {boolean}
   *
   * @example pluginHelper.isFunction(v)
   */
  isFunction: function (v) {
    return pluginHelper.toString(v) === "[object Function]";
  },
  /**
   * @description 是否是数值型
   *
   * @param v
   * @returns {boolean}
   *
   * @example pluginHelper.isNumber(v)
   */
  isNumber: function (v) {
    return typeof v === "number" && isFinite(v);
  },
  /**
   * @description 是否是字符型
   *
   * @param v
   * @returns {boolean}
   *
   * @example pluginHelper.isString(v)
   */
  isString: function (v) {
    return typeof v === "string";
  },
  /**
   * @description 是否是布尔型
   *
   * @param v
   * @returns {boolean}
   *
   * @example pluginHelper.isBoolean(v)
   */
  isBoolean: function (v) {
    return typeof v === "boolean";
  },
  /**
   * @description 是否是原始类型
   *
   * @param v
   * @returns {*|boolean}
   *
   * @example pluginHelper.isPrimitive(v)
   */
  isPrimitive: function (v) {
    return (
      pluginHelper.isString(v) ||
      pluginHelper.isNumber(v) ||
      pluginHelper.isBoolean(v)
    );
  },
  /**
   * @description session超时
   * @param okName
   *            {string} 确认按钮名称
   * @example pluginHelper.sessionTimeout('我是通知内容','标题');
   */
  sessionTimeout: function (okName) {
    pluginHelper.device.sessionTimeout(okName);
  },
  /**
   * @description 是否可迭代
   *
   * @param v
   * @returns {*}
   *
   * @example pluginHelper.isIterable(v)
   */
  isIterable: function (v) {
    return v && typeof v !== "string"
      ? pluginHelper.isDefined(v.length)
      : false;
  },
  /**
   * @description 是否是URL
   *
   * @param v
   * @returns {boolean}
   *
   * @example pluginHelper.isUrl(v)
   */
  isUrl: function (v) {
    return /(((^https?)|(^ftp)):\/\/((([\-\w]+\.)+\w{2,3}(\/[%\-\w]+(\.\w{2,})?)*(([\w\-\.\?\\\/+@&#;~=%!]*)(\.\w{2,})?)*)|(localhost|LOCALHOST|127.0.0.1))\/?)/i.test(
      v
    );
  },
  /**
   * @description 生成随机的唯一标识
   * @returns {string} uid字符串
   * @example var uid = pluginHelper.guid();
   */
  guid: function () {
    var tpl = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
    return tpl.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0,
        v = c == "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },
  /**
   * @description 定义命名空间
   *
   * @returns {*} 返回命名空间
   *
   * @example pluginHelper.namespace(v)
   */
  namespace: function () {
    var space = null,
      path;
    pluginHelper.each(arguments, function (v) {
      path = v.split(".");
      space = window[path[0]] = window[path[0]] || {};
      pluginHelper.each(path.slice(1), function (v2) {
        space = space[v2] = space[v2] || {};
      });
    });
    return space;
  },
  /**
   * @description 遍历数组
   *
   * @param value
   * @param fn
   * @param scope
   * @returns {number}
   *
   * @example pluginHelper.each(v)
   */
  each: function (value, fn, scope) {
    if (pluginHelper.isEmpty(value)) {
      return;
    }
    if (!pluginHelper.isDefined(scope)) {
      scope = value;
    }
    if (pluginHelper.isObject(value)) {
      var i = 0;
      for (var prop in value) {
        if (value.hasOwnProperty(prop)) {
          if (
            fn.call(scope || value, prop, value[prop], i++, value) === false
          ) {
            return;
          }
        }
      }
    } else {
      if (!pluginHelper.isIterable(value) || pluginHelper.isPrimitive(value)) {
        value = [value];
      }
      for (var i = 0, len = value.length; i < len; i++) {
        if (fn.call(scope || value[i], value[i], i, value) === false) {
          return i;
        }
      }
    }
  },
  /**
   * @description JSON对象转换为String
   *
   * @param json
   * @constructor
   *
   * @example pluginHelper.JsonToStr(v)
   */
  JsonToStr: function (json) {
    return JSON.stringify(json);
  },
  /**
   * @description 属性复制（同jQuery的$.extend）
   *
   * @param object
   * @param config
   * @param defaults
   * @returns {*}
   *
   * @example pluginHelper.apply(v)
   */
  apply: function (object, config, defaults) {
    if (defaults) {
      pluginHelper.apply(object, defaults);
    }
    if (object && config && pluginHelper.isObject(config)) {
      for (var property in config) {
        object[property] = config[property];
      }
    }
    return object;
  },
  /**
   * @description 获取方法名称，用完删除
   *
   * @param func
   *            方法对象
   * @param decodeURL
   *            是否转码，如果该函数的接收参数中包含URL，则该参数需要置为true
   * @returns {*}
   *
   * @example pluginHelper.getFunctionName(v)
   */
  getFunctionName: function (func, decodeURL) {
    if (func == null || func == "") {
      return "";
    }
    if (Object.prototype.toString.apply(func) !== "[object Function]") {
      return func;
    }
    var funcName = pluginHelper.id();
    // 创建可被调用的临时方法
    window[funcName] = function () {
      var args = [];
      pluginHelper.each(
        arguments,
        function (arg) {
          if (true == decodeURL) {
            arg = decodeURIComponent(arg);
          }
          if (
            "string" == typeof arg &&
            "{" == arg.charAt(0) &&
            "}" == arg.charAt(arg.length - 1)
          ) {
            arg = pluginHelper.JsonEval(
              arg.replace(/<\/?[^>]*>/g, "").replace(/[\r\n]/g, "<br>")
            );
          }
          args.push(arg);
        },
        this
      );
      func.apply(this, args);
      delete window[funcName]; // 删除临时方法
    };
    return funcName;
  },
  /**
   * @private
   * @description 获取临时变量函数，用完不删除
   * @param {function} func 方法对象
   * @param {boolean} decodeURL 是否转码，如果该函数的接收参数中包含URL，则该参数需要置为true
   * @returns {*} 临时方法名
   * @example cfg.success = pluginHelper.getFunctionName4Static(v);
   */
  getFunctionName4Static: function (func, decodeURL) {
    if (func == null || func == "") {
      return "";
    }
    if (Object.prototype.toString.apply(func) !== "[object Function]") {
      return func;
    }
    var funcName = pluginHelper.staticId();
    // 创建可被调用的临时方法
    window[funcName] = function () {
      var args = [];
      pluginHelper.each(
        arguments,
        function (arg) {
          if (true == decodeURL) {
            arg = decodeURIComponent(arg);
          }
          if (
            "string" == typeof arg &&
            "{" == arg.charAt(0) &&
            "}" == arg.charAt(arg.length - 1)
          ) {
            arg = pluginHelper.JsonEval(
              arg.replace(/<\/?[^>]*>/g, "").replace(/[\r\n]/g, "<br>")
            );
          }
          args.push(arg);
        },
        this
      );
      func.apply(this, args);
    };
    return funcName;
  },
  /**
   * @description 获取指定位数的随机数
   *
   * @param num
   * @returns {string}
   *
   * @example pluginHelper.getRandom(v)
   */
  getRandom: function (num) {
    var tmp = "";
    if (num && num > 0) {
      for (var i = 0; i < num; i++) {
        tmp += Math.floor(Math.random() * 10);
      }
    }
    return tmp;
  },
  /**
   * @description 待function的参数需要特殊处理
   * @param {*}
   *            value 遍历参数对象
   *
   * @example pluginHelper.packMapFunc(v)
   */
  packMapFunc: function (data) {
    for (var k in data) {
      if (typeof data[k] === "function") {
        data[k] = "self_" + pluginHelper.getFunctionName(data[k]);
      }
    }
  },
  /**
   * @description 客户端native ajax 请求
   * @param url
   *            {url} 请求地址
   * @param params
   *            {json} 请求参数
   * @param success
   *            {string} 成功回调函数名称
   * @param failure
   *            {string} 失败回调函数名称
   * @example pluginHelper.ajaxData('/mbank/login/login.do',{p1:'x'},'success');
   */
  ajaxData: function (url, params, success, failure) {
    pluginHelper.device.post(url, params, success, failure);
  },
  /**
   * @description 关闭等待层
   * @param timeout
   * @example pluginHelper.hideWaitPanel(timeout);
   */
  hideWaitPanel: function (timeout) {
    pluginHelper.device.hideWaitPanel(timeout);
  },
  /**
   * 解析url带的参数
   *
   * @returns {argsArr}key-value对
   */
  /* ===================客户端交互事件 end====================== */
  /**
   * @description 组装请求URL
   *
   * @param url
   *            原始URL，只针对具体业务交易，类似于transCode
   * @param debug
   *            是否调试模式，在调试模式下采用JSON挡板数据 DEBUG 全局变量，只有DEBUG为true时，debug才生效
   * @returns {*} 返回拼装好的URL
   *
   * @example pluginHelper.dataUrl(url, debug, plugin, jsonFlag)
   */
  dataUrl: function (url, debug, plugin, jsonFlag) {
    /*----------行为分析埋点-start---------by k3790*/
    // pluginHelper.Collection.changeTimeX();
    /*----------行为分析埋点-end---------by k3790*/
    var url = url.indexOf("/") == 0 ? url : "/" + url;
    if (DEBUG === "true") {
      // 开发模式 走本地代理调试
      // if (pluginHelper.isEmpty(debug) || debug) {
      // 	var tools = pluginHelper.TestUtil;
      // 	var plus = plugin && (pluginHelper.isString(plugin) ? plugin : (tools && tools.dispatch(url, plugin))) || "";
      // 	return basePath + "/data/json" + url + plus + (jsonFlag ? ".json" : ".js");
      // }
      return process.env.VUE_APP_BASE_DEBUG_URL + url + ".do";
    }

    // pluginHelper.log.info("basePath=" + basePath);
    if (window.NewGateWay == "Y") {
      // 新网关交易
      if (window.IS_RELATIVE_URL == "Y") {
        // Y:相对路径
        return "/api" + url + ".do";
      } else {
        if (pluginHelper.isWeb) {
          return process.env.VUE_APP_BASE_DEBUG_URL + "/api" + url + ".do";
        } else {
          // pluginHelper.device.alertinfo(basePath + "/api" + url + ".do");
          return (basePath + "/api" + url + ".do").replace("csc-ecs", "fmbank");
        }
      }
    } else {
      // 是否配置全路径还是半路径
      if (window.IS_RELATIVE_URL == "Y") {
        // Y:相对路径
        return url + ".do";
      } else {
        return basePath + url + ".do";
      }
    }
  },
  /**
   * @description 验证短信结果
   *
   * @param data
   *            status : "1"关掉弹框 "0"显示错误信息 result : 错误信息 (status为"1"可不传)
   *
   * @example pluginHelper.checkSmsResult(data)
   */
  checkSmsResult: function (data) {
    pluginHelper.device.checkSmsResult(data);
  },
  /**
   * @description 格式化URL， 在url之后拼接时间戳，避免缓存
   *
   * @param s
   * @returns {string}
   *
   * @example pluginHelper.formatUrl(s)
   */
  formatUrl: function (s) {
    return s + (s.indexOf("?") > 0 ? "&t=" : "?t=") + new Date().getTime();
  },
};

pluginHelper.namespace("pluginHelper.device");
