const { ObjectID } = require('mongodb');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');

const getDB = require('../utils/baseConnect');
const { setResponse, makeArrObjectID, mixinsScriptConfig, encryption, createTokenID, getBjDate, dirCatImgs, placeUploadImg } = require('../utils/tools');


let createNavType = (nav, navId) => {
	let arr = [{_id: '0', name: '首页', active: navId === '0' ? true : false, link: '/' }];
	let main_id = '';
	for(let arg of nav){
		let bool = navId === arg._id.toString();
		// 视频分类 或者 文章分类
		let frontName = (arg.nav_type === 'video') ? '/video-type/' : '/article-type/';
		arr.push({
			_id: arg._id,
			name: arg.name,
			active: bool ? true : false,
			link: `${frontName}${arg._id}.html`
		})
		if(bool){
			main_id = arg._id;
		}
	}
	return {arr, main_id}
}
// 视频详情页
let getVideoDetill = async (config, ctx, next, filter=false) => {

	let videoInfoColl = getDB().collection('video_info');
	let videoListColl = getDB().collection('video_list');
	let artInfoColl = getDB().collection('article_info');
	let otherColl = getDB().collection('other');

	let vid = ctx.params.vid;
	// id长度不符合规范
	if(vid.length !== 24){
		return false;
	}
	vid = new ObjectID(vid);
	// 没有该内容
	let curVideoInfo = await videoInfoColl.findOne({_id: vid, display: true});
	if(curVideoInfo === null){
		return false;
	}

	// 全部分类
	let allNav = await otherColl.find({type: 'nav_type', parent_id: false, display: true}).sort({index: 1}).toArray();
	// 源列表
	let sourceQuery = {vid};
	if(filter){
		sourceQuery['type'] = 'player';
	}
	let sourceList = await videoListColl.find(sourceQuery).sort({index: 1}).toArray();
	for(let arg of sourceList){
		arg.list = arg.list.split('#');
	}
	// 当前视频的分类 ID
	let curNavId = curVideoInfo['video_type'];
	// 视频信息
	let curNavType = await otherColl.findOne({type: 'nav_type', _id: curNavId});
	let curNavTop = curNavType.parent_id ? await otherColl.findOne({type: 'nav_type', _id: curNavType.parent_id}) : curNavType;
	curVideoInfo['video_type'] = {
		_id: curNavType._id,
		name: curNavType.name,
	};
	let lastInfoStr = `本视频《${curVideoInfo.videoTitle}》由${config.websiteName}${ctx.request.host}收集至网络发布。`
	curVideoInfo['introduce'] = curVideoInfo['introduce'] ? (curNavTop.name + '《' + curVideoInfo.videoTitle + '》是由' + curVideoInfo.performer.split(',').join('/') + '等主演的' + curNavTop.name + '。该剧讲述了' + curVideoInfo['introduce'] + lastInfoStr) : '暂无内容描述。';
	// 返回第一层nav id
	let searchNavId = !curNavType.parent_id ? curNavType._id.toString() : curNavType.parent_id.toString();

	let createNavResult = createNavType(allNav, searchNavId);
	let navData = createNavResult.arr;
	let curMainTypeId = createNavResult.main_id;
	// 当前分类的上一级主分类的全部子分类
	let curMainTypeChild = await otherColl.find({type: 'nav_type', parent_id: curMainTypeId, display: true}).toArray();
	let queryList = [curMainTypeId]
	for(let arg of curMainTypeChild){
		queryList.push(arg._id)
	}

	let popMovie = await videoInfoColl.find({display: true}).sort({rel_time: -1, video_rate: -1}).limit(10).toArray();
	let newMovie = await videoInfoColl.find({display: true}).sort({rel_time: -1, update_time: -1}).limit(10).toArray();
	let likeMovie = await videoInfoColl.find({display: true, video_type:  {$in: [curNavId]}, _id: {$nin: [vid]}}).sort({rel_time: -1, video_rate: -1}).limit(12).toArray();
	// let articleRel = await artInfoColl.find({_id: {$in: curVideoInfo.news_id}}).toArray();
	let articleRel = await artInfoColl.aggregate(
		[
			{
		        $match: {
		        	_id: {
		        		$in: curVideoInfo.news_id
		        	}
		        }
		    },
		    {
		    	$limit: 10
		    },
		    {
		        $lookup: {
		            from: "other",                   // 关联的表 名称
		            localField: "article_type",      // 当前表的字段 需要关联到目标表
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
					"articleTitle" : 1,
				    "articleImage" : 1,
				    "poster" : 1,
				    "article_type" : '$type.name',
				    "introduce" : 1,
				    "update_time" : 1,
				    "popular" : 1,
				    "allow_reply" : 1,
				    "openSwiper" : 1,
				    "display" : 1
				}
			}
		]
	).toArray();

	let data = {
		meta: {
			title: `${curVideoInfo.videoTitle} - ${curNavType.seo.title} - ${config.websiteName}`,
			keywords: curNavType.seo.keywords,
			description: curVideoInfo.introduce,
			hostName: ctx.protocols + '://' + ctx.host,
		},
		mealList: await otherColl.find({type: 'advert', shape: 'web'}).toArray(),
		footer: config.footerInfo.replace(/\n/, '<br />'),
		videoInfo: curVideoInfo,
		source: sourceList,
		nav: navData,
		isLogin: JSON.stringify(ctx.session1) !== '{}' ? true : false,
		allowReply: (!config.allowReply || !curVideoInfo.allow_reply) ? false : true,
		list: {
			popMovie: popMovie,
			newMovie: newMovie,
			likeMovie: likeMovie,
			articleRel: articleRel
		},
		publicCode: config.publicCode,
	}
	return data
}
// 分类数据
let getTypesData = async (config, ctx) => {

	let videoInfoColl = getDB().collection('video_info');
	let otherColl = getDB().collection('other');

	let { pid=false, cid=false, sub_region=false, rel_time=false, language=false, page=1, sort='_id' } = ctx.query;

	// init default param
	// page = /^[1-9]{1}[0-9]*$/.test(page) ? Number(page) : 1;
	page = Number(page);
	page = !page || page < 1 || page === Infinity ? 1 : page;
	pid = (pid === '' || pid.length !== 24) ? false : new ObjectID(pid);
	cid = (cid === '' || cid.length !== 24) ? false : new ObjectID(cid);
	language = (language === '') ? false : language;
	rel_time = (rel_time === '') ? false : rel_time;
	sub_region = (sub_region === '') ? false : sub_region;

	// init query search
	let query = {
		display: true
	}
	let existPid = false,
	existCid = false;

	// 子分类
	if(cid){
		let existCurNav = await otherColl.findOne({_id: cid, display: true, type: 'nav_type'});
		// 当前子分类存在，查询条件是当前子分类
		if(existCurNav){
			query['video_type'] = existCurNav._id;
			// 找到cid对应的
			existCid = existCurNav;
		}
	}
	// 导航
	if(pid){
		let existCurNav = await otherColl.findOne({_id: pid, display: true, type: 'nav_type'});
		if(existCurNav){
			let filterId = function(arr2){
				let arr = [];
				for(let arg of arr2){
					arr.push(arg._id)
				}
				return arr
			}
			// cid纠错，如果pid找到了，但是cid也找到了，cid不是pid下属的分类，那么就cid作废，找当前pid下的全部
			if(cid){
				let twoType = await otherColl.findOne({display: true, type: 'nav_type', _id: existCid._id});
				if(twoType.parent_id.toString() !== existCurNav._id.toString()){
					cid = false;
					existCid = false;
				}
			}
			// 子分类不存在，父导航存在
			if(!cid && existCurNav){
				let curChildrenNav = await otherColl.find({parent_id: existCurNav._id, display: true, type: 'nav_type'}).toArray();
				let arrId = curChildrenNav.length ? filterId(curChildrenNav).concat(existCurNav._id) : [existCurNav._id];
				query['video_type'] = {
					$in: arrId
				}
			}
			// 找到pid对应的
			existPid = existCurNav;
		}
	}
	// 看下 年代，时间，语言 对不对
	if(existCid || existPid){
		//
		let queryType = {};
		// 导航存在，子分类不存在。找到当前导航下所有的子分类
		if(existPid && !existCid){
			let arr = [existPid._id]
			let childrenType = await otherColl.find({type: 'nav_type', display: true, parent_id: existPid._id}).toArray();
			for(let arg of childrenType){
				arr.push(arg._id)
			}
			queryType = {
				$in: arr
			}
		}
		// 子分类存在，或者主导航和子分类都存在
		if(existCid){
			queryType = existCid._id;
		}
		// 找下传过来的年代是否有
		if(rel_time){
			let rel_time_items = await videoInfoColl.find({rel_time: {$in: [rel_time]}, video_type: queryType, display: true}).toArray();
			rel_time = rel_time_items.length ? rel_time : false;
		}
		// 找下传过来的地区是否有
		if(sub_region){
			let sub_region_items = await videoInfoColl.find({sub_region: {$in: [sub_region]}, video_type: queryType, display: true}).toArray();
			sub_region = sub_region_items.length ? sub_region : false;
		}
		// 找下传过来的语言是否有
		if(language){
			let language_items = await videoInfoColl.find({language: {$in: [language]}, video_type: queryType, display: true}).toArray();
			language = language_items.length ? language : false;
		}
	}

	// 发布地区
	if(sub_region){
		query['sub_region'] = sub_region;
	}
	// 上映时间
	if(rel_time){
		query['rel_time'] = rel_time;
	}
	// 语言
	if(language){
		query['language'] = language;
	}

	// 当前的查询条件
	let curQueryList = await (async () => {
		let cursor = videoInfoColl.find(query);
		let sortData = {
			rel_time: -1
		};
		if(sort === '_id'){
			sortData['update_time'] = 1;
		}else if(sort === 'rate'){
			sortData['video_rate'] = -1;
		}
		let total = await cursor.count();
		let newPage = page;
		// 修正参数，总数小于一页，page=1
		if(total <= 36){
			newPage = 1;
		}
		// 修正参数，总数大于最后一页，page=last
		let maxPage = Math.ceil(total / 36) || 1;
		if(page > maxPage){
			newPage = maxPage;
		}
		return {
			page: newPage,
			total: total,
			list: await cursor.sort(sortData).skip((newPage - 1) * 36).limit(36).toArray()
		}
	})();


	let allTypeItem = await (async () => {
		// 找到需要高亮的那个
		let activeListResult = (arr, key, val) => {
			for(let arg of arr){
				if(key && arg[key].toString() === val.toString()){
					arg.active = true;
					break;
				}
			}
			return arr
		}
		// 生成查询条件
		let queryCood = await (async () => {
			let q = {
				display: true
			};
			// 子分类 存在
			if(existCid){
				q['video_type'] = existCid._id;
				return q
			}
			// 父分类 存在
			if(existPid){
				let inArr = [existPid._id]
				let curChildrenNavs = await otherColl.find({parent_id: existPid._id, display: true, type: 'nav_type'}).toArray();
				for(let arg of curChildrenNavs){
					inArr.push(arg._id)
				}
				q['video_type'] = {
					$in: inArr
				}
			}
			return q
		})();
		// 生成多key新对象
		let createNewObj = (arr) => {
			let nArr = [];
			for(let arg of arr){
				if(!arg){
					continue;
				}
				nArr.push({
					_id: arg,
					name: arg
				})
			}
			return nArr
		}

		// 全部导航
		let nav_list = await otherColl.find({display: true, parent_id: false, type: 'nav_type'}).toArray();
		// 当前导航下的子分类
		let type_list = existPid ? await otherColl.find({display: true, parent_id: existPid._id, type: 'nav_type'}).toArray() : await otherColl.find({display: true, parent_id: {$type: 7}, type: 'nav_type'}).toArray();
		// 上映时间
		let rel_time_list = await videoInfoColl.aggregate([
			{
				$match: queryCood
			},
			{
		        $group: {
		            _id: "rel_time",
		            list: {$addToSet: "$rel_time"}
		        }
		    }
		]).toArray();
		rel_time_list = rel_time_list.length ? createNewObj(rel_time_list[0].list) : [];
		// 发行地区
		let sub_region_list = await videoInfoColl.aggregate([
			{
				$match: queryCood
			},
		    {
		        $group: {
		            _id: "sub_region",
		            list: {$addToSet: "$sub_region"}
		        }
		    }
		]).toArray();
		sub_region_list = sub_region_list.length ? createNewObj(sub_region_list[0].list) : [];
		// 语言
		let language_list = await videoInfoColl.aggregate([
			{
				$match: queryCood
			},
		    {
		        $group: {
		            _id: "language",
		            list: {$addToSet: "$language"}
		        }
		    }
		]).toArray();
		language_list = language_list.length ? createNewObj(language_list[0].list) : [];
		// 结果
		let returnResult = {
			nav: {
				label: '导航',
				list: existPid ? [{name: '全部', _id: false}].concat(activeListResult(nav_list, '_id', existPid._id)) : [{name: '全部', _id: false, active: true}].concat(nav_list)
			},
			type: {
				label: '分类',
				list: existCid ? [{name: '全部', _id: false}].concat(activeListResult(type_list, '_id', existCid._id)) : [{name: '全部', _id: false, active: true}].concat(type_list)
			},
			region: {
				label: '地区',
				list: sub_region ? [{name: '全部', _id: false}].concat(activeListResult(sub_region_list, '_id', sub_region)) : [{name: '全部', _id: false, active: true}].concat(sub_region_list)
			},
			years: {
				label: '年代',
				list: rel_time ? [{name: '全部', _id: false}].concat(activeListResult(rel_time_list, '_id', rel_time)) : [{name: '全部', _id: false, active: true}].concat(rel_time_list)
			},
			language: {
				label: '语言',
				list: language ? [{name: '全部', _id: false}].concat(activeListResult(language_list, '_id', language)) : [{name: '全部', _id: false, active: true}].concat(language_list)
			}
		}
		return returnResult
	})();

	// 全部分类
	let allNav = await otherColl.find({type: 'nav_type', parent_id: false, display: true}).sort({index: 1}).toArray();
	let createNavResult = createNavType(allNav, '0');
	let navData = createNavResult.arr;

	let data = {
		meta: {
			title: config.websiteName,
			keywords: config.keywords,
			description: config.description,
			hostName: ctx.protocols + '://' + ctx.host,
		},
		mealList: await otherColl.find({type: 'advert', shape: 'web'}).toArray(),
		footer: config.footerInfo.replace(/\n/, '<br />'),
		nav: navData,
		isLogin: JSON.stringify(ctx.session1) !== '{}' ? true : false,
		allTypeItem: allTypeItem,
		curQueryList: curQueryList,
		publicCode: config.publicCode,
	}
	return data
}
// 搜索数据
let getSearchData = async (config, ctx) => {

	let videoInfoColl = getDB().collection('video_info');
	let otherColl = getDB().collection('other');

	let { name=false, page=1 } = ctx.query;
	name = name ? name.trim() : "";
	page = Number(page);
	page = !page || page < 1 || page === Infinity ? 1 : page;

	// 全部分类
	let allNav = await otherColl.find({type: 'nav_type', parent_id: false, display: true}).sort({index: 1}).toArray();
	let createNavResult = createNavType(allNav, '0');
	let navData = createNavResult.arr;

	let searchVideoList = await videoInfoColl.aggregate([
		{
	        $match: {
	        	display: true,
	        	videoTitle: {
	        		$regex: name,
	        		$options: "$i"
        		}
	        }
	    },
	    {
			$sort: {
				rel_time: -1,
				video_rate: -1
			}
		},
		{
			$skip: (page - 1) * 10
		},
		{
			$limit: 10
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
				popular: 1,
				allow_reply: 1,
				display: 1,
				scource_sort: 1,
				video_type: {
					_id: '$type._id',
					name: '$type.name'
				}
			}
		}
	]).toArray();

	let data = {
		meta: {
			title: config.websiteName,
			keywords: config.keywords,
			description: config.description,
			hostName: ctx.protocols + '://' + ctx.host,
		},
		mealList: await otherColl.find({type: 'advert', shape: 'web'}).toArray(),
		isLogin: JSON.stringify(ctx.session1) !== '{}' ? true : false,
		footer: config.footerInfo.replace(/\n/, '<br />'),
		nav: navData,
		searchName: name || '',
		searchResult: {
			page: page,
			total: await videoInfoColl.find({display: true, videoTitle: eval("/" + name +"/i")}).count(),
			list: searchVideoList
		},
		publicCode: config.publicCode,
	}
	return data
}
// 单个分类数据
let getCurNavData = async (config, ctx, next) => {

	let videoInfoColl = getDB().collection('video_info');
	let otherColl = getDB().collection('other');

	let isSwiperLen = 0;
	if(config.openSwiper){
		isSwiperLen = await videoInfoColl.find({openSwiper: true, display: true}).count();
	}

	let nid = ctx.params.nid;
	let newNid = new ObjectID(nid);

	let curNavExist = (nid && nid.length === 24) ? await otherColl.findOne({_id: newNid, type: "nav_type", nav_type: 'video', parent_id: false, display: true}) : false;
	if(!curNavExist){
		return false
	}

	let allNav = await otherColl.find({type: 'nav_type', parent_id: false, display: true}).sort({index: 1}).toArray();
	let createNavResult = createNavType(allNav, nid);
	let navData = createNavResult.arr;

	let tabList = [];
	let childrenType = await otherColl.find({parent_id: newNid, display: true, type: "nav_type", nav_type: 'video'}).toArray();
	let qArr = [];
	for(let arg of childrenType){
		qArr.push(arg._id);
	}
	let noChildVideo = childrenType.length ? await videoInfoColl.find({video_type: {$in: qArr}}).count() : false;
	if(!childrenType.length || !noChildVideo){

		// 置顶数据 + 普通数据
		let topCurNavList = await videoInfoColl.find({popular: true, display: true, video_type: newNid}).sort({rel_time: -1, video_rate: -1, update_time: -1}).limit(36).toArray();
		let spacing = 36 - topCurNavList.length;
		let curNavList = (spacing !== 0) ? await videoInfoColl.find({popular: false, display: true, video_type: newNid}).sort({rel_time: -1, video_rate: -1, update_time: -1}).limit(spacing).toArray() : [];

		tabList.push({
			_id: curNavExist._id,
			name: curNavExist.name,
			parent_id: nid,
			seo: curNavExist.seo,
			list: topCurNavList.concat(curNavList)
		})
	}else{
		for(let arg of childrenType){
			// let list = await videoInfoColl.find({video_type: arg._id}).sort({rel_time: -1, video_rate: -1, update_time: -1}).limit(12).toArray();

			let topCurNavList = await videoInfoColl.find({popular: true, display: true, video_type: arg._id}).sort({rel_time: -1, video_rate: -1, update_time: -1}).limit(12).toArray();
			let spacing = 12 - topCurNavList.length;
			let curNavList = (spacing !== 0) ? await videoInfoColl.find({popular: false, display: true, video_type: arg._id}).sort({rel_time: -1, video_rate: -1, update_time: -1}).limit(spacing).toArray() : [];
			let list = topCurNavList.concat(curNavList);

			if(list.length){
				tabList.push({
					_id: arg._id,
					name: arg.name,
					parent_id: nid,
					seo: arg.seo,
					list: list
				})
			}
		}
	}
	let allChild = qArr.concat(newNid);
	let data = {
		meta: {
			title: `${curNavExist.name} - ${config.websiteName}`,
			keywords: `${curNavExist.seo.keywords}`,
			description: `${curNavExist.seo.description}`,
			hostName: ctx.protocols + '://' + ctx.host,
		},
		mealList: await otherColl.find({type: 'advert', shape: 'web'}).toArray(),
		isLogin: JSON.stringify(ctx.session1) !== '{}' ? true : false,
		isOpenSwiper: !!isSwiperLen,
		swiperList: (!!isSwiperLen) ? await videoInfoColl.find({display: true, openSwiper: true, video_type: {$in: allChild}}).sort({rel_time: -1, video_rate: -1, update_time: -1}).toArray() : [],
		footer: config.footerInfo.replace(/\n/, '<br />'),
		nav: navData,
		tabList: tabList,
		publicCode: config.publicCode,
	}
	return data
}
// 对文章的子分类进行选择
let setArtChildNav = (child, aId) => {
	for(let arg of child){
		if(arg._id.toString() === aId){
			arg.active = true;
		}
	}
	return child
}
// 单个文章分类
let getCurArtData = async (config, ctx, next) => {

	let artInfoColl = getDB().collection('article_info');
	let videoInfoColl = getDB().collection('video_info');
	let otherColl = getDB().collection('other');

	let { page=1 } = ctx.query;

	page = Number(page);
	page = !page || page < 1 || page === Infinity ? 1 : page;

	let isSwiperLen = 0;
	if(config.openSwiper){
		isSwiperLen = await artInfoColl.find({openSwiper: true, display: true}).count();
	}

	let aid = ctx.params.aid;
	let newNid = new ObjectID(aid);

	let curNavExist = (aid && aid.length === 24) ? await otherColl.findOne({_id: newNid, type: "nav_type", nav_type: 'article', display: true}) : false;
	if(!curNavExist){
		return false
	}

	// 判断是否是文章分类的 一级分类，或者二级分类
	let top_parent_id = curNavExist.parent_id ? curNavExist.parent_id : newNid;

	// 全部导航
	let allNav = await otherColl.find({type: 'nav_type', parent_id: false, display: true}).sort({index: 1}).toArray();
	let createNavResult = createNavType(allNav, top_parent_id.toString());
	let navData = createNavResult.arr;

	let childrenType = await otherColl.find({parent_id: newNid, display: true, type: "nav_type", nav_type: 'article'}).toArray();
	// 当前主分类
	let qArr = [curNavExist._id];
	for(let arg of childrenType){
		qArr.push(arg._id);
	}
	let videoList = await videoInfoColl.find({display: true}).sort({update_time: -1}).limit(10).toArray();
	let articleList = await artInfoColl.find({display: true}).sort({update_time: -1}).limit(10).toArray();
	// let tabList = await artInfoColl.find({display: true, openSwiper: false, article_type: {$in: qArr}}).skip((page ? page-1 : 0) * 10).limit(10).toArray();
	// let popularList = await artInfoColl.find({display: true, openSwiper: true, article_type: {$in: qArr}}).skip((page ? page-1 : 0) * 10).limit(10).toArray();
	let getPipeline = (openSwiper) => {
		return [
			{
		        $match: {
		        	display: true,
		        	openSwiper: openSwiper,
		        	article_type: {
		        		$in: qArr
		        	}
		        }
		    },
		    {
		    	$sort: {
		    		_id: -1
		    	}
		    },
		    {
		    	$skip: (page ? page-1 : 0) * 10
		    },
		    {
		    	$limit: 10
		    },
		    {
		        $lookup: {
		            from: "other",                   // 关联的表 名称
		            localField: "article_type",        // 当前表的字段 需要关联到目标表
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
					"articleTitle" : 1,
				    "articleImage" : 1,
				    "poster" : 1,
				    "article_type" : '$type.name',
				    "introduce" : 1,
				    "update_time" : 1,
				    "popular" : 1,
				    "allow_reply" : 1,
				    "openSwiper" : 1,
				    "display" : 1
				}
			}
		]
	}
	let yesSwiperPipe = getPipeline(true);
	let noSwiperPipe = getPipeline(false);
	let tabList = await artInfoColl.aggregate(yesSwiperPipe).toArray();
	let popularList = await artInfoColl.aggregate(noSwiperPipe).toArray();
	let allTabList = popularList.concat(tabList);

	// 当前主分类所属的所有子分类
	let allChildren = await otherColl.find({parent_id: top_parent_id, display: true, type: "nav_type", nav_type: 'article'}).toArray();
	let isParentEl = curNavExist.parent_id ? await otherColl.findOne({_id: curNavExist.parent_id}) : false;
	// 全部当前分类下的子分类+当前主分类
	let allCurTypeNav = !curNavExist.parent_id ? [curNavExist].concat(allChildren) : [isParentEl].concat(allChildren);

	let data = {
		meta: {
			title: `${curNavExist.name} - ${config.websiteName}`,
			keywords: `${curNavExist.seo.keywords}`,
			description: `${curNavExist.seo.description}`,
			hostName: ctx.protocols + '://' + ctx.host,
		},
		mealList: await otherColl.find({type: 'advert', shape: 'web'}).toArray(),
		isLogin: JSON.stringify(ctx.session1) !== '{}' ? true : false,
		isOpenSwiper: !!isSwiperLen,
		swiperList: (!!isSwiperLen) ? await artListResult.find({display: true, openSwiper: true, article_type: {$in: qArr}}).sort({update_time: -1}).toArray() : [],
		footer: config.footerInfo.replace(/\n/, '<br />'),
		childNav: setArtChildNav(allCurTypeNav, aid),
		nav: navData,
		curType: curNavExist,
		articleResult: {
			list: allTabList,
			total: await artInfoColl.find({display: true}).count(),
			page: page
		},
		videoTop: videoList,
		articleTop: articleList,
		publicCode: config.publicCode,
	}
	return data
}
// 获取单个文章详细信息
let getCurArtInfo = async (config, ctx, next) => {

	let artInfoColl = getDB().collection('article_info');
	let artListColl = getDB().collection('article_list');
	let videoInfoColl = getDB().collection('video_info');
	let otherColl = getDB().collection('other');

	let aid = ctx.params.aid;
	let newAid = new ObjectID(aid)

	let curArtExist = (aid && aid.length === 24) ? await artInfoColl.findOne({_id: newAid, display: true}) : false;
	if(!curArtExist){
		return false
	}

	// 判断是否是文章分类的 一级分类，或者二级分类
	let curArtType = await otherColl.findOne({_id: curArtExist.article_type});

	// 改字段，当前文章的type关联找到的type
	curArtExist.article_type = curArtType.name;

	// 改字段，关联文章正文
	let artConResult = await artListColl.findOne({aid: newAid});
	curArtExist.content = artConResult ? artConResult.text : '暂无内容';

	// 找到当前文章所属的顶级导航分类
	let top_parent_id = curArtType.parent_id ? curArtType.parent_id : curArtType._id;

	// 全部导航
	let allNav = await otherColl.find({type: 'nav_type', parent_id: false, display: true}).sort({index: 1}).toArray();
	let createNavResult = createNavType(allNav, top_parent_id.toString());
	let navData = createNavResult.arr;

	// 推荐视频，推荐文章，相关文章
	let videoList = await videoInfoColl.find({display: true}).sort({update_time: -1}).limit(10).toArray();
	let articleList = await artInfoColl.find({display: true}).sort({update_time: -1}).limit(10).toArray();
	let likeMovie = await videoInfoColl.find({display: true, _id: {$in: curArtExist.video_id}}).sort({update_time: -1}).limit(10).toArray();

	// 上一条，下一条
	let prveInfo = await artInfoColl.find({_id: {$lt: newAid}}).sort({_id: -1}).limit(1).toArray();
	let nextInfo = await artInfoColl.find({_id: {$gt: newAid}}).sort({_id: 1}).limit(1).toArray();

	// 当前主分类所属的所有子分类
	let allChildren = await otherColl.find({parent_id: top_parent_id, display: true, type: "nav_type", nav_type: 'article'}).toArray();
	let isParentEl = curArtType.parent_id ? await otherColl.findOne({_id: curArtType.parent_id}) : false;
	// 全部当前分类下的子分类+当前主分类
	let allCurTypeNav = !curArtType.parent_id ? [curArtType].concat(allChildren) : [isParentEl].concat(allChildren);

	let data = {
		meta: {
			title: `${curArtExist.articleTitle} - ${curArtType.name} - ${config.websiteName}`,
			keywords: curArtType.seo.keywords,
			description: curArtExist.introduce,
			hostName: ctx.protocols + '://' + ctx.host,
		},
		mealList: await otherColl.find({type: 'advert', shape: 'web'}).toArray(),
		isLogin: JSON.stringify(ctx.session1) !== '{}' ? true : false,
		footer: config.footerInfo.replace(/\n/, '<br />'),
		childNav: setArtChildNav(allCurTypeNav, curArtType._id.toString()),
		nav: navData,
		curType: curArtType,
		allowReply: (!config.allowReply || !curArtExist.allow_reply) ? false : true,
		articleResult: {
			perv: prveInfo ? prveInfo[0] : false,
			cur: curArtExist,
			next: nextInfo ? nextInfo[0] : false,
		},
		likeMovie: likeMovie,
		videoTop: videoList,
		articleTop: articleList,
		publicCode: config.publicCode,
	}
	return data

}




// 获取子级评价列表
let getChildrenReply = async (coll, pid, vid, page) => {
	let pipe = [
		{
	        $match: {
	        	vid: vid,
	        	pid: pid,
	        	display: true,
	        	agree: true
	        }
	    },
		{
			$sort: {_id: 1}
		},
		{
			$skip: (page - 1) * 5
		},
		{
			$limit: 5
		},
	    {
	        $lookup: {
	            from: "user",                    // 关联的表 名称
	            localField: "uid",               // 当前表的字段 需要关联到目标表
	            foreignField: "_id",             // 目标表和当前表字段对应的字段
	            as: "userInfo"                       // 输出的字段
	        }
	    },
	    {
	        $lookup: {
	            from: "user",                    // 关联的表 名称
	            localField: "wid",               // 当前表的字段 需要关联到目标表
	            foreignField: "_id",             // 目标表和当前表字段对应的字段
	            as: "whoInfo"                       // 输出的字段
	        }
	    },
		{
			$unwind: "$userInfo"
		},
		{
			$unwind: "$whoInfo"
		},
		{
			$project: {
				_id: 1,
				uid: 1,
				pid: 1,
				wid: 1,
				user: '$userInfo.nickName',
				who: '$whoInfo.nickName',
				date: 1,
				text: 1,
			}
		}
	]
	let children = await coll.aggregate(pipe).toArray();
	return children
}
// 评价接口
let getMessageList = async (ctx, next) => {

	ctx.set('Content-Type', 'application/json');
	let { _id, pid=false, page=1 } = ctx.request.body;
	page = Number(page);
	page = !page || page < 1 || page === Infinity ? 1 : page;

	if(!_id || _id.length !== 24){
		return ctx.body = {
			code: 500,
			text: "参数不符合要求！"
		}
	}

	vid = new ObjectID(_id);

	let msgColl = getDB().collection('message');

	if(pid && typeof pid === 'string' && pid.length === 24){

		let newPid = new ObjectID(pid);
		let list = await getChildrenReply(msgColl, newPid, vid, page);

		let promise = new Promise(async (res, rej) => {
			let result = {
				page: page,
				total: await msgColl.find({vid, pid: newPid, display: true, agree: true}).count(),
				list: list
			}
			res(result);
		})

		return await setResponse(ctx, promise, {
			error: "留言列表获取失败",
			success: "留言列表获取成功"
		})

	}else{
		let pipe = [
			{
		        $match: {
		        	vid: vid,
		        	pid: false,
		        	display: true,
		        	agree: true
		        }
		    },
			{
				$sort: {_id: -1}
			},
			{
				$skip: (page - 1) * 10
			},
			{
				$limit: 10
			},
		    {
		        $lookup: {
		            from: "user",                    // 关联的表 名称
		            localField: "uid",               // 当前表的字段 需要关联到目标表
		            foreignField: "_id",             // 目标表和当前表字段对应的字段
		            as: "userInfo"                       // 输出的字段
		        }
		    },
			{
				$unwind: "$userInfo"
			},
			{
				$project: {
					_id: 1,
					uid: 1,
					pid: 1,
					wid: 1,
					user: '$userInfo.nickName',
					date: 1,
					text: 1,
				}
			}
		]
		let oneArr = await msgColl.aggregate(pipe).toArray();

		for(let arg of oneArr){
			let pid = arg._id;
			let list = await getChildrenReply(msgColl, pid, vid, page);
			if(list.length){
				arg.children = {
					page: 1,
					total: await msgColl.find({vid, pid, display: true, agree: true}).count(),
					list: list
				}
			}
		}

		let result = {
			page: page,
			total: await msgColl.find({vid, pid, display: true, agree: true}).count(),
			list: oneArr
		}
		let promise = Promise.resolve(result);

		return await setResponse(ctx, promise, {
			error: "留言列表获取失败",
			success: "留言列表获取成功"
		})

	}

}
// 过滤字符串
function filterXSS(str) {
	return str
	.replace(/&/g, '&amp;')
	.replace(/ /g, '&nbsp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;')
	.replace(/'/g, '&#39;')
	.replace(/\r{0,}\n/g, '<br/>')
}
// 提交评价内容
let submitMessage = async (ctx, next) => {

	ctx.set('Content-Type', 'application/json');
	let { vid="", pid=false, wid=false, text=false, type="video" } = ctx.request.body;
	let msgColl = getDB().collection('message');
	let confColl = getDB().collection('config');
	let videoColl = getDB().collection('video_info');
	let artColl = getDB().collection('article_info');
	let config = await confColl.findOne({});

	// 是否登录
	if(!ctx.session1.user){
		let promise = Promise.reject();
		return await setResponse(ctx, promise, {
			error: '搞我？没登录就想留言？'
		})
	}

	// 网站禁止留言
	if(!config.allowReply){
		let promise = Promise.reject();
		return await setResponse(ctx, promise, {
			error: '网站已经禁止了留言功能！'
		})
	}
	// 本视频禁止留言
	vid = new ObjectID(vid);
	if(type="video"){
		let curVideoInfo = await videoColl.findOne({_id: vid});
		if(!curVideoInfo.allow_reply){
			let promise = Promise.reject();
			return await setResponse(ctx, promise, {
				error: '该视频已经禁止了留言功能！'
			})
		}
	}else if(type="article"){
		let curArtInfo = await artColl.findOne({_id: vid});
		if(!curArtInfo.allow_reply){
			let promise = Promise.reject();
			return await setResponse(ctx, promise, {
				error: '该文章已经禁止了留言功能！'
			})
		}
	}
	// 视频vid不符合要求
	if(vid.toString().length !== 24){
		let promise = Promise.reject();
		return await setResponse(ctx, promise, {
			error: '非法提交，内容ID不符合要求！'
		})
	}
	// 留言内容不符合要求
	if(text.length > config.replyTextLen){
		let promise = Promise.reject();
		return await setResponse(ctx, promise, {
			error: `留言长度超过${config.replyTextLen}个字符，无法提交！`
		})
	}
	// 留言内容空，不行
	if(!text || !text.trim()){
		let promise = Promise.reject();
		return await setResponse(ctx, promise, {
			error: '非法提交，无评价内容！'
		})
	}

	// 找该用户的上一条留言
	let prevMsg = await msgColl.find({uid: ctx.session1.user._id}).sort({_id: -1}).limit(1).toArray();
	let newDate = new Date().getTime();
	// 本次时间小于配置规定的时间
	if(prevMsg.length && (newDate - prevMsg[0].sub_date < (config.replyInterval * 60000))){
		let promise = Promise.reject();
		return await setResponse(ctx, promise, {
			error: `留言太过频繁，请等待 ${config.replyInterval} 分钟后重试！`
		})
	}

	// pid 和 wid 是否符合规范，不符合作为一级回复
	let isReply = (wid && typeof wid === 'string' && wid.length === 24 && pid && typeof pid === 'string' && pid.length === 24);
	pid = isReply ? new ObjectID(pid) : false;
	wid = isReply ? new ObjectID(wid) : false;

	let insertData = {
		"vid" : vid,
	    "uid" : ctx.session1.user._id,
	    "pid" : pid,
	    "wid" : wid,
	    "agree" : config.adoptCheck,
	    "display" : true,
	    "date" : config.isBjTime ? getBjDate(newDate).getTime() : newDate,
	    "sub_date" : newDate,
	    "text" : filterXSS(text)
	}
	let promise = msgColl.insertOne(insertData);
	await setResponse(ctx, promise, {
		error: '留言内容发布失败！',
		success: config.adoptCheck ? '留言内容发布成功，已经通过审核！' : '留言内容发布成功，请耐心等待审核！'
	})

}
// 用户登录
let userLogin = async (ctx, next) => {

	ctx.set('Content-Type', 'application/json');
	let userColl = getDB().collection('user');
	let { userName="", passWord="" } = ctx.request.body;

	if(ctx.session1.user && JSON.stringify(ctx.session1) !== '{}'){
		let promise = Promise.reject();
		return await setResponse(ctx, promise, {
			error: '滚滚滚滚滚滚滚滚滚滚滚滚滚滚'
		})
	}

	if(!userName || !passWord){
		let promise = Promise.reject();
		return await setResponse(ctx, promise, {
			error: '非法登录，用户名或者密码为空？'
		})
	}
	passWord = encryption(passWord);

	let result = await userColl.findOne({display: true, userName, passWord, admin: false});

	if(!result){
		let promise = Promise.reject();
		return await setResponse(ctx, promise, {
			error: '登录失败！没有找到该用户。'
		})
	}

	let promise = new Promise((res, rej) => {
		ctx.session1.user = {
			_id: result._id,
			userName: result.userName,
			nickName: result.nickName,
		}
		res();
	})
	await setResponse(ctx, promise, {
		error: '登录失败！',
		success: '登录成功！'
	})

}
// 注销登录
let loginOut = async (ctx, next) => {

	ctx.set('Content-Type', 'application/json');
	let promise = new Promise((res, rej) => {
		ctx.session1 = {};
		res();
	})
	await setResponse(ctx, promise, {
		error: '注销登录失败！',
		success: '注销登录成功！'
	})
}
// 注册用户
let userRegister = async (ctx, next) => {

	ctx.set('Content-Type', 'application/json');
	let userColl = getDB().collection('user');
	let confColl = getDB().collection('config');
	let { userName='', passWord1='', passWord2='', nickName='' } = ctx.request.body;

	let config = await confColl.findOne({});
	if(!config.allowRegister){
		let promise = Promise.reject();
		return await setResponse(ctx, promise, {
			error: '本网站已经禁止会员注册！'
		})
	}

	if(passWord1 !== passWord2){
		let promise = Promise.reject();
		return await setResponse(ctx, promise, {
			error: '密码不一致，滚！'
		})
	}
	if(!/^[a-zA-Z]{1}([a-zA-Z0-9]|[._]){4,19}$/.test(userName)){
		let promise = Promise.reject();
		return await setResponse(ctx, promise, {
			error: '用户名 请以英文字母开头4-19位长度，滚！'
		})
	}
	if(nickName.length > 8 || !nickName.length){
		let promise = Promise.reject();
		return await setResponse(ctx, promise, {
			error: !nickName.length ? '昵称不得为空，滚！' : '昵称长度请小于8位，滚！'
		})
	}
	if(!/^[a-zA-Z]{1}([a-zA-Z0-9]|[._]){4,19}$/.test(passWord1)){
		let promise = Promise.reject();
		return await setResponse(ctx, promise, {
			error: '密码 请以英文字母开头4-19位长度，滚！'
		})
	}

	let result = await userColl.findOne({userName});

	if(result){
		let promise = Promise.reject();
		return await setResponse(ctx, promise, {
			error: '该用户已经存在，请更换用户名！'
		})
	}

	let insertInfo = {
		"userName" : userName,
	    "passWord" : encryption(passWord1),
	    "nickName" : nickName,
	    "admin" : false,
	    "display" : true,
	    "default" : false,
    	"grade_id" : 0
	}
	let promise = userColl.insertOne(insertInfo);
	await setResponse(ctx, promise, {
		error: '用户注册失败！',
		success: '用户注册成功，请尝试登陆！'
	})

}
// 获取用户信息
let getUserInfo = async (ctx, next) => {

	ctx.set('Content-Type', 'application/json');
	// 未登录
	if(!JSON.stringify(ctx.session1) === '{}'){
		return next();
	}

	let userColl = getDB().collection('user');
	let result = await userColl.findOne({_id: ctx.session1.user._id});
	let promise;
	if(!result){
		promise = Promise.reject()
	}else{
		let data = {
			userName: result.userName,
			nickName: result.nickName,
		}
		promise = Promise.resolve(data)
	}

	await setResponse(ctx, promise, {
		error: '用户信息获取失败！',
		success: '用户信息获取成功！'
	})

}
// 修改用户信息
let setUserInfo = async (ctx, next) => {

	ctx.set('Content-Type', 'application/json');
	// 未登录
	if(!JSON.stringify(ctx.session1) === '{}'){
		return next();
	}

	let userColl = getDB().collection('user');
	let result = await userColl.findOne({_id: ctx.session1.user._id});
	let { type=false, nickName="", oldPassWord="", newPassWord="" } = ctx.request.body;

	let promise, erroMsg;
	// 是否找到该用户
	if(!result){
		promise = Promise.reject();
		erroMsg = '没有找到该用户，或者系统发生错误！'
	}else{
		let updateInfo = {};
		// true 修改信息
		if(type){
			updateInfo = {
				nickName: nickName,
			}
			await userColl.updateOne({_id: ctx.session1.user._id}, {$set: updateInfo});
			promise = Promise.resolve()
		}else{
			let oldPassMd5 = encryption(oldPassWord);
			if(oldPassWord && newPassWord && oldPassMd5 === result.passWord){
				updateInfo = {
					passWord: encryption(newPassWord)
				}
				await userColl.updateOne({_id: ctx.session1.user._id}, {$set: updateInfo});
				promise = Promise.resolve()
			}else{
				promise = Promise.reject();
				if(oldPassMd5 !== result.passWord){
					erroMsg =  '原始密码错误！';
				}
			}
		}
	}

	await setResponse(ctx, promise, {
		error: erroMsg || '用户信息修改失败！',
		success: '用户信息获取成功！'
	})

}

module.exports = {
	// 通用方法
	createNavType,
	getVideoDetill,
	getCurArtData,
	getTypesData,
	getCurNavData,
	getSearchData,
	getCurArtInfo,
	// 通用路由
	getMessageList,
	submitMessage,
	userLogin,
	loginOut,
	userRegister,
	getUserInfo,
	setUserInfo,
}