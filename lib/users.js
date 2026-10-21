'use strict';

const fs = require('fs');
const path = require('path');
const { generateUserTemplate } = require('./brain');

const DATA_DIR = path.join(__dirname, '..', 'data');
const PROMEMORY_DB_FILE = path.join(DATA_DIR, 'promemory-db.json');
const LEGACY_DB_FILE = path.join(DATA_DIR, 'nexus-db.json');

const DEFAULT_SYSTEM_SETTINGS = {
  appName: 'PROMEMORY',
  paywallActive: false,
  monthlyPriceEuro: 50,
  trialDays: 14,
  founderId: 'usr_tolo_master'
};

function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(PROMEMORY_DB_FILE)) {
    try {
      const raw = fs.readFileSync(PROMEMORY_DB_FILE, 'utf8');
      const db = JSON.parse(raw);
      if (!db.users || typeof db.users !== 'object') db.users = {};
      if (!db.systemSettings) db.systemSettings = { ...DEFAULT_SYSTEM_SETTINGS };
      return db;
    } catch (e) {
      console.error('Error reading promemory-db.json, recreating:', e);
    }
  }

  // Migrate legacy data if available
  let masterState = null;
  if (fs.existsSync(LEGACY_DB_FILE)) {
    try {
      masterState = JSON.parse(fs.readFileSync(LEGACY_DB_FILE, 'utf8'));
    } catch (e) {}
  }

  const db = {
    systemSettings: { ...DEFAULT_SYSTEM_SETTINGS },
    users: {}
  };

  const founderUser = {
    id: 'usr_tolo_master',
    token: 'tok_tolo_master_founder',
    name: masterState?.profile?.name || 'Tolo',
    email: 'tolo@promemory.os',
    role: 'founder',
    authProvider: 'local',
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
    state: masterState || generateUserTemplate('usr_tolo_master', 'Tolo', 'tolo@promemory.os'),
    extraState: {
      smokingBaselinePerDay: 15,
      smokingCostPerUnit: 0.30,
      cravingsWonCount: 5,
      dailyBudgetEuro: 50,
      focusMinutesToday: 90
    },
    questionnaire: {
      name: 'Tolo',
      mainGoal: 'Diventare ultra-produttivo, scalare i progetti chiave e mantenere costanza negli allenamenti.',
      smokes: 'yes',
      smokeBaseline: 15,
      smokeTarget: 5,
      waterGlasses: 8,
      wakeUpTime: '06:30',
      sleepTime: '23:00',
      deepWorkHours: 5,
      gymSplit: 'push_pull_legs',
      gymDaysCount: 4
    }
  };

  db.users[founderUser.id] = founderUser;
  saveDb(db);
  return db;
}

let cachedDb = null;

function getDb() {
  if (!cachedDb) {
    cachedDb = initDb();
  }
  return cachedDb;
}

function saveDb(db) {
  try {
    cachedDb = db;
    fs.writeFileSync(PROMEMORY_DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing promemory-db.json:', err);
  }
}

function getUserByToken(token) {
  const db = getDb();
  if (!token) return db.users['usr_tolo_master'];
  if (token === 'tok_tolo_master_founder') return db.users['usr_tolo_master'];

  for (const uid of Object.keys(db.users)) {
    if (db.users[uid].token === token) {
      return db.users[uid];
    }
  }
  return null;
}

function getUserByEmail(email) {
  if (!email) return null;
  const db = getDb();
  const clean = email.trim().toLowerCase();
  for (const uid of Object.keys(db.users)) {
    if (db.users[uid].email && db.users[uid].email.toLowerCase() === clean) {
      return db.users[uid];
    }
  }
  return null;
}

function registerUser({ email, password, name, provider = 'email' }) {
  const db = getDb();
  const cleanEmail = (email || '').trim().toLowerCase();

  if (cleanEmail && getUserByEmail(cleanEmail)) {
    throw new Error('Un account con questa email esiste già.');
  }

  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const token = `tok_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
  const userName = (name || cleanEmail.split('@')[0] || 'Nuovo Membro').trim();

  const newUser = {
    id: userId,
    token,
    name: userName,
    email: cleanEmail || `${userId}@promemory.local`,
    role: 'member',
    authProvider: provider,
    onboardingCompleted: false,
    createdAt: new Date().toISOString(),
    passwordHash: password ? String(password) : null,
    state: generateUserTemplate(userId, userName, cleanEmail),
    extraState: {
      smokingBaselinePerDay: 15,
      smokingCostPerUnit: 0.30,
      cravingsWonCount: 0,
      dailyBudgetEuro: 50,
      focusMinutesToday: 0
    },
    questionnaire: null
  };

  db.users[userId] = newUser;
  saveDb(db);
  return newUser;
}

function loginUser({ email, password }) {
  const user = getUserByEmail(email);
  if (!user) {
    throw new Error('Nessun account trovato con questa email. Clicca Registrati per iniziare!');
  }
  // In a lightweight setup we check password or bypass if empty/guest
  if (user.passwordHash && password && user.passwordHash !== String(password)) {
    throw new Error('Password non corretta.');
  }
  return user;
}

function googleAuthUser({ email, name, avatar }) {
  const existing = getUserByEmail(email);
  if (existing) {
    if (name) existing.name = name;
    if (avatar) existing.avatar = avatar;
    saveDb(getDb());
    return existing;
  }
  return registerUser({
    email,
    name: name || email.split('@')[0],
    provider: 'google'
  });
}

function togglePaywall(founderToken, active) {
  const db = getDb();
  const user = getUserByToken(founderToken);
  if (!user || user.role !== 'founder') {
    throw new Error('Solo il Fondatore (Tolo) può attivare o disattivare la monetizzazione.');
  }
  db.systemSettings.paywallActive = Boolean(active);
  saveDb(db);
  return db.systemSettings;
}

module.exports = {
  getDb,
  saveDb,
  getUserByToken,
  getUserByEmail,
  registerUser,
  loginUser,
  googleAuthUser,
  togglePaywall
};
