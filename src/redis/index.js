import bluebird from 'bluebird'
import Redis from 'redis'
import config from '../config'

bluebird.promisifyAll(Redis.RedisClient.prototype)
bluebird.promisifyAll(Redis.Multi.prototype)

const { redisConfig } = config

const redis = Redis.createClient({
  host: redisConfig.host,
  port: redisConfig.port,
})

redis.on('connect', () => {
  console.log('Redis client is already connected.')
})

export default redis
