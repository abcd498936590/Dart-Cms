const Router = require('koa-router');
const body = require('koa-body');
let route = new Router();

let {
	GetUserList,
	UpdateUser,
	RemoveUser,
	AddUser,
	ResetMyPassWord,
} = require('../../methods/manage/user')


// 添加用户
route.post('/user/addUser', AddUser);
// 修改用户信息
route.post('/user/updateUser', UpdateUser);
// 删除用户
route.post('/user/removeUser', RemoveUser);
// 获取用户列表   page, total, size, search
route.post('/user/getUserList', GetUserList);
// 修改自己的密码
route.post('/user/resetMyPassWord', ResetMyPassWord);


module.exports = route