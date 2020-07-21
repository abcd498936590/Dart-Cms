const Router = require('koa-router');
let route = new Router();

route.prefix('/manage');


let loginRouter = require('./manage/login');
let mainRouter = require('./manage/main');
let logRouter = require('./manage/log');
let videoRouter = require('./manage/video');
let articleRouter = require('./manage/article');
let userRouter = require('./manage/user');
let messageRouter = require('./manage/message');
let navRouter = require('./manage/nav_type');
let scriptRouter = require('./manage/script');
let cronRouter = require('./manage/cron');
let linkRouter = require('./manage/link');
let bakcupRouter = require('./manage/backup');
let advertRouter = require('./manage/advert');
let configRouter = require('./manage/config');
let templateRouter = require('./manage/template');


// 登录
route.use(loginRouter.routes()).use(loginRouter.allowedMethods());
// 首页
route.use(mainRouter.routes()).use(mainRouter.allowedMethods());
// 日志
route.use(logRouter.routes()).use(logRouter.allowedMethods());
// 视频
route.use(videoRouter.routes()).use(videoRouter.allowedMethods());
// 文章
route.use(articleRouter.routes()).use(articleRouter.allowedMethods());
// 用户
route.use(userRouter.routes()).use(userRouter.allowedMethods());
// 留言
route.use(messageRouter.routes()).use(messageRouter.allowedMethods());
// 导航
route.use(navRouter.routes()).use(navRouter.allowedMethods());
// 任务
route.use(cronRouter.routes()).use(cronRouter.allowedMethods());
// 脚本
route.use(scriptRouter.routes()).use(scriptRouter.allowedMethods());
// 模板
route.use(templateRouter.routes()).use(templateRouter.allowedMethods());
// 外链
route.use(linkRouter.routes()).use(linkRouter.allowedMethods());
// 备份
route.use(bakcupRouter.routes()).use(bakcupRouter.allowedMethods());
// 广告
route.use(advertRouter.routes()).use(advertRouter.allowedMethods());
// 配置
route.use(configRouter.routes()).use(configRouter.allowedMethods());


module.exports = route