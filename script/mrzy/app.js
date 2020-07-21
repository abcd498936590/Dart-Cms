const path = require('path');
const fse = require('fs-extra');
const axios = require('axios');
const iconv = require('iconv-lite');
const { ObjectID } = require('mongodb');
const { MongoClass } = require('../../utils/mongo');
const Entities = require('html-entities').XmlEntities;
const to_json = require('xmljson').to_json;
const entitiesCode = new Entities();
const { mixinsScriptConfig, getBjDate, dateStringify } = require('../../utils/tools')

// 封装一手request方法
async function http(url){
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve(undefined)
		}, 3000);
		axios({
			method: 'GET',
			url: url,
			timeout: 3000,
		})
		.then(res => {
			if(res && res.status === 200){
				resolve(res)
			}else{
				resolve(undefined)
			}
		})
		.catch(err => {
			resolve(undefined)
		})
	})
	.catch(err => {
		console.log(url);
	})
}
// 源管理
let sourceManage = async (sList, videoListColl, pid, config) => {
	// 如果源只有一项
	if(sList['$'] && sList['_']){
		let obj = sList;
		sList = {
			'0': obj
		}
	}
	let map_keys = {
		qq: '腾讯视频',
		qiyi: '爱奇艺',
		youku: '优酷视频',
		mgtv: '芒果TV',
		sohu: '搜狐视频',
		pptv: 'PP视频',
		letv: '乐视视频'
	}
	for(let attr in sList){

		let curItem = sList[attr];
		try{
			var itemName = curItem['$']['flag'];
		}catch(err){
			continue;
		}

		// 如果不是数组中的，那么不要
		if(!map_keys[itemName]){
			continue;
		}

		// 如果没有播放源，略过
		if(!curItem['_']){
			continue;
		}
		let itemSource = curItem['_'].replace(/\$/g, '$' + config.options.analysis.val);

		// 检查z_name是否存在
		let isExist = await videoListColl.findOne({vid: pid, z_name: itemName});
		if(isExist){
			let updateSource = {
			    "list" : itemSource
			}
			await videoListColl.updateOne({vid: pid, z_name: itemName}, {$set: updateSource})
		}else{
			let curSourceLen = await videoListColl.find({vid: pid}).count();
			let sourceInfo = {
			    "index" : curSourceLen + 1,
			    "name" : map_keys[itemName],
			    "z_name" : itemName,
			    "type" : "iframe",
			    "list" : itemSource,
			    "vid" : pid,    // insertResult.insertedId
			}
			await videoListColl.insertOne(sourceInfo);
		}
	}

}
// 每一条数据
let getCurVideoData = async (v_info, conf, videoInfoColl, videoListColl, confColl, otherColl) => {

	let config = confColl.findOne({});
	// 找到数据
	let isExist = await videoInfoColl.findOne({videoTitle: v_info.name.trim()});

	if(isExist){  // 更新

		let updateInfo = {
		    // "videoImage" : v_info.pic,
		    "update_time" : v_info.last,
		    "remind_tip" : v_info.note,
		}
		// 更新信息
		await videoInfoColl.updateOne({_id: isExist._id}, {$set: updateInfo});
		// 源管理
		await sourceManage(v_info.dl.dd, videoListColl, isExist._id, conf);

	}else{  // 新增

		let type_id = await otherColl.findOne({name: v_info.type, type: 'nav_type', display: true});
		if(!type_id){
			return
		}
		let v_dir = (v_info.director && typeof v_info.director === 'string') ? v_info.director.split(/\/|\s|,|·|\s/g) : [];
		let newV_dir = [];
		for(let arg of v_dir){
			let val = arg.trim();
			if(val){
				newV_dir.push(val)
			}
		}
		let v_actor = (v_info.actor && typeof v_info.actor === 'string') ? v_info.actor.split(/\/|\s|,|·|\s/g) : [];
		let newV_actor = [];
		for(let arg of v_actor){
			let val = arg.trim();
			if(val){
				newV_actor.push(val)
			}
		}

		let insertInfo = {
			"videoTitle" : v_info.name.trim(),
		    "director" : newV_dir.join(','),
		    "videoImage" : v_info.pic,
		    "poster" : "",
		    "video_tags" : [],
		    "performer" : newV_actor.join(','),
		    "video_type" : type_id._id,
		    "video_rate" : 0,
		    "update_time" : v_info.last,
		    // "language" : v_info.lang,
		    "language" : "",
		    // "sub_region" : v_info.area,
		    "sub_region" : "",
		    "rel_time" : testYear(v_info.year, config),
		    "introduce" : v_info.des,
		    "remind_tip" : v_info.note,
		    "news_id" : [],
		    "popular" : false,
		    "allow_reply" : false,
		    "openSwiper" : false,
		    "display" : true,
		    "scource_sort" : false
		}

		let insertResult = await videoInfoColl.insertOne(insertInfo)
		if(!insertResult || insertResult.result.ok !== 1){
			return
		}
		// 源管理
		await sourceManage(v_info.dl.dd, videoListColl, insertResult.insertedId, conf);
	}

}
let testYear = (yStr, config) => {
	if(typeof yStr !== 'string'){
		return ''
	}
	if(yStr.length !== 4){
		return ''
	}
	let numYear = Number(yStr);
	let curYear = config.isBjTime ? getBjDate(new Date().getTime()).getFullYear() : new Date().getFullYear();
	let lastYear = 1895;
	if(numYear < lastYear || numYear > curYear){
		return ''
	}
	return yStr
}
let getVideoListData = async (len, conf, videoInfoColl, videoListColl, confColl, otherColl) => {


	for(var i=1; i<=len; i++){

		let bool = true;

		while(bool){

			let body = await http(`${conf.options.domain.val}?ac=videolist&pg=${i}&h=${conf.options.h.val}`);
			if(!body){
				console.log(`列表页无内容，地址：${conf.options.domain.val}?ac=videolist&pg=${i}&h=${conf.options.h.val}`);
				continue;
			}
			let list = await new Promise((res, rej)=>{
				try{
			   		to_json(body.data, function (error, data){
			   			if(error){
			   				return res(false)
			   			}
			   			// 正常
			   			res(data.rss.list.video);
			   		})
				}catch(err){
					res(false)
				}
		   	});
		   	// 是否页面又错误输出，无法解析
		   	if(!list){
		   		continue;
		   	}

			for(let attr in list){
				let item = list[attr];
				await getCurVideoData(item, conf, videoInfoColl, videoListColl, confColl, otherColl);
				console.log(`第 ${i} 页，共 ${len} 页，第 ${Number(attr)+1} 条，名称： ${list[attr].name.trim()}`);
			}
			break;
		}
	}
}
// 导出
let mainFn = async (DB) => {
	// 如果正在运行，直接退出，确保安全
	let curConfPath = path.resolve(__dirname, './config.json');
	let runConf = fse.readJsonSync(curConfPath);
	if(runConf.state){
		process.exit();
	}
	// 箭头函数 与 promise = 狗币
	return new Promise(async (resolve, reject) => {

		let config = runConf;
		// 采集源 首页
		let httpResult = await http(`${config.options.domain.val}?ac=videolist&h=${config.options.h.val}`).catch(err => {
	   		reject(new Error('发生错误，位置：首页'))
	   	});
	   	// 获取总页码
	   	if(!httpResult){
	   		return reject()
	   	}
	   	httpResult = await new Promise((res, rej)=>{
	   		to_json(httpResult.data, function (error, data){
	   			if(error){
	   				return rej()
	   			}
	   			// 正常
	   			res(data.rss.list.$);
	   		})
	   	}).catch(()=>{
	   		process.exit();
	   	})
	   	// 最大采集时间
	   	setTimeout(() => {
	   		reject();
	   	}, config.timeout);
	   	// 正常
	   	let videoInfoColl = DB.collection('video_info');
	   	let videoListColl = DB.collection('video_list');
	   	let otherColl = DB.collection('other');
	   	let confColl = DB.collection('config');

	   	let configData = await confColl.findOne({}); //
		let isBJtime = configData.isBjTime;          //

	   	let maxPage = Number(httpResult.pagecount);

	   	// 开始采集 => 配置中保存当前子进程的pid，用于手动停止
	   	// 开始采集 => 保存当前运行脚本时间
	   	// 开始采集 => 脚本状态设置为已启动
	   	mixinsScriptConfig('mrzy', {state: true, pid: process.pid, runTime: dateStringify(isBJtime)});
	   	await getVideoListData(maxPage, config, videoInfoColl, videoListColl, confColl, otherColl);
	   	console.log('采集完成！');

		resolve();
	}).then(res => {
		// 把采集状态 改成 停止
		mixinsScriptConfig('mrzy', {state: false});
		// 停止
		process.exit();
	}).catch(err => {
		console.log(err);
		// 把采集状态 改成 停止
		mixinsScriptConfig('mrzy', {state: false});
		// 停止
		process.exit();
	})
}
// mainFn();
MongoClass(mainFn)