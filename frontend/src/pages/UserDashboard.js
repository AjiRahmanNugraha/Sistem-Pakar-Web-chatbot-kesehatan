import React, { useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

function UserDashboard() {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [language, setLanguage] = useState('english');

  const token = localStorage.getItem('token');

  const handleSend = async () => {
    if (!message.trim()) return;
    const userMessage = { sender: 'user', text: message };
    setConversation((prev) => [...prev, userMessage]);
    setMessage('');

    try {
      const res = await axios.post(
        'http://localhost:5000/api/chat',
        { message, language },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const botResponse = { sender: 'bot', text: res.data.response };
      setConversation((prev) => [...prev, botResponse]);
    } catch (error) {
      const errorResponse = { sender: 'bot', text: 'Error processing your request.' };
      setConversation((prev) => [...prev, errorResponse]);
    }
  };

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 600, margin: 'auto', padding: 20, display: 'flex', flexDirection: 'column', height: '90vh' }}>
        <h2>User Dashboard - Chat Diagnosis</h2>
        <div style={{ marginBottom: 10 }}>
          <label htmlFor="language-select">Select Language: </label>
          <select
            id="language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="english">English</option>
            <option value="indonesian">Indonesian</option>
          </select>
        </div>
        <div style={{ flexGrow: 1, border: '1px solid #ccc', overflowY: 'auto', padding: 10, marginBottom: 10, display: 'flex', flexDirection: 'column' }}>
          {conversation.map((msg, index) => (
            <div
              key={index}
              style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                margin: '10px 0',
                maxWidth: '80%',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  padding: '8px 12px',
                  borderRadius: 20,
                  backgroundColor: msg.sender === 'user' ? '#d1e7dd' : '#f8d7da',
                  wordWrap: 'break-word',
                }}
              >
                {msg.text}
              </span>
            </div>
          ))}
        </div>
        <textarea
          rows="3"
          style={{ width: '100%', padding: 10, resize: 'none', boxSizing: 'border-box' }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your symptoms here..."
        />
        <button onClick={handleSend} style={{ marginTop: 10, alignSelf: 'flex-end' }}>
          Send
        </button>
      </div>
    </>
  );
}

export default UserDashboard;
