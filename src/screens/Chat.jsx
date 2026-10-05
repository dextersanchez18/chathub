import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, addDoc, getDocs, startAfter } from 'firebase/firestore';
import { db } from '../firebase';
import { useParams, useNavigate } from 'react-router-dom';
import { processImage } from '../utils/image';

const Chat = ({ user }) => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [friendProfile, setFriendProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!user || !chatId) return;

    // Load friend profile
    const loadData = async () => {
      try {
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        if (!chatDoc.exists() || !chatDoc.data().members.includes(user.uid)) {
          navigate('/');
          return;
        }

        const friendUid = chatDoc.data().members.find(uid => uid !== user.uid);
        const userDoc = await getDoc(doc(db, 'users', friendUid));
        if (userDoc.exists()) {
          setFriendProfile(userDoc.data());
        }
      } catch (err) {
        console.error("Error loading chat context", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Listen to latest messages
    const qMessages = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      const msgs = [];
      snapshot.forEach(docSnap => {
        msgs.push({ id: docSnap.id, ...docSnap.data() });
      });

      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      }
      if (snapshot.docs.length < 50) {
        setHasMore(false);
      }

      setMessages(msgs.reverse());
      // Small timeout to ensure DOM is updated before scrolling
      setTimeout(scrollToBottom, 100);
    });

    return () => unsubMessages();
  }, [chatId, user, navigate]);

  const loadOlderMessages = async () => {
    if (!lastVisible || !hasMore) return;

    try {
      const qOlder = query(
        collection(db, `chats/${chatId}/messages`),
        orderBy('createdAt', 'desc'),
        startAfter(lastVisible),
        limit(50)
      );

      const snapshot = await getDocs(qOlder);
      const olderMsgs = [];
      snapshot.forEach(docSnap => {
        olderMsgs.push({ id: docSnap.id, ...docSnap.data() });
      });

      if (snapshot.docs.length > 0) {
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      }
      if (snapshot.docs.length < 50) {
        setHasMore(false);
      }

      // Prepend older messages
      setMessages(prev => [...olderMsgs.reverse(), ...prev]);
    } catch (err) {
      console.error("Error loading older messages", err);
    }
  };

  const handleSendText = async (e) => {
    e.preventDefault();
    if (!text.trim() || text.length > 2000) return;

    setSending(true);
    try {
      await addDoc(collection(db, `chats/${chatId}/messages`), {
        senderId: user.uid,
        text: text.trim(),
        createdAt: new Date().toISOString()
      });
      setText('');
      scrollToBottom();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleSendImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSending(true);
    try {
      // 800px max
      const base64Img = await processImage(file, 800, false);

      await addDoc(collection(db, `chats/${chatId}/messages`), {
        senderId: user.uid,
        text: '',
        imageB64: base64Img,
        createdAt: new Date().toISOString()
      });
      scrollToBottom();
    } catch (err) {
      console.error("Image upload error", err);
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;
  }

  return (
    <div className="animate-fade-in app-container">
      <header className="glass-header" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => navigate('/')} style={{ padding: '8px 12px', fontSize: '14px', backgroundColor: 'transparent', border: '1px solid var(--glass-border)' }}>← Back</button>
        {friendProfile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src={friendProfile.photoB64} alt={friendProfile.displayName} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
            <div style={{ fontWeight: 'bold' }}>{friendProfile.displayName}</div>
          </div>
        )}
      </header>

      <main className="main-content" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
        {hasMore && (
          <button
            onClick={loadOlderMessages}
            style={{ alignSelf: 'center', margin: '1rem 0', padding: '6px 12px', fontSize: '12px', backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-light)' }}
          >
            Load Older
          </button>
        )}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' }}>
          {messages.map(msg => {
            const isMe = msg.senderId === user.uid;

            // Format time safely
            let timeString = '';
            if (msg.createdAt) {
              const date = new Date(msg.createdAt);
              if (!isNaN(date.getTime())) {
                timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              }
            }

            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <div
                  className="glass-panel"
                  style={{
                    padding: '0.75rem',
                    maxWidth: '80%',
                    backgroundColor: isMe ? 'rgba(94, 106, 210, 0.2)' : 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '16px',
                    borderBottomRightRadius: isMe ? '4px' : '16px',
                    borderBottomLeftRadius: !isMe ? '4px' : '16px',
                    // No blur here as per strict performance rules
                  }}
                >
                  {msg.imageB64 && (
                    <img
                      src={msg.imageB64}
                      alt="Sent image"
                      loading="lazy"
                      style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', marginBottom: msg.text ? '0.5rem' : '0', display: 'block' }}
                    />
                  )}
                  {msg.text && <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.text}</div>}
                  {timeString && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '4px' }}>{timeString}</div>}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="glass-nav" style={{ padding: '1rem' }}>
        <form onSubmit={handleSendText} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <label style={{ cursor: 'pointer', padding: '12px', backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span role="img" aria-label="Upload image">📷</span>
            <input type="file" accept="image/jpeg, image/png, image/webp" style={{ display: 'none' }} onChange={handleSendImage} disabled={sending} />
          </label>
          <input
            type="text"
            placeholder="Message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ flex: 1 }}
            disabled={sending}
            maxLength={2000}
          />
          <button type="submit" disabled={sending || !text.trim()}>Send</button>
        </form>
      </footer>
    </div>
  );
};

export default Chat;
