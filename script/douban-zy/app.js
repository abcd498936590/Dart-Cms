const path = require('path');
const fse = require('fs-extra');
const axios = require('axios');
const iconv = require('iconv-lite');
const { ObjectID } = require('mongodb');
const { MongoClass } = require('../../utils/mongo');
const Entities = require('html-entities').XmlEntities;
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
				resolve(res.data)
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
let getVideoListData = async (conf, videoInfoColl, confColl) => {

	// let type_list = ['电影', '电视剧', '综艺', '动漫', '纪录片', '短片'];
	let year_list = ['2020', '2019', '2018', '2017', '2016', '2015', '2014', '2013', '2012', '2010', '2009', '2008', '2007', '2006', '2005', '2004', '2003', '2002', '2001', '2000'];

	for(let curYear of year_list){

		for(let i=0; i<=1000; i+=20){

			let bool = true;

			while(bool){

				await new Promise(async (res, rej) => {

					setTimeout(async () => {

						let body = await http(`${conf.options.domain.val}&start=${i}&year_range=${curYear},${curYear}`);

						if(body && body.data && body.data.length){
							return res(body.data);
						}else{
							return rej();
						}

					},60000);

				})
				.then(async (body) => {

					for(let arg of body){

						let movieName = arg.title;

						let searchResult = await videoInfoColl.aggregate([
							{
						        $match: {
						        	videoTitle: {
						        		$regex: movieName,
						        		$options: "$i"
					        		}
						        }
						    }
					    ]).toArray();
					    // 有
					    if(searchResult.length){
					    	let upRate = arg.rate ? Number(arg.rate) : 0;
					    	let queryIdArr = searchResult.map(val => {
					    		return val._id
					    	})
					    	let upResult = await videoInfoColl.updateMany({_id: {$in: queryIdArr}}, {$set: {video_rate: upRate}});
					    	if(upResult.result.ok === 1){
					    		console.log(`当前分类：综艺，年代：${curYear}，视频名称：${movieName}`);
					    	}
					    }
					}
					bool = false;
				})
				.catch((err) => {
					console.log(err);
					console.log(`列表页无内容，地址：${conf.options.domain.val}&start=${i}&year_range=${curYear},${curYear}`);
				})

			}
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

	   	// 最大采集时间
	   	setTimeout(() => {
	   		reject();
	   	}, config.timeout);
	   	// 正常
	   	let videoInfoColl = DB.collection('video_info');
	   	let confColl = DB.collection('config');

	   	let configData = await confColl.findOne({}); //
		let isBJtime = configData.isBjTime;          //

		// 开始采集 => 配置中保存当前子进程的pid，用于手动停止
	   	// 开始采集 => 保存当前运行脚本时间
	   	// 开始采集 => 脚本状态设置为已启动
	   	mixinsScriptConfig('douban-zy', {state: true, pid: process.pid, runTime: dateStringify(isBJtime)});
	   	await getVideoListData(config, videoInfoColl, confColl);
	   	console.log('采集完成！');

		resolve();
	}).then(res => {
		// 把采集状态 改成 停止
		mixinsScriptConfig('douban-zy', {state: false});
		// 停止
		process.exit();
	}).catch(err => {
		// 把采集状态 改成 停止
		mixinsScriptConfig('douban-zy', {state: false});
		// 停止
		process.exit();
	})
}
// mainFn();
MongoClass(mainFn)