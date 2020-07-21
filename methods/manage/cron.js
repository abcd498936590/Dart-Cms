const { ObjectID } = require('mongodb');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const unzip = require("unzip-stream");
const uuidv4 = require('uuid/v4');
const axios = require('axios');
require('shelljs/global');
//
const getDB = require('../../utils/baseConnect');
const authToken = require('../../utils/authToken');
const { setResponse, makeArrObjectID, mixinsScriptConfig, encryption, createTokenID, getBjDate } = require('../../utils/tools');



// 创建任务
let createCron = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let { time, name, script, state, clientTime } = ctx.request.body;
		let serverTime = new Date().getTime()
		let res = await axios({
			method: 'POST',
			headers: {
				"Content-Type": "application/json"
			},
			url: 'http://127.0.0.1:8899/',
			data: JSON.stringify({ time, name, script, state, clientTime, serverTime, type: 'createCron' })
		});

		let promise = res && res.data && res.data.code === 200 ? Promise.resolve() : Promise.reject();
		await setResponse(ctx, promise, {success: '操作成功！', error: '操作失败！'});

	}, {admin: true}, {insRole: true, childrenKey: 'createCron', parentKey: 'cron'})

}
// 删除任务
let removeCron = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let { id } = ctx.request.body;

		let res = await axios({
			method: 'POST',
			headers: {
				"Content-Type": "application/json"
			},
			url: 'http://127.0.0.1:8899/',
			data: JSON.stringify({ id, type: 'removeCron' })
		});
		let promise = res && res.data && res.data.code === 200 ? Promise.resolve() : Promise.reject();
		await setResponse(ctx, promise);

	}, {admin: true}, {insRole: true, childrenKey: 'removeCron', parentKey: 'cron'})

}
// 获取全部任务
let getAllCrons = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let res = await axios({
			method: 'POST',
			headers: {
				"Content-Type": "application/json"
			},
			url: 'http://127.0.0.1:8899/',
			data: JSON.stringify({ type: 'getAllCrons' })
		});
		let promise = res && res.data && res.data.code === 200 ? Promise.resolve(res.data.value) : Promise.reject();
		await setResponse(ctx, promise);

	}, {admin: true}, {insRole: false})
}

module.exports = {
	createCron,
	removeCron,
	getAllCrons,
}