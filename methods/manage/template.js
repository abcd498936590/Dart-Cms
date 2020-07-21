const { ObjectID } = require('mongodb');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const unzip = require("unzip-stream");
const uuidv4 = require('uuid/v4');
require('shelljs/global');
//
const getDB = require('../../utils/baseConnect');
const authToken = require('../../utils/authToken');
const { setResponse, makeArrObjectID, mixinsScriptConfig, encryption, createTokenID, getBjDate } = require('../../utils/tools');


// 递归读取文件
function readFileList(dir) {
    let arr = []
    const files = fs.readdirSync(dir);
    files.forEach((item, index) => {
        var fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            let result = readFileList(path.join(dir, item));
            arr.push({
                label: item,
                path: fullPath,
                children: result
            })
        } else {
            arr.push({
                label: item,
                path: fullPath
            });
        }
    });
    return arr;
}
// 读取当前模板的所有文件
let DirCurTempFiles = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let tempCatPath = path.resolve(__dirname, '../../static/template');
		let confColl = getDB().collection('config');

		let config = await confColl.findOne({});
		let curTempName = config.curTempPath;
		let curTempFath = path.resolve(__dirname, `../../static/template/${curTempName}`);

		let promise = new Promise((resolve, reject) => {
			let result = readFileList(curTempFath);
			resolve(result);
		})

		await setResponse(ctx, promise, {
			error: '模板文件列表获取失败',
			success: '模板文件列表获取成功'
		})

	}, {admin: true}, {insRole: false})

}
// 读取模板列表
let DirTempList = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let confColl = getDB().collection('config');
		let config = await confColl.findOne({});
		let curTempPath = config.curTempPath;

		let promise = new Promise((resolve, reject) => {
			let arr = [];
			let tempPath = path.resolve(__dirname, '../../static/template');
			let files = fs.readdirSync(tempPath);
			files.forEach((item, index) => {
			    let fullPath = path.resolve(tempPath, item);
			    let state = fs.statSync(fullPath);
			    if(state.isDirectory()){
			        arr.push({
			        	name: item,
			        	focus: item === curTempPath ? true : false
			        });
			    }
			});
			resolve(arr)
		})
		await setResponse(ctx, promise, {
			error: '模板文件列表获取失败',
			success: '模板文件列表获取成功'
		})


	}, {admin: true}, {insRole: false})
}
// 读取单个文件的内容
let ReadTempFileContent = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let { filePath } = ctx.request.body;
		let promise;
		if(!filePath){
			promise = Promise.reject();
		}else{
			promise = fse.readFile(filePath, {encoding: 'utf8'})
		}
		await setResponse(ctx, promise, {
			error: '文件内容读取失败',
			success: '文件内容读取成功'
		})

	}, {admin: true}, {insRole: false})

}
// 修改单个文件内容
let EditTempFileContent = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let { filePath=false, content="" } = ctx.request.body;

		if(!filePath || !content){
			return next();
		}
		let promise = new Promise((resolve, reject) => {
			fs.writeFile(filePath, content, (err) => {
				if(err){
				 	throw err
				}else{
					resolve()
				}
			});
		})

		await setResponse(ctx, promise, {
			error: '模板文件列表获取失败',
			success: '模板文件列表获取成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'updateTemplate', parentKey: 'template'})

}
// 上传模板
let UploadTemplate = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		const file = ctx.request.files.file; // 获取上传文件
		let promise = new Promise((resolve, reject) => {
			// 创建可读流
			const rander = fs.createReadStream(file.path);
			// 上传路径
			let tempPath = path.resolve(__dirname, `../../static/template/`);
			rander.pipe(unzip.Extract({ path: tempPath }));
			resolve()
		})

		await setResponse(ctx, promise, {
			error: '模板上传失败',
			success: '模板上传成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'uploadTemplate', parentKey: 'template'})
}
// 删除模板
let RemoveTemplate = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let { name } = ctx.request.body;
		let tempPath = path.resolve(__dirname, `../../static/template/${name}`);

		let promise = fse.remove(tempPath);
		await setResponse(ctx, promise, {
			error: '模板删除失败',
			success: '模板删除成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'removeTemplate', parentKey: 'template'})
}
// 删除模板文件
let RemoveTempFile = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let { filePath } = ctx.request.body;

		let promise = fse.remove(filePath);
		await setResponse(ctx, promise, {
			error: '文件删除失败',
			success: '文件删除成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'removeTemplate', parentKey: 'template'})
}
// 设置当前使用的模板
let SetCurUseTempName = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let confColl = getDB().collection('config');
		let { name } = ctx.request.body;
		let config = await confColl.findOne({});

		let promise = confColl.updateOne({_id: config._id}, {$set: {curTempPath: name}});
		await setResponse(ctx, promise, {
			error: '默认模板设置失败',
			success: '默认模板设置成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'updateConfig', parentKey: 'config'})

}


module.exports = {
	DirCurTempFiles,
	RemoveTemplate,
	RemoveTempFile,
	UploadTemplate,
	DirTempList,
	SetCurUseTempName,
	EditTempFileContent,
	ReadTempFileContent,
}