require('shelljs/global');
const Koa = require('koa');
const path = require('path');
const bodyParser = require('koa-bodyparser');
const schedule = require('node-schedule');

const app = new Koa();
let queue = {};

app.use(bodyParser());

app.use(async (ctx, next) => {

	ctx.set('Content-Type', 'application/json');

	let { type } = ctx.request.body;

	try{
		// 创建任务
		if(type === 'createCron'){

			(() => {

				let { time, name, script, clientTime, serverTime } = ctx.request.body;

				let initTime = time;
				let id = new Date().getTime() + '';
				let posTime = time.split(' ');
				let posHour = posTime[2];
				// 计算时区差异 + 计算差值
				if(posHour !== '*'){
					let clientHour = new Date(clientTime).getHours();
					let serverHour = new Date(serverTime).getHours();
					// 说明服务器和用户不在一个时区
					let maxHour = clientHour > serverHour ? clientHour : serverHour;
					let minHour = clientHour < serverHour ? clientHour : serverHour;
					// max - min = gap
					let gapHour = maxHour - minHour;
					let resultHour = clientHour > serverHour ? (clientHour - gapHour) : (clientHour + gapHour);
					posTime[2] = resultHour;
					time = posTime.join(' ');
				}


				let task = schedule.scheduleJob(time, () => {
					console.log('触发计划任务');
					let scriptPath = path.resolve(__dirname, `./script/${script}/app.js`);
					exec(`node ${scriptPath}`, {async: true}, (code, stdout, stderr) => {
						console.log('单次任务执行完成，子进程退出状态码 ' + code);
					});
				});
				queue[id] = {
					id: id,
					el: task,
					name,
					time: initTime,
					script,
				}

			})();

		}else if(type === 'removeCron'){

			let { id } = ctx.request.body;
			queue[id].el.cancel();
			Reflect.deleteProperty(queue, id);

		}else if(type === 'getAllCrons'){
			let cronArr = [];
			for(let attr in queue){
				cronArr.push({
					id: queue[attr].id,
					name: queue[attr].name,
					time: queue[attr].time,
					script: queue[attr].script
				})
			}
			ctx.body = {
				code: 200,
				text: '任务列表获取成功',
				value: cronArr
			}
			return
		}
		ctx.body = {
			code: 200,
			text: '操作成功！'
		}
	}catch(err){
		ctx.body = {
			code: 500,
			text: '发生错误！'
		}
	}
})

app.listen(8899, () => {
	console.log('cron app启动，端口 8899');
})
