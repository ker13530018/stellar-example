import bluebird from 'bluebird'
import Redis from 'redis'
import config from '../config'

bluebird.promisifyAll(Redis.RedisClient.prototype)
bluebird.promisifyAll(Redis.Multi.prototype)

const { redisConfig } = config

export const redis = Redis.createClient({
  host: redisConfig.host,
  port: redisConfig.port,
})

redis.on('connect', () => {
  console.log('Redis client is already connected.')
})

export const setUserAsync = async (username, user) => {
  try {
    await redis.setAsync(`user:${username}`, JSON.stringify(user))
    return true
  } catch (e) {
    return false
  }
}

export const getUserAsync = async (username) => {
  const data = await redis.getAsync(`user:${username}`)
  if (!data) {
    return null
  }
  return JSON.parse(data)
}

export const checkTrustUserAsync = async (username, asset) => {
  const user = await redis.getAsync(`user:${username}`)
  const { assets } = JSON.parse(user)
  if (!assets || Array.isArray(assets)) {
    return false
  }

  const result = assets.filter(item => item === asset)
  return result > 0
}

export const addTrustUserAsync = async (username, asset) => {
  const str = await redis.getAsync(`user:${username}`)
  let { assets } = JSON.parse(str)
  const user = JSON.parse(str)
  if (!assets || Array.isArray(assets)) {
    assets = [asset]
  } else {
    assets.push(asset)
  }
  const newData = { ...user, assets }
  const result = await redis.setAsync(`user:${username}`, JSON.stringify(newData))
  return result
}

export const setAssetAsync = (asset, publicKey) => redis.setAsync(`asset:${asset}`, publicKey)

export const getAssetAsync = asset => redis.getAsync(`asset:${asset}`)

export const checkExistsAsync = async (username) => {
  const exists = await redis.existsAsync(`user:${username}`)
  if (exists && exists > 0) {
    return true
  }
  return false
}
