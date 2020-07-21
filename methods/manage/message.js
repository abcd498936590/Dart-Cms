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



// 留言列表
let GetMessageList = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let msgColl = getDB().collection('message');
		let { page=1, limit=10, search=false, match=false } = ctx.request.body;    // query get

		limit = limit > 100 ? 100 : limit;

		let promise = (async () => {
			let queryJson = (search && search.trim()) ? { text: eval("/" + search +"/i") } : {};
			let pipe = [
				{
					$match: queryJson
				},
				{
					$sort: {_id: -1}
				},
				{
					$skip: 20 * --page
				},
				{
					$limit: 20
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
						video_title: "$video.videoTitle",
						agree: 1,
						display: 1,
						text: 1,
						date: 1,
						userName: '$user.userName'
					}
				}
			]

			if(match){
				pipe[0]['$match'] = Object.assign({}, pipe[0]['$match'], match);
			}
			let cursor = msgColl.aggregate(pipe);
			return {
				limit: limit,
				result: await cursor.toArray(),
				total: await msgColl.find(queryJson).count()
			}
		})();
		promise.catch(err => {
			console.log(err);
		})
		await setResponse(ctx, promise, {
			error: '留言列表获取失败',
			success: '留言列表获取成功'
		})

	}, {admin: true}, {insRole: false})

}
// 改变留言状态 - 审批（通过 | 未通过） - 是否显示（显示 | 隐藏）
let ChangeMsgState = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let msgColl = getDB().collection('message');
		let { list=[], info={} } = ctx.request.body;
		let arrID = makeArrObjectID(list);

		let promise = msgColl.updateMany({_id: {$in: arrID}}, {$set: info});
		await setResponse(ctx, promise, {
			error: '留言状态修改失败',
			success: '留言状态修改成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'inspectMessage', parentKey: 'message'})

}
// 删除留言
let RemoveMessage = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let msgColl = getDB().collection('message');
		let { list=[] } = ctx.request.body;         // body post
		let arrID = makeArrObjectID(list);

		let promise = msgColl.deleteMany({_id: {$in: arrID}});
		await setResponse(ctx, promise, {
			error: '留言删除失败',
			success: '留言删除成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'removeMessage', parentKey: 'message'})

}
// 回复留言
let ReplyMessage = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let msgColl = getDB().collection('message');
		let config = confColl.findOne({});
		let isBJtime = config.isBjTime;

		let { wid, pid, vid, text } = ctx.request.body;
		wid = new ObjectID(wid);
		pid = new ObjectID(pid);
		vid = new ObjectID(vid);

		let times = new Date().getTime();
		let data = {
			vid,
		    uid: ctx.session2.user._id,
		    pid,
		    wid,
		    agree: true,
		    display: true,
		    date: isBJtime ? getBjDate(times).getTime() : times,
		    text,
		}
		let promise = msgColl.insertOne(data);
		await setResponse(ctx, promise, {
			error: '留言消息回复失败',
			success: '留言消息回复成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'replyMessage', parentKey: 'message'})

}

module.exports = {
	GetMessageList,
	ChangeMsgState,
	RemoveMessage,
	ReplyMessage,
}