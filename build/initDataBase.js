const mongodb = require('mongodb'),
MongoClient = mongodb.MongoClient,
config = require('../utils/config.js'),
dbConfig = config.project;

let connectURL = 'mongodb://127.0.0.1:27017';

let client = MongoClient.connect(connectURL, { useNewUrlParser: true, useUnifiedTopology: true });

client.then(async (db) => {

    let DB = db.db(dbConfig.dbName);

    await new Promise(async (resolve, reject) => {

        console.log('正在清除原始数据表');
        await DB.dropCollection('article_info').catch(err => {});
        await DB.dropCollection('article_list').catch(err => {});
        await DB.dropCollection('session1').catch(err => {});
        await DB.dropCollection('session2').catch(err => {});
        await DB.dropCollection('config').catch(err => {});
        await DB.dropCollection('logs').catch(err => {});
        await DB.dropCollection('message').catch(err => {});
        await DB.dropCollection('other').catch(err => {});
        await DB.dropCollection('user').catch(err => {});
        await DB.dropCollection('video_info').catch(err => {});
        await DB.dropCollection('video_list').catch(err => {});
        resolve()
    })
    .then(() => {
        console.log('原始数据表清除完成');
    })
    .catch(err => {
        console.log('+++', err);
    })

    await new Promise(async (resolve, reject) => {
        console.log('开始重建数据表');
        await DB.createCollection('article_info');
        await DB.createCollection('article_list');
        await DB.createCollection('session1');
        await DB.createCollection('session2');
        await DB.createCollection('config');
        await DB.createCollection('logs');
        await DB.createCollection('message');
        await DB.createCollection('other');
        await DB.createCollection('user');
        await DB.createCollection('video_info');
        await DB.createCollection('video_list');
        resolve()
    })
    .then(() => {
        console.log('数据表重建完成');
    })


	console.log('开始初始化数据库！');

    await new Promise(async (resolve, reject) => {
        console.log('开始创建文章数据');
        // 视频分类字段索引
        let videoInfoColl = DB.collection('article_info');
        await videoInfoColl.createIndexes([
            {key:{article_title: 1}},
            {key:{article_image: 1}},
            {key:{allow_reply: 1}},
            {key:{content_id: 1}},
            {key:{openSwiper: 1}},
            {key:{display: 1}}
        ]);
        resolve();
    })
    .then(res=>{
        console.log('文章数据创建完成');
    })

    await new Promise(async (resolve, reject) => {
        console.log('开始创建配置数据');
        // 源alias索引
        let confColl = DB.collection('config');
        await confColl.insertOne({
            "websiteName" : "XXX电影网",
            "keywords" : "最新电影,最新电视剧,最新综艺，最新动漫",
            "description" : "XXX电影网为您提供最新最快的视频分享数据。看热门电影,上春秋影院,支持手机电影在线观看。",
            "footerInfo" : "<p>XXX影视免费提供的完整版全集电影电视剧在线观看数据来自网络视频资源平台，本站未参与任何制作与下载，仅供WEB引用。</p><br/><p>Copyright © XXX影院XXX.COM</p>",
            "notice" : "<p>请勿相信视频中的广告</p>",
            "publicCode" : "",
            "openStatic" : false,
            "openSwiper" : false,
            "isBjTime" : true,
            "allowReply" : false,
            "replyInterval" : 5,
            "replyTextLen" : 20,
            "adoptCheck" : true,
            "allowRegister" : false,
            "shangeWebState" : true,
            "allowDomainAccess" : false,
            "allowDomainList" : "",
            "curPlayerPath" : 'dplayer',
            "filterKeyWord" : true,
            "KeyWordList" : "",
            "curTempPath" : "default",
            "openAppMainNotice" : true,
            "appUpgrade" : false,
            "upgradeInfo" : "",
            "appInitNoticeCon" : ""
        })
        resolve();
    })
    .then(res=>{
        console.log('配置数据创建完成');
    })

	await new Promise(async (resolve, reject) => {
        console.log('开始创建视频数据');
        // 视频分类字段索引
		let videoInfoColl = DB.collection('video_info');
        await videoInfoColl.createIndexes([
            {key:{video_type: 1}},
            {key:{rel_time: 1}},
            {key:{update_time: 1}},
            {key:{sub_region: 1}},
            {key:{language: 1}}
        ]);
        resolve();
	})
    .then(res=>{
        console.log('视频数据创建完成');
    })

    await new Promise(async (resolve, reject) => {
        console.log('开始创建日志数据');
        // 日志分类字段索引  一周
        let logsColl = DB.collection('logs');
        await logsColl.createIndex(
          { loginDate: 1 },
          { name: 'log_idx', expireAfterSeconds: 604800 }
        );
        resolve();
    })
    .then(res=>{
        console.log('日志数据创建完成');
    })

    await new Promise(async (resolve, reject) => {
        console.log('开始创建分类数据');
        // 视频分类字段索引
        let otherColl = DB.collection('other');
        // 分类 => 电影
        await otherColl.insertOne({
            name: '电影',
            parent_id: false,
            display: true,
            nav_type: 'video',
            seo: {
                title: '免费在线观看,电影',
                keywords: '功夫片，动作片，爱情片，福利片，科幻片，恐怖片，纪录片，战争片，微电影，喜剧片',
                description: '最新电影抢先看，vip电影'
            },
            type: 'nav_type',
            index: 0
        })
        .then(async (result) => {
            // 电影 => 子分类
            let pid = result.insertedId;
            await otherColl.insertMany([
                {
                    name: '动作片',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,电影',
                        keywords: '动作片',
                        description: '动作片'
                    },
                    type: 'nav_type',
                    index: 0
                },
                {
                    name: '喜剧片',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,电影',
                        keywords: '喜剧片',
                        description: '喜剧片'
                    },
                    type: 'nav_type',
                    index: 1
                },
                {
                    name: '爱情片',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,电影',
                        keywords: '爱情片',
                        description: '爱情片'
                    },
                    type: 'nav_type',
                    index: 2
                },
                {
                    name: '科幻片',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,电影',
                        keywords: '科幻片',
                        description: '科幻片'
                    },
                    type: 'nav_type',
                    index: 3
                },
                {
                    name: '恐怖片',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,电影',
                        keywords: '恐怖片',
                        description: '恐怖片'
                    },
                    type: 'nav_type',
                    index: 4
                },
                {
                    name: '剧情片',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,电影',
                        keywords: '剧情片',
                        description: '剧情片'
                    },
                    type: 'nav_type',
                    index: 5
                },
                {
                    name: '战争片',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,电影',
                        keywords: '战争片',
                        description: '战争片'
                    },
                    type: 'nav_type',
                    index: 6
                },
                {
                    name: '记录片',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,电影',
                        keywords: '记录片',
                        description: '记录片'
                    },
                    type: 'nav_type',
                    index: 7
                },
                {
                    name: '动画片',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,电影',
                        keywords: '动画片',
                        description: '动画片'
                    },
                    type: 'nav_type',
                    index: 8
                },
                {
                    name: '微电影',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,电影',
                        keywords: '微电影',
                        description: '微电影'
                    },
                    type: 'nav_type',
                    index: 9
                }
            ]);
        });
        // 分类 => 电视剧
        await otherColl.insertOne({
            name: '电视剧',
            parent_id: false,
            display: true,
            nav_type: 'video',
            seo: {
                title: '免费在线观看,电视剧',
                keywords: '最新美剧，热门韩剧，日剧，泰剧，国产剧，欧美剧',
                description: '最新电视剧抢先看，vip热剧'
            },
            type: 'nav_type',
            index: 1
        })
        .then(async (result) => {
            // 电视剧 => 子分类
            let pid = result.insertedId;
            await otherColl.insertMany([
                {
                    name: '国产剧',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,电视剧',
                        keywords: '国产剧',
                        description: '国产剧'
                    },
                    type: 'nav_type',
                    index: 0
                },
                {
                    name: '香港剧',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,电视剧',
                        keywords: '香港剧',
                        description: '香港剧'
                    },
                    type: 'nav_type',
                    index: 1
                },
                {
                    name: '韩国剧',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,电视剧',
                        keywords: '韩国剧',
                        description: '韩国剧'
                    },
                    type: 'nav_type',
                    index: 2
                },
                {
                    name: '欧美剧',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,电视剧',
                        keywords: '欧美剧',
                        description: '欧美剧'
                    },
                    type: 'nav_type',
                    index: 3
                },
                {
                    name: '台湾剧',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,电视剧',
                        keywords: '台湾剧',
                        description: '台湾剧'
                    },
                    type: 'nav_type',
                    index: 4
                },
                {
                    name: '日本剧',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,电视剧',
                        keywords: '日本剧',
                        description: '日本剧'
                    },
                    type: 'nav_type',
                    index: 5
                },
                {
                    name: '海外剧',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,电视剧',
                        keywords: '海外剧',
                        description: '海外剧'
                    },
                    type: 'nav_type',
                    index: 6
                },
            ]);
        });
        // 分类 => 综艺
        await otherColl.insertOne({
            name: '综艺',
            parent_id: false,
            display: true,
            nav_type: 'video',
            seo: {
                title: '免费在线观看,综艺',
                keywords: '热门综艺，日韩综艺，欧美综艺，港台综艺，内地综艺',
                description: '最新综艺抢先看'
            },
            type: 'nav_type',
            index: 2
        })
        .then(async (result) => {
            // 电视剧 => 子分类
            let pid = result.insertedId;
            await otherColl.insertMany([
                {
                    name: '内地综艺',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,综艺',
                        keywords: '内地综艺',
                        description: '内地综艺'
                    },
                    type: 'nav_type',
                    index: 0
                },
                {
                    name: '港台综艺',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,综艺',
                        keywords: '港台综艺',
                        description: '港台综艺'
                    },
                    type: 'nav_type',
                    index: 1
                },
                {
                    name: '欧美综艺',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,综艺',
                        keywords: '欧美综艺',
                        description: '欧美综艺'
                    },
                    type: 'nav_type',
                    index: 2
                },
                {
                    name: '日韩综艺',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,综艺',
                        keywords: '日韩综艺',
                        description: '日韩综艺'
                    },
                    type: 'nav_type',
                    index: 3
                }
            ]);
        });
        // 分类 => 动漫
        await otherColl.insertOne({
            name: '动漫',
            parent_id: false,
            display: true,
            nav_type: 'video',
            seo: {
                title: '免费在线观看,动漫',
                keywords: '国产动漫，日韩动漫，欧美动漫，港台动漫，海外动漫',
                description: '最新，热门动漫抢先看'
            },
            type: 'nav_type',
            index: 3
        })
        .then(async (result) => {
            // 电视剧 => 子分类
            let pid = result.insertedId;
            await otherColl.insertMany([
                {
                    name: '国产动漫',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,动漫',
                        keywords: '国产动漫',
                        description: '国产动漫'
                    },
                    type: 'nav_type',
                    index: 0
                },
                {
                    name: '日韩动漫',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,动漫',
                        keywords: '日韩动漫',
                        description: '日韩动漫'
                    },
                    type: 'nav_type',
                    index: 1
                },
                {
                    name: '欧美动漫',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,动漫',
                        keywords: '欧美动漫',
                        description: '欧美动漫'
                    },
                    type: 'nav_type',
                    index: 2
                },
                {
                    name: '港台动漫',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,动漫',
                        keywords: '港台动漫',
                        description: '港台动漫'
                    },
                    type: 'nav_type',
                    index: 3
                },
                {
                    name: '海外动漫',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,动漫',
                        keywords: '海外动漫',
                        description: '海外动漫'
                    },
                    type: 'nav_type',
                    index: 4
                },
                {
                    name: '大陆动漫',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,动漫',
                        keywords: '大陆动漫',
                        description: '大陆动漫'
                    },
                    type: 'nav_type',
                    index: 5
                },
                {
                    name: '日本动漫',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,动漫',
                        keywords: '日本动漫',
                        description: '日本动漫'
                    },
                    type: 'nav_type',
                    index: 6
                },
                {
                    name: '美国动漫',
                    parent_id: pid,
                    display: true,
                    nav_type: 'video',
                    seo: {
                        title: '免费在线观看,动漫',
                        keywords: '美国动漫',
                        description: '美国动漫'
                    },
                    type: 'nav_type',
                    index: 7
                }
            ]);
        });
        // 分类 => 福利
        await otherColl.insertOne({
            name: '福利',
            parent_id: false,
            display: true,
            nav_type: 'video',
            seo: {
                title: '免费在线观看,福利',
                keywords: '各种主播福利',
                description: '直播福利，大秀福利'
            },
            type: 'nav_type',
            index: 4
        });
        // 分类 => 伦理片
        await otherColl.insertOne({
            name: '伦理片',
            parent_id: false,
            display: false,
            nav_type: 'video',
            seo: {
                title: '免费在线观看,伦理片',
                keywords: '日韩伦理，欧美伦理',
                description: '最新最热伦理片'
            },
            type: 'nav_type',
            index: 5
        });
        // 资讯
        await otherColl.insertOne({
            name: '资讯',
            parent_id: false,
            display: true,
            nav_type: 'article',
            seo: {
                title: '新闻影视资讯大全',
                keywords: '电影资讯,电视剧资讯,影视资讯',
                description: '最新，热门动漫抢先看'
            },
            type: 'nav_type',
            index: 6
        })
        .then(async (result) => {
            // 资讯 => 子分类
            let pid = result.insertedId;
            await otherColl.insertMany([
                {
                    name: '公告',
                    parent_id: pid,
                    display: true,
                    nav_type: 'article',
                    seo: {
                        title: '公告',
                        keywords: '公告',
                        description: '公告'
                    },
                    type: 'nav_type',
                    index: 0
                },
                {
                    name: '新闻',
                    parent_id: pid,
                    display: true,
                    nav_type: 'article',
                    seo: {
                        title: '新闻影视资讯大全',
                        keywords: '新闻',
                        description: '新闻'
                    },
                    type: 'nav_type',
                    index: 1
                }
            ]);
        });
        resolve();
    })
    .then(res=>{
        console.log('分类数据创建完成');
    })

    await new Promise(async (resolve, reject) => {
        console.log('开始创建播放源数据');
        // 源alias索引
        let videoListColl = DB.collection('video_list');
        await videoListColl.createIndexes([
            {key:{vid: 1}},
            {key:{z_name: 1}},
        ]);
        resolve();
    })
    .then(res=>{
        console.log('播放源数据创建成功');
    })

    await new Promise(async (resolve, reject) => {
        console.log('开始创建留言数据');
        // 留言字段索引
        let msgColl =  DB.collection('message');
        await msgColl.createIndexes([
            {key:{vid: 1}},
            {key:{pid: 1}},
            {key:{uid: 1}},
            {key:{wid: 1}}
        ]);
        resolve();
    })
    .then(res=>{
        console.log('留言数据创建成功');
    })

    await new Promise(async (resolve, reject) => {
        console.log('开始创建用户数据');
        // 用户字段索引
        let userColl =  DB.collection('user');
        await userColl.createIndexes([
            {key:{userName: 1}},
            {key:{passWord: 1}},
            {key:{display: 1}},
            {key:{admin: 1}},
            {key:{grade_id: 1}},
            {key:{default: 1}}
        ]);
        await userColl.insertOne({
            userName: 'root',
            passWord: 'e10adc3949ba59abbe56e057f20f883e',  // 123456 md5
            nickName: '网站所有者',
            admin: true,
            display: true,
            roleData: {
                logs: {
                    removeLogs: true
                },
                video: {
                    removeVideo: true,
                    updateVideo: true,
                    addVideo: true
                },
                article: {
                    removeArticle: true,
                    updateArticle: true,
                    addArticle: true
                },
                script: {
                    runScript: true,
                    uploadScript: true,
                    updateScript: true,
                    removeScript: true
                },
                cron: {
                    createCron: true,
                    removeCron: true
                },
                user: {
                    addUser: true,
                    updateUser: true,
                    removeUser: true
                },
                nav_type: {
                    addNavType: true,
                    updateNavType: true,
                    removeNavType: true
                },
                message: {
                    inspectMessage: true,
                    removeMessage: true,
                    replyMessage: true
                },
                template: {
                    selectTemplate: true,
                    uploadTemplate: true,
                    updateTemplate: true,
                    removeTemplate: true
                },
                meal: {
                    addMeal: true,
                    removeMeal: true,
                    updateMeal: true
                },
                link: {
                    addLink: true,
                    removeLink: true,
                    updateLink: true
                },
                backup: {
                    execBackup: true,
                    downloadBackup: true,
                    removeBackup: true
                },
                config: {
                    updateConfig: true
                }
            },
            default: true,
            grade_id: 2,                                   // 0用户 1管理员 2root用户
        });
        resolve();
    })
    .then(res=>{
        console.log('用户数据创建成功');
    })

	console.log('数据库初始化操作完成！');

	db.close()

	process.exit();

}).catch((err) => {

	console.log(err);

	console.log('数据库初始化失败！');

	process.exit();

})