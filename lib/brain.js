'use strict';

/**
 * PROMEMORY Brain Synthesis Engine
 * Transforms onboarding questionnaire answers into a fully tailored executive personal OS.
 */

function generateUserTemplate(userId, name = 'Utente', email = '') {
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d.toISOString().split('T')[0]);
  }

  return {
    profile: {
      name,
      role: 'PRO Member',
      focusVision: 'Massimizzare la produttività, salute e disciplina quotidiana.',
      maxDailyDeepWorkHours: 4,
      wakeUpTarget: '06:30',
      sleepTarget: '23:00',
      proactiveMode: true,
      voiceEnabled: true,
      macosBridgeEnabled: true,
      llmProvider: 'auto',
      geminiApiKey: '',
      openaiApiKey: ''
    },
    trackers: [
      {
        id: 'trk-water',
        name: 'Idratazione Quotidiana',
        icon: '💧',
        unit: 'bicchieri',
        mode: 'goal',
        dailyTarget: 8,
        step: 1,
        costPerUnit: 0,
        history: { [todayStr]: 0 },
        logs: []
      }
    ],
    habits: [
      {
        id: 'hab-1',
        name: 'Deep Work Mattutino',
        category: 'Focus',
        schedule: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        targetPerWeek: 5,
        streak: 0,
        history: { [todayStr]: 'pending' },
        scheduleChangedAt: null
      },
      {
        id: 'hab-2',
        name: 'Allenamento Programmato',
        category: 'Fitness',
        schedule: ['Mon', 'Wed', 'Fri'],
        targetPerWeek: 3,
        streak: 0,
        history: { [todayStr]: 'pending' },
        scheduleChangedAt: null
      }
    ],
    alarms: [
      { id: 'alm-1', time: '06:30', label: 'Sveglia Risveglio & Idratazione', enabled: true, repeat: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], group: 'Mattina', sound: 'cascade' }
    ],
    reminders: [
      { id: 'rem-1', title: 'Bere 500ml acqua appena sveglio', dueTime: '06:35', completed: false, priority: 'high', syncedNative: false }
    ],
    tasks: [
      { id: 'tsk-1', title: 'Completare il blocco di lavoro prioritario', project: 'Progetti', priority: 'high', durationMin: 60, status: 'todo', scheduledTime: '09:00' }
    ],
    events: [
      { id: 'evt-1', title: 'Blocco Deep Work', date: todayStr, startTime: '09:00', endTime: '11:00', category: 'Deep Work', location: 'Studio' }
    ],
    goals: [
      {
        id: 'gol-1',
        title: 'Costanza & Focus nei Progetti Chiave',
        category: 'Personale',
        deadline: '2026-12-31',
        progress: 10,
        milestones: [
          { id: 'm-1', title: 'Configurazione sistema PROMEMORY completata', done: true },
          { id: 'm-2', title: 'Completare prima settimana a punteggio >80%', done: false }
        ]
      }
    ],
    memories: [
      { id: 'mem-1', text: `Profilo creato per ${name}.`, category: 'Sistema', createdAt: todayStr }
    ],
    actionLog: [
      {
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
        command: 'Configurazione Iniziale',
        summary: 'Cervello PROMEMORY inizializzato.',
        targetTab: 'today'
      }
    ]
  };
}

function synthesizeBrain(user, answers = {}) {
  const todayStr = new Date().toISOString().split('T')[0];
  const nowHM = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;

  const name = (answers.name || user.name || 'Utente').trim();
  const mainGoal = (answers.mainGoal || 'Raggiungere la massima produttività e forma fisica').trim();
  const smokes = answers.smokes === 'yes';
  const smokeBaseline = Number(answers.smokeBaseline) || 15;
  const smokeTarget = Number(answers.smokeTarget) || 5;
  const packCost = Number(answers.packCost) || 6.00;
  const costPerCig = Number((packCost / 20).toFixed(2)) || 0.30;
  const waterGlasses = Number(answers.waterGlasses) || 8;
  const trackAlcohol = answers.trackAlcohol === 'yes';
  const trackCoffee = answers.trackCoffee === 'yes';
  const wakeUpTime = answers.wakeUpTime || '06:30';
  const smartAlarmSequence = answers.smartAlarmSequence === 'yes';
  const sleepTime = answers.sleepTime || '23:00';
  const deepWorkHours = Number(answers.deepWorkHours) || 4;
  const dailyBudgetEuro = Number(answers.dailyBudgetEuro) || 50;
  const gymSplit = answers.gymSplit || 'push_pull_legs';
  const gymDaysCount = Number(answers.gymDaysCount) || 3;

  // Update User Profile
  user.name = name;
  user.onboardingCompleted = true;
  user.questionnaire = answers;
  user.state = user.state || generateUserTemplate(user.id, name, user.email);
  user.extraState = user.extraState || {};

  user.state.profile.name = name;
  user.state.profile.focusVision = mainGoal;
  user.state.profile.wakeUpTarget = wakeUpTime;
  user.state.profile.sleepTarget = sleepTime;
  user.state.profile.maxDailyDeepWorkHours = deepWorkHours;

  // Extra modules configuration
  user.extraState.smokingBaselinePerDay = smokeBaseline;
  user.extraState.smokingCostPerUnit = costPerCig;
  user.extraState.dailyBudgetEuro = dailyBudgetEuro;
  user.extraState.focusMinutesToday = 0;

  // 1. CIGARETTE TRACKER CONFIGURATION
  let trackers = (user.state.trackers || []).filter((t) => t.id !== 'trk-cig' && !t.name.toLowerCase().includes('sigarett'));
  if (smokes) {
    trackers.unshift({
      id: 'trk-cig',
      name: 'Sigarette Fumate Oggi',
      icon: '🚬',
      unit: 'sigarette',
      mode: 'limit',
      dailyTarget: smokeTarget,
      step: 1,
      costPerUnit: costPerCig,
      history: { [todayStr]: 0 },
      logs: []
    });

    // Ensure Goal for quitting/reducing smoking exists
    const hasSmokeGoal = (user.state.goals || []).some((g) => g.id === 'gol-smoke' || g.title.toLowerCase().includes('fumar'));
    if (!hasSmokeGoal) {
      user.state.goals.unshift({
        id: 'gol-smoke',
        title: 'Smettere di Fumare — Riduzione e Polmoni Puliti',
        category: 'Salute',
        deadline: '2026-12-31',
        progress: 40,
        milestones: [
          { id: `ms-s1-${Date.now()}`, title: `Rimanere stabilmente sotto le ${smokeTarget} sigarette/giorno`, done: false },
          { id: `ms-s2-${Date.now()}`, title: 'Prima settimana con oltre 50 sigarette risparmiate', done: false },
          { id: `ms-s3-${Date.now()}`, title: '7 giorni consecutivi con zero nicotina', done: false }
        ]
      });
    }
  }

  // 2. WATER & OPTIONAL TRACKERS
  let waterTrk = trackers.find((t) => t.id === 'trk-water');
  if (!waterTrk) {
    trackers.push({
      id: 'trk-water',
      name: 'Idratazione Quotidiana',
      icon: '💧',
      unit: 'bicchieri',
      mode: 'goal',
      dailyTarget: waterGlasses,
      step: 1,
      costPerUnit: 0,
      history: { [todayStr]: 0 },
      logs: []
    });
  } else {
    waterTrk.dailyTarget = waterGlasses;
  }

  if (trackAlcohol && !trackers.some((t) => t.id === 'trk-alcohol')) {
    trackers.push({
      id: 'trk-alcohol',
      name: 'Controllo Alcol',
      icon: '🍷',
      unit: 'bevande',
      mode: 'limit',
      dailyTarget: 0,
      step: 1,
      costPerUnit: 5.0,
      history: { [todayStr]: 0 },
      logs: []
    });
  }

  if (trackCoffee && !trackers.some((t) => t.id === 'trk-coffee')) {
    trackers.push({
      id: 'trk-coffee',
      name: 'Caffè Giornalieri',
      icon: '☕',
      unit: 'tazzine',
      mode: 'limit',
      dailyTarget: 3,
      step: 1,
      costPerUnit: 1.20,
      history: { [todayStr]: 0 },
      logs: []
    });
  }
  user.state.trackers = trackers;

  // 3. HABITS CONFIGURATION
  const gymDayCodes = gymDaysCount === 2 ? ['Tue', 'Thu']
    : gymDaysCount === 4 ? ['Mon', 'Tue', 'Thu', 'Fri']
    : gymDaysCount === 5 ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    : ['Mon', 'Wed', 'Fri'];

  user.state.habits = [
    {
      id: 'hab-focus',
      name: `Deep Work (${deepWorkHours}h)`,
      category: 'Focus',
      schedule: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      targetPerWeek: 5,
      streak: 0,
      history: { [todayStr]: 'pending' },
      scheduleChangedAt: null
    },
    {
      id: 'hab-gym',
      name: 'Allenamento in Palestra',
      category: 'Fitness',
      schedule: gymDayCodes,
      targetPerWeek: gymDayCodes.length,
      streak: 0,
      history: { [todayStr]: 'pending' },
      scheduleChangedAt: null
    },
    {
      id: 'hab-wake',
      name: `Sveglia e Routine (${wakeUpTime})`,
      category: 'Salute',
      schedule: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      targetPerWeek: 7,
      streak: 0,
      history: { [todayStr]: 'pending' },
      scheduleChangedAt: null
    }
  ];

  if (smokes) {
    user.state.habits.push({
      id: 'hab-no-smoke-evening',
      name: 'Zero fumo dopo le 21:00',
      category: 'Salute',
      schedule: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      targetPerWeek: 7,
      streak: 0,
      history: { [todayStr]: 'pending' },
      scheduleChangedAt: null
    });
  }

  // 4. ALARMS CONFIGURATION
  user.state.alarms = [];
  const [wH, wM] = wakeUpTime.split(':').map((n) => parseInt(n, 10));
  user.state.alarms.push({
    id: `alm-primary-${Date.now()}`,
    time: wakeUpTime,
    label: 'Sveglia Principale PROMEMORY',
    enabled: true,
    repeat: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    group: 'Mattina',
    sound: 'cascade'
  });

  if (smartAlarmSequence) {
    const min2 = (wH * 60 + wM + 5) % 1440;
    const min3 = (wH * 60 + wM + 10) % 1440;
    const t2 = `${String(Math.floor(min2 / 60)).padStart(2, '0')}:${String(min2 % 60).padStart(2, '0')}`;
    const t3 = `${String(Math.floor(min3 / 60)).padStart(2, '0')}:${String(min3 % 60).padStart(2, '0')}`;
    user.state.alarms.push({
      id: `alm-seq1-${Date.now()}`,
      time: t2,
      label: 'Sequenza #2 (+5 min)',
      enabled: true,
      repeat: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      group: 'Mattina',
      sound: 'pulse'
    });
    user.state.alarms.push({
      id: `alm-seq2-${Date.now()}`,
      time: t3,
      label: 'Sequenza #3 (+10 min) In Piedi!',
      enabled: true,
      repeat: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      group: 'Mattina',
      sound: 'cascade'
    });
  }

  // 5. GYM PROGRAM CONFIGURATION (Weekly Workout Split)
  const defaultGymRoutines = buildDefaultGymRoutines(gymSplit);
  user.extraState.weeklyGymProgram = {
    splitName: gymSplit.toUpperCase().replace(/_/g, ' '),
    createdAt: todayStr,
    weekStartDate: todayStr,
    schedule: defaultGymRoutines
  };

  // Set today's active exercises to the first day of routine
  user.extraState.gymExercises = defaultGymRoutines[0]?.exercises || [];

  // Memory entry
  user.state.memories.unshift({
    id: `mem-brain-${Date.now()}`,
    text: `Cervello sintonizzato per ${name}. Obiettivo: «${mainGoal}». Allenamento: ${gymSplit} (${gymDaysCount}g/sett). Sveglia: ${wakeUpTime}.`,
    category: 'Cervello AI',
    createdAt: todayStr
  });

  user.state.actionLog.unshift({
    id: `act-${Date.now()}`,
    timestamp: new Date().toISOString(),
    command: 'Sintesi Cervello Eseguita',
    summary: `Configurato profilo su misura per ${name}: target fumo ${smokes ? `${smokeTarget}/giorno` : 'Non fumatore'}, idratazione ${waterGlasses} bicchieri, sveglia ${wakeUpTime}.`,
    targetTab: 'today'
  });

  return user;
}

function buildDefaultGymRoutines(split) {
  if (split === 'upper_lower') {
    return [
      {
        dayLabel: 'Giorno 1 — Upper Body (Forza)',
        exercises: [
          { id: 'ex-ul-1', name: 'Panca Piana Bilanciere', sets: [{ kg: 75, reps: 8, done: false }, { kg: 75, reps: 8, done: false }, { kg: 75, reps: 8, done: false }, { kg: 70, reps: 10, done: false }] },
          { id: 'ex-ul-2', name: 'Rematore con Bilanciere', sets: [{ kg: 65, reps: 8, done: false }, { kg: 65, reps: 8, done: false }, { kg: 65, reps: 8, done: false }] },
          { id: 'ex-ul-3', name: 'Military Press con Manubri', sets: [{ kg: 22, reps: 10, done: false }, { kg: 22, reps: 10, done: false }, { kg: 22, reps: 10, done: false }] },
          { id: 'ex-ul-4', name: 'Bicipiti Curl + Pushdown Tricipiti', sets: [{ kg: 14, reps: 12, done: false }, { kg: 14, reps: 12, done: false }, { kg: 14, reps: 12, done: false }] }
        ]
      },
      {
        dayLabel: 'Giorno 2 — Lower Body (Quad & Glutei)',
        exercises: [
          { id: 'ex-ul-5', name: 'Squat con Bilanciere', sets: [{ kg: 90, reps: 8, done: false }, { kg: 90, reps: 8, done: false }, { kg: 90, reps: 8, done: false }] },
          { id: 'ex-ul-6', name: 'Leg Press 45°', sets: [{ kg: 140, reps: 10, done: false }, { kg: 140, reps: 10, done: false }, { kg: 140, reps: 10, done: false }] },
          { id: 'ex-ul-7', name: 'Stacco Rumeno (RDL)', sets: [{ kg: 80, reps: 10, done: false }, { kg: 80, reps: 10, done: false }, { kg: 80, reps: 10, done: false }] },
          { id: 'ex-ul-8', name: 'Calf Raise + Crunch al Cavo', sets: [{ kg: 45, reps: 15, done: false }, { kg: 45, reps: 15, done: false }, { kg: 45, reps: 15, done: false }] }
        ]
      },
      {
        dayLabel: 'Giorno 3 — Upper Body (Ipertrofia & Volume)',
        exercises: [
          { id: 'ex-ul-9', name: 'Spinte Panca Inclinata Manubri', sets: [{ kg: 26, reps: 10, done: false }, { kg: 26, reps: 10, done: false }, { kg: 26, reps: 10, done: false }] },
          { id: 'ex-ul-10', name: 'Lat Machine Presa Larga', sets: [{ kg: 65, reps: 10, done: false }, { kg: 65, reps: 10, done: false }, { kg: 65, reps: 10, done: false }] },
          { id: 'ex-ul-11', name: 'Alzate Laterali Manubri', sets: [{ kg: 12, reps: 14, done: false }, { kg: 12, reps: 14, done: false }, { kg: 12, reps: 14, done: false }] }
        ]
      }
    ];
  }

  if (split === 'full_body') {
    return [
      {
        dayLabel: 'Giorno A — Full Body Forza',
        exercises: [
          { id: 'ex-fb-1', name: 'Squat con Bilanciere', sets: [{ kg: 85, reps: 8, done: false }, { kg: 85, reps: 8, done: false }, { kg: 85, reps: 8, done: false }] },
          { id: 'ex-fb-2', name: 'Panca Piana Bilanciere', sets: [{ kg: 70, reps: 8, done: false }, { kg: 70, reps: 8, done: false }, { kg: 70, reps: 8, done: false }] },
          { id: 'ex-fb-3', name: 'Rematore con Bilanciere', sets: [{ kg: 60, reps: 8, done: false }, { kg: 60, reps: 8, done: false }, { kg: 60, reps: 8, done: false }] },
          { id: 'ex-fb-4', name: 'Plank & Core Stability', sets: [{ kg: 0, reps: 60, done: false }, { kg: 0, reps: 60, done: false }] }
        ]
      },
      {
        dayLabel: 'Giorno B — Full Body Ipertrofia',
        exercises: [
          { id: 'ex-fb-5', name: 'Stacco da Terra / Rumeno', sets: [{ kg: 90, reps: 8, done: false }, { kg: 90, reps: 8, done: false }, { kg: 90, reps: 8, done: false }] },
          { id: 'ex-fb-6', name: 'Military Press / Shoulder Press', sets: [{ kg: 20, reps: 10, done: false }, { kg: 20, reps: 10, done: false }, { kg: 20, reps: 10, done: false }] },
          { id: 'ex-fb-7', name: 'Lat Machine / Trazioni', sets: [{ kg: 60, reps: 10, done: false }, { kg: 60, reps: 10, done: false }, { kg: 60, reps: 10, done: false }] }
        ]
      }
    ];
  }

  // Default: Push / Pull / Legs
  return [
    {
      dayLabel: 'Giorno 1 — Push (Petto, Spalle, Tricipiti)',
      exercises: [
        { id: 'ex-ppl-1', name: 'Panca Piana con Bilanciere', sets: [{ kg: 75, reps: 8, done: false }, { kg: 75, reps: 8, done: false }, { kg: 75, reps: 8, done: false }, { kg: 70, reps: 10, done: false }] },
        { id: 'ex-ppl-2', name: 'Spinte Manubri Inclinata 30°', sets: [{ kg: 24, reps: 10, done: false }, { kg: 24, reps: 10, done: false }, { kg: 24, reps: 10, done: false }] },
        { id: 'ex-ppl-3', name: 'Alzate Laterali con Manubri', sets: [{ kg: 12, reps: 14, done: false }, { kg: 12, reps: 14, done: false }, { kg: 12, reps: 14, done: false }] },
        { id: 'ex-ppl-4', name: 'Pushdown Tricipiti Corda', sets: [{ kg: 25, reps: 12, done: false }, { kg: 25, reps: 12, done: false }, { kg: 25, reps: 12, done: false }] }
      ]
    },
    {
      dayLabel: 'Giorno 2 — Pull (Dorso, Deltoidi Post., Bicipiti)',
      exercises: [
        { id: 'ex-ppl-5', name: 'Lat Machine Presa Larga', sets: [{ kg: 65, reps: 10, done: false }, { kg: 65, reps: 10, done: false }, { kg: 65, reps: 10, done: false }] },
        { id: 'ex-ppl-6', name: 'Rematore al Pulley Basso', sets: [{ kg: 60, reps: 10, done: false }, { kg: 60, reps: 10, done: false }, { kg: 60, reps: 10, done: false }] },
        { id: 'ex-ppl-7', name: 'Face Pull al Cavo Alto', sets: [{ kg: 22, reps: 15, done: false }, { kg: 22, reps: 15, done: false }, { kg: 22, reps: 15, done: false }] },
        { id: 'ex-ppl-8', name: 'Curl Bicipiti con Manubri', sets: [{ kg: 16, reps: 10, done: false }, { kg: 16, reps: 10, done: false }, { kg: 16, reps: 10, done: false }] }
      ]
    },
    {
      dayLabel: 'Giorno 3 — Legs & Core (Quad, Femorali, Addome)',
      exercises: [
        { id: 'ex-ppl-9', name: 'Squat / Hack Squat', sets: [{ kg: 90, reps: 8, done: false }, { kg: 90, reps: 8, done: false }, { kg: 90, reps: 8, done: false }] },
        { id: 'ex-ppl-10', name: 'Stacco Rumeno con Manubri', sets: [{ kg: 30, reps: 10, done: false }, { kg: 30, reps: 10, done: false }, { kg: 30, reps: 10, done: false }] },
        { id: 'ex-ppl-11', name: 'Leg Extension + Leg Curl', sets: [{ kg: 50, reps: 12, done: false }, { kg: 50, reps: 12, done: false }, { kg: 50, reps: 12, done: false }] },
        { id: 'ex-ppl-12', name: 'Crunch al Cavo + Plank', sets: [{ kg: 40, reps: 15, done: false }, { kg: 40, reps: 15, done: false }, { kg: 40, reps: 15, done: false }] }
      ]
    }
  ];
}

module.exports = {
  generateUserTemplate,
  synthesizeBrain,
  buildDefaultGymRoutines
};
