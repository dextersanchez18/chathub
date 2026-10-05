import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { processImage } from '../utils/image';

const ProfileSetup = ({ onSetupComplete }) => {
  const [displayName, setDisplayName] = useState('');
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setError('');
      const base64Img = await processImage(file, 256, true);
      setPhoto(base64Img);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    if (!photo) {
      setError('Profile photo is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = auth.currentUser;
      const username = user.email.split('@')[0];

      await setDoc(doc(db, 'users', user.uid), {
        username,
        displayName: displayName.trim(),
        photoB64: photo,
        createdAt: new Date().toISOString()
      });

      onSetupComplete();
    } catch (err) {
      setError('Failed to save profile: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ padding: '2rem', width: '90%', maxWidth: '400px' }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Complete Your Profile</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <label style={{ cursor: 'pointer', textAlign: 'center' }}>
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  margin: '0 auto 0.5rem'
                }}
              >
                {photo ? (
                  <img src={photo} alt="Profile preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>Upload DP</span>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg, image/png, image/webp"
                style={{ display: 'none' }}
                onChange={handleImageChange}
              />
            </label>
          </div>

          <div>
            <input
              type="text"
              placeholder="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={30}
            />
          </div>

          {error && <div className="error-text">{error}</div>}

          <button type="submit" disabled={loading || !photo || !displayName.trim()}>
            {loading ? 'Saving...' : 'Finish Setup'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
