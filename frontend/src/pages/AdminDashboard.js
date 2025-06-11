import React, { useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

function AdminDashboard() {
  const [rulesText, setRulesText] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');

  const [symptomsInput, setSymptomsInput] = useState('');
  const [diagnosisInput, setDiagnosisInput] = useState('');
  const [addRuleMessage, setAddRuleMessage] = useState('');

  const handleRulesChange = (e) => {
    setRulesText(e.target.value);
  };

  const handleUpload = async () => {
    if (!rulesText.trim()) {
      setUploadMessage('Please enter or upload rules.');
      return;
    }
    try {
      const res = await axios.post('http://localhost:5000/api/admin/knowledgebase/batch', { rulesText });
      setUploadMessage(`Batch upload completed. Added: ${res.data.addedRules.length}, Errors: ${res.data.errors.length}`);
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

  const handleAddRule = async () => {
    if (!symptomsInput.trim() || !diagnosisInput.trim()) {
      setAddRuleMessage('Please enter both symptoms and diagnosis.');
      return;
    }
    const symptomsArray = symptomsInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
    if (symptomsArray.length === 0) {
      setAddRuleMessage('Please enter at least one symptom.');
      return;
    }
    try {
      const res = await axios.post('http://localhost:5000/api/admin/knowledgebase', {
        symptoms: symptomsArray,
        diagnosis: diagnosisInput.trim()
      });
      setAddRuleMessage('Knowledge base rule added successfully.');
      setSymptomsInput('');
      setDiagnosisInput('');
    } catch (error) {
      setAddRuleMessage('Error adding knowledge base rule.');
    }
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

        <h2 style={{ marginTop: 40 }}>Add Knowledge Base Rule</h2>
        <label>
          Symptoms (comma separated):
          <input
            type="text"
            value={symptomsInput}
            onChange={(e) => setSymptomsInput(e.target.value)}
            style={{ width: '100%', padding: 8, marginTop: 5, boxSizing: 'border-box' }}
            placeholder="e.g. itching, skin rash, nodal skin eruptions"
          />
        </label>
        <label style={{ display: 'block', marginTop: 15 }}>
          Diagnosis:
          <input
            type="text"
            value={diagnosisInput}
            onChange={(e) => setDiagnosisInput(e.target.value)}
            style={{ width: '100%', padding: 8, marginTop: 5, boxSizing: 'border-box' }}
            placeholder="e.g. Fungal infection"
          />
        </label>
        <button onClick={handleAddRule} style={{ marginTop: 15 }}>
          Add Rule
        </button>
        {addRuleMessage && <p>{addRuleMessage}</p>}
      </div>
    </>
  );
}

export default AdminDashboard;
