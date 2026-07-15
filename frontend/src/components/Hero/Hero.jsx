import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="container hero-inner">
        <div className="hero-content">
          <div className="hero-badge" aria-label="Department unit">
            <span className="hero-badge-dot" aria-hidden="true" />
            Digital Enterprise · DE-BP3
          </div>

          <h1 id="hero-heading">
            Driving Digital<br />
            <span>Enterprise</span><br />
            Excellence
          </h1>

          <p className="hero-desc">
            DE-BP3 is the Digital Enterprise department responsible for architecting, deploying, and managing enterprise business platforms. We partner with stakeholders across finance, HR, supply chain, and operations to translate complex business requirements into robust digital solutions.
          </p>

          <div className="hero-actions">
            <Link to="/dashboard" className="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              View Dashboard
            </Link>
            <a href="#about" className="btn btn-outline">
              Learn More
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {/* <div className="hero-meta">
            <div className="hero-meta-item">
              <span className="hero-meta-val">50+</span>
              <span className="hero-meta-label">Active Projects</span>
            </div>
            <div className="hero-meta-divider" aria-hidden="true" />
            <div className="hero-meta-item">
              <span className="hero-meta-val">200+</span>
              <span className="hero-meta-label">Deliveries</span>
            </div>
            <div className="hero-meta-divider" aria-hidden="true" />
            <div className="hero-meta-item">
              <span className="hero-meta-val">95%</span>
              <span className="hero-meta-label">SLA Compliance</span>
            </div>
          </div> */}
        </div>

        <div className="hero-visual" aria-hidden="true">
          <HeroIllustration />
        </div>
      </div>
    </section>
  )
}

function HeroIllustration() {
  return (
    <svg viewBox="0 0 440 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="hero-illustration">
      {/* Background grid */}
      <defs>
        <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#E5E7EB" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="440" height="400" fill="url(#grid)" rx="16" />

      {/* Main dashboard card */}
      <rect x="32" y="32" width="376" height="240" rx="12" fill="white" stroke="#E5E7EB" strokeWidth="1.5"/>

      {/* Card header bar */}
      <rect x="32" y="32" width="376" height="44" rx="12" fill="#1F4E79"/>
      <rect x="32" y="64" width="376" height="12" fill="#1F4E79"/>
      <circle cx="56" cy="54" r="5" fill="rgba(255,255,255,0.3)"/>
      <circle cx="72" cy="54" r="5" fill="rgba(255,255,255,0.3)"/>
      <circle cx="88" cy="54" r="5" fill="rgba(255,255,255,0.3)"/>
      <rect x="108" y="49" width="140" height="10" rx="3" fill="rgba(255,255,255,0.15)"/>

      {/* KPI mini cards */}
      <rect x="48" y="96" width="80" height="52" rx="7" fill="#F7F9FC" stroke="#E5E7EB" strokeWidth="1"/>
      <rect x="60" y="107" width="40" height="6" rx="2" fill="#D1D5DB"/>
      <rect x="60" y="120" width="28" height="10" rx="2" fill="#1F4E79"/>
      <rect x="60" y="135" width="20" height="4" rx="2" fill="#10B981"/>

      <rect x="140" y="96" width="80" height="52" rx="7" fill="#F7F9FC" stroke="#E5E7EB" strokeWidth="1"/>
      <rect x="152" y="107" width="40" height="6" rx="2" fill="#D1D5DB"/>
      <rect x="152" y="120" width="28" height="10" rx="2" fill="#3B82F6"/>
      <rect x="152" y="135" width="20" height="4" rx="2" fill="#10B981"/>

      <rect x="232" y="96" width="80" height="52" rx="7" fill="#F7F9FC" stroke="#E5E7EB" strokeWidth="1"/>
      <rect x="244" y="107" width="40" height="6" rx="2" fill="#D1D5DB"/>
      <rect x="244" y="120" width="28" height="10" rx="2" fill="#8B5CF6"/>
      <rect x="244" y="135" width="20" height="4" rx="2" fill="#EF4444"/>

      <rect x="324" y="96" width="72" height="52" rx="7" fill="#F7F9FC" stroke="#E5E7EB" strokeWidth="1"/>
      <rect x="334" y="107" width="36" height="6" rx="2" fill="#D1D5DB"/>
      <rect x="334" y="120" width="24" height="10" rx="2" fill="#F59E0B"/>
      <rect x="334" y="135" width="18" height="4" rx="2" fill="#10B981"/>

      {/* Line chart area */}
      <rect x="48" y="162" width="220" height="96" rx="7" fill="#F7F9FC" stroke="#E5E7EB" strokeWidth="1"/>
      <rect x="60" y="170" width="80" height="6" rx="2" fill="#D1D5DB"/>
      {/* Chart line */}
      <polyline points="68,238 88,220 108,228 128,210 148,215 168,198 188,204 208,190 228,196 248,182" stroke="#3B82F6" strokeWidth="2" fill="none"/>
      <path d="M68,238 88,220 108,228 128,210 148,215 168,198 188,204 208,190 228,196 248,182 V 248 H 68 Z" fill="rgba(59,130,246,0.08)"/>

      {/* Pie chart circle */}
      <rect x="280" y="162" width="116" height="96" rx="7" fill="#F7F9FC" stroke="#E5E7EB" strokeWidth="1"/>
      <rect x="290" y="170" width="60" height="6" rx="2" fill="#D1D5DB"/>
      <circle cx="338" cy="220" r="26" stroke="#E5E7EB" strokeWidth="2" fill="white"/>
      <path d="M338,220 L338,194 A26,26 0 0,1 362,220 Z" fill="#1F4E79"/>
      <path d="M338,220 L362,220 A26,26 0 0,1 320,241 Z" fill="#3B82F6"/>
      <path d="M338,220 L320,241 A26,26 0 0,1 314,194 Z" fill="#8B5CF6"/>
      <path d="M338,220 L314,194 A26,26 0 0,1 338,194 Z" fill="#10B981"/>

      {/* Bottom bar chart */}
      <rect x="48" y="272" width="376" height="100" rx="7" fill="#F7F9FC" stroke="#E5E7EB" strokeWidth="1"/>
      <rect x="60" y="282" width="80" height="6" rx="2" fill="#D1D5DB"/>
      {[0,1,2,3,4,5,6,7].map((i) => {
        const heights = [42, 58, 36, 64, 48, 52, 38, 56]
        const h = heights[i]
        return (
          <rect key={i} x={72 + i * 44} y={352 - h} width="28" height={h} rx="3"
            fill={i % 3 === 0 ? '#1F4E79' : i % 3 === 1 ? '#3B82F6' : '#93C5FD'}/>
        )
      })}

      {/* Floating accent dots */}
      <circle cx="408" cy="28" r="10" fill="#3B82F6" opacity="0.15"/>
      <circle cx="24" cy="380" r="14" fill="#1F4E79" opacity="0.12"/>
      <circle cx="420" cy="295" r="6" fill="#10B981" opacity="0.3"/>
    </svg>
  )
}
