import StellarSdk from 'stellar-sdk'
import { getUserAsync, setAssetAsync } from '../redis'
import config from '../config'

const { server } = config

export const createAsset = async (req, res) => {
  const {
    issuer: issuerName, distributor: distributorName, asset, amount,
  } = req.body

  const issuer = await getUserAsync(issuerName)
  if (!issuer) {
    return res.json({
      message: `Username issuer ${issuerName} doesn't exists`,
    })
  }

  const distributor = await getUserAsync(distributorName)
  if (!distributor) {
    return res.json({
      message: `Username distributor ${distributorName} doesn't exists`,
    })
  }
  //
  // New Asset
  const newAsset = new StellarSdk.Asset(asset, issuer.publicKey)
  // Load account ditributor
  const distributorAccount = await server.loadAccount(distributor.publicKey)
  // Create change trust transaction
  const transaction = new StellarSdk.TransactionBuilder(distributorAccount, {
    fee: StellarSdk.BASE_FEE,
  })
    .addOperation(
      StellarSdk.Operation.changeTrust({
        asset: newAsset,
      }),
    )
    .setTimeout(30)
    .build()

  transaction.sign(StellarSdk.Keypair.fromSecret(distributor.secretKey))

  try {
    await server.submitTransaction(transaction)
  } catch (e) {
    return res.status(500).json({
      message: 'Change trust error',
      data: e,
    })
  }

  // Load account issuer
  const issuerAccount = await server.loadAccount(issuer.publicKey)
  const payment = new StellarSdk.TransactionBuilder(issuerAccount, {
    fee: StellarSdk.BASE_FEE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        asset: newAsset,
        amount: `${amount}`,
        destination: distributor.publicKey,
      }),
      StellarSdk.Operation.setOptions({
        masterWeight: 0,
        lowThreshold: 0,
        medThreshold: 0,
        highThreshold: 0,
      }),
    )
    .setTimeout(30)
    .build()

  payment.sign(StellarSdk.Keypair.fromSecret(issuer.secretKey))
  //
  try {
    const result = await server.submitTransaction(payment)

    await setAssetAsync(asset, issuer.publicKey)

    return res.json({
      message: 'Transfer success',
      data: result,
    })
  } catch (e) {
    return res.status(500).json({
      message: 'Transfer error',
      data: e,
    })
  }
}

export const changTrust = () => {}
