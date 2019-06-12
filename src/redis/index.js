import bluebird from 'bluebird'
import Redis from 'redis'

bluebird.promisifyAll(Redis.RedisClient.prototype)
bluebird.promisifyAll(Redis.Multi.prototype)

export const redis = Redis.createClient({
  host: '127.0.0.1',
  port: 6379,
})

redis.on('connect', () => {
  console.log('Redis client is already connected.')
})
