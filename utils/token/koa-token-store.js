const MongoStore = require('./koa-token-store-mongo');

module.exports = (opts) => {

	let store = new MongoStore(opts);

	return async (ctx, next) => {

		let tokenID = ctx.headers['token'];
		let clientIp = ctx.clientIp;          // 中间件加工用户ip

		if(!tokenID){
			ctx.session2 = {}
		}else{
			ctx.session2 = await store.get(tokenID);
			if(typeof ctx.session2 !== "object" || ctx.session2 === null) {
        		ctx.session2 = {};
      		}
		}

		let old = JSON.stringify(ctx.session2);

		// 等待
		await next();

		let sess = JSON.stringify(ctx.session2);

		// 未登录
		if(old === sess && old === '{}'){
			return
		}
		// 状态从已登录 > 注销登录
		if(sess === '{}') {
      		ctx.session2 = null;
    	}

	    // 注销
	    if(tokenID && !ctx.session2){
	    	await store.destroy(tokenID, ctx);
 			return
	    }

	    // 更新，设置
	    let sid = await store.set(ctx.session2, {sid: tokenID || ctx.token, ip: clientIp });
	    ctx.token = sid;

	}

}