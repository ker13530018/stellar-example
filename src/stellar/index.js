import express from 'express'
const router = express.Router()

// internal
import { createUser, getBalances } from './user'
import { createWallet } from './createWallet'

router.post('/users', createUser)
router.get('/users/:username/balances', getBalances)

router.post('/wallets', createWallet)

export default router
