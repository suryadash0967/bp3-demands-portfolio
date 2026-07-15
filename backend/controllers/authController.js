import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 8 * 60 * 60 * 1000, // 8 hours in ms
}

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    // Verify password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' })
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user._id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    // Set httpOnly cookie
    res.cookie('token', token, cookieOptions)

    return res.status(200).json({ user: user.toPublicJSON() })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ message: 'Server error during login.' })
  }
}

// POST /api/auth/logout
export const logout = (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'strict' })
  return res.status(200).json({ message: 'Logged out successfully.' })
}

// GET /api/auth/me  (protected)
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password')
    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }
    return res.status(200).json({ user: user.toPublicJSON() })
  } catch (err) {
    console.error('GetMe error:', err)
    return res.status(500).json({ message: 'Server error.' })
  }
}
