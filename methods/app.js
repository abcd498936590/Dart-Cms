const { ObjectID } = require('mongodb');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');

const getDB = require('../utils/baseConnect');
const { setResponse, makeArrObjectID, mixinsScriptConfig, encryption, createTokenID, getBjDate, dirCatImgs, placeUploadImg } = require('../utils/tools');
const { getAllMainData, getVideoDetill, getSearchData, getTypesData, createNavType } = require('./public');

// app入口数据
let getTypeList = async (ctx, next) => {

	ctx.set('Content-Type', 'application/json');
	let confColl = getDB().collection('config');
	let otherColl = getDB().collection('other');
	let config = await confColl.findOne({});

	let allNav = await otherColl.find({type: 'nav_type', parent_id: false, display: true}).sort({index: 1}).toArray();
	let createNavResult = createNavType(allNav, '0');
	let navData = createNavResult.arr;

	let promise = Promise.resolve(navData);
	await setResponse(ctx, promise)

}
// 获取单个分类的数据
let getCurNavItemList = async (ctx, next) => {

	ctx.set('Content-Type', 'application/json');
	let videoInfoColl = getDB().collection('video_info');
	let otherColl = getDB().collection('other');
	let confColl = getDB().collection('config');
	let config = await confColl.findOne({});

	let { Id="0" } = ctx.query;
	Id = (typeof Id === 'string' && Id.length === 24) ? Id : false;
	let promise,
	rowData = {};

	let isSwiperLen = 0;
	if(config.openSwiper){
		isSwiperLen = await videoInfoColl.find({openSwiper: true, display: true}).count();
	}

	let pipeFn = async (match, sort) => {
		let result = await videoInfoColl.aggregate([
			{
		        $match: match
		    },
		    {
				$sort: sort
			},
			{
				$limit: 36
			},
			{
				$project: {
					_id: 0,
					sId: '$_id',
					videoTitle: 1,
					videoImage: 1,
					remind_tip: 1,
				}
			}
		]).toArray();
		return result
	}

	if(Id){
		let _id = new ObjectID(Id);
		let curNavExist = await otherColl.findOne({_id, type: "nav_type", parent_id: false, display: true}) || false;
		// 没有
		if(!curNavExist){
			promise = Promise.reject();
		}else{
			rowData = {
				swiper: !!isSwiperLen,
				swiperList: isSwiperLen ? await pipeFn({display: true, openSwiper: true}, {rel_time: -1, video_rate: -1, update_time: -1}) : [],
				mealList: await otherColl.find({type: 'advert', shape: 'app'}).toArray(),
				tabList: []
			};
			// 全部子分类
			let childrenType = await otherColl.find({parent_id: _id, display: true, type: "nav_type"}).toArray();
			let qArr = [];
			for(let arg of childrenType){
				qArr.push(arg._id);
			}
			// 如果存在子分类，那么查找所以子分类下的数据有多少，没有false
			let noChildVideo = childrenType.length ? await videoInfoColl.find({video_type: {$in: qArr}}).count() : false;
			// 没有数据，那么把当前主分类的数据放入其中
			if(!childrenType.length || !noChildVideo){
				rowData.tabList.push({
					sId: curNavExist._id,
					name: curNavExist.name,
					parent_id: Id,
					list: await pipeFn({video_type: _id}, {rel_time: -1, video_rate: -1, update_time: -1})
				})
			}else{
				for(let arg of childrenType){
					let list = await videoInfoColl.find({video_type: arg._id}).sort({rel_time: -1, video_rate: -1, update_time: -1}).limit(12).toArray();
					if(list.length){
						rowData.tabList.push({
							sId: arg._id,
							name: arg.name,
							parent_id: Id,
							list: await pipeFn({video_type: arg._id}, {rel_time: -1, video_rate: -1, update_time: -1})
						})
					}
				}
			}
		}
	}else{

		let allNav = await otherColl.find({type: 'nav_type', parent_id: false, display: true}).sort({index: 1}).toArray();
		rowData = {
			swiper: !!isSwiperLen,
			swiperList: isSwiperLen ? await pipeFn({display: true, openSwiper: true}, {rel_time: -1, video_rate: -1, update_time: -1}) : [],
			mealList: await otherColl.find({type: 'advert', shape: 'app'}).toArray(),
			tabList: []
		};
		for(let arg of allNav){
			let curNavChildren = await otherColl.find({parent_id: arg._id, display: true}).toArray();
			let queryArr = [arg._id];
			for(let arg of curNavChildren){
				queryArr.push(arg._id)
			}
			rowData.tabList.push({
				sId: arg._id,
				name: arg.name,
				parent_id: Id,
				list: await pipeFn({video_type: {$in: queryArr}}, {rel_time: -1, video_rate: -1, update_time: -1})
			})
		}
	}
	promise = Promise.resolve(rowData);
	await setResponse(ctx, promise)

}
// app播放页面
let getDetillData = async (ctx, next) => {

	ctx.set('Content-Type', 'application/json');
	let confColl = getDB().collection('config');
	let config = await confColl.findOne({});

	let data = await getVideoDetill(config, ctx);
	// 如果false => 404
	if(!data){
		return next();
	}

	await setResponse(ctx, Promise.resolve(data))

}
// app搜索页面
let getSearchDatas = async (ctx, next) => {

	ctx.set('Content-Type', 'application/json');
	let confColl = getDB().collection('config');
	let config = await confColl.findOne({});

	let promise = getSearchData(config, ctx);

	await setResponse(ctx, promise)

}
// app分类
let getTypesDatas = async (ctx, next) => {

	ctx.set('Content-Type', 'application/json');
	let confColl = getDB().collection('config');
	let config = await confColl.findOne({});

	let promise = getTypesData(config, ctx);

	await setResponse(ctx, promise)

}
// app验证是否升级
let appAuthUpgrade = async (ctx, next) => {

	ctx.set('Content-Type', 'application/json');
	let confColl = getDB().collection('config');
	let config = await confColl.findOne({});

	let isUpgrade = config.appUpgrade
	let result = {
		upgrade: isUpgrade,
		dialog: isUpgrade ? config.upgradeInfo : config.appInitNoticeCon
	}
	let promise = Promise.resolve(result);
	await setResponse(ctx, promise)

}

module.exports = {
	getTypeList,
	getDetillData,
	getSearchDatas,
	getTypesDatas,
	appAuthUpgrade,
	getCurNavItemList,
}