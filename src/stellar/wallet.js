import axios from 'axios'
import redis from '../redis'

import config from '../config'

const { server } = config

export const createWallet = async (req, res) => {
  const { username } = req.body
  if (!username) {
    return res.status(404).json({
      message: 'Username field is required',
    })
  }

  const data = await redis.getAsync(`user:${username}`)
  if (!data) {
    return res.json({
      message: `Username ${username} not found`,
    })
  }
  let user = JSON.parse(data)

  const { wallet, publicKey } = user
  if (wallet) {
    return res.json({
      message: `Username ${username} is already has wallet`,
    })
  }
  //
  let result = {}
  try {
    const url = `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
    result = await axios.get(url)
  } catch (e) {
    return res.json({
      message: `Create ${username} addr error`,
      error: e,
    })
  }

  if (!result.data) {
    return res.json({
      message: `Create ${username} addr error`,
    })
  }

  const { data: stellarResponse } = result

  user = { ...user, wallet: true, ...stellarResponse }
  await redis.setAsync(`user:${username}`, JSON.stringify(user))

  return res.json({
    message: `Create ${username} success`,
    data: user,
  })
}

export const transfer = (req, res) => {}
