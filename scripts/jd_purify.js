/**
 * 京东开屏与弹窗净化
 * 路径: /scripts/jd_purify.js
 */

const url = $request.url;
let body = $response.body;

try {
    let obj = JSON.parse(body);

    // 1. 拦截开屏广告 (识别 functionId)
    if (url.includes("functionId=startUpAd") || url.includes("functionId=getAdvertising")) {
        if (obj.data) obj.data = {};
        if (obj.ads) obj.ads = [];
        console.log("京东：已拦截开屏广告数据");
    }

    // 2. 拦截首页弹窗广告
    if (url.includes("functionId=zoom") || url.includes("functionId=popupControl")) {
        if (obj.data) obj.data = {};
        console.log("京东：已拦截首页弹窗");
    }

    $done({ body: JSON.stringify(obj) });
} catch (e) {
    $done({ body });
}
