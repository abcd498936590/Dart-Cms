const Router = require('koa-router');
const body = require('koa-body');
let route = new Router();

let {
	GetNavList,
	AddNav,
	NavSort,
	RemoveNav,
	UpdateNav,
} = require('../../methods/manage/nav_type')


// 导航管理  所以导航，不分页
route.get('/nav/getNavList', GetNavList);
// 添加导航
route.post('/nav/addNav', AddNav);
// 删除导航
route.post('/nav/removeNav', RemoveNav);
// 修改导航信息
route.post('/nav/updateNav', UpdateNav);
// 导航排序
route.post('/nav/navSort', NavSort);


module.exports = route