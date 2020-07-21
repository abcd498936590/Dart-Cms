const getDB = require('./baseConnect');
const { setResponse } = require('./tools');

function inspectKeyIsExist(roleData, { parentKey, childrenKey}){

	let isArr = Array.isArray(childrenKey);
	if(!isArr){
		childrenKey = [childrenKey];
	}
	for(let arg of childrenKey){
		if(roleData[parentKey][arg]){
			return true
		}
	}
}

module.exports = async (ctx, next, fn, mixin = {}, conf) => {

	ctx.set('Content-Type', 'application/json');
	const user = ctx.session2.user;

	if(user){  // session2里面有
		let userColl = getDB().collection('user');
		let queryJson = Object.assign({}, {_id: user._id}, mixin); // 混入的配置，比如 admin:true 区分是否是后台登录的管理员
		let isExist = await userColl.findOne(queryJson);
		// 用户也许已经被删除了，但用户的登录状态已经存在
		if(!isExist){
			ctx.session2.user = {};
			ctx.body = {
				code: 503,
				text: '您已经被管理员删除！'
			}
		}else{
			let userRole = user.roleData;
			// 是否验证权限
			if(conf.insRole){
				let insResult = inspectKeyIsExist(userRole, conf);
				// 是否找到此权限
				if(insResult){
					await fn(ctx, next)
				}else{
					await setResponse(ctx, Promise.reject(), {
						error: '您无权进行此操作！'
					})
				}
			}else{
				await fn(ctx, next);
			}
		}
	}else{
		// 用户登录已经过期
		let tokenID = ctx.headers['token'];
		if(tokenID && tokenID.length === 48){
			ctx.body = {
				code: 301,
				text: '您的登录状态已过期！'
			}
		}else{
			// 往下迭代，直到404
			return next()
		}
	}

}