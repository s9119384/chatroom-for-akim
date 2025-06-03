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
  const messagesRef = collection(db, 'messages');
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  const scrollRef = useRef(null);

  useEffect(() => {
    const q = query(messagesRef, orderBy('timestamp'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs.map((doc) => doc.data());
      setMessages(fetchedMessages);

      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });
    return () => unsubscribe();
  }, [messagesRef]);

  // 格式化時間函式，根據 timestamp 轉換成字串
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    // Firestore 的 timestamp 物件有 toDate() 方法
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
      content: `${speaker}：${input}`,
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
      content: `${speaker}：${input}`,
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
      const lastFifty = allMessages.slice(-50);

      const contents = [
        {
          role: 'user',
          parts: [
            {
              text:
                '你是一個聊天室助手，能辨識並回應對話中的不同角色。角色包括阿庭和阿金，請根據上下文回應對話。',
            },
          ],
        },
        ...lastFifty.map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          parts: [{ text: msg.content }],
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
        <label style={{ color: 'white', marginRight: 8, fontWeight: 'bold' }}>你是誰？</label>
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
          let bgColor = '#f1f1f1';

          if (msg.role === 'assistant') {
            bgColor = '#fff59d'; // AI 黃
          } else if (msg.speaker === '阿庭') {
            bgColor = '#90caf9'; // 阿庭藍
          } else if (msg.speaker === '阿金') {
            bgColor = '#a5d6a7'; // 阿金綠
          }

          return (
            <div
              key={idx}
              style={{
                textAlign: isMine ? 'right' : 'left',
                marginBottom: 12,
              }}
            >
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

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={sendMessage}
          disabled={loading}
          style={{
            flex: 1,
            backgroundColor: '#2196f3',
            color: 'white',
            fontSize: 18,
            padding: '12px 0',
            border: 'none',
            borderRadius: 25,
            cursor: 'pointer',
            userSelect: 'none',
            boxShadow: '0 3px 6px rgba(33, 150, 243, 0.4)',
            transition: 'background-color 0.3s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1976d2')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2196f3')}
        >
          送出訊息
        </button>
        <button
          onClick={sendMessageToAI}
          disabled={loading}
          style={{
            flex: 1,
            backgroundColor: '#fbc02d',
            color: 'black',
            fontSize: 18,
            padding: '12px 0',
            border: 'none',
            borderRadius: 25,
            cursor: 'pointer',
            userSelect: 'none',
            boxShadow: '0 3px 6px rgba(251, 192, 45, 0.4)',
            transition: 'background-color 0.3s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9a825')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fbc02d')}
        >
          送出給 AI
        </button>
      </div>
    </div>
  );
};

export default ChatRoom;
