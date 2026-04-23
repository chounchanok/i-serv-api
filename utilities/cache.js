const moment = require('moment');
const cache = require('memory-cache');
const memCache = new cache.Cache();

module.exports = cacheMiddleware = (duration = 1) => {
  return (req, res, next) => {
    let key = 'cache' + (req.originalUrl || req.url).split('/').join('_')
    let cacheContent = memCache.get(key);
    if (cacheContent) {
      res.send(JSON.parse(cacheContent));
      return
    } else {
      res.sendResponse = res.send
      res.send = (body) => {
        var setDate = new Date();
        var expire = new Date().setTime(setDate.getTime() + (duration * 1000));
        body.expire = new Date(expire).toUTCString();
        memCache.put(key, body, duration * 1000);
        res.sendResponse(body)
      }
      next()
    }
  }
}
