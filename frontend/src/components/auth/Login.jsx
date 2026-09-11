import React, { useState, useEffect } from "react";
import API from "../../api.js";
import { useAuth } from "../../useAuth.js";
import { useNavigate, Link } from "react-router-dom";
import logo from "../../assets/github-mark-white.svg";
import "./auth.css";

const Login = () => {
  const { logout, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    logout();
  }, [logout]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      const res = await API.post("/login", {
        username: username.trim(),
        password,
      });

      login(res.data.token, res.data.userId);
      navigate("/");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <img className="auth-logo" src={logo} alt="GitHub Logo" />
          <h1 className="auth-title">Sign in to GitHub</h1>
        </div>

        <div className="auth-card">
          {error && <div className="auth-error-banner">{error}</div>}

          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-field">
              <label htmlFor="username">Username or email address</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="username or email"
              />
            </div>

            <div className="form-field">
              <div className="label-row">
                <label htmlFor="password">Password</label>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <div className="auth-footer-box">
          <p>
            New to GitHub? <Link to="/signup">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;