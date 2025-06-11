const mongoose = require('mongoose');

const knowledgeBaseSchema = new mongoose.Schema({
  symptoms: {
    type: [String],
    required: true,
  },
  diagnosis: {
    type: String,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('KnowledgeBase', knowledgeBaseSchema);
