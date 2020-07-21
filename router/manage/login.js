const Router = require('koa-router');
const body = require('koa-body');
let route = new Router();

let {
	CreateCodeImg,
	AdminLogin,
	AdminLogout,
} = require('../../methods/manage/login')

// 验证码
route.get('/codeImg', CreateCodeImg);
// 管理员登录
route.post('/admin/login', AdminLogin);
// 注销登录
route.post('/admin/logout', AdminLogout);



module.exports = route