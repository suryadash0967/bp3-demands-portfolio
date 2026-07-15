import User from '../models/User.js'

// GET /api/users  (department_head + division_head only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: 1 })
    return res.status(200).json({ users: users.map(u => u.toPublicJSON()) })
  } catch (err) {
    console.error('GetAllUsers error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}
