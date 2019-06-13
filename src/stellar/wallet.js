import axios from 'axios'
import StellarSdk from 'stellar-sdk'
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

export const transfers = async (req, res) => {
  const { wallets: username } = req.params
  const { target, amount, type } = req.body
  console.log('amount', amount)
  const data = await redis.getAsync(`user:${username}`)
  if (!data) {
    return res.json({
      message: `Username ${username} not found`,
    })
  }
  const user = JSON.parse(data)

  if (!target) {
    return res.json({
      message: `Username target ${username} is required`,
    })
  }
  const targetStr = await redis.getAsync(`user:${target}`)
  const targetAccount = JSON.parse(targetStr)

  const { publicKey, secretKey } = user
  // TODO : dynamic type
  // console.log('type', type)

  const account = await server.loadAccount(publicKey)
  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: targetAccount.publicKey,
        asset: StellarSdk.Asset.native(),
        amount: `${amount}`,
      }),
    )
    .setTimeout(30)
    .build()

  transaction.sign(StellarSdk.Keypair.fromSecret(secretKey))

  try {
    const transactionResult = await server.submitTransaction(transaction)
    return res.json({
      message: 'Transfer success',
      data: transactionResult,
    })
  } catch (e) {
    return res.json({
      message: 'Transfer error',
      data: e,
    })
  }
}
