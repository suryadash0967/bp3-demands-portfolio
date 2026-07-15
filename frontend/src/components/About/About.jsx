const features = [
  {
    title: 'Innovation',
    desc: 'Championing emerging technologies and intelligent automation to modernize legacy workflows and unlock new operational value.',
    color: '#EEF4FF',
    iconColor: '#3B82F6',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
        <path d="M5.22 5.22l2.12 2.12m9.32 9.32 2.12 2.12M5.22 18.78l2.12-2.12m9.32-9.32 2.12-2.12"/>
      </svg>
    ),
  },
  {
    title: 'Process Excellence',
    desc: 'Applying structured delivery frameworks, lean methodologies, and continuous improvement to ensure every project meets the highest quality benchmarks.',
    color: '#F0FDF4',
    iconColor: '#10B981',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M9 12l2 2 4-4"/><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
      </svg>
    ),
  },
  {
    title: 'Business Impact',
    desc: 'Translating digital investments into measurable outcomes — cost reduction, accelerated cycle times, and improved stakeholder experience at scale.',
    color: '#FFF7ED',
    iconColor: '#F59E0B',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 17l4-8 4 4 4-6 4 4"/><path d="M21 21H3"/>
      </svg>
    ),
  },
]

const highlights = [
  'Enterprise-grade delivery with structured governance',
  'Cross-functional collaboration across business units',
  'Agile and SAFe delivery methodologies',
]

export default function About() {
  return (
    <section id="about" className="section" aria-labelledby="about-heading">
      <div className="container">
        <div className="about-inner">
          <div className="about-text">
            <p className="section-label">Who We Are</p>
            <h2 id="about-heading" className="section-title">Built to Deliver at Enterprise Scale</h2>
            <p>
              DE-BP3 is the Digital Enterprise department responsible for architecting, deploying, and
              managing enterprise business platforms. We partner with stakeholders across finance, HR,
              supply chain, and operations to translate complex business requirements into robust digital solutions.
            </p>
            <p>
              Our team combines deep technical expertise with a customer-centric delivery model - ensuring
              every engagement is aligned to strategic business value and executed with operational precision.
            </p>
            <div className="about-highlights">
              {highlights.map(h => (
                <div className="about-highlight-item" key={h}>
                  <div className="about-highlight-icon">
                    <svg viewBox="0 0 12 12" fill="none" stroke="#3B82F6" strokeWidth="2" aria-hidden="true">
                      <path d="M2 6l3 3 5-5"/>
                    </svg>
                  </div>
                  <p style={{ color: 'var(--text)', fontSize: '0.875rem' }}>{h}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="about-image-block" aria-hidden="true">
            <svg viewBox="0 0 380 320" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="380" height="320" rx="14" fill="#F7F9FC" stroke="#E5E7EB" strokeWidth="1.5"/>
              <rect x="24" y="24" width="332" height="48" rx="8" fill="#1F4E79" opacity="0.08"/>
              <rect x="36" y="38" width="90" height="20" rx="4" fill="#1F4E79" opacity="0.5"/>
              <rect x="140" y="42" width="60" height="12" rx="3" fill="#E5E7EB"/>
              <rect x="24" y="90" width="155" height="100" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="1"/>
              <rect x="34" y="102" width="60" height="8" rx="2" fill="#D1D5DB"/>
              <rect x="34" y="118" width="40" height="16" rx="3" fill="#1F4E79" opacity="0.8"/>
              <rect x="34" y="144" width="70" height="6" rx="2" fill="#10B981" opacity="0.6"/>
              <rect x="34" y="158" width="50" height="6" rx="2" fill="#E5E7EB"/>
              <rect x="195" y="90" width="161" height="100" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="1"/>
              <rect x="207" y="102" width="60" height="8" rx="2" fill="#D1D5DB"/>
              <polyline points="210,175 225,155 240,163 255,145 270,150 285,135 300,142 315,128 330,134 342,120" stroke="#3B82F6" strokeWidth="2" fill="none"/>
              <path d="M210,175 225,155 240,163 255,145 270,150 285,135 300,142 315,128 330,134 342,120 V 180 H 210 Z" fill="rgba(59,130,246,0.07)"/>
              <rect x="24" y="208" width="332" height="88" rx="8" fill="white" stroke="#E5E7EB" strokeWidth="1"/>
              <rect x="36" y="220" width="80" height="8" rx="2" fill="#D1D5DB"/>
              {[0,1,2,3,4,5].map(i => (
                <rect key={i} x={48 + i * 52} y={270 - [30,45,24,52,36,42][i]} width="34" height={[30,45,24,52,36,42][i]} rx="3"
                  fill={['#1F4E79','#3B82F6','#93C5FD','#1F4E79','#3B82F6','#93C5FD'][i]} opacity="0.85"/>
              ))}
            </svg>
          </div>
        </div>

        <div className="feature-cards" role="list">
          {features.map(f => (
            <article className="feature-card" key={f.title} role="listitem">
              <div className="feature-icon" style={{ background: f.color }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={f.iconColor} strokeWidth="1.8" aria-hidden="true">
                  {f.icon.props.children}
                </svg>
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
