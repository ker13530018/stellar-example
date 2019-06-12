import { redis } from '../redis'
import StellarSdk from 'stellar-sdk'
// import Promise from 'bluebird'

const server = new StellarSdk.Server('https://horizon-testnet.stellar.org')
StellarSdk.Network.useTestNetwork()

export const users = async (req, res) => {
  let next = '0'
  let users = []
  do {
    const result = await redis.scanAsync(parseInt(next), 'MATCH', 'user:*')
    next = result[0]
    const data = result[1]

    let tasks = []
    if (data && Array.isArray(data)) {
      data.forEach(key => {
        tasks.push(redis.getAsync(key))
      })
    }

    const _result = await Promise.all(tasks)
    const _users = _result.map(item => {
      return JSON.parse(item)
    })

    users = [...users, ..._users]
  } while (parseInt(next) != 0)

  res.json({
    message: 'get users success',
    data: users,
  })
}

export const createUser = async (req, res) => {
  const { username } = req.body
  if (!username) {
    return res.status(404).json({
      message: `Username field is required`,
    })
  }

  const exists = await redis.existsAsync(`user:${username}`)
  if (exists && exists > 0) {
    return res.json({
      message: `Username ${username} is already exists`,
    })
  }

  const keypair = StellarSdk.Keypair.random()
  const user = {
    username,
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
    wallet: false,
  }

  const result = await redis.setAsync(`user:${username}`, JSON.stringify(user))
  if (!result) {
    return res.status(500).json({
      message: `Create ${username} error`,
    })
  }

  return res.json({
    message: `Create ${username} success`,
  })
}

export const getBalances = async (req, res) => {
  const { username } = req.params
  if (!username) {
    return res.status(404).json({
      message: `Username field is required`,
    })
  }

  const userString = await redis.getAsync(`user:${username}`)
  if (!userString) {
    return res.json({
      message: `Username ${username} not found`,
    })
  }

  const user = JSON.parse(userString)
  const { publicKey } = user
  const account = await server.loadAccount(publicKey)

  const { balances } = account
  const data = balances.map(item => {
    return { type: item.asset_type, balance: item.balance }
  })

  return res.json({
    message: 'get balances success',
    data,
  })
}
