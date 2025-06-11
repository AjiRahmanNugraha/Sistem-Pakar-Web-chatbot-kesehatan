class Session {
  constructor(id) {
    this.id = id;
    this.symptoms = new Set();
    this.messages = [];
    this.diagnosis = null;
    this.confidence = 0;
    this.createdAt = new Date();
    this.lastActive = new Date();
    this.newSymptoms = new Set();
  }

  addUserMessage(message) {
    this.messages.push({ role: 'user', content: message, timestamp: new Date() });
    this.lastActive = new Date();
  }

  addBotMessage(message) {
    this.messages.push({ role: 'bot', content: message, timestamp: new Date() });
    this.lastActive = new Date();
  }

  addSymptomsFromMessage(message) {
    const prevSymptoms = new Set(this.symptoms);
    const tokens = this.preprocessText(message);
    
    tokens.forEach(token => {
      // Tambahkan gejala baru jika belum ada
      if (!this.symptoms.has(token)) {
        this.symptoms.add(token);
        this.newSymptoms.add(token);
      }
    });
  }

  getNewSymptoms(message) {
    const prevSymptoms = new Set(this.symptoms);
    const tokens = this.preprocessText(message);
    const newSymptoms = [];
    
    tokens.forEach(token => {
      if (!prevSymptoms.has(token)) {
        newSymptoms.push(token.replace(/_/g, ' '));
      }
    });
    
    return newSymptoms;
  }

  preprocessText(text) {
    const normalized = text.toLowerCase()
      .replace(/\b(and|or|with|serta|dan|atau)\b/gi, '')
      .replace(/[^a-z0-9\s_]/g, '')
      .replace(/\b\w{1,2}\b/g, '')
      .trim();

    // Split by comma, 'and', or any whitespace to get symptom phrases
    const splitRegex = /,|\band\b|\s+/gi;
    const rawTokens = normalized.split(splitRegex).map(t => t.trim()).filter(t => t.length > 2);

    // Replace spaces with underscores for multi-word symptoms
    const underscoredTokens = rawTokens.map(token => token.replace(/\s+/g, '_'));

    return [...new Set(underscoredTokens)];
  }

  reset() {
    this.symptoms.clear();
    this.messages = [];
    this.diagnosis = null;
    this.confidence = 0;
    this.newSymptoms.clear();
  }
}

class SessionManager {
  static sessions = new Map();
  static sessionTimeout = 30 * 60 * 1000; // 30 menit

  static getOrCreateSession(sessionId) {
    this.cleanupSessions();

    if (!sessionId || !this.sessions.has(sessionId)) {
      const newSessionId = sessionId || 'sess_' + Math.random().toString(36).substr(2, 9);
      const newSession = new Session(newSessionId);
      this.sessions.set(newSessionId, newSession);
      return newSession;
    }

    return this.sessions.get(sessionId);
  }

  static getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  static cleanupSessions() {
    const now = new Date();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActive > this.sessionTimeout) {
        this.sessions.delete(id);
      }
    }
  }
}

module.exports = SessionManager;
