const MongoStore = require('./koa-cookie-store-mongo');
let { createTokenID } = require('../tools');

module.exports = (opts) => {

	let store = new MongoStore(opts);
	const key = 'koa:sess';

	return async (ctx, next) => {

		let id = ctx.cookies.get(key);
		let clientIp = ctx.clientIp;          // 中间件加工用户ip

		if(!id){
			ctx.session1 = {}
		}else{
			ctx.session1 = await store.get(id);
			if(typeof ctx.session1 !== "object" || ctx.session1 === null) {
        		ctx.session1 = {};
      		}
		}

		let old = JSON.stringify(ctx.session1);

		// 等待
		await next();

		let sess = JSON.stringify(ctx.session1);

		// 未登录
		if(old === sess && old === '{}'){
			return
		}
		// 状态从已登录 > 注销登录
		if(sess === '{}') {
      		ctx.session1 = null;
    	}

	    // 注销
	    if(id && !ctx.session1){
	    	await store.destroy(id, ctx);
	    	ctx.cookies.set(key, null, { maxAge:0 });
 			return
	    }

	    // 更新，设置
	    let sid = await store.set(ctx.session1, {sid: id || createTokenID(24), ip: clientIp }); // createTokenID(24)
	    ctx.cookies.set(key, sid, { httpOnly: false, maxAge: (opts.maxAge * 1000) });

	}

}