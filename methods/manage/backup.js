const { ObjectID } = require('mongodb');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const unzip = require("unzip-stream");
const send = require('koa-send');
const uuidv4 = require('uuid/v4');
const archiver = require('archiver');
require('shelljs/global');
//
const getDB = require('../../utils/baseConnect');
const authToken = require('../../utils/authToken');
const { setResponse, makeArrObjectID, mixinsScriptConfig, encryption, createTokenID, getBjDate, dateStringify } = require('../../utils/tools');
const { host, prot, dbName } = require('../../utils/config').project;


// 执行备份
let ExecDataBackup = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let confColl = getDB().collection('config');
		let config = await confColl.findOne({});
		let isBJtime = config.isBjTime;
		let promise,
		interimList = dateStringify(isBJtime).replace(/-| |:/g, '');
		let { all=false } = ctx.request.body;

		try{

			let backupPath = path.resolve(__dirname, '../../backup', interimList);
			if(all){
				let staticPath = path.resolve(__dirname, '../../static');
				await fse.copy(staticPath, backupPath);
			}
			// console.log(`mongodump -h ${host} -d ${dbName} -o ${backupPath}`);
			exec(`mongodump -h ${host} -d ${dbName} -o ${backupPath}`);

			await new Promise((resolve, reject) => {

				// 压缩文件
				let output = fs.createWriteStream(`${backupPath}.zip`);
				let archive = archiver('zip');

				output.on('close', async () => {
					resolve()
				})
				archive.on('error', (err) => {
			    	throw err
				})

				archive.pipe(output);
				archive.directory(`${backupPath}`, false);
				archive.finalize();

			})
			// 添加数据到数据库
			let backupColl = getDB().collection('other');
			await backupColl.insertOne({
				name: `${interimList}.zip`,
				type: 'backup',
				date: dateStringify(isBJtime)
			})
			// 删除临时文件夹
			await fse.remove(`${backupPath}`);
			// 响应
			promise = Promise.resolve()
		}catch(err){
			console.log(err);
			promise = Promise.reject()
		}


		await setResponse(ctx, promise, {
			error: "数据备份执行失败",
			success: "数据备份执行成功"
		});

	}, {admin: true}, {insRole: true, childrenKey: 'execBackup', parentKey: 'backup'})

}
// 获取所有备份数据
let DirDataBackup = async (ctx, next) => {

	await authToken(ctx, next, async () => {


		let backupColl = getDB().collection('other');
		let { page=1, limit=10 } = ctx.request.body;    // query get

		limit = limit > 100 ? 100 : limit;

		let promise = (async () => {
			let cursor = backupColl.find({type: 'backup'}).sort({_id: -1}).skip((--page) * limit).limit(limit);
			return {
				limit: limit,
				result: await cursor.toArray(),
				total: await backupColl.find({type: 'backup'}).count()
			}
		})();
		promise.catch(err => {
			console.log(err);
		})

		await setResponse(ctx, promise, {
			error: "备份数据列表获取失败",
			success: "备份数据列表获取成功"
		});

	}, {admin: true}, {insRole: false})

}
let removeFile = async (arr) => {
	let backupPath = path.resolve(__dirname, '../../backup')
	let newArr = [];
	for(let filename of arr){
		newArr.push(fse.remove(`${backupPath}/${filename}`))
	}
	return Promise.all(newArr)
}
// 删除备份的数据
let RemoveDataBackup = async (ctx, next) => {

	await authToken(ctx, next, async () => {


		let backupColl = getDB().collection('other');
		let { list=[], file=[] } = ctx.request.body;  // body post

		let _id_arr = makeArrObjectID(list);
		let promise = Promise.all([
			backupColl.deleteMany({_id: {$in: _id_arr}}),
			removeFile(file)
		])

		await setResponse(ctx, promise, {
			error: "备份数据删除失败",
			success: "备份数据删除成功"
		});

	}, {admin: true}, {insRole: true, childrenKey: 'removeBackup', parentKey: 'backup'})

}
// 下载备份数据
let DownloadData = async (ctx, next) => {

	let filename = ctx.query.name;
	ctx.attachment(filename);
	let filePath = path.resolve(__dirname, '../../backup');

	await send(ctx, filename, { root: `${filePath}` });

}


module.exports = {
	ExecDataBackup,
	DirDataBackup,
	DownloadData,
	RemoveDataBackup,
}