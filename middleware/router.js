const getDB = require('../utils/baseConnect');

module.exports = (ctx, next) => {

	return async (ctx, next) => {

		let confColl = getDB().collection('config');
		let config = await confColl.findOne({});
		let curTempPath = config.curTempPath;

		let url = ctx.request.url;

		let isApp = /^\/app\//.test(url);               // app ajax接口
		let isManage = /^\/manage\//.test(url);         // 后台管理系统文件 + 后台ajax接口
		let isPlayer = /^\/player\//.test(url);         // 播放器目录
		let isUpload = /^\/upload\//.test(url);         // 上传文件静态目录
		let isWeb = /^\/web\//.test(url);               // 前端交互ajax模板接口
		let is404 = /^\/404/.test(url);                 // 404页面

		// let isArtHome = /^\/article-type\//.test(url);  // 文章列表首页
		// let isArtDetill = /^\/article\//.test(url);     // 文章内容页

		// 如果不是以上的目录，则修改路径，指向前端模板所在目录
		if(!isApp && !isManage && !isPlayer && !isUpload && !isWeb && !is404){
			// 直接输出的页面有 search.html index.html type.html user.html
			if(
				/^\/player\.html|\/detill\.html|\/video-type\.html|\/article-type\.html|\/article\.html/.test(url) ||
				(/^\/user\.html/.test(url) && JSON.stringify(ctx.session1) === '{}')
			){
				ctx.request.url = '/404/index.html';
			}else{
				ctx.request.url = `/template/${curTempPath}` + url
			}
		}

		// player目录
		if(isPlayer){
			let filePath = ctx.request.url.replace(/^\/player\//i, '');
			ctx.request.url = `/player/${config.curPlayerPath}/${filePath}`;
		}

		await next()
	}
}
