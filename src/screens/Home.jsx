import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc, } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

const Home = ({ user }) => {
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' or 'invites'
  const [friends, setFriends] = useState([]);
  const [invites, setInvites] = useState([]);
  const [addUsername, setAddUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingAdd, setLoadingAdd] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // Listen to incoming friend requests
    const qInvites = query(
      collection(db, 'friendRequests'),
      where('to', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsubInvites = onSnapshot(qInvites, async (snapshot) => {
      const invitesData = [];
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        try {
          const userDoc = await getDoc(doc(db, 'users', data.from));
          if (userDoc.exists()) {
            invitesData.push({
              id: docSnapshot.id,
              ...data,
              user: userDoc.data()
            });
          }
        } catch (e) {
          console.error("Error fetching user data for invite", e);
        }
      }
      setInvites(invitesData);
    });

    // To get friends, we look for accepted friend requests where user is either from or to
    const qFriendsFrom = query(
      collection(db, 'friendRequests'),
      where('from', '==', user.uid),
      where('status', '==', 'accepted')
    );
    const qFriendsTo = query(
      collection(db, 'friendRequests'),
      where('to', '==', user.uid),
      where('status', '==', 'accepted')
    );

    const handleFriendsSnapshot = async (snapshotFrom, snapshotTo) => {
      const friendsData = [];
      const processDocs = async (docs, friendIdField) => {
        for (const docSnapshot of docs) {
          const data = docSnapshot.data();
          const friendUid = data[friendIdField];
          try {
            const userDoc = await getDoc(doc(db, 'users', friendUid));
            if (userDoc.exists()) {
              friendsData.push({
                requestId: docSnapshot.id,
                uid: friendUid,
                ...userDoc.data()
              });
            }
          } catch (e) {
            console.error("Error fetching friend profile", e);
          }
        }
      };

      await processDocs(snapshotFrom.docs, 'to');
      await processDocs(snapshotTo.docs, 'from');

      // Deduplicate just in case
      const uniqueFriends = Array.from(new Map(friendsData.map(item => [item.uid, item])).values());
      setFriends(uniqueFriends);
    };

    let snapshotFrom = { docs: [] };
    let snapshotTo = { docs: [] };

    const unsubFriendsFrom = onSnapshot(qFriendsFrom, (snap) => {
      snapshotFrom = snap;
      handleFriendsSnapshot(snapshotFrom, snapshotTo);
    });

    const unsubFriendsTo = onSnapshot(qFriendsTo, (snap) => {
      snapshotTo = snap;
      handleFriendsSnapshot(snapshotFrom, snapshotTo);
    });

    return () => {
      unsubInvites();
      unsubFriendsFrom();
      unsubFriendsTo();
    };
  }, [user]);

  const handleAddFriend = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const targetUsername = addUsername.trim();
    if (!targetUsername) return;

    setLoadingAdd(true);

    try {
      // Find target user uid
      const usernameDoc = await getDoc(doc(db, 'usernames', targetUsername));
      if (!usernameDoc.exists()) {
        throw new Error("User not found");
      }

      const targetUid = usernameDoc.data().uid;

      if (targetUid === user.uid) {
        throw new Error("You cannot add yourself");
      }

      // Check for existing request or if already friends
      const requestId1 = `${user.uid}_${targetUid}`;
      const requestId2 = `${targetUid}_${user.uid}`;

      const req1 = await getDoc(doc(db, 'friendRequests', requestId1));
      const req2 = await getDoc(doc(db, 'friendRequests', requestId2));

      if (req1.exists() || req2.exists()) {
        throw new Error("Friend request already sent or you are already friends");
      }

      await setDoc(doc(db, 'friendRequests', requestId1), {
        from: user.uid,
        to: targetUid,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      setSuccess("Friend request sent!");
      setAddUsername('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAdd(false);
    }
  };

  const handleAccept = async (invite) => {
    try {
      await setDoc(doc(db, 'friendRequests', invite.id), { status: 'accepted' }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDecline = async (invite) => {
    try {
      await setDoc(doc(db, 'friendRequests', invite.id), { status: 'declined' }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  const startChat = async (friend) => {
    const sortedUids = [user.uid, friend.uid].sort();
    const chatId = `${sortedUids[0]}_${sortedUids[1]}`;

    // Check if chat exists, if not create it
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);

    if (!chatDoc.exists()) {
      await setDoc(chatRef, {
        members: sortedUids,
        createdAt: new Date().toISOString()
      });
    }

    navigate(`/chat/${chatId}`);
  };

  return (
    <div className="animate-fade-in app-container">
      <header className="glass-header" style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '600px' }}>
          <button
            style={{ flex: 1, backgroundColor: activeTab === 'friends' ? 'var(--accent)' : 'transparent', border: activeTab === 'friends' ? 'none' : '1px solid var(--glass-border)' }}
            onClick={() => setActiveTab('friends')}
          >
            Friends
          </button>
          <button
            style={{ flex: 1, backgroundColor: activeTab === 'invites' ? 'var(--accent)' : 'transparent', border: activeTab === 'invites' ? 'none' : '1px solid var(--glass-border)', position: 'relative' }}
            onClick={() => setActiveTab('invites')}
          >
            Invites {invites.length > 0 && <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--danger)', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: '0.8rem' }}>{invites.length}</span>}
          </button>
        </div>
      </header>

      <main className="main-content" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '600px' }}>
          {activeTab === 'friends' && (
            <>
              <form onSubmit={handleAddFriend} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  placeholder="Add friend by username..."
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" disabled={loadingAdd || !addUsername.trim()}>Add</button>
              </form>
              {error && <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>}
              {success && <p style={{ color: '#4caf50', marginBottom: '1rem', fontSize: '0.9rem' }}>{success}</p>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {friends.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No friends yet. Add some!</p>
                ) : (
                  friends.map(friend => (
                    <div key={friend.uid} className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => startChat(friend)}>
                      <img src={friend.photoB64} alt={friend.displayName} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{friend.displayName}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>@{friend.username}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === 'invites' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {invites.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No pending invites.</p>
              ) : (
                invites.map(invite => (
                  <div key={invite.id} className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src={invite.user.photoB64} alt={invite.user.displayName} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold' }}>{invite.user.displayName}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>@{invite.user.username}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleAccept(invite)} style={{ padding: '8px 12px', fontSize: '0.9rem' }}>Accept</button>
                      <button onClick={() => handleDecline(invite)} style={{ padding: '8px 12px', fontSize: '0.9rem', backgroundColor: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)' }}>Decline</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
