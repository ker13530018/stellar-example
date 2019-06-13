import StellarSdk from 'stellar-sdk'

const env = process.env.NODE_ENV || 'development'
let server = {}
let redisConfig = {}
if (env === 'development') {
  // Stellar config
  server = new StellarSdk.Server('https://horizon-testnet.stellar.org')
  StellarSdk.Network.useTestNetwork()
  // Redis config
  redisConfig = { host: '127.0.0.1', port: 6379 }
}

export default {
  server,
  env,
  redisConfig,
}
