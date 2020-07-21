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


// 获取配置
let GetConfig = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let confColl = getDB().collection('config');
		let promise = confColl.findOne({});

		await setResponse(ctx, promise, {
			error: "配置信息获取失败",
			success: "配置信息获取成功"
		});

	}, {admin: true}, {insRole: false})

}
// 修改配置
let ExecConfig = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let confColl = getDB().collection('config');
		let curConfId = ctx.request.body._id;
		let _id = new ObjectID(curConfId);
		let updateInfo = ctx.request.body;    // body post
		Reflect.deleteProperty(updateInfo, '_id');

		let promise = confColl.updateOne({_id}, {$set: updateInfo});

		await setResponse(ctx, promise, {
			error: '配置修改失败',
			success: '配置修改成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'updateConfig', parentKey: 'config'})

}
// 上传App安装包
let UploadApp = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let file = ctx.request.files.file; // 获取上传文件
		let promise = new Promise((resolve, reject) => {
			// 创建可读流
			const reader = fs.createReadStream(file.path);
			let fileSuffix = path.extname(file.name).substring(1).toLocaleLowerCase();
			let upLoadPath = path.resolve(__dirname, '../static/app/', `app.${fileSuffix}`);
			// 创建可写流
			const upStream = fs.createWriteStream(upLoadPath);
			// 可读流通过管道写入可写流
			reader.pipe(upStream);
			// 成功，文件路径
			resolve(upLoadPath);
		})

		await setResponse(ctx, promise, {
			error: "APP上传失败",
			success: "APP上传成功"
		});

	}, {admin: true}, {insRole: true, childrenKey: 'updateConfig', parentKey: 'config'})

}
// 上传logo
let UploadWebLogon = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let file = ctx.request.files.file; // 获取上传文件
		let promise = new Promise(async (resolve, reject) => {
			const reader = fs.createReadStream(file.path);
			let fileSuffix = path.extname(file.name).substring(1).toLocaleLowerCase();
			let upLoadPath = path.resolve(__dirname, `../../static/upload/logo/logo.png`);
			// 创建可写流
			const upStream = fs.createWriteStream(upLoadPath);
			// 可读流通过管道写入可写流
			reader.pipe(upStream);
			resolve(upLoadPath);
		})

	}, {admin: true}, {insRole: true, childrenKey: 'updateConfig', parentKey: 'config'})

}

module.exports = {
	GetConfig,
	ExecConfig,
	UploadApp,
	UploadWebLogon,
}