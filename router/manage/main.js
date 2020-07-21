const Router = require('koa-router');
const body = require('koa-body');
let route = new Router();

let {
	GetAllInfos
} = require('../../methods/manage/main')

// main入口详情
route.get('/main/getAllInfos', GetAllInfos);


module.exports = route