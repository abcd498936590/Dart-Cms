const { MongoClient } = require('mongodb');
// const { randomBytes } = require('crypto');
const log = console.log;

class MongoStore {
  constructor (opts) {
    this.init(opts)
  }

  async init ({
    dbName,
    options = { useNewUrlParser: true },
    host,
    port = 27017,
    collection = 'koa__session',
    maxAge = 86400, // 默认一天
  }) {
    try {
      const connectUrl = `mongodb://${host}:${port}/admin`;

      const client = await MongoClient.connect(connectUrl, options)
      const db = client.db(dbName);

      console.log('token => session 数据库连接成功！');

      this.coll = await db.createCollection(collection)
      const isExist = await this.coll.indexExists(['session__idx'])
      const isExistIp = await this.coll.indexExists(['session__ip'])
      const isExistSid = await this.coll.indexExists(['session__sid'])

      if (!isExist) {
        this.coll.createIndex(
          { lastAccess: 1 },
          { name: 'session_idx', expireAfterSeconds: maxAge }
        )
      }
      if(!isExistIp){
        this.coll.createIndex(
          { ip: 1 }
        )
      }
      if(!isExistSid){
        this.coll.createIndex(
          { sid: 1 },
          { unique: true }
        )
      }
    } catch (e) {
      log(e.message)
    }
  }

  getID(length) {
    return randomBytes(length).toString('hex');
  }

  async get (sid) {
    try {
      let doc = await this.coll.findOne({ sid: sid })
      return doc ? doc.session : undefined
    } catch (e) {
      log(e.message)
    }
  }

  async set (session, { sid, ip }) {    // sid = this.getID(24)
    try {
      await this.coll.updateOne(
        { sid: sid },
        {
          $set: {
            sid: sid,
            ip: ip,
            session: session,
            lastAccess: new Date()
          }
        },
        { upsert: true }
      )
    } catch (e) {
      log(e.message)
    }
    return sid
  }

  async destroy (sid) {
    try {
      await this.coll.deleteOne({ sid: sid })
    } catch (e) {
      log(e.message)
    }
  }
}

module.exports = MongoStore