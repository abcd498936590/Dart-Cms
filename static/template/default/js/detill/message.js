;(function(){
	// 用户评价系统
	Vue.component('reply-message', {
		template: `
			<div id="reply">
				<div class="card pl10 pr10 pt10 pb10">
					<div class="row-col">
						<div class="cart-title row-col">
							<i class="fa fa-weixin"></i>
							<span class="pl10">留言回复</span>
						</div>
						<div v-if="allowReply" class="mt10">
							<div>
								<div v-if="is_reply" class="pb10">
									<el-alert
										:closable="true"
										@close="resetReplyInfo"
										type="success">
										<p v-html="reply_tip"></p>
									</el-alert>
								</div>
								<div>
									<el-input
										type="textarea"
										:autosize="{ minRows: 3, maxRows: 4}"
										placeholder="请输入内容"
										v-model="msg_text">
									</el-input>
								</div>
								<div v-if="isLogin" class="text-right mt20">
									<el-button @click="sendMessage" size="small" :loading="sub_loading" type="success">发布</el-button>
								</div>
								<div v-else class="text-right mt20 pub-flex">
									<div class="pub-flex1"></div>
									<span style="color: red;">您未登陆，请先登陆！</span>
									<el-button data-toggle="modal" data-target="#user-modal" size="small" type="danger">登陆</el-button>
								</div>
							</div>
							<el-divider></el-divider>
							<div>
								<div class="cart-title msg-title row-col">
									<i class="fa fa-list"></i>
									<span class="pl10">留言列表</span>
								</div>
								<div v-loading="loading">
									<div class="clearfix msg-row pt10" style="border-top: none;">
										<div v-if="msgList.list && msgList.list.length">
											<div v-for="(item, index) in msgList.list" class="pt10 pb10" style="border-top: 1px solid #ddd;">
												<div class="user-icon pull-left pub-flex" style="justify-content: center;">
													<i class="fa fa-user fa-2x"></i>
												</div>
												<div class="msg-con">
													<div class="pub-flex">
														<span>{{ item.user }}</span>
														<div class="pub-flex1"></div>
														<span class="hidden-md-and-down">{{ dateStringify(item.date) }}</span>
														<el-divider direction="vertical"></el-divider>
														<el-button @click="msgReplyIng(item)" style="padding: 0px;" type="text">回复</el-buton>
													</div>
													<div class="pt10">
														<p class="line-height: 140%;">{{ item.text }}</p>
													</div>
													<div v-if="item.children" class="pt10">
														<div class="pl10 pt10">
															<div class="clearfix msg-row" style="border: none;">

																<div v-for="(item2, index) in item.children.list" class="pt10 pb10" style="border-top: 1px solid #ddd;margin-top: -1px;">
																	<div class="user-icon pull-left pub-flex" style="justify-content: center;">
																		<i class="fa fa-user fa-2x"></i>
																	</div>
																	<div class="msg-con">
																		<div class="pub-flex">
																			<span>{{ item2.user }}</span>
																			<span style="color: red;"> @ </span>
																			<span>{{ item2.who }}</span>
																			<div class="pub-flex1"></div>
																			<span class="hidden-md-and-down">{{ dateStringify(item2.date) }}</span>
																			<el-divider direction="vertical"></el-divider>
																			<el-button @click="msgReplyIng(item2)" style="padding: 0px;" type="text">回复</el-buton>
																		</div>
																		<div class="pt10">
																			<p class="line-height: 140%;">{{ item2.text }}</p>
																		</div>
																	</div>
																</div>

															</div>
														</div>
														<div v-if="item.children.total > 5" class="ov-x-a ov-y-h pt10 text-center" style="border-top: 1px solid #ddd;">
															<el-pagination
																background
																layout="prev, pager, next"
																:page-size="5"
																@current-change="changePage($event, item, 'children', item._id)"
																:total="item.children.total">
															</el-pagination>
														</div>
													</div>
												</div>
											</div>
										</div>
										<div v-else class="text-center pb10">
											<p style="font-size: 16px;">暂无留言内容</p>
										</div>
									</div>
									<div v-if="msgList.total > 0" class="pt10 text-center">
										<el-pagination
											background
											layout="prev, pager, next"
											:page-size="10"
											@current-change="changePage($event, 'this', 'msgList', false)"
											:total="msgList.total">
										</el-pagination>
									</div>

								</div>
							</div>
						</div>
						<div v-else class="row-col mt10" style="border-top: 1px solid #ddd;">
							<p class="text-center pt10">评价系统已经禁用！</p>
						</div>
					</div>
				</div>
			</div>
		`,
		data: function(){
			return {
				allowReply: false,
				vid: "",
				type: "video",
				lock: false,
				loading: false,
				sub_loading: false,
				is_reply: false,
				reply_tip: "您正在对 xxx 的留言回复！",
				isLogin: false,
				msg_text: "",
				msgList: {page: 1, total: 0, list: []},
				target: {}
			}
		},
		methods: {
			sendMessage: function(){
				// 正在提交，直接退出
				if(this.sub_loading){
					return
				}
				// 没有填写内容，警告
				if(!this.msg_text.trim()){
					this.$message({
						type: 'warning',
						message: '请先填写内容后提交！'
					})
					return
				}
				// 加工数据
				var jsonData = {
					text: this.msg_text,
					vid: this.vid,
					type: this.type
				}
				if(this.is_reply){
					jsonData['pid'] = this.target['pid'];
					jsonData['wid'] = this.target['wid'];
				}
				// submit button loading
				this.sub_loading = true;
				var This = this;
				$.ajax({
				    type: 'POST',
				    async: true,
				    url : '/public/submitMessage',
				    data : JSON.stringify(jsonData),
				    headers: {
				    	'Content-Type': 'application/json'
				    },
				    success : function(data){
				    	if(data.code === 200){
				    		This.resetReplyInfo();
				    		This.pullData(This, 'msgList', This.msgList.page);
				    	}
				    },
				    error : function(xhr, errorData){
				    	This.$message({
				    		type: 'error',
				    		message: '请检查您的网络'
				    	})
				    	console.log(xhr, errorData);
				    },
				    complete : function(xhr, data){
				    	This.sub_loading = false;
				    	var result = xhr.responseJSON.code === 200 ;
				    	This.$message({
				    		type: result ? 'success' : 'warning',
				    		message: xhr.responseJSON.text
				    	})
				    }
				})
			},
			msgReplyIng: function(item){
				this.is_reply = true;
				this.reply_tip = `您正在对  <span style="color: red;">${item.user}</span>  的留言回复！`;
				this.target = {
					"pid": !item.pid ? item._id : item.pid,
					"wid": item.uid,
				};
				window.location.href = '#reply';
			},
			dateStringify: function(time){
				var fill = (d) => {
					return d < 10 ?  '0' + d : d
				}
				var d = new Date(time);
				return `${d.getFullYear()}-${fill(d.getMonth()+1)}-${fill(d.getDate())} ${fill(d.getHours())}:${fill(d.getMinutes())}:${fill(d.getSeconds())}`
			},
			changePage: function(page, item, key, _id){
				this.pullData(item === 'this' ? this : item, key, page, _id);
			},
			resetReplyInfo: function(){
				this.is_reply = false;
				this.reply_tip = "您正在对 xxx 的留言回复！";
				this.msg_text = "";
				this.target = {
				    "pid": false,
				    "wid": false
				}
			},
			initReplyEvent: function(){
				if(this.allowReply){
					var This = this;
					var msgBoxOffsetTop = $('.msg-title').offset().top;
					$(window).scroll(function(e){
						if(This.lock){
							return
						}
						var scroH = $(document).scrollTop(); //滚动高度
				       	var viewH = $(window).height(); //可见高度
				       	var contentH = $(document).height(); //内容高度

				        if((scroH + viewH) > msgBoxOffsetTop){
				        	This.lock = true;
				        	This.pullData(This, 'msgList', This.msgList.page);
				        }
					})
				}
			},
			pullData: function(tarItem, key, page=1, pid=false){
				var This = this;
				var jsonData = JSON.stringify({
			    	_id: This.vid,
			    	pid: pid,
			    	page: page,
			    	type: This.type
			    })
			    this.loading = true;
				$.ajax({
				    type: 'POST',
				    async: true,
				    url : '/public/getMessageList',
				    data : jsonData,
				    headers: {
				    	'Content-Type': 'application/json'
				    },
				    success : function(data){
				    	if(data.code === 200){
				    		tarItem[key] = data.value;
				    	}
				    },
				    error : function(xhr, errorData){
				    	This.$message({
				    		type: "error",
				    		message: "发生错误，留言获取失败！"
				    	})
				    },
				    complete : function(xhr){
				    	This.loading = false;
				    }
				})
			}
		},
		created: function(){
			// 取值，序列化
			var dataInfoStr = $('#mgs-app').attr('data-info');
			var objInfo = JSON.parse(dataInfoStr);
			//
			this.isLogin = objInfo.isLogin;
			this.vid = objInfo.videoId;
			this.allowReply = objInfo.allowReply;
			this.type = this.type;

		},
		mounted: function(){
			this.$nextTick(function(){
				this.resetReplyInfo();
				this.initReplyEvent();
			})
		}
	});
	new Vue({
		el: '#mgs-app'
	})
})();