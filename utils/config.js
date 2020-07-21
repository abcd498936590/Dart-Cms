module.exports = {
	project: {
		prot: 27017,
		host: '127.0.0.1',
		dbName: 'movie',
	},
	sessToken: {
		prot: 27017,
		host: '127.0.0.1',
		dbName: 'movie',
		collection: 'session2',
		maxAge: 86400,
	},
	sessCookie: {
		prot: 27017,
		host: '127.0.0.1',
		dbName: 'movie',
		collection: 'session1',
		maxAge: 86400,
	}
}