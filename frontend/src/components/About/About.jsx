const highlights = [
  'Unified SAP and enterprise application integration',
  'AI-powered demand forecasting and predictive analytics',
  'Cross-functional collaboration across supply chain, finance, quality, and engineering',
]

export default function About() {
  return (
    <section id="about" className="section" aria-labelledby="about-heading">
      <div className="container">
        <div className="about-inner">
          <div className="about-text">
            <p className="section-label">Who We Are</p>

            <h2 id="about-heading" className="section-title">
              Driving Intelligent Enterprise Transformation
            </h2>

            <p>
              DE-BP3 is dedicated to orchestrating intelligent enterprise solutions that connect
              business processes, integrate SAP and enterprise platforms, and simplify
              complex operations through digital innovation. Our focus is on creating
              scalable systems that enhance collaboration, improve visibility, and enable
              smarter decision-making across the organization.
            </p>
          </div>

          <div className="about-image-block" aria-hidden="true">
            <svg viewBox="0 0 380 320" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="380" height="320" rx="14" fill="#F7F9FC" stroke="#E5E7EB" strokeWidth="1.5" />
              <rect x="24" y="24" width="332" height="48" rx="8" fill="#1F4E79" opacity="0.08" />
              <rect x="36" y="38" width="90" height="20" rx="4" fill="#1F4E79" opacity="0.5" />
              <rect x="140" y="42" width="60" height="12" rx="3" fill="#E5E7EB" />
              <rect x="24" y="90" width="155" height="100" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="1" />
              <rect x="34" y="102" width="60" height="8" rx="2" fill="#D1D5DB" />
              <rect x="34" y="118" width="40" height="16" rx="3" fill="#1F4E79" opacity="0.8" />
              <rect x="34" y="144" width="70" height="6" rx="2" fill="#10B981" opacity="0.6" />
              <rect x="34" y="158" width="50" height="6" rx="2" fill="#E5E7EB" />
              <rect x="195" y="90" width="161" height="100" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="1" />
              <rect x="207" y="102" width="60" height="8" rx="2" fill="#D1D5DB" />
              <polyline points="210,175 225,155 240,163 255,145 270,150 285,135 300,142 315,128 330,134 342,120" stroke="#3B82F6" strokeWidth="2" fill="none" />
              <path d="M210,175 225,155 240,163 255,145 270,150 285,135 300,142 315,128 330,134 342,120 V 180 H 210 Z" fill="rgba(59,130,246,0.07)" />
              <rect x="24" y="208" width="332" height="88" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="1" />
              <rect x="36" y="220" width="80" height="8" rx="2" fill="#D1D5DB" />
              {[0, 1, 2, 3, 4, 5].map(i => (
                <rect key={i} x={48 + i * 52} y={270 - [30, 45, 24, 52, 36, 42][i]} width="34" height={[30, 45, 24, 52, 36, 42][i]} rx="3"
                  fill={['#1F4E79', '#3B82F6', '#93C5FD', '#1F4E79', '#3B82F6', '#93C5FD'][i]} opacity="0.85" />
              ))}
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}
