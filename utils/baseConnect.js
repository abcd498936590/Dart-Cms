const { MongoClient } = require('mongodb');

const {
	host,
	prot,
	dbName
} = require('./config').project;

let DB = null;

let connectUrl = `mongodb://${host}:${prot}/admin`
let client = MongoClient.connect(connectUrl, { useUnifiedTopology: true, useNewUrlParser: true });



client.then((db) => {

	DB = db.db(dbName);
	console.log('movie 数据库连接成功！');

}).catch((err) => {

	console.log('movie 数据库连接失败！', err.message);

})

module.exports = () => {
	return DB
}