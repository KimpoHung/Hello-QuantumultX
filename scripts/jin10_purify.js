/**
 * 金十数据（jin10）广告净化脚本
 * 路径: /scripts/jin10_purify.js
 *
 * 设计目标：宁可漏拦，不可误伤。
 *   - 只清空「广告容器字段」并删除「被结构标记为广告」的条目；
 *   - 判定是否广告优先看结构标记（adType/isAd/广告位字段），而非猜正文关键词，
 *     把误伤率降到接近零；
 *   - 解析失败或结构未知：原样返回，绝不破坏 App。
 */

let body = $response.body;

// 结构上判定一个条目是否为广告（只看广告标记字段，不看正文关键词）
function isFlaggedAd(item) {
    if (!item || typeof item !== "object") return false;
    if (item.adType || item.ad_type || item.adId || item.ad_id) return true;
    if (item.isAd === true || item.is_ad === true || item.isAd === 1 || item.is_ad === 1) return true;
    if (item.advert || item.advertisement) return true;
    if (item.adSource || item.ad_source || item.adSlot || item.ad_slot) return true;
    if ((item.type || item.itemType) && /^(ad|adv|advert|advertisement)$/i.test(item.type || item.itemType)) return true;
    // 金十快讯常见：带落地页跳转且标注推广的条目
    if (item.is_ad_flash === true || item.is_ad_flash === 1) return true;
    return false;
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
        "operateAds", "marketingList", "banner", "banners", "bannerList"
    ];
    AD_ARRAY_KEYS.forEach((k) => {
        if (Array.isArray(node[k])) node[k] = [];
    });

    const AD_FLAG_KEYS = ["showAd", "show_ad", "hasAd", "has_ad", "adSwitch", "is_ad", "isAd"];
    AD_FLAG_KEYS.forEach((k) => {
        if (k in node && typeof node[k] !== "object") node[k] = 0;
    });

    if (node.ad && typeof node.ad === "object" && !Array.isArray(node.ad)) node.ad = {};

    for (const key in node) {
        if (Object.prototype.hasOwnProperty.call(node, key)) {
            stripAdContainers(node[key], depth + 1);
        }
    }
}

// 遍历所有数组，剔除「被标记为广告」的条目
function removeAdItems(node, depth) {
    if (!node || typeof node !== "object" || depth > 8) return;

    if (Array.isArray(node)) {
        for (let i = node.length - 1; i >= 0; i--) {
            const item = node[i];
            if (isFlaggedAd(item)) {
                const label = (item && (item.title || item.name || item.content)) || "广告条目";
                console.log("金十数据已拦截: " + label);
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
    console.log("金十数据净化脚本：非 JSON 或解析失败，原样返回 -> " + e);
    $done({ body });
}
