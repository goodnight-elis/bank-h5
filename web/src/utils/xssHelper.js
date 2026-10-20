/**
 * @file XSS 防护 / 关键字高亮 / HTML 标签转义 / 敏感信息脱敏
 * @desc 由原 mixin（基于 this 互相调用）改造为 Vue3 可用的独立工具函数，
 *       组件内直接 import 使用，无需 app.mixin。
 *
 * ⚠️ 依赖：本文件用到 DOMPurify，需要先安装（当前项目尚未安装）：
 *    npm install dompurify --legacy-peer-deps
 *
 * 
 */
import DOMPurify from 'dompurify';

// ==================== 内部常量 ====================

/** 脱敏使用的掩码字符 */
const MASK_CHAR = '*';

/**
 * 生成指定长度的掩码字符串
 * @param {number} len 长度
 * @returns {string}
 */
function getMaskString(len) {
  if (!len || len <= 0) return '';
  return MASK_CHAR.repeat(len);
}

// ==================== 基础工具（原 mixin 内部方法，去掉 this 后为模块级函数） ====================

/**
 * 判断给定的 value 值是否为空（兼容原 mixin 中 isDef 的语义）
 * @param {String|Number} value 值
 * @returns {boolean}
 */
function isDef(value) {
  return value === void 0 || value === null || value === '';
}

/**
 * DOMPurify 净化白名单配置
 * 在默认配置基础上，额外允许 Markdown 渲染中需要的标签和属性
 */
const DOMPURIFY_CONFIG = {
  ADD_TAGS: ['font', 'span'],
  ADD_ATTR: ['color', 'style', 'class'],
};

/**
 * XSS 防护 之 转义 html 标签
 * @param {String} value 文本内容
 * @returns {string}
 */
function transferTagFun(value) {
  if (isDef(value)) return '';
  value = value + '';
  value = value.replace(/&/g, '&amp;');
  value = value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/&amp;lt;&amp;lt;/g, '<<')
    .replace(/&amp;lt;&lt;/g, '&lt;&lt;')
    .replace(/&amp;gt;&amp;gt;/g, '>>')
    .replace(/&gt;&amp;gt;/g, '&gt;&gt;')
    .replace(/&lt;font/g, `<font`)
    .replace(/color=&#039;#FF7538&#039;&gt;/g, `color="#FF7538">`)
    .replace(/&lt;\/font&gt;/g, `</font>`);
  return value;
}

/**
 * 反向转移富文本字符串（把实体符号还原回原始字符）
 * @param {String} value 字符串
 * @returns {string}
 */
function contrapositionFunc(value) {
  if (isDef(value)) return '';
  value = value + '';
  value = value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
  return value;
}

/**
 * 去除 <a href='xxx'></a> 标签中的跳转链接，并用 DOMPurify 净化
 * @param {String} htmlStr html 字符串
 * @returns {string}
 */
function removeHref(htmlStr) {
  const tempDiv = document.createElement('div');
  /**
   * v-dompurify-html 指令适用于渲染富文本时防止被 XSS 攻击
   * DOMPurify.sanitize() 适用于去除字符串中含有 XSS 攻击的恶意脚本
   * 传入 DOMPURIFY_CONFIG 以保留 Markdown 渲染所需的样式属性
   */
  tempDiv.innerHTML = DOMPurify.sanitize(htmlStr, DOMPURIFY_CONFIG);
  const aTags = tempDiv.querySelectorAll('a');
  // 删除 a 标签中的 href 属性，确保无法跳转到未知页面
  if (aTags && aTags.length > 0) {
    aTags.forEach(aTag => {
      aTag.removeAttribute('href');
    });
    const html = tempDiv.innerHTML;
    // removeHref 操作会将 & 符号等变成实体符号，这里需要重新反转移回来，
    // 否则 transferTagFun 会出现问题
    return contrapositionFunc(html);
  }
  return htmlStr;
}

// ==================== 对外导出的主函数 ====================

/**
 * XSS 防护、搜索关键字高亮、转换 a 标签，禁止点击 a 标签跳转未知链接
 * @param {String} textValue 文本内容
 * @param {String} [keyWord] 搜索关键字
 * @param {Boolean} [transferTag=false] 是否转义 html 标签
 * @param {String} [color='#FF7538'] 高亮颜色
 * @returns {string}
 */
export function xssDefender(textValue, keyWord, transferTag = false, color = '#FF7538') {
  if (isDef(textValue)) return '';
  textValue = textValue + '';

  // 判断是否需要高亮
  const highLight = keyWord && textValue.indexOf(keyWord) > -1;
  if (highLight) {
    textValue = textValue.replaceAll(
      keyWord,
      `<font color='${color}'>${keyWord}</font>`
    );
  }

  textValue = removeHref(textValue);

  // 转义 html 标签
  if (transferTag) {
    textValue = transferTagFun(textValue);
  }

  return textValue;
}

/**
 * 脱敏处理
 * @param {String} value 待脱敏文本
 * @param {String} maskType 脱敏类型（MaskType 枚举值）
 * @param {boolean} [enableMask=true] 是否启用脱敏（原代码里取自 this.sensitiveStatus，这里改为显式传参，默认开启）
 * @returns {string}
 */
export function sensitiveText(value, maskType, enableMask = true) {
  return enableMask ? maskText(value, maskType) : value;
}

/**
 * 脱敏类型枚举
 */
export const MaskType = {
  NAME: 'name', // 姓名
  ID_CARD: 'idCard', // 身份证号
  PASSPORT: 'passport', // 护照号
  DRIVER_LICENSE: 'driverLicense', // 驾照号
  SOCIAL_SECURITY: 'socialSecurity', // 社保号
  HOUSEHOLD_REGISTER: 'householdRegister', // 户口簿号
  HK_MACAO_PERMIT: 'hkMacaoPermit', // 港澳居民来往内地通行证（回乡证）号
  HK_MACAO_RESIDENCE: 'hkMacaoResidence', // 港澳居民居住证号
  TAIWAN_PERMIT: 'taiwanPermit', // 台湾居民往来大陆通行证（台胞证）号
  TAIWAN_RESIDENCE: 'taiwanResidence', // 台湾居民居住证号
  MILITARY_CARD: 'militaryCard', // 军官证号
  POLICE_CARD: 'policeCard', // 警官证号
  MOBILE_PHONE: 'mobilePhone', // 手机号
  LANDLINE_PHONE: 'landlinePhone', // 家庭固定电话
  EMAIL: 'email', // 个人电子邮箱
  WECHAT: 'wechat', // 微信号
  COMPANY_NAME: 'companyName', // 企业名称
  UNIFIED_SOCIAL_CREDIT_CODE: 'unifiedSocialCreditCode', // 统一社会信用代码
  BUSINESS_LICENSE_NO: 'businessLicenseNo', // 营业执照号码
  SPECIAL_ORG_CODE: 'specialOrgCode', // 特殊机构赋码
  CREDIT_REPORT_CODE: 'creditReportCode', // 中征码
  DEBIT_CARD: 'debitCard', // 借记卡号
  CREDIT_CARD: 'creditCard', // 信用卡号
  CORPORATE_CARD: 'corporateCard', // 单位卡（公卡）号
};

/**
 * 主入口：根据类型对文本进行掩码
 * @param {string} text 待处理文本
 * @param {string} type 掩码类型（MaskType 枚举值）
 * @returns {string} 掩码后的文本
 */
export function maskText(text, type) {
  if (!text || typeof text !== 'string') {
    return text || '';
  }

  switch (type) {
    // 保留首字符，其余掩码（长度<1 不处理）
    case MaskType.MILITARY_CARD:
    case MaskType.POLICE_CARD:
    case MaskType.SPECIAL_ORG_CODE:
      if (text.length < 1) return text;
      return text.charAt(0) + getMaskString(text.length - 1);

    // 保留前2位，其余掩码（长度<2 不处理）
    case MaskType.CREDIT_REPORT_CODE:
      if (text.length < 2) return text;
      return text.substring(0, 2) + getMaskString(text.length - 2);

    // 保留首尾特定字符（护照/港澳居住证: 首1+尾3；港澳/台湾通行证: 首1+尾1）
    case MaskType.PASSPORT:
    case MaskType.HK_MACAO_RESIDENCE:
      if (text.length < 4) return text;
      return (
        text.charAt(0) +
        getMaskString(text.length - 4) +
        text.substring(text.length - 3)
      );

    case MaskType.HK_MACAO_PERMIT:
    case MaskType.TAIWAN_PERMIT:
      if (text.length < 2) return text;
      return (
        text.charAt(0) +
        getMaskString(text.length - 2) +
        text.charAt(text.length - 1)
      );

    // 姓名（保留首1，其余掩码；长度<2 不处理）
    case MaskType.NAME:
      return text.length < 2
        ? text
        : text.charAt(0) + getMaskString(text.length - 1);

    // 手机号（保留前3+后4；长度<7 不处理）
    case MaskType.MOBILE_PHONE:
      if (text.length < 7) return text;
      return (
        text.substring(0, 3) +
        getMaskString(4) +
        text.substring(text.length - 4)
      );

    // 固定电话（保留区号+后4位）
    case MaskType.LANDLINE_PHONE: {
      if (text.length < 7) return text;
      const areaLen = text.includes('-') ? text.indexOf('-') + 1 : 4;
      const safeLen = Math.min(areaLen, text.length - 4);
      return (
        text.substring(0, safeLen) +
        getMaskString(text.length - safeLen - 4) +
        text.substring(text.length - 4)
      );
    }

    // 邮箱（保留前2 + @及之后；逻辑较特殊）
    case MaskType.EMAIL: {
      if (!text.includes('@')) return text;
      const atIndex = text.indexOf('@');
      return atIndex <= 2
        ? text
        : text.substring(0, 2) +
            getMaskString(atIndex - 2) +
            text.substring(atIndex);
    }

    // 微信号（中间 30% 掩码；长度<6 不处理）
    case MaskType.WECHAT: {
      if (text.length < 6) return text;
      const maskLen = Math.ceil(text.length * 0.3);
      const start = Math.floor(text.length / 3);
      const chars = text.split('');
      for (let i = start; i < start + maskLen && i < text.length; i++) {
        chars[i] = MASK_CHAR;
      }
      return chars.join('');
    }

    // 企业名称，全部掩码
    case MaskType.COMPANY_NAME:
      return getMaskString(text.length);

    //【最大合并组】保留前6位 + 后4位（长度<10 不处理）
    case MaskType.ID_CARD:
    case MaskType.DRIVER_LICENSE:
    case MaskType.SOCIAL_SECURITY:
    case MaskType.HOUSEHOLD_REGISTER:
    case MaskType.TAIWAN_RESIDENCE:
    case MaskType.UNIFIED_SOCIAL_CREDIT_CODE:
    case MaskType.BUSINESS_LICENSE_NO:
    case MaskType.DEBIT_CARD:
    case MaskType.CREDIT_CARD:
    case MaskType.CORPORATE_CARD:
      if (text.length < 10) {
        return text;
      }
      return (
        text.substring(0, 6) +
        getMaskString(text.length - 10) +
        text.substring(text.length - 4)
      );

    default:
      return text;
  }
}