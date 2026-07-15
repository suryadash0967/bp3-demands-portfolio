import { useState, useEffect, useRef } from 'react'

function useCounter(target, duration = 1800, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    const startTime = performance.now()
    const tick = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration, start])
  return count
}

function StatItem({ value, suffix = '', label }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)
  const count = useCounter(value, 1600, visible)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold: 0.4 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div className="stat-card" ref={ref}>
      <div className="stat-value">{count}<span>{suffix}</span></div>
      <div className="stat-divider" aria-hidden="true" />
      <div className="stat-label">{label}</div>
    </div>
  )
}

const stats = [
  { value: 52, suffix: '+', label: 'Active Projects' },
  { value: 240, suffix: '+', label: 'Completed Deliveries' },
  { value: 6, suffix: '', label: 'Team Members' },
  { value: 18, suffix: '', label: 'Business Applications' },
]

export default function Stats() {
  return (
    <section className="stats-section" aria-labelledby="stats-heading">
      <div className="container">
        <p className="section-label">By the numbers</p>
        <h2 id="stats-heading">Department at a Glance</h2>
        <div className="stats-grid" role="list">
          {stats.map(s => (
            <StatItem key={s.label} {...s} />
          ))}
        </div>
      </div>
    </section>
  )
}
