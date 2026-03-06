/**
 * 东方财富开屏与弹窗净化
 */
let url = $request.url;
let body = $response.body;

try {
    let obj = JSON.parse(body);
    // 清除开屏广告数据
    if (url.indexOf("get_advert") !== -1 || url.indexOf("get_splash_config") !== -1) {
        if (obj.data) obj.data = [];
        if (obj.results) obj.results = [];
    }
    // 清除弹窗广告
    if (url.indexOf("get_popup_list") !== -1) {
        obj.data = [];
    }
    $done({ body: JSON.stringify(obj) });
} catch (e) {
    $done({ body });
}
