const Router = require('koa-router');
const {
	getMessageList,
	submitMessage,
	userLogin,
	loginOut,
	userRegister,
	getUserInfo,
	setUserInfo,
} = require('../methods/public');

let route = new Router();


// 获取评价列表
route.post('/public/getMessageList', getMessageList);
// 提交评价内容
route.post('/public/submitMessage', submitMessage);
// 用户登录
route.post('/public/userLogin', userLogin);
// 注销登录
route.post('/public/loginOut', loginOut);
// 用户注册
route.post('/public/userRegister', userRegister);
// 获取用户信息
route.post('/public/getUserInfo', getUserInfo);
// 修改用户信息
route.post('/public/setUserInfo', setUserInfo);


module.exports = route