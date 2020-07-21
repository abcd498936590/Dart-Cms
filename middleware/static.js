const getDB = require('../utils/baseConnect');

module.exports = (ctx, next) => {

	return async (ctx, next) => {

		let confColl = getDB().collection('config');
		let config = await confColl.findOne({});

		let isCacheStatic = config.openStatic;

		let url = ctx.request.url;

		let isTempHome = /^\/$|^\/index\.html/.test(url);                     // 首页
		let isTempNav = /^\/nav\/[a-z|0-9]{24}\.html/.test(url);              // 导航页
		let isTempDetill = /^\/detill\/[a-z|0-9]{24}\.html/.test(url);        // 详情页
		let isTempPlay = /^\/play\/[a-z|0-9]{24}\.html/.test(url);            // 播放页

		// 如果不是后台
		if(isCacheStatic && isTempHome || isCacheStatic &&  isTempNav || isCacheStatic &&  isTempDetill || isCacheStatic &&  isTempPlay){
			ctx.request.url = `/cache${url}`;
		}

		await next()
	}

}