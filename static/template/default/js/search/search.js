;(function(){
	new Vue({
		el: '#app',
		data: function(){
			return {
				searchName: '',
				searchResult: {
					page: 1,
					total: 0,
					list: []
				}
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
				window.location.href = '/search.html?' + queryUrlParse;
			},
			parseParam: function(obj){
				var str = '';
				for(var attr in obj){
					str+= attr + '=' + obj[attr] + '&';
				}
				var index = str.lastIndexOf('&');
				return str.substring(0, index)
			}
		},
		mounted: function(){
			this.searchName = window.configData.searchName;
			this.searchResult = window.configData.searchResult;
			console.log(this.searchResult);
		}
	})
})();