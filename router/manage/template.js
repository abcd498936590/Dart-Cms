const Router = require('koa-router');
const body = require('koa-body');
let route = new Router();

let {
	DirCurTempFiles,
	RemoveTemplate,
	RemoveTempFile,
	UploadTemplate,
	DirTempList,
	SetCurUseTempName,
	EditTempFileContent,
	ReadTempFileContent,
} = require('../../methods/manage/template')


// 读取当前模板的所有文件
route.post('/temp/dirCurTempFiles', DirCurTempFiles);
// 删除模板
route.post('/temp/removeTemplate', RemoveTemplate);
// 删除模板文件
route.post('/temp/removeTempFile', RemoveTempFile);
// 获取模板列表
route.post('/temp/dirTempList', DirTempList);
// 上传模板
route.post('/temp/uploadTemplate', body({
    multipart: true,
    formidable: {
        maxFileSize: 200*1024*1024    // 设置上传文件大小最大限制，默认2M
    }
}), UploadTemplate);
// 修改模板里的单个文件
route.post('/temp/editTempFileContent', EditTempFileContent);
// 读取模板里的单个文件
route.post('/temp/readTempFileContent', ReadTempFileContent);
// 设置默认模板
route.post('/temp/setCurUseTempName', SetCurUseTempName);


module.exports = route