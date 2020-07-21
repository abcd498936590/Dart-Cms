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



// 全部广告
let GetAllAdverts = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let linkColl = getDB().collection('other');
		let { page=1, limit=10 } = ctx.request.body;    // query get

		limit = limit > 100 ? 100 : limit;

		let promise = (async () => {
			let cursor = linkColl.find({type: 'advert'}).sort({_id: -1}).skip((--page) * limit).limit(limit);
			return {
				limit: limit,
				result: await cursor.toArray(),
				total: await linkColl.find({type: 'advert'}).count()
			}
		})();
		promise.catch(err => {
			console.log(err);
		})
		await setResponse(ctx, promise, {
			error: '广告列表获取失败',
			success: '广告列表获取成功'
		})

	}, {admin: true}, {insRole: false})

}
// 删除广告
let RemoveAdverts = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let linkColl = getDB().collection('other');
		let { list=[] } = ctx.request.body;
		let arrID = makeArrObjectID(list);

		let promise = linkColl.deleteMany({_id: {$in: arrID}});
		await setResponse(ctx, promise, {
			error: '广告删除失败',
			success: '广告删除成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'removeMeal', parentKey: 'meal'})

}
// 添加广告
let AddAdvert = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let linkColl = getDB().collection('other');
		let insertInfo = ctx.request.body;
		insertInfo['type'] = 'advert';

		let promise = linkColl.insertOne(insertInfo);
		await setResponse(ctx, promise, {
			error: '广告添加失败',
			success: '广告添加成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'addMeal', parentKey: 'meal'})

}
// 更新广告
let UpdateAdvert = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let linkColl = getDB().collection('other');
		let { _id } = ctx.request.body;
		let updateInfo = ctx.request.body;
		_id = new ObjectID(_id);
		Reflect.deleteProperty(updateInfo, '_id');

		let promise = linkColl.updateOne({_id}, {$set: updateInfo});
		await setResponse(ctx, promise, {
			error: '广告修改失败',
			success: '广告修改成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'updateMeal', parentKey: 'meal'})

}
// 获取全部广告图片
let DirAdvertImgs = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let linkColl = getDB().collection('other');
		let promise = dirCatImgs(linkColl, 'upload', 'meal', 'path');
		await setResponse(ctx, promise, {
			error: '广告图片获取失败',
			success: '广告图片获取成功'
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
			error: '广告图片获取失败',
			success: '广告图片获取成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: ['updateMeal', 'addMeal'], parentKey: 'meal'})

}
// 删除广告图片
let RemoveAdvertImg = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let { fileName, catName } = ctx.request.body;
		let filePath = path.resolve(__dirname, `../../static/upload/${catName}`, fileName);
		let promise = fse.remove(filePath);

		await setResponse(ctx, promise, {
			error: '外链图片删除失败',
			success: '外链图片删除成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: ['updateMeal', 'addMeal'], parentKey: 'meal'})

}

module.exports = {
	GetAllAdverts,
	RemoveAdverts,
	AddAdvert,
	UpdateAdvert,
	DirAdvertImgs,
	UploadImages,
	RemoveAdvertImg,
}