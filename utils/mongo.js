const { MongoClient } = require('mongodb');

const {
	host,
	prot,
	dbName
} = require('./config').project;


module.exports = {

	MongoClass: async function(cb){

		let connectUrl = `mongodb://${host}:${prot}/admin`
		let client = MongoClient.connect(connectUrl, { useUnifiedTopology: true, useNewUrlParser: true });

		client.then(async (db) => {

			let DB = db.db(dbName);
			console.log('movie 数据库连接成功！');
			await cb(DB);

		}).catch((err) => {

			console.log('movie 数据库连接失败！', err.message);

		})
	}
}