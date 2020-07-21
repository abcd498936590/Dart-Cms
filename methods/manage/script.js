const { ObjectID } = require('mongodb');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const unzip = require("unzip-stream");
const uuidv4 = require('uuid/v4');
const os = require('os');
require('shelljs/global');
const platform = os.platform();
//
const getDB = require('../../utils/baseConnect');
const authToken = require('../../utils/authToken');
const { setResponse, makeArrObjectID, mixinsScriptConfig, encryption, createTokenID, getBjDate } = require('../../utils/tools');



// 读取
function readDirSync(pathStr){
	let arr = [];
	var pa = fs.readdirSync(pathStr);
	pa.forEach((el, index) => {
		let pathItem = path.resolve(pathStr, el);
		let result = fs.statSync(pathItem)
		if(result.isDirectory()){
			let scriptConfPath = path.resolve(pathItem, './config.json');
			let curConf = fse.readJsonSync(scriptConfPath);
			arr.push({
				name: curConf.name,
				state: curConf.state,
				alias: curConf.alias,
				note: curConf.note,
				file: curConf.file,
				timeout: curConf.timeout,
				stateName: curConf.state ? "运行中" : "空闲",
				state: curConf.state,
				runTime: curConf.runTime,
				options: curConf.options,
			})
		}
	})
	return arr
}
// 获取脚本列表
let GetScriptList = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let promise = new Promise((resolve, reject) => {
			// 上传路径
			let scriptPath = path.resolve(__dirname, '../../script/');
			let scriptList = readDirSync(scriptPath);
			resolve(scriptList)
		})
		await setResponse(ctx, promise, {
			error: '脚本列表获取失败',
			success: '脚本列表获取成功'
		})
	}, {admin: true}, {insRole: false})

}
// 执行脚本
let RunScript = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let { alias } = ctx.request.body;
		let scriptPath = path.resolve(__dirname, `../../script/${alias}/app.js`)
		let promise,
		errInfo;

		try{
			let confPath = path.resolve(__dirname, `../../script/${alias}/config.json`);
			let curScriptConf = await fse.readJson(confPath);
			if(curScriptConf.state){
				errInfo = '脚本正在运行，无法启动';
				throw new Error(errInfo);
			}
			exec(`node ${scriptPath}`, {async:true});
			promise = Promise.resolve();
		}catch(err){
			promise = Promise.reject();
		}

		await setResponse(ctx, promise, {
			error: errInfo
		});

	}, {admin: true}, {insRole: true, childrenKey: 'runScript', parentKey: 'script'})

}
// 停止脚本
let StopRunScript = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let { alias } = ctx.request.body;
		let scriptConfPath = path.resolve(__dirname, `../../script/${alias}/config.json`);
		let curScriptConf = fse.readJsonSync(scriptConfPath);
		let promise;

		// 是否正在运行
		if(curScriptConf.state){
			try{
				let command = platform === 'linux' ? `kill -9 ${curScriptConf.pid}` : `taskkill -PID ${curScriptConf.pid} -F`;
				exec(command);
				mixinsScriptConfig(alias, {state: false, pid: 0});
				promise = Promise.resolve();
			}catch(err){
				console.log('脚本停止运行时，发生错误！');
			}
		}else{
			promise = Promise.reject();
		}
		await setResponse(ctx, promise, {
			success: '脚本已经停止运行，请刷新查看状态',
			error: !curScriptConf.state ? '脚本空闲状态，无须停止' : '操作失败'
		});

	}, {admin: true}, {insRole: true, childrenKey: 'runScript', parentKey: 'script'})

}
// 修改脚本
let UpdateScript = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let { alias, name, timeout, options } = ctx.request.body;
		let mixins = { name, timeout, options };
		let promise = mixinsScriptConfig(alias, mixins) ? Promise.resolve() : Promise.reject();

		await setResponse(ctx, promise, {
			error: "脚本修改失败",
			success: "脚本修改成功"
		});

	}, {admin: true}, {insRole: true, childrenKey: 'updateScript', parentKey: 'script'})

}
// 删除脚本
let RemoveScript = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let { alias } = ctx.request.body;
		let curConfPath = path.resolve(__dirname, `../../script/${alias}/config.json`);
		let curScriptPath = path.resolve(__dirname, `../../script/${alias}`);
		let curConf = fse.readJsonSync(curConfPath);

		let promise = curConf.state ? Promise.reject() : fse.remove(curScriptPath);
		await setResponse(ctx, promise, {
			error: curConf.state ? "脚本正在运行，无法删除" : "脚本删除失败",
			success: "脚本删除成功"
		});

	}, {admin: true}, {insRole: true, childrenKey: 'removeScript', parentKey: 'script'})

}
// 上传脚本
let UploadScript = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		const file = ctx.request.files.file; // 获取上传文件
		let promise = new Promise((resolve, reject) => {
			// 创建可读流
			const rander = fs.createReadStream(file.path);
			// 上传路径
			let scriptPath = path.resolve(__dirname, `../../script/`);
			rander.pipe(unzip.Extract({ path: scriptPath }));
			resolve()
		})

		await setResponse(ctx, promise, {
			error: "脚本上传失败",
			success: "脚本上传成功"
		});

	}, {admin: true}, {insRole: true, childrenKey: 'uploadScript', parentKey: 'script'})

}

module.exports = {
	UploadScript,
	RemoveScript,
	UpdateScript,
	RunScript,
	StopRunScript,
	GetScriptList,
}