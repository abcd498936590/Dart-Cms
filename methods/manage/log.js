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



// 全部日志
let GetAllLogs = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let logColl = getDB().collection('logs');
		let { page=1, limit=10 } = ctx.request.body;    // query get

		limit = limit > 100 ? 100 : limit;

		let promise = (async () => {
			let cursor = logColl.find({}).sort({_id: -1}).skip((--page) * limit).limit(limit);
			return {
				limit: limit,
				result: await cursor.toArray(),
				total: await logColl.estimatedDocumentCount()
			}
		})();
		promise.catch(err => {
			console.log(err);
		})
		await setResponse(ctx, promise, {
			error: '日志列表获取失败',
			success: '日志列表获取成功'
		})

	}, {admin: true}, {insRole: false})

}
// 删除日志
let RemoveLogs = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let logColl = getDB().collection('logs');
		let { list=[] } = ctx.request.body;  // body post
		let arrID = makeArrObjectID(list);

		let promise = logColl.deleteMany({_id: {$in: arrID}});
		await setResponse(ctx, promise, {
			error: '日志删除失败',
			success: '日志删除成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'removeLogs', parentKey: 'logs'})
}

module.exports = {
	GetAllLogs,
	RemoveLogs,
}