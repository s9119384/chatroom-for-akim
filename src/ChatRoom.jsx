import React, { useState, useEffect } from 'react';

const ChatRoom = () => {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chatMessages');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [speaker, setSpeaker] = useState('阿庭');
  const [loading, setLoading] = useState(false);

  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  const shouldTriggerAI = input.includes('AI') || input.includes('助理') || input.includes('@AI');

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      content: `${speaker}：${input}`,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // 只有明確叫出 AI 時才回應
    if (!shouldTriggerAI) return;

    setLoading(true);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: '你是一個聊天室助手，能辨識並回應對話中的不同角色。角色包括阿庭和阿金，請根據上下文回應對話。' },
                ],
              },
              {
                role: 'user',
                parts: [{ text: `${speaker}：${input}` }],
              },
            ],
          }),
        }
      );

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || 'Unknown Gemini API error');
      }

      const aiMessage = {
        role: 'assistant',
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || '[⚠️ AI 沒有正確回應]',
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ 無法取得 AI 回應，請稍後再試。',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h2>阿庭與阿金聊天室 🤖</h2>

      <div style={{ marginBottom: 10 }}>
        <label>你是誰？</label>{' '}
        <select value={speaker} onChange={e => setSpeaker(e.target.value)}>
          <option value="阿庭">阿庭</option>
          <option value="阿金">阿金</option>
        </select>
      </div>

      <div
        style={{
          border: '1px solid #ccc',
          borderRadius: 8,
          padding: 10,
          height: 300,
          overflowY: 'auto',
          marginBottom: 10,
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              textAlign: msg.role === 'user' ? 'right' : 'left',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                backgroundColor: msg.role === 'user' ? '#cce5ff' : '#f1f1f1',
                padding: 8,
                borderRadius: 5,
                display: 'inline-block',
                maxWidth: '80%',
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.content}
            </span>
          </div>
        ))}
        {loading && <div>AI 正在回應中...</div>}
      </div>

      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') sendMessage();
        }}
        placeholder={`以 ${speaker} 的身分說點什麼`}
        disabled={loading}
        style={{
          width: '100%',
          padding: 10,
          fontSize: 16,
          borderRadius: 5,
          border: '1px solid #ccc',
        }}
      />
    </div>
  );
};

export default ChatRoom;
