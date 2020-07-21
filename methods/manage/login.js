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
// 管道
let BMP24 = require('gd-bmp').BMP24;



// 验证码
let CreateCodeImg = async (ctx, next) => {

	let sessColl = getDB().collection('session2');
	let isExist = await sessColl.findOne({ip: ctx.clientIp});     // 中间价加工用户ip

	/*
	 用PCtoLCD2002取字模
	 行列式扫描，正向取模（高位在前）
	 */
	var cnfonts = {//自定义字模
	    w : 16,
	    h : 16,
	    fonts: "中国",
	    data : [
	        [0x01,0x01,0x01,0x01,0x3F,0x21,0x21,0x21,0x21,0x21,0x3F,0x21,0x01,0x01,0x01,0x01,0x00,0x00,0x00,0x00,0xF8,0x08,0x08,0x08,0x08,0x08,0xF8,0x08,0x00,0x00,0x00,0x00],/*"中",0*/
	        [0x00,0x7F,0x40,0x40,0x5F,0x41,0x41,0x4F,0x41,0x41,0x41,0x5F,0x40,0x40,0x7F,0x40,0x00,0xFC,0x04,0x04,0xF4,0x04,0x04,0xE4,0x04,0x44,0x24,0xF4,0x04,0x04,0xFC,0x04],/*"国",1*/
	    ]
	};
	//仿PHP的rand函数
	function rand(min, max) {
	    return Math.random()*(max-min+1) + min | 0; //特殊的技巧，|0可以强制转换为整数
	}
	//制造验证码图片
	function makeCapcha() {
	    var img = new BMP24(140, 40);
	    img.fillRect(0, 0, 140, 40, 0xffffff);

	    //画曲线
	    var w=img.w/2;
	    var h=img.h;
	    var color = rand(0, 0xffffff);
	    var y1=rand(-5,5); //Y轴位置调整
	    var w2=rand(10,15); //数值越小频率越高
	    var h3=rand(4,6); //数值越小幅度越大
	    var bl = rand(1,5);
	    for(var i=-w; i<w; i+=0.1) {
	        var y = Math.floor(h/h3*Math.sin(i/w2)+h/2+y1);
	        var x = Math.floor(i+w);
	        for(var j=0; j<bl; j++){
	            img.drawPoint(x, y+j, color);
	        }
	    }

	    var p = "ABCDEFGHKMNPQRSTUVWXYZ3456789";
	    var str = '';
	    for(var i=0; i<5; i++){
	        str += p.charAt(Math.random() * p.length |0);
	    }

	    var fonts = [BMP24.font8x16, BMP24.font12x24, BMP24.font16x32];
	    var x = 15, y=8;
	    for(var i=0; i<str.length; i++){
	        var f = fonts[Math.random() * fonts.length |0];
	        y = 8 + rand(-10, 10);
	        // img.drawChar(str[i], x, y, f, rand(0, 0xffffff));
	        img.drawChar(str[i], x, y, f, 0x000000);
	        x += f.w + rand(2, 8);
	    }
	    // 验证码
	    // console.log(str);
	    return {
	        base64: img.getFileData().toString('base64'),
	        code: str,
	        data: img,
	    }
	}

	let img = makeCapcha();
	ctx.session2.code = img.code.toLocaleLowerCase();
	// 判断当前用户的ip是否已经在session持久化存储里面了
	// 如果不在ctx.token = 生成的token
	// 如果在ctx.token = 从库中查询到的session的sid
	if(isExist){
		ctx.token = isExist.sid;
	}else{
		ctx.token = createTokenID(24)
	}
	let promise = Promise.resolve({base64: img.base64, token: ctx.token})

	await setResponse(ctx, promise, {
		error: '验证码获取失败',
		success: '验证码获取成功'
	})

}
// 管理员登录
let AdminLogin = async (ctx, next) => {

	ctx.set('Content-Type', 'application/json');

	let user = ctx.session2.user;
	let { code, userName, passWord } = ctx.request.body;
	let promise,message;

	if(!userName || !passWord){
		let promise = Promise.reject();
		return await setResponse(ctx, promise, {
			error: '非法登录，用户名或者密码为空？'
		})
	}

	if(user){
		promise = Promise.reject();
		message = { error: "您已登录，无需再次登录" }
	}else{
		// 存在 && 等于
		if(ctx.session2.code && code && code === ctx.session2.code){
			let memColl = getDB().collection('user');
			// console.log({userName, passWord: encryption(passWord), admin: true});
			let isExist = await memColl.findOne({userName, passWord: encryption(passWord), admin: true, display: true});
			if(isExist){
				// log 日志
				let logColl = getDB().collection('logs');
				let confColl = getDB().collection('config');
				let config = await confColl.findOne({});
				// session info
				let userInfo = {
					_id: isExist._id,
					userName: isExist.userName,
					nickName: isExist.nickName,
					curTime: config.isBjTime ? getBjDate(new Date().getTime()) : new Date().getTime(),
					admin: isExist.admin,
					roleData: isExist.roleData
				}
				// session存
				ctx.session2.user = userInfo;
				// 日志添加
				await logColl.insertOne({
					type: '用户登录',
					event: `${ctx.session2.user.userName} 登录，IP ${ctx.clientIp}`,
					time: ctx.session2.user.curTime,
					loginDate: new Date()
				})
				// 成功
				promise = Promise.resolve(userInfo);
				message = { success: "用户登录成功" }
			}else{
				promise = Promise.reject();
				message = { error: "用户名或者密码错误" }
			}
		}else{
			promise = Promise.reject();
			message = { error: "验证码错误，请重新输入" }
		}
	}
	await setResponse(ctx, promise, message)
}
// 注销登录
let AdminLogout = async (ctx, next) => {

	await authToken(ctx, next, async () => {

		let promise = new Promise((res, rej) => {
			ctx.session2 = {};
			res()
		})
		await setResponse(ctx, promise, { success: "用户注销成功" })

	}, {admin: true})

}

module.exports = {
	AdminLogout,
	AdminLogin,
	CreateCodeImg,
}