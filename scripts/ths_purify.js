/**
 * 同花顺（10jqka）消息中心净化脚本
 * 路径: /scripts/ths_purify.js
 */

let body = $response.body;

try {
    let obj = JSON.parse(body);
    // 定义过滤关键词黑名单
    const blacklist = ["理财", "基金", "推荐", "专属", "抽奖", "活动", "开户", "领福利", "贷款"];

    // 过滤逻辑：针对常见的消息列表结构进行扫描
    if (obj.data && Array.isArray(obj.data.list)) {
        obj.data.list = obj.data.list.filter(item => {
            let title = item.title || "";
            let content = item.content || "";
            // 如果标题或内容包含黑名单关键词，则剔除
            let isAd = blacklist.some(k => title.includes(k) || content.includes(k));
            if (isAd) console.log("已拦截同花顺营销消息: " + title);
            return !isAd;
        });
    }

    $done({ body: JSON.stringify(obj) });

} catch (e) {
    console.log("同花顺净化脚本解析失败: " + e);
    $done({ body });
}
