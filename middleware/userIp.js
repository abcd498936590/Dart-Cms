
module.exports = (ctx, next) => {

	return async (ctx, next) => {

		function getCientIp(){
			try{
				return ctx.request.ip.match(/\d+.\d+.\d+.\d+/)[0]
			}catch(err){
				return '127.0.0.1'
			}
		}

		let header = ctx.request.header;
		// nginx proxy || nodejs koa2 ipv4
		ctx.clientIp = header['x-nginx-proxy'] ? (header['x-forwarded-for'] || header['x-forwarded-for']) : getCientIp();
		// local || nginx proxy (insert header key)
		ctx.protocols = header.hasOwnProperty('x-proxy-protocol') ? header['x-proxy-protocol'] : 'http';

		await next();

	}

}