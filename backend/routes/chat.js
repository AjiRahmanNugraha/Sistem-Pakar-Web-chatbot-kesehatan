const express = require('express');
const router = express.Router();
const KnowledgeBase = require('../models/KnowledgeBase');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

router.post('/', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const rules = await KnowledgeBase.find({});
    const messageTokens = tokenizer.tokenize(message.toLowerCase()).map(token => stemmer.stem(token));

    let bestMatchRule = null;
    let bestMatchDiagnosis = null;
    let bestScore = 0;

    for (const ruleObj of rules) {
      const ruleText = ruleObj.rule.toLowerCase();
      const ruleTokens = tokenizer.tokenize(ruleText).map(token => stemmer.stem(token));

      let matches = 0;
      ruleTokens.forEach(rt => {
        if (messageTokens.includes(rt)) {
          matches++;
        }
      });
      const score = matches / ruleTokens.length;

    if (score > bestScore) {
      bestScore = score;
      bestMatchRule = ruleObj.rule;
      // Extract diagnosis from rule string, e.g. THEN diagnosis='disease'
      const diagnosisMatch = ruleObj.rule.match(/THEN diagnosis\s*=\s*['"]([^'"]+)['"]/i);
      bestMatchDiagnosis = diagnosisMatch ? diagnosisMatch[1] : ruleObj.rule;
    }
  }

    const threshold = 0.5;
    if (bestScore >= threshold) {
      return res.json({ response: `Diagnosis berdasarkan gejala: ${bestMatchDiagnosis}` });
    }

    return res.json({ response: "Maaf, saya tidak dapat menemukan diagnosis berdasarkan gejala yang Anda berikan." });

  } catch (err) {
    console.error('Chatbot error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
