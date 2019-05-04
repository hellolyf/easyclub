const router = require('koa-router')();
const config = require('../config');
const Promise = require('promise');
const Page = require('../common/page');
const sign = require('../middlewares/sign');
const upload = require('../common/upload');

router.get('/', async (ctx, next) => {

  let current_tag = config.tags.indexOf(ctx.query.tag ) > -1
      ? ctx.query.tag : 'all';

  // +号让其转换为数字
  let current_page = +ctx.query.page || 1;

  // 读取主题列表
  let Topic = ctx.model('topic');
  let User = ctx.model("user");
  let Reply = ctx.model('reply');

  // 组合查询对象
  let query = {deleted: false};

  if(current_tag != 'all')
    query.tag = current_tag;
  // 查询数据
  let [result, scoreRank] = await Promise.all([
    // 查询分页数据
    Topic.getTopicForPage(query, null, { sort: '-top -last_reply_at' }, current_page),
    // 排行榜数据
    User.find({ score: { $gt: 0 }, deleted: false }, 'username score avatar', {
      sort: '-score',
      limit: 10
    })
  ]);

  let topics = result.data;

  //  读取发帖及回帖用户信息
  topics = await Promise.all(topics.map( async (topic) => {
    topic.author = await User.findById(topic.author_id, 'username avatar');
    if(topic.last_reply) {
      topic.reply = await Reply.findById(topic.last_reply, 'author_id');
      topic.reply.author = await User.findById(topic.reply.author_id, 'username');
    }
    return topic;
  }));

  await ctx.render('index', {
    title: '首页',
    topics: topics,
    tags: config.tags,
    scoreRank: scoreRank,
    current_tag: current_tag,
    page: result.page
  }); 
});

router.post('upload', sign.isLogin, async (ctx) => {
  let file;
  try {
    file = await upload(ctx.req, 'file')
  } catch (e) {
    return ctx.error(e.message);
  }

  if(file) {
    return ctx.body = {
      success: true,
      url: path.join(config.upload.url, file.filename)
    };
  } else {
    return ctx.body = {
      success: false,
      msg: '上传失败!'
    }
  }
})

module.exports = router;
