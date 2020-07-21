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
const { setResponse, makeArrObjectID, mixinsScriptConfig, encryption, createTokenID, getBjDate, dirCatImgs, placeUploadImg } = require('../../utils/tools');



// 全部外链
let GetAllLinks = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let linkColl = getDB().collection('other');
		let { page=1, limit=10 } = ctx.request.body;    // query get

		limit = limit > 100 ? 100 : limit;

		let promise = (async () => {
			let cursor = linkColl.find({type: 'link'}).sort({_id: -1}).skip((--page) * limit).limit(limit);
			return {
				limit: limit,
				result: await cursor.toArray(),
				total: await linkColl.find({type: 'link'}).count()
			}
		})();
		promise.catch(err => {
			console.log(err);
		})
		await setResponse(ctx, promise, {
			error: '外链列表获取失败',
			success: '外链列表获取成功'
		})

	}, {admin: true}, {insRole: false})

}
// 删除外链
let RemoveLinks = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let linkColl = getDB().collection('other');
		let { list=[] } = ctx.request.body;
		let arrID = makeArrObjectID(list);

		let promise = linkColl.deleteMany({_id: {$in: arrID}});
		await setResponse(ctx, promise, {
			error: '外链删除失败',
			success: '外链删除成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'removeLink', parentKey: 'link'})

}
// 添加外链
let AddLink = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let linkColl = getDB().collection('other');
		let insertInfo = ctx.request.body;
		insertInfo['type'] = 'link';

		let promise = linkColl.insertOne(insertInfo);
		await setResponse(ctx, promise, {
			error: '外链添加失败',
			success: '外链添加成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'addLink', parentKey: 'link'})

}
// 更新外链
let UpdateLinks = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let linkColl = getDB().collection('other');
		let { _id } = ctx.request.body;
		let updateInfo = ctx.request.body;
		_id = new ObjectID(_id);
		Reflect.deleteProperty(updateInfo, '_id');

		let promise = linkColl.updateOne({_id}, {$set: updateInfo});
		await setResponse(ctx, promise, {
			error: '外链修改失败',
			success: '外链修改成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'updateLink', parentKey: 'link'})

}
// 获取全部外链图片
let DirLinkImgs = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let linkColl = getDB().collection('other');
		let promise = dirCatImgs(linkColl, 'upload', 'link', 'img');
		await setResponse(ctx, promise, {
			error: '外链图片获取失败',
			success: '外链图片获取成功'
		})

	}, {admin: true}, {insRole: false})

}
// 上传图片
let UploadImages = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let file = ctx.request.files.file; // 获取上传文件
		let { catName } = ctx.request.body;
		let promise = placeUploadImg(catName, file);

		await setResponse(ctx, promise, {
			error: '外链图片获取失败',
			success: '外链图片获取成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: ['updateLink', 'addLink'], parentKey: 'link'})

}
// 删除外链图片
let RemoveLinkImg = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let { fileName, catName } = ctx.request.body;
		let filePath = path.resolve(__dirname, `../../static/upload/${catName}`, fileName);
		let promise = fse.remove(filePath);

		await setResponse(ctx, promise, {
			error: '外链图片删除失败',
			success: '外链图片删除成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: ['updateLink', 'addLink'], parentKey: 'link'})

}

module.exports = {
	GetAllLinks,
	RemoveLinks,
	AddLink,
	DirLinkImgs,
	UploadImages,
	RemoveLinkImg,
	UpdateLinks,
}