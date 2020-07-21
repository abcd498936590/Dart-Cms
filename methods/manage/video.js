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



// 视频列表
let GetVideoList = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let videoColl = getDB().collection('video_info');
		let { page=1, limit=10, search=false, sort={update_time: -1} } = ctx.request.body;    // query get

		limit = limit > 100 ? 100 : limit;

		let promise = (async () => {
			let queryJson = (search && search.trim()) ? { videoTitle: { $regex: search, $options: "$i" } } : {};
			// let cursor = videoColl.find(queryJson);
			var cursor = videoColl.aggregate([
				{
			        $match: queryJson
			    },
			    {
					$sort: sort
				},
				{
					$skip: (--page) * limit
				},
				{
					$limit: limit
				},
			    {
			        $lookup: {
			            from: "other",                   // 关联的表 名称
			            localField: "video_type",        // 当前表的字段 需要关联到目标表
			            foreignField: "_id",             // 目标表和当前表字段对应的字段
			            as: "type"                       // 输出的字段
			        }
			    },
				{
					$unwind: "$type"
				},
				{
					$project: {
						_id: 1,
						videoTitle: 1,
						director: 1,
						videoImage: 1,
						poster: 1,
						video_tags: 1,
						performer: 1,
						video_type: 1,
						video_rate: 1,
						update_time: 1,
						language: 1,
						sub_region: 1,
						rel_time: 1,
						introduce: 1,
						remind_tip: 1,
						news_id: 1,
						popular: 1,
						allow_reply: 1,
						openSwiper: 1,
						display: 1,
						scource_sort: 1,
						video_type: '$type.name'
					}
				}
			]);
			return {
				limit: limit,
				result: await cursor.toArray(),
				// result: await cursor.sort({_id: -1}).skip((--page) * limit).limit(limit).toArray(),
				total: await videoColl.find(queryJson).count()
			}
		})();
		promise.catch((err) => {
			console.log(err);
		})
		await setResponse(ctx, promise, {
			error: '视频列表获取失败',
			success: '视频列表获取成功'
		})

	}, {admin: true}, {insRole: false})

}
// 获取单条视频的全部信息
let GetCurVideoInfo = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let videoInfoColl = getDB().collection('video_info');
		let { _id } = ctx.request.body;

		if(_id && _id.length === 24){
			_id = new ObjectID(_id);
			var promise = videoInfoColl.aggregate([
				{
			        $match: {
			            _id
			        }
			    },
			    {
			        $lookup: {
			            from: "video_list",       // 关联的表 名称
			            localField: "_id",        // 当前表的字段 需要关联到目标表
			            foreignField: "vid",      // 目标表和当前表字段对应的字段
			            as: "source"              // 输出的字段
			        }
			    }
			]).toArray();
		}else{
			var promise = Promise.reject();
		}
		await setResponse(ctx, promise, {
			error: '视频信息获取失败',
			success: '视频信息获取成功'
		})

	}, {admin: true}, {insRole: false})

}
// 删除视频
let VideosRemove = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let videoInfoColl = getDB().collection('video_info');
		let videoListColl = getDB().collection('video_list');
		let msgColl = getDB().collection('message');
		let { list=[] } = ctx.request.body;  // body post

		let _id_arr = makeArrObjectID(list);         // 视频数组_id

		let p1 = videoInfoColl.deleteMany({_id: {$in: _id_arr}});  // 视频主信息
		let p2 = videoListColl.deleteMany({vid: {$in: _id_arr}});  // 视频所属 => 播放列表
		let p3 = msgColl.deleteMany({vid: {$in: _id_arr}});        // 视频所属 => 留言信息

		let promise = Promise.all([p1, p2, p3]);
		await setResponse(ctx, promise, {
			error: '视频删除失败',
			success: '视频删除成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'removeVideo', parentKey: 'video'})
}
// 修改视频信息
let ChangeState = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let videoColl = getDB().collection('video_info');

		let { list, info={} } = ctx.request.body;
		let _id_arr = makeArrObjectID(list);
		let promise = videoColl.updateMany({_id: {$in: _id_arr}}, {$set: info});
		await setResponse(ctx, promise, {
			error: '信息修改失败',
			success: '信息修改成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'updateVideo', parentKey: 'video'})

}
// 获取当前视频的播放源列表
let GetCurVideoList = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let videoListColl = getDB().collection('video_list');
		let curVideoPlayId = ctx.request.body._id;
		let _id = new ObjectID(curVideoPlayId);

		let promise = videoListColl.find({vid: _id}).sort({index: 1}).toArray();
		await setResponse(ctx, promise, {
			error: '当前视频播放源获取失败',
			success: '当前视频播放源获取成功'
		})

	}, {admin: true}, {insRole: false})

}
// 新建视频
let AddVideo = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let videoInfoColl = getDB().collection('video_info');
		let videoListColl = getDB().collection('video_list');

		let { info, source=[] } = ctx.request.body;
		// 分类
		info["video_type"] = new ObjectID(info["video_type"]);
		// 关联文章
		let ns = info.news_id;
		for(let i=0; i<ns.length; i++){
			ns[i] = new ObjectID(ns[i]);
		}

		let videoResult = await videoInfoColl.insertOne(info);

		if(videoResult.result.ok === 1){
			let vid = videoResult.insertedId;

			if(source.length){
				for(let arg of source){
					arg["vid"] = vid;
				}
				var promise = videoListColl.insertMany(source);
			}else{
				var promise = Promise.resolve();
			}
		}else{
			var promise = Promise.reject();
		}
		await setResponse(ctx, promise, {
			error: '新建视频信息失败',
			success: '新建视频信息成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'addVideo', parentKey: 'video'})

}
// 更新视频
let UpdateCurVideo = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let videoInfoColl = getDB().collection('video_info');
		let videoListColl = getDB().collection('video_list');

		let { info, _id, source=[] } = ctx.request.body;
		// 当前id
		let vid = new ObjectID(_id);
		Reflect.deleteProperty(info, '_id');
		// 分类
		info["video_type"] = new ObjectID(info["video_type"]);
		// 关联文章
		let ns = info.news_id;
		for(let i=0; i<ns.length; i++){
			ns[i] = new ObjectID(ns[i]);
		}

		let queue = [],
		promise;

		let p1 = videoInfoColl.updateOne({_id: vid}, {$set: info});
		// 删掉之前的全部源，更新到最新的全部插入
		let p2 = videoListColl.deleteMany({vid});

		for(let arg of source){
			arg['vid'] = vid;
			Reflect.deleteProperty(arg, '_id');
		}

		queue.push(p1, p2);

		let result = await Promise.all(queue);
		promise = videoListColl.insertMany(source);

		await setResponse(ctx, promise, {
			error: '视频信息更新失败',
			success: '视频信息更新成功'
		})

	}, {admin: true}, {insRole: true, childrenKey: 'updateVideo', parentKey: 'video'})

}
// 给视频添加源
let AddScource = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let videoListColl = getDB().collection('video_list');

		let info = ctx.request.body;
		Reflect.deleteProperty(info, '_id');
		Reflect.deleteProperty(info, 'index');
		info["vid"] = new ObjectID(info.vid);

		// 拿到当前源列表的最后一项的 index + 1
		let sourceList = await videoListColl.find({vid: info['vid']}).sort({index: 1}).toArray();

		if(sourceList.length){
			let index = sourceList[sourceList.length-1].index + 1;
			info['index'] = index;
		}else{
			info['index'] = 0;
		}
		// 保证key的位置的一致性
		let data = {
		    "index" : info['index'],
		    "name" : info['name'],
		    "z_name" : info['z_name'],
		    "type" : info['type'],
		    "list" : info['list'],
		    "vid" : info['vid'],
		}
		let promise = videoListColl.insertOne(data);
		await setResponse(ctx, promise, {
			error: '视频播放源添加失败',
			success: '视频播放源添加成功'
		})

	}, {admin: true}, {admin: true}, {insRole: true, childrenKey: 'updateVideo', parentKey: 'video'})

}
// 修改视频的源信息
let UpdateScource = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let videoListColl = getDB().collection('video_list');
		let info = ctx.request.body
		let _id = new ObjectID(info._id);
		Reflect.deleteProperty(info, '_id');
		Reflect.deleteProperty(info, 'vid');
		Reflect.deleteProperty(info, 'z_name');
		Reflect.deleteProperty(info, 'is_script');

		var promise = videoListColl.updateOne({_id}, {$set: info});
		await setResponse(ctx, promise, {
			error: '视频播放源修改失败',
			success: '视频播放源修改成功'
		})

	}, {admin: true}, {admin: true}, {insRole: true, childrenKey: 'updateVideo', parentKey: 'video'})

}
// 给视频源排序
let ScourceSort = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let videoListColl = getDB().collection('video_list');
		let { list=[] } = ctx.request.body;
		let arr = [];

		for(let arg of list){
			arr.push(
				videoListColl.updateOne({_id: new ObjectID(arg._id)}, {$set: {index: arg.index}})
			)
		}
		let promise = Promise.all(arr);
		await setResponse(ctx, promise, {
			error: '视频播放源修改失败',
			success: '视频播放源修改成功'
		})

	}, {admin: true}, {admin: true}, {insRole: true, childrenKey: 'updateVideo', parentKey: 'video'})

}
// 给视频删除源
let RemoveScource = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let videoListColl = getDB().collection('video_list');
		let curPlayId = ctx.request.body._id;   // 当前视频源id
		let _id = new ObjectID(curPlayId);

		let promise = videoListColl.deleteOne({_id})
		await setResponse(ctx, promise, {
			error: '视频播放源删除失败',
			success: '视频播放源删除成功'
		})

	}, {admin: true}, {admin: true}, {insRole: true, childrenKey: 'updateVideo', parentKey: 'video'})

}
// 遍历所有的封面
let DirCoverImgs = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let videoColl = getDB().collection('video_info');

		let promise = dirCatImgs(videoColl, 'upload', 'cover', 'videoImage');
		await setResponse(ctx, promise, {
			error: '封面图片列表获取失败',
			success: '封面图片列表获取成功'
		})

	}, {admin: true}, {insRole: false})

}
// 遍历所有的海报
let DirPosterImgs = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let videoColl = getDB().collection('video_info');

		let promise = dirCatImgs(videoColl, 'upload', 'poster', 'poster');
		await setResponse(ctx, promise, {
			error: '海报图片列表获取失败',
			success: '海报图片列表获取成功'
		})

	}, {admin: true}, {insRole: false})

}
// 上传 封面 海报
let UploadImages = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let file = ctx.request.files.file; // 获取上传文件
		let { catName } = ctx.request.body;
		let promise = placeUploadImg(catName, file);

		await setResponse(ctx, promise, {
			error: "图片上传失败",
			success: "图片上传成功"
		});

	}, {admin: true}, {admin: true}, {insRole: true, childrenKey: ['addVideo', 'updateVideo'], parentKey: 'video'})

}
// 删除 封面 海报 图片
let RemoveImages = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let { fileName, catName } = ctx.request.body;
		let filePath = path.resolve(__dirname, `../../static/upload/${catName}`, fileName);
		let promise = fse.remove(filePath);

		await setResponse(ctx, promise, {
			error: "图片删除失败",
			success: "图片删除成功"
		});

	}, {admin: true}, {admin: true}, {insRole: true, childrenKey: ['addVideo', 'updateVideo'], parentKey: 'video'})

}


module.exports = {
	RemoveImages,
	UploadImages,
	DirPosterImgs,
	DirCoverImgs,
	RemoveScource,
	ScourceSort,
	UpdateScource,
	AddScource,
	UpdateCurVideo,
	AddVideo,
	GetCurVideoList,
	ChangeState,
	VideosRemove,
	GetCurVideoInfo,
	GetVideoList,
}