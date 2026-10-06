import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

import Login from './screens/Login';
import ProfileSetup from './screens/ProfileSetup';
import Home from './screens/Home';
import Chat from './screens/Chat';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileExists, setProfileExists] = useState(false);
  const [signUpError, setSignUpError] = useState(''); // preserve error message across fast unmount/remount

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Small delay to handle rapid rollback scenarios where we momentarily have a user then it gets deleted
      // causing a unmount/remount of Login.
      setTimeout(async () => {
        setUser(currentUser);
        if (currentUser) {
          try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            setProfileExists(userDoc.exists());
          } catch (e) {
            console.error("Error checking profile", e);
            setProfileExists(false);
          }
        } else {
          setProfileExists(false);
        }
        setLoading(false);
      }, 50);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <div className="bg-blobs"></div>
      <div className="app-container">
        {signUpError && !user && (
          <div style={{
            position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--danger)', color: 'white', padding: '10px 20px', borderRadius: '8px', zIndex: 100
          }}>
            {signUpError}
            <button onClick={() => setSignUpError('')} style={{marginLeft: '10px', background: 'transparent', padding: '2px', fontSize: '12px'}}>X</button>
          </div>
        )}
        <Routes>
          {!user ? (
            <>
              <Route path="/login" element={<Login setSignUpError={setSignUpError} />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : !profileExists ? (
            <>
              <Route path="/setup" element={<ProfileSetup onSetupComplete={() => setProfileExists(true)} />} />
              <Route path="*" element={<Navigate to="/setup" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Home user={user} />} />
              <Route path="/chat/:chatId" element={<Chat user={user} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
