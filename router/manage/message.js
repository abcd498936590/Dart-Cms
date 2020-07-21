const Router = require('koa-router');
const body = require('koa-body');
let route = new Router();

let {
	GetMessageList,
	RemoveMessage,
	ChangeMsgState,
	ReplyMessage,
} = require('../../methods/manage/message')

// 留言列表   page, total, size
route.post('/message/getMessageList', GetMessageList);
// 删除留言
route.post('/message/removeMessage', RemoveMessage);
// 改变留言状态 - 审批，隐藏
route.post('/message/changeMsgState', ChangeMsgState);
// 回复留言
route.post('/message/replyMessage', ReplyMessage);

module.exports = route