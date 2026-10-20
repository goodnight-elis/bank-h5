// postcss.config.js

// rootValue: 16,        // 基准值
// propList: ['*'],      // 允许转换的属性
// unitPrecision: 5,     // rem小数保留位数
// selectorBlackList: [],// 黑名单选择器，忽略转换
// replace: true,        // 是否直接替换px，false则同时保留px和rem
// mediaQuery: false,    // 是否转换媒体查询内的px
// minPixelValue: 0,     // 小于该数值的px不转换
export default {
  plugins: {
    'postcss-pxtorem': {
      rootValue: 16,
      // unitPrecision: 2,
      propList: ['*'],
      // replace: true, 
      // mediaQuery: false,
      // minPixelValue: 1
    }
  }
}
