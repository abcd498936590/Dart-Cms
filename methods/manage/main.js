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




// 首页入口
let GetAllInfos = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let msgColl = getDB().collection('message');
		let memColl = getDB().collection('user');
		let typeColl = getDB().collection('nav_type');
		let videoColl = getDB().collection('video_info');
		// mongodb server version
		let mongoSerStatus = await getDB().admin().serverStatus();
		let messageList = await msgColl.aggregate([
			{
				$sort: {_id: -1}
			},
			{
				$limit: 10
			},
			{
				$lookup: {
					from: "video_info",
	        		localField: "vid",
	        		foreignField: "_id",
	        		as: "video"
				}
			},
			{
				$lookup: {
					from: "user",
	        		localField: "uid",
	        		foreignField: "_id",
	        		as: "user"
				}
			},
			{
				$unwind: "$video"
			},
			{
				$unwind: "$user"
			},
			{
				$project: {
					_id: 1,
					vid: 1,
					pid: 1,
					uid: 1,
					wid: 1,
					title: "$video.videoTitle",
					agree: 1,
					display: 1,
					text: 1,
					date: 1,
					userName: '$user.userName'
				}
			}
		]).toArray();
		// 留言总数
		let result = {
			loginInfo: {
				userName: ctx.session2.user.nickName,
				nowLoginTime: ctx.session2.user.curTime,
				nowLoginIp: ctx.clientIp,
				nodeVersion: process.version.substring(1),
				mongoVersion: mongoSerStatus.version,
			},
			tagTotal: {
				member: await memColl.find({default: false, grade_id: 0}).count(),     // 会员
				message: await msgColl.estimatedDocumentCount(),    // 留言
				video: await videoColl.estimatedDocumentCount(),    // 视频
				type: await typeColl.estimatedDocumentCount(),      // 分类
			},
			message: messageList,
			member: await memColl.find({display: true, grade_id: 0, default: false}).sort({_id: -1}).limit(10).toArray()
		}
		let promise = Promise.resolve(result);
		await setResponse(ctx, promise, {
			error: '统计数据获取失败',
			success: '统计数据获取成功'
		})
	}, {admin: true}, {insRole: false})

}

module.exports = {
	GetAllInfos
}