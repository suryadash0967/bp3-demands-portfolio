import express from 'express'
import { getAllUsers } from '../controllers/userController.js'
import { verifyToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/roles.js'

const router = express.Router()

// Only department_head and division_head can see the full user list
router.get('/', verifyToken, requireRole(['department_head', 'division_head']), getAllUsers)

export default router
