import express from 'express'
const router = express.Router()

// internal
import { users, createUser, getBalances } from './user'
import { createWallet } from './wallet'

router.get('/users', users)
router.post('/users', createUser)
router.get('/users/:username/balances', getBalances)

router.post('/wallets', createWallet)

export default router
