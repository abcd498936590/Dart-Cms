;(function(w, d){
	var publicFn = {
		// ajax错误提示
		ajaxErrTip: function(msg){
			new $.zui.Messager(msg || '发生错误，请检查您的网络！', {
			    type: 'warning' // 定义颜色主题
			}).show();
		},
		// ajax中间件
		ajaxMiddleware: function(xhr, state){
	    	var result = xhr.responseJSON.code === 200 ;
	    	new $.zui.Messager(xhr.responseJSON.text, {
			    type: result ? 'success' : 'warning' // 定义颜色主题
			}).show();
	    }
	}
	var methods = {
		// 注册用户信息
		regUserInfo: function(paramData){
			$.ajax({
			    type: 'POST',
			    async: true,
			    headers: {
			    	'Content-Type': 'application/json'
			    },
			    url : '/public/userRegister',
			    data : JSON.stringify(paramData),
			    dataType : 'json',
			    success : function(data){
			        if(data.code === 200){
			        	setTimeout(function(){
			        		w.location.reload()
			        	}, 300)
			        }
			    },
			    error : publicFn.ajaxErrTip,
			    complete : publicFn.ajaxMiddleware
			})
		},
		// 用户登录
		loginUser: function(paramData){
			$.ajax({
			    type: 'POST',
			    async: true,
			    url : '/public/userLogin',
			    data : JSON.stringify(paramData),
			    headers: {
			    	'Content-Type': 'application/json'
			    },
			    dataType : 'json',
			    success : function(data){
			    	if(data.code === 200){
			    		setTimeout(function(){
			    			window.location.reload();
			    		},300)
			    	}
			    },
			    error : publicFn.ajaxErrTip,
			    complete : publicFn.ajaxMiddleware
			})
		}
	}
	// 解析地址栏参数
	w.getQueryData = function(handleRmpty, noCacheRmptyKey){
		var initQuery = {};
		var urlStr = window.location.search.substring(1);
		var urlArr = urlStr.split('&');
		for(var i=0; i<urlArr.length; i++){
			var item = urlArr[i].split('=');
			var key = item[0];
			var val = (item[1] === '' && handleRmpty) ? false : item[1];

			if(noCacheRmptyKey && !val || (item.length !== 2) || !key){
				continue;
			}
			initQuery[key] = val;
		}
		return initQuery
	}
	// 搜索
	w.goSearch = function(){
		var soVal = $('#soVal').val().trim();
		if(soVal){
			w.location.href='/search.html?name='+soVal;
		}
	}
	// 用户注销登录
	w.userLogout = function(){
		$.ajax({
		    type: 'POST',
		    async: true,
		    url : '/public/loginOut',
		    headers: {
		    	'Content-Type': 'application/json'
		    },
		    dataType : 'json',
		    success : function(data){
		        if(data.code === 200){
		        	setTimeout(function(){
		        		w.location.reload()
		        	}, 300)
		        }
		    },
		    error : publicFn.ajaxErrTip,
		    complete : function(xhr, state){
		    	var result = xhr.responseJSON.code === 200 ;
		    	new $.zui.Messager(xhr.responseJSON.text, {
				    type: result ? 'success' : 'warning' // 定义颜色主题
				}).show();
		    }
		})
	}
	// 显示历史清空
	w.changeHisState = function(){
		//<ul>
		// 	<li>
		// 		<div class="pub-flex">
		// 			<a class="pub-flex1 pointer title text-ellipsis word-wrap">{{ history[item].title }}</a>
		// 			<a style="color: red;">{{ history[item].indexName }}</a>
		// 		</div>
		// 	</li>
		// </ul>
		// <div class="text-center">暂未历史记录</div>
		setTimeout(function(){
			var isOpenHisCard = $('#hisCon').hasClass('open');
			if(isOpenHisCard){
				var historyResult = window.localStorage.getItem('history');
				var hisStora = historyResult ? JSON.parse(historyResult) : {key: [], val: {}};
				var hisKey = hisStora.key.length ? Object.values(hisStora.key).reverse() : false;
				var hisList = $('.his-list');
				// 有历史记录
				if(hisKey){
					var str = '';
					for(var i=0; i<hisKey.length; i++){
						var curKey = hisStora.val[hisKey[i]];
						str+=`
						<li>
							<div class="pub-flex">
								<a href="/detill/${curKey._id}.html" class="pub-flex1 pointer title text-left text-ellipsis word-wrap">${curKey.title}</a>
								<a href="${curKey.link}" style="color: red;">${curKey.indexName}</a>
							</div>
						</li>`;
					}
					var ulEl = $('<ul></ul>').append(str);
					hisList.html(ulEl);

				}else{
					hisList.html('<div class="text-center">暂未历史记录</div>');
				}
			}
		},0);
	}
	// 清空历史
	w.emptyHistory = function(){
		w.localStorage.removeItem('history');
	}
	// 用户注册
	w.regUserInfo = function(){
		var nnInput = $('#reg-nn');
		var unInput = $('#reg-un');
		var pwInput = $('#reg-pw');
		var pw2Input = $('#reg-pw2');
		if(nnInput.val().trim().length > 6 || !nnInput.val().trim()){
			new $.zui.Messager('昵称长度应小于6位长度！', {
			    type: 'warning' // 定义颜色主题
			}).show();
			return
		}
		if(!/^[a-zA-Z]{1}([a-zA-Z0-9]|[._]){4,19}$/.test(unInput.val().trim())){
			new $.zui.Messager('用户名不符合要求，请以英文字母开头4-19位长度！', {
			    type: 'warning' // 定义颜色主题
			}).show();
			return
		}
		if(!/^[a-zA-Z]{1}([a-zA-Z0-9]|[._]){4,19}$/.test(pwInput.val().trim())){
			new $.zui.Messager('密码不符合要求，请以英文字母开头4-19位长度！', {
			    type: 'warning' // 定义颜色主题
			}).show();
			return
		}
		if(!/^[a-zA-Z]{1}([a-zA-Z0-9]|[._]){4,19}$/.test(pwInput.val().trim())){
			new $.zui.Messager('密码不符合要求，请以英文字母开头4-19位长度！', {
			    type: 'warning' // 定义颜色主题
			}).show();
			return
		}
		if(pwInput.val().trim() !== pw2Input.val().trim()){
			new $.zui.Messager('两次密码不不一致，请检查密码输入结果！', {
			    type: 'warning' // 定义颜色主题
			}).show();
			return
		}
		var paramData = {
			userName: unInput.val().trim(),
			nickName: nnInput.val().trim(),
			passWord1: pwInput.val().trim(),
			passWord2: pw2Input.val().trim(),
		}
		// 正常运行
		methods.regUserInfo(paramData);
	}
	w.loginUser = function(){
		var unInput = $('#login-un');
		var pwInput = $('#login-pw');
		if(!/^[a-zA-Z]{1}([a-zA-Z0-9]|[._]){4,19}$/.test(unInput.val().trim())){
			new $.zui.Messager('用户名不符合要求，请以英文字母开头4-19位长度！', {
			    type: 'warning' // 定义颜色主题
			}).show();
			return
		}
		if(!/^[a-zA-Z]{1}([a-zA-Z0-9]|[._]){4,19}$/.test(pwInput.val().trim())){
			new $.zui.Messager('密码不符合要求，请以英文字母开头4-19位长度！', {
			    type: 'warning' // 定义颜色主题
			}).show();
			return
		}
		var paramData = {
			userName: unInput.val().trim(),
			passWord: pwInput.val().trim()
		}
		//
		methods.loginUser(paramData);
	}
})(window, document);
$(document).ready(function(){
	// 返回顶部
	;(() => {
		var goTopBtn = $('#goTopBtn');
		$(window).scroll(function(e){
			var scroH = $(document).scrollTop(); //滚动高度
	       	var viewH = $(window).height(); //可见高度
	       	var contentH = $(document).height(); //内容高度

	        if(scroH > 100){ //距离顶部大于100px时
	        	goTopBtn.show();
	        }else{
	        	goTopBtn.hide();
	        }
		});
		goTopBtn.click(function(ev){
			$('body,html').animate({scrollTop: 0}, 300)
		});
	})();
	// 分享
	;(() => {
		setTimeout(function(){
			var clipboard = new ClipboardJS('.btn-share', {
            text: function(){
	            	return window.location.href
	            }
	        });
	        clipboard.on('success', function(e) {
	            new $.zui.Messager('分享地址复制成功！', {
				    type: 'success' // 定义颜色主题
				}).show();
	        });

	        clipboard.on('error', function(e) {
	            new $.zui.Messager('分享地址复制失败！', {
				    type: 'error' // 定义颜色主题
				}).show();
	        });
		}, 0);
	})();
	// jquery lazy
	$(".lazy").lazyload({effect: "fadeIn"});
	// swiper init
	;(function(){
		var isOpenSwiper = $('#swiper-box').length;
		if(isOpenSwiper){
			new Swiper('.swiper-container', {
				autoplay: true,      //可选选项，自动滑动
				loop: true,          //环路
				pagination: {
			      	el: '.swiper-pagination',
			    },
			    autoplay: {
			        disableOnInteraction: false
			    }
			})
		}
	})();
})