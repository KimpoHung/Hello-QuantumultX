/**
 * 同花顺（10jqka）广告净化脚本
 * 路径: /scripts/ths_purify.js
 *
 * 适配场景：开屏闪屏 / 弹窗浮层 / 信息流 feed / 消息中心营销推送
 * 策略：能识别结构就精准清空广告字段，识别不到就按关键词过滤列表，
 *      始终返回合法 JSON，避免因误伤导致 App 白屏或崩溃。
 */

const url = typeof $request !== "undefined" ? $request.url : "";
let body = $response.body;

// 营销/广告关键词黑名单（用于列表类数据的关键词过滤）
const BLACKLIST = [
    "理财", "基金", "推荐", "专属", "抽奖", "活动", "开户", "领福利",
    "贷款", "广告", "推广", "优惠券", "限时", "红包", "免费领", "会员",
    "升级", "体验", "开通", "直播"
];

// 判断一段文案是否命中黑名单
function isAdText() {
    for (let i = 0; i < arguments.length; i++) {
        const t = arguments[i];
        if (typeof t === "string" && BLACKLIST.some((k) => t.indexOf(k) !== -1)) {
            return true;
        }
    }
    return false;
}

// 递归清理常见广告字段：把疑似广告的数组置空、开关字段关闭
function stripAdFields(node) {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
        node.forEach(stripAdFields);
        return;
    }

    // 常见广告容器字段：直接置空
    const adArrayKeys = [
        "ads", "adList", "ad_list", "adverts", "advertList", "advertisement",
        "splash", "splashList", "popup", "popupList", "popups", "floatAd",
        "banner", "banners", "operate", "operateList", "marketing"
    ];
    adArrayKeys.forEach((k) => {
        if (Array.isArray(node[k])) {
            node[k] = [];
        }
    });

    // 常见广告开关字段：关闭
    const adFlagKeys = ["showAd", "show_ad", "hasAd", "has_ad", "adSwitch", "isAd", "is_ad"];
    adFlagKeys.forEach((k) => {
        if (k in node) node[k] = 0;
    });

    // 单条广告对象：清空
    if (node.ad && typeof node.ad === "object") node.ad = {};

    for (const key in node) {
        if (Object.prototype.hasOwnProperty.call(node, key)) {
            stripAdFields(node[key]);
        }
    }
}

// 从对象中找出主列表并按关键词过滤（消息中心/信息流）
function filterList(obj) {
    const listContainers = [];
    if (obj && obj.data) {
        if (Array.isArray(obj.data)) listContainers.push(obj.data);
        if (Array.isArray(obj.data.list)) listContainers.push(obj.data.list);
        if (Array.isArray(obj.data.items)) listContainers.push(obj.data.items);
        if (Array.isArray(obj.data.feeds)) listContainers.push(obj.data.feeds);
    }
    if (Array.isArray(obj.list)) listContainers.push(obj.list);

    listContainers.forEach((arr) => {
        for (let i = arr.length - 1; i >= 0; i--) {
            const item = arr[i] || {};
            const title = item.title || item.name || "";
            const content = item.content || item.desc || item.summary || "";
            // 显式标记为广告的条目 或 命中关键词的条目
            const flaggedAd = item.isAd || item.is_ad || item.adType || item.ad_type;
            if (flaggedAd || isAdText(title, content)) {
                if (title) console.log("同花顺已拦截: " + title);
                arr.splice(i, 1);
            }
        }
    });
}

try {
    let obj = JSON.parse(body);

    // 开屏 / 弹窗 / 浮层：清空广告结构字段
    if (/splash|kaiping|startup|start_up|launch|coldstart|open_ad|popup|pop_up|float|window|dialog|operate|marketing|activity/i.test(url)) {
        stripAdFields(obj);
    }

    // 信息流 / 消息中心：按关键词过滤列表
    if (/feed|flow|infoflow|recommend|msg|notice|push|list/i.test(url)) {
        filterList(obj);
    }

    // 兜底：其余命中脚本的响应也做一次通用广告字段清理
    stripAdFields(obj);

    $done({ body: JSON.stringify(obj) });
} catch (e) {
    console.log("同花顺净化脚本解析失败: " + e);
    $done({ body });
}
