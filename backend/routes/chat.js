const express = require('express');
const router = express.Router();
const KnowledgeBase = require('../models/KnowledgeBase');
const Symptom = require('../models/Symptom');
const SessionManager = require('../utils/SessionManager');

const preprocessForLanguage = (text) => {
  return text.toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
};

router.post('/', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length < 3) {
    return res.status(400).json({ error: 'Message must be at least 3 characters long' });
  }

  try {
    const session = SessionManager.getOrCreateSession(sessionId);
    const symptomList = await Symptom.find({});
    const rules = await KnowledgeBase.find({});
    const symptomSet = new Set(symptomList.map(s => s.name.toLowerCase()));
    const normalizedMessage = preprocessForLanguage(message);
    const extractedSymptoms = [];

    for (const symptom of symptomSet) {
      const regex = new RegExp(`\\b${symptom.replace(/ /g, '\\s+')}\\b`, 'i');
      if (regex.test(normalizedMessage)) {
        extractedSymptoms.push(symptom);
      }
    }

    if (message.toLowerCase().includes('reset') || message.toLowerCase().includes('start over')) {
      session.reset();
      return res.json({
        response: "Conversation has been reset. Please start by describing your symptoms.",
        sessionId: session.id
      });
    }

    if (message.match(/\b(hi|hello|hey|halo|hai)\b/i)) {
      session.reset();
      return res.json({
        response: "Hello! I am your health diagnosis assistant. Please describe your first symptom.",
        sessionId: session.id
      });
    }

    if (message.match(/\b(thanks|thank you|makasih|terima kasih)\b/i)) {
      return res.json({
        response: "You're welcome! If you have more symptoms, feel free to describe them. Type 'reset' to start a new conversation.",
        sessionId: session.id
      });
    }

    extractedSymptoms.forEach(symptom => {
      if (!session.symptoms.has(symptom)) {
        session.symptoms.add(symptom);
        session.newSymptoms.add(symptom);
      }
    });

    const addedSymptoms = [...session.newSymptoms];
    session.newSymptoms.clear();

    let response = "";

    if (addedSymptoms.length > 0) {
      response += `Symptom(s) "${addedSymptoms.join(', ')}" have been recorded.\n\n`;
    }

    if (session.symptoms.size < 3) {
      response += `Currently, I have ${session.symptoms.size} symptom(s). `;
      response += "Please provide more symptoms for a more accurate analysis.\n";
      response += "Example: 'I also have a fever and headache.'";

      return res.json({
        response: response,
        sessionId: session.id,
        status: "NEED_MORE_SYMPTOMS"
      });
    }

    const userSymptoms = new Set([...session.symptoms].map(s => s.toLowerCase()));
    const matchedRules = [];

    for (const rule of rules) {
      const ruleSymptoms = new Set(rule.symptoms.map(s => s.toLowerCase()));
      let allMatched = true;
      for (const symptom of ruleSymptoms) {
        if (!userSymptoms.has(symptom)) {
          allMatched = false;
          break;
        }
      }
      if (allMatched) {
        matchedRules.push({
          diagnosis: rule.diagnosis,
          matchedConditions: ruleSymptoms,
          rule: rule
        });
      }
    }

    if (matchedRules.length > 0) {
      matchedRules.sort((a, b) => b.matchedConditions.size - a.matchedConditions.size);
      const bestMatch = matchedRules[0];

      session.diagnosis = bestMatch.diagnosis;
      session.confidence = 1.0;

      response += `Based on your symptoms: ${[...session.symptoms].join(', ')}\n\n`;
      response += `Diagnosis: **${bestMatch.diagnosis}**\n`;

      response += "\n\nWhat would you like to do next?\n";
      response += "1. Add more symptoms\n";
      response += "2. Learn about this diagnosis\n";
      response += "3. Get treatment advice\n";
      response += "4. Start a new conversation (type 'reset')";

      return res.json({
        response: response,
        diagnosis: bestMatch.diagnosis,
        confidence: 1.0,
        matchedRule: bestMatch.rule,
        sessionId: session.id,
        status: "DIAGNOSIS_COMPLETE"
      });
    }

    const partialMatches = [];
    const threshold = 0.7;

    for (const rule of rules) {
      const ruleSymptoms = new Set(rule.symptoms.map(s => s.toLowerCase()));
      const matchedConditionsCount = [...ruleSymptoms].filter(symptom => userSymptoms.has(symptom)).length;
      const matchRatio = matchedConditionsCount / ruleSymptoms.size;

      if (matchRatio >= threshold) {
        partialMatches.push({
          diagnosis: rule.diagnosis,
          matchRatio: matchRatio,
          matchedConditions: matchedConditionsCount,
          totalConditions: ruleSymptoms.size,
          rule: rule
        });
      }
    }

    if (partialMatches.length > 0) {
      partialMatches.sort((a, b) => b.matchRatio - a.matchRatio);
      const bestPartial = partialMatches[0];

      session.diagnosis = bestPartial.diagnosis;
      session.confidence = bestPartial.matchRatio;

      response += `Based on your symptoms: ${[...session.symptoms].join(', ')}\n\n`;
      response += `Possible diagnosis: **${bestPartial.diagnosis}**\n`;
      response += `(Match level: ${Math.round(bestPartial.matchRatio * 100)}% - `;
      response += `${bestPartial.matchedConditions}/${bestPartial.totalConditions} symptoms matched)`;

      response += "\n\nWhat would you like to do next?\n";
      response += "1. Add more symptoms to improve accuracy\n";
      response += "2. Learn about this diagnosis\n";
      response += "3. Get treatment advice\n";
      response += "4. Start a new conversation (type 'reset')";

      return res.json({
        response: response,
        diagnosis: bestPartial.diagnosis,
        confidence: bestPartial.matchRatio,
        matchedRule: bestPartial.rule,
        sessionId: session.id,
        status: "PARTIAL_DIAGNOSIS"
      });
    }

    response += "I can't determine an exact diagnosis yet based on your symptoms.\n\n";
    response += `Symptoms you mentioned: ${[...session.symptoms].join(', ')}\n\n`;
    response += "Please add any other relevant symptoms, or type 'reset' to start a new conversation.";

    return res.json({
      response: response,
      sessionId: session.id,
      status: "INCONCLUSIVE"
    });

  } catch (err) {
    console.error('Chatbot error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : null
    });
  }
});

router.post('/followup', async (req, res) => {
  const { message, sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  const session = SessionManager.getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  try {
    if (message.match(/\b(treatment|advice|what to do|therapy|solution)\b/i)) {
      const advice = getTreatmentAdvice(session.diagnosis);
      return res.json({
        response: `For diagnosis **${session.diagnosis}**:\n${advice}`,
        sessionId: session.id
      });
    }

    if (message.match(/\b(what is|explain|definition|description)\b/i)) {
      const explanation = getDiseaseExplanation(session.diagnosis);
      return res.json({
        response: `**${session.diagnosis}**:\n${explanation}`,
        sessionId: session.id
      });
    }

    if (message.match(/\b(symptom|add|more|also)\b/i)) {
      const prevSymptoms = session.symptoms.size;
      session.addSymptomsFromMessage(message);
      const newSymptoms = session.symptoms.size - prevSymptoms;

      if (newSymptoms > 0) {
        return res.json({
          response: `${newSymptoms} new symptom(s) added. Send 'analyze' to recheck diagnosis.`,
          sessionId: session.id,
          symptoms: [...session.symptoms]
        });
      }

      return res.json({
        response: "No new symptoms found. Please describe additional symptoms you're experiencing.",
        sessionId: session.id
      });
    }

    if (message.match(/\b(analyze|diagnose|check|reanalyze)\b/i)) {
      return res.json({
        response: "Reprocessing diagnosis with updated symptoms...",
        sessionId: session.id,
        redirect: true
      });
    }

    return res.json({
      response: "I didn't understand your request. You can:\n1. Ask for diagnosis explanation\n2. Ask for treatment advice\n3. Add symptoms\n4. Reset conversation",
      sessionId: session.id
    });

  } catch (err) {
    console.error('Follow-up error:', err);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : null
    });
  }
});


// Helper functions for medical knowledge
function getTreatmentAdvice(diagnosis) {
  const adviceMap = {
    'Fungal infection': 
      "- Gunakan krim antijamur (seperti clotrimazole atau miconazole)\n" +
      "- Jaga area kulit tetap kering dan bersih\n" +
      "- Ganti pakaian dan handuk secara teratur\n" +
      "- Hindari berbagi barang pribadi\n" +
      "- Konsultasi dokter jika tidak membaik dalam 2 minggu",
      
    'Allergy':
      "- Hindari alergen yang diketahui\n" +
      "- Gunakan antihistamin (seperti cetirizine atau loratadine)\n" +
      "- Gunakan obat tetes mata untuk gejala mata\n" +
      "- Pertimbangkan tes alergi untuk identifikasi penyebab\n" +
      "- Konsultasi dokter untuk resep obat yang lebih kuat jika perlu",
      
    'GERD':
      "- Hindari makanan pedas, asam, dan berlemak\n" +
      "- Makan porsi kecil tapi sering\n" +
      "- Jangan berbaring setelah makan\n" +
      "- Gunakan antasida atau obat PPI (seperti omeprazole)\n" +
      "- Tinggikan kepala tempat tidur saat tidur"
  };
  
  return adviceMap[diagnosis] || 
    "Konsultasi dengan dokter spesialis untuk rencana penanganan yang tepat. " +
    "Penanganan umum termasuk istirahat yang cukup, menjaga hidrasi, " +
    "dan menghindari faktor risiko yang diketahui.";
}

function getDiseaseExplanation(diagnosis) {
  const explanationMap = {
    'Fungal infection': 
      "Infeksi jamur pada kulit yang disebabkan oleh berbagai jenis jamur dermatofit. " +
      "Gejala umum termasuk ruam kemerahan, gatal, dan perubahan warna kulit. " +
      "Sering terjadi di area lembab seperti sela jari, ketiak, atau selangkangan.",
      
    'Allergy':
      "Reaksi sistem imun berlebihan terhadap zat asing (alergen) seperti serbuk sari, " +
      "debu, atau makanan tertentu. Gejala termasuk bersin-bersin, mata berair, " +
      "gatal, dan ruam kulit.",
      
    'GERD':
      "Gastroesophageal Reflux Disease (GERD) adalah kondisi asam lambung naik ke kerongkongan. " +
      "Gejala termasuk nyeri ulu hati, rasa asam di mulut, dan kesulitan menelan. " +
      "Disebabkan oleh melemahnya katup antara lambung dan kerongkongan."
  };
  
  return explanationMap[diagnosis] || 
    "Kondisi medis yang memerlukan evaluasi lebih lanjut oleh profesional kesehatan. " +
    "Diagnosis ini didasarkan pada gejala yang Anda laporkan dan mungkin memerlukan " +
    "pemeriksaan tambahan untuk konfirmasi.";
}

module.exports = router;