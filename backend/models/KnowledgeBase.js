const mongoose = require('mongoose');

const knowledgeBaseSchema = new mongoose.Schema({
  rule: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('KnowledgeBase', knowledgeBaseSchema);
