;(function(w, d){
	// 点击展开
	w.openPlot = function(){
		$('.plot-info').removeClass('plot-fold');
	}
	// 多余三行隐藏
	;((len) => {
		var parentEl = $('.plot-info');
		var plotEl = $(".plot-con");
	    var plotConH = plotEl.height(); // plot-fold
	    var plotLineH = Number(plotEl.css('line-height').split('px')[0]);
	    if(plotConH > (plotLineH * len)){
	    	parentEl.addClass('plot-fold')
	    }
	})(3);
})(window, document);