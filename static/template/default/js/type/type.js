;(function(){
	var query = window.getQueryData(true);
	new Vue({
		el: '#app',
		data: function(){
			return {
				content: {
					page: 1,
					total: 0,
					list: []
				},
				types: false,
				query: {},
				curPage: 1,
				tabName: '_id'
			}
		},
		methods: {
			changePage: function(num){
				var newParem = window.getQueryData(false, true);
				newParem['page'] = num;
				var cachedData = {};
				for(var attr in newParem){
					if(newParem[attr] !== false){
						cachedData[attr] = newParem[attr]
					}
				}
				var queryUrlParse = this.parseParam(cachedData);
				window.location.href = '/type.html?' + queryUrlParse;
			},
			changeTabItem: function(tab, ev){
				this.changeSearchQuery({_id: this.tabName}, 'sort');
			},
			parseParam: function(obj){
				var str = '';
				for(var attr in obj){
					str+= attr + '=' + obj[attr] + '&';
				}
				var index = str.lastIndexOf('&');
				return str.substring(0, index)
			},
			changeSearchQuery: function(item, key){
				var newData = {};
				newData[key] = item._id === 'false' ? false : item._id;
				var curParam = window.getQueryData(false, true);
				var newParem = Object.assign({}, curParam, newData);
				var cachedData = {};
				for(var attr in newParem){
					if(newParem[attr] !== false){
						cachedData[attr] = newParem[attr]
					}
				}
				var queryUrlParse = this.parseParam(cachedData);
				window.location.href = '/type.html?' + queryUrlParse;
			}
		},
		created: function(){
			var data = window.configData;
			this.content = data.curQueryList;
			this.types = data.allTypeItem;
			var q = window.getQueryData(false, true);
			this.tabName = q.sort ? q.sort : '_id';
			this.curPage = q.page ? Number(q.page) : 1;
		}
	})
})();