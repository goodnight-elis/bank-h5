<template>
  <div class="report-page">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      title="访前报告"
      left-arrow
      fixed
      placeholder
      safe-area-inset-top
      class="app-nav-bar"
    />

    <!-- 报告头部信息卡片 -->
    <div class="report-header-card">
      <div class="header-title-block">
        <h1 class="main-title">恒越精密制造集团·访前报告</h1>
        <div class="sub-title">恒越精密制造集团·拜访纪要</div>
      </div>
      <div class="header-meta-grid">
        <div class="meta-item">
          <span class="meta-label">客户</span>
          <span class="meta-value">恒越精密制造集团</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">目标</span>
          <span class="meta-value">访后信息记录与跟进</span>
        </div>
      </div>
      <div class="header-footer">
        <span class="report-time">2026-06-30 14:20</span>
      </div>
    </div>

    <!-- 模块1: 拜访基本信息 -->
    <div class="section-card">
      <div class="section-header">
        <div class="header-left">
          <span class="section-index">1</span>
          <span class="section-title">拜访基本信息</span>
        </div>
        <span class="section-percent">~10%</span>
      </div>
      <div class="section-body">
        <div class="info-row"><span class="info-label">客户名称</span><span class="info-value">恒越精密制造集团有限公司</span></div>
        <div class="info-row"><span class="info-label">拜访时间</span><span class="info-value">2008-03-12</span></div>
        <div class="info-row"><span class="info-label">对接人</span><span class="info-value">王建恒</span></div>
        <div class="info-row"><span class="info-label">目录</span><span class="info-value">现场拜访</span></div>
        <div class="info-row"><span class="info-label">拜访方式</span><span class="info-value">现场拜访</span></div>
      </div>
    </div>

    <!-- 模块2: 客户需求与意向 -->
    <div class="section-card">
      <div class="section-header">
        <div class="header-left">
          <span class="section-index">2</span>
          <span class="section-title">客户需求与意向</span>
        </div>
        <span class="section-percent">~10%</span>
      </div>
      <div class="section-body">
        <div class="sub-header">需求记录</div>
        <div class="info-row"><span class="info-label">产品意向</span><span class="info-value">对跨境资金池明确感兴趣,希望了解归集效率与存款利率</span></div>
        <div class="info-row"><span class="info-label">关注重点</span><span class="info-value">资金归集是否影响子公司独立运营;反向保理是否需要上游供应商配合</span></div>
        <div class="info-row"><span class="info-label">时间要求</span><span class="info-value">希望7月内拿到资金池方案,8月决策</span></div>
      </div>
    </div>

    <!-- 模块3: 同业信息 -->
    <div class="section-card">
      <div class="section-header">
        <div class="header-left">
          <span class="section-index">3</span>
          <span class="section-title">同业信息</span>
        </div>
        <span class="section-percent">~10%</span>
      </div>
      <div class="section-body">
        <div class="sub-header">他行情况</div>
        <div class="info-row"><span class="info-label">他行报价</span><span class="info-value">招商银行资金池归集手续费全免,存款利率上浮20%(客户原话,待核实)</span></div>
        <div class="info-row"><span class="info-label">他行服务</span><span class="info-value">客户提到招商资金池体验不错,但归集频次为T+1</span></div>
      </div>
    </div>

    <!-- 模块4: 经营与财务分析 -->
    <div class="section-card">
      <div class="section-header">
        <div class="header-left">
          <span class="section-index">4</span>
          <span class="section-title">经营与财务分析</span>
        </div>
        <span class="section-percent">~10%</span>
      </div>
      <div class="section-body">
        <div class="sub-header">在用产品</div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>指标</th>
                <th>同比</th>
                <th>2021年</th>
                <th>2022年</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>营收</td>
                <td>4.3亿</td>
                <td>4.21%</td>
                <td class="up">+1.32%</td>
              </tr>
              <tr>
                <td>净利润</td>
                <td>3.3亿</td>
                <td>8.21%</td>
                <td class="down">-1.32%</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="sub-header">异动分析</div>
        <div class="text-block">应收账款同比增长43.4%,显著高于营收增速18.2%,需关注回款压力。(依据:该客户近三年应收账款数据,年均增速42%,高于营收增速15%)下游账期拉长(头部手机品牌A账期从60天延长至90天)是主因。</div>
        
        <div class="sub-header">经营判断</div>
        <div class="sub-header-small">一句话判断</div>
        <div class="text-block">整体经营稳健,营收利润双增;但应收账款增速远超营收,下游账期拉长带来现金流压力,需关注回款风险。</div>
      </div>
    </div>

    <!-- 模块5: 我行合作复盘 -->
    <div class="section-card">
      <div class="section-header">
        <div class="header-left">
          <span class="section-index">5</span>
          <span class="section-title">我行合作复盘</span>
        </div>
        <span class="section-percent">~10%</span>
      </div>
      <div class="section-body">
        <div class="sub-header">合作历程</div>
        <div class="timeline">
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">2012 建立合作关系,首笔流贷1亿</div>
          </div>
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">2013 新增银行承兑汇票业务,授信扩至3亿</div>
          </div>
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">2014 子公司恒越电子、恒越国贸纳入集团授信</div>
          </div>
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">2022 新增贸易融资及远期结售汇</div>
          </div>
          <div class="timeline-item">
            <div class="timeline-dot active"></div>
            <div class="timeline-content">2026 集团授信12.5亿,使用率68%</div>
          </div>
        </div>

        <div class="sub-header">合作深度指标</div>
        <div class="info-row"><span class="info-label">授信使用率</span><span class="info-value">68%(集团合并)</span></div>
        <div class="info-row"><span class="info-label">产品覆盖数</span><span class="info-value">7类(流贷、银承、协存、信用证、贸易融资、远期结售汇、固贷)</span></div>
        <div class="info-row"><span class="info-label">存款日均</span><span class="info-value">1.5亿(活期+协定)</span></div>

        <div class="sub-header">业务缺口</div>
        <div class="info-row"><span class="info-label">跨境资金归集</span><span class="info-value highlight">客户有跨境业务但本行未提供资金池服务</span></div>
        <div class="info-row"><span class="info-label">反向保理</span><span class="info-value highlight">客户为供应链核心但本行未开展上游供应商融资</span></div>
        <div class="info-row"><span class="info-label">代发工资</span><span class="info-value highlight">目前由他行承办</span></div>
      </div>
    </div>

    <!-- 模块6: 同业对标 -->
    <div class="section-card">
      <div class="section-header">
        <div class="header-left">
          <span class="section-index">6</span>
          <span class="section-title">同业对标</span>
        </div>
        <span class="section-percent">~10%</span>
      </div>
      <div class="section-body">
        <div class="sub-header">已知他行合作</div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>银行</th>
                <th>业务</th>
                <th>规模</th>
                <th>到期</th>
                <th>持续</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>建设银行</td>
                <td>跨境资金池</td>
                <td>约2亿</td>
                <td>-</td>
                <td>持续</td>
              </tr>
              <tr>
                <td>建设银行</td>
                <td>流贷</td>
                <td>2.0亿</td>
                <td>-</td>
                <td>持续</td>
              </tr>
              <tr>
                <td>工商银行</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="sub-header">定价对标</div>
        <div class="info-row"><span class="info-label">本行流贷利率</span><span class="info-value">3.45% (LPR+45bp)</span></div>
        <div class="info-row"><span class="info-label">同业流贷区间</span><span class="info-value">3.4%-3.6%</span></div>
        <div class="info-row"><span class="info-label">竞争力</span><span class="info-value">持平市场</span></div>

        <div class="sub-header">非价格竞争策略方向</div>
        <div class="text-block">本行流贷定价持平市场,无显著价格优势。可从供应链方案差异化(反向保理)、跨境服务效率(资金池T+0归集)、额度支持(增量授信)三方面建立非价格竞争优势。</div>
      </div>
    </div>

    <!-- 模块7: 营销策略与行动建议 -->
    <div class="section-card">
      <div class="section-header">
        <div class="header-left">
          <span class="section-index">7</span>
          <span class="section-title">营销策略与行动建议</span>
        </div>
        <span class="section-percent">~10%</span>
      </div>
      <div class="section-body">
        <div class="sub-header">业务机会与风险提示</div>
        
        <div class="biz-card opportunity">
          <div class="biz-tag">机会</div>
          <div class="biz-main-text">以旧换新政策拉动上游采购,反向保理切入窗口</div>
          <div class="biz-sub-text"><span class="biz-label">依据:</span>行内合作记录,2024年反向保理未合作;行业政策,以旧换新延续至2026年底</div>
          <div class="biz-sub-text"><span class="biz-label">方向:</span>供应链反向保理</div>
        </div>

        <div class="biz-card opportunity">
          <div class="biz-tag">机会</div>
          <div class="biz-main-text">跨境资金分散,资金池归集需求明确</div>
          <div class="biz-sub-text"><span class="biz-label">依据:</span>行内合作记录,2024年反向保理未合作;行业政策,以旧换新延续至2026年底</div>
          <div class="biz-sub-text"><span class="biz-label">方向:</span>贷款续作+增量授信</div>
        </div>

        <div class="biz-card risk">
          <div class="biz-tag">风险</div>
          <div class="biz-main-text">应收账款增速远超营收,回款压力上升</div>
          <div class="biz-sub-text"><span class="biz-label">依据:</span>行内合作记录,2024年反向保理未合作;行业政策,以旧换新延续至2026年底</div>
          <div class="biz-sub-text"><span class="biz-label">方向:</span>关注下游回款</div>
        </div>

        <div class="sub-header">营销切入策略与话术</div>
        
        <div class="speech-card">
          <div class="speech-title">切入点一:以旧换新政策窗口期切入供应链融资</div>
          <div class="speech-row">
            <span class="speech-tag">开口</span>
            <div class="speech-text">王总,最近"以旧换新"政策延续,我看咱们这边订单应该涨了不少吧?上游采购压力估计也不小。</div>
          </div>
          <div class="speech-row">
            <span class="speech-tag">过渡</span>
            <div class="speech-text">我们最近有个供应链反向保理的方案,专门帮核心企业的上游供应商做融资,能缓解咱们对上游的账期压力。</div>
          </div>
          <div class="speech-row">
            <span class="speech-tag">引入产品</span>
            <div class="speech-text">供应链反向保理</div>
          </div>
          <div class="speech-row">
            <span class="speech-tag">异议应对</span>
            <div class="speech-text"><span class="text-muted">(暂时不需要)</span>理解,这个方案不影响您现有的采购流程,只是给上游多一个融资渠道,很多客户是先了解着,等真有压力了随时能用。</div>
          </div>
        </div>

        <div class="speech-card">
          <div class="speech-title">切入点二:以旧换新政策窗口期切入供应链融资</div>
          <div class="speech-row">
            <span class="speech-tag">开口</span>
            <div class="speech-text">王总,最近"以旧换新"政策延续,我看咱们这边订单应该涨了不少吧?上游采购压力估计也不小。</div>
          </div>
          <div class="speech-row">
            <span class="speech-tag">过渡</span>
            <div class="speech-text">我们最近有个供应链反向保理的方案,专门帮核心企业的上游供应商做融资,能缓解咱们对上游的账期压力。</div>
          </div>
          <div class="speech-row">
            <span class="speech-tag">引入产品</span>
            <div class="speech-text">供应链反向保理</div>
          </div>
          <div class="speech-row">
            <span class="speech-tag">异议应对</span>
            <div class="speech-text"><span class="text-muted">(暂时不需要)</span>理解,这个方案不影响您现有的采购流程,只是给上游多一个融资渠道,很多客户是先了解着,等真有压力了随时能用。</div>
          </div>
        </div>

        <div class="sub-header">行动建议</div>
        <div class="action-row">
          <span class="action-text"><strong>2012</strong> 银行承兑汇票1.8亿到期</span>
          <span class="action-status">提前2周跟进续作</span>
        </div>
        <div class="action-row">
          <span class="action-text"><strong>2013</strong> 母公司流贷3.2亿到期</span>
          <span class="action-status">7月起启动续作+增量审批</span>
        </div>
        <div class="action-row">
          <span class="action-text"><strong>2022</strong> 以旧换新政策到期</span>
          <span class="action-status">政策窗口内完成反向保理落地</span>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="footer-bar">
      <van-button plain type="primary" size="small" icon="share-o">分享</van-button>
      <van-button plain type="primary" size="small" icon="description">导出PDF</van-button>
      <van-button plain type="primary" size="small" icon="records">导出Word</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
</script>

<style scoped>
/* 基础与重置 */
.report-page {
  background-color: #f2f3f5;
  min-height: 100vh;
  padding-bottom: 70px;
  color: #323233;
  -webkit-font-smoothing: antialiased;
}

/* 顶部导航优化 */
:deep(.app-nav-bar) {
  background-color: #fff;
  border-bottom: 1px solid #ebedf0;
}
:deep(.app-nav-bar .van-nav-bar__title) {
  font-weight: 600;
}

/* 报告头部卡片优化 */
.report-header-card {
  background: #fff;
  margin: 8px;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.header-title-block {
  border-bottom: 1px solid #f5f5f5;
  padding-bottom: 12px;
  margin-bottom: 12px;
}
.main-title {
  font-size: 18px;
  font-weight: 600;
  color: #323233;
  margin: 0 0 6px 0;
  line-height: 1.4;
}
.sub-title {
  font-size: 13px;
  color: #969799;
}
.header-meta-grid {
  display: flex;
  flex-wrap: wrap;
}
.meta-item {
  width: 50%;
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
}
.meta-label {
  font-size: 12px;
  color: #969799;
  margin-bottom: 4px;
}
.meta-value {
  font-size: 14px;
  color: #323233;
  font-weight: 500;
}
.header-footer {
  text-align: right;
}
.report-time {
  font-size: 12px;
  color: #969799;
}

/* 模块卡片通用样式 */
.section-card {
  background: #fff;
  margin: 8px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

/* 章节头部样式重构 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #f5f5f5;
}
.header-left {
  display: flex;
  align-items: center;
}
.section-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background-color: #1989fa;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
  margin-right: 8px;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
}
.section-percent {
  font-size: 12px;
  color: #969799;
  background-color: #f2f3f5;
  padding: 2px 6px;
  border-radius: 10px;
}

.section-body {
  padding: 8px 16px 12px;
}

/* 子标题与行信息 */
.sub-header {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  margin: 12px 0 6px;
}
.sub-header-small {
  font-size: 13px;
  font-weight: 500;
  color: #646566;
  margin: 6px 0;
}
.info-row {
  display: flex;
  padding: 8px 0;
  font-size: 14px;
  border-bottom: 1px solid #f5f5f5;
}
.info-row:last-child {
  border-bottom: none;
}
.info-label {
  width: 90px;
  flex-shrink: 0;
  color: #969799;
}
.info-value {
  flex: 1;
  color: #323233;
  word-break: break-all;
}
.info-value.highlight {
  color: #ee0a24;
}

/* 表格样式 */
.table-wrapper {
  margin: 8px 0;
  overflow-x: auto;
  border: 1px solid #ebedf0;
  border-radius: 4px;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: center;
}
.data-table th, .data-table td {
  padding: 8px 6px;
  border-bottom: 1px solid #ebedf0;
  border-right: 1px solid #ebedf0;
}
.data-table th:last-child, .data-table td:last-child {
  border-right: none;
}
.data-table tr:last-child td {
  border-bottom: none;
}
.data-table th {
  background-color: #f7f8fa;
  color: #646566;
  font-weight: 500;
}
.data-table .up { color: #07c160; }
.data-table .down { color: #ee0a24; }

/* 文本块 */
.text-block {
  font-size: 13px;
  color: #646566;
  line-height: 1.6;
  margin-bottom: 8px;
}

/* 时间轴自定义 */
.timeline {
  margin: 10px 0 5px 5px;
  position: relative;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 4px;
  bottom: 4px;
  width: 1px;
  background: #ebedf0;
}
.timeline-item {
  position: relative;
  padding-bottom: 16px;
  padding-left: 16px;
}
.timeline-item:last-child {
  padding-bottom: 4px;
}
.timeline-dot {
  position: absolute;
  left: 0;
  top: 4px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid #c8c9cc;
  z-index: 1;
}
.timeline-dot.active {
  background: #1989fa;
  border-color: #1989fa;
}
.timeline-content {
  font-size: 13px;
  color: #323233;
  line-height: 1.4;
}

/* 商机与风险卡片 */
.biz-card {
  background: #f7f8fa;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 10px;
  border-left: 3px solid #07c160;
}
.biz-card.risk {
  border-left-color: #ee0a24;
}
.biz-tag {
  display: inline-block;
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 3px;
  color: #fff;
  margin-bottom: 6px;
}
.opportunity .biz-tag {
  background: #07c160;
}
.risk .biz-tag {
  background: #ee0a24;
}
.biz-main-text {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}
.biz-sub-text {
  font-size: 13px;
  color: #646566;
  line-height: 1.5;
  margin-top: 3px;
}
.biz-label {
  color: #969799;
}

/* 话术卡片 */
.speech-card {
  background: #fff;
  border: 1px solid #ebedf0;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}
.speech-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #323233;
}
.speech-row {
  display: flex;
  margin-bottom: 10px;
}
.speech-row:last-child {
  margin-bottom: 0;
}
.speech-tag {
  width: 60px;
  flex-shrink: 0;
  font-size: 12px;
  color: #1989fa;
  font-weight: 500;
  margin-top: 2px;
}
.speech-text {
  flex: 1;
  font-size: 13px;
  color: #323233;
  line-height: 1.5;
}
.text-muted {
  color: #969799;
}

/* 动作建议行 */
.action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
  font-size: 13px;
}
.action-row:last-child {
  border-bottom: none;
}
.action-text {
  color: #323233;
}
.action-text strong {
  color: #1989fa;
  margin-right: 4px;
}
.action-status {
  color: #969799;
  font-size: 12px;
  text-align: right;
}

/* 底部操作栏优化 */
.footer-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-around;
  border-top: 1px solid #ebedf0;
  z-index: 100;
  /* padding-bottom: env(safe-area-inset-bottom); */
}
.footer-bar .van-button {
  flex: 1;
  margin: 0 8px;
}
</style>