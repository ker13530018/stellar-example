import StellarSdk from 'stellar-sdk'
import {
  redis, getUserAsync, setUserAsync, checkExistsAsync,
} from '../redis'
import config from '../config'

const { server } = config

export const users = async (req, res) => {
  let counter = '0'
  let list = []

  do {
    const result = await redis.scanAsync(counter, 'MATCH', 'user:*')
    const [next, data] = result
    counter = next

    const tasks = []
    if (data && Array.isArray(data)) {
      data.forEach((key) => {
        tasks.push(redis.getAsync(key))
      })
    }

    const resultTasks = await Promise.all(tasks)
    const usersObj = resultTasks.map(item => JSON.parse(item))

    list = [...list, ...usersObj]
  } while (counter !== '0')

  res.json({
    message: 'get users success',
    data: list,
  })
}

export const createUser = async (req, res) => {
  const { username } = req.body
  if (!username) {
    return res.status(404).json({
      message: 'Username field is required',
    })
  }

  if (await checkExistsAsync(username)) {
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

  const result = await setUserAsync(username, user)
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
  const { users: username } = req.params
  if (!username) {
    return res.status(404).json({
      message: 'Username field is required',
    })
  }

  const user = await getUserAsync(username)
  if (!user) {
    return res.json({
      message: `Username ${username} not found`,
    })
  }

  const { publicKey } = user
  const account = await server.loadAccount(publicKey)

  const { balances } = account

  const data = balances.map(item => ({
    type: item.asset_type,
    code: item.asset_code || 'XLM',
    balance: parseFloat(item.balance),
  }))

  return res.json({
    message: 'get balances success',
    data,
  })
}
