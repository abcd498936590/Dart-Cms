const Router = require('koa-router');
const body = require('koa-body');
let route = new Router();

let {
	GetAllLogs,
	RemoveLogs
} = require('../../methods/manage/log')

// 获取全部日志 分页
route.post('/logs/getAllLogs', GetAllLogs);
// 删除日志
route.post('/logs/removeLogs', RemoveLogs);


module.exports = route