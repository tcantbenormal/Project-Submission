import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ReactComponent as SolarIcon } from '../assets/Solar.svg';
import { ReactComponent as GISIcon } from '../assets/GIS mapping.svg';
import { ReactComponent as ReportIcon } from '../assets/Report.svg';
import CanvasBackground from '../components/CanvasBackground/CanvasBackground';
import './LoginPage.css';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!name.trim()) {
          setError('Full name is required.');
          setLoading(false);
          return;
        }
        await register(email, password, name);
      }
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (tab) => {
    setIsLogin(tab === 'login');
    setError('');
  };

  return (
    <div className="login-page">
      <CanvasBackground />
      {/* Left branding panel */}
      <div className="login-branding">
        <img
          src="/assets/hx-logo.png"
          alt="HeraldX Logo"
          className="login-logo"
        />
        <h1>
          <span>Uncounted Solar</span>
          <br />
          Gigawatts
        </h1>
        <p>
          Visualize, analyze, and quantify solar energy potential across Pakistan's 
          urban landscape with advanced geospatial intelligence.
        </p>
        <div className="login-features">
          <div className="login-feature">
            <div className="login-feature-icon"><SolarIcon width="24" height="24" /></div>
            <span>Solar Analysis</span>
          </div>
          <div className="login-feature">
            <div className="login-feature-icon"><GISIcon width="24" height="24" /></div>
            <span>GIS Mapping</span>
          </div>
          <div className="login-feature">
            <div className="login-feature-icon"><ReportIcon width="24" height="24" /></div>
            <span>Reports</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-form-panel">
        <div className="login-form-container">
          <div className="login-tabs">
            <button
              id="login-tab"
              className={`login-tab ${isLogin ? 'active' : ''}`}
              onClick={() => switchTab('login')}
            >
              Sign In
            </button>
            <button
              id="signup-tab"
              className={`login-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => switchTab('signup')}
            >
              Sign Up
            </button>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  className="input"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@heraldx.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary login-submit"
              disabled={loading}
            >
              {loading ? (
                <span className="spinner" />
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
