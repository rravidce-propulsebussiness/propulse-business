const express = require('express')
const controller = require('../controllers/investorPayoutAccountController')
const { authenticate } = require('../middleware/auth')

const router = express.Router()
router.get('/', authenticate, controller.get)
router.post('/', authenticate, controller.save)

module.exports = router
