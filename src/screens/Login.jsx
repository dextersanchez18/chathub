import React, { useState } from 'react';
import { signUp, logIn } from '../utils/auth';

const Login = ({ setSignUpError }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await logIn(username, password);
      } else {
        await signUp(username, password);
      }
    } catch (err) {
      setError(err.message);
      if (!isLogin && setSignUpError) {
          setSignUpError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ padding: '2rem', width: '90%', maxWidth: '400px' }}>
        <h1 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>
        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isLogin ? 'Sign up' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
