import React, { useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

function AdminDashboard() {
  const [rulesText, setRulesText] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');

  const handleRulesChange = (e) => {
    setRulesText(e.target.value);
  };

  const handleUpload = async () => {
    if (!rulesText.trim()) {
      setUploadMessage('Please enter or upload rules.');
      return;
    }
    try {
      const res = await axios.post('http://localhost:5000/api/knowledgeBase/batch', { rules: rulesText });
      setUploadMessage('Rules uploaded successfully.');
      setRulesText('');
    } catch (error) {
      setUploadMessage('Error uploading rules.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setRulesText(event.target.result);
    };
    reader.readAsText(file);
  };

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
        <h2>Admin Dashboard - Batch Knowledge Base Input</h2>
        <textarea
          rows="10"
          style={{ width: '100%', padding: 10, boxSizing: 'border-box' }}
          value={rulesText}
          onChange={handleRulesChange}
          placeholder="Enter knowledge base rules here..."
        />
        <input type="file" accept=".txt" onChange={handleFileChange} style={{ marginTop: 10 }} />
        <button onClick={handleUpload} style={{ marginTop: 10 }}>
          Upload Rules
        </button>
        {uploadMessage && <p>{uploadMessage}</p>}
      </div>
    </>
  );
}

export default AdminDashboard;
