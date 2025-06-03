const express = require('express');
const KnowledgeBase = require('../models/KnowledgeBase');
const router = express.Router();

// Get all knowledge base rules
router.get('/', async (req, res) => {
  try {
    const rules = await KnowledgeBase.find();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { rule } = req.body;
  try {
    if (Array.isArray(rule)) {
      // Insert multiple rules
      const rulesToInsert = rule.map(r => ({ rule: r }));
      const insertedRules = await KnowledgeBase.insertMany(rulesToInsert);
      res.status(201).json(insertedRules);
    } else {
      // Insert single rule
      const newRule = new KnowledgeBase({ rule });
      await newRule.save();
      res.status(201).json(newRule);
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
