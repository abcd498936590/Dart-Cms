const Router = require('koa-router');
const body = require('koa-body');
let route = new Router();

let {
	GetAllArticle,
	ChangeArtState,
	AddArticle,
	UpdateArticle,
	RemoveArticle,
	GetCurArticle,
} = require('../../methods/manage/article')


// 获取全部文章
route.post('/article/getAllArticle', GetAllArticle);
// 删除文章
route.post('/article/removeArticle', RemoveArticle);
// 添加文章
route.post('/article/addArticle', AddArticle);
// 修改文章
route.post('/article/updateArticle', UpdateArticle);
// 批量修改文章状态
route.post('/article/changeArtState', ChangeArtState);
// 获取当个文章信息
route.post('/article/getCurArticle', GetCurArticle);


module.exports = route