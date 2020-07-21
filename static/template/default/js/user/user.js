;(function(){
	new Vue({
		el: '#app',
		data: function(){
			return {
				activeTabName: 'userInfo',
				tabOneLoading: false,
				userInfo: {
					userName: '',
					nickName: '',
				},
				passWord: {
					oldPassWold: '',
					newPassWord: ''
				}
			}
		},
		methods: {
			ajax: function(obj, successFn, completeFn, This){
				$.ajax({
				    type: 'POST',
				    async: true,
				    url : obj.url,
				    data :obj.data ? JSON.stringify(obj.data) : '',
				    dataType : 'json',
				    context: This,
				    headers: {
				    	'Content-Type': 'application/json'
				    },
				    success : function(data){
				        successFn.call(this, data);
				    },
				    error : function(xhr, errorData){
				        this.$message({
				    		type: 'error',
				    		message: '请检查您的网络'
				    	})
				    	console.log(xhr, errorData);
				    },
				    complete : function(xhr, status){
				    	// this.tabOneLoading = false;
				    	completeFn.call(this, xhr, status);
				    	var result = xhr.responseJSON.code === 200 ;
				    	This.$message({
				    		type: result ? 'success' : 'warning',
				    		message: xhr.responseJSON.text
				    	})
				    }
				})

			},
			subUserInfo: function(){
				this.ajax({
					url: '/public/setUserInfo',
					data: {
						type: true,
						nickName: this.userInfo.nickName
					}
				}, function(data){
					if(data.code === 200){
						this.pullData();
					}
				}, function(){

				}, this);
			},
			subUserPassWord: function(){
				this.ajax({
					url: '/public/setUserInfo',
					data: {
						type: false,
						oldPassWord: this.passWord.oldPassWord,
						newPassWord: this.passWord.newPassWord
					}
				}, function(data){

				}, function(){

				}, this);
			},
			pullData: function(){
				var This = this;
				this.tabOneLoading = true;
				this.ajax({
					url: '/public/getUserInfo',
					data: false
				}, function(data){
					if(data.code === 200){
			    		this.userInfo = data.value;
			    	}
				}, function(){
					this.tabOneLoading = false;
				}, this);
			}
		},
		created: function(){
			this.pullData();
		}
	})
})();