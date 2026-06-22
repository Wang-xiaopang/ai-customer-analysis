// Apple-style mock data for UI preview
import type {
  CompanyContext,
  CompanyAnalysis,
  SalesAnalysis,
  Messages,
} from "./types";

export const MOCK_COMPANY_CONTEXT: CompanyContext = {
  company_name: "华为技术有限公司",
  website: "https://www.huawei.com",
  industry: "信息与通信技术",
  website_content: "华为是全球领先的ICT基础设施和智能终端提供商...",
  news: [
    { title: "华为发布2025年年度报告", url: "#", snippet: "营收稳步增长...", date: "2026-03-28" },
    { title: "华为云业务增长迅猛", url: "#", snippet: "华为云市场份额持续提升...", date: "2026-03-15" },
    { title: "华为全球招聘", url: "#", snippet: "大量技术岗位开放...", date: "2026-03-01" },
  ],
  data_confidence: {
    score: 85,
    level: "高",
    detail: "获取到官网、10条新闻、招聘信息，数据充足",
  },
};

export const MOCK_COMPANY_ANALYSIS: CompanyAnalysis = {
  company_profile: {
    industry: "信息与通信技术",
    scale: "超大型企业（约20万员工）",
    stage: "成熟期，持续全球扩张",
    main_business: "ICT基础设施、智能终端、云计算、数字能源、智能汽车解决方案",
  },
  signals: [
    {
      signal: "企业正在全球扩张",
      reason: "官网招聘页面显示大量新增岗位，覆盖全球多个国家",
      evidence: "官网招聘页面显示新增 500+ 销售与技术岗位",
      source: "https://career.huawei.com",
    },
    {
      signal: "云计算业务快速增长",
      reason: "华为云连续多个季度保持高速增长",
      evidence: "2025年报显示华为云营收同比增长 36%",
      source: "https://www.huawei.com/cn/annual-report/2025",
    },
    {
      signal: "企业数字化转型加速",
      reason: "传统ICT业务向云化、智能化转型",
      evidence: "年报提及 'All Cloud' 战略，加大AI投入",
      source: "https://www.huawei.com",
    },
  ],
  recent_updates: [
    {
      title: "发布 2025 年度报告",
      description: "全年营收稳步增长，云和数字能源业务表现突出",
      evidence: "年报显示营收同比增长 12%",
      source: "https://www.huawei.com/cn/annual-report/2025",
    },
    {
      title: "华为云 AI 大模型发布",
      description: "推出盘古大模型 5.0，面向企业市场",
      evidence: "华为云官网产品更新公告",
      source: "https://www.huaweicloud.com",
    },
  ],
  risks: [
    {
      risk: "国际市场竞争加剧",
      reason: "地缘政治因素影响海外业务拓展",
      evidence: "部分市场准入受限，年报中提及 '外部环境不确定性'",
      source: "https://www.huawei.com/cn/annual-report/2025",
    },
    {
      risk: "技术人才竞争",
      reason: "AI 行业人才争夺激烈，招聘成本上升",
      evidence: "多平台显示华为大幅提高AI岗位薪资",
      source: "#",
    },
  ],
};

export const MOCK_SALES_ANALYSIS: SalesAnalysis = {
  executive_summary: {
    verdict: "recommended",
    verdict_text: "推荐跟进",
    customer_value: "高",
    reasons: [
      "企业正在全球扩张，新增 500+ 岗位",
      "云业务高速增长 36%，数字化需求旺盛",
      "在 AI 和云计算领域大规模投入",
    ],
    suggested_contacts: ["云业务负责人", "数字化解决方案总监", "采购部门 VP"],
    best_timing: "未来 30 天",
  },
  customer_score: {
    score: 91,
    level: "A",
    reason: "华为是全球顶级ICT企业，云业务高速增长，数字化转型需求强烈，AI投入巨大，是高价值潜在客户。",
    factors: [
      "全球扩张，新增 500+ 岗位",
      "云业务增长 36%",
      "大模型及 AI 战略投入",
      "年营收数千亿级别",
    ],
  },
  potential_needs: [
    {
      need: "CRM 与销售管理系统升级",
      priority: "高",
      reason: "全球销售团队扩张，需要统一的客户管理和销售自动化平台",
      evidence: "官网招聘页面显示新增大量销售岗位",
    },
    {
      need: "AI 客服与智能助手",
      priority: "高",
      reason: "华为消费者业务庞大，客服成本高，AI客服可大幅降本增效",
      evidence: "年报提及 AI 战略，华为云已推出大模型服务",
    },
    {
      need: "数据分析与商业智能",
      priority: "中",
      reason: "多业务线并行，需要统一的数据分析平台支撑决策",
      evidence: "企业规模和数据量巨大，年报强调数据驱动",
    },
    {
      need: "自动化运营工具",
      priority: "中",
      reason: "全球运营复杂度高，自动化可降低管理成本",
      evidence: "海外业务覆盖 170+ 国家",
    },
  ],
  sales_entry_points: [
    {
      direction: "从华为云生态切入",
      reason: "华为云已有成熟生态，你的产品可作为云市场解决方案入驻",
      evidence: "华为云业务增长 36%，生态持续扩大",
      suggested_talk: "了解到贵司华为云业务增长迅猛，我们的解决方案已适配华为云生态，可为贵司客户提供开箱即用的...",
    },
    {
      direction: "从销售团队扩张切入",
      reason: "销售团队快速扩张后，CRM和销售管理工具是刚需",
      evidence: "招聘页面显示大量销售岗位",
      suggested_talk: "注意到贵司近期在大力扩建销售团队，很多企业在团队扩张期都会面临客户管理效率的挑战，我们在这方面有成熟的...",
    },
    {
      direction: "从AI战略对齐切入",
      reason: "华为全面投入AI，你的AI产品与华为战略方向一致",
      evidence: "年报强调 AI 战略，已推出盘古大模型",
      suggested_talk: "看到贵司在AI领域的战略布局，我们在AI应用层有深厚积累，可以作为贵司AI生态的补充...",
    },
  ],
  contact_strategy: {
    best_topic: "从华为云生态合作或销售团队数字化切入",
    reason: "这两个方向与华为当前战略高度吻合，且负责人容易找到",
    avoid_topics: ["直接询问预算", "贬低华为现有系统", "谈价格"],
    recommended_channel: "LinkedIn + 邮件双渠道",
  },
  next_actions: [
    {
      step: 1,
      action: "在LinkedIn找到华为云生态合作总监，了解背景",
      url: null,
      estimated_time: "5 分钟",
    },
    {
      step: 2,
      action: "研究华为云市场合作伙伴入驻流程",
      url: "https://www.huaweicloud.com/partners",
      estimated_time: "10 分钟",
    },
    {
      step: 3,
      action: "基于华为云生态角度，定制开发信",
      url: null,
      estimated_time: "5 分钟",
    },
    {
      step: 4,
      action: "通过 LinkedIn + 邮件发送开发信",
      url: null,
      estimated_time: "2 分钟",
    },
  ],
};

export const MOCK_MESSAGES: Messages = {
  email_message:
    "主题：关于华为云生态合作的可能性\n\n[联系人姓名]，您好：\n\n注意到贵司华为云业务近期增长迅猛（年报显示同比增长36%），且生态合作是华为云的重要战略方向。\n\n我们的[产品名称]已适配华为云生态，可以帮助贵司客户在销售管理、AI客服等方面提升效率。不知贵司云生态团队近期是否在寻找新的解决方案合作伙伴？\n\n期待有机会交流。\n\n祝好\n[你的名字]",
  linkedin_message:
    "Hi [Name], 看到华为云业务增长36%很受鼓舞。我们在[领域]有成熟方案且已适配华为云生态，想聊聊合作可能性？",
  wechat_message:
    "[姓名]总好，关注到华为云最近增长很快，我们在[领域]有现成的方案，已适配华为云。方便的时候聊聊合作？",
};
