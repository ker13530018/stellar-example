import express from 'express'

// internal
import { users, createUser, getBalances } from './user'
import { createWallet, transfers } from './wallet'

const router = express.Router()
//
// user group
router.get('/users', users)
router.post('/users', createUser)
router.get('/users/:users/balances', getBalances)

//
// wallet group
router.post('/wallets', createWallet)
router.post('/wallets/:wallets/transfers', transfers)
export default router
