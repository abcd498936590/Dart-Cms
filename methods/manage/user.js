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
const { setResponse, makeArrObjectID, mixinsScriptConfig, encryption, createTokenID, getBjDate, roleInspect } = require('../../utils/tools');



// 获取用户列表
let GetUserList = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let memColl = getDB().collection('user');
		let { page=1, limit=10, search='' } = ctx.request.body;    // query get

		limit = limit > 100 ? 100 : limit;

		let promise = (async () => {
			let queryJson = (search && search.trim()) ? { nickName: eval("/" + search +"/i") } : {};
			let cursor = memColl.find(queryJson);
			return {
				limit: limit,
				result: await cursor.sort({_id: 1}).skip((--page) * limit).limit(limit).toArray(),
				total: await cursor.count()
			}
		})();
		promise.then(res => {
			for(let arg of res.result){
				Reflect.deleteProperty(arg, 'passWord');
				Reflect.deleteProperty(arg, 'roleData');
			}
		})
		await setResponse(ctx, promise, {
			error: '用户列表获取失败',
			success: '用户列表获取成功'
		})

	}, {admin: true}, {insRole: false})

}
// 修改用户信息
let UpdateUser = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let memColl = getDB().collection('user');
		let { _id } = ctx.request.body;
		let updateInfo = ctx.request.body;
		_id = new ObjectID(_id);
		Reflect.deleteProperty(updateInfo, '_id');
		Reflect.deleteProperty(updateInfo, 'passWord');
		let promise;

		var isUpdateOwn = _id.toString() === ctx.session2.user._id.toString();
		// 修改自己
		if(isUpdateOwn){
			if(updateInfo.hasOwnProperty('display')){
				promise = Promise.reject();
			}else{
				promise = memColl.updateOne({_id}, {$set: updateInfo});
			}
		}else{  // 别人
			let targetData = await memColl.findOne({_id});
			// 只能修改自己同级或者小于自己级别的
			if(targetData && targetData.grade_id > 1 || !targetData){
				promise = Promise.reject();
			}else if(targetData && targetData.grade_id < 2){
				promise = memColl.updateOne({_id}, {$set: updateInfo});
			}
		}

		await setResponse(ctx, promise, {
			error: isUpdateOwn ? '无法修改自己的个人信息' : '用户信息更新失败',
			success: '用户信息更新成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'updateUser', parentKey: 'user'})

}
// 删除用户
let RemoveUser = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let memColl = getDB().collection('user');
		let { list=[] } = ctx.request.body;         // body post
		let arrID = makeArrObjectID(list);


		let promise = memColl.deleteMany({_id: {$in: arrID, $nin: [ctx.session2.user._id]}, grade_id: 1});
		await setResponse(ctx, promise, {
			error: '用户删除失败',
			success: '用户删除成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'removeUser', parentKey: 'user'})

}
// 添加用户
let AddUser = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let memColl = getDB().collection('user');
		let insertInfo = ctx.request.body;         // body post
		let { userName, admin } = ctx.request.body;
		insertInfo['default'] = false;
		insertInfo['grade_id'] = admin ? 1 : 0;
		insertInfo['passWord'] = encryption(insertInfo.passWord);

		let isExist = await memColl.findOne({userName});

		if(isExist){
			var promise = Promise.reject();
		}else{
			var promise = memColl.insertOne(insertInfo);
		}

		await setResponse(ctx, promise, {
			error: isExist ? '用户已经存在' : '用户添加失败',
			success: '用户添加成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'addUser', parentKey: 'user'})

}
let ResetMyPassWord = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let memColl = getDB().collection('user');
		let { passWord='' } = ctx.request.body;


		let promise = passWord ? memColl.updateOne({_id: ctx.session2.user._id}, {$set: {passWord: encryption(passWord)}}) : Promise.reject();
		await setResponse(ctx, promise, {
			error: !passWord ? '新密码不得为空' : '密码修改失败',
			success: '密码修改成功'
		})

	}, {admin: true}, {insRole: false})

}

module.exports = {
	GetUserList,
	UpdateUser,
	RemoveUser,
	AddUser,
	ResetMyPassWord,
}