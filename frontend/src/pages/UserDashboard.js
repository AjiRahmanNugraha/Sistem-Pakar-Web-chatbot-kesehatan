import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

function UserDashboard() {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [language, setLanguage] = useState('english');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    // Initialize SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language === 'english' ? 'en-US' : 'id-ID';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      console.warn('SpeechRecognition API not supported in this browser.');
    }
  }, [language]);

  useEffect(() => {
    // Speak bot responses using speech synthesis
    if (conversation.length > 0) {
      const lastMessage = conversation[conversation.length - 1];
      if (lastMessage.sender === 'bot') {
        const utterance = new SpeechSynthesisUtterance(lastMessage.text);
        utterance.lang = language === 'english' ? 'en-US' : 'id-ID';
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [conversation, language]);

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

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current && recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current && recognitionRef.current.start();
      setIsListening(true);
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
            disabled={isListening}
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
          disabled={isListening}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          <button onClick={handleSend} style={{ alignSelf: 'flex-end' }} disabled={isListening}>
            Send
          </button>
          <button onClick={toggleListening} style={{ alignSelf: 'flex-end' }}>
            {isListening ? 'Stop Listening' : 'Start Speaking'}
          </button>
        </div>
      </div>
    </>
  );
}

export default UserDashboard;
