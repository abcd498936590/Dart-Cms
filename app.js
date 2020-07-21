const Koa = require('koa');
const path = require('path');
const staticCache = require('koa-static-cache')
const Router = require('koa-router');
const body = require('koa-body');
const bodyParser = require('koa-bodyparser');
const compress = require('koa-compress');
const views = require('koa-views');
const ejs = require('ejs');
const tokenStore = require('./utils/token/koa-token-store');
const cookieStore = require('./utils/cookie/koa-cookie-store');

const app = new Koa();

const tokenConfig = require('./utils/config').sessToken;
const cookieConfig = require('./utils/config').sessCookie;
const sessionConfig = require('./utils/config').project;


// 后台管理系统-接口
const manageRouter = require('./router/manage');
// 前台 app + web 通用路由
const publicRouter = require('./router/public');
// 前台页面系统-路由
const webRouter = require('./router/web');
// app端接口-接口
const appRouter = require('./router/app');



// 前置中间件-获取用户ip，并且加工成可以使用的ipv4
const filterUserIp = require('./middleware/userIp');
// 后置中间件-路径纠错，处理用户访问路径
const routerCorrect = require('./middleware/router');
// 前置中间件-检测是否关闭了网站
const webService = require('./middleware/service');
// 前置中间件-用于处理纯静态化路径
const openStatic = require('./middleware/static');
// 前置中间件-用于修正静态化后没有找到的文件路径，恢复原路径
const cacheCorrect = require('./middleware/cacheCorrect');

// gzip
app.use(compress({
	threshold: 1024
}));
// 检测是否关闭网站
app.use(webService())
// 加工用户IP
app.use(filterUserIp())
// 纯静态检查
app.use(openStatic())
// 模板引擎ejs
app.use(views(
	path.resolve(__dirname, './static/template'),
	{ map: {html: 'ejs' }}
))
// 静态文件
app.use(staticCache(
  	path.join( __dirname,  './static'),
  	{
  		maxage: 2592000000,
  		buffer: true,
  		gzip: true,
  		dynamic: true,
  		preload: false,
  		usePrecompiledGzip: true
  	}
))
// 矫正静态化以后，没有找到的文件，路由回正，走查询数据库
app.use(cacheCorrect())
// 参数解析
app.use(bodyParser());
// session cookie
app.use(cookieStore({
    host: cookieConfig.host,
	port: cookieConfig.port,
	dbName: cookieConfig.dbName,
	collection: cookieConfig.collection,
	maxAge: cookieConfig.maxAge,
}))
// session token
app.use(tokenStore({
	host: tokenConfig.host,
	port: tokenConfig.port,
	dbName: tokenConfig.dbName,
	collection: tokenConfig.collection,
	maxAge: tokenConfig.maxAge,
}))


// 页面系统 路由
app.use(webRouter.routes());
// 前台 web + app 通用路由
app.use(publicRouter.routes());
// 管理系统 路由
app.use(manageRouter.routes());
// APP系统 路由
app.use(appRouter.routes());


// url矫正
app.use(routerCorrect())
// 静态文件 - 处理矫正后的文件访问路径
app.use(staticCache(
  	path.join( __dirname,  './static'),
  	{
  		maxage: 2592000000,
  		buffer: true,
  		gzip: true,
  		dynamic: true,
  		preload: false,
  		usePrecompiledGzip: true
  	}
))
// 静态文件没有找到
app.use(async (ctx, next) => {
	// 错啦，没加模板模板路径
	if(ctx.request.method === 'GET'){
		ctx.request.url = '/404/index.html';
	}
	if(ctx.request.method === 'POST'){
		ctx.status = 403;
		ctx.body = '';
	}
	return next()
})
// 接404页面
app.use(staticCache(
  	path.join( __dirname,  './static'),
  	{
  		maxage: 2592000000,
  		buffer: true,
  		gzip: true,
  		dynamic: true,
  		preload: false,
  		usePrecompiledGzip: true
  	}
))

app.listen(9999, () => {
	console.log('运行成功，端口 9999');
})