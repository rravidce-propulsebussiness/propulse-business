const express = require('express')
const controller = require('../controllers/investorPayoutAccountController')
const requireAuth = require('../middleware/authMiddleware')

const router = express.Router()
router.use(requireAuth)
router.get('/', controller.get)
router.post('/', controller.save)

module.exports = router
