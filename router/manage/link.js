const Router = require('koa-router');
const body = require('koa-body');
let route = new Router();

let {
	GetAllLinks,
	RemoveLinks,
	AddLink,
	DirLinkImgs,
	UploadImages,
	RemoveLinkImg,
	UpdateLinks,
} = require('../../methods/manage/link')


// 获取全部外链
route.post('/link/getAllLinks', GetAllLinks);
// 删除外链
route.post('/link/removeLinks', RemoveLinks);
// 添加外链
route.post('/link/addLink', AddLink);
// 修改外链
route.post('/link/updateLinks', UpdateLinks);
// 获取所有的外链图片
route.post('/link/dirLinkImgs', DirLinkImgs);
// 上传 外链 图片
route.post('/link/uploadImages', body({
    multipart: true,
    formidable: {
        maxFileSize: 200*1024*1024    // 设置上传文件大小最大限制，默认2M
    }
}), UploadImages);
// 删除link图片
route.post('/link/removeLinkImg', RemoveLinkImg);


module.exports = route