import jwt from 'jsonwebtoken'

export const verifyToken = (req, res, next) => {
  const token = req.cookies?.token

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated. Please log in.' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded // { id, name, role, iat, exp }
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Session expired or invalid. Please log in again.' })
  }
}
