const Router = require('koa-router');
const body = require('koa-body');
let route = new Router();

let {
	GetConfig,
	ExecConfig,
	UploadApp,
	UploadWebLogon,
} = require('../../methods/manage/config')


// 获取配置
route.get('/system/getConfig', GetConfig);
// 修改配置
route.post('/system/execConfig', ExecConfig);
// 上传网站logo - 站点用
route.post('/system/uploadWebLogon', body({
    multipart: true,
    formidable: {
        maxFileSize: 200*1024*1024    // 设置上传文件大小最大限制，默认2M
    }
}), UploadWebLogon);
// 上传App安装包
route.post('/system/uploadApp', body({
    multipart: true,
    formidable: {
        maxFileSize: 200*1024*1024    // 设置上传文件大小最大限制，默认2M
    }
}), UploadApp);



module.exports = route