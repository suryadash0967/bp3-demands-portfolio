/**
 * seed.js — Seeds the MongoDB database with 3 demo users (one per role).
 * Run: node seed.js  (from the /backend directory)
 *
 * Safe to run multiple times — existing users are skipped.
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from './models/User.js'
import connectDB from './db.js'

dotenv.config()

const demoUsers = [
  {
    name: 'Alice Member',
    email: 'member@bp3',
    password: 'member123',
    role: 'member',
  },
  {
    name: 'Bob Dept Head',
    email: 'depthead@bp3',
    password: 'dept123',
    role: 'department_head',
  },
  {
    name: 'Carol Division',
    email: 'division@bp3',
    password: 'div123',
    role: 'division_head',
  },
]

const seed = async () => {
  await connectDB()

  console.log('\n🌱 Seeding demo users...\n')

  for (const userData of demoUsers) {
    const existing = await User.findOne({ email: userData.email })
    if (existing) {
      console.log(`  ⏭  Skipped (already exists): ${userData.email}`)
      continue
    }

    const user = new User(userData)
    await user.save() // password hashed by pre-save hook
    console.log(`  ✅ Created [${user.role}]: ${user.email}`)
  }

  console.log('\n📋 Demo credentials:')
  console.log('  member@bp3.com     / member123  (Member)')
  console.log('  depthead@bp3.com   / dept123    (Department Head)')
  console.log('  division@bp3.com   / div123     (Division Head)\n')

  await mongoose.disconnect()
  console.log('✔ Done. Database connection closed.')
}

seed().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
