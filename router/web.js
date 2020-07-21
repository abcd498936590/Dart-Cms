const Router = require('koa-router');
const {
	webIndex,
	webDetill,
	webPlay,
	webType,
	webNav,
	webArt,
	webSearch,
	webUser,
	webArtDetill,
} = require('../methods/web');

let route = new Router();

// 首页
route.get('/', webIndex);
route.get('/index.html', webIndex);
// 视频详情页
route.get('/detill/:vid.html', webDetill);
// 播放页
route.get('/play/:vid.html', webPlay);
// 单个视频分类页
route.get('/video-type/:nid.html', webNav);
// 单个文章分类页
route.get('/article-type/:aid.html', webArt);
// 文章页
route.get('/article/:aid.html', webArtDetill);
// 分类页
route.get('/type.html', webType);
// 搜索页
route.get('/search.html', webSearch);
// 用户中心
route.get('/user.html', webUser);


module.exports = route