const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const uuidv4 = require('uuid/v4');
const { ObjectID } = require('mongodb');

// 设置响应
let setResponse = async (ctx, promise, obj = {}) => {

	return promise
	.then((result) => {
		ctx.body = JSON.stringify({
			code: 200,
			text: obj.success || "操作成功！",
			value: result || null
		})
	})
	.catch((e) => {
		ctx.body = JSON.stringify({
			code: 500,
			text: obj.error || "操作失败！"
		})
	})

}

// 加密密码
let encryption = (password) => {

	let md5 = crypto.createHash('md5');
	return md5.update(password).digest('hex').toLowerCase();

}

// token生成
let createTokenID = (length = 48) => {

  return crypto.randomBytes(length).toString('hex');

}

// 生成ObjectID
let makeArrObjectID = (arr) => {

	let newArr = []
	for(let arg of arr){
		newArr.push(new ObjectID(arg))
	}
	return newArr

}

// 查找id
let findUserID = (tarID, itemList) => {

	for(let arg of itemList){
		if(arg === tarID){
			return false
		}
	}
	return true

}

let getBjDate = (time) => {

	//获得当前运行环境时间
	var d = new Date(time), currentDate = new Date(), tmpHours = currentDate.getHours();
	//算得时区
	var time_zone = -d.getTimezoneOffset() / 60;

	//少于0的是西区 西区应该用时区绝对值加京八区 重新设置时间（西区时间比东区时间早 所以加时区间隔）
	if(time_zone < 0){
		time_zone = Math.abs(time_zone) + 8; currentDate.setHours(tmpHours + time_zone);
	}else{
		//大于0的是东区  东区时间直接跟京八区相减
		time_zone -= 8; currentDate.setHours(tmpHours - time_zone);
	}
	return currentDate;
}

// 修改脚本config文件
let mixinsScriptConfig = async (scriptName, mixins) => {
	try{
		let confPath = path.resolve(__dirname, `../script/${scriptName}/config.json`);
		let oldConf = fse.readJsonSync(confPath);
		let newConf = Object.assign({}, oldConf, mixins);
		fse.writeJsonSync(confPath, newConf);
		return true
	}catch(err){
		return false
	}
}

// 生成时间字符串
let dateStringify = (isBJTime=false) => {
	let fill = (d) => {
		return d < 10 ?  '0' + d : d
	}
	let d = isBJTime ? new Date(getBjDate(new Date().getTime())) : new Date();
	return `${d.getFullYear()}-${fill(d.getMonth()+1)}-${fill(d.getDate())} ${fill(d.getHours())}:${fill(d.getMinutes())}:${fill(d.getSeconds())}`
}

// 遍历目录下的图片
let dirCatImgs = async (coll, catalog, catName, searchkey) => {
	return new Promise(async (resolve, reject) => {
		let arr = [];
		let covCatPath = path.resolve(__dirname, `../static/${catalog}/${catName}`);
		var pa = fs.readdirSync(covCatPath);
		for(let el of pa){
			let pathItem = path.resolve(covCatPath, el);
			let fileSuffix = path.extname(pathItem).substring(1).toLocaleLowerCase();
			let isImg = (fileSuffix === 'jpg' || fileSuffix === 'png' || fileSuffix === 'jpeg' || fileSuffix === 'gif');
			// 是图片，查询库，看是否有使用这个图片
			let queryJson = {};
			queryJson[searchkey] = `/${catalog}/${catName}/${el}`;
			if(isImg){
				let isOccupy = await coll.findOne(queryJson);
				arr.push({
					path: `/${catalog}/${catName}/${el}`,
					name: el,
					occupy: isOccupy ? true : false
				})
			}
		}
		resolve(arr)
	})
}

// 上传图片
let placeUploadImg = async (catName, file) => {
	return new Promise((resolve, reject) => {
		// 创建可读流
		const reader = fs.createReadStream(file.path);
		let fileSuffix = path.extname(file.name).substring(1).toLocaleLowerCase();
		let upLoadPath = path.resolve(__dirname, `../static/upload/${catName}`, `${uuidv4()}.${fileSuffix}`);
		// 创建可写流
		const upStream = fs.createWriteStream(upLoadPath);
		// 可读流通过管道写入可写流
		reader.pipe(upStream);
		// 成功，文件路径
		resolve(upLoadPath);
	})
}

module.exports = {
	getBjDate,
	findUserID,
	encryption,
	setResponse,
	createTokenID,
	makeArrObjectID,
	mixinsScriptConfig,
	dateStringify,
	dirCatImgs,
	placeUploadImg,
}