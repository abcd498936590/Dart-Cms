;(function(w, d){
	w.goPlayer = function(id){
		window.location.href = $(`#${id}`).attr('data-url');
	}
})(window, document);
;(function(w, d){
	// 源数组
	var tabSource = [];
	// 设置历史记录
	function setHistory(indexName){
		var video_info = JSON.parse($('#video_info').attr('data-info'));
		var hisJson = JSON.parse(window.localStorage.getItem('history')) || {key: [], val: {}};
		var hisLen = hisJson.key.length;
		if(hisLen >= 10){
			var lastEl = hisJson.key.shift();
			delete hisJson.val[lastEl];          // key objectId
		}
		var newKey = video_info._id;

		if(!hisJson.val[newKey]){
			hisJson.key.push(newKey);
		}
		hisJson.val[newKey] = {
			_id: video_info._id,
			title: video_info.videoTitle,
			indexName: indexName || '',
			link: window.location.href
		}
		window.localStorage.setItem('history', JSON.stringify(hisJson));
	}
	// 初始化播放源
	function initTabSource(){
		var tabBars = $('.source-bar').eq(0);
		var curTabUrlList = tabBars.find('.tab-pane');

		curTabUrlList.each(function(index, item){
			var tabListEl = $(item).find('a.link-btn');
			var list = []
			if(tabListEl.length){
				tabListEl.each(function(index2, item2){
					list.push($(item2).attr('data-url'));
				});
			}
			tabSource.push({
				type: $(item).attr('data-type'),
				list: list
			});
		});
		// 数据初始化完成，调用初始化播放
		initPlayer();
	}
	// 初始化播放器和源信息
	function initPlayer(){
		// 参数查询
		var query = window.getQueryData();
		var videoId = $('#play-app').attr('data-id');
		//
		$('.source-tabbar .tabbar-item').eq(query['tab']||0).addClass('active');
		$('.source-bar .tab-pane').eq(query['tab']||0).addClass('active in');
		$('.source-bar .tab-pane').eq(query['tab']||0).find('.link-btn').eq(query['index']||0).addClass('active')
		//
		var playerBox = $('#player-con');
		var tabIndex = query.hasOwnProperty('tab') && tabSource[query['tab']] ? Number(query['tab']) : 0;
		var listIndex = query.hasOwnProperty('index') && tabSource[tabIndex].list[query['index']] ? Number(query['index']) : 0;

		// 是否禁用
		var prevBtn = $('#prevBtn');
		var nextBtn = $('#nextBtn');
		var disPrevBtn = (listIndex <= 0 ) ? true : false;
		var disNextBtn = (listIndex + 1) >= tabSource[tabIndex].list.length ? true : false;

		if(disPrevBtn && !prevBtn.hasClass('disabled')){
			prevBtn.addClass('disabled');
		}
		if(disNextBtn && !nextBtn.hasClass('disabled')){
			nextBtn.addClass('disabled');
		}

		if(!disPrevBtn){
			prevBtn.attr({'data-url': `/play/${videoId}.html?tab=${tabIndex}&index=${listIndex-1}`})
		}
		if(!disNextBtn){
			nextBtn.attr({'data-url': `/play/${videoId}.html?tab=${tabIndex}&index=${listIndex+1}`})
		}

		var curUrlInfo = tabSource[tabIndex].list[listIndex].split('$');
		// 播放
		if(tabSource[tabIndex].type === 'player'){
			playerBox.html(`<iframe webkitallowfullscreen="" mozallowfullscreen="" allowfullscreen="" style="height: 100%;border: none;width: 100%;background: #343434;" class="player-frame" src="/player/index.html?${curUrlInfo[1]}" />`);
		}else if(tabSource[tabIndex].type === 'iframe'){
			playerBox.html(`<iframe webkitallowfullscreen="" mozallowfullscreen="" allowfullscreen="" style="height: 100%;border: none;width: 100%;background: #343434;" class="player-frame" src="${curUrlInfo[1]}" />`);
		}
		// 历史
		setHistory(curUrlInfo[0]);
	}

	// 调用初始化数据
	initTabSource();
})(window, document);