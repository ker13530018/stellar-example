import axios from 'axios'
import StellarSdk from 'stellar-sdk'
import {
  getAssetAsync,
  getUserAsync,
  setUserAsync,
  checkTrustUserAsync,
  addTrustUserAsync,
} from '../redis'

import config from '../config'

const { server } = config

export const createWallet = async (req, res) => {
  const { username } = req.body
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

  const newUser = { ...user, wallet: true, ...stellarResponse }
  const updated = await setUserAsync(username, newUser)
  if (!updated) {
    return res.status(500).json({
      message: `Create ${username} fail`,
    })
  }

  return res.json({
    message: `Create ${username} success`,
    data: newUser,
  })
}

export const transfers = async (req, res) => {
  const { wallets: username } = req.params
  const { target, amount, asset } = req.body
  const user = await getUserAsync(username)
  if (!user) {
    return res.json({
      message: `Username ${username} not found`,
    })
  }

  const targetAccount = await getUserAsync(target)
  if (!targetAccount) {
    return res.json({
      message: `Username target ${username} is required`,
    })
  }

  const { publicKey, secretKey } = user
  // TODO : dynamic asset code and change
  let myAsset = StellarSdk.Asset.native()

  const tasks = []

  if (asset !== 'XLM' && asset !== 'native') {
    const issuerPublicKey = await getAssetAsync(asset)

    myAsset = new StellarSdk.Asset(asset, issuerPublicKey)

    // check trust target account
    const trusted = await checkTrustUserAsync(target, asset)

    if (!trusted) {
      const requestAccount = await server.loadAccount(targetAccount.publicKey)
      const trustTransaction = new StellarSdk.TransactionBuilder(requestAccount, {
        fee: StellarSdk.BASE_FEE,
      })
        .addOperation(
          StellarSdk.Operation.changeTrust({
            asset: myAsset,
          }),
        )
        .setTimeout(30)
        .build()

      trustTransaction.sign(StellarSdk.Keypair.fromSecret(targetAccount.secretKey))
      // Add send change trust
      tasks.push(server.submitTransaction(trustTransaction))
      // Add save trust asset to user data
      tasks.push(addTrustUserAsync(target, asset))
    }
  }

  const account = await server.loadAccount(publicKey)
  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: targetAccount.publicKey,
        asset: myAsset,
        amount: `${amount}`,
      }),
    )
    .setTimeout(30)
    .build()

  transaction.sign(StellarSdk.Keypair.fromSecret(secretKey))
  // Add send payment transaction task
  tasks.push(server.submitTransaction(transaction))
  try {
    const result = await Promise.all(tasks)
    return res.json({
      message: 'Transfer success',
      data: result,
    })
  } catch (e) {
    return res.json({
      message: 'Transfer error',
      data: e,
    })
  }
}
