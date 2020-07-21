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


// 获取文章列表
let GetAllArticle = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let artColl = getDB().collection('article_info');
		let { page=1, limit=10, search=false, sort={update_time: -1} } = ctx.request.body;    // query get

		limit = limit > 100 ? 100 : limit;

		let queryJson = (search && search.trim()) ? { articleTitle: { $regex: search, $options: "$i" } } : {};

		let cursor = artColl.find(queryJson).sort(sort).skip((--page) * limit).limit(limit);

		let promise = (async () => {
			return {
				limit: limit,
				result: await cursor.toArray(),
				total: await artColl.find(queryJson).count()
			}
		})();
		await setResponse(ctx, promise, {
			error: '文章列表获取失败',
			success: '文章列表获取成功'
		})

	}, {admin: true}, {insRole: false})

}
// 获取单个文章信息
let GetCurArticle = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let artInfoColl = getDB().collection('article_info');
		// let artListColl = getDB().collection('article_list');

		let { _id } = ctx.request.body;
		if(_id && _id.length === 24){
			_id = new ObjectID(_id);
			var promise = artInfoColl.aggregate([
				{
			        $match: {
			            _id
			        }
			    },
			    {
			        $lookup: {
			            from: "article_list",       // 关联的表 名称
			            localField: "_id",        // 当前表的字段 需要关联到目标表
			            foreignField: "aid",      // 目标表和当前表字段对应的字段
			            as: "text"              // 输出的字段
			        }
			    },
			    {
			    	$unwind: "$text"
			    },
			    {
			    	$project: {
			    		_id: 1,
			    		articleTitle: 1,
			    		articleImage: 1,
			    		poster: 1,
			    		article_type: 1,
			    		introduce: 1,
			    		update_time: 1,
			    		video_id: 1,
			    		popular: 1,
			    		allow_reply: 1,
			    		openSwiper: 1,
			    		display: 1,
			    		content: '$text.text'
			    	}
			    }
			]).toArray();
		}else{
			var promise = Promise.reject();
		}

		await setResponse(ctx, promise, {
			error: '当前文章信息获取失败',
			success: '当前文章信息获取成功'
		})

	}, {admin: true}, {insRole: false})

}
// 批量修改文章属性
let ChangeArtState = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let artColl = getDB().collection('article_info');

		let { list, info={} } = ctx.request.body;
		let _id_arr = makeArrObjectID(list);

		let promise = artColl.updateMany({_id: {$in: _id_arr}}, {$set: info});
		await setResponse(ctx, promise, {
			error: '信息修改失败',
			success: '信息修改成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'updateArticle', parentKey: 'article'})

}
// 新增文章
let AddArticle = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let artInfoColl = getDB().collection('article_info');
		let artListColl = getDB().collection('article_list');

		let { info, content } = ctx.request.body;
		Reflect.deleteProperty(info, '_id');
		Reflect.deleteProperty(info, 'content');

		// 分类
		info["article_type"] = new ObjectID(info["article_type"]);
		// 关联视频
		let ns = info.video_id;
		for(let i=0; i<ns.length; i++){
			ns[i] = new ObjectID(ns[i]);
		}

		let insetResult = await artInfoColl.insertOne(info);

		if(insetResult.result.ok === 1){
			let aid = insetResult.insertedId;
			var promise = artListColl.insertOne({aid, text: content});
		}else{
			var promise = Promise.reject();
		}

		await setResponse(ctx, promise, {
			error: '文章视频信息失败',
			success: '文章视频信息成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'addArticle', parentKey: 'article'})
}
// 更新文章
let UpdateArticle = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let artInfoColl = getDB().collection('article_info');
		let artListColl = getDB().collection('article_list');

		let { info, _id, content } = ctx.request.body;
		// 当前id
		let aid = new ObjectID(_id);
		Reflect.deleteProperty(info, '_id');
		Reflect.deleteProperty(info, 'content');

		// 分类
		info["article_type"] = new ObjectID(info["article_type"]);
		// 关联视频
		let ns = info.video_id;
		for(let i=0; i<ns.length; i++){
			ns[i] = new ObjectID(ns[i]);
		}

		let p1 = artInfoColl.updateOne({_id: aid}, {$set: info});
		let p2 = artListColl.updateOne({aid}, {$set: {text: content}});

		let promise = Promise.all([p1, p2]);
		await setResponse(ctx, promise, {
			error: '文章信息更新失败',
			success: '文章信息更新成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'updateArticle', parentKey: 'article'})

}
// 删除文章
let RemoveArticle = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let artInfoColl = getDB().collection('article_info');
		let artListColl = getDB().collection('article_list');
		let msgColl = getDB().collection('message');

		let { list=[] } = ctx.request.body;  // body post

		let _id_arr = makeArrObjectID(list);

		let p1 = artInfoColl.deleteMany({_id: {$in: _id_arr}});    // 文章主信息
		let p2 = artListColl.deleteMany({aid: {$in: _id_arr}});    // 文章所属 => 内容正文
		let p3 = msgColl.deleteMany({aid: {$in: _id_arr}});        // 文章所属 => 留言信息

		let promise = Promise.all([p1, p2, p3]);
		await setResponse(ctx, promise, {
			error: '文章删除失败',
			success: '文章删除成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'removeArticle', parentKey: 'article'})

}

module.exports = {
	GetAllArticle,
	ChangeArtState,
	AddArticle,
	UpdateArticle,
	RemoveArticle,
	GetCurArticle,
}