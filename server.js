'use strict';

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile, spawn } = require('child_process');

const {
  getDb,
  saveDb,
  getUserByToken,
  getUserByEmail,
  registerUser,
  loginUser,
  googleAuthUser,
  togglePaywall
} = require('./lib/users');

const {
  synthesizeBrain,
  buildDefaultGymRoutines
} = require('./lib/brain');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3847;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// STRICT CACHE INHIBITION SO REFRESH NEVER SHOWS STALE JS/HTML
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { etag: false, lastModified: false }));

let remotePublicUrl = null;
let tunnelProcess = null;

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function resolveUser(req) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }
  if (!token && req.headers['x-user-token']) {
    token = req.headers['x-user-token'];
  }
  if (!token && req.query?.token) {
    token = req.query.token;
  }
  if (!token && req.body?.token) {
    token = req.body.token;
  }
  const user = getUserByToken(token);
  return user || getUserByToken('tok_tolo_master_founder');
}

function broadcastUserState(user, source = 'server', lastActionSummary = null) {
  const db = getDb();
  const payload = JSON.stringify({
    type: 'STATE_SYNC',
    userId: user.id,
    source,
    lastActionSummary,
    lanIp: getLocalIpAddress(),
    remoteUrl: remotePublicUrl,
    port: PORT,
    state: user.state,
    extraState: user.extraState,
    onboardingCompleted: user.onboardingCompleted,
    systemSettings: db.systemSettings,
    timestamp: new Date().toISOString()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1 && (!client.userId || client.userId === user.id)) {
      client.send(payload);
    }
  });
}

function triggerMacOSNotification(title, subtitle, message) {
  if (os.platform() !== 'darwin') return Promise.resolve({ ok: false });
  const clean = (s) => String(s || '').replace(/["\\]/g, '');
  const script = `display notification "${clean(message)}" with title "${clean(title)}" subtitle "${clean(subtitle)}" sound name "Glass"`;
  return new Promise((resolve) => {
    execFile('osascript', ['-e', script], { timeout: 4000 }, (error) => {
      resolve({ ok: !error });
    });
  });
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function parseTimeToken(str) {
  if (!str) return null;
  const cleaned = str.trim().toLowerCase();
  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  let m = match[2] ? parseInt(match[2], 10) : 0;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m, formatted: `${pad2(h)}:${pad2(m)}`, totalMinutes: h * 60 + m };
}

// ============================================================================
// INSTANT ACTION COMPILER (PER-USER EXECUTION)
// ============================================================================
async function executeSmartCommand(rawText, sourceDevice = 'Command Bar', user) {
  const targetUser = user || getUserByToken('tok_tolo_master_founder');
  const targetState = targetUser.state;
  const text = String(rawText || '').trim();
  const lower = text.toLowerCase();
  const today = new Date().toISOString().split('T')[0];
  const nowHM = `${pad2(new Date().getHours())}:${pad2(new Date().getMinutes())}`;

  const executedItems = [];
  let targetTab = 'overview';

  // 1. SMOKING / CIGARETTE TRACKER
  if (lower.includes('sigarett') || lower.includes('fumar') || lower.includes('fumo')) {
    let cigTracker = targetState.trackers.find((t) => t.id === 'trk-cig' || t.name.toLowerCase().includes('sigarett'));
    const limitMatch = lower.match(/(?:massimo|limite|target|sotto\s+le|max)\s+(\d+)/i);
    const desiredLimit = limitMatch ? parseInt(limitMatch[1], 10) : 5;

    if (!cigTracker) {
      cigTracker = {
        id: `trk-cig-${Date.now()}`,
        name: 'Sigarette Fumate Oggi',
        icon: '🚬',
        unit: 'sigarette',
        mode: 'limit',
        dailyTarget: desiredLimit,
        step: 1,
        costPerUnit: targetUser.extraState?.smokingCostPerUnit || 0.30,
        history: { [today]: 0 },
        logs: []
      };
      targetState.trackers.unshift(cigTracker);
      executedItems.push(`Creato Contatore Sigarette (Limite: max ${desiredLimit}/giorno)`);
    } else if (limitMatch) {
      cigTracker.dailyTarget = desiredLimit;
      executedItems.push(`Aggiornato limite sigarette a max ${desiredLimit}/giorno`);
    }

    if (lower.includes('ho fumato') || lower.includes('segna') || lower.includes('+1') || lower.includes('aggiungi una sigaretta')) {
      cigTracker.history[today] = (cigTracker.history[today] || 0) + 1;
      cigTracker.logs = cigTracker.logs || [];
      cigTracker.logs.unshift({ id: `lg-${Date.now()}`, time: nowHM, delta: 1 });
      executedItems.push(`Registrata +1 sigaretta alle ${nowHM} (Oggi: ${cigTracker.history[today]}/${cigTracker.dailyTarget})`);
    }
    targetTab = 'overview';
  }

  // 2. COUNTER CREATION
  const counterRegex = /(?:contare|contatore|traccia\w*\s+numero|conta)\s+(?:i\s+|le\s+|gli\s+|di\s+)?([a-zà-ù0-9\s]+?)(?:\s+(?:con\s+)?(?:limite|obiettivo|target|max|massimo)\s+(\d+))?$/i;
  const counterMatch = text.match(counterRegex);
  if (counterMatch && !lower.includes('sigarett')) {
    const rawName = counterMatch[1].trim();
    const targetVal = counterMatch[2] ? parseInt(counterMatch[2], 10) : 5;
    const isLimit = lower.includes('limite') || lower.includes('ridurre') || lower.includes('smettere') || lower.includes('meno') || lower.includes('evitare');

    let icon = '🔢';
    if (rawName.includes('caff')) icon = '☕';
    else if (rawName.includes('acqu') || rawName.includes('bicchier')) icon = '💧';
    else if (rawName.includes('calori') || rawName.includes('kcal')) icon = '🔥';
    else if (rawName.includes('pagin') || rawName.includes('libr')) icon = '📖';
    else if (rawName.includes('allenament') || rawName.includes('flession') || rawName.includes('piegament')) icon = '💪';
    else if (rawName.includes('spes') || rawName.includes('euro') || rawName.includes('soldi')) icon = '💶';

    const newTracker = {
      id: `trk-${Date.now()}`,
      name: rawName.charAt(0).toUpperCase() + rawName.slice(1),
      icon,
      unit: rawName.toLowerCase(),
      mode: isLimit ? 'limit' : 'goal',
      dailyTarget: targetVal,
      step: 1,
      costPerUnit: 0,
      history: { [today]: 0 },
      logs: []
    };
    targetState.trackers.unshift(newTracker);
    executedItems.push(`Creato Contatore «${newTracker.icon} ${newTracker.name}» (${isLimit ? 'Limite max' : 'Obiettivo'}: ${targetVal}/giorno)`);
    targetTab = 'overview';
  }

  // 3. ALARM SEQUENCES
  const wordNumbers = {
    'un': 1, 'uno': 1, 'due': 2, 'tre': 3, 'quattro': 4, 'cinque': 5,
    'sei': 6, 'sette': 7, 'otto': 8, 'nove': 9, 'dieci': 10,
    'quindici': 15, 'venti': 20, 'trenta': 30
  };
  let normalizedAlarms = lower;
  for (const [word, num] of Object.entries(wordNumbers)) {
    normalizedAlarms = normalizedAlarms.replace(new RegExp(`\\bogni\\s+${word}\\b`, 'gi'), `ogni ${num}`);
  }

  const seqRegex = /(?:svegli[ae]|allarm[ei]).*?dalle\s+(\d{1,2}(?::\d{2})?)\s+alle\s+(\d{1,2}(?::\d{2})?)(?:.*?ogni\s+(\d+)\s*(?:min|minuti|m))?/i;
  const seqMatch = normalizedAlarms.match(seqRegex);
  if (seqMatch) {
    const startObj = parseTimeToken(seqMatch[1]);
    const endObj = parseTimeToken(seqMatch[2]);
    const intervalMin = seqMatch[3] ? Math.max(1, Math.min(120, parseInt(seqMatch[3], 10))) : 5;

    if (startObj && endObj) {
      let startMin = startObj.totalMinutes;
      let endMin = endObj.totalMinutes;
      if (endMin < startMin) endMin += 24 * 60;

      const createdTimes = [];
      const groupName = `Sequenza ${startObj.formatted}–${endObj.formatted}`;
      let idx = 1;
      for (let t = startMin; t <= endMin && createdTimes.length < 40; t += intervalMin) {
        const normMin = t % 1440;
        const timeStr = `${pad2(Math.floor(normMin / 60))}:${pad2(normMin % 60)}`;
        if (!targetState.alarms.some((a) => a.time === timeStr && a.group === groupName)) {
          targetState.alarms.push({
            id: `alm-${Date.now()}-${idx}`,
            time: timeStr,
            label: `Sveglia #${idx} (${groupName})`,
            enabled: true,
            repeat: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            group: groupName,
            sound: idx % 2 === 0 ? 'pulse' : 'cascade'
          });
          createdTimes.push(timeStr);
        }
        idx++;
      }
      targetState.alarms.sort((a, b) => a.time.localeCompare(b.time));
      executedItems.push(`Generate ${createdTimes.length} sveglie (${startObj.formatted} → ${endObj.formatted}, ogni ${intervalMin}m)`);
      targetTab = 'alarms';
    }
  } else if (/(?:sveglia)\s+(?:alle\s+)?(\d{1,2}(?::\d{2})?)/i.test(lower)) {
    const singleMatch = lower.match(/(?:sveglia)\s+(?:alle\s+)?(\d{1,2}(?::\d{2})?)(?:\s+(.+))?/i);
    const timeObj = parseTimeToken(singleMatch[1]);
    if (timeObj) {
      const lbl = singleMatch[2] ? singleMatch[2].replace(/^per\s+/i, '').trim() : 'Sveglia Rapida';
      targetState.alarms.push({
        id: `alm-${Date.now()}`,
        time: timeObj.formatted,
        label: lbl.charAt(0).toUpperCase() + lbl.slice(1),
        enabled: true,
        repeat: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        group: 'Sveglia Singola',
        sound: 'cascade'
      });
      targetState.alarms.sort((a, b) => a.time.localeCompare(b.time));
      executedItems.push(`Sveglia creata alle ${timeObj.formatted} (${lbl})`);
      targetTab = 'alarms';
    }
  }

  // 4. TASKS & FALLBACK
  if (executedItems.length === 0) {
    const newTask = {
      id: `tsk-${Date.now()}`,
      title: text.charAt(0).toUpperCase() + text.slice(1),
      project: 'Operativo',
      priority: 'high',
      durationMin: 45,
      status: 'todo',
      scheduledTime: nowHM
    };
    targetState.tasks.unshift(newTask);
    executedItems.push(`Aggiunta Attività Operativa: «${newTask.title}»`);
    targetTab = 'planner';
  }

  const summary = executedItems.join(' · ');
  targetState.actionLog.unshift({
    id: `act-${Date.now()}`,
    timestamp: new Date().toISOString(),
    command: text,
    summary,
    targetTab
  });
  if (targetState.actionLog.length > 30) {
    targetState.actionLog = targetState.actionLog.slice(0, 30);
  }

  saveDb(getDb());
  broadcastUserState(targetUser, sourceDevice, summary);

  return {
    ok: true,
    summary,
    targetTab,
    actionsExecuted: executedItems.map((title) => ({ title })),
    state: targetState
  };
}

// ============================================================================
// REST API ROUTES (MULTI-USER & PROMEMORY BRAIN)
// ============================================================================

// 1. Authentication Routes
app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    const newUser = registerUser({ email, password, name, provider: 'email' });
    res.json({
      ok: true,
      token: newUser.token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        onboardingCompleted: newUser.onboardingCompleted
      },
      state: newUser.state,
      extraState: newUser.extraState,
      systemSettings: getDb().systemSettings
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = loginUser({ email, password });
    res.json({
      ok: true,
      token: user.token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted
      },
      state: user.state,
      extraState: user.extraState,
      systemSettings: getDb().systemSettings
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post('/api/auth/google', (req, res) => {
  try {
    const { email, name, avatar } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, error: 'Email richiesta per Google Sign-In' });
    const user = googleAuthUser({ email, name, avatar });
    res.json({
      ok: true,
      token: user.token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted
      },
      state: user.state,
      extraState: user.extraState,
      systemSettings: getDb().systemSettings
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  const user = resolveUser(req);
  const db = getDb();
  res.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      onboardingCompleted: Boolean(user.onboardingCompleted),
      authProvider: user.authProvider,
      questionnaire: user.questionnaire || null
    },
    systemSettings: db.systemSettings,
    isFounder: user.role === 'founder'
  });
});

// 2. The Internal Brain Synthesis Engine (Personalized Onboarding)
app.post('/api/auth/questionnaire', (req, res) => {
  try {
    const user = resolveUser(req);
    const answers = req.body || {};
    synthesizeBrain(user, answers);
    saveDb(getDb());
    broadcastUserState(user, 'questionnaire', 'Cervello PROMEMORY Sintonizzato');
    res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingCompleted: true
      },
      state: user.state,
      extraState: user.extraState
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 3. Weekly Gym Program (Customizable day-by-day workout schedule)
app.post('/api/auth/gym-program', (req, res) => {
  try {
    const user = resolveUser(req);
    const { program, activeExercises } = req.body || {};
    user.extraState = user.extraState || {};
    if (program) user.extraState.weeklyGymProgram = program;
    if (activeExercises) user.extraState.gymExercises = activeExercises;
    saveDb(getDb());
    broadcastUserState(user, 'gym_update', 'Scheda Palestra Aggiornata');
    res.json({ ok: true, extraState: user.extraState });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 4. State & Sync Routes
app.get('/api/state', (req, res) => {
  const user = resolveUser(req);
  const db = getDb();
  res.json({
    ok: true,
    serverTime: new Date().toISOString(),
    lanIp: getLocalIpAddress(),
    remoteUrl: remotePublicUrl,
    port: PORT,
    platform: os.platform(),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      onboardingCompleted: Boolean(user.onboardingCompleted)
    },
    systemSettings: db.systemSettings,
    state: user.state,
    extraState: user.extraState
  });
});

app.post('/api/command', async (req, res) => {
  try {
    const user = resolveUser(req);
    const { text, sourceDevice } = req.body || {};
    if (!text) return res.status(400).json({ ok: false, error: 'Missing text' });
    const result = await executeSmartCommand(text, sourceDevice || 'Barra Rapida', user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.all('/api/siri', async (req, res) => {
  try {
    const user = resolveUser(req);
    const query = req.query.q || req.body?.q || req.body?.text || 'Ho fumato una sigaretta';
    const result = await executeSmartCommand(query, 'iPhone Siri', user);
    res.json({
      ok: true,
      spokenResponse: `Fatto: ${result.summary}`,
      summary: result.summary
    });
  } catch (err) {
    res.status(500).json({ ok: false, spokenResponse: 'Errore esecuzione comando.' });
  }
});

// 5. Direct Manual CRUD Mutations (Per-User)
app.post('/api/mutate', async (req, res) => {
  const user = resolveUser(req);
  const userState = user.state;
  const { action, payload } = req.body || {};
  const today = new Date().toISOString().split('T')[0];
  const nowHM = `${pad2(new Date().getHours())}:${pad2(new Date().getMinutes())}`;

  try {
    switch (action) {
      case 'ADJUST_TRACKER': {
        const { id, delta, value, date } = payload;
        const targetDate = date || today;
        const trk = userState.trackers.find((t) => t.id === id);
        if (trk) {
          const current = trk.history?.[targetDate] || 0;
          const nextVal = value !== undefined
            ? Math.max(0, Number(value))
            : Math.max(0, current + Number(delta));
          trk.history = trk.history || {};
          trk.history[targetDate] = nextVal;
          trk.logs = trk.logs || [];
          if (Number(delta) > 0) {
            trk.logs.unshift({ id: `lg-${Date.now()}`, time: nowHM, delta: Number(delta) });
            if (trk.logs.length > 25) trk.logs = trk.logs.slice(0, 25);
          } else if (Number(delta) < 0 && trk.logs.length > 0) {
            trk.logs.shift();
          }
        }
        break;
      }
      case 'RESET_TRACKER_TODAY': {
        const trk = userState.trackers.find((t) => t.id === payload.id);
        if (trk) {
          trk.history = trk.history || {};
          trk.history[today] = 0;
          trk.logs = [];
        }
        break;
      }
      case 'ADD_TRACKER': {
        const { name, icon, unit, mode, dailyTarget, step, costPerUnit } = payload;
        userState.trackers.unshift({
          id: `trk-${Date.now()}`,
          name: name || 'Nuovo Contatore',
          icon: icon || '🔢',
          unit: unit || 'unità',
          mode: mode || 'limit',
          dailyTarget: Number(dailyTarget) || 5,
          step: Number(step) || 1,
          costPerUnit: Number(costPerUnit) || 0,
          history: { [today]: 0 },
          logs: []
        });
        break;
      }
      case 'UPDATE_TRACKER_TARGET': {
        const trk = userState.trackers.find((t) => t.id === payload.id);
        if (trk && payload.dailyTarget !== undefined) {
          trk.dailyTarget = Math.max(0, Number(payload.dailyTarget));
        }
        break;
      }
      case 'DELETE_TRACKER': {
        userState.trackers = userState.trackers.filter((t) => t.id !== payload.id);
        break;
      }
      case 'ADD_HABIT': {
        const { name, category, schedule } = payload;
        const sched = Array.isArray(schedule) && schedule.length ? schedule : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        userState.habits.push({
          id: `hab-${Date.now()}`,
          name: name || 'Nuova Abitudine',
          category: category || 'Personale',
          schedule: sched,
          targetPerWeek: sched.length,
          streak: 0,
          history: { [today]: 'pending' },
          scheduleChangedAt: null
        });
        break;
      }
      case 'DELETE_HABIT': {
        userState.habits = userState.habits.filter((h) => h.id !== payload.id);
        break;
      }
      case 'CYCLE_HABIT_CELL': {
        const { habitId, date } = payload;
        const habit = userState.habits.find((h) => h.id === habitId);
        if (habit) {
          const order = ['pending', 'done', 'missed', 'unscheduled'];
          const current = habit.history[date] || 'pending';
          const next = order[(order.indexOf(current) + 1) % order.length];
          habit.history[date] = next;
        }
        break;
      }
      case 'UPDATE_HABIT_SCHEDULE': {
        const { habitId, dayCode } = payload;
        const habit = userState.habits.find((h) => h.id === habitId);
        if (habit) {
          if (habit.schedule.includes(dayCode)) {
            habit.schedule = habit.schedule.filter((d) => d !== dayCode);
          } else {
            habit.schedule.push(dayCode);
          }
          habit.targetPerWeek = habit.schedule.length;
          habit.scheduleChangedAt = `Aggiornata il ${new Date().toLocaleDateString('it-IT')}`;
        }
        break;
      }
      case 'ADD_SINGLE_ALARM': {
        const { time, label } = payload;
        userState.alarms.push({
          id: `alm-${Date.now()}`,
          time: time || '07:00',
          label: label || 'Sveglia Manuale',
          enabled: true,
          repeat: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          group: 'Manuale',
          sound: 'cascade'
        });
        userState.alarms.sort((a, b) => a.time.localeCompare(b.time));
        break;
      }
      case 'TOGGLE_ALARM': {
        const alarm = userState.alarms.find((a) => a.id === payload.id);
        if (alarm) alarm.enabled = !alarm.enabled;
        break;
      }
      case 'DELETE_ALARM': {
        userState.alarms = userState.alarms.filter((a) => a.id !== payload.id);
        break;
      }
      case 'CLEAR_ALL_ALARMS': {
        userState.alarms = [];
        break;
      }
      case 'ADD_REMINDER': {
        const { title, dueTime } = payload;
        userState.reminders.unshift({
          id: `rem-${Date.now()}`,
          title: title || 'Promemoria',
          dueTime: dueTime || '12:00',
          completed: false,
          priority: 'high',
          syncedNative: false
        });
        break;
      }
      case 'TOGGLE_REMINDER': {
        const rem = userState.reminders.find((r) => r.id === payload.id);
        if (rem) rem.completed = !rem.completed;
        break;
      }
      case 'DELETE_REMINDER': {
        userState.reminders = userState.reminders.filter((r) => r.id !== payload.id);
        break;
      }
      case 'ADD_TASK': {
        userState.tasks.unshift({
          id: `tsk-${Date.now()}`,
          title: payload.title,
          project: payload.project || 'Operativo',
          priority: payload.priority || 'medium',
          durationMin: Number(payload.durationMin) || 30,
          status: 'todo',
          scheduledTime: payload.scheduledTime || '09:00'
        });
        break;
      }
      case 'TOGGLE_TASK': {
        const task = userState.tasks.find((t) => t.id === payload.id);
        if (task) task.status = task.status === 'done' ? 'todo' : 'done';
        break;
      }
      case 'DELETE_TASK': {
        userState.tasks = userState.tasks.filter((t) => t.id !== payload.id);
        break;
      }
      case 'ADD_EVENT': {
        const { title, startTime, endTime } = payload;
        userState.events.push({
          id: `evt-${Date.now()}`,
          title: title || 'Impegno',
          date: today,
          startTime: startTime || '10:00',
          endTime: endTime || '11:00'
        });
        userState.events.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        break;
      }
      case 'DELETE_EVENT': {
        userState.events = userState.events.filter((e) => e.id !== payload.id);
        break;
      }
      case 'ADD_GOAL': {
        const { title, category, deadline } = payload;
        userState.goals.unshift({
          id: `gol-${Date.now()}`,
          title: title || 'Nuovo Obiettivo',
          category: category || 'Personale',
          deadline: deadline || '2026-12-31',
          progress: 0,
          milestones: []
        });
        break;
      }
      case 'UPDATE_GOAL_PROGRESS': {
        const g = userState.goals.find((x) => x.id === payload.id);
        if (g) g.progress = Math.min(100, Math.max(0, Number(payload.progress)));
        break;
      }
      case 'DELETE_GOAL': {
        userState.goals = userState.goals.filter((g) => g.id !== payload.id);
        break;
      }
      default:
        break;
    }

    saveDb(getDb());
    broadcastUserState(user, 'ui', action);
    res.json({ ok: true, state: userState, extraState: user.extraState });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 6. Sharing & Paywall Toggle
app.get('/api/system/share-info', (req, res) => {
  const db = getDb();
  const base = remotePublicUrl || `http://${getLocalIpAddress()}:${PORT}`;
  res.json({
    ok: true,
    shareUrl: base,
    inviteUrl: `${base}/?invite=vip`,
    systemSettings: db.systemSettings
  });
});

app.post('/api/admin/toggle-paywall', (req, res) => {
  try {
    const user = resolveUser(req);
    const active = req.body?.active !== undefined ? req.body.active : req.body?.paywallActive;
    const settings = togglePaywall(user.token, active);
    wss.clients.forEach((c) => {
      if (c.readyState === 1) {
        c.send(JSON.stringify({ type: 'PAYWALL_UPDATE', systemSettings: settings }));
      }
    });
    res.json({ ok: true, systemSettings: settings });
  } catch (err) {
    res.status(403).json({ ok: false, error: err.message });
  }
});

app.get('/api/export/ics', (req, res) => {
  const user = resolveUser(req);
  const now = new Date();
  const y = now.getFullYear();
  const m = pad2(now.getMonth() + 1);
  const d = pad2(now.getDate());

  let icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PROMEMORY//Personal Operating System//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:PROMEMORY — Piano & Sveglie'
  ];

  (user.state.alarms || []).filter((a) => a.enabled).forEach((alarm) => {
    const [hh, mm] = alarm.time.split(':');
    const startStamp = `${y}${m}${d}T${hh}${mm}00`;
    const endMin = (parseInt(mm, 10) + 5) % 60;
    const endHour = parseInt(hh, 10) + (parseInt(mm, 10) + 5 >= 60 ? 1 : 0);
    const endStamp = `${y}${m}${d}T${pad2(endHour % 24)}${pad2(endMin)}00`;

    icsLines.push(
      'BEGIN:VEVENT',
      `UID:pm-${alarm.id}@promemory.os`,
      `DTSTAMP:${y}${m}${d}T000000Z`,
      `DTSTART:${startStamp}`,
      `DTEND:${endStamp}`,
      `SUMMARY:⏰ ${alarm.label}`,
      'END:VEVENT'
    );
  });

  icsLines.push('END:VCALENDAR');
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="promemory-sync.ics"');
  res.send(icsLines.join('\r\n'));
});

// Cloudflare Quick Tunnel Daemon
function startCloudflareTunnel() {
  const binPath = path.join(__dirname, 'bin', 'cloudflared');
  if (!fs.existsSync(binPath)) return;

  tunnelProcess = spawn(binPath, ['tunnel', '--url', `http://localhost:${PORT}`], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const extractUrl = (chunk) => {
    const text = chunk.toString();
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (match && match[0] !== remotePublicUrl) {
      remotePublicUrl = match[0];
      console.log(`🌍 Accesso Ovunque (Fuori Casa HTTPS): ${remotePublicUrl}`);
      const founder = getUserByToken('tok_tolo_master_founder');
      if (founder) broadcastUserState(founder, 'tunnel_ready', 'Tunnel Cloud HTTPS Attivo');
    }
  };

  tunnelProcess.stdout.on('data', extractUrl);
  tunnelProcess.stderr.on('data', extractUrl);
  tunnelProcess.on('exit', () => {
    tunnelProcess = null;
  });
}

// WebSocket connection per-user authentication
wss.on('connection', (ws, req) => {
  const urlObj = new URL(req.url, 'http://localhost');
  const token = urlObj.searchParams.get('token');
  const user = getUserByToken(token) || getUserByToken('tok_tolo_master_founder');
  ws.userId = user ? user.id : 'usr_tolo_master';

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'AUTH' && msg.token) {
        const authedUser = getUserByToken(msg.token);
        if (authedUser) {
          ws.userId = authedUser.id;
          ws.send(JSON.stringify({
            type: 'AUTH_SUCCESS',
            userId: authedUser.id,
            state: authedUser.state,
            extraState: authedUser.extraState,
            systemSettings: getDb().systemSettings
          }));
        }
      }
    } catch (e) {}
  });

  const db = getDb();
  if (user) {
    ws.send(JSON.stringify({
      type: 'STATE_SYNC',
      source: 'initial',
      userId: user.id,
      state: user.state,
      extraState: user.extraState,
      onboardingCompleted: user.onboardingCompleted,
      systemSettings: db.systemSettings,
      lanIp: getLocalIpAddress(),
      remoteUrl: remotePublicUrl,
      port: PORT
    }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIpAddress();
  console.log(`\n======================================================`);
  console.log(`⚡ PROMEMORY — Multi-User Liquid Glass OS is ONLINE`);
  console.log(`💻 Computer (Mac):   http://localhost:${PORT}`);
  console.log(`📱 iPhone (Wi-Fi):   http://${ip}:${PORT}`);
  console.log(`======================================================\n`);
  startCloudflareTunnel();
});
