// ChatRoom.jsx
import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

const ChatRoom = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [speaker, setSpeaker] = useState('阿庭');
  const [loading, setLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesRef = collection(db, 'messages');
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  const scrollRef = useRef(null);

  const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

  useEffect(() => {
    const q = query(messagesRef, orderBy('timestamp'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => doc.data());
      setMessages(fetchedMessages);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    const handleScroll = () => {
      const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 20;
      setShowScrollButton(!isAtBottom);
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    setShowScrollButton(false);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const Y = date.getFullYear();
    const M = String(date.getMonth() + 1).padStart(2, '0');
    const D = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${Y}/${M}/${D} ${h}:${m}:${s}`;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      speaker,
      content: input.trim(),
      timestamp: serverTimestamp(),
    };

    await addDoc(messagesRef, userMessage);
    setInput('');
  };

  const sendMessageToAI = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      speaker,
      content: input.trim(),
      timestamp: serverTimestamp(),
    };

    await addDoc(messagesRef, userMessage);
    setInput('');
    setLoading(true);

    try {
      const q = query(messagesRef, orderBy('timestamp'));
      const snapshot = await new Promise((resolve) => {
        const unsubscribe = onSnapshot(q, (snap) => {
          unsubscribe();
          resolve(snap);
        });
      });

      const allMessages = snapshot.docs.map((doc) => doc.data());
      const lastHundred = allMessages.slice(-100);

      const contents = [
        {
          role: 'user',
          parts: [
            {
              text: '你是一個聊天室助手，能辨識並回應對話中的不同角色。角色包括阿庭和阿金，請根據上下文回應對話。',
            },
          ],
        },
        ...lastHundred.map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          parts: [{ text: msg.content }], // 取消前綴，只留純內容
        })),
      ];

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'Unknown Gemini API error');

      const aiMessage = {
        role: 'assistant',
        speaker: 'AI',
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || '[⚠️ AI 沒有正確回應]',
        timestamp: serverTimestamp(),
      };

      await addDoc(messagesRef, aiMessage);
    } catch (error) {
      console.error('AI Error:', error);
      await addDoc(messagesRef, {
        role: 'assistant',
        speaker: 'AI',
        content: '⚠️ 無法取得 AI 回應，請稍後再試。',
        timestamp: serverTimestamp(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      await addDoc(messagesRef, {
        role: 'user',
        speaker,
        content: '',
        imageUrl: data.secure_url,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('圖片上傳錯誤:', error);
      alert('圖片上傳失敗，請稍後再試。');
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: 'auto',
        padding: 20,
        backgroundColor: '#6b6a6a',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h2 style={{ color: 'white', textAlign: 'center' }}>阿庭與阿金聊天室 🤖</h2>

      <div style={{ marginBottom: 10 }}>
        <label
          style={{ color: 'white', marginRight: 8, fontWeight: 'bold' }}
        >
          你是誰？
        </label>
        <select
          value={speaker}
          onChange={(e) => setSpeaker(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: 'none',
            fontSize: 16,
            backgroundColor: '#eeeeee',
          }}
        >
          <option value="阿庭">阿庭</option>
          <option value="阿金">阿金</option>
        </select>
      </div>

      <div
        ref={scrollRef}
        style={{
          position: 'relative',
          border: '1px solid #ccc',
          borderRadius: 8,
          padding: 10,
          height: 300,
          overflowY: 'auto',
          marginBottom: 10,
          backgroundColor: '#b0b0b0',
          flexGrow: 1,
        }}
      >
        {messages.map((msg, idx) => {
          const isMine = msg.speaker === speaker;
          const isAI = msg.role === 'assistant';
          let bgColor = '#f1f1f1';
          if (isAI) bgColor = '#fff59d';
          else if (msg.speaker === '阿庭') bgColor = '#90caf9';
          else if (msg.speaker === '阿金') bgColor = '#a5d6a7';

          const showSpeaker = isAI || (!isMine && msg.speaker);

          return (
            <div
              key={idx}
              style={{ textAlign: isMine ? 'right' : 'left', marginBottom: 14 }}
            >
              {showSpeaker && (
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 'bold',
                    color: '#333',
                    marginBottom: 2,
                  }}
                >
                  {msg.speaker}
                </div>
              )}
              <span
                style={{
                  backgroundColor: bgColor,
                  color: 'black',
                  padding: 8,
                  borderRadius: 12,
                  display: 'inline-block',
                  maxWidth: '80%',
                  whiteSpace: 'pre-wrap',
                  fontSize: 16,
                  lineHeight: 1.4,
                }}
              >
                {msg.content}
                {msg.imageUrl && (
                  <div style={{ marginTop: 8 }}>
                    <a href={msg.imageUrl} target="_blank" rel="noreferrer">
                      <img
                        src={msg.imageUrl}
                        alt="uploaded"
                        style={{ maxWidth: '100%', borderRadius: 12, cursor: 'pointer' }}
                      />
                    </a>
                  </div>
                )}
              </span>
              <div
                style={{
                  fontSize: 12,
                  color: '#555',
                  marginTop: 4,
                  textAlign: isMine ? 'right' : 'left',
                  userSelect: 'none',
                }}
              >
                {formatTimestamp(msg.timestamp)}
              </div>
            </div>
          );
        })}
        {loading && (
          <div
            style={{
              textAlign: 'center',
              marginTop: 10,
              fontWeight: 'bold',
              color: 'black',
            }}
          >
            AI 正在回應中...
          </div>
        )}
      </div>

      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          style={{
            alignSelf: 'center',
            marginBottom: 10,
            padding: '6px 12px',
            borderRadius: 20,
            backgroundColor: '#333',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ⬇ 查看最新訊息
        </button>
      )}

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') sendMessage();
        }}
        placeholder={`以 ${speaker} 的身分說點什麼`}
        disabled={loading}
        style={{
          width: '100%',
          padding: 10,
          fontSize: 16,
          borderRadius: 8,
          border: '1px solid #ccc',
          marginBottom: 10,
        }}
      />

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={sendMessage}
          disabled={loading}
          style={btnStyle('#2196f3', '#1976d2')}
        >
          送出訊息
        </button>
        <button
          onClick={sendMessageToAI}
          disabled={loading}
          style={btnStyle('#fbc02d', '#f9a825', true)}
        >
          送給 AI
        </button>
        <label
          htmlFor="imageUpload"
          style={btnStyle('#4caf50', '#388e3c', false, true)}
        >
          📷
          <input
            type="file"
            id="imageUpload"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={loading}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </div>
  );
};

const btnStyle = (bg, hover, blackText = false, circle = false) => ({
  flex: circle ? undefined : 1,
  backgroundColor: bg,
  color: blackText ? 'black' : 'white',
  padding: circle ? 10 : '10px 0',
  borderRadius: circle ? '50%' : 8,
  border: 'none',
  fontSize: 16,
  cursor: 'pointer',
  userSelect: 'none',
  display: 'inline-flex',
  justifyContent: 'center',
  alignItems: 'center',
  transition: 'background-color 0.3s ease',
  ...(circle ? { width: 42, height: 42 } : {}),
  ':hover': { backgroundColor: hover },
});

export default ChatRoom;
