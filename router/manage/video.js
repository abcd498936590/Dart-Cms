const Router = require('koa-router');
const body = require('koa-body');
let route = new Router();

let {
	GetVideoList,
	GetCurVideoList,
	GetCurVideoInfo,
	VideosRemove,
	ChangeState,
	UpdateCurVideo,
	AddVideo,
	AddScource,
	UpdateScource,
	ScourceSort,
	RemoveScource,
	DirCoverImgs,
	DirPosterImgs,
	UploadImages,
	RemoveImages,
} = require('../../methods/manage/video')

// 视频列表   page, total, size, search
route.post('/video/getVideoList', GetVideoList);
// 获取视频的播放列表
route.post('/video/getCurVideoList', GetCurVideoList);
// 获取单个视频的信息
route.post('/video/getCurVideoInfo', GetCurVideoInfo);
// 删除视频
route.post('/video/removeVideo', VideosRemove);
// 视频 - 修改信息
route.post('/video/changeState', ChangeState);
// 更新单个视频 内容+源
route.post('/video/updateCurVideo', UpdateCurVideo);
// 新建视频
route.post('/video/addVideo', AddVideo);
// 给视频添加源
route.post('/video/addScource', AddScource);
// 给视频新增的源更新
route.post('/video/updateScource', UpdateScource);
// 给视频的源排序
route.post('/video/scourceSort', ScourceSort);
// 给视频删除源
route.post('/video/removeScource', RemoveScource);
// 遍历所有的封面
route.post('/video/dirCoverImgs', DirCoverImgs);
// 遍历所有的海报
route.post('/video/dirPosterImgs', DirPosterImgs);
// 上传 封面 海报
route.post('/video/uploadImages', body({
    multipart: true,
    formidable: {
        maxFileSize: 200*1024*1024    // 设置上传文件大小最大限制，默认2M
    }
}), UploadImages);
// 删除 封面 海报
route.post('/video/removeImages', RemoveImages);


module.exports = route