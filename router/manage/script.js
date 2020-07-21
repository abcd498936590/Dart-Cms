const Router = require('koa-router');
const body = require('koa-body');
let route = new Router();

let {
	GetScriptList,
	RunScript,
	StopRunScript,
	RemoveScript,
	UploadScript,
	UpdateScript,
} = require('../../methods/manage/script')


// 脚本列表  不分页
route.get('/script/getScriptList', GetScriptList);
// 执行脚本  脚本开始便不受控制，node无法跨线程停止掉
route.post('/script/runScript', RunScript);
// 停止脚本
route.post('/script/stopRunScript', StopRunScript);
// 删除脚本
route.post('/script/removeScript', RemoveScript);
// 上传脚本
route.post('/script/uploadScript', body({
    multipart: true,
    formidable: {
        maxFileSize: 200*1024*1024    // 设置上传文件大小最大限制，默认2M
    }
}), UploadScript);
// 修改脚本
route.post('/script/updateScript', UpdateScript);



module.exports = route