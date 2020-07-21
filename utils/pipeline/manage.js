// 后台系统-管道-留言
let msgList = (page, limit) => {
	let pipe = [
		{
			$sort: {_id: -1}
		},{
			$skip: limit * (--page)
		},{
			$limit: limit
		},{
			$lookup: {
				from: "video_info",
		        localField: "vid",
		        foreignField: "_id",
		        as: "video_info"
			}
		},{
			$lookup: {
				from: "member",
		        localField: "uid",
		        foreignField: "_id",
		        as: "member"
			}
		},{
			$unwind: "$video_info"
		},{
			$unwind: "$member"
		},{
			$project: {
				_id: 1,
				vid: 1,
				pid: 1,
				uid: 1,
				wid: 1,
				title: "$video_info.videoTitle",
				agree: 1,
				text: 1,
				date: 1,
				user: "$user.userName"
			}
		}
	];
	if(query){
		pipe[0]['$match']['$text'] = {
			$search: query
		}
	}
	return pipe
}
//