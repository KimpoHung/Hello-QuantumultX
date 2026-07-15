/**
 * 同花顺（10jqka）广告净化脚本
 * 路径: /scripts/ths_purify.js
 *
 * 设计目标：宁可漏拦，不可误伤。
 *   - 开屏/弹窗接口：只清空「广告容器字段」和「被标记为广告」的条目，保留正常业务结构；
 *   - 消息推送中心：按营销关键词过滤（此处误删的只是推送短信，风险低）；
 *   - 解析失败或结构未知：原样返回，绝不破坏 App。
 *
 * 判定「是广告」优先看结构标记（adType/isAd/广告位字段），而非猜内容关键词，
 * 从而把误伤率降到接近零。
 */

const url = typeof $request !== "undefined" ? $request.url : "";
let body = $response.body;

// 是否为消息推送中心（仅此场景启用关键词过滤）
const IS_PUSH_CENTER = /\/(msg|notice|push)\//i.test(url);

// 推送中心营销关键词黑名单
const PUSH_BLACKLIST = [
    "理财", "基金", "抽奖", "活动", "开户", "领福利", "贷款", "广告",
    "推广", "优惠券", "限时", "红包", "免费领", "开通", "会员", "直播"
];

// 结构上判定一个条目是否为广告（不看正文关键词，只看广告标记字段）
function isFlaggedAd(item) {
    if (!item || typeof item !== "object") return false;
    // 常见广告标记：类型字段有值、布尔广告标记为真、存在广告位/落地页字段
    if (item.adType || item.ad_type || item.adId || item.ad_id) return true;
    if (item.isAd === true || item.is_ad === true || item.isAd === 1 || item.is_ad === 1) return true;
    if (item.adSource || item.ad_source || item.adSlot || item.ad_slot) return true;
    if ((item.type || item.itemType) && /^(ad|advert|advertisement)$/i.test(item.type || item.itemType)) return true;
    return false;
}

// 命中推送营销关键词
function isPushAd(item) {
    const title = (item && (item.title || item.name)) || "";
    const content = (item && (item.content || item.desc || item.summary)) || "";
    return PUSH_BLACKLIST.some((k) => title.indexOf(k) !== -1 || content.indexOf(k) !== -1);
}

// 递归清空明确的广告容器字段（数组置空、开关关闭），保留其余结构
function stripAdContainers(node, depth) {
    if (!node || typeof node !== "object" || depth > 8) return;

    if (Array.isArray(node)) {
        node.forEach((n) => stripAdContainers(n, depth + 1));
        return;
    }

    const AD_ARRAY_KEYS = [
        "ads", "adList", "ad_list", "adverts", "advertList", "advertisement",
        "splash", "splashList", "popup", "popupList", "popups", "floatAd",
        "operateAds", "marketingList"
    ];
    AD_ARRAY_KEYS.forEach((k) => {
        if (Array.isArray(node[k])) node[k] = [];
    });

    const AD_FLAG_KEYS = ["showAd", "show_ad", "hasAd", "has_ad", "adSwitch"];
    AD_FLAG_KEYS.forEach((k) => {
        if (k in node) node[k] = 0;
    });

    if (node.ad && typeof node.ad === "object" && !Array.isArray(node.ad)) node.ad = {};

    for (const key in node) {
        if (Object.prototype.hasOwnProperty.call(node, key)) {
            stripAdContainers(node[key], depth + 1);
        }
    }
}

// 遍历所有数组，剔除「被标记为广告」的条目（推送中心额外走关键词过滤）
function removeAdItems(node, depth) {
    if (!node || typeof node !== "object" || depth > 8) return;

    if (Array.isArray(node)) {
        for (let i = node.length - 1; i >= 0; i--) {
            const item = node[i];
            const kill = isFlaggedAd(item) || (IS_PUSH_CENTER && isPushAd(item));
            if (kill) {
                const label = (item && (item.title || item.name)) || "广告条目";
                console.log("同花顺已拦截: " + label);
                node.splice(i, 1);
            } else {
                removeAdItems(item, depth + 1);
            }
        }
        return;
    }

    for (const key in node) {
        if (Object.prototype.hasOwnProperty.call(node, key)) {
            removeAdItems(node[key], depth + 1);
        }
    }
}

try {
    const obj = JSON.parse(body);
    stripAdContainers(obj, 0);
    removeAdItems(obj, 0);
    $done({ body: JSON.stringify(obj) });
} catch (e) {
    console.log("同花顺净化脚本：非 JSON 或解析失败，原样返回 -> " + e);
    $done({ body });
}
