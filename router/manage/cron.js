const Router = require('koa-router');
const body = require('koa-body');
let route = new Router();

let {
	createCron,
	removeCron,
	getAllCrons,
} = require('../../methods/manage/cron')

// 创建任务
route.post('/cron/createCron', createCron);
// 删除任务
route.post('/cron/removeCron', removeCron);
// 获取全部任务
route.post('/cron/getAllCrons', getAllCrons);

module.exports = route