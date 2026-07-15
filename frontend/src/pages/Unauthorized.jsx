import { useNavigate } from 'react-router-dom'

export default function Unauthorized() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary, #0f172a)',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: 'var(--font, Inter, sans-serif)',
    }}>
      <div style={{
        fontSize: '4rem',
        lineHeight: 1,
        marginBottom: '1rem',
      }}>🚫</div>

      <h1 style={{
        fontSize: '1.75rem',
        fontWeight: 700,
        color: '#f1f5f9',
        marginBottom: '0.5rem',
      }}>
        Access Denied
      </h1>

      <p style={{
        color: '#94a3b8',
        fontSize: '0.95rem',
        maxWidth: 360,
        marginBottom: '2rem',
        lineHeight: 1.6,
      }}>
        You don't have permission to view this page. Contact your administrator if you believe this is an error.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          id="unauthorized-go-back"
          onClick={() => navigate(-1)}
          style={{
            padding: '0.6rem 1.4rem',
            borderRadius: 8,
            border: '1px solid rgba(99,102,241,0.4)',
            background: 'rgba(99,102,241,0.15)',
            color: '#818cf8',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          ← Go Back
        </button>
        <button
          id="unauthorized-go-home"
          onClick={() => navigate('/')}
          style={{
            padding: '0.6rem 1.4rem',
            borderRadius: 8,
            border: 'none',
            background: '#6366f1',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          Go Home
        </button>
      </div>
    </div>
  )
}
