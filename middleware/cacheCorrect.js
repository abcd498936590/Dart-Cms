const getDB = require('../utils/baseConnect');

module.exports = (ctx, next) => {

	return async (ctx, next) => {

		let confColl = getDB().collection('config');
		let config = await confColl.findOne({});

		let isCacheStatic = config.openStatic;

		let url = ctx.request.url;

		let isCachePath = /^\/cache\//.test(url);

		// 如果不是后台
		if(isCachePath){
			ctx.request.url = url.substring(6);
		}

		await next()
	}

}