const Router = require('koa-router');
const body = require('koa-body');
let route = new Router();

let {
	GetAllAdverts,
	RemoveAdverts,
	AddAdvert,
	UpdateAdvert,
	DirAdvertImgs,
	UploadImages,
	RemoveAdvertImg,
} = require('../../methods/manage/advert')


// 获取全部广告
route.post('/meal/getAllMeal', GetAllAdverts);
// 删除广告
route.post('/meal/removeMeal', RemoveAdverts);
// 添加广告
route.post('/meal/addMeal', AddAdvert);
// 修改广告
route.post('/meal/updateMeal', UpdateAdvert);
// 获取所有的广告图片
route.post('/meal/dirMealImgs', DirAdvertImgs);
// 上传 外链 图片
route.post('/meal/uploadImages', body({
    multipart: true,
    formidable: {
        maxFileSize: 200*1024*1024    // 设置上传文件大小最大限制，默认2M
    }
}), UploadImages);
// 删除广告图片
route.post('/meal/removeMealImg', RemoveAdvertImg);


module.exports = route