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
    return res.status(400).json({ error: 'Pesan harus berupa teks minimal 3 karakter' });
  }

  try {
    const session = SessionManager.getOrCreateSession(sessionId);
    const symptomList = await Symptom.find({});
    const rules = await KnowledgeBase.find({});

    // Create a set of symptom names for quick lookup
    const symptomSet = new Set(symptomList.map(s => s.name.toLowerCase()));

    // Preprocess user message
    const normalizedMessage = preprocessForLanguage(message);

    // Extract symptoms from message by matching symptom list
    const extractedSymptoms = [];
    for (const symptom of symptomSet) {
      const regex = new RegExp(`\\b${symptom.replace(/ /g, '\\s+')}\\b`, 'i');
      if (regex.test(normalizedMessage)) {
        extractedSymptoms.push(symptom);
      }
    }

    if (message.toLowerCase().includes('reset') || message.toLowerCase().includes('mulai baru')) {
      session.reset();
      return res.json({
        response: "Percakapan telah direset. Silakan mulai dengan menjelaskan gejala Anda.",
        sessionId: session.id
      });
    }

    if (message.match(/\b(hi|halo|hello|hai)\b/i)) {
      session.reset();
      return res.json({
        response: "Halo! Saya adalah asisten diagnosa kesehatan. Silakan jelaskan gejala pertama yang Anda alami.",
        sessionId: session.id
      });
    }

    if (message.match(/\b(terima kasih|thanks|makasih)\b/i)) {
      return res.json({
        response: "Sama-sama! Jika ada gejala lain, silakan jelaskan. Ketik 'reset' untuk memulai percakapan baru.",
        sessionId: session.id
      });
    }

    // Add extracted symptoms to session
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
      response += `Gejala "${addedSymptoms.join(', ')}" telah dicatat.\n\n`;
    }

    if (session.symptoms.size < 3) {
      response += `Saat ini saya memiliki ${session.symptoms.size} gejala. `;
      response += "Silakan tambahkan gejala lain untuk analisa lebih akurat.\n";
      response += "Contoh: 'saya juga mengalami demam dan sakit kepala'";

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

      response += `Berdasarkan gejala yang Anda sebutkan: ${[...session.symptoms].join(', ')}\n\n`;
      response += `Diagnosis: **${bestMatch.diagnosis}**\n`;

      response += "\n\nApa yang ingin Anda lakukan selanjutnya?\n";
      response += "1. Tambahkan gejala baru\n";
      response += "2. Pelajari tentang diagnosis ini\n";
      response += "3. Dapatkan saran penanganan\n";
      response += "4. Mulai percakapan baru (ketik 'reset')";

      return res.json({
        response: response,
        diagnosis: bestMatch.diagnosis,
        confidence: 1.0,
        matchedRule: bestMatch.rule,
        sessionId: session.id,
        status: "DIAGNOSIS_COMPLETE"
      });
    }

    // Partial match logic
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

      response += `Berdasarkan gejala yang Anda sebutkan: ${[...session.symptoms].join(', ')}\n\n`;
      response += `Diagnosis kemungkinan: **${bestPartial.diagnosis}**\n`;
      response += `(Tingkat kecocokan: ${Math.round(bestPartial.matchRatio * 100)}% - `;
      response += `${bestPartial.matchedConditions}/${bestPartial.totalConditions} gejala cocok)`;

      response += "\n\nApa yang ingin Anda lakukan selanjutnya?\n";
      response += "1. Tambahkan gejala untuk meningkatkan akurasi\n";
      response += "2. Pelajari tentang diagnosis ini\n";
      response += "3. Dapatkan saran penanganan\n";
      response += "4. Mulai percakapan baru (ketik 'reset')";

      return res.json({
        response: response,
        diagnosis: bestPartial.diagnosis,
        confidence: bestPartial.matchRatio,
        matchedRule: bestPartial.rule,
        sessionId: session.id,
        status: "PARTIAL_DIAGNOSIS"
      });
    }

    response += "Saya belum bisa menentukan diagnosis pasti berdasarkan gejala yang Anda berikan.\n\n";
    response += `Gejala yang Anda sebutkan: ${[...session.symptoms].join(', ')}\n\n`;
    response += "Silakan tambahkan gejala lain yang mungkin terkait, atau ketik 'reset' untuk memulai percakapan baru.";

    return res.json({
      response: response,
      sessionId: session.id,
      status: "INCONCLUSIVE"
    });

  } catch (err) {
    console.error('Chatbot error:', err);
    return res.status(500).json({
      error: 'Terjadi kesalahan internal',
      details: process.env.NODE_ENV === 'development' ? err.message : null
    });
  }
});

// Endpoint untuk follow-up questions
router.post('/followup', async (req, res) => {
  const { message, sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID diperlukan' });
  }
  
  const session = SessionManager.getSession(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session tidak ditemukan' });
  }
  
  try {
    // Handle treatment questions
    if (message.match(/\b(penanganan|pengobatan|saran|treatment|apa yang harus dilakukan)\b/i)) {
      const advice = getTreatmentAdvice(session.diagnosis);
      return res.json({
        response: `Untuk diagnosis **${session.diagnosis}**:\n${advice}`,
        sessionId: session.id
      });
    }
    
    // Handle diagnosis explanation
    if (message.match(/\b(penjelasan|apa itu|erangkan|definisi)\b/i)) {
      const explanation = getDiseaseExplanation(session.diagnosis);
      return res.json({
        response: `**${session.diagnosis}**:\n${explanation}`,
        sessionId: session.id
      });
    }
    
    // Handle additional symptoms
    if (message.match(/\b(gejala|tambahkan|lagi|juga)\b/i)) {
      const prevSymptoms = session.symptoms.size;
      session.addSymptomsFromMessage(message);
      const newSymptoms = session.symptoms.size - prevSymptoms;
      
      if (newSymptoms > 0) {
        return res.json({
          response: `${newSymptoms} gejala baru telah ditambahkan. Kirim 'analisa' untuk meninjau diagnosis.`,
          sessionId: session.id,
          symptoms: [...session.symptoms]
        });
      }
      
      return res.json({
        response: "Tidak menemukan gejala baru. Silakan jelaskan gejala tambahan yang Anda alami.",
        sessionId: session.id
      });
    }
    
    // Handle re-analysis
    if (message.match(/\b(analisa|analisis|diagnosa|periksa)\b/i)) {
      return res.json({
        response: "Memproses ulang diagnosis dengan gejala terbaru...",
        sessionId: session.id,
        redirect: true // Client should resend symptoms
      });
    }
    
    // Default response
    return res.json({
      response: "Saya tidak mengerti permintaan Anda. Silakan pilih opsi:\n1. Minta penjelasan diagnosis\n2. Minta saran penanganan\n3. Tambahkan gejala\n4. Reset percakapan",
      sessionId: session.id
    });
    
  } catch (err) {
    console.error('Follow-up error:', err);
    return res.status(500).json({ 
      error: 'Terjadi kesalahan internal',
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