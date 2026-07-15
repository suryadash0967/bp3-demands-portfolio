import { Link } from 'react-router-dom'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div>
            <div className="footer-logo">
              <div className="footer-logo-mark" aria-hidden="true">
                <span>BP3</span>
              </div>
              <span className="footer-logo-text">DE-BP3</span>
            </div>
            <p className="footer-desc">
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Illo consequuntur officia praesentium maiores neque! Aut ipsa sint impedit inventore in.
            </p>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/dashboard">Dashboard</Link></li>
              <li><a href="#">Projects</a></li>
              <li><a href="#">Team</a></li>
              <li><a href="#">Reports</a></li>
            </ul>
          </div>

          {/* Department */}
          <div className="footer-col">
            <h4>Department</h4>
            <ul>
              <li><a href="#">About DE-BP3</a></li>
              <li><a href="#">Knowledge Base</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="footer-col footer-contact">
            <h4>Contact</h4>
            <p><strong>Department</strong><br />DE-BP3 · Digital Enterprise</p>
            <p><strong>Email</strong><br />de-bp3@company.com</p>
            <p><strong>Location</strong><br />Platinum Towers</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {year} DE-BP3 · Digital Enterprise. All rights reserved.</p>
          <div className="footer-bottom-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Use</a>
            <a href="#">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
