import React, { useState } from 'react';
import API from '../../api.js';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Navbar';
import './createRepository.css';

const CreateRepository = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      await API.post('/repo/create', {
        name,
        description,
        visibility
      });
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create repository.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-repo-page">
      <Navbar />
      <div className="create-repo-wrapper">
        <div className="create-repo-header">
          <h2>Create a new repository</h2>
          <p className="create-repo-subtext">
            A repository contains all project files, including the revision history.
          </p>
        </div>

        <form className="create-repo-form" onSubmit={handleCreate}>
          {error && (
            <div className="form-error-banner">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="repo-name" className="form-label">
              Repository name <span className="required-star">*</span>
            </label>
            <input
              id="repo-name"
              className="form-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. my-awesome-project"
              autoComplete="off"
            />
            <p className="form-hint">
              Great repository names are short and memorable.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="repo-desc" className="form-label">
              Description <span className="optional-tag">(optional)</span>
            </label>
            <input
              id="repo-desc"
              className="form-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description of your repository"
            />
          </div>

          <div className="form-group visibility-section">
            <label className="form-label">Visibility</label>
            <div className="visibility-options">
              <div
                className={`visibility-option ${visibility ? 'active' : ''}`}
                onClick={() => setVisibility(true)}
              >
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === true}
                  onChange={() => setVisibility(true)}
                />
                <div className="visibility-icon">🌐</div>
                <div className="visibility-info">
                  <div className="visibility-title">Public</div>
                  <div className="visibility-desc">Anyone on the internet can see this repository.</div>
                </div>
              </div>

              <div
                className={`visibility-option ${!visibility ? 'active' : ''}`}
                onClick={() => setVisibility(false)}
              >
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === false}
                  onChange={() => setVisibility(false)}
                />
                <div className="visibility-icon">🔒</div>
                <div className="visibility-info">
                  <div className="visibility-title">Private</div>
                  <div className="visibility-desc">Only you can see and commit to this repository.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="create-repo-btn"
              disabled={loading || !name.trim()}
            >
              {loading ? 'Creating Repository...' : 'Create repository'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRepository;

