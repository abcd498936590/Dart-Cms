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



// 获取导航列表
let GetNavList = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let navColl = getDB().collection('other');    // 导航不分页，因为不肯能设置过多的导航

		let promise = new Promise(async (resolve, reject) => {
			let arr = await navColl.find({type: 'nav_type', parent_id: false}).sort({index: 1}).toArray();
			for(let arg of arr){
				let children = await navColl.find({type: 'nav_type', parent_id: arg._id}).sort({index: 1}).toArray()
				if(children.length){
					arg.children = children;
				}
			}
			resolve(arr)
		})
		await setResponse(ctx, promise, {
			error: '导航列表获取失败',
			success: '导航列表获取成功'
		})

	}, {admin: true}, {insRole: false})

}
// 更新导航信息-包括导航下添加分类
let UpdateNav = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let navColl = getDB().collection('other');
		let { _id, parent_id } = ctx.request.body;
		let updateInfo = ctx.request.body;
		_id = new ObjectID(_id);
		Reflect.deleteProperty(updateInfo, '_id');

		updateInfo['parent_id'] = (parent_id && parent_id.length === 24) ? new ObjectID(parent_id) : false;

		let promise = navColl.updateOne({_id}, {$set: updateInfo});

		await setResponse(ctx, promise, {
			error: '导航信息更新失败',
			success: '导航信息更新成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'updateNavType', parentKey: 'nav_type'})

}
// 删除导航
let RemoveNav = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let navColl = getDB().collection('other');
		let videoColl = getDB().collection('video_info');
		let artColl = getDB().collection('article_info');

		let { _id, parent_id, nav_type="video" } = ctx.request.body;         // body post
		_id = new ObjectID(_id);
		let promise,
		errorMsg = '';

		// 一级导航
		if(!parent_id){
			let children = await navColl.find({type: 'nav_type', parent_id: _id}).toArray();
			let inArr = [_id];
			for(let arg of children){
				inArr.push(arg._id)
			}
			let vLen = 0;

			if(nav_type === 'article'){
				vLen = await artColl.find({video_type: {$in: inArr}}).count();
			}else{
				vLen = await videoColl.find({video_type: {$in: inArr}}).count();
			}
			//
			promise = !vLen ?
				Promise.all([
					navColl.deleteOne({_id}),
					navColl.deleteMany({parent_id: _id})
				]) :
				Promise.reject();
			errorMsg = vLen ? `该分类还有 ${vLen} 条数据，请先删除或者转移` : '导航删除失败';
		}else{  // 二级导航
			let vLen = 0;
			if(nav_type === 'article'){
				vLen = await artColl.find({video_type: _id}).count();
			}else{
				vLen = await videoColl.find({video_type: _id}).count();
			}
			promise = !vLen ? navColl.deleteOne({_id}) : Promise.reject()
			errorMsg = vLen ? `该分类还有 ${vLen} 条数据，请先删除或者转移` : '导航删除失败';
		}


		await setResponse(ctx, promise, {
			error: errorMsg,
			success: '导航删除成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'removeNavType', parentKey: 'nav_type'})

}
// 添加导航
let AddNav = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let navColl = getDB().collection('other');
		let { parent_id } = ctx.request.body;
		let insertInfo = ctx.request.body;         // body post
		let queryJson = {}

		let isNameRepeat = await navColl.findOne({name: insertInfo.name, type: 'nav_type'});
		if(isNameRepeat){
			return await setResponse(ctx, promise, {
				error: '此导航分类名称已经被占用，无法添加！'
			})
		}

		insertInfo['type'] = 'nav_type';
		insertInfo['parent_id'] = (parent_id && parent_id.length === 24) ? new ObjectID(parent_id) : false;
		if(parent_id){
			queryJson = { parent_id: new ObjectID(parent_id) };
		}else{
			queryJson = { parent_id: false };
		}
		let curQueue = await navColl.find(queryJson).sort({index: 1}).toArray();
		insertInfo['index'] = curQueue.length ? (curQueue[curQueue.length - 1].index + 1) : 0;

		let promise = navColl.insertOne(insertInfo);
		await setResponse(ctx, promise, {
			error: '导航添加失败',
			success: '导航添加成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'addNavType', parentKey: 'nav_type'})

}
// 导航排序
let NavSort = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let navColl = getDB().collection('other');
		let { list=[] } = ctx.request.body;
		let arr = [],promise;

		for(let arg of list){
			arr.push(
				navColl.updateOne({_id: new ObjectID(arg._id)}, {$set: {index: arg.index}})
			)
		}
		promise = Promise.all(arr);
		await setResponse(ctx, promise, {
			error: '导航添加失败',
			success: '导航添加成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'updateNavType', parentKey: 'nav_type'})

}

module.exports = {
	GetNavList,
	UpdateNav,
	RemoveNav,
	AddNav,
	NavSort,
}