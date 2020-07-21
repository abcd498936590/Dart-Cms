const Router = require('koa-router');

const {
	getTypeList,
	getDetillData,
	getSearchDatas,
	getTypesDatas,
	appAuthUpgrade,
	getCurNavItemList,
} = require('../methods/app');

let route = new Router();
let R = route.prefix('/app');


// app首页
R.get('/getTypeList', getTypeList);
// 获取首页每个分类的详细数据
R.get('/getCurNavItemList', getCurNavItemList);
// app播放页
R.get('/getDetillData', getDetillData);
// app搜索页
R.get('/getSearchDatas', getSearchDatas);
// app分类页
R.get('/getTypesDatas', getTypesDatas);
// app检测升级
R.get('/appAuthUpgrade', appAuthUpgrade);

module.exports = route