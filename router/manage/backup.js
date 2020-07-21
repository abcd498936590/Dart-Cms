const Router = require('koa-router');
const body = require('koa-body');
let route = new Router();

let {
	ExecDataBackup,
	DirDataBackup,
	DownloadData,
	RemoveDataBackup,
} = require('../../methods/manage/backup')

// 全部备份数据
route.post('/backup/dirDataBackup', DirDataBackup);
// 删除已经备份的数据
route.post('/backup/removeDataBackup', RemoveDataBackup);
// 执行数据备份
route.post('/backup/execDataBackup', ExecDataBackup);
// 下载备份的数据
route.get('/backup/downloadData', DownloadData);


module.exports = route