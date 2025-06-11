const express = require('express');
const router = express.Router();
const Symptom = require('../models/Symptom');
const KnowledgeBase = require('../models/KnowledgeBase');

// Add a new symptom
router.post('/symptoms', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length < 3) {
    return res.status(400).json({ error: 'Nama gejala harus berupa teks minimal 3 karakter' });
  }
  try {
    const existing = await Symptom.findOne({ name: name.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Gejala sudah ada' });
    }
    const symptom = new Symptom({ name: name.trim().toLowerCase() });
    await symptom.save();
    return res.json({ message: 'Gejala berhasil ditambahkan', symptom });
  } catch (err) {
    console.error('Error adding symptom:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan internal' });
  }
});

// Add a new knowledge base rule
router.post('/knowledgebase', async (req, res) => {
  const { symptoms, diagnosis } = req.body;
  if (!Array.isArray(symptoms) || symptoms.length === 0) {
    return res.status(400).json({ error: 'Daftar gejala harus berupa array tidak kosong' });
  }
  if (!diagnosis || typeof diagnosis !== 'string' || diagnosis.trim().length < 3) {
    return res.status(400).json({ error: 'Diagnosis harus berupa teks minimal 3 karakter' });
  }
  try {
    const rule = new KnowledgeBase({
      symptoms: symptoms.map(s => s.trim().toLowerCase()),
      diagnosis: diagnosis.trim()
    });
    await rule.save();
    return res.json({ message: 'Aturan berhasil ditambahkan', rule });
  } catch (err) {
    console.error('Error adding knowledge base rule:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan internal' });
  }
});

// Batch upload knowledge base rules from text
router.post('/knowledgebase/batch', async (req, res) => {
  const { rulesText } = req.body;
  if (!rulesText || typeof rulesText !== 'string' || rulesText.trim().length === 0) {
    return res.status(400).json({ error: 'Rules text is required' });
  }

  const lines = rulesText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const addedRules = [];
  const errors = [];

  for (const line of lines) {
    // Parse line like: IF symptom1 AND symptom2 THEN diagnosis = 'DiagnosisName'
    const match = line.match(/^IF\s+(.+)\s+THEN\s+diagnosis\s*=\s*['"](.+)['"]$/i);
    if (!match) {
      errors.push({ line, error: 'Invalid format' });
      continue;
    }
    const symptomsPart = match[1];
    const diagnosis = match[2];

    const symptoms = symptomsPart.split(/\s+AND\s+/i).map(s => s.trim().toLowerCase());

    if (symptoms.length === 0 || !diagnosis) {
      errors.push({ line, error: 'Missing symptoms or diagnosis' });
      continue;
    }

    try {
      const rule = new KnowledgeBase({ symptoms, diagnosis });
      await rule.save();
      addedRules.push(rule);
    } catch (err) {
      errors.push({ line, error: err.message });
    }
  }

  return res.json({ addedRules, errors });
});

module.exports = router;
