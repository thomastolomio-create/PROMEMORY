(() => {
  'use strict';

  const LOCAL_CACHE_KEY = 'nexus_os_offline_state_v4';
  const LOCAL_EXTRA_KEY = 'nexus_os_extra_modules_v4';

  let currentState = null;
  let lanIp = 'localhost';
  let remoteUrl = null;
  let serverPort = 3847;
  let isListening = false;
  let recognition = null;
  let audioCtx = null;
  let ambientNode = null;
  let activeAlarmInterval = null;
  let triggeredMinuteCache = new Set();
  let toastTimeout = null;
  let currentTaskFilter = 'all';
  let currentActiveTab = 'today';
  const expandedChartIds = new Set(['trk-cig']); // Keep Cigarette 7-day chart open by default so user sees it immediately!

  // Timers State (Craving 3m, Gym Rest, Deep Work Focus)
  let cravingSecLeft = 0;
  let cravingTimer = null;
  let gymRestSecLeft = 90;
  let gymRestRunning = false;
  let gymRestTimer = null;
  let focusSecLeft = 25 * 60;
  let focusRunning = false;
  let focusTimer = null;

  const DAY_CODES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const DAY_LABELS_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  const DAY_SHORT_IT = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

  const FIGHTER_BOXING_ROUTINE = [
    {
      day: 'Lunedì',
      focus: 'Upper Body & KO Power (Pesi, Finisher Corda, Collo, KO Core)',
      exercises: [
        { id: 'ex-fb-1', name: 'Panca Piana Bilanciere', sets: [{ kg: 75, reps: 6, done: false }, { kg: 75, reps: 6, done: false }, { kg: 75, reps: 6, done: false }, { kg: 75, reps: 6, done: false }] },
        { id: 'ex-fb-2', name: 'Trazioni alla Sbarra', sets: [{ kg: 0, reps: 6, done: false }, { kg: 0, reps: 6, done: false }, { kg: 0, reps: 6, done: false }, { kg: 0, reps: 6, done: false }] },
        { id: 'ex-fb-3', name: 'Military Press con Bilanciere/Manubri', sets: [{ kg: 40, reps: 6, done: false }, { kg: 40, reps: 6, done: false }, { kg: 40, reps: 6, done: false }] },
        { id: 'ex-fb-4', name: 'Rematore con Bilanciere', sets: [{ kg: 60, reps: 8, done: false }, { kg: 60, reps: 8, done: false }, { kg: 60, reps: 8, done: false }] },
        { id: 'ex-fb-5', name: 'Bicipiti Curl con Manubri', sets: [{ kg: 14, reps: 10, done: false }, { kg: 14, reps: 10, done: false }] },
        { id: 'ex-fb-6', name: 'Pushdown Tricipiti Corda', sets: [{ kg: 25, reps: 10, done: false }, { kg: 25, reps: 10, done: false }] },
        { id: 'ex-fb-7', name: 'Finisher Corda (30s ON / 30s OFF)', sets: [{ kg: 0, reps: 30, done: false }, { kg: 0, reps: 30, done: false }, { kg: 0, reps: 30, done: false }, { kg: 0, reps: 30, done: false }, { kg: 0, reps: 30, done: false }] },
        { id: 'ex-fb-8', name: 'Collo: Neck Raises Avanti', sets: [{ kg: 0, reps: 15, done: false }, { kg: 0, reps: 15, done: false }] },
        { id: 'ex-fb-9', name: 'Collo: Neck Raises Dietro', sets: [{ kg: 0, reps: 15, done: false }, { kg: 0, reps: 15, done: false }] },
        { id: 'ex-fb-10', name: 'Collo: Neck Raises Laterali', sets: [{ kg: 0, reps: 12, done: false }, { kg: 0, reps: 12, done: false }] },
        { id: 'ex-fb-11', name: 'KO Power: Russian Twist con Peso', sets: [{ kg: 10, reps: 20, done: false }, { kg: 10, reps: 20, done: false }, { kg: 10, reps: 20, done: false }] },
        { id: 'ex-fb-12', name: 'KO Power: Woodchopper al Cavo/Manubrio', sets: [{ kg: 15, reps: 12, done: false }, { kg: 15, reps: 12, done: false }, { kg: 15, reps: 12, done: false }] },
        { id: 'ex-fb-13', name: 'KO Power: Shadowboxing Massima Potenza', sets: [{ kg: 2, reps: 20, done: false }, { kg: 2, reps: 20, done: false }, { kg: 2, reps: 20, done: false }] },
        { id: 'ex-fb-14', name: 'KO Power: Plank Rotazione Bacino', sets: [{ kg: 0, reps: 16, done: false }, { kg: 0, reps: 16, done: false }, { kg: 0, reps: 16, done: false }] },
        { id: 'ex-fb-15', name: 'Finisher KO: Shadowboxing Forza & Frequenza (30s ON/OFF)', sets: [{ kg: 0, reps: 30, done: false }, { kg: 0, reps: 30, done: false }, { kg: 0, reps: 30, done: false }, { kg: 0, reps: 30, done: false }] }
      ]
    },
    {
      day: 'Martedì',
      focus: 'Kickboxing (Tecnica, Sacco, Sparring) + Extra Guardia Alta',
      exercises: [
        { id: 'ex-fb-16', name: 'Kickboxing: Riscaldamento Tecnico & Corda', sets: [{ kg: 0, reps: 10, done: false }] },
        { id: 'ex-fb-17', name: 'Kickboxing: Combinazioni al Sacco / Pao', sets: [{ kg: 0, reps: 30, done: false }, { kg: 0, reps: 30, done: false }, { kg: 0, reps: 30, done: false }] },
        { id: 'ex-fb-18', name: 'Kickboxing: Sparring & Footwork Drills', sets: [{ kg: 0, reps: 20, done: false }] },
        { id: 'ex-fb-19', name: 'Extra Guardia: Tenuta Guardia Serrata Ferma (40s)', sets: [{ kg: 0, reps: 40, done: false }, { kg: 0, reps: 40, done: false }] }
      ]
    },
    {
      day: 'Mercoledì',
      focus: 'Gambe Esplosive (120s squat/stacco, 60-90s resto) + Finisher Jump Squat & Sprint',
      exercises: [
        { id: 'ex-fb-20', name: 'Squat con Bilanciere', sets: [{ kg: 95, reps: 6, done: false }, { kg: 95, reps: 6, done: false }, { kg: 95, reps: 6, done: false }, { kg: 95, reps: 6, done: false }] },
        { id: 'ex-fb-21', name: 'Stacco Rumeno con Bilanciere (RDL)', sets: [{ kg: 80, reps: 8, done: false }, { kg: 80, reps: 8, done: false }, { kg: 80, reps: 8, done: false }] },
        { id: 'ex-fb-22', name: 'Affondi Camminati con Manubri', sets: [{ kg: 18, reps: 10, done: false }, { kg: 18, reps: 10, done: false }, { kg: 18, reps: 10, done: false }] },
        { id: 'ex-fb-23', name: 'Leg Curl Macchinario', sets: [{ kg: 45, reps: 12, done: false }, { kg: 45, reps: 12, done: false }] },
        { id: 'ex-fb-24', name: 'Calf Raise in Piedi', sets: [{ kg: 60, reps: 15, done: false }, { kg: 60, reps: 15, done: false }, { kg: 60, reps: 15, done: false }, { kg: 60, reps: 15, done: false }] },
        { id: 'ex-fb-25', name: 'Plank Isometrico con Tenuta', sets: [{ kg: 0, reps: 40, done: false }, { kg: 0, reps: 40, done: false }, { kg: 0, reps: 40, done: false }] },
        { id: 'ex-fb-26', name: 'Finisher: Jump Squat Esplosivi', sets: [{ kg: 0, reps: 10, done: false }, { kg: 0, reps: 10, done: false }, { kg: 0, reps: 10, done: false }] },
        { id: 'ex-fb-27', name: 'Finisher: Sprint / Navette Veloci (20s)', sets: [{ kg: 0, reps: 20, done: false }, { kg: 0, reps: 20, done: false }, { kg: 0, reps: 20, done: false }, { kg: 0, reps: 20, done: false }, { kg: 0, reps: 20, done: false }] }
      ]
    },
    {
      day: 'Giovedì',
      focus: 'Kickboxing Completo (Tecnica, Schivate, Focus Footwork) — Regola: Guardia sempre alta',
      exercises: [
        { id: 'ex-fb-28', name: 'Kickboxing: Riscaldamento & Corda Veloce', sets: [{ kg: 0, reps: 10, done: false }] },
        { id: 'ex-fb-29', name: 'Kickboxing: Combinazioni 3-4 Colpi & Uscite', sets: [{ kg: 0, reps: 30, done: false }, { kg: 0, reps: 30, done: false }, { kg: 0, reps: 30, done: false }] },
        { id: 'ex-fb-30', name: 'Kickboxing: Sparring Tecnico & Disciplina Difensiva', sets: [{ kg: 0, reps: 20, done: false }] }
      ]
    },
    {
      day: 'Venerdì',
      focus: 'Full Body Potenza (Recupero 90s) + Finisher Burpees + Rotazioni Leggere',
      exercises: [
        { id: 'ex-fb-31', name: 'Stacco da Terra Convenzionale', sets: [{ kg: 110, reps: 4, done: false }, { kg: 110, reps: 4, done: false }, { kg: 110, reps: 4, done: false }] },
        { id: 'ex-fb-32', name: 'Panca Inclinata con Manubri', sets: [{ kg: 26, reps: 8, done: false }, { kg: 26, reps: 8, done: false }, { kg: 26, reps: 8, done: false }] },
        { id: 'ex-fb-33', name: 'Pull Ups (Trazioni Prone)', sets: [{ kg: 0, reps: 6, done: false }, { kg: 0, reps: 6, done: false }, { kg: 0, reps: 6, done: false }] },
        { id: 'ex-fb-34', name: 'Alzate Laterali con Manubri', sets: [{ kg: 12, reps: 12, done: false }, { kg: 12, reps: 12, done: false }, { kg: 12, reps: 12, done: false }] },
        { id: 'ex-fb-35', name: 'Farmer Walk con Manubri Pesanti', sets: [{ kg: 26, reps: 30, done: false }, { kg: 26, reps: 30, done: false }, { kg: 26, reps: 30, done: false }] },
        { id: 'ex-fb-36', name: 'Addome alla Sbarra / Leg Raise', sets: [{ kg: 0, reps: 15, done: false }, { kg: 0, reps: 15, done: false }, { kg: 0, reps: 15, done: false }] },
        { id: 'ex-fb-37', name: 'Finisher: Burpees Esplosivi (30s ON / 30s OFF)', sets: [{ kg: 0, reps: 30, done: false }, { kg: 0, reps: 30, done: false }, { kg: 0, reps: 30, done: false }, { kg: 0, reps: 30, done: false }, { kg: 0, reps: 30, done: false }] },
        { id: 'ex-fb-38', name: 'Rotazioni: Russian Twist Leggero', sets: [{ kg: 5, reps: 15, done: false }, { kg: 5, reps: 15, done: false }] },
        { id: 'ex-fb-39', name: 'Rotazioni: Woodchopper Dinamico', sets: [{ kg: 10, reps: 10, done: false }, { kg: 10, reps: 10, done: false }] },
        { id: 'ex-fb-40', name: 'Rotazioni: Shadowboxing Ritmo Medio', sets: [{ kg: 0, reps: 20, done: false }, { kg: 0, reps: 20, done: false }] }
      ]
    },
    {
      day: 'Sabato',
      focus: 'Home Routine + Circuito Guardia Speciale (3 Giri, rec. 1m) + Finisher Guardia',
      exercises: [
        { id: 'ex-fb-41', name: 'Corda Continua (Home)', sets: [{ kg: 0, reps: 5, done: false }] },
        { id: 'ex-fb-42', name: 'Push Ups a Terra (Massime Reps)', sets: [{ kg: 0, reps: 20, done: false }, { kg: 0, reps: 20, done: false }, { kg: 0, reps: 20, done: false }, { kg: 0, reps: 20, done: false }] },
        { id: 'ex-fb-43', name: 'Squat con Manubri', sets: [{ kg: 20, reps: 12, done: false }, { kg: 20, reps: 12, done: false }, { kg: 20, reps: 12, done: false }, { kg: 20, reps: 12, done: false }] },
        { id: 'ex-fb-44', name: 'Elastici Trazioni Schiena', sets: [{ kg: 0, reps: 15, done: false }, { kg: 0, reps: 15, done: false }, { kg: 0, reps: 15, done: false }] },
        { id: 'ex-fb-45', name: 'Core Circuit Completo (Home)', sets: [{ kg: 0, reps: 10, done: false }] },
        { id: 'ex-fb-46', name: 'Guardia: Shadowboxing Attivo (2m)', sets: [{ kg: 0, reps: 120, done: false }, { kg: 0, reps: 120, done: false }, { kg: 0, reps: 120, done: false }] },
        { id: 'ex-fb-47', name: 'Guardia: Tenuta Ferma Gomiti Stretti (40s)', sets: [{ kg: 0, reps: 40, done: false }, { kg: 0, reps: 40, done: false }, { kg: 0, reps: 40, done: false }] },
        { id: 'ex-fb-48', name: 'Guardia: Alzate Frontali Lente', sets: [{ kg: 8, reps: 12, done: false }, { kg: 8, reps: 12, done: false }, { kg: 8, reps: 12, done: false }] },
        { id: 'ex-fb-49', name: 'Guardia: Alzate Laterali Lente', sets: [{ kg: 8, reps: 15, done: false }, { kg: 8, reps: 15, done: false }, { kg: 8, reps: 15, done: false }] },
        { id: 'ex-fb-50', name: 'Guardia: Pugni Diretti con Elastico', sets: [{ kg: 0, reps: 15, done: false }, { kg: 0, reps: 15, done: false }, { kg: 0, reps: 15, done: false }] },
        { id: 'ex-fb-51', name: 'Guardia: Plank con Tocco Spalle', sets: [{ kg: 0, reps: 20, done: false }, { kg: 0, reps: 20, done: false }, { kg: 0, reps: 20, done: false }] },
        { id: 'ex-fb-52', name: 'Finisher Guardia: Tenuta Alta 1m + Shadowboxing 1m (x2)', sets: [{ kg: 0, reps: 120, done: false }, { kg: 0, reps: 120, done: false }] }
      ]
    },
    {
      day: 'Domenica',
      focus: 'Recupero Attivo, Stretching Globale, Mobilità Articolare & Relax',
      exercises: [
        { id: 'ex-fb-53', name: 'Stretching Globale Catena Posteriore (15 min)', sets: [{ kg: 0, reps: 15, done: false }] },
        { id: 'ex-fb-54', name: 'Mobilità Anche, Spalle & Bacino (10 min)', sets: [{ kg: 0, reps: 10, done: false }] },
        { id: 'ex-fb-55', name: 'Respirazione Diaframmatica & Rilassamento', sets: [{ kg: 0, reps: 10, done: false }] }
      ]
    }
  ];

  const GYM_PRESETS = {
    fighter_boxing: FIGHTER_BOXING_ROUTINE[0].exercises,
    push: [
      {
        id: 'ex-push-1',
        name: 'Panca Piana Bilanciere',
        sets: [
          { kg: 75, reps: 8, done: false },
          { kg: 75, reps: 8, done: false },
          { kg: 75, reps: 8, done: false },
          { kg: 70, reps: 10, done: false }
        ]
      },
      {
        id: 'ex-push-2',
        name: 'Military Press / Spinte Manubri',
        sets: [
          { kg: 24, reps: 10, done: false },
          { kg: 24, reps: 10, done: false },
          { kg: 24, reps: 10, done: false }
        ]
      },
      {
        id: 'ex-push-3',
        name: 'Alzate Laterali Manubri',
        sets: [
          { kg: 12, reps: 14, done: false },
          { kg: 12, reps: 14, done: false },
          { kg: 12, reps: 14, done: false }
        ]
      },
      {
        id: 'ex-push-4',
        name: 'Pushdown Tricipiti Corda',
        sets: [
          { kg: 25, reps: 12, done: false },
          { kg: 25, reps: 12, done: false },
          { kg: 25, reps: 12, done: false }
        ]
      }
    ],
    pull: [
      {
        id: 'ex-pull-1',
        name: 'Lat Machine Presa Larga',
        sets: [
          { kg: 65, reps: 10, done: false },
          { kg: 65, reps: 10, done: false },
          { kg: 65, reps: 10, done: false },
          { kg: 60, reps: 12, done: false }
        ]
      },
      {
        id: 'ex-pull-2',
        name: 'Rematore Bilanciere / Pulley',
        sets: [
          { kg: 60, reps: 10, done: false },
          { kg: 60, reps: 10, done: false },
          { kg: 60, reps: 10, done: false }
        ]
      },
      {
        id: 'ex-pull-3',
        name: 'Face Pull Cavo Alto',
        sets: [
          { kg: 20, reps: 15, done: false },
          { kg: 20, reps: 15, done: false },
          { kg: 20, reps: 15, done: false }
        ]
      },
      {
        id: 'ex-pull-4',
        name: 'Curl Manubri Alternato',
        sets: [
          { kg: 16, reps: 10, done: false },
          { kg: 16, reps: 10, done: false },
          { kg: 16, reps: 10, done: false }
        ]
      }
    ],
    legs: [
      {
        id: 'ex-legs-1',
        name: 'Squat / Hack Squat',
        sets: [
          { kg: 90, reps: 8, done: false },
          { kg: 90, reps: 8, done: false },
          { kg: 90, reps: 8, done: false },
          { kg: 80, reps: 10, done: false }
        ]
      },
      {
        id: 'ex-legs-2',
        name: 'Stacco Rumeno (RDL)',
        sets: [
          { kg: 80, reps: 10, done: false },
          { kg: 80, reps: 10, done: false },
          { kg: 80, reps: 10, done: false }
        ]
      },
      {
        id: 'ex-legs-3',
        name: 'Leg Extension + Leg Curl',
        sets: [
          { kg: 55, reps: 12, done: false },
          { kg: 55, reps: 12, done: false },
          { kg: 55, reps: 12, done: false }
        ]
      },
      {
        id: 'ex-legs-4',
        name: 'Calf Raise + Crunch Cavo',
        sets: [
          { kg: 45, reps: 15, done: false },
          { kg: 45, reps: 15, done: false },
          { kg: 45, reps: 15, done: false }
        ]
      }
    ],
    full: [
      {
        id: 'ex-full-1',
        name: 'Panca Piana Bilanciere',
        sets: [
          { kg: 75, reps: 8, done: false },
          { kg: 75, reps: 8, done: false },
          { kg: 75, reps: 8, done: false }
        ]
      },
      {
        id: 'ex-full-2',
        name: 'Lat Machine / Trazioni',
        sets: [
          { kg: 65, reps: 10, done: false },
          { kg: 65, reps: 10, done: false },
          { kg: 65, reps: 10, done: false }
        ]
      },
      {
        id: 'ex-full-3',
        name: 'Pressa 45° / Squat',
        sets: [
          { kg: 120, reps: 10, done: false },
          { kg: 120, reps: 10, done: false },
          { kg: 120, reps: 10, done: false }
        ]
      },
      {
        id: 'ex-full-4',
        name: 'Shoulder Press + Braccia',
        sets: [
          { kg: 22, reps: 12, done: false },
          { kg: 22, reps: 12, done: false },
          { kg: 22, reps: 12, done: false }
        ]
      }
    ]
  };

  function getLocalDateStr(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getWeekDates(refDate = new Date()) {
    const now = new Date(refDate);
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      dates.push(getLocalDateStr(d));
    }
    return dates;
  }

  const todayDayIdxInit = (new Date().getDay() + 6) % 7;
  const initialRoutineToday = FIGHTER_BOXING_ROUTINE[todayDayIdxInit] || FIGHTER_BOXING_ROUTINE[0];
  const todayStrInit = getLocalDateStr();

  const DEFAULT_EXTRA = {
    smokingBaselinePerDay: 15,
    smokingCostPerUnit: 0.30,
    cravingsWonCount: 0,
    dailyBudgetEuro: 50,
    lastCigaretteTimestamp: null,
    focusMinutesToday: 0,
    activeWeekMonday: getWeekDates()[0],
    weeklyArchive52: [],
    gymHistory: [],
    trackerHistoryOverrides: {},
    habitHistoryOverrides: {}, // { [habitId]: { [dateStr]: state } }
    milestoneOverrides: {},
    exercisePRs: {
      'Panca Piana Bilanciere': { kg: 75, reps: 6, date: '19 Ott' },
      'Squat con Bilanciere': { kg: 95, reps: 6, date: '14 Ott' },
      'Stacco da Terra Convenzionale': { kg: 110, reps: 4, date: '16 Ott' },
      'Military Press con Bilanciere/Manubri': { kg: 40, reps: 6, date: '19 Ott' },
      'Rematore con Bilanciere': { kg: 60, reps: 8, date: '19 Ott' },
      'Stacco Rumeno con Bilanciere (RDL)': { kg: 80, reps: 8, date: '14 Ott' },
      'Panca Inclinata con Manubri': { kg: 26, reps: 8, date: '16 Ott' },
      'Trazioni alla Sbarra': { kg: 0, reps: 6, date: '19 Ott' },
      'Russian Twist con Peso': { kg: 10, reps: 20, date: '19 Ott' },
      'Woodchopper al Cavo/Manubrio': { kg: 15, reps: 12, date: '19 Ott' }
    },
    exerciseHistory: {
      'Panca Piana Bilanciere': [
        { date: '12 Ott', kg: 72.5, reps: 6, setNum: 1 },
        { date: '12 Ott', kg: 72.5, reps: 6, setNum: 2 },
        { date: '19 Ott', kg: 75, reps: 6, setNum: 1 },
        { date: '19 Ott', kg: 75, reps: 6, setNum: 2 }
      ],
      'Squat con Bilanciere': [
        { date: '07 Ott', kg: 92.5, reps: 6, setNum: 1 },
        { date: '14 Ott', kg: 95, reps: 6, setNum: 1 }
      ],
      'Stacco da Terra Convenzionale': [
        { date: '09 Ott', kg: 105, reps: 4, setNum: 1 },
        { date: '16 Ott', kg: 110, reps: 4, setNum: 1 }
      ]
    },
    warmupChecks: {},
    gymActiveDate: todayStrInit,
    activeGymDayIdx: todayDayIdxInit,
    dailyGymSessions: {
      [todayStrInit]: {
        date: todayStrInit,
        dayIdx: todayDayIdxInit,
        dayName: initialRoutineToday.day,
        focus: initialRoutineToday.focus,
        exercises: JSON.parse(JSON.stringify(initialRoutineToday.exercises))
      }
    },
    gymExercises: JSON.parse(JSON.stringify(initialRoutineToday.exercises)),
    expenses: [
      { id: 'exp-1', title: 'Pranzo proteico', amount: 14.50, category: 'Cibo', date: todayStrInit },
      { id: 'exp-2', title: 'Integrazione Magnesio & Omega 3', amount: 24.00, category: 'Sport', date: todayStrInit }
    ],
    intervalConfig: {
      workSec: 120, // 2 minuti
      restSec: 30,  // 30 secondi
      rounds: 5,    // 5 round
      prepSec: 5,   // 5s countdown iniziale
      sound: 'boxing_bell' // campana ring boxe
    },
    weeklyGymProgram: {
      splitName: '🥊 FIGHTER BOXING & STRENGTH (7 Giorni)',
      schedule: FIGHTER_BOXING_ROUTINE
    }
  };

  function loadExtraState() {
    try {
      const raw = localStorage.getItem(LOCAL_EXTRA_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        let archive = Array.isArray(parsed.weeklyArchive52) ? parsed.weeklyArchive52 : [];
        // Purge mock weeks generated by old template so user starts completely clean
        if (archive.some((w) => w && w.weekNumber !== undefined)) {
          archive = [];
        }
        let gymHist = Array.isArray(parsed.gymHistory)
          ? parsed.gymHistory.filter((g) => g && g.id !== 'gh-1' && g.id !== 'gh-2')
          : [];

        return {
          ...DEFAULT_EXTRA,
          ...parsed,
          weeklyArchive52: archive,
          gymHistory: gymHist,
          weeklyGymProgram: parsed.weeklyGymProgram || DEFAULT_EXTRA.weeklyGymProgram,
          exercisePRs: parsed.exercisePRs || DEFAULT_EXTRA.exercisePRs,
          exerciseHistory: parsed.exerciseHistory || DEFAULT_EXTRA.exerciseHistory,
          warmupChecks: parsed.warmupChecks || {},
          trackerHistoryOverrides: parsed.trackerHistoryOverrides || {},
          habitHistoryOverrides: parsed.habitHistoryOverrides || {},
          milestoneOverrides: parsed.milestoneOverrides || {}
        };
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_EXTRA));
  }

  function saveExtraState() {
    try {
      localStorage.setItem(LOCAL_EXTRA_KEY, JSON.stringify(extraState));
      fetch('/api/auth/extra-state', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ extraState, token: currentToken })
      }).catch(() => {});
    } catch (e) {}
  }

  let extraState = loadExtraState();

  const commandForm = document.getElementById('command-form');
  const commandInput = document.getElementById('command-input');
  const voiceOrbBtn = document.getElementById('voice-orb-btn');
  const btnToggleCmdDrawer = document.getElementById('btn-toggle-cmd-drawer');
  const cmdDrawer = document.getElementById('cmd-drawer');
  const btnTestAlarmSound = document.getElementById('btn-test-alarm-sound');
  const syncStatusPill = document.getElementById('sync-status-pill');
  const syncStatusText = document.getElementById('sync-status-text');
  const actionToast = document.getElementById('action-toast');
  const actionToastText = document.getElementById('action-toast-text');
  const universalSheet = document.getElementById('universal-sheet-dialog');

  // Modals & Safari Light-Dismiss Fallback
  const dialogs = document.querySelectorAll('dialog.nexus-dialog');
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    dialogs.forEach((dialog) => {
      if (dialog.getAttribute('closedby') === 'any') {
        dialog.addEventListener('click', (event) => {
          if (event.target !== dialog) return;
          const rect = dialog.getBoundingClientRect();
          const isDialogContent =
            rect.top <= event.clientY &&
            event.clientY <= rect.top + rect.height &&
            rect.left <= event.clientX &&
            event.clientX <= rect.left + rect.width;
          if (isDialogContent) return;
          dialog.close();
        });
      }
    });
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js?v=9').then((reg) => reg.update()).catch(() => {});
  }
  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((k) => {
        if (k !== 'promemory-v9') caches.delete(k);
      });
    }).catch(() => {});
  }

  // Multi-User Session & Token Isolation
  const TOKEN_STORAGE_KEY = 'promemory_user_token';
  let currentToken = localStorage.getItem(TOKEN_STORAGE_KEY) || 'tok_tolo_master_founder';
  let currentUser = null;
  let systemSettings = null;
  let currentWizardStep = 1;
  let selectedGymDayIdx = (new Date().getDay() + 6) % 7;

  function getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentToken}`
    };
  }

  function buildFallbackState() {
    const todayStr = new Date().toISOString().split('T')[0];
    return {
      profile: { name: 'Tolo', role: 'Founder & Creator' },
      trackers: [
        {
          id: 'trk-cig',
          name: 'Sigarette Fumate Oggi',
          icon: '🚬',
          unit: 'sigarette',
          mode: 'limit',
          dailyTarget: 5,
          step: 1,
          costPerUnit: 0.30,
          history: { [todayStr]: 3 },
          logs: []
        },
        {
          id: 'trk-water',
          name: 'Idratazione Quotidiana',
          icon: '💧',
          unit: 'bicchieri',
          mode: 'goal',
          dailyTarget: 8,
          step: 1,
          costPerUnit: 0,
          history: { [todayStr]: 5 },
          logs: []
        }
      ],
      habits: [
        {
          id: 'hab-1',
          name: 'Deep Work Mattutino (90m)',
          category: 'Produttività',
          schedule: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          targetPerWeek: 5,
          streak: 6,
          history: { [todayStr]: 'done' }
        },
        {
          id: 'hab-2',
          name: 'Allenamento Palestra & Mobilità',
          category: 'Fitness',
          schedule: ['Mon', 'Wed', 'Fri', 'Sat'],
          targetPerWeek: 4,
          streak: 4,
          history: { [todayStr]: 'pending' }
        },
        {
          id: 'hab-3',
          name: 'Zero Nicotina dopo le 21:00',
          category: 'Salute',
          schedule: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          targetPerWeek: 7,
          streak: 3,
          history: { [todayStr]: 'pending' }
        }
      ],
      alarms: [
        { id: 'alm-1', time: '06:30', label: 'Sveglia Principale', enabled: true, group: 'Mattina', sound: 'cascade' },
        { id: 'alm-2', time: '06:35', label: 'Backup #2 (+5m)', enabled: true, group: 'Mattina', sound: 'pulse' }
      ],
      reminders: [
        { id: 'rem-1', title: 'Bere 500ml di acqua appena sveglio', dueTime: '07:00', completed: false }
      ],
      events: [
        { id: 'evt-1', title: 'Blocco Deep Work Progetti', startTime: '09:00', endTime: '11:00' },
        { id: 'evt-2', title: 'Sessione Palestra', startTime: '18:00', endTime: '19:30' }
      ],
      tasks: [
        { id: 'tsk-1', title: 'Revisione obiettivi settimanali', priority: 'high', status: 'todo' },
        { id: 'tsk-2', title: 'Completare allenamento programmato', priority: 'medium', status: 'todo' }
      ],
      goals: [
        {
          id: 'gol-1',
          title: 'Smettere di Fumare — Riduzione Progressiva',
          category: 'Salute',
          progress: 60,
          milestones: [
            { id: 'm-1', title: 'Scendere sotto 5 sigarette al giorno', done: true },
            { id: 'm-2', title: 'Azzerare le sigarette mattutine', done: false }
          ]
        }
      ]
    };
  }

  function ensureAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playUiTick(freq = 640) {
    try {
      if (navigator.vibrate) navigator.vibrate(8);
      ensureAudioContext();
      if (!audioCtx) return;
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
    } catch (e) {}
  }

  function showActionToast(msg) {
    if (!actionToast || !actionToastText) return;
    actionToastText.textContent = msg;
    actionToast.hidden = false;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      actionToast.hidden = true;
    }, 3200);
  }

  function saveOfflineState(state) {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function loadOfflineState() {
    try {
      const raw = localStorage.getItem(LOCAL_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.trackers) && parsed.trackers.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  }

  function getTrackerDayValue(trk, dateStr) {
    const override = extraState.trackerHistoryOverrides?.[trk.id]?.[dateStr];
    if (override !== undefined) return Number(override);
    return Number(trk.history?.[dateStr] || 0);
  }

  function getHabitDayState(habit, dateStr, dayCode) {
    const override = extraState.habitHistoryOverrides?.[habit.id]?.[dateStr];
    if (override !== undefined) return override;
    const raw = habit.history?.[dateStr];
    if (raw) return raw;
    return habit.schedule.includes(dayCode) ? 'pending' : 'unscheduled';
  }

  // ==========================================================================
  // BULLETPROOF CIGARETTE & TRACKER +/- ADJUSTMENT (INSTANT OPTIMISTIC UI)
  // ==========================================================================
  function adjustTrackerCount(trackerIdOrSmoke, delta) {
    if (!currentState) {
      currentState = loadOfflineState() || buildFallbackState();
    }
    currentState.trackers = currentState.trackers || [];
    const todayStr = new Date().toISOString().split('T')[0];
    let trk = null;
    if (trackerIdOrSmoke === 'smoke') {
      trk = currentState.trackers.find((t) => t.id === 'trk-cig' || t.name.toLowerCase().includes('sigarett'));
      if (!trk) {
        trk = {
          id: 'trk-cig',
          name: 'Sigarette Fumate Oggi',
          icon: '🚬',
          unit: 'sigarette',
          mode: 'limit',
          dailyTarget: 5,
          step: 1,
          costPerUnit: 0.30,
          history: { [todayStr]: 0 },
          logs: []
        };
        currentState.trackers.unshift(trk);
      }
    } else {
      trk = currentState.trackers.find((t) => t.id === trackerIdOrSmoke);
    }
    if (!trk) return;

    const currentVal = getTrackerDayValue(trk, todayStr);
    const nextVal = Math.max(0, currentVal + Number(delta));

    // Update both override & state immediately so + and - ALWAYS work even on past/overridden values
    extraState.trackerHistoryOverrides = extraState.trackerHistoryOverrides || {};
    extraState.trackerHistoryOverrides[trk.id] = extraState.trackerHistoryOverrides[trk.id] || {};
    extraState.trackerHistoryOverrides[trk.id][todayStr] = nextVal;

    trk.history = trk.history || {};
    trk.history[todayStr] = nextVal;

    const isCig = trk.id === 'trk-cig' || trk.name.toLowerCase().includes('sigarett');
    if (isCig && delta > 0) {
      extraState.lastCigaretteTimestamp = Date.now();
    }
    saveExtraState();
    saveOfflineState(currentState);
    renderAll(currentState);

    mutateState('ADJUST_TRACKER', { id: trk.id, delta: Number(delta), value: nextVal, date: todayStr });

    if (isCig) {
      showActionToast(
        delta > 0
          ? `🚬 +1 Sigaretta (Oggi: ${nextVal}/${trk.dailyTarget})`
          : `🚬 −1 Sigaretta rimossa (Oggi: ${nextVal}/${trk.dailyTarget})`
      );
    } else {
      showActionToast(`${trk.icon || ''} ${trk.name}: ${nextVal} / ${trk.dailyTarget}`);
    }
  }

  // ==========================================================================
  // WEEKLY AUTO-RESET & 52-WEEK (1-YEAR) ARCHIVE ENGINE
  // ==========================================================================
  function computeCurrentWeekSummary(state) {
    const weekDates = getWeekDates();
    const mDate = new Date(weekDates[0]);
    const sDate = new Date(weekDates[6]);
    const label = `${mDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} – ${sDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' })}`;

    let schedTotal = 0;
    let doneTotal = 0;
    (state?.habits || []).forEach((h) => {
      weekDates.forEach((dStr, idx) => {
        const code = DAY_CODES[idx];
        const st = getHabitDayState(h, dStr, code);
        if (h.schedule.includes(code)) schedTotal++;
        if (st === 'done') doneTotal++;
      });
    });
    const habitsPct = schedTotal > 0 ? Math.min(100, Math.round((doneTotal / schedTotal) * 100)) : 0;

    const cigTracker = (state?.trackers || []).find((t) => t.id === 'trk-cig' || t.name.toLowerCase().includes('sigarett'));
    let cigarettesTotal = 0;
    weekDates.forEach((dStr) => {
      if (cigTracker) cigarettesTotal += getTrackerDayValue(cigTracker, dStr);
    });

    const baselinePerDay = Number(extraState.smokingBaselinePerDay) || 0;
    const baselineWeek = baselinePerDay * 7;
    const unitCost = Number(extraState.smokingCostPerUnit || cigTracker?.costPerUnit || 0.30);
    const savedEuros = baselineWeek > 0 ? Number((Math.max(0, baselineWeek - cigarettesTotal) * unitCost).toFixed(2)) : 0;

    let gymVolumeKg = 0;
    (extraState.gymExercises || []).forEach((ex) => {
      (ex.sets || []).forEach((s) => {
        if (s.done) gymVolumeKg += (Number(s.kg) || 0) * (Number(s.reps) || 0);
      });
    });

    return {
      weekKey: weekDates[0],
      weekNumber: 52,
      label: `Settimana Corrente (${label})`,
      habitsPct,
      cigarettesTotal,
      savedEuros,
      gymVolumeKg,
      focusMinutes: Number(extraState.focusMinutesToday) || 0,
      score: habitsPct
    };
  }

  function archiveAndResetCurrentWeek(isAutoMonday = false) {
    if (!currentState) return;
    const summary = computeCurrentWeekSummary(currentState);
    const weekDates = getWeekDates();

    // Save snapshot into 52-week archive (retaining at least 56 weeks = >1 full year)
    extraState.weeklyArchive52 = extraState.weeklyArchive52 || [];
    const existingIdx = extraState.weeklyArchive52.findIndex((w) => w.weekKey === summary.weekKey);
    const cleanSnapshot = {
      ...summary,
      label: summary.label.replace('Settimana Corrente (', '').replace(')', '')
    };

    if (existingIdx >= 0) {
      extraState.weeklyArchive52[existingIdx] = cleanSnapshot;
    } else {
      extraState.weeklyArchive52.unshift(cleanSnapshot);
    }
    if (extraState.weeklyArchive52.length > 60) {
      extraState.weeklyArchive52 = extraState.weeklyArchive52.slice(0, 60);
    }

    // Reset all 7 days of current week for all counters & habits to 0 / pending
    extraState.trackerHistoryOverrides = extraState.trackerHistoryOverrides || {};
    (currentState.trackers || []).forEach((trk) => {
      extraState.trackerHistoryOverrides[trk.id] = extraState.trackerHistoryOverrides[trk.id] || {};
      weekDates.forEach((dStr) => {
        extraState.trackerHistoryOverrides[trk.id][dStr] = 0;
        if (trk.history) trk.history[dStr] = 0;
      });
      mutateState('RESET_TRACKER_TODAY', { id: trk.id });
    });

    extraState.habitHistoryOverrides = extraState.habitHistoryOverrides || {};
    (currentState.habits || []).forEach((hab) => {
      extraState.habitHistoryOverrides[hab.id] = extraState.habitHistoryOverrides[hab.id] || {};
      weekDates.forEach((dStr, idx) => {
        const isSched = hab.schedule.includes(DAY_CODES[idx]);
        const resetState = isSched ? 'pending' : 'unscheduled';
        extraState.habitHistoryOverrides[hab.id][dStr] = resetState;
        if (hab.history) hab.history[dStr] = resetState;
      });
    });

    // Reset gym checkboxes for fresh week
    (extraState.gymExercises || []).forEach((ex) => {
      (ex.sets || []).forEach((s) => { s.done = false; });
    });

    extraState.activeWeekMonday = weekDates[0];
    saveExtraState();
    renderAll(currentState);

    if (isAutoMonday) {
      showActionToast('📅 Nuova settimana iniziata! Dati archiviati nel Report 1 Anno e contatori azzerati.');
    } else {
      playAlarmChime('pulse');
      showActionToast('🔄 Settimana archiviata nel Report 1 Anno e contatori azzerati a 0!');
    }
  }

  function checkAutoWeeklyRollover() {
    const currentMonday = getWeekDates()[0];
    if (extraState.activeWeekMonday && extraState.activeWeekMonday !== currentMonday) {
      archiveAndResetCurrentWeek(true);
    } else if (!extraState.activeWeekMonday) {
      extraState.activeWeekMonday = currentMonday;
      saveExtraState();
    }
  }

  function createWeekReportCard(w, isCurrent, weekNum) {
    const card = document.createElement('div');
    card.className = 'week-report-card';

    const top = document.createElement('div');
    top.className = 'week-report-top';

    const title = document.createElement('strong');
    title.textContent = isCurrent ? `🟢 ${w.label}` : `📅 Settimana #${weekNum} — ${w.label}`;

    const badge = document.createElement('span');
    const sc = Number(w.score ?? w.habitsPct ?? 0);
    badge.className = sc >= 80 ? 'tag-emerald' : sc >= 60 ? 'tag-gold' : 'tag-neutral';
    badge.textContent = `Score: ${sc}%`;

    top.appendChild(title);
    top.appendChild(badge);

    const metrics = document.createElement('div');
    metrics.className = 'week-report-metrics';

    const items = [
      { lbl: 'Abitudini', val: `${w.habitsPct || 0}%` },
      { lbl: 'Sigarette 7g', val: `${w.cigarettesTotal || 0} sig` },
      { lbl: 'Risparmio', val: `€${Number(w.savedEuros || 0).toFixed(2)}` },
      { lbl: 'Volume Gym', val: `${w.gymVolumeKg || 0} kg` }
    ];

    items.forEach((it) => {
      const box = document.createElement('div');
      box.className = 'wrm-item';
      const s = document.createElement('span');
      s.textContent = it.lbl;
      const b = document.createElement('strong');
      b.textContent = it.val;
      box.appendChild(s);
      box.appendChild(b);
      metrics.appendChild(box);
    });

    card.appendChild(top);
    card.appendChild(metrics);
    return card;
  }

  function render52WeekReport(state) {
    const grid52 = document.getElementById('year-52-grid');
    const listEl = document.getElementById('weekly-reports-list');
    if (!grid52 || !listEl) return;

    grid52.replaceChildren();
    listEl.replaceChildren();

    const currentSummary = computeCurrentWeekSummary(state);
    const archive = extraState.weeklyArchive52 || [];

    // Chronological order: past recorded weeks (oldest first) followed by current active week
    const pastChronological = [...archive].reverse();
    const recordedChronological = [
      ...pastChronological,
      { ...currentSummary, isCurrent: true }
    ];

    let scoreSum = 0;
    let totalYearSaved = 0;
    const recordedCount = recordedChronological.length;

    // Render 52 visual slots (recorded weeks + future empty dashed slots)
    for (let slotIdx = 0; slotIdx < 52; slotIdx++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'week-52-cell';

      if (slotIdx < recordedCount) {
        const w = recordedChronological[slotIdx];
        const sc = Number(w.score ?? w.habitsPct ?? 0);
        scoreSum += sc;
        totalYearSaved += Number(w.savedEuros || 0);

        cell.dataset.tier = sc >= 80 ? 'high' : sc >= 60 ? 'mid' : 'low';
        if (w.isCurrent) cell.dataset.current = 'true';
        cell.title = `Settimana ${slotIdx + 1} (${w.label}): ${sc}% costanza · ${w.cigarettesTotal || 0} sig · €${Number(w.savedEuros || 0).toFixed(2)} risparmiati`;

        const numSpan = document.createElement('span');
        numSpan.className = 'week-52-num';
        numSpan.textContent = w.isCurrent ? 'ORA' : `S${slotIdx + 1}`;

        const scSpan = document.createElement('span');
        scSpan.className = 'week-52-score';
        scSpan.textContent = `${sc}%`;

        cell.appendChild(numSpan);
        cell.appendChild(scSpan);
        cell.addEventListener('click', () => {
          playUiTick(700);
          showActionToast(`📅 ${w.label}: Costanza ${sc}% · Sigarette ${w.cigarettesTotal || 0} · Risparmio €${Number(w.savedEuros || 0).toFixed(2)}`);
        });
      } else {
        // Future empty week placeholder
        cell.dataset.tier = 'empty';
        cell.title = `Settimana ${slotIdx + 1} — In attesa dei dati`;

        const numSpan = document.createElement('span');
        numSpan.className = 'week-52-num';
        numSpan.textContent = `S${slotIdx + 1}`;

        const scSpan = document.createElement('span');
        scSpan.className = 'week-52-score';
        scSpan.textContent = '—';

        cell.appendChild(numSpan);
        cell.appendChild(scSpan);
      }
      grid52.appendChild(cell);
    }

    const avgYear = recordedCount > 0 ? Math.round(scoreSum / recordedCount) : 0;
    const avgScoreEl = document.getElementById('rep-year-avg-score');
    if (avgScoreEl) avgScoreEl.textContent = `${avgYear}%`;
    const savedEl = document.getElementById('rep-year-saved-euros');
    if (savedEl) savedEl.textContent = `€${totalYearSaved.toFixed(2)}`;
    const weeksCountEl = document.getElementById('rep-year-weeks-count');
    if (weeksCountEl) weeksCountEl.textContent = `${recordedCount} / 52 sett.`;

    // Render Detailed Weekly Report Cards (Current week first)
    const currentCard = createWeekReportCard(currentSummary, true, recordedCount);
    listEl.appendChild(currentCard);

    if (archive.length === 0) {
      const emptyNote = document.createElement('div');
      emptyNote.className = 'empty-archive-note mt-8';
      emptyNote.innerHTML = `
        <div style="font-size: 26px;">🌱</div>
        <strong>Nessun archivio storico pregresso</strong>
        <p>Hai appena iniziato con PROMEMORY! Man mano che completi le giornate e ogni lunedì quando la settimana si chiude (o quando clicchi su <em>"Salva & Chiudi Settimana"</em>), ciascuna settimana reale verrà archiviata e conservata qui senza mai perdere i tuoi dati.</p>
      `;
      listEl.appendChild(emptyNote);
    } else {
      archive.slice(0, 52).forEach((w, idx) => {
        const card = createWeekReportCard(w, false, archive.length - idx);
        listEl.appendChild(card);
      });
    }
  }

  function playAlarmChime(pattern = 'cascade') {
    ensureAudioContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const notes = pattern === 'pulse' ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25, 880];

    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);

      gain.gain.setValueAtTime(0.001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.24, now + idx * 0.14 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.45);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.48);
    });
  }

  function playIntervalSound(type = 'work_start', soundChoice = 'boxing_bell') {
    ensureAudioContext();
    if (!audioCtx) return;

    if (navigator.vibrate) {
      if (type === 'work_start') navigator.vibrate([280, 100, 280]);
      else if (type === 'rest_start') navigator.vibrate([400, 150, 400]);
      else if (type === 'warning_beep') navigator.vibrate(80);
      else if (type === 'workout_completed') navigator.vibrate([200, 100, 200, 100, 400]);
    }

    const now = audioCtx.currentTime;

    // Warning 3-2-1 countdown beep (sharp short pip)
    if (type === 'warning_beep') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
      return;
    }

    // 1. AUTHENTIC BOXING RING BELL (Rich brass inharmonic partials + strike click)
    if (soundChoice === 'boxing_bell') {
      const bellCount = type === 'work_start' ? 3 : (type === 'rest_start' ? 2 : 4);
      for (let b = 0; b < bellCount; b++) {
        const bellTime = now + b * 0.28;
        // Strike click
        const clickOsc = audioCtx.createOscillator();
        const clickGain = audioCtx.createGain();
        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(2400, bellTime);
        clickGain.gain.setValueAtTime(0.35, bellTime);
        clickGain.gain.exponentialRampToValueAtTime(0.001, bellTime + 0.03);
        clickOsc.connect(clickGain);
        clickGain.connect(audioCtx.destination);
        clickOsc.start(bellTime);
        clickOsc.stop(bellTime + 0.04);

        // Ringing brass body
        const partials = [784, 1240, 1780, 2410];
        partials.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, bellTime);
          const amp = 0.38 / (idx + 1);
          gain.gain.setValueAtTime(0.001, bellTime);
          gain.gain.linearRampToValueAtTime(amp, bellTime + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, bellTime + 1.25);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(bellTime);
          osc.stop(bellTime + 1.3);
        });
      }
      return;
    }

    // 2. POWERFUL RESONANT GONG
    if (soundChoice === 'powerful_gong') {
      const gongPartials = [110, 220, 330, 440, 660, 880];
      gongPartials.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        const amp = 0.42 / (idx + 1);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(amp, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 2.3);
      });
      return;
    }

    // 3. ENERGETIC DIGITAL ALARM
    if (soundChoice === 'digital_alarm') {
      const alarmPulses = type === 'work_start' ? [920, 1420, 920, 1420] : [1420, 920];
      alarmPulses.forEach((freq, idx) => {
        const pulseTime = now + idx * 0.16;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, pulseTime);
        gain.gain.setValueAtTime(0.001, pulseTime);
        gain.gain.linearRampToValueAtTime(0.24, pulseTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, pulseTime + 0.13);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(pulseTime);
        osc.stop(pulseTime + 0.14);
      });
      return;
    }

    // 4. REFEREE SPORTS WHISTLE
    if (soundChoice === 'whistle') {
      const whistleDuration = type === 'work_start' ? 0.65 : 0.45;
      [2600, 2800].forEach((freq) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        const lfo = audioCtx.createOscillator();
        const lfoGain = audioCtx.createGain();
        lfo.frequency.setValueAtTime(18, now);
        lfoGain.gain.setValueAtTime(80, now);
        lfo.connect(osc.frequency);
        lfo.start(now);
        lfo.stop(now + whistleDuration);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.28, now + 0.04);
        gain.gain.setValueAtTime(0.28, now + whistleDuration - 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + whistleDuration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + whistleDuration + 0.05);
      });
    }
  }

  function toggleAmbientFocusSound() {
    ensureAudioContext();
    const btn = document.getElementById('btn-focus-ambient');
    if (ambientNode) {
      ambientNode.stop();
      ambientNode.disconnect();
      ambientNode = null;
      btn.textContent = '🎧 Brown Noise OFF';
      return;
    }
    if (!audioCtx) return;
    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 0.06;
    }
    ambientNode = audioCtx.createBufferSource();
    ambientNode.buffer = noiseBuffer;
    ambientNode.loop = true;
    ambientNode.connect(audioCtx.destination);
    ambientNode.start(0);
    btn.textContent = '🎧 Brown Noise ON';
    showActionToast('🎧 Audio Deep Work attivato');
  }

  if (btnToggleCmdDrawer && cmdDrawer) {
    btnToggleCmdDrawer.addEventListener('click', () => {
      playUiTick(660);
      const isOpen = !cmdDrawer.hidden;
      cmdDrawer.hidden = isOpen;
      btnToggleCmdDrawer.setAttribute('aria-expanded', String(!isOpen));
      if (!isOpen) {
        setTimeout(() => commandInput?.focus(), 60);
      }
    });
  }

  function initSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    recognition = new SpeechRec();
    recognition.lang = 'it-IT';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.addEventListener('start', () => {
      isListening = true;
      voiceOrbBtn.setAttribute('aria-pressed', 'true');
      commandInput.placeholder = 'Sto ascoltando... parla ora';
    });

    recognition.addEventListener('result', (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      commandInput.value = transcript;
      if (event.results[event.results.length - 1].isFinal) {
        submitCommand(transcript.trim(), 'Voce');
      }
    });

    recognition.addEventListener('end', () => {
      isListening = false;
      voiceOrbBtn.setAttribute('aria-pressed', 'false');
      commandInput.placeholder = 'Scrivi o parla: «Ho fumato», «Togli sigaretta», «Spesa 15€ pranzo», «Sveglie 9-10 ogni 5m»...';
    });

    recognition.addEventListener('error', () => {
      isListening = false;
      voiceOrbBtn.setAttribute('aria-pressed', 'false');
    });
  }

  voiceOrbBtn.addEventListener('click', () => {
    ensureAudioContext();
    if (!recognition) initSpeechRecognition();
    if (!recognition) {
      commandInput.focus();
      return;
    }
    if (isListening) recognition.stop();
    else recognition.start();
  });

  if (btnTestAlarmSound) {
    btnTestAlarmSound.addEventListener('click', () => playAlarmChime('cascade'));
  }

  function launchIosAlarmShortcut(timesArray) {
    const list = timesArray && timesArray.length
      ? timesArray
      : (currentState?.alarms || []).filter((a) => a.enabled).map((a) => a.time);
    if (!list.length) return;
    const encodedInput = encodeURIComponent(list.join(','));
    window.location.href = `shortcuts://run-shortcut?name=${encodeURIComponent('PROMEMORY Alarms')}&input=text&text=${encodedInput}`;
  }

  // ==========================================================================
  // NAVIGATION: TABS, iOS SEGMENTED CONTROLS & CONTEXTUAL '+' BOTTOM SHEET
  // ==========================================================================
  function activateTab(targetTab) {
    let mappedTab = targetTab;
    if (targetTab === 'overview') mappedTab = 'trackers';
    if (targetTab === 'planner') mappedTab = 'today';

    currentActiveTab = mappedTab;
    document.querySelectorAll('.tab-btn, .m-nav-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === mappedTab);
    });
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      const isMatch = panel.id === `panel-${mappedTab}`;
      panel.classList.toggle('active', isMatch);
      panel.hidden = !isMatch;
    });

    if (mappedTab === 'report' && currentState) {
      render52WeekReport(currentState);
    }
  }

  function activateSegment(groupName, targetId) {
    document.querySelectorAll(`[data-seg-group="${groupName}"]`).forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.segTarget === targetId);
    });
    const parentPanel = document.querySelector(`[data-seg-group="${groupName}"]`)?.closest('.tab-panel');
    if (parentPanel) {
      parentPanel.querySelectorAll('.seg-view').forEach((view) => {
        const isMatch = view.id === `seg-${targetId}`;
        view.classList.toggle('active', isMatch);
        view.hidden = !isMatch;
      });
    }
  }

  document.querySelectorAll('[data-seg-group]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playUiTick(700);
      activateSegment(btn.dataset.segGroup, btn.dataset.segTarget);
    });
  });

  const SHEET_TITLES = {
    task: 'Nuovo Task Operativo',
    expense: 'Registra Spesa Rapida',
    alarm: 'Nuova Sveglia o Sequenza',
    gym: 'Aggiungi Esercizio Palestra',
    tracker: 'Crea Nuovo Contatore',
    habit: 'Aggiungi Abitudine',
    event: 'Aggiungi Impegno in Agenda',
    reminder: 'Imposta Promemoria',
    goal: 'Nuovo Obiettivo Strategico'
  };

  function openUniversalSheet(defaultMode) {
    if (!universalSheet) return;
    let mode = defaultMode;
    if (!mode) {
      const mapByTab = {
        today: 'task',
        trackers: 'tracker',
        gym: 'gym',
        alarms: 'alarm',
        finance: 'expense'
      };
      mode = mapByTab[currentActiveTab] || 'task';
    }
    switchSheetMode(mode);
    universalSheet.showModal();
  }

  function switchSheetMode(mode) {
    document.getElementById('sheet-main-title').textContent = SHEET_TITLES[mode] || 'Aggiungi';
    document.querySelectorAll('[data-sheet-mode]').forEach((pill) => {
      pill.classList.toggle('active', pill.dataset.sheetMode === mode);
    });
    document.querySelectorAll('[data-sheet-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.sheetPanel !== mode;
    });
  }

  document.querySelectorAll('[data-sheet-mode]').forEach((pill) => {
    pill.addEventListener('click', () => {
      playUiTick(680);
      switchSheetMode(pill.dataset.sheetMode);
    });
  });

  document.querySelectorAll('[data-open-sheet]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playUiTick(720);
      openUniversalSheet(btn.dataset.openSheet);
    });
  });

  document.getElementById('btn-mobile-fab')?.addEventListener('click', () => {
    playUiTick(760);
    openUniversalSheet();
  });

  document.getElementById('btn-desktop-quick-add')?.addEventListener('click', () => {
    playUiTick(760);
    openUniversalSheet();
  });

  // ==========================================================================
  // EXECUTIVE DAILY SCORE, COMPACT KPI STRIP & QUICK CIGARETTE BAR
  // ==========================================================================
  function renderHeaderAndKpis(state) {
    const todayStr = new Date().toISOString().split('T')[0];
    const weekDates = getWeekDates();
    const dateFormatted = new Date().toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
    const dateLbl = document.getElementById('exec-date-label');
    const liveDateEl = document.getElementById('live-italian-date');
    if (dateLbl && !liveDateEl) dateLbl.textContent = dateFormatted.toUpperCase();

    const dayIdx = (new Date().getDay() + 6) % 7;
    const todayCode = DAY_CODES[dayIdx];
    let habScheduled = 0;
    let habDone = 0;
    (state.habits || []).forEach((h) => {
      if (h.schedule.includes(todayCode)) habScheduled++;
      if (getHabitDayState(h, todayStr, todayCode) === 'done') habDone++;
    });

    const kpiHabits = document.getElementById('kpi-habits-today');
    if (kpiHabits) kpiHabits.textContent = `${habDone}/${Math.max(1, habScheduled)}`;

    const cigTracker = (state.trackers || []).find((t) => t.id === 'trk-cig' || t.name.toLowerCase().includes('sigarett'));
    const cigToday = cigTracker ? getTrackerDayValue(cigTracker, todayStr) : 0;
    const cigTarget = cigTracker ? Number(cigTracker.dailyTarget || 5) : 5;
    const kpiSmoke = document.getElementById('kpi-smoke-today');
    if (kpiSmoke) {
      kpiSmoke.textContent = `${cigToday}/${cigTarget}`;
      kpiSmoke.style.color = cigToday <= cigTarget ? 'var(--ob-emerald)' : 'var(--ob-danger)';
    }

    // Update Quick Cigarette Strip on "Oggi" Screen + Anti-Smoke Tab Stepper
    let cigWeekTotal = 0;
    let totalAvoidedWeek = 0;
    const baseline = Number(extraState.smokingBaselinePerDay) || 15;
    const costUnit = Number(extraState.smokingCostPerUnit || cigTracker?.costPerUnit || 0.30);

    weekDates.forEach((d) => {
      const val = cigTracker ? getTrackerDayValue(cigTracker, d) : 0;
      cigWeekTotal += val;
      if (d <= todayStr) {
        totalAvoidedWeek += Math.max(0, baseline - val);
      }
    });

    const qsTodayVal = document.getElementById('qs-today-val');
    const qsTodayLim = document.getElementById('qs-today-limit');
    const qsWeekVal = document.getElementById('qs-week-val');
    const qsWeekSaved = document.getElementById('qs-week-saved');
    if (qsTodayVal) {
      qsTodayVal.textContent = String(cigToday);
      qsTodayVal.className = cigToday <= cigTarget ? 'text-gold' : 'text-danger';
    }
    if (qsTodayLim) qsTodayLim.textContent = String(cigTarget);
    if (qsWeekVal) qsWeekVal.textContent = String(cigWeekTotal);
    if (qsWeekSaved) qsWeekSaved.textContent = `€${(totalAvoidedWeek * costUnit).toFixed(2)}`;

    const smokeTabBigNum = document.getElementById('smoke-tab-big-num');
    if (smokeTabBigNum) {
      smokeTabBigNum.textContent = `${cigToday} `;
      const sp = document.createElement('span');
      sp.textContent = `/ ${cigTarget} sigarette`;
      smokeTabBigNum.appendChild(sp);
    }

    const focusMin = extraState.focusMinutesToday || 0;
    const kpiFocus = document.getElementById('kpi-focus-today');
    if (kpiFocus) kpiFocus.textContent = `${focusMin}m`;

    let spentToday = 0;
    (extraState.expenses || []).forEach((exp) => {
      if (exp.date === todayStr) spentToday += Number(exp.amount) || 0;
    });
    const dailyBudget = Number(extraState.dailyBudgetEuro) || 50;
    const netBudget = dailyBudget - spentToday;
    const kpiBudget = document.getElementById('kpi-budget-left');
    if (kpiBudget) {
      kpiBudget.textContent = `${netBudget >= 0 ? '€' : '-€'}${Math.abs(netBudget).toFixed(0)}`;
      kpiBudget.style.color = netBudget >= 0 ? 'var(--ob-emerald)' : 'var(--ob-danger)';
    }

    const smokeScore = cigToday <= cigTarget ? 25 : Math.max(5, 25 - (cigToday - cigTarget) * 5);
    const habitScore = habScheduled > 0 ? Math.min(25, Math.round((habDone / habScheduled) * 25)) : 20;
    const focusScore = Math.min(25, Math.round((focusMin / 90) * 25));
    const budgetScore = netBudget >= 0 ? 25 : 12;
    const totalScore = Math.min(100, Math.max(40, smokeScore + habitScore + focusScore + budgetScore));

    const scoreValEl = document.getElementById('exec-score-val');
    if (scoreValEl) scoreValEl.textContent = String(totalScore);
  }

  // Bind Direct Cigarette +/- Buttons on "Oggi" Screen & Anti-Smoke Tab
  document.getElementById('btn-qs-minus')?.addEventListener('click', () => {
    playUiTick(480);
    adjustTrackerCount('smoke', -1);
  });
  document.getElementById('btn-qs-plus')?.addEventListener('click', () => {
    playUiTick(780);
    adjustTrackerCount('smoke', 1);
  });
  document.getElementById('btn-smoke-tab-minus')?.addEventListener('click', () => {
    playUiTick(480);
    adjustTrackerCount('smoke', -1);
  });
  document.getElementById('btn-smoke-tab-plus')?.addEventListener('click', () => {
    playUiTick(780);
    adjustTrackerCount('smoke', 1);
  });

  // Bind Weekly Archive & Reset Buttons
  ['btn-archive-reset-week', 'btn-reset-matrix-week', 'btn-save-week-snapshot', 'btn-reset-trackers-week'].forEach((btnId) => {
    document.getElementById(btnId)?.addEventListener('click', () => {
      archiveAndResetCurrentWeek(false);
    });
  });

  document.getElementById('btn-clear-archive-reports')?.addEventListener('click', () => {
    if (!confirm('Vuoi davvero svuotare lo storico dei report archiviati? Questa azione azzera l\'archivio delle settimane passate.')) return;
    playUiTick(450);
    extraState.weeklyArchive52 = [];
    saveExtraState();
    renderAll(currentState);
    showActionToast('🗑️ Archivio delle settimane passate svuotato.');
  });

  document.querySelectorAll('[data-jump-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playUiTick(700);
      activateTab(btn.dataset.jumpTab);
      if (btn.dataset.jumpSeg) {
        activateSegment(btn.dataset.jumpTab, btn.dataset.jumpSeg);
      }
    });
  });

  // 1-Tap Quick Chips in Drawer
  document.querySelectorAll('[data-quick-action]').forEach((chip) => {
    chip.addEventListener('click', () => {
      playUiTick(720);
      const act = chip.dataset.quickAction;
      if (act === 'water') {
        const waterTrk = (currentState?.trackers || []).find((t) => t.id === 'trk-water' || t.name.toLowerCase().includes('idrataz') || t.name.toLowerCase().includes('acqu'));
        if (waterTrk) adjustTrackerCount(waterTrk.id, 1);
      } else if (act === 'smoke') {
        adjustTrackerCount('smoke', 1);
      } else if (act === 'smoke-minus') {
        adjustTrackerCount('smoke', -1);
      } else if (act === 'craving') {
        activateTab('trackers');
        activateSegment('trackers', 'trackers-smoke');
        document.getElementById('btn-start-craving')?.click();
      } else if (act === 'report') {
        activateTab('today');
        activateSegment('today', 'today-report');
      } else if (act === 'reset-week') {
        archiveAndResetCurrentWeek(false);
      }
    });
  });

  // ==========================================================================
  // 1. LIVE COUNTERS & ANTI-SMOKING
  // ==========================================================================
  function renderSmokingHeroAndTrackers(trackers) {
    const grid = document.getElementById('trackers-grid');
    if (!grid) return;
    grid.replaceChildren();

    const weekDates = getWeekDates();
    const todayStr = new Date().toISOString().split('T')[0];

    const cigTracker = (trackers || []).find((t) => t.id === 'trk-cig' || t.name.toLowerCase().includes('sigarett'));
    const smokeHero = document.getElementById('smoke-hero-card');
    if (cigTracker && smokeHero) {
      const baseline = Number(extraState.smokingBaselinePerDay) || 15;
      const costUnit = Number(extraState.smokingCostPerUnit || cigTracker.costPerUnit || 0.30);
      let totalAvoidedWeek = 0;
      weekDates.forEach((d) => {
        if (d <= todayStr) {
          const smoked = getTrackerDayValue(cigTracker, d);
          totalAvoidedWeek += Math.max(0, baseline - smoked);
        }
      });
      const savedEuros = (totalAvoidedWeek * costUnit).toFixed(2);
      document.getElementById('smoke-baseline-label').textContent = String(baseline);
      document.getElementById('smoke-saved-euros').textContent = `€${savedEuros}`;
      document.getElementById('smoke-avoided-count').textContent = String(totalAvoidedWeek);
      document.getElementById('smoke-cravings-won').textContent = String(extraState.cravingsWonCount || 0);

      const elapsedMs = Math.max(0, Date.now() - (extraState.lastCigaretteTimestamp || Date.now()));
      const elapsedH = Math.floor(elapsedMs / 3600000);
      const elapsedM = Math.floor((elapsedMs % 3600000) / 60000);
      document.getElementById('smoke-elapsed-timer').textContent = `${elapsedH}h ${String(elapsedM).padStart(2, '0')}m`;

      const milestoneEl = document.getElementById('smoke-health-milestone');
      if (milestoneEl) {
        if (elapsedH < 1) milestoneEl.textContent = '🫀 Tra 20 min frequenza cardiaca e pressione tornano normali';
        else if (elapsedH < 8) milestoneEl.textContent = '🫁 Ossigenazione del sangue in rapido aumento (+18%)';
        else if (elapsedH < 24) milestoneEl.textContent = '🩸 Monossido di carbonio dimezzato nel sangue';
        else milestoneEl.textContent = '🏆 Rigenerazione recettori nervosi e capacità polmonare attiva';
      }
    }

    (trackers || []).forEach((trk) => {
      const countToday = getTrackerDayValue(trk, todayStr);
      const target = Number(trk.dailyTarget) || 1;
      const isLimit = trk.mode === 'limit';
      const isOverLimit = isLimit && countToday > target;
      const pct = Math.min(100, Math.round((countToday / Math.max(1, target)) * 100));
      const isChartOpen = expandedChartIds.has(trk.id);

      const card = document.createElement('div');
      card.className = 'tracker-card';
      if (isOverLimit) card.dataset.status = 'warning';

      // Top Header
      const head = document.createElement('div');
      head.className = 'tracker-head';

      const titleWrap = document.createElement('div');
      titleWrap.className = 'tracker-title-wrap';

      const emojiSpan = document.createElement('span');
      emojiSpan.className = 'tracker-emoji';
      emojiSpan.textContent = trk.icon || '🔢';

      const textCol = document.createElement('div');
      const nameEl = document.createElement('h3');
      nameEl.className = 'tracker-name';
      nameEl.textContent = trk.name;

      const subEl = document.createElement('p');
      subEl.className = 'tracker-sub';
      subEl.textContent = isLimit
        ? `Max: ${target} ${trk.unit}/giorno`
        : `Target: ${target} ${trk.unit}/giorno`;

      textCol.appendChild(nameEl);
      textCol.appendChild(subEl);
      titleWrap.appendChild(emojiSpan);
      titleWrap.appendChild(textCol);

      const headBtns = document.createElement('div');
      headBtns.className = 'btn-row-wrap';

      const editTargetBtn = document.createElement('button');
      editTargetBtn.type = 'button';
      editTargetBtn.className = 'btn-ghost btn-xs';
      editTargetBtn.textContent = '✎';
      editTargetBtn.title = 'Personalizza contatore';
      editTargetBtn.addEventListener('click', () => {
        playUiTick(650);
        openEditTrackerModal(trk);
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-danger-ghost btn-xs';
      delBtn.textContent = '✕';
      delBtn.title = 'Elimina contatore';
      delBtn.addEventListener('click', () => {
        if (!confirm(`Sei sicuro di voler eliminare il contatore "${trk.name}"?`)) return;
        mutateState('DELETE_TRACKER', { id: trk.id });
        showActionToast(`🗑️ Contatore eliminato`);
      });

      headBtns.appendChild(editTargetBtn);
      headBtns.appendChild(delBtn);
      head.appendChild(titleWrap);
      head.appendChild(headBtns);

      // Big Number + Stepper Buttons (- / +)
      const mainDisplay = document.createElement('div');
      mainDisplay.className = 'tracker-main-display';

      const bigNum = document.createElement('div');
      bigNum.className = 'tracker-big-number';
      bigNum.style.cursor = 'pointer';
      bigNum.title = 'Tocca per impostare manualmente il numero di oggi';
      bigNum.addEventListener('click', () => {
        openEditTrackerDayModal(trk, todayStr, 'Oggi');
      });
      if (isOverLimit) bigNum.style.color = 'var(--ob-danger)';
      else if (!isLimit && countToday >= target) bigNum.style.color = 'var(--ob-emerald)';
      bigNum.textContent = `${countToday} `;
      const unitSpan = document.createElement('span');
      unitSpan.textContent = `/ ${target} ${trk.unit}`;
      bigNum.appendChild(unitSpan);

      const stepper = document.createElement('div');
      stepper.className = 'tracker-stepper';

      const minusBtn = document.createElement('button');
      minusBtn.type = 'button';
      minusBtn.className = 'step-btn';
      minusBtn.textContent = '−';
      minusBtn.addEventListener('click', () => {
        playUiTick(480);
        adjustTrackerCount(trk.id, -(trk.step || 1));
      });

      const plusBtn = document.createElement('button');
      plusBtn.type = 'button';
      plusBtn.className = 'step-btn step-btn-plus';
      plusBtn.textContent = '+';
      plusBtn.addEventListener('click', () => {
        playUiTick(780);
        adjustTrackerCount(trk.id, trk.step || 1);
      });

      stepper.appendChild(minusBtn);
      stepper.appendChild(plusBtn);
      mainDisplay.appendChild(bigNum);
      mainDisplay.appendChild(stepper);

      // Progress Bar
      const meter = document.createElement('div');
      meter.className = 'meter-track';
      const fill = document.createElement('span');
      fill.className = 'meter-fill';
      fill.style.setProperty('--progress-w', `${pct}%`);
      if (isOverLimit) fill.style.background = 'var(--ob-danger)';
      else if (!isLimit && countToday >= target) fill.style.background = 'var(--ob-emerald)';
      meter.appendChild(fill);

      // Collapsible 7-DAY HISTORICAL BAR CHART
      const weekChart = document.createElement('div');
      weekChart.className = 'tracker-week-chart';
      weekChart.hidden = !isChartOpen;

      const maxWeekVal = Math.max(target, ...weekDates.map((d) => getTrackerDayValue(trk, d)), 1);

      weekDates.forEach((dStr, idx) => {
        const val = getTrackerDayValue(trk, dStr);
        const barH = Math.min(100, Math.round((val / maxWeekVal) * 100));

        const col = document.createElement('button');
        col.type = 'button';
        col.className = 'trk-day-col';
        if (dStr === todayStr) col.dataset.today = 'true';

        const valSpan = document.createElement('span');
        valSpan.className = 'trk-day-val';
        valSpan.textContent = String(val);

        const barWrap = document.createElement('div');
        barWrap.className = 'trk-bar-wrap';
        const barFill = document.createElement('div');
        barFill.className = 'trk-bar-fill';
        barFill.style.height = `${barH}%`;
        if (isLimit && val > target) barFill.style.background = 'var(--ob-danger)';
        else if (!isLimit && val >= target) barFill.style.background = 'var(--ob-emerald)';
        barWrap.appendChild(barFill);

        const lblSpan = document.createElement('span');
        lblSpan.className = 'trk-day-lbl';
        lblSpan.textContent = DAY_SHORT_IT[idx];

        col.appendChild(valSpan);
        col.appendChild(barWrap);
        col.appendChild(lblSpan);

        col.addEventListener('click', () => {
          playUiTick(650);
          openEditTrackerDayModal(trk, dStr, DAY_LABELS_IT[idx]);
        });

        weekChart.appendChild(col);
      });

      // Footer with Toggle 7-Day Chart Button & Reset Today
      const footer = document.createElement('div');
      footer.className = 'tracker-footer';

      const toggleChartBtn = document.createElement('button');
      toggleChartBtn.type = 'button';
      toggleChartBtn.className = 'btn-ghost btn-xs';
      toggleChartBtn.textContent = isChartOpen ? '▲ Nascondi 7 giorni' : '📊 Storico 7 giorni';
      toggleChartBtn.addEventListener('click', () => {
        if (expandedChartIds.has(trk.id)) expandedChartIds.delete(trk.id);
        else expandedChartIds.add(trk.id);
        renderSmokingHeroAndTrackers(currentState.trackers);
      });

      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'btn-ghost btn-xs';
      resetBtn.textContent = 'Azzera oggi (0)';
      resetBtn.addEventListener('click', () => {
        extraState.trackerHistoryOverrides = extraState.trackerHistoryOverrides || {};
        extraState.trackerHistoryOverrides[trk.id] = extraState.trackerHistoryOverrides[trk.id] || {};
        extraState.trackerHistoryOverrides[trk.id][todayStr] = 0;
        if (trk.history) trk.history[todayStr] = 0;
        saveExtraState();
        renderAll(currentState);
        mutateState('RESET_TRACKER_TODAY', { id: trk.id });
        showActionToast(`${trk.name} azzerato a 0 per oggi`);
      });

      footer.appendChild(toggleChartBtn);
      footer.appendChild(resetBtn);

      card.appendChild(head);
      card.appendChild(mainDisplay);
      card.appendChild(meter);
      card.appendChild(weekChart);
      card.appendChild(footer);
      grid.appendChild(card);
    });
  }

  const editTrackerDayDialog = document.getElementById('edit-tracker-day-dialog');
  function openEditTrackerDayModal(trk, dateStr, dayLabel) {
    if (!editTrackerDayDialog) return;
    document.getElementById('edit-trk-id').value = trk.id;
    document.getElementById('edit-trk-date').value = dateStr;
    document.getElementById('edit-trk-day-eyebrow').textContent = `${trk.icon || ''} ${trk.name.toUpperCase()} — ${dayLabel.toUpperCase()}`;
    document.getElementById('edit-trk-day-title').textContent = `Valore per ${dayLabel}`;
    document.getElementById('edit-trk-val').value = String(getTrackerDayValue(trk, dateStr));
    document.getElementById('edit-trk-target').value = String(trk.dailyTarget || 5);
    editTrackerDayDialog.showModal();
  }

  const editTrackerDayForm = document.getElementById('edit-tracker-day-form');
  if (editTrackerDayForm) {
    editTrackerDayForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-trk-id').value;
      const dateStr = document.getElementById('edit-trk-date').value;
      const newVal = Math.max(0, Number(document.getElementById('edit-trk-val').value) || 0);
      const newTarget = Math.max(1, Number(document.getElementById('edit-trk-target').value) || 1);

      extraState.trackerHistoryOverrides = extraState.trackerHistoryOverrides || {};
      extraState.trackerHistoryOverrides[id] = extraState.trackerHistoryOverrides[id] || {};
      extraState.trackerHistoryOverrides[id][dateStr] = newVal;
      saveExtraState();

      const trk = (currentState?.trackers || []).find((t) => t.id === id);
      if (trk) {
        trk.history = trk.history || {};
        trk.history[dateStr] = newVal;
        trk.dailyTarget = newTarget;
      }

      mutateState('UPDATE_TRACKER_TARGET', { id, dailyTarget: newTarget });
      editTrackerDayDialog.close();
      renderAll(currentState);
      showActionToast('✓ Contatore aggiornato!');
    });
  }

  const smokeSettingsDialog = document.getElementById('smoke-settings-dialog');
  const btnOpenSmokeSettings = document.getElementById('btn-open-smoke-settings');
  if (btnOpenSmokeSettings && smokeSettingsDialog) {
    btnOpenSmokeSettings.addEventListener('click', () => {
      const cigTrk = (currentState?.trackers || []).find((t) => t.id === 'trk-cig' || t.name.toLowerCase().includes('sigarett'));
      document.getElementById('smoke-cfg-baseline').value = String(extraState.smokingBaselinePerDay || 15);
      document.getElementById('smoke-cfg-limit').value = String(cigTrk?.dailyTarget ?? 5);
      document.getElementById('smoke-cfg-cost').value = String(extraState.smokingCostPerUnit || cigTrk?.costPerUnit || 0.30);
      smokeSettingsDialog.showModal();
    });
  }

  const smokeSettingsForm = document.getElementById('smoke-settings-form');
  if (smokeSettingsForm) {
    smokeSettingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const baseline = Math.max(1, Number(document.getElementById('smoke-cfg-baseline').value) || 15);
      const limit = Math.max(0, Number(document.getElementById('smoke-cfg-limit').value) || 5);
      const cost = Math.max(0.05, Number(document.getElementById('smoke-cfg-cost').value) || 0.30);

      extraState.smokingBaselinePerDay = baseline;
      extraState.smokingCostPerUnit = cost;
      saveExtraState();

      const cigTrk = (currentState?.trackers || []).find((t) => t.id === 'trk-cig' || t.name.toLowerCase().includes('sigarett'));
      if (cigTrk) {
        cigTrk.dailyTarget = limit;
        cigTrk.costPerUnit = cost;
        mutateState('UPDATE_TRACKER_TARGET', { id: cigTrk.id, dailyTarget: limit });
      }
      smokeSettingsDialog.close();
      renderAll(currentState);
      showActionToast('🚭 Parametri salvati!');
    });
  }

  // Craving 3-Minute Shield Button
  const btnStartCraving = document.getElementById('btn-start-craving');
  const btnCancelCraving = document.getElementById('btn-cancel-craving');
  const cravingBox = document.getElementById('craving-active-box');
  const cravingCountdownEl = document.getElementById('craving-countdown');
  const cravingBreathPhaseEl = document.getElementById('craving-breath-phase');

  if (btnStartCraving) {
    btnStartCraving.addEventListener('click', () => {
      if (cravingTimer) clearInterval(cravingTimer);
      cravingSecLeft = 180;
      cravingBox.hidden = false;
      btnStartCraving.hidden = true;
      playUiTick(820);
      showActionToast('🛡️ Scudo 3 Minuti avviato!');

      cravingTimer = setInterval(() => {
        cravingSecLeft--;
        const mm = String(Math.floor(cravingSecLeft / 60)).padStart(2, '0');
        const ss = String(cravingSecLeft % 60).padStart(2, '0');
        cravingCountdownEl.textContent = `${mm}:${ss}`;

        const cycleSec = (180 - cravingSecLeft) % 19;
        if (cravingBreathPhaseEl) {
          if (cycleSec < 4) cravingBreathPhaseEl.textContent = '🌬️ Inspira dal naso (4s)';
          else if (cycleSec < 11) cravingBreathPhaseEl.textContent = '⏸ Trattieni il respiro (7s)';
          else cravingBreathPhaseEl.textContent = '😮‍💨 Espira lentamente (8s)';
        }

        if (cravingSecLeft <= 0) {
          clearInterval(cravingTimer);
          cravingBox.hidden = true;
          btnStartCraving.hidden = false;
          extraState.cravingsWonCount = (extraState.cravingsWonCount || 0) + 1;
          saveExtraState();
          renderAll(currentState);
          playAlarmChime('pulse');
          showActionToast('🎉 Voglia superata! +1 Vittoria.');
        }
      }, 1000);
    });
  }

  if (btnCancelCraving) {
    btnCancelCraving.addEventListener('click', () => {
      if (cravingTimer) clearInterval(cravingTimer);
      cravingBox.hidden = true;
      btnStartCraving.hidden = false;
      extraState.cravingsWonCount = (extraState.cravingsWonCount || 0) + 1;
      saveExtraState();
      renderAll(currentState);
      playUiTick(880);
      showActionToast('💪 Voglia superata!');
    });
  }

  // ==========================================================================
  // 2. GYM WORKOUT LOGGER, SPLIT PRESETS & REST TIMER
  // ==========================================================================
  function startGymRestTimer(seconds) {
    if (gymRestTimer) clearInterval(gymRestTimer);
    gymRestSecLeft = seconds;
    gymRestRunning = true;
    const disp = document.getElementById('gym-rest-display');
    const stat = document.getElementById('gym-rest-status');
    stat.textContent = 'Recupero in corso...';

    const updateRestUI = () => {
      const mm = String(Math.floor(gymRestSecLeft / 60)).padStart(2, '0');
      const ss = String(gymRestSecLeft % 60).padStart(2, '0');
      disp.textContent = `${mm}:${ss}`;
    };
    updateRestUI();

    gymRestTimer = setInterval(() => {
      gymRestSecLeft--;
      updateRestUI();
      if (gymRestSecLeft <= 0) {
        clearInterval(gymRestTimer);
        gymRestRunning = false;
        stat.textContent = '🔥 Fine recupero! Vai!';
        playAlarmChime('pulse');
        showActionToast('⏱ Recupero terminato! Prossima serie!');
      }
    }, 1000);
  }

  document.querySelectorAll('[data-rest-sec]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playUiTick(700);
      startGymRestTimer(Number(btn.dataset.restSec));
    });
  });

  document.getElementById('btn-plus-rest')?.addEventListener('click', () => {
    playUiTick(680);
    startGymRestTimer((gymRestRunning ? gymRestSecLeft : 60) + 15);
  });

  document.getElementById('btn-stop-rest')?.addEventListener('click', () => {
    if (gymRestTimer) clearInterval(gymRestTimer);
    gymRestRunning = false;
    document.getElementById('gym-rest-display').textContent = '01:30';
    document.getElementById('gym-rest-status').textContent = 'Pronto';
  });

  document.querySelectorAll('[data-gym-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.gymPreset;
      if (key === 'fighter_boxing') {
        playUiTick(800);
        extraState.weeklyGymProgram = {
          splitName: '🥊 FIGHTER BOXING & STRENGTH (7 Giorni)',
          schedule: FIGHTER_BOXING_ROUTINE
        };
        extraState.gymExercises = JSON.parse(JSON.stringify(GYM_PRESETS.fighter_boxing));
        saveExtraState();
        syncWeeklyGymProgram();
        renderGymModule();
        activateSegment('gym', 'gym-active');
        showActionToast('🥊 Scheda Fighter Boxing Attivata!');
        return;
      }
      const preset = GYM_PRESETS[key];
      if (preset) {
        playUiTick(750);
        extraState.gymExercises = JSON.parse(JSON.stringify(preset));
        saveExtraState();
        renderGymModule();
        activateSegment('gym', 'gym-active');
        showActionToast('🏋️‍♂️ Scheda caricata!');
      }
    });
  });

  document.getElementById('btn-reset-gym-checks')?.addEventListener('click', () => {
    (extraState.gymExercises || []).forEach((ex) => {
      (ex.sets || []).forEach((s) => { s.done = false; });
    });
    saveExtraState();
    renderGymModule();
    showActionToast('Spunte serie azzerate');
  });

  function recordExerciseSetLog(exName, kg, reps, setNum = 1) {
    if (!exName || kg <= 0) return;
    extraState.exerciseHistory = extraState.exerciseHistory || {};
    extraState.exerciseHistory[exName] = extraState.exerciseHistory[exName] || [];

    const today = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
    extraState.exerciseHistory[exName].unshift({
      date: today,
      kg,
      reps,
      setNum
    });
    if (extraState.exerciseHistory[exName].length > 20) {
      extraState.exerciseHistory[exName].pop();
    }

    extraState.exercisePRs = extraState.exercisePRs || {};
    const curPr = extraState.exercisePRs[exName];
    const isNewPr = !curPr || kg > curPr.kg || (kg === curPr.kg && reps > curPr.reps);

    if (isNewPr) {
      extraState.exercisePRs[exName] = { kg, reps, date: today };
      playAlarmChime('pulse');
      showActionToast(`🔥 RECORD PERSONALE! ${exName}: ${kg} kg × ${reps} reps!`);
    }
  }

  const editGymSetDialog = document.getElementById('edit-gym-set-dialog');
  function openEditGymSetModal(ex, setIdx) {
    if (!editGymSetDialog) return;
    const targetSet = ex.sets[setIdx];
    if (!targetSet) return;
    document.getElementById('edit-gym-ex-id').value = ex.id;
    document.getElementById('edit-gym-set-idx').value = String(setIdx);
    document.getElementById('edit-gym-set-eyebrow').textContent = `${ex.name.toUpperCase()} — SERIE #${setIdx + 1}`;
    document.getElementById('edit-gym-kg').value = String(targetSet.kg);
    document.getElementById('edit-gym-reps').value = String(targetSet.reps);

    const prBadge = document.getElementById('edit-set-current-pr-badge');
    const pr = (extraState.exercisePRs && extraState.exercisePRs[ex.name]) || null;
    if (prBadge) {
      prBadge.textContent = pr ? `Record Attuale: ${pr.kg} kg × ${pr.reps} reps` : 'Nessun record precedente';
    }

    const histContainer = document.getElementById('past-history-mini-list');
    if (histContainer) {
      histContainer.replaceChildren();
      const exHistory = (extraState.exerciseHistory && extraState.exerciseHistory[ex.name]) || [];
      if (exHistory.length === 0) {
        const p = document.createElement('p');
        p.className = 'text-muted text-xs';
        p.textContent = 'Nessun carico registrato in precedenza.';
        histContainer.appendChild(p);
      } else {
        exHistory.slice(0, 5).forEach((h) => {
          const row = document.createElement('div');
          row.className = 'past-log-row';
          row.innerHTML = `<span class="date">${h.date} (S${h.setNum || 1})</span><strong>${h.kg} kg × ${h.reps} reps</strong>`;
          histContainer.appendChild(row);
        });
      }
    }

    editGymSetDialog.showModal();
  }

  // Edit Set Form submit
  document.getElementById('edit-gym-set-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const exId = document.getElementById('edit-gym-ex-id').value;
    const setIdx = Number(document.getElementById('edit-gym-set-idx').value);
    const kg = Number(document.getElementById('edit-gym-kg').value) || 0;
    const reps = Math.max(1, Number(document.getElementById('edit-gym-reps').value) || 1);

    const ex = (extraState.gymExercises || []).find((x) => x.id === exId);
    if (ex && ex.sets[setIdx]) {
      ex.sets[setIdx].kg = kg;
      ex.sets[setIdx].reps = reps;
      if (kg > 0) {
        recordExerciseSetLog(ex.name, kg, reps, setIdx + 1);
      }
      saveExtraState();
      renderGymModule();
      showActionToast(`S${setIdx + 1}: ${kg}kg × ${reps}`);
    }
    editGymSetDialog.close();
  });

  // Modal Stepper Chips (-2.5, +2.5, +5, +10 kg / -1, +1 reps)
  document.querySelectorAll('[data-step-kg]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playUiTick(650);
      const input = document.getElementById('edit-gym-kg');
      if (input) {
        const cur = Number(input.value) || 0;
        const delta = Number(btn.dataset.stepKg) || 0;
        input.value = String(Math.max(0, cur + delta));
      }
    });
  });

  document.querySelectorAll('[data-step-reps]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playUiTick(650);
      const input = document.getElementById('edit-gym-reps');
      if (input) {
        const cur = Number(input.value) || 0;
        const delta = Number(btn.dataset.stepReps) || 0;
        input.value = String(Math.max(1, cur + delta));
      }
    });
  });

  document.getElementById('btn-delete-gym-set')?.addEventListener('click', () => {
    const exId = document.getElementById('edit-gym-ex-id').value;
    const setIdx = Number(document.getElementById('edit-gym-set-idx').value);
    const ex = (extraState.gymExercises || []).find((x) => x.id === exId);
    if (ex && ex.sets.length > 1) {
      ex.sets.splice(setIdx, 1);
      saveExtraState();
      renderGymModule();
    }
    editGymSetDialog.close();
  });

  // ==========================================================================
  // COMPREHENSIVE EDITING & CUSTOMIZATION MODALS (PERSISTENT & MULTI-USER)
  // ==========================================================================

  // 1. Edit Habit Modal
  function openEditHabitModal(habit) {
    if (!habit) return;
    const dialog = document.getElementById('edit-habit-dialog');
    if (!dialog) return;
    document.getElementById('edit-habit-id').value = habit.id;
    document.getElementById('edit-habit-name').value = habit.name || '';
    document.getElementById('edit-habit-category').value = habit.category || 'Personale';

    const sched = Array.isArray(habit.schedule) ? habit.schedule : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    document.querySelectorAll('#edit-habit-days-group input[type="checkbox"]').forEach((cb) => {
      cb.checked = sched.includes(cb.value);
    });

    const delBtn = document.getElementById('btn-delete-habit-confirm');
    if (delBtn) {
      delBtn.onclick = () => {
        if (!confirm(`Sei sicuro di voler eliminare l'abitudine "${habit.name}"?`)) return;
        mutateState('DELETE_HABIT', { id: habit.id });
        dialog.close();
        showActionToast(`🗑️ Abitudine eliminata`);
      };
    }

    dialog.showModal();
  }

  document.getElementById('edit-habit-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const habitId = document.getElementById('edit-habit-id').value;
    const name = document.getElementById('edit-habit-name').value.trim();
    const category = document.getElementById('edit-habit-category').value;
    const schedule = [];
    document.querySelectorAll('#edit-habit-days-group input[type="checkbox"]:checked').forEach((cb) => {
      schedule.push(cb.value);
    });

    mutateState('EDIT_HABIT', {
      id: habitId,
      name,
      category,
      schedule: schedule.length ? schedule : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    });
    document.getElementById('edit-habit-dialog')?.close();
    showActionToast(`🔥 Abitudine "${name}" aggiornata!`);
  });

  // 2. Edit Tracker Definition Modal
  function openEditTrackerModal(trk) {
    if (!trk) return;
    const dialog = document.getElementById('edit-tracker-dialog');
    if (!dialog) return;
    document.getElementById('edit-trk-id').value = trk.id;
    document.getElementById('edit-trk-name').value = trk.name || '';
    document.getElementById('edit-trk-icon').value = trk.icon || '🔢';
    document.getElementById('edit-trk-unit').value = trk.unit || 'unità';
    document.getElementById('edit-trk-target').value = trk.dailyTarget || 1;
    document.getElementById('edit-trk-mode').value = trk.mode || 'limit';
    document.getElementById('edit-trk-cost').value = trk.costPerUnit || 0;

    const delBtn = document.getElementById('btn-delete-tracker-confirm');
    if (delBtn) {
      delBtn.onclick = () => {
        if (!confirm(`Sei sicuro di voler eliminare il contatore "${trk.name}"?`)) return;
        mutateState('DELETE_TRACKER', { id: trk.id });
        dialog.close();
        showActionToast(`🗑️ Contatore eliminato`);
      };
    }

    dialog.showModal();
  }

  document.getElementById('edit-tracker-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-trk-id').value;
    const name = document.getElementById('edit-trk-name').value.trim();
    const icon = document.getElementById('edit-trk-icon').value.trim() || '🔢';
    const unit = document.getElementById('edit-trk-unit').value.trim() || 'unità';
    const dailyTarget = Number(document.getElementById('edit-trk-target').value) || 1;
    const mode = document.getElementById('edit-trk-mode').value;
    const costPerUnit = Number(document.getElementById('edit-trk-cost').value) || 0;

    mutateState('EDIT_TRACKER', {
      id,
      name,
      icon,
      unit,
      dailyTarget,
      mode,
      costPerUnit
    });
    document.getElementById('edit-tracker-dialog')?.close();
    showActionToast(`🔢 Contatore "${name}" aggiornato!`);
  });

  // 3. Edit Routine Exercise Modal
  function openEditRoutineExModal(dayRoutine, ex, exIdx) {
    const dialog = document.getElementById('gym-edit-routine-ex-dialog');
    if (!dialog) return;
    document.getElementById('gym-edit-routine-day-idx').value = String(selectedGymDayIdx);
    document.getElementById('gym-edit-routine-ex-idx').value = String(exIdx);
    document.getElementById('edit-routine-ex-name').value = ex.name || '';
    document.getElementById('edit-routine-ex-sets').value = ex.sets || 3;
    document.getElementById('edit-routine-ex-reps').value = ex.reps || 10;
    document.getElementById('edit-routine-ex-kg').value = ex.kg || 0;

    const delBtn = document.getElementById('btn-delete-routine-ex-confirm');
    if (delBtn) {
      delBtn.onclick = () => {
        if (!confirm(`Rimuovere "${ex.name}" da questo giorno?`)) return;
        dayRoutine.exercises.splice(exIdx, 1);
        saveExtraState();
        syncWeeklyGymProgram();
        renderWeeklyGymProgram();
        dialog.close();
        showActionToast(`🗑️ Esercizio rimosso dal programma`);
      };
    }

    dialog.showModal();
  }

  document.getElementById('gym-edit-routine-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const dayIdx = Number(document.getElementById('gym-edit-routine-day-idx').value) || 0;
    const exIdx = Number(document.getElementById('gym-edit-routine-ex-idx').value) || 0;
    const name = document.getElementById('edit-routine-ex-name').value.trim();
    const sets = Number(document.getElementById('edit-routine-ex-sets').value) || 3;
    const reps = Number(document.getElementById('edit-routine-ex-reps').value) || 10;
    const kg = Number(document.getElementById('edit-routine-ex-kg').value) || 0;

    if (extraState.weeklyGymProgram && extraState.weeklyGymProgram.schedule[dayIdx]) {
      const routine = extraState.weeklyGymProgram.schedule[dayIdx];
      if (routine.exercises && routine.exercises[exIdx]) {
        routine.exercises[exIdx] = { name, sets, reps, kg };
        saveExtraState();
        syncWeeklyGymProgram();
        renderWeeklyGymProgram();
      }
    }
    document.getElementById('gym-edit-routine-ex-dialog')?.close();
    showActionToast(`🥊 Esercizio aggiornato nel programma!`);
  });

  // 4. Edit Routine Day Details Modal
  function openEditRoutineDayModal() {
    const dialog = document.getElementById('gym-edit-day-dialog');
    if (!dialog || !extraState.weeklyGymProgram) return;
    const dayRoutine = extraState.weeklyGymProgram.schedule[selectedGymDayIdx] || { day: 'Giorno', focus: '' };
    document.getElementById('gym-edit-day-idx').value = String(selectedGymDayIdx);
    document.getElementById('edit-gym-day-label').value = dayRoutine.day || '';
    document.getElementById('edit-gym-day-focus').value = dayRoutine.focus || '';
    dialog.showModal();
  }

  document.getElementById('btn-edit-day-focus')?.addEventListener('click', () => {
    playUiTick(650);
    openEditRoutineDayModal();
  });

  document.getElementById('gym-edit-day-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const dayIdx = Number(document.getElementById('gym-edit-day-idx').value) || 0;
    const dayLabel = document.getElementById('edit-gym-day-label').value.trim();
    const dayFocus = document.getElementById('edit-gym-day-focus').value.trim();

    if (extraState.weeklyGymProgram && extraState.weeklyGymProgram.schedule[dayIdx]) {
      extraState.weeklyGymProgram.schedule[dayIdx].day = dayLabel;
      extraState.weeklyGymProgram.schedule[dayIdx].focus = dayFocus;
      saveExtraState();
      syncWeeklyGymProgram();
      renderWeeklyGymProgram();
    }
    document.getElementById('gym-edit-day-dialog')?.close();
    showActionToast(`📋 Dettagli giorno aggiornati!`);
  });

  // 5. Add Exercise directly to Today's Workout
  document.getElementById('btn-add-exercise-to-today')?.addEventListener('click', () => {
    playUiTick(650);
    document.getElementById('gym-add-today-ex-dialog')?.showModal();
  });

  document.getElementById('gym-add-today-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('today-ex-name').value.trim();
    const setsCount = Number(document.getElementById('today-ex-sets').value) || 3;
    const reps = Number(document.getElementById('today-ex-reps').value) || 10;
    const kg = Number(document.getElementById('today-ex-kg').value) || 0;

    const sets = [];
    for (let i = 0; i < setsCount; i++) {
      sets.push({ kg, reps, done: false });
    }

    extraState.gymExercises = extraState.gymExercises || [];
    extraState.gymExercises.push({
      id: `ex-today-${Date.now()}`,
      name,
      sets
    });

    saveExtraState();
    renderGymModule();
    document.getElementById('gym-add-today-ex-dialog')?.close();
    document.getElementById('today-ex-name').value = '';
    showActionToast(`🥊 "${name}" aggiunto all'allenamento di oggi!`);
  });

  // 6. Edit Alarm Modal
  function openEditAlarmModal(alarm) {
    if (!alarm) return;
    const dialog = document.getElementById('edit-alarm-dialog');
    if (!dialog) return;
    document.getElementById('edit-alarm-id').value = alarm.id;
    document.getElementById('edit-alarm-time').value = alarm.time || '07:00';
    document.getElementById('edit-alarm-label').value = alarm.label || '';
    document.getElementById('edit-alarm-sound').value = alarm.sound || 'cascade';

    const rep = Array.isArray(alarm.repeat) ? alarm.repeat : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    document.querySelectorAll('#edit-alarm-days-group input[type="checkbox"]').forEach((cb) => {
      cb.checked = rep.includes(cb.value);
    });

    const delBtn = document.getElementById('btn-delete-alarm-confirm');
    if (delBtn) {
      delBtn.onclick = () => {
        if (!confirm(`Eliminare la sveglia "${alarm.label}" delle ${alarm.time}?`)) return;
        mutateState('DELETE_ALARM', { id: alarm.id });
        dialog.close();
        showActionToast(`🗑️ Sveglia eliminata`);
      };
    }

    dialog.showModal();
  }

  document.getElementById('edit-alarm-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-alarm-id').value;
    const time = document.getElementById('edit-alarm-time').value;
    const label = document.getElementById('edit-alarm-label').value.trim();
    const sound = document.getElementById('edit-alarm-sound').value;
    const repeat = [];
    document.querySelectorAll('#edit-alarm-days-group input[type="checkbox"]:checked').forEach((cb) => {
      repeat.push(cb.value);
    });

    mutateState('EDIT_ALARM', {
      id,
      time,
      label,
      sound,
      repeat: repeat.length ? repeat : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    });
    document.getElementById('edit-alarm-dialog')?.close();
    showActionToast(`⏰ Sveglia "${label}" aggiornata!`);
  });

  // 7. Custom Focus Duration & Reset
  document.getElementById('btn-set-custom-focus')?.addEventListener('click', () => {
    playUiTick(680);
    const mins = Math.max(1, Math.min(240, Number(document.getElementById('custom-focus-minutes')?.value) || 30));
    if (focusTimer) clearInterval(focusTimer);
    focusRunning = false;
    focusSecLeft = mins * 60;
    const btn = document.getElementById('btn-toggle-focus');
    if (btn) btn.textContent = '▶ Avvia Focus';
    updateFocusClockUI();
    showActionToast(`⏱️ Timer impostato su ${mins} minuti!`);
  });

  document.getElementById('btn-reset-focus-today')?.addEventListener('click', () => {
    if (!confirm('Vuoi azzerare i minuti di focus accumulati oggi?')) return;
    playUiTick(500);
    extraState.focusMinutesToday = 0;
    saveExtraState();
    updateFocusClockUI();
    renderHeaderAndKpis(currentState);
    showActionToast('🔄 Minuti focus di oggi azzerati a 0');
  });

  function renderFighterPrsTable() {
    const container = document.getElementById('gym-prs-table-container');
    if (!container) return;
    container.replaceChildren();

    const prs = extraState.exercisePRs || {};
    const exercises = [
      'Panca Piana Bilanciere',
      'Squat con Bilanciere',
      'Stacco da Terra Convenzionale',
      'Military Press con Bilanciere/Manubri',
      'Rematore con Bilanciere',
      'Stacco Rumeno con Bilanciere (RDL)',
      'Panca Inclinata con Manubri',
      'Trazioni alla Sbarra',
      'Russian Twist con Peso',
      'Woodchopper al Cavo/Manubrio'
    ];

    const table = document.createElement('div');
    table.className = 'fighter-pr-table';

    const header = document.createElement('div');
    header.className = 'pr-table-header';
    header.innerHTML = `
      <span class="col-name">Esercizio</span>
      <span class="col-pr">Record (PR)</span>
      <span class="col-target">Obiettivo Settimana (+2.5kg)</span>
      <span class="col-action">Azione Rapida</span>
    `;
    table.appendChild(header);

    exercises.forEach((name) => {
      const pr = prs[name] || { kg: 0, reps: 0, date: '—' };
      const nextKg = (pr.kg || 0) + (pr.kg > 0 ? 2.5 : 5);
      const row = document.createElement('div');
      row.className = 'pr-table-row';

      const colName = document.createElement('div');
      colName.className = 'col-name';
      colName.innerHTML = `<strong>${name}</strong><small class="text-muted">Aggiornato: ${pr.date || 'Recente'}</small>`;

      const colPr = document.createElement('div');
      colPr.className = 'col-pr';
      colPr.innerHTML = `<span class="pr-badge-gold">${pr.kg} kg × ${pr.reps} reps</span>`;

      const colTarget = document.createElement('div');
      colTarget.className = 'col-target';
      colTarget.innerHTML = `<span class="target-val-chip">+2.5kg → <strong>${nextKg} kg</strong></span>`;

      const colAction = document.createElement('div');
      colAction.className = 'col-action';
      const bumpBtn = document.createElement('button');
      bumpBtn.type = 'button';
      bumpBtn.className = 'btn-secondary btn-xs';
      bumpBtn.textContent = '＋2.5kg';
      bumpBtn.title = `Applica +2.5 kg a ${name} nella scheda di oggi`;
      bumpBtn.addEventListener('click', () => {
        playUiTick(750);
        let found = false;
        (extraState.gymExercises || []).forEach((ex) => {
          if (ex.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(ex.name.toLowerCase())) {
            ex.sets.forEach((s) => { s.kg = (Number(s.kg) || 0) + 2.5; });
            found = true;
          }
        });
        if (found) {
          saveExtraState();
          renderGymModule();
          showActionToast(`🎯 ${name}: +2.5 kg applicato oggi!`);
        } else {
          showActionToast(`Carica prima la sessione con «${name}»!`);
        }
      });
      colAction.appendChild(bumpBtn);

      row.appendChild(colName);
      row.appendChild(colPr);
      row.appendChild(colTarget);
      row.appendChild(colAction);
      table.appendChild(row);
    });

    container.appendChild(table);
  }

  function ensureTodayGymExercises(forceReload = false) {
    const now = new Date();
    const todayStr = getLocalDateStr(now);
    const todayIdx = (now.getDay() + 6) % 7;

    if (!extraState.weeklyGymProgram || !Array.isArray(extraState.weeklyGymProgram.schedule)) {
      return;
    }

    extraState.dailyGymSessions = extraState.dailyGymSessions || {};

    if (!forceReload && extraState.gymActiveDate === todayStr && Array.isArray(extraState.gymExercises) && extraState.gymExercises.length > 0) {
      return;
    }

    if (!forceReload && extraState.dailyGymSessions[todayStr] && Array.isArray(extraState.dailyGymSessions[todayStr].exercises)) {
      extraState.gymExercises = extraState.dailyGymSessions[todayStr].exercises;
      extraState.gymActiveDate = todayStr;
      extraState.activeGymDayIdx = extraState.dailyGymSessions[todayStr].dayIdx ?? todayIdx;
      return;
    }

    const scheduledDay = extraState.weeklyGymProgram.schedule[todayIdx] || extraState.weeklyGymProgram.schedule[0];
    if (scheduledDay && Array.isArray(scheduledDay.exercises)) {
      extraState.gymExercises = scheduledDay.exercises.map((ex, idx) => ({
        id: `ex-today-${todayStr}-${idx}`,
        name: ex.name,
        sets: Array.isArray(ex.sets)
          ? ex.sets.map((s) => ({ kg: s.kg || 0, reps: s.reps || 10, done: false }))
          : Array.from({ length: ex.sets || 3 }, () => ({
              kg: ex.kg || 20,
              reps: ex.reps || 10,
              done: false
            }))
      }));
    } else {
      extraState.gymExercises = [];
    }

    extraState.gymActiveDate = todayStr;
    extraState.activeGymDayIdx = todayIdx;
    extraState.dailyGymSessions[todayStr] = {
      date: todayStr,
      dayIdx: todayIdx,
      dayName: scheduledDay?.day || DAY_LABELS_IT[todayIdx],
      focus: scheduledDay?.focus || 'Allenamento Odierno',
      exercises: extraState.gymExercises
    };
    saveExtraState();
    syncWeeklyGymProgram();
  }

  function renderGymModule() {
    ensureTodayGymExercises();
    const exList = document.getElementById('gym-exercises-list');
    const histList = document.getElementById('gym-history-list');
    if (!exList || !histList) return;

    exList.replaceChildren();
    histList.replaceChildren();

    // Wire Warmup Strip Controls
    const btnToggleWarmup = document.getElementById('btn-toggle-warmup');
    const warmupStrip = document.getElementById('gym-warmup-strip');
    if (btnToggleWarmup && warmupStrip) {
      btnToggleWarmup.onclick = () => {
        warmupStrip.hidden = !warmupStrip.hidden;
        btnToggleWarmup.textContent = warmupStrip.hidden ? '▼ Mostra Riscaldamento (10 min)' : '▲ Nascondi Riscaldamento';
      };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    extraState.warmupChecks = extraState.warmupChecks || {};
    extraState.warmupChecks[todayStr] = extraState.warmupChecks[todayStr] || {};
    document.querySelectorAll('#gym-warmup-strip input[type="checkbox"]').forEach((cb) => {
      const id = cb.id;
      cb.checked = Boolean(extraState.warmupChecks[todayStr][id]);
      cb.onchange = () => {
        playUiTick(cb.checked ? 800 : 500);
        extraState.warmupChecks[todayStr][id] = cb.checked;
        saveExtraState();
        const allDone = ['w-corda', 'w-squat', 'w-pushup', 'w-spalle', 'w-hip', 'w-plank'].every(k => extraState.warmupChecks[todayStr][k]);
        if (allDone) {
          playAlarmChime('cascade');
          showActionToast('🥊 Riscaldamento completato! Sei pronto al combattimento!');
        }
      };
    });

    let totalVolume = 0;
    let totalDoneSets = 0;

    (extraState.gymExercises || []).forEach((ex) => {
      const card = document.createElement('div');
      card.className = 'exercise-card';

      const pr = (extraState.exercisePRs && extraState.exercisePRs[ex.name]) || null;

      const head = document.createElement('div');
      head.className = 'exercise-head';

      const titleWrap = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = `🥊 ${ex.name}`;
      const subMeta = document.createElement('p');
      subMeta.className = 'habit-meta-sub';
      subMeta.textContent = pr
        ? `🏆 Record: ${pr.kg}kg × ${pr.reps} · Target: +2.5kg (${pr.kg + 2.5}kg)`
        : `Target: +2.5kg o +1 rep a settimana`;
      titleWrap.appendChild(title);
      titleWrap.appendChild(subMeta);

      const rightBtns = document.createElement('div');
      rightBtns.style.display = 'flex';
      rightBtns.style.gap = '6px';
      rightBtns.style.alignItems = 'center';

      // Quick 1-tap progression buttons (+2.5 kg, +1 rep)
      const plusKgBtn = document.createElement('button');
      plusKgBtn.type = 'button';
      plusKgBtn.className = 'chip-stepper-btn highlight-gold';
      plusKgBtn.textContent = '+2.5kg';
      plusKgBtn.title = 'Aumenta tutti i set di 2.5 kg';
      plusKgBtn.addEventListener('click', () => {
        playUiTick(720);
        ex.sets.forEach((s) => { s.kg = (Number(s.kg) || 0) + 2.5; });
        saveExtraState();
        renderGymModule();
        showActionToast(`📈 ${ex.name}: +2.5 kg applicato a tutte le serie!`);
      });

      const plusRepBtn = document.createElement('button');
      plusRepBtn.type = 'button';
      plusRepBtn.className = 'chip-stepper-btn';
      plusRepBtn.textContent = '+1 rep';
      plusRepBtn.title = 'Aumenta tutti i set di 1 rep';
      plusRepBtn.addEventListener('click', () => {
        playUiTick(700);
        ex.sets.forEach((s) => { s.reps = (Number(s.reps) || 0) + 1; });
        saveExtraState();
        renderGymModule();
        showActionToast(`⚡ ${ex.name}: +1 rep applicata a tutte le serie!`);
      });

      const addSetBtn = document.createElement('button');
      addSetBtn.type = 'button';
      addSetBtn.className = 'btn-secondary btn-xs';
      addSetBtn.textContent = '+ Serie';
      addSetBtn.addEventListener('click', () => {
        const lastSet = ex.sets[ex.sets.length - 1] || { kg: 50, reps: 10 };
        ex.sets.push({ kg: lastSet.kg, reps: lastSet.reps, done: false });
        saveExtraState();
        renderGymModule();
      });

      const delExBtn = document.createElement('button');
      delExBtn.type = 'button';
      delExBtn.className = 'btn-danger-ghost btn-xs';
      delExBtn.textContent = '✕';
      delExBtn.addEventListener('click', () => {
        extraState.gymExercises = extraState.gymExercises.filter((x) => x.id !== ex.id);
        saveExtraState();
        renderGymModule();
      });

      rightBtns.appendChild(plusKgBtn);
      rightBtns.appendChild(plusRepBtn);
      rightBtns.appendChild(addSetBtn);
      rightBtns.appendChild(delExBtn);

      head.appendChild(titleWrap);
      head.appendChild(rightBtns);

      const setsRow = document.createElement('div');
      setsRow.className = 'sets-pills-row';

      (ex.sets || []).forEach((s, idx) => {
        if (s.done) {
          totalVolume += Number(s.kg) * Number(s.reps);
          totalDoneSets++;
        }
        const group = document.createElement('div');
        group.className = 'set-pill-group';
        group.dataset.done = String(Boolean(s.done));

        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'set-pill-btn';
        pill.textContent = `S${idx + 1}: ${s.kg}kg×${s.reps} ${s.done ? '✓' : ''}`;
        pill.addEventListener('click', () => {
          playUiTick(s.done ? 500 : 840);
          s.done = !s.done;
          if (s.done && Number(s.kg) > 0) {
            recordExerciseSetLog(ex.name, Number(s.kg), Number(s.reps), idx + 1);
          }
          saveExtraState();
          renderGymModule();
          if (s.done) {
            startGymRestTimer(90);
            showActionToast(`Serie S${idx + 1} completata! Recupero 90s avviato.`);
          }
        });

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'set-edit-btn';
        editBtn.textContent = '✎';
        editBtn.title = 'Modifica carico / ripetizioni con stepper';
        editBtn.addEventListener('click', () => {
          openEditGymSetModal(ex, idx);
        });

        group.appendChild(pill);
        group.appendChild(editBtn);
        setsRow.appendChild(group);
      });

      card.appendChild(head);
      card.appendChild(setsRow);
      exList.appendChild(card);
    });

    document.getElementById('gym-today-volume').textContent = `${totalVolume} kg`;
    document.getElementById('gym-today-sets').textContent = `${totalDoneSets} serie`;

    // Update Active Workout Banner in Gym Tab
    const realTodayIdx = (new Date().getDay() + 6) % 7;
    const activeDayIdx = extraState.activeGymDayIdx ?? realTodayIdx;
    const activeRoutine = extraState.weeklyGymProgram?.schedule?.[activeDayIdx] || {
      day: DAY_LABELS_IT[activeDayIdx] || 'Oggi',
      focus: 'Allenamento Odierno'
    };

    const badgeEl = document.getElementById('gym-active-day-badge');
    if (badgeEl) {
      const isActuallyToday = activeDayIdx === realTodayIdx;
      badgeEl.textContent = `🥊 SCHEDA: ${activeRoutine.day.toUpperCase()} ${isActuallyToday ? '(OGGI)' : '(PERSONALIZZATA)'}`;
    }
    const titleEl = document.getElementById('gym-active-day-title');
    if (titleEl) {
      titleEl.textContent = activeRoutine.focus ? activeRoutine.focus.split('(')[0].trim() : activeRoutine.day;
    }
    const focusEl = document.getElementById('gym-active-day-focus');
    if (focusEl) {
      focusEl.textContent = activeRoutine.focus || 'Allenamento completo e disciplina';
    }

    // Update Today Gym Summary Card on "Oggi" Screen
    const todayGymTitle = document.getElementById('today-gym-summary-title');
    const todayGymSub = document.getElementById('today-gym-summary-sub');
    const todayGymBar = document.getElementById('today-gym-progress-bar');
    const todayGymProgressText = document.getElementById('today-gym-progress-text');
    if (todayGymTitle) {
      todayGymTitle.textContent = `${activeRoutine.day}: ${activeRoutine.focus ? activeRoutine.focus.split('(')[0].trim() : 'Sessione'}`;
    }
    if (todayGymSub) {
      const totalExCount = (extraState.gymExercises || []).length;
      todayGymSub.textContent = `${totalExCount} esercizi previsti · ${activeRoutine.focus || 'Fighter Boxing & Pesi'}`;
    }
    let totalSetsPlanned = 0;
    (extraState.gymExercises || []).forEach((ex) => {
      totalSetsPlanned += (ex.sets || []).length;
    });
    const pct = totalSetsPlanned > 0 ? Math.min(100, Math.round((totalDoneSets / totalSetsPlanned) * 100)) : 0;
    if (todayGymBar) {
      todayGymBar.style.width = `${pct}%`;
    }
    if (todayGymProgressText) {
      todayGymProgressText.textContent = `${totalDoneSets}/${totalSetsPlanned} serie (${pct}%)`;
    }

    (extraState.gymHistory || []).forEach((gh) => {
      const li = document.createElement('li');
      li.className = 'list-row';
      const left = document.createElement('div');
      const t = document.createElement('strong');
      t.textContent = `${gh.title} (${gh.date})`;
      const sub = document.createElement('p');
      sub.className = 'habit-meta-sub';
      sub.textContent = `Volume: ${gh.volumeKg} kg · ${gh.setsCount} serie`;
      left.appendChild(t);
      left.appendChild(sub);

      const delHistBtn = document.createElement('button');
      delHistBtn.type = 'button';
      delHistBtn.className = 'btn-danger-ghost btn-xs';
      delHistBtn.textContent = '✕';
      delHistBtn.addEventListener('click', () => {
        extraState.gymHistory = extraState.gymHistory.filter((x) => x.id !== gh.id);
        saveExtraState();
        renderGymModule();
      });

      li.appendChild(left);
      li.appendChild(delHistBtn);
      histList.appendChild(li);
    });

    renderWeeklyGymProgram();
    renderFighterPrsTable();
    updateIntervalTimerUI();
  }

  function renderWeeklyGymProgram() {
    const splitNameEl = document.getElementById('gym-current-split-name');
    const dayBarEl = document.getElementById('gym-weekly-day-bar');
    const selectedTitleEl = document.getElementById('gym-selected-day-title');
    const selectedFocusEl = document.getElementById('gym-selected-day-focus');
    const exContainer = document.getElementById('gym-day-exercises-container');
    if (!splitNameEl || !dayBarEl || !exContainer) return;

    if (!extraState.weeklyGymProgram || !Array.isArray(extraState.weeklyGymProgram.schedule)) {
      extraState.weeklyGymProgram = DEFAULT_EXTRA.weeklyGymProgram;
      saveExtraState();
    }

    splitNameEl.textContent = extraState.weeklyGymProgram.splitName || 'Programma Settimanale';

    // Highlight active day chip and clearly label the real current day
    const todayRealIdx = (new Date().getDay() + 6) % 7;
    dayBarEl.querySelectorAll('.gym-day-chip').forEach((chip) => {
      const dayIdx = parseInt(chip.dataset.gymDay, 10);
      chip.classList.toggle('active', dayIdx === selectedGymDayIdx);
      const isTodayReal = dayIdx === todayRealIdx;
      chip.classList.toggle('chip-today-real', isTodayReal);
      const baseLabel = DAY_LABELS_IT[dayIdx] || 'Giorno';
      chip.textContent = isTodayReal ? `${baseLabel} (Oggi)` : baseLabel;
    });

    const dayRoutine = extraState.weeklyGymProgram.schedule[selectedGymDayIdx] || {
      day: 'Giorno',
      focus: 'Riposo',
      exercises: []
    };

    if (selectedTitleEl) selectedTitleEl.textContent = dayRoutine.day;
    if (selectedFocusEl) selectedFocusEl.textContent = dayRoutine.focus;

    exContainer.replaceChildren();

    if (!dayRoutine.exercises || dayRoutine.exercises.length === 0) {
      const emptyP = document.createElement('p');
      emptyP.className = 'text-muted text-sm';
      emptyP.style.padding = '12px 6px';
      emptyP.textContent = 'Giorno di riposo o nessun esercizio. Tocca «＋ Esercizio» per aggiungere i tuoi esercizi per questo giorno.';
      exContainer.appendChild(emptyP);
    } else {
      dayRoutine.exercises.forEach((ex, exIdx) => {
        const row = document.createElement('div');
        row.className = 'routine-ex-row';

        const info = document.createElement('div');
        info.className = 'routine-ex-info';
        const strong = document.createElement('strong');
        strong.textContent = ex.name;

        const badgeWrap = document.createElement('div');
        badgeWrap.className = 'routine-badge-wrap';

        const sBadge = document.createElement('span');
        sBadge.className = 'routine-badge';
        sBadge.textContent = `${ex.sets || 3} serie`;

        const rBadge = document.createElement('span');
        rBadge.className = 'routine-badge';
        rBadge.textContent = `${ex.reps || 10} reps`;

        const kgBadge = document.createElement('span');
        kgBadge.className = 'routine-badge gold';
        kgBadge.textContent = `${ex.kg || 0} kg`;

        badgeWrap.appendChild(sBadge);
        badgeWrap.appendChild(rBadge);
        badgeWrap.appendChild(kgBadge);

        info.appendChild(strong);
        info.appendChild(badgeWrap);

        const actionWrap = document.createElement('div');
        actionWrap.style.display = 'flex';
        actionWrap.style.gap = '6px';
        actionWrap.style.alignItems = 'center';

        const editExBtn = document.createElement('button');
        editExBtn.type = 'button';
        editExBtn.className = 'btn-ghost btn-xs';
        editExBtn.textContent = '✎';
        editExBtn.title = 'Modifica esercizio, serie, reps e kg';
        editExBtn.addEventListener('click', () => {
          playUiTick(650);
          openEditRoutineExModal(dayRoutine, ex, exIdx);
        });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'btn-danger-ghost btn-xs';
        delBtn.textContent = '✕';
        delBtn.title = 'Rimuovi dal programma';
        delBtn.addEventListener('click', () => {
          if (!confirm(`Rimuovere "${ex.name}" dal programma di ${dayRoutine.day}?`)) return;
          dayRoutine.exercises.splice(exIdx, 1);
          saveExtraState();
          syncWeeklyGymProgram();
          renderWeeklyGymProgram();
          showActionToast(`🗑️ Esercizio rimosso dal programma`);
        });

        actionWrap.appendChild(editExBtn);
        actionWrap.appendChild(delBtn);
        row.appendChild(info);
        row.appendChild(actionWrap);
        exContainer.appendChild(row);
      });
    }
  }

  function syncWeeklyGymProgram() {
    if (!extraState.weeklyGymProgram) return;
    fetch('/api/auth/gym-program', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        token: currentToken,
        program: extraState.weeklyGymProgram,
        activeExercises: extraState.gymExercises
      })
    }).catch(() => {});
  }

  function buildDefaultGymRoutinesClient(splitKey = 'push_pull_legs') {
    switch (splitKey) {
      case 'fighter_boxing':
        return FIGHTER_BOXING_ROUTINE;
      case 'upper_lower':
        return [
          {
            day: 'Lunedì',
            focus: 'Upper Body A (Panca, Rematore, Spalle)',
            exercises: [
              { id: 'ex-ul-1', name: 'Panca Piana Bilanciere', sets: 4, reps: 8, kg: 75 },
              { id: 'ex-ul-2', name: 'Rematore con Bilanciere', sets: 4, reps: 8, kg: 65 },
              { id: 'ex-ul-3', name: 'Lento Avanti Manubri', sets: 3, reps: 10, kg: 24 },
              { id: 'ex-ul-4', name: 'Lat Machine Presa Neutra', sets: 3, reps: 10, kg: 60 }
            ]
          },
          {
            day: 'Martedì',
            focus: 'Lower Body A (Squat, RDL, Polpacci)',
            exercises: [
              { id: 'ex-ul-5', name: 'Squat con Bilanciere', sets: 4, reps: 8, kg: 95 },
              { id: 'ex-ul-6', name: 'Stacco Gambe Tese (RDL)', sets: 3, reps: 10, kg: 80 },
              { id: 'ex-ul-7', name: 'Leg Extension', sets: 3, reps: 12, kg: 55 },
              { id: 'ex-ul-8', name: 'Calf Raise in Piedi', sets: 4, reps: 15, kg: 70 }
            ]
          },
          { day: 'Mercoledì', focus: 'Riposo Attivo & Mobilità', exercises: [] },
          {
            day: 'Giovedì',
            focus: 'Upper Body B (Inclinata, Trazioni, Braccia)',
            exercises: [
              { id: 'ex-ul-9', name: 'Spinte Panca Inclinata', sets: 4, reps: 10, kg: 26 },
              { id: 'ex-ul-10', name: 'Pulley Orizzontale', sets: 3, reps: 10, kg: 55 },
              { id: 'ex-ul-11', name: 'Alzate Laterali Cavi', sets: 3, reps: 12, kg: 12 },
              { id: 'ex-ul-12', name: 'Superset Curl + Pushdown', sets: 3, reps: 12, kg: 25 }
            ]
          },
          {
            day: 'Venerdì',
            focus: 'Lower Body B (Pressa, Affondi, Core)',
            exercises: [
              { id: 'ex-ul-13', name: 'Pressa a 45 Gradi', sets: 4, reps: 10, kg: 140 },
              { id: 'ex-ul-14', name: 'Leg Curl Sdraiato', sets: 3, reps: 12, kg: 45 },
              { id: 'ex-ul-15', name: 'Affondi con Manubri', sets: 3, reps: 10, kg: 18 },
              { id: 'ex-ul-16', name: 'Plank con Sovraccarico', sets: 3, reps: 60, kg: 10 }
            ]
          },
          { day: 'Sabato', focus: 'Riposo & Camminata Rigenerante', exercises: [] },
          { day: 'Domenica', focus: 'Riposo Totale', exercises: [] }
        ];
      case 'full_body':
        return [
          {
            day: 'Lunedì',
            focus: 'Full Body A (Panca, Squat, Pulley)',
            exercises: [
              { id: 'ex-fb-1', name: 'Panca Piana Bilanciere', sets: 4, reps: 8, kg: 75 },
              { id: 'ex-fb-2', name: 'Squat con Bilanciere', sets: 4, reps: 8, kg: 90 },
              { id: 'ex-fb-3', name: 'Pulley Basso al Cavo', sets: 3, reps: 10, kg: 55 },
              { id: 'ex-fb-4', name: 'Shoulder Press Manubri', sets: 3, reps: 10, kg: 22 }
            ]
          },
          { day: 'Martedì', focus: 'Riposo & Cardio 20m', exercises: [] },
          {
            day: 'Mercoledì',
            focus: 'Full Body B (Stacco, Trazioni, Dip)',
            exercises: [
              { id: 'ex-fb-5', name: 'Stacco da Terra Regolare', sets: 4, reps: 6, kg: 105 },
              { id: 'ex-fb-6', name: 'Lat Machine Presa Inversa', sets: 4, reps: 10, kg: 65 },
              { id: 'ex-fb-7', name: 'Dip alle Parallele', sets: 3, reps: 10, kg: 0 },
              { id: 'ex-fb-8', name: 'Leg Press 45°', sets: 3, reps: 10, kg: 120 }
            ]
          },
          { day: 'Giovedì', focus: 'Riposo e Stretching', exercises: [] },
          {
            day: 'Venerdì',
            focus: 'Full Body C (Spinte, Affondi, Braccia)',
            exercises: [
              { id: 'ex-fb-9', name: 'Spinte Manubri su Panca', sets: 3, reps: 10, kg: 26 },
              { id: 'ex-fb-10', name: 'Rematore Manubrio Singolo', sets: 3, reps: 10, kg: 28 },
              { id: 'ex-fb-11', name: 'Affondi Bulgari', sets: 3, reps: 10, kg: 14 },
              { id: 'ex-fb-12', name: 'Curl Manubri + Pushdown', sets: 3, reps: 12, kg: 20 }
            ]
          },
          { day: 'Sabato', focus: 'Riposo Attivo', exercises: [] },
          { day: 'Domenica', focus: 'Riposo Totale', exercises: [] }
        ];
      case 'calisthenics_cardio':
        return [
          {
            day: 'Lunedì',
            focus: 'Spinta a Corpo Libero & Core',
            exercises: [
              { id: 'ex-cc-1', name: 'Push-up Declinati', sets: 4, reps: 15, kg: 0 },
              { id: 'ex-cc-2', name: 'Dip alle Parallele', sets: 4, reps: 12, kg: 0 },
              { id: 'ex-cc-3', name: 'Pike Push-up Spalle', sets: 3, reps: 10, kg: 0 },
              { id: 'ex-cc-4', name: 'Hollow Body Hold', sets: 3, reps: 45, kg: 0 }
            ]
          },
          { day: 'Martedì', focus: 'Cardio HIIT 25m', exercises: [] },
          {
            day: 'Mercoledì',
            focus: 'Trazione a Corpo Libero & Bicipiti',
            exercises: [
              { id: 'ex-cc-5', name: 'Trazioni alla Sbarra (Pull-up)', sets: 4, reps: 8, kg: 0 },
              { id: 'ex-cc-6', name: 'Australian Pull-up agli Anelli', sets: 3, reps: 12, kg: 0 },
              { id: 'ex-cc-7', name: 'Chin-up Presa Supina', sets: 3, reps: 8, kg: 0 },
              { id: 'ex-cc-8', name: 'L-Sit alla Sbarra', sets: 3, reps: 20, kg: 0 }
            ]
          },
          { day: 'Giovedì', focus: 'Riposo & Camminata', exercises: [] },
          {
            day: 'Venerdì',
            focus: 'Gambe Esplosive & Conditioning',
            exercises: [
              { id: 'ex-cc-9', name: 'Jump Squat a Corpo Libero', sets: 4, reps: 15, kg: 0 },
              { id: 'ex-cc-10', name: 'Affondi Saltati Alternati', sets: 3, reps: 20, kg: 0 },
              { id: 'ex-cc-11', name: 'Pistol Squat Assistito', sets: 3, reps: 6, kg: 0 },
              { id: 'ex-cc-12', name: 'Burpees ad Alta Intensità', sets: 3, reps: 15, kg: 0 }
            ]
          },
          { day: 'Sabato', focus: 'Corsa o Bici all\'Aperto', exercises: [] },
          { day: 'Domenica', focus: 'Riposo Totale', exercises: [] }
        ];
      case 'push_pull_legs':
      default:
        return [
          {
            day: 'Lunedì',
            focus: 'Push Day (Petto, Spalle, Tricipiti)',
            exercises: [
              { id: 'ex-w1', name: 'Panca Piana Bilanciere', sets: 4, reps: 8, kg: 75 },
              { id: 'ex-w2', name: 'Military Press / Spinte Manubri', sets: 3, reps: 10, kg: 24 },
              { id: 'ex-w3', name: 'Alzate Laterali Manubri', sets: 3, reps: 12, kg: 12 },
              { id: 'ex-w4', name: 'Pushdown Tricipiti Corda', sets: 3, reps: 12, kg: 25 }
            ]
          },
          {
            day: 'Martedì',
            focus: 'Pull Day (Dorso, Bicipiti, Deltoidi Post.)',
            exercises: [
              { id: 'ex-w5', name: 'Lat Machine Presa Larga', sets: 4, reps: 10, kg: 65 },
              { id: 'ex-w6', name: 'Rematore Manubrio Singolo', sets: 3, reps: 10, kg: 28 },
              { id: 'ex-w7', name: 'Face Pull Cavi', sets: 3, reps: 15, kg: 20 },
              { id: 'ex-w8', name: 'Curl Manubri Inclinata', sets: 3, reps: 12, kg: 14 }
            ]
          },
          {
            day: 'Mercoledì',
            focus: 'Riposo & Camminata Attiva 5km',
            exercises: []
          },
          {
            day: 'Giovedì',
            focus: 'Legs & Core (Quadricipiti, Femorali, Addome)',
            exercises: [
              { id: 'ex-w9', name: 'Squat Bilanciere / Pressa 45°', sets: 4, reps: 8, kg: 100 },
              { id: 'ex-w10', name: 'Leg Curl Seduto', sets: 3, reps: 12, kg: 45 },
              { id: 'ex-w11', name: 'Affondi Manubri Camminati', sets: 3, reps: 10, kg: 18 },
              { id: 'ex-w12', name: 'Plank Sovraccarico', sets: 3, reps: 60, kg: 10 }
            ]
          },
          {
            day: 'Venerdì',
            focus: 'Upper Body Pump / Braccia & Spalle',
            exercises: [
              { id: 'ex-w13', name: 'Spinte Manubri Panca 30°', sets: 3, reps: 10, kg: 26 },
              { id: 'ex-w14', name: 'Pulley Basso Presa Stretta', sets: 3, reps: 10, kg: 55 },
              { id: 'ex-w15', name: 'Dip alle Parallele', sets: 3, reps: 10, kg: 0 },
              { id: 'ex-w16', name: 'Curl Bilanciere Sagomato EZ', sets: 3, reps: 10, kg: 30 }
            ]
          },
          {
            day: 'Sabato',
            focus: 'Riposo & Allungamento Funzionale',
            exercises: []
          },
          {
            day: 'Domenica',
            focus: 'Riposo Totale & Ricarica Mentale',
            exercises: []
          }
        ];
    }
  }

  document.getElementById('add-exercise-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('gym-ex-name').value.trim();
    const kg = Number(document.getElementById('gym-ex-kg').value) || 50;
    const reps = Number(document.getElementById('gym-ex-reps').value) || 10;
    if (name) {
      extraState.gymExercises.push({
        id: `ex-${Date.now()}`,
        name,
        sets: [
          { kg, reps, done: false },
          { kg, reps, done: false },
          { kg, reps, done: false }
        ]
      });
      saveExtraState();
      renderGymModule();
      document.getElementById('gym-ex-name').value = '';
      universalSheet?.close();
      activateTab('gym');
      showActionToast(`🏋️ «${name}» aggiunto!`);
    }
  });

  document.getElementById('btn-finish-workout')?.addEventListener('click', () => {
    let vol = 0;
    let sets = 0;
    extraState.gymExercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.done) {
          vol += Number(s.kg) * Number(s.reps);
          sets++;
        }
      });
    });
    extraState.gymHistory.unshift({
      id: `gh-${Date.now()}`,
      date: new Date().toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }),
      title: `Allenamento (${extraState.gymExercises.length} esercizi)`,
      volumeKg: vol || 3200,
      setsCount: sets || 12
    });
    saveExtraState();
    renderGymModule();
    render52WeekReport(currentState);
    playAlarmChime('pulse');
    showActionToast('🏆 Sessione salvata nello storico!');
  });

  // ==========================================================================
  // 2B. ROUND & INTERVAL TIMER (GENERIC FOR WORK & REST CYCLES)
  // Resistant to screen-off / background lock on mobile via WakeLock,
  // Timestamp Delta Tracking, Silent Audio Keep-Alive & MediaSession.
  // ==========================================================================
  let intervalTimerState = {
    running: false,
    phase: 'idle', // 'idle', 'prep', 'work', 'rest', 'completed'
    currentRound: 1,
    secLeft: 120,
    phaseTotalSec: 120,
    phaseEndTimestamp: null,
    lastWarningSec: null,
    timerId: null
  };

  let intervalWakeLock = null;
  let intervalKeepAliveAudio = null;

  async function acquireIntervalWakeLock() {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      try {
        intervalWakeLock = await navigator.wakeLock.request('screen');
        updateWakeLockUI(true);
        intervalWakeLock.addEventListener('release', () => {
          intervalWakeLock = null;
          updateWakeLockUI(false);
        });
      } catch (err) {
        updateWakeLockUI(false);
      }
    }
  }

  function releaseIntervalWakeLock() {
    if (intervalWakeLock) {
      intervalWakeLock.release().catch(() => {});
      intervalWakeLock = null;
      updateWakeLockUI(false);
    }
  }

  function updateWakeLockUI(active) {
    const pill = document.getElementById('interval-wakelock-pill');
    if (pill) {
      if (active) {
        pill.classList.add('active');
        pill.textContent = '💡 Schermo Sempre Acceso';
      } else {
        pill.classList.remove('active');
        pill.textContent = '💤 Schermo Standard';
      }
    }
  }

  function startIntervalAudioKeepAlive() {
    try {
      ensureAudioContext();
      if (!intervalKeepAliveAudio) {
        intervalKeepAliveAudio = new Audio();
        // 1-second silent WAV base64
        intervalKeepAliveAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        intervalKeepAliveAudio.loop = true;
        intervalKeepAliveAudio.setAttribute('playsinline', '');
        intervalKeepAliveAudio.setAttribute('preload', 'auto');
      }
      intervalKeepAliveAudio.play().catch(() => {});
    } catch (e) {}
  }

  function stopIntervalAudioKeepAlive() {
    if (intervalKeepAliveAudio) {
      try {
        intervalKeepAliveAudio.pause();
      } catch (e) {}
    }
  }

  function updateIntervalMediaSession(phaseLabel, secLeft, currentRound, totalRounds) {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `🥊 Round ${currentRound}/${totalRounds} - ${phaseLabel}`,
        artist: `Tempo: ${formatMMSS(secLeft)} rimanenti`,
        album: 'Timer Intervalli · PROMEMORY',
        artwork: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      navigator.mediaSession.playbackState = intervalTimerState.running ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', () => {
        startIntervalTimer();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        pauseIntervalTimer();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        skipIntervalPhase();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        resetIntervalTimer();
      });
    } catch (e) {}
  }

  function dispatchIntervalNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/icon-192.png',
          tag: 'promemory-interval-timer',
          renotify: true
        });
      } catch (e) {}
    }
  }

  function getIntervalConfig() {
    if (!extraState.intervalConfig) {
      extraState.intervalConfig = {
        workSec: 120,
        restSec: 30,
        rounds: 5,
        prepSec: 5,
        sound: 'boxing_bell'
      };
    }
    return extraState.intervalConfig;
  }

  function formatMMSS(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const remS = s % 60;
    return `${String(m).padStart(2, '0')}:${String(remS).padStart(2, '0')}`;
  }

  function getSoundNameLabel(soundKey) {
    switch (soundKey) {
      case 'powerful_gong': return 'Gong Risonante';
      case 'digital_alarm': return 'Allarme Acustico';
      case 'whistle': return 'Fischietto Arbitro';
      case 'boxing_bell':
      default:
        return 'Campana Ring';
    }
  }

  function updateIntervalTimerUI() {
    const cfg = getIntervalConfig();
    const clockEl = document.getElementById('interval-clock-display');
    const badgeEl = document.getElementById('interval-phase-badge');
    const curRoundEl = document.getElementById('interval-current-round');
    const totRoundsEl = document.getElementById('interval-total-rounds');
    const hintEl = document.getElementById('interval-status-hint');
    const fillEl = document.getElementById('interval-progress-fill');
    const toggleIcon = document.getElementById('interval-toggle-icon');
    const toggleText = document.getElementById('interval-toggle-text');
    const toggleBtn = document.getElementById('btn-interval-toggle');

    if (!clockEl) return;

    if (intervalTimerState.phase === 'idle') {
      intervalTimerState.secLeft = cfg.workSec;
      intervalTimerState.phaseTotalSec = cfg.workSec;
    }

    clockEl.textContent = formatMMSS(intervalTimerState.secLeft);
    if (curRoundEl) curRoundEl.textContent = String(intervalTimerState.currentRound);
    if (totRoundsEl) totRoundsEl.textContent = String(cfg.rounds);

    // Dynamic phase badge
    let phaseLabel = 'LAVORO';
    if (badgeEl) {
      badgeEl.className = 'interval-phase-badge';
      if (intervalTimerState.phase === 'prep') {
        phaseLabel = 'PREPARATI';
        badgeEl.textContent = '⏳ PREPARATI';
        badgeEl.classList.add('phase-prep');
      } else if (intervalTimerState.phase === 'rest') {
        phaseLabel = 'RECUPERO';
        badgeEl.textContent = '🛑 RECUPERO';
        badgeEl.classList.add('phase-rest');
      } else if (intervalTimerState.phase === 'completed') {
        phaseLabel = 'COMPLETATO';
        badgeEl.textContent = '🏆 COMPLETATO';
        badgeEl.classList.add('phase-done');
      } else {
        phaseLabel = 'LAVORO';
        badgeEl.textContent = '🥊 LAVORO';
        badgeEl.classList.add('phase-work');
      }
    }

    // Dynamic clock styling
    clockEl.classList.remove('clock-prep', 'clock-rest', 'clock-work', 'clock-done');
    if (intervalTimerState.phase === 'prep') clockEl.classList.add('clock-prep');
    else if (intervalTimerState.phase === 'rest') clockEl.classList.add('clock-rest');
    else if (intervalTimerState.phase === 'completed') clockEl.classList.add('clock-done');
    else clockEl.classList.add('clock-work');

    // Status Hint text
    if (hintEl) {
      if (intervalTimerState.phase === 'idle') {
        hintEl.textContent = `Tocca AVVIA per iniziare il Round 1 di ${cfg.rounds}`;
      } else if (intervalTimerState.phase === 'prep') {
        hintEl.textContent = `Preparati! Il Round ${intervalTimerState.currentRound} inizia tra poco`;
      } else if (intervalTimerState.phase === 'work') {
        hintEl.textContent = `Round ${intervalTimerState.currentRound} di ${cfg.rounds} in corso! Schermo attivo e audio sbloccato`;
      } else if (intervalTimerState.phase === 'rest') {
        hintEl.textContent = `Recupera il fiato! Prossimo Round: ${intervalTimerState.currentRound + 1} di ${cfg.rounds}`;
      } else if (intervalTimerState.phase === 'completed') {
        hintEl.textContent = `Ottimo lavoro! Tutti i ${cfg.rounds} round sono stati completati!`;
      }
    }

    // Progress bar fill
    if (fillEl) {
      const tot = intervalTimerState.phaseTotalSec || 1;
      const pct = Math.max(0, Math.min(100, Math.round((intervalTimerState.secLeft / tot) * 100)));
      fillEl.style.width = `${pct}%`;
      if (intervalTimerState.phase === 'rest') {
        fillEl.style.background = 'linear-gradient(90deg, #f59e0b, #ef4444)';
      } else if (intervalTimerState.phase === 'prep') {
        fillEl.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
      } else if (intervalTimerState.phase === 'completed') {
        fillEl.style.background = 'linear-gradient(90deg, #10b981, #3b82f6)';
      } else {
        fillEl.style.background = 'linear-gradient(90deg, #10b981, #06b6d4)';
      }
    }

    // Main Toggle Button
    if (toggleBtn && toggleIcon && toggleText) {
      if (intervalTimerState.running) {
        toggleBtn.classList.add('btn-interval-running');
        toggleIcon.textContent = '⏸';
        toggleText.textContent = 'PAUSA';
      } else {
        toggleBtn.classList.remove('btn-interval-running');
        if (intervalTimerState.phase === 'completed') {
          toggleIcon.textContent = '🔄';
          toggleText.textContent = 'NUOVO CICLO';
        } else if (intervalTimerState.phase !== 'idle') {
          toggleIcon.textContent = '▶';
          toggleText.textContent = 'RIPRENDI';
        } else {
          toggleIcon.textContent = '▶';
          toggleText.textContent = 'AVVIA';
        }
      }
    }

    // Summary Labels in Presets Bar
    const sumWork = document.getElementById('summary-work-time');
    const sumRest = document.getElementById('summary-rest-time');
    const sumRounds = document.getElementById('summary-rounds-count');
    const sumSound = document.getElementById('summary-sound-label');
    if (sumWork) sumWork.textContent = formatMMSS(cfg.workSec);
    if (sumRest) sumRest.textContent = formatMMSS(cfg.restSec);
    if (sumRounds) sumRounds.textContent = `${cfg.rounds} Round`;
    if (sumSound) sumSound.textContent = getSoundNameLabel(cfg.sound);

    // Preset chip active states
    document.querySelectorAll('.preset-chip[data-preset-work]').forEach((chip) => {
      const w = parseInt(chip.dataset.presetWork, 10);
      const r = parseInt(chip.dataset.presetRest, 10);
      const rnd = parseInt(chip.dataset.presetRounds, 10);
      const isMatch = w === cfg.workSec && r === cfg.restSec && rnd === cfg.rounds;
      chip.classList.toggle('active', isMatch);
    });

    updateIntervalMediaSession(phaseLabel, intervalTimerState.secLeft, intervalTimerState.currentRound, cfg.rounds);
  }

  function startIntervalTimer() {
    const cfg = getIntervalConfig();
    ensureAudioContext();

    // Ask notification permission if not yet requested
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    acquireIntervalWakeLock();
    startIntervalAudioKeepAlive();

    if (intervalTimerState.phase === 'completed') {
      intervalTimerState.phase = 'idle';
      intervalTimerState.currentRound = 1;
    }

    if (intervalTimerState.phase === 'idle') {
      if (cfg.prepSec > 0) {
        intervalTimerState.phase = 'prep';
        intervalTimerState.secLeft = cfg.prepSec;
        intervalTimerState.phaseTotalSec = cfg.prepSec;
        intervalTimerState.phaseEndTimestamp = Date.now() + (cfg.prepSec * 1000);
        intervalTimerState.lastWarningSec = null;
        playIntervalSound('warning_beep', cfg.sound);
      } else {
        intervalTimerState.phase = 'work';
        intervalTimerState.secLeft = cfg.workSec;
        intervalTimerState.phaseTotalSec = cfg.workSec;
        intervalTimerState.phaseEndTimestamp = Date.now() + (cfg.workSec * 1000);
        intervalTimerState.lastWarningSec = null;
        playIntervalSound('work_start', cfg.sound);
      }
    } else {
      // Resuming from pause
      intervalTimerState.phaseEndTimestamp = Date.now() + (intervalTimerState.secLeft * 1000);
      intervalTimerState.lastWarningSec = null;
    }

    intervalTimerState.running = true;
    updateIntervalTimerUI();

    if (intervalTimerState.timerId) clearInterval(intervalTimerState.timerId);

    // High frequency interval (300ms) with Date.now() delta tracking to eliminate timer drift & sleep pausing
    intervalTimerState.timerId = setInterval(() => {
      if (!intervalTimerState.running || !intervalTimerState.phaseEndTimestamp) return;

      const now = Date.now();
      const msRemaining = intervalTimerState.phaseEndTimestamp - now;
      const secRemaining = Math.max(0, Math.ceil(msRemaining / 1000));

      // 3-2-1 acoustic warning beeps (fires exactly once per second)
      if (secRemaining <= 3 && secRemaining > 0 && intervalTimerState.lastWarningSec !== secRemaining) {
        intervalTimerState.lastWarningSec = secRemaining;
        playIntervalSound('warning_beep', cfg.sound);
      }

      if (msRemaining <= 0) {
        handleIntervalPhaseTransition();
      } else if (intervalTimerState.secLeft !== secRemaining) {
        intervalTimerState.secLeft = secRemaining;
        updateIntervalTimerUI();
      }
    }, 300);
  }

  function handleIntervalPhaseTransition() {
    const cfg = getIntervalConfig();

    if (intervalTimerState.phase === 'prep') {
      intervalTimerState.phase = 'work';
      intervalTimerState.secLeft = cfg.workSec;
      intervalTimerState.phaseTotalSec = cfg.workSec;
      intervalTimerState.phaseEndTimestamp = Date.now() + (cfg.workSec * 1000);
      intervalTimerState.lastWarningSec = null;
      playIntervalSound('work_start', cfg.sound);
      dispatchIntervalNotification('🥊 Round Iniziato', `Round ${intervalTimerState.currentRound} di ${cfg.rounds} in corso!`);
      showActionToast(`🥊 Round ${intervalTimerState.currentRound} INIZIATO!`);
    } else if (intervalTimerState.phase === 'work') {
      if (intervalTimerState.currentRound >= cfg.rounds) {
        intervalTimerState.phase = 'completed';
        intervalTimerState.running = false;
        intervalTimerState.secLeft = 0;
        intervalTimerState.phaseEndTimestamp = null;
        if (intervalTimerState.timerId) {
          clearInterval(intervalTimerState.timerId);
          intervalTimerState.timerId = null;
        }
        releaseIntervalWakeLock();
        stopIntervalAudioKeepAlive();
        playIntervalSound('workout_completed', cfg.sound);
        dispatchIntervalNotification('🏆 Allenamento Concluso', `Tutti i ${cfg.rounds} round sono stati completati!`);
        showActionToast(`🏆 Sessione completata! ${cfg.rounds} round conclusi!`);
      } else {
        intervalTimerState.phase = 'rest';
        intervalTimerState.secLeft = cfg.restSec;
        intervalTimerState.phaseTotalSec = cfg.restSec;
        intervalTimerState.phaseEndTimestamp = Date.now() + (cfg.restSec * 1000);
        intervalTimerState.lastWarningSec = null;
        playIntervalSound('rest_start', cfg.sound);
        dispatchIntervalNotification('🛑 Recupero', `Round ${intervalTimerState.currentRound} terminato. Riposa ${cfg.restSec}s.`);
        showActionToast(`🛑 Round ${intervalTimerState.currentRound} concluso. Recupero!`);
      }
    } else if (intervalTimerState.phase === 'rest') {
      intervalTimerState.currentRound++;
      intervalTimerState.phase = 'work';
      intervalTimerState.secLeft = cfg.workSec;
      intervalTimerState.phaseTotalSec = cfg.workSec;
      intervalTimerState.phaseEndTimestamp = Date.now() + (cfg.workSec * 1000);
      intervalTimerState.lastWarningSec = null;
      playIntervalSound('work_start', cfg.sound);
      dispatchIntervalNotification('🥊 Round Iniziato', `Round ${intervalTimerState.currentRound} di ${cfg.rounds} INIZIATO!`);
      showActionToast(`🥊 Round ${intervalTimerState.currentRound} di ${cfg.rounds} INIZIATO!`);
    }

    updateIntervalTimerUI();
  }

  // Fast catch-up engine when phone wakes up from lock / background tab
  function catchUpIntervalTimer() {
    if (!intervalTimerState.running || !intervalTimerState.phaseEndTimestamp) return;
    const cfg = getIntervalConfig();
    const now = Date.now();

    while (now >= intervalTimerState.phaseEndTimestamp && intervalTimerState.running && intervalTimerState.phase !== 'completed') {
      if (intervalTimerState.phase === 'prep') {
        intervalTimerState.phase = 'work';
        intervalTimerState.phaseTotalSec = cfg.workSec;
        intervalTimerState.phaseEndTimestamp += cfg.workSec * 1000;
        playIntervalSound('work_start', cfg.sound);
      } else if (intervalTimerState.phase === 'work') {
        if (intervalTimerState.currentRound >= cfg.rounds) {
          intervalTimerState.phase = 'completed';
          intervalTimerState.running = false;
          intervalTimerState.secLeft = 0;
          intervalTimerState.phaseEndTimestamp = null;
          if (intervalTimerState.timerId) {
            clearInterval(intervalTimerState.timerId);
            intervalTimerState.timerId = null;
          }
          releaseIntervalWakeLock();
          stopIntervalAudioKeepAlive();
          playIntervalSound('workout_completed', cfg.sound);
          updateIntervalTimerUI();
          return;
        } else {
          intervalTimerState.phase = 'rest';
          intervalTimerState.phaseTotalSec = cfg.restSec;
          intervalTimerState.phaseEndTimestamp += cfg.restSec * 1000;
          playIntervalSound('rest_start', cfg.sound);
        }
      } else if (intervalTimerState.phase === 'rest') {
        intervalTimerState.currentRound++;
        intervalTimerState.phase = 'work';
        intervalTimerState.phaseTotalSec = cfg.workSec;
        intervalTimerState.phaseEndTimestamp += cfg.workSec * 1000;
        playIntervalSound('work_start', cfg.sound);
      }
    }

    if (intervalTimerState.running && intervalTimerState.phaseEndTimestamp) {
      intervalTimerState.secLeft = Math.max(0, Math.ceil((intervalTimerState.phaseEndTimestamp - Date.now()) / 1000));
      updateIntervalTimerUI();
    }
  }

  // Auto-reactivate WakeLock and catch up time on tab focus or screen unlock
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (intervalTimerState.running) {
        acquireIntervalWakeLock();
        catchUpIntervalTimer();
      }
    }
  });

  function pauseIntervalTimer() {
    intervalTimerState.running = false;
    if (intervalTimerState.timerId) {
      clearInterval(intervalTimerState.timerId);
      intervalTimerState.timerId = null;
    }
    intervalTimerState.phaseEndTimestamp = null;
    releaseIntervalWakeLock();
    stopIntervalAudioKeepAlive();
    updateIntervalTimerUI();
  }

  function toggleIntervalTimer() {
    playUiTick(750);
    if (intervalTimerState.running) {
      pauseIntervalTimer();
    } else {
      startIntervalTimer();
    }
  }

  function skipIntervalPhase() {
    playUiTick(820);
    ensureAudioContext();
    if (intervalTimerState.phase === 'idle') {
      startIntervalTimer();
      return;
    }
    handleIntervalPhaseTransition();
  }

  function resetIntervalTimer() {
    playUiTick(620);
    const cfg = getIntervalConfig();
    intervalTimerState.running = false;
    if (intervalTimerState.timerId) {
      clearInterval(intervalTimerState.timerId);
      intervalTimerState.timerId = null;
    }
    intervalTimerState.phase = 'idle';
    intervalTimerState.currentRound = 1;
    intervalTimerState.secLeft = cfg.workSec;
    intervalTimerState.phaseTotalSec = cfg.workSec;
    intervalTimerState.phaseEndTimestamp = null;
    intervalTimerState.lastWarningSec = null;
    releaseIntervalWakeLock();
    stopIntervalAudioKeepAlive();
    updateIntervalTimerUI();
    showActionToast('🔄 Timer intervalli azzerato');
  }

  function applyIntervalPreset(workSec, restSec, rounds) {
    playUiTick(780);
    const cfg = getIntervalConfig();
    cfg.workSec = workSec;
    cfg.restSec = restSec;
    cfg.rounds = rounds;
    saveExtraState();
    resetIntervalTimer();
    showActionToast(`⚡ Preset impostato: ${formatMMSS(workSec)} / ${formatMMSS(restSec)} (${rounds} round)`);
  }

  // Interval Timer Event Listeners
  const btnQuickOpenInterval = document.getElementById('btn-quick-open-interval-timer');
  if (btnQuickOpenInterval) {
    btnQuickOpenInterval.addEventListener('click', () => {
      playUiTick(720);
      activateTab('gym');
      activateSegment('gym', 'gym-interval');
      document.getElementById('interval-timer-card')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  document.getElementById('btn-interval-toggle')?.addEventListener('click', toggleIntervalTimer);
  document.getElementById('btn-interval-skip')?.addEventListener('click', skipIntervalPhase);
  document.getElementById('btn-interval-reset')?.addEventListener('click', resetIntervalTimer);

  const intervalConfigDialog = document.getElementById('interval-config-dialog');
  const btnOpenIntervalCfg = document.getElementById('btn-open-interval-config');
  const btnCancelIntervalCfg = document.getElementById('btn-cancel-interval-cfg');
  const intervalCfgForm = document.getElementById('interval-config-form');
  const btnTestIntervalSound = document.getElementById('btn-test-interval-sound');

  if (btnOpenIntervalCfg && intervalConfigDialog) {
    btnOpenIntervalCfg.addEventListener('click', () => {
      playUiTick(650);
      const cfg = getIntervalConfig();
      const workMin = Math.floor(cfg.workSec / 60);
      const workSec = cfg.workSec % 60;
      const restMin = Math.floor(cfg.restSec / 60);
      const restSec = cfg.restSec % 60;

      const wMinInp = document.getElementById('cfg-work-min');
      const wSecInp = document.getElementById('cfg-work-sec');
      const rMinInp = document.getElementById('cfg-rest-min');
      const rSecInp = document.getElementById('cfg-rest-sec');
      const rndInp = document.getElementById('cfg-rounds-count');
      const prepInp = document.getElementById('cfg-prep-sec');
      const soundInp = document.getElementById('cfg-sound-select');

      if (wMinInp) wMinInp.value = workMin;
      if (wSecInp) wSecInp.value = workSec;
      if (rMinInp) rMinInp.value = restMin;
      if (rSecInp) rSecInp.value = restSec;
      if (rndInp) rndInp.value = cfg.rounds;
      if (prepInp) prepInp.value = String(cfg.prepSec);
      if (soundInp) soundInp.value = cfg.sound;

      intervalConfigDialog.showModal();
    });
  }

  if (btnCancelIntervalCfg && intervalConfigDialog) {
    btnCancelIntervalCfg.addEventListener('click', () => {
      intervalConfigDialog.close();
    });
  }

  if (btnTestIntervalSound) {
    btnTestIntervalSound.addEventListener('click', () => {
      const soundChoice = document.getElementById('cfg-sound-select')?.value || 'boxing_bell';
      playIntervalSound('work_start', soundChoice);
    });
  }

  if (intervalCfgForm && intervalConfigDialog) {
    intervalCfgForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const wMin = parseInt(document.getElementById('cfg-work-min')?.value, 10) || 0;
      const wSec = parseInt(document.getElementById('cfg-work-sec')?.value, 10) || 0;
      const rMin = parseInt(document.getElementById('cfg-rest-min')?.value, 10) || 0;
      const rSec = parseInt(document.getElementById('cfg-rest-sec')?.value, 10) || 0;
      const rounds = parseInt(document.getElementById('cfg-rounds-count')?.value, 10) || 5;
      const prep = parseInt(document.getElementById('cfg-prep-sec')?.value, 10) || 0;
      const sound = document.getElementById('cfg-sound-select')?.value || 'boxing_bell';

      const totalWork = Math.max(5, (wMin * 60) + wSec);
      const totalRest = Math.max(0, (rMin * 60) + rSec);

      const cfg = getIntervalConfig();
      cfg.workSec = totalWork;
      cfg.restSec = totalRest;
      cfg.rounds = Math.max(1, rounds);
      cfg.prepSec = prep;
      cfg.sound = sound;

      saveExtraState();
      resetIntervalTimer();
      intervalConfigDialog.close();
      playIntervalSound('work_start', sound);
      showActionToast(`⚙️ Timer configurato: ${formatMMSS(totalWork)} lavoro · ${formatMMSS(totalRest)} riposo · ${rounds} round`);
    });
  }

  document.querySelectorAll('.preset-chip[data-preset-work]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const w = parseInt(chip.dataset.presetWork, 10) || 120;
      const r = parseInt(chip.dataset.presetRest, 10) || 30;
      const rnd = parseInt(chip.dataset.presetRounds, 10) || 5;
      applyIntervalPreset(w, r, rnd);
    });
  });

  // ==========================================================================
  // 3. DEEP WORK POMODORO FOCUS TIMER
  // ==========================================================================
  function updateFocusClockUI() {
    const disp = document.getElementById('focus-clock-display');
    const tot = document.getElementById('focus-total-today');
    if (!disp) return;
    const mm = String(Math.floor(focusSecLeft / 60)).padStart(2, '0');
    const ss = String(focusSecLeft % 60).padStart(2, '0');
    disp.textContent = `${mm}:${ss}`;
    if (tot) tot.textContent = `${extraState.focusMinutesToday || 0} min`;
  }

  const btnToggleFocus = document.getElementById('btn-toggle-focus');
  if (btnToggleFocus) {
    btnToggleFocus.addEventListener('click', () => {
      playUiTick(740);
      if (focusRunning) {
        clearInterval(focusTimer);
        focusRunning = false;
        btnToggleFocus.textContent = '▶ Riprendi Focus';
      } else {
        focusRunning = true;
        btnToggleFocus.textContent = '⏸ Pausa Focus';
        focusTimer = setInterval(() => {
          focusSecLeft--;
          updateFocusClockUI();
          if (focusSecLeft <= 0) {
            clearInterval(focusTimer);
            focusRunning = false;
            btnToggleFocus.textContent = '▶ Avvia Focus';
            extraState.focusMinutesToday = (extraState.focusMinutesToday || 0) + 25;
            saveExtraState();
            updateFocusClockUI();
            renderHeaderAndKpis(currentState);
            playAlarmChime('cascade');
            showActionToast('⚡ Sessione Focus completata!');
          }
        }, 1000);
      }
    });
  }

  document.querySelectorAll('[data-focus-min]').forEach((btn) => {
    btn.addEventListener('click', () => {
      playUiTick(660);
      if (focusTimer) clearInterval(focusTimer);
      focusRunning = false;
      focusSecLeft = Number(btn.dataset.focusMin) * 60;
      document.getElementById('btn-toggle-focus').textContent = '▶ Avvia Focus';
      updateFocusClockUI();
    });
  });

  document.getElementById('btn-focus-ambient')?.addEventListener('click', toggleAmbientFocusSound);

  // ==========================================================================
  // 4. QUICK EXPENSES, CATEGORY BREAKDOWN & DAILY BUDGET
  // ==========================================================================
  function renderExpenses() {
    const listEl = document.getElementById('expenses-list');
    const catBreakdownEl = document.getElementById('exp-cat-breakdown');
    if (!listEl) return;
    listEl.replaceChildren();
    if (catBreakdownEl) catBreakdownEl.replaceChildren();

    const todayStr = new Date().toISOString().split('T')[0];
    let todaySum = 0;
    let totalSum = 0;
    const catTotals = {};

    (extraState.expenses || []).forEach((exp) => {
      const amt = Number(exp.amount) || 0;
      totalSum += amt;
      if (exp.date === todayStr) todaySum += amt;
      const cat = exp.category || 'Altro';
      catTotals[cat] = (catTotals[cat] || 0) + amt;

      const li = document.createElement('li');
      li.className = 'list-row';

      const left = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = `${exp.title} — €${amt.toFixed(2)}`;
      const sub = document.createElement('p');
      sub.className = 'habit-meta-sub';
      sub.textContent = `${exp.category} · ${exp.date}`;
      left.appendChild(title);
      left.appendChild(sub);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-danger-ghost btn-xs';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => {
        extraState.expenses = extraState.expenses.filter((x) => x.id !== exp.id);
        saveExtraState();
        renderExpenses();
        renderHeaderAndKpis(currentState);
      });

      li.appendChild(left);
      li.appendChild(delBtn);
      listEl.appendChild(li);
    });

    const dailyBudget = Number(extraState.dailyBudgetEuro) || 50;
    const remaining = dailyBudget - todaySum;

    const budgetLbl = document.getElementById('daily-budget-label');
    if (budgetLbl) budgetLbl.textContent = String(dailyBudget);

    document.getElementById('exp-stat-today').textContent = `€${todaySum.toFixed(2)}`;
    const remEl = document.getElementById('exp-stat-remaining');
    if (remEl) {
      remEl.textContent = `${remaining >= 0 ? '€' : '-€'}${Math.abs(remaining).toFixed(2)}`;
      remEl.className = remaining >= 0 ? 'text-emerald' : 'text-danger';
    }
    document.getElementById('exp-stat-month').textContent = `€${totalSum.toFixed(2)}`;

    if (catBreakdownEl) {
      Object.entries(catTotals).forEach(([cat, val]) => {
        const pill = document.createElement('span');
        pill.className = 'cat-stat-pill';
        pill.textContent = `${cat}: €${val.toFixed(2)}`;
        catBreakdownEl.appendChild(pill);
      });
    }
  }

  document.getElementById('btn-set-daily-budget')?.addEventListener('click', () => {
    const steps = [30, 50, 75, 100, 150];
    const current = Number(extraState.dailyBudgetEuro) || 50;
    const next = steps[(steps.indexOf(current) + 1) % steps.length];
    extraState.dailyBudgetEuro = next;
    saveExtraState();
    renderExpenses();
    renderHeaderAndKpis(currentState);
    showActionToast(`💶 Budget impostato a €${next}/giorno`);
  });

  document.getElementById('add-expense-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const title = document.getElementById('exp-title').value.trim();
    const category = document.getElementById('exp-category').value;
    if (title && !isNaN(amount)) {
      extraState.expenses.unshift({
        id: `exp-${Date.now()}`,
        title,
        amount,
        category,
        date: new Date().toISOString().split('T')[0]
      });
      saveExtraState();
      renderExpenses();
      renderHeaderAndKpis(currentState);
      document.getElementById('exp-amount').value = '';
      document.getElementById('exp-title').value = '';
      universalSheet?.close();
      activateTab('finance');
      showActionToast(`💶 Spesa registrata: €${amount.toFixed(2)}`);
    }
  });

  // ==========================================================================
  // 5. HABITS (THUMB CHECKLIST FOR TODAY + 7-DAY MATRIX), ALARMS, TASKS & GOALS
  // ==========================================================================
  function renderHabits(habits) {
    const todayChecklist = document.getElementById('today-habits-checklist');
    const matrixContainer = document.getElementById('habit-matrix-container');
    const scheduleEditor = document.getElementById('habit-schedule-editor');
    if (todayChecklist) todayChecklist.replaceChildren();
    matrixContainer.replaceChildren();
    scheduleEditor.replaceChildren();

    const weekDates = getWeekDates();
    const todayStr = getLocalDateStr();
    const todayIdx = (new Date().getDay() + 6) % 7;
    const todayCode = DAY_CODES[todayIdx];

    // 1. Render Thumb-Friendly Today Checklist
    if (todayChecklist) {
      (habits || []).forEach((habit) => {
        const isScheduledToday = (habit.schedule || []).includes(todayCode);
        const currentSt = getHabitDayState(habit, todayStr, todayCode);
        const isDoneToday = currentSt === 'done';
        const item = document.createElement('div');
        item.className = 'thumb-habit-item';
        item.dataset.done = String(isDoneToday);
        if (!isScheduledToday) {
          item.style.opacity = '0.78';
        }

        const left = document.createElement('div');
        left.style.flex = '1';
        left.style.cursor = 'pointer';
        const t = document.createElement('strong');
        t.textContent = habit.name;
        const sub = document.createElement('p');
        sub.className = 'habit-meta-sub';
        if (!isScheduledToday) {
          sub.innerHTML = `${habit.category} · <span style="color: var(--pm-text-2);">🌴 Riposo Oggi (Prevista: ${habit.schedule.join(', ')})</span>`;
        } else {
          sub.innerHTML = `${habit.category} · 🔥 Serie: ${habit.streak || 0}g · <span style="color: var(--pm-gold-bright); font-weight:700;">🎯 Prevista Oggi</span>`;
        }
        left.appendChild(t);
        left.appendChild(sub);

        left.addEventListener('click', () => {
          playUiTick(isDoneToday ? 520 : 840);
          const nextState = isDoneToday ? 'pending' : 'done';
          extraState.habitHistoryOverrides = extraState.habitHistoryOverrides || {};
          extraState.habitHistoryOverrides[habit.id] = extraState.habitHistoryOverrides[habit.id] || {};
          extraState.habitHistoryOverrides[habit.id][todayStr] = nextState;
          if (habit.history) habit.history[todayStr] = nextState;
          saveExtraState();
          renderAll(currentState);
          mutateState('CYCLE_HABIT_CELL', { habitId: habit.id, date: todayStr });
        });

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn-ghost btn-xs';
        editBtn.style.padding = '4px 8px';
        editBtn.style.marginRight = '8px';
        editBtn.style.fontSize = '13px';
        editBtn.textContent = '✎';
        editBtn.title = 'Personalizza o elimina abitudine';
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          playUiTick(650);
          openEditHabitModal(habit);
        });

        const checkCircle = document.createElement('button');
        checkCircle.type = 'button';
        checkCircle.className = 'thumb-check-circle';
        checkCircle.textContent = '✓';
        checkCircle.addEventListener('click', () => {
          playUiTick(isDoneToday ? 520 : 840);
          const nextState = isDoneToday ? 'pending' : 'done';
          extraState.habitHistoryOverrides = extraState.habitHistoryOverrides || {};
          extraState.habitHistoryOverrides[habit.id] = extraState.habitHistoryOverrides[habit.id] || {};
          extraState.habitHistoryOverrides[habit.id][todayStr] = nextState;
          if (habit.history) habit.history[todayStr] = nextState;
          saveExtraState();
          renderAll(currentState);
          mutateState('CYCLE_HABIT_CELL', { habitId: habit.id, date: todayStr });
        });

        item.appendChild(left);
        item.appendChild(editBtn);
        item.appendChild(checkCircle);

        todayChecklist.appendChild(item);
      });
    }

    // 2. Render 7-Day Matrix
    const headerRow = document.createElement('div');
    headerRow.className = 'habit-row';
    headerRow.setAttribute('role', 'row');

    const firstCol = document.createElement('div');
    firstCol.className = 'habit-col-head';
    firstCol.style.textAlign = 'left';
    firstCol.textContent = 'Abitudine';
    headerRow.appendChild(firstCol);

    DAY_LABELS_IT.forEach((label, idx) => {
      const col = document.createElement('div');
      col.className = 'habit-col-head';
      col.setAttribute('role', 'columnheader');
      const isTodayCol = weekDates[idx] === todayStr;
      col.textContent = isTodayCol ? `${label} (Oggi)` : label;
      if (isTodayCol) {
        col.style.color = 'var(--pm-gold-bright)';
        col.style.fontWeight = '800';
        col.style.textShadow = '0 0 6px rgba(250, 232, 162, 0.4)';
      }
      headerRow.appendChild(col);
    });
    matrixContainer.appendChild(headerRow);

    let weekScheduledTotal = 0;
    let weekDoneTotal = 0;

    (habits || []).forEach((habit) => {
      const row = document.createElement('div');
      row.className = 'habit-row';
      row.setAttribute('role', 'row');

      const nameCell = document.createElement('div');
      nameCell.className = 'habit-name-cell';
      nameCell.setAttribute('role', 'rowheader');

      const titleSpan = document.createElement('span');
      titleSpan.textContent = habit.name;
      const metaSpan = document.createElement('span');
      metaSpan.className = 'habit-meta-sub';
      metaSpan.textContent = `🔥 ${habit.streak || 0}g`;

      nameCell.appendChild(titleSpan);
      nameCell.appendChild(metaSpan);
      row.appendChild(nameCell);

      weekDates.forEach((dateStr, dayIdx) => {
        const dayCode = DAY_CODES[dayIdx];
        const isScheduled = habit.schedule.includes(dayCode);
        const cellState = getHabitDayState(habit, dateStr, dayCode);

        if (isScheduled) weekScheduledTotal++;
        if (cellState === 'done') weekDoneTotal++;

        const cellWrap = document.createElement('div');
        cellWrap.className = 'habit-day-cell';
        cellWrap.setAttribute('role', 'cell');
        if (dateStr === todayStr) {
          cellWrap.style.background = 'rgba(223, 177, 91, 0.08)';
          cellWrap.style.borderRadius = 'var(--radius-xs)';
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cell-btn';
        btn.dataset.state = cellState;
        btn.addEventListener('click', () => {
          playUiTick(720);
          const order = ['pending', 'done', 'missed', 'unscheduled'];
          const next = order[(order.indexOf(cellState) + 1) % order.length];
          extraState.habitHistoryOverrides = extraState.habitHistoryOverrides || {};
          extraState.habitHistoryOverrides[habit.id] = extraState.habitHistoryOverrides[habit.id] || {};
          extraState.habitHistoryOverrides[habit.id][dateStr] = next;
          if (habit.history) habit.history[dateStr] = next;
          saveExtraState();
          renderAll(currentState);
          mutateState('CYCLE_HABIT_CELL', { habitId: habit.id, date: dateStr });
        });

        cellWrap.appendChild(btn);
        row.appendChild(cellWrap);
      });

      matrixContainer.appendChild(row);

      // Schedule Editor Row
      const schedRow = document.createElement('div');
      schedRow.className = 'schedule-edit-row';

      const schedInfo = document.createElement('div');
      const schedTitle = document.createElement('strong');
      schedTitle.textContent = habit.name;
      schedInfo.appendChild(schedTitle);

      const rightControls = document.createElement('div');
      rightControls.style.display = 'flex';
      rightControls.style.alignItems = 'center';
      rightControls.style.gap = '8px';

      const pillsGroup = document.createElement('div');
      pillsGroup.className = 'day-pills-group';

      DAY_CODES.forEach((code, idx) => {
        const pBtn = document.createElement('button');
        pBtn.type = 'button';
        pBtn.className = 'day-pill-btn';
        const active = habit.schedule.includes(code);
        pBtn.dataset.active = String(active);
        pBtn.textContent = DAY_SHORT_IT[idx];
        pBtn.addEventListener('click', () => {
          playUiTick(680);
          mutateState('UPDATE_HABIT_SCHEDULE', { habitId: habit.id, dayCode: code });
        });
        pillsGroup.appendChild(pBtn);
      });

      const editHabitBtn = document.createElement('button');
      editHabitBtn.type = 'button';
      editHabitBtn.className = 'btn-ghost btn-xs';
      editHabitBtn.textContent = '✎';
      editHabitBtn.title = 'Modifica';
      editHabitBtn.addEventListener('click', () => openEditHabitModal(habit));

      const delHabitBtn = document.createElement('button');
      delHabitBtn.type = 'button';
      delHabitBtn.className = 'btn-danger-ghost btn-xs';
      delHabitBtn.textContent = '✕';
      delHabitBtn.title = 'Elimina';
      delHabitBtn.addEventListener('click', () => {
        if (!confirm(`Eliminare l'abitudine "${habit.name}"?`)) return;
        mutateState('DELETE_HABIT', { id: habit.id });
      });

      rightControls.appendChild(pillsGroup);
      rightControls.appendChild(editHabitBtn);
      rightControls.appendChild(delHabitBtn);

      schedRow.appendChild(schedInfo);
      schedRow.appendChild(rightControls);
      scheduleEditor.appendChild(schedRow);
    });

    // 3. Render Dedicated Habit Management List (seg-today-manage)
    const manageList = document.getElementById('habits-management-list');
    if (manageList) {
      manageList.replaceChildren();
      (habits || []).forEach((habit) => {
        const mCard = document.createElement('div');
        mCard.className = 'habit-manage-card';

        const top = document.createElement('div');
        top.className = 'habit-manage-top';

        const titleWrap = document.createElement('div');
        const t = document.createElement('strong');
        t.textContent = habit.name;
        const cat = document.createElement('span');
        cat.className = 'habit-meta-sub';
        cat.textContent = `${habit.category} · 🔥 Serie: ${habit.streak || 0}g`;
        titleWrap.appendChild(t);
        titleWrap.appendChild(cat);

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '6px';
        actions.style.alignItems = 'center';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn-secondary btn-xs';
        editBtn.textContent = '✎ Modifica';
        editBtn.addEventListener('click', () => {
          playUiTick(650);
          openEditHabitModal(habit);
        });

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'btn-danger-ghost btn-xs';
        delBtn.textContent = '✕';
        delBtn.title = 'Elimina';
        delBtn.addEventListener('click', () => {
          if (!confirm(`Sei sicuro di voler eliminare l'abitudine "${habit.name}"?`)) return;
          mutateState('DELETE_HABIT', { id: habit.id });
          showActionToast(`🗑️ Abitudine eliminata`);
        });

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        top.appendChild(titleWrap);
        top.appendChild(actions);

        // Day pills
        const pillsGroup = document.createElement('div');
        pillsGroup.className = 'day-pills-group';
        DAY_CODES.forEach((code, idx) => {
          const pBtn = document.createElement('button');
          pBtn.type = 'button';
          pBtn.className = 'day-pill-btn';
          const active = habit.schedule.includes(code);
          pBtn.dataset.active = String(active);
          pBtn.textContent = DAY_SHORT_IT[idx];
          pBtn.addEventListener('click', () => {
            playUiTick(680);
            mutateState('UPDATE_HABIT_SCHEDULE', { habitId: habit.id, dayCode: code });
          });
          pillsGroup.appendChild(pBtn);
        });

        mCard.appendChild(top);
        mCard.appendChild(pillsGroup);
        manageList.appendChild(mCard);
      });
    }

    const pct = weekScheduledTotal > 0 ? Math.min(100, Math.round((weekDoneTotal / weekScheduledTotal) * 100)) : 0;
    document.getElementById('tally-week-done').textContent = String(weekDoneTotal);
    document.getElementById('tally-week-total').textContent = String(weekScheduledTotal);
    document.getElementById('meter-week').style.setProperty('--progress-w', `${pct}%`);
    document.getElementById('metric-week-pct').textContent = `${pct}%`;
  }

  document.getElementById('btn-complete-all-today')?.addEventListener('click', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    playUiTick(860);
    extraState.habitHistoryOverrides = extraState.habitHistoryOverrides || {};
    (currentState?.habits || []).forEach((h) => {
      extraState.habitHistoryOverrides[h.id] = extraState.habitHistoryOverrides[h.id] || {};
      extraState.habitHistoryOverrides[h.id][todayStr] = 'done';
      if (h.history) h.history[todayStr] = 'done';
      mutateState('CYCLE_HABIT_CELL', { habitId: h.id, date: todayStr });
    });
    saveExtraState();
    renderAll(currentState);
    showActionToast('🔥 Abitudini di oggi completate!');
  });

  function renderAlarmsAndReminders(alarms, reminders) {
    const alarmsGrid = document.getElementById('alarms-grid');
    const remindersList = document.getElementById('reminders-list');
    alarmsGrid.replaceChildren();
    remindersList.replaceChildren();

    const activeCount = (alarms || []).filter((a) => a.enabled).length;
    document.getElementById('tab-alarms-count').textContent = String(activeCount);
    document.getElementById('alarms-total-label').textContent = String((alarms || []).length);

    (alarms || []).forEach((alarm) => {
      const card = document.createElement('div');
      card.className = 'alarm-card';
      card.dataset.enabled = String(alarm.enabled);

      const top = document.createElement('div');
      top.className = 'alarm-card-top';

      const timeEl = document.createElement('span');
      timeEl.className = 'alarm-time-display';
      timeEl.textContent = alarm.time;

      const editAlarmBtn = document.createElement('button');
      editAlarmBtn.type = 'button';
      editAlarmBtn.className = 'btn-ghost btn-xs';
      editAlarmBtn.textContent = '✎';
      editAlarmBtn.title = 'Personalizza sveglia';
      editAlarmBtn.addEventListener('click', () => {
        playUiTick(650);
        openEditAlarmModal(alarm);
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-danger-ghost btn-xs';
      delBtn.textContent = '✕';
      delBtn.title = 'Elimina sveglia';
      delBtn.addEventListener('click', () => {
        if (!confirm(`Eliminare la sveglia "${alarm.label}" delle ${alarm.time}?`)) return;
        mutateState('DELETE_ALARM', { id: alarm.id });
        showActionToast(`🗑️ Sveglia eliminata`);
      });

      const topBtns = document.createElement('div');
      topBtns.style.display = 'flex';
      topBtns.style.gap = '6px';
      topBtns.style.alignItems = 'center';
      topBtns.appendChild(editAlarmBtn);
      topBtns.appendChild(delBtn);

      top.appendChild(timeEl);
      top.appendChild(topBtns);

      const labelEl = document.createElement('p');
      labelEl.className = 'alarm-label-text';
      labelEl.textContent = alarm.label;

      const actions = document.createElement('div');
      actions.className = 'alarm-card-actions';

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'btn-ghost btn-xs';
      toggleBtn.textContent = alarm.enabled ? '✓ ON' : 'OFF';
      toggleBtn.addEventListener('click', () => {
        playUiTick(650);
        mutateState('TOGGLE_ALARM', { id: alarm.id });
      });

      actions.appendChild(toggleBtn);

      card.appendChild(top);
      card.appendChild(labelEl);
      card.appendChild(actions);
      alarmsGrid.appendChild(card);
    });

    (reminders || []).forEach((rem) => {
      const li = document.createElement('li');
      li.className = 'list-row';

      const left = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = rem.title;
      if (rem.completed) title.style.textDecoration = 'line-through';
      const meta = document.createElement('p');
      meta.className = 'habit-meta-sub';
      meta.textContent = `Ore ${rem.dueTime}`;
      left.appendChild(title);
      left.appendChild(meta);

      const right = document.createElement('div');
      right.style.display = 'flex';
      right.style.gap = '6px';

      const checkBtn = document.createElement('button');
      checkBtn.type = 'button';
      checkBtn.className = 'btn-ghost btn-xs';
      checkBtn.textContent = rem.completed ? '✓' : 'Fatto';
      checkBtn.addEventListener('click', () => {
        playUiTick(760);
        mutateState('TOGGLE_REMINDER', { id: rem.id });
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-danger-ghost btn-xs';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => mutateState('DELETE_REMINDER', { id: rem.id }));

      right.appendChild(checkBtn);
      right.appendChild(delBtn);
      li.appendChild(left);
      li.appendChild(right);
      remindersList.appendChild(li);
    });
  }

  document.getElementById('btn-enable-all-alarms')?.addEventListener('click', () => {
    (currentState?.alarms || []).forEach((a) => {
      if (!a.enabled) mutateState('TOGGLE_ALARM', { id: a.id });
    });
    showActionToast('Tutte le sveglie attivate');
  });

  function renderPlanner(events, tasks) {
    const timelineEl = document.getElementById('events-timeline');
    const tasksEl = document.getElementById('tasks-list');
    timelineEl.replaceChildren();
    tasksEl.replaceChildren();

    (events || []).forEach((evt) => {
      const li = document.createElement('li');
      li.className = 'timeline-item';

      const timeSpan = document.createElement('span');
      timeSpan.className = 'timeline-time';
      timeSpan.textContent = `${evt.startTime}–${evt.endTime}`;

      const info = document.createElement('div');
      info.style.flex = '1';
      const title = document.createElement('strong');
      title.textContent = evt.title;
      info.appendChild(title);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-danger-ghost btn-xs';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => mutateState('DELETE_EVENT', { id: evt.id }));

      li.appendChild(timeSpan);
      li.appendChild(info);
      li.appendChild(delBtn);
      timelineEl.appendChild(li);
    });

    const filteredTasks = (tasks || []).filter((t) => {
      if (currentTaskFilter === 'todo') return t.status !== 'done';
      if (currentTaskFilter === 'done') return t.status === 'done';
      return true;
    });

    filteredTasks.forEach((tsk) => {
      const li = document.createElement('li');
      li.className = 'list-row';

      const left = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = tsk.title;
      if (tsk.status === 'done') title.style.textDecoration = 'line-through';
      const sub = document.createElement('p');
      sub.className = 'habit-meta-sub';
      const prioLabel = tsk.priority === 'high' ? '🔥 Alta' : tsk.priority === 'low' ? '🌱 Bassa' : '⚡ Media';
      sub.textContent = `Priorità ${prioLabel}`;
      left.appendChild(title);
      left.appendChild(sub);

      const right = document.createElement('div');
      right.style.display = 'flex';
      right.style.gap = '6px';

      const focusBtn = document.createElement('button');
      focusBtn.type = 'button';
      focusBtn.className = 'btn-secondary btn-xs';
      focusBtn.textContent = '⏱ Focus';
      focusBtn.addEventListener('click', () => {
        document.getElementById('focus-active-task-label').textContent = `Focus su: ${tsk.title}`;
        activateTab('alarms');
        activateSegment('alarms', 'alarms-focus');
        if (!focusRunning) document.getElementById('btn-toggle-focus').click();
      });

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-ghost btn-xs';
      btn.textContent = tsk.status === 'done' ? '✓' : 'Fatto';
      btn.addEventListener('click', () => {
        playUiTick(780);
        mutateState('TOGGLE_TASK', { id: tsk.id });
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-danger-ghost btn-xs';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => mutateState('DELETE_TASK', { id: tsk.id }));

      right.appendChild(focusBtn);
      right.appendChild(btn);
      right.appendChild(delBtn);
      li.appendChild(left);
      li.appendChild(right);
      tasksEl.appendChild(li);
    });
  }

  document.querySelectorAll('[data-task-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentTaskFilter = btn.dataset.taskFilter;
      document.querySelectorAll('[data-task-filter]').forEach((b) => {
        b.classList.toggle('active', b === btn);
      });
      if (currentState) renderPlanner(currentState.events, currentState.tasks);
    });
  });

  function renderGoals(goals) {
    const goalsList = document.getElementById('goals-list');
    goalsList.replaceChildren();

    (goals || []).forEach((g) => {
      const box = document.createElement('div');
      box.className = 'goal-box';

      const head = document.createElement('div');
      head.className = 'goal-head';
      const title = document.createElement('strong');
      title.textContent = `${g.title} (${g.category})`;

      const right = document.createElement('div');
      right.style.display = 'flex';
      right.style.alignItems = 'center';
      right.style.gap = '5px';

      const minusPct = document.createElement('button');
      minusPct.type = 'button';
      minusPct.className = 'btn-ghost btn-xs';
      minusPct.textContent = '−10%';
      minusPct.addEventListener('click', () => {
        playUiTick(520);
        mutateState('UPDATE_GOAL_PROGRESS', { id: g.id, progress: Math.max(0, (g.progress || 0) - 10) });
      });

      const plusPct = document.createElement('button');
      plusPct.type = 'button';
      plusPct.className = 'btn-secondary btn-xs';
      plusPct.textContent = `${g.progress}% (+10%)`;
      plusPct.addEventListener('click', () => {
        playUiTick(800);
        mutateState('UPDATE_GOAL_PROGRESS', { id: g.id, progress: Math.min(100, (g.progress || 0) + 10) });
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-danger-ghost btn-xs';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => mutateState('DELETE_GOAL', { id: g.id }));

      right.appendChild(minusPct);
      right.appendChild(plusPct);
      right.appendChild(delBtn);
      head.appendChild(title);
      head.appendChild(right);

      const meter = document.createElement('div');
      meter.className = 'meter-track';
      const fill = document.createElement('span');
      fill.className = 'meter-fill';
      fill.style.setProperty('--progress-w', `${g.progress}%`);
      if (g.progress >= 100) fill.style.background = 'var(--ob-emerald)';
      meter.appendChild(fill);

      box.appendChild(head);
      box.appendChild(meter);

      if (Array.isArray(g.milestones) && g.milestones.length > 0) {
        const msList = document.createElement('div');
        msList.className = 'milestones-list';
        g.milestones.forEach((m) => {
          const isDone = extraState.milestoneOverrides?.[m.id] !== undefined
            ? extraState.milestoneOverrides[m.id]
            : Boolean(m.done);
          const mBtn = document.createElement('button');
          mBtn.type = 'button';
          mBtn.className = 'milestone-btn';
          mBtn.dataset.done = String(isDone);
          mBtn.textContent = `${isDone ? '✓' : '○'} ${m.title}`;
          mBtn.addEventListener('click', () => {
            playUiTick(750);
            extraState.milestoneOverrides = extraState.milestoneOverrides || {};
            extraState.milestoneOverrides[m.id] = !isDone;
            saveExtraState();
            renderGoals(currentState.goals);
          });
          msList.appendChild(mBtn);
        });
        box.appendChild(msList);
      }

      goalsList.appendChild(box);
    });
  }

  function renderAll(state) {
    if (!state) return;
    currentState = state;
    saveOfflineState(state);
    ensureTodayGymExercises();
    checkAutoWeeklyRollover();

    renderHeaderAndKpis(state);
    renderSmokingHeroAndTrackers(state.trackers);
    renderHabits(state.habits);
    render52WeekReport(state);
    renderGymModule();
    updateFocusClockUI();
    renderAlarmsAndReminders(state.alarms, state.reminders);
    renderPlanner(state.events, state.tasks);
    renderExpenses();
    renderGoals(state.goals);

    const lanBase = `http://${lanIp}:${serverPort}`;
    const publicBase = remoteUrl || lanBase;

    const lanEl = document.getElementById('ios-lan-url');
    if (lanEl) lanEl.textContent = lanBase;
    document.getElementById('ios-remote-url').textContent = remoteUrl || window.location.origin;
    document.getElementById('modal-remote-url').textContent = publicBase;
  }

  // API & Instant Action Bar
  async function submitCommand(text, sourceDevice = 'Action Bar') {
    if (!text) return;
    ensureAudioContext();
    commandInput.value = '';
    if (cmdDrawer) {
      cmdDrawer.hidden = true;
      btnToggleCmdDrawer?.setAttribute('aria-expanded', 'false');
    }

    const lower = text.toLowerCase();

    // Instant Voice/Text commands for adding or removing cigarettes
    if ((lower.includes('togli') || lower.includes('meno') || lower.includes('-1') || lower.includes('rimuovi')) && lower.includes('sigarett')) {
      adjustTrackerCount('smoke', -1);
      return;
    }
    if ((lower.includes('ho fumato') || lower.includes('+1') || lower.includes('aggiungi') || lower.includes('segna')) && lower.includes('sigarett')) {
      adjustTrackerCount('smoke', 1);
      return;
    }
    if (lower.includes('azzera settimana') || lower.includes('nuova settimana')) {
      archiveAndResetCurrentWeek(false);
      return;
    }

    const expMatch = text.match(/(?:spesa|speso|pagato)\s+(\d+(?:[.,]\d+)?)\s*(?:euro|€)?\s*(.*)/i);
    if (expMatch) {
      const amt = parseFloat(expMatch[1].replace(',', '.'));
      const desc = expMatch[2].trim() || 'Spesa rapida';
      extraState.expenses.unshift({
        id: `exp-${Date.now()}`,
        title: desc.charAt(0).toUpperCase() + desc.slice(1),
        amount: amt,
        category: 'Altro',
        date: new Date().toISOString().split('T')[0]
      });
      saveExtraState();
      renderExpenses();
      renderHeaderAndKpis(currentState);
      activateTab('finance');
      showActionToast(`💶 Spesa: €${amt.toFixed(2)} (${desc})`);
      return;
    }

    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text, sourceDevice, token: currentToken })
      });
      const data = await res.json();
      if (data.ok) {
        renderAll(data.state);
        showActionToast(data.summary || 'Eseguito!');
        if (data.targetTab) activateTab(data.targetTab);
      }
    } catch (err) {
      showActionToast('Salvato in locale');
    }
  }

  function applyOptimisticMutation(action, payload = {}) {
    if (!currentState) {
      currentState = loadOfflineState() || buildFallbackState();
    }
    const today = new Date().toISOString().split('T')[0];

    switch (action) {
      case 'ADD_TRACKER': {
        currentState.trackers = currentState.trackers || [];
        currentState.trackers.unshift({
          id: `trk-${Date.now()}`,
          name: payload.name || 'Nuovo Contatore',
          icon: payload.icon || '🔢',
          unit: payload.unit || 'unità',
          mode: payload.mode || 'limit',
          dailyTarget: Number(payload.dailyTarget) || 5,
          step: Number(payload.step) || 1,
          costPerUnit: Number(payload.costPerUnit) || 0,
          history: { [today]: 0 },
          logs: []
        });
        break;
      }
      case 'EDIT_TRACKER': {
        const trk = (currentState.trackers || []).find((t) => t.id === payload.id);
        if (trk) {
          if (payload.name) trk.name = payload.name;
          if (payload.icon) trk.icon = payload.icon;
          if (payload.unit) trk.unit = payload.unit;
          if (payload.mode) trk.mode = payload.mode;
          if (payload.dailyTarget !== undefined) trk.dailyTarget = Math.max(0, Number(payload.dailyTarget));
          if (payload.costPerUnit !== undefined) trk.costPerUnit = Math.max(0, Number(payload.costPerUnit));
        }
        break;
      }
      case 'DELETE_TRACKER': {
        currentState.trackers = (currentState.trackers || []).filter((t) => t.id !== payload.id);
        break;
      }
      case 'ADD_HABIT': {
        currentState.habits = currentState.habits || [];
        const sched = Array.isArray(payload.schedule) && payload.schedule.length
          ? payload.schedule
          : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        currentState.habits.push({
          id: `hab-${Date.now()}`,
          name: payload.name || 'Nuova Abitudine',
          category: payload.category || 'Personale',
          schedule: sched,
          targetPerWeek: sched.length,
          streak: 0,
          history: { [today]: 'pending' }
        });
        break;
      }
      case 'EDIT_HABIT': {
        const habit = (currentState.habits || []).find((h) => h.id === payload.id);
        if (habit) {
          if (payload.name) habit.name = payload.name;
          if (payload.category) habit.category = payload.category;
          if (Array.isArray(payload.schedule) && payload.schedule.length) {
            habit.schedule = payload.schedule;
            habit.targetPerWeek = payload.schedule.length;
          }
        }
        break;
      }
      case 'DELETE_HABIT': {
        currentState.habits = (currentState.habits || []).filter((h) => h.id !== payload.id);
        break;
      }
      case 'UPDATE_HABIT_SCHEDULE': {
        const habit = (currentState.habits || []).find((h) => h.id === payload.habitId);
        if (habit) {
          if (habit.schedule.includes(payload.dayCode)) {
            habit.schedule = habit.schedule.filter((d) => d !== payload.dayCode);
          } else {
            habit.schedule.push(payload.dayCode);
          }
          habit.targetPerWeek = habit.schedule.length;
        }
        break;
      }
      case 'ADD_SINGLE_ALARM': {
        currentState.alarms = currentState.alarms || [];
        currentState.alarms.push({
          id: `alm-${Date.now()}`,
          time: payload.time || '07:00',
          label: payload.label || 'Sveglia Manuale',
          enabled: true,
          repeat: Array.isArray(payload.repeat) && payload.repeat.length ? payload.repeat : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          group: 'Manuale',
          sound: payload.sound || 'cascade'
        });
        currentState.alarms.sort((a, b) => a.time.localeCompare(b.time));
        break;
      }
      case 'EDIT_ALARM': {
        const alarm = (currentState.alarms || []).find((a) => a.id === payload.id);
        if (alarm) {
          if (payload.time) alarm.time = payload.time;
          if (payload.label) alarm.label = payload.label;
          if (Array.isArray(payload.repeat) && payload.repeat.length) alarm.repeat = payload.repeat;
          if (payload.sound) alarm.sound = payload.sound;
        }
        currentState.alarms.sort((a, b) => a.time.localeCompare(b.time));
        break;
      }
      case 'TOGGLE_ALARM': {
        const alarm = (currentState.alarms || []).find((a) => a.id === payload.id);
        if (alarm) alarm.enabled = !alarm.enabled;
        break;
      }
      case 'DELETE_ALARM': {
        currentState.alarms = (currentState.alarms || []).filter((a) => a.id !== payload.id);
        break;
      }
      case 'CLEAR_ALL_ALARMS': {
        currentState.alarms = [];
        break;
      }
      case 'ADD_REMINDER': {
        currentState.reminders = currentState.reminders || [];
        currentState.reminders.unshift({
          id: `rem-${Date.now()}`,
          title: payload.title || 'Promemoria',
          dueTime: payload.dueTime || '12:00',
          completed: false,
          priority: 'high'
        });
        break;
      }
      case 'TOGGLE_REMINDER': {
        const rem = (currentState.reminders || []).find((r) => r.id === payload.id);
        if (rem) rem.completed = !rem.completed;
        break;
      }
      case 'DELETE_REMINDER': {
        currentState.reminders = (currentState.reminders || []).filter((r) => r.id !== payload.id);
        break;
      }
      case 'ADD_TASK': {
        currentState.tasks = currentState.tasks || [];
        currentState.tasks.unshift({
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
        const task = (currentState.tasks || []).find((t) => t.id === payload.id);
        if (task) task.status = task.status === 'done' ? 'todo' : 'done';
        break;
      }
      case 'DELETE_TASK': {
        currentState.tasks = (currentState.tasks || []).filter((t) => t.id !== payload.id);
        break;
      }
      case 'ADD_EVENT': {
        currentState.events = currentState.events || [];
        currentState.events.push({
          id: `evt-${Date.now()}`,
          title: payload.title || 'Impegno',
          date: today,
          startTime: payload.startTime || '10:00',
          endTime: payload.endTime || '11:00'
        });
        currentState.events.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        break;
      }
      case 'DELETE_EVENT': {
        currentState.events = (currentState.events || []).filter((e) => e.id !== payload.id);
        break;
      }
      case 'ADD_GOAL': {
        currentState.goals = currentState.goals || [];
        currentState.goals.unshift({
          id: `gol-${Date.now()}`,
          title: payload.title || 'Nuovo Obiettivo',
          category: payload.category || 'Personale',
          deadline: payload.deadline || '2026-12-31',
          progress: 0,
          milestones: []
        });
        break;
      }
      case 'UPDATE_GOAL_PROGRESS': {
        const g = (currentState.goals || []).find((x) => x.id === payload.id);
        if (g) g.progress = Math.min(100, Math.max(0, Number(payload.progress)));
        break;
      }
      case 'DELETE_GOAL': {
        currentState.goals = (currentState.goals || []).filter((g) => g.id !== payload.id);
        break;
      }
      default:
        break;
    }

    saveOfflineState(currentState);
    renderAll(currentState);
  }

  async function mutateState(action, payload = {}) {
    if (action !== 'ADJUST_TRACKER' && action !== 'RESET_TRACKER_TODAY' && action !== 'CYCLE_HABIT_CELL') {
      applyOptimisticMutation(action, payload);
    }
    try {
      const res = await fetch('/api/mutate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, payload, token: currentToken })
      });
      const data = await res.json();
      if (data.ok && data.state) {
        renderAll(data.state);
      }
    } catch (err) {}
  }

  document.querySelectorAll('.tab-btn, .m-nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      playUiTick(680);
      activateTab(btn.dataset.tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  commandForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = commandInput.value.trim();
    if (val) submitCommand(val, 'Barra Esecutiva');
  });

  const iphoneDialog = document.getElementById('iphone-hub-dialog');
  const alarmRingDialog = document.getElementById('alarm-ring-dialog');
  document.getElementById('btn-open-iphone-hub')?.addEventListener('click', () => iphoneDialog?.showModal());

  // Bottom Sheet Forms Submissions
  document.getElementById('create-tracker-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    mutateState('ADD_TRACKER', {
      name: document.getElementById('trk-name').value.trim(),
      icon: document.getElementById('trk-icon').value.trim() || '🔢',
      unit: document.getElementById('trk-unit').value.trim() || 'volte',
      mode: document.getElementById('trk-mode').value,
      dailyTarget: Number(document.getElementById('trk-target').value) || 5,
      costPerUnit: Number(document.getElementById('trk-cost').value) || 0,
      step: 1
    });
    universalSheet?.close();
    document.getElementById('trk-name').value = '';
    activateTab('trackers');
    showActionToast('🔢 Contatore creato!');
  });

  document.getElementById('create-habit-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    mutateState('ADD_HABIT', {
      name: document.getElementById('hab-name-input').value.trim(),
      category: document.getElementById('hab-cat-input').value.trim() || 'Personale'
    });
    universalSheet?.close();
    document.getElementById('hab-name-input').value = '';
    activateTab('today');
    showActionToast('🔥 Abitudine aggiunta!');
  });

  document.getElementById('single-alarm-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const time = document.getElementById('single-alarm-time').value;
    const label = document.getElementById('single-alarm-label').value.trim();
    mutateState('ADD_SINGLE_ALARM', { time, label });
    document.getElementById('single-alarm-label').value = '';
    universalSheet?.close();
    activateTab('alarms');
    showActionToast(`⏰ Sveglia impostata alle ${time}`);
  });

  document.getElementById('alarm-batch-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const start = document.getElementById('batch-start').value;
    const end = document.getElementById('batch-end').value;
    const intervalMin = document.getElementById('batch-interval').value;
    universalSheet?.close();
    submitCommand(`Sveglie dalle ${start} alle ${end} ogni ${intervalMin} minuti`, 'Generatore Sveglie');
  });

  document.getElementById('manual-reminder-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('new-rem-title').value.trim();
    const dueTime = document.getElementById('new-rem-time').value;
    if (title) {
      mutateState('ADD_REMINDER', { title, dueTime });
      document.getElementById('new-rem-title').value = '';
      universalSheet?.close();
      activateTab('alarms');
      showActionToast('🔔 Promemoria aggiunto');
    }
  });

  document.getElementById('manual-event-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const startTime = document.getElementById('evt-start').value;
    const endTime = document.getElementById('evt-end').value;
    const title = document.getElementById('evt-title').value.trim();
    if (title) {
      mutateState('ADD_EVENT', { title, startTime, endTime });
      document.getElementById('evt-title').value = '';
      universalSheet?.close();
      activateTab('today');
      showActionToast('📅 Impegno salvato in agenda');
    }
  });

  document.getElementById('quick-task-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const titleEl = document.getElementById('new-task-title');
    const prioEl = document.getElementById('new-task-priority');
    if (titleEl.value.trim()) {
      mutateState('ADD_TASK', { title: titleEl.value.trim(), priority: prioEl.value });
      titleEl.value = '';
      universalSheet?.close();
      activateTab('today');
      showActionToast('✓ Task aggiunto');
    }
  });

  document.getElementById('manual-goal-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('goal-title-input').value.trim();
    const category = document.getElementById('goal-cat-input').value.trim();
    if (title) {
      mutateState('ADD_GOAL', { title, category });
      document.getElementById('goal-title-input').value = '';
      universalSheet?.close();
      activateTab('finance');
      activateSegment('finance', 'finance-goals');
      showActionToast('🎯 Obiettivo creato');
    }
  });

  // Export & Import JSON Backup (Includes full 52-week archive!)
  document.getElementById('btn-export-json')?.addEventListener('click', () => {
    const fullBackup = { state: currentState, extra: extraState, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `promemory-backup-1year-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showActionToast('Backup completo (con Report 1 Anno) scaricato!');
  });

  document.getElementById('input-import-json')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed.extra) {
          extraState = parsed.extra;
          saveExtraState();
        }
        if (parsed.state) {
          renderAll(parsed.state);
        }
        showActionToast('Backup ripristinato!');
      } catch (err) {
        showActionToast('File JSON non valido');
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-export-alarms-ics')?.addEventListener('click', () => {
    window.location.href = '/api/export/ics';
  });

  document.getElementById('btn-trigger-ios-shortcut-alarms')?.addEventListener('click', () => {
    launchIosAlarmShortcut();
  });

  document.getElementById('btn-clear-all-alarms')?.addEventListener('click', () => {
    mutateState('CLEAR_ALL_ALARMS');
    showActionToast('Sveglie svuotate');
  });

  const btnCopyRemote = document.getElementById('btn-copy-remote-url');
  if (btnCopyRemote) {
    btnCopyRemote.addEventListener('click', () => {
      const urlToCopy = remoteUrl || window.location.origin;
      navigator.clipboard?.writeText(urlToCopy);
      btnCopyRemote.textContent = '✓ Link Copiato!';
      setTimeout(() => {
        btnCopyRemote.textContent = '📋 Copia Link iPhone';
      }, 2200);
    });
  }

  document.getElementById('btn-dismiss-alarm')?.addEventListener('click', () => {
    if (activeAlarmInterval) clearInterval(activeAlarmInterval);
    alarmRingDialog?.close();
  });

  document.getElementById('btn-snooze-alarm')?.addEventListener('click', () => {
    if (activeAlarmInterval) clearInterval(activeAlarmInterval);
    alarmRingDialog?.close();
    const snoozeDate = new Date(Date.now() + 5 * 60000);
    const hh = String(snoozeDate.getHours()).padStart(2, '0');
    const mm = String(snoozeDate.getMinutes()).padStart(2, '0');
    mutateState('ADD_SINGLE_ALARM', { time: `${hh}:${mm}`, label: 'Snooze +5m' });
  });

  let lastSeenDayStr = getLocalDateStr();

  function tickClockAndAlarms() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const currentHM = `${hh}:${mm}`;
    const timeFull = `${hh}:${mm}:${ss}`;

    // Italian Date Formatting (Giorno della settimana, Giorno del mese, Mese, Anno)
    const rawWeekday = now.toLocaleDateString('it-IT', { weekday: 'long' });
    const capWeekday = rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1);
    const dayNum = now.getDate();
    const rawMonth = now.toLocaleDateString('it-IT', { month: 'long' });
    const capMonth = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1);
    const year = now.getFullYear();

    const dateFullStr = `${capWeekday} ${dayNum} ${capMonth} ${year}`;
    const dateCompactStr = `${capWeekday.slice(0, 3)} ${dayNum} ${capMonth.slice(0, 3)}`;

    // Update Header Live Date & Live Monospace Clock Badge
    const liveDateEl = document.getElementById('live-italian-date');
    const liveClockEl = document.getElementById('live-italian-clock');
    if (liveDateEl) {
      liveDateEl.textContent = window.innerWidth < 480 ? dateCompactStr : dateFullStr;
    }
    if (liveClockEl) {
      liveClockEl.textContent = timeFull;
    }

    // Update Eyebrow on "Oggi" Tab
    const greetingEyebrow = document.getElementById('today-greeting-eyebrow');
    if (greetingEyebrow) {
      greetingEyebrow.textContent = `📅 ${capWeekday.toUpperCase()} ${dayNum} ${capMonth.toUpperCase()} ${year} · ${timeFull}`;
    }

    // Check Alarms trigger at ss === '00'
    if (ss === '00' && currentState?.alarms) {
      const matchingAlarm = currentState.alarms.find((a) => a.enabled && a.time === currentHM);
      const triggerKey = `${now.toDateString()}-${currentHM}`;
      if (matchingAlarm && !triggeredMinuteCache.has(triggerKey)) {
        triggeredMinuteCache.add(triggerKey);
        triggerLiveAlarmModal(matchingAlarm);
      }
    }

    // Midnight Auto-Rollover Detection (Adapts Gym Routine, Habits, Trackers to the new real day)
    const currentDayStr = getLocalDateStr(now);
    if (currentDayStr !== lastSeenDayStr) {
      lastSeenDayStr = currentDayStr;
      selectedGymDayIdx = (now.getDay() + 6) % 7;
      ensureTodayGymExercises(true);
      checkAutoWeeklyRollover();
      if (currentState) {
        renderAll(currentState);
      }
    }
  }

  function triggerLiveAlarmModal(alarm) {
    document.getElementById('alarm-ring-title').textContent = alarm.time;
    document.getElementById('alarm-ring-label').textContent = alarm.label;
    if (!alarmRingDialog.open) alarmRingDialog.showModal();
    playAlarmChime(alarm.sound || 'cascade');
    if (activeAlarmInterval) clearInterval(activeAlarmInterval);
    activeAlarmInterval = setInterval(() => playAlarmChime(alarm.sound || 'cascade'), 2800);
  }

  setInterval(tickClockAndAlarms, 1000);
  tickClockAndAlarms();

  // ==========================================================================
  // WEEKLY GYM PROGRAM EVENT LISTENERS
  // ==========================================================================
  document.getElementById('gym-weekly-day-bar')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.gym-day-chip');
    if (!chip) return;
    playUiTick(650);
    selectedGymDayIdx = parseInt(chip.dataset.gymDay, 10);
    renderWeeklyGymProgram();
  });

  document.getElementById('btn-load-day-into-today')?.addEventListener('click', () => {
    const dayRoutine = extraState.weeklyGymProgram?.schedule?.[selectedGymDayIdx];
    if (!dayRoutine || !dayRoutine.exercises || dayRoutine.exercises.length === 0) {
      showActionToast('Nessun esercizio da caricare per questo giorno!');
      return;
    }
    playAlarmChime('pulse');
    const todayStr = getLocalDateStr();
    extraState.activeGymDayIdx = selectedGymDayIdx;
    extraState.gymActiveDate = todayStr;
    extraState.gymExercises = dayRoutine.exercises.map((ex, idx) => ({
      id: `ex-loaded-${Date.now()}-${idx}`,
      name: ex.name,
      sets: Array.isArray(ex.sets)
        ? ex.sets.map((s) => ({ kg: s.kg || 0, reps: s.reps || 10, done: false }))
        : Array.from({ length: ex.sets || 3 }, () => ({
            kg: ex.kg || 50,
            reps: ex.reps || 10,
            done: false
          }))
    }));
    extraState.dailyGymSessions = extraState.dailyGymSessions || {};
    extraState.dailyGymSessions[todayStr] = {
      date: todayStr,
      dayIdx: selectedGymDayIdx,
      dayName: dayRoutine.day,
      focus: dayRoutine.focus,
      exercises: extraState.gymExercises
    };
    saveExtraState();
    syncWeeklyGymProgram();
    renderGymModule();

    // Switch to active workout tab
    document.querySelectorAll('.seg-btn[data-seg-group="gym"]').forEach((b) => b.classList.remove('active'));
    document.querySelector('.seg-btn[data-seg-group="gym"][data-seg-target="gym-active"]')?.classList.add('active');
    document.querySelectorAll('[id^="seg-gym-"]').forEach((v) => (v.hidden = true));
    const activeView = document.getElementById('seg-gym-active');
    if (activeView) activeView.hidden = false;

    showActionToast(`⚡ Scheda di ${dayRoutine.day} caricata per oggi!`);
  });

  document.getElementById('btn-today-open-gym')?.addEventListener('click', () => {
    activateTab('gym');
    activateSegment('gym', 'gym-active');
  });

  document.getElementById('btn-gym-jump-weekly')?.addEventListener('click', () => {
    activateSegment('gym', 'gym-weekly');
  });

  document.getElementById('btn-gym-reload-today-real')?.addEventListener('click', () => {
    playUiTick(800);
    ensureTodayGymExercises(true);
    renderGymModule();
    showActionToast('🔄 Scheda del giorno reale ricaricata con successo!');
  });

  document.getElementById('btn-add-exercise-to-day')?.addEventListener('click', () => {
    const dayRoutine = extraState.weeklyGymProgram?.schedule?.[selectedGymDayIdx];
    const dayName = dayRoutine?.day || 'Giorno';
    const eyebrow = document.getElementById('gym-add-routine-eyebrow');
    if (eyebrow) eyebrow.textContent = `AGGIUNGI A ${dayName.toUpperCase()}`;
    document.getElementById('gym-add-routine-ex-dialog')?.showModal();
  });

  document.getElementById('gym-add-routine-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('routine-ex-name').value.trim();
    const sets = parseInt(document.getElementById('routine-ex-sets').value, 10) || 3;
    const reps = parseInt(document.getElementById('routine-ex-reps').value, 10) || 10;
    const kg = parseFloat(document.getElementById('routine-ex-kg').value) || 20;

    const dayRoutine = extraState.weeklyGymProgram?.schedule?.[selectedGymDayIdx];
    if (name && dayRoutine) {
      dayRoutine.exercises = dayRoutine.exercises || [];
      dayRoutine.exercises.push({
        id: `ex-rout-${Date.now()}`,
        name,
        sets,
        reps,
        kg
      });
      saveExtraState();
      syncWeeklyGymProgram();
      renderWeeklyGymProgram();
      document.getElementById('gym-add-routine-ex-dialog')?.close();
      document.getElementById('routine-ex-name').value = '';
      showActionToast(`Esercizio aggiunto a ${dayRoutine.day}`);
    }
  });

  document.getElementById('btn-change-weekly-split')?.addEventListener('click', () => {
    const splits = ['fighter_boxing', 'push_pull_legs', 'upper_lower', 'full_body', 'calisthenics_cardio'];
    const splitNames = {
      fighter_boxing: '🥊 Fighter Boxing & Strength (7 Giorni)',
      push_pull_legs: 'Push / Pull / Legs (4 Giorni)',
      upper_lower: 'Upper / Lower (4 Giorni)',
      full_body: 'Full Body (3 Giorni)',
      calisthenics_cardio: 'Calisthenics & Cardio (3 Giorni)'
    };
    const current = extraState.weeklyGymProgram?.splitKey || 'push_pull_legs';
    const nextIdx = (splits.indexOf(current) + 1) % splits.length;
    const nextSplit = splits[nextIdx];
    const newSchedule = buildDefaultGymRoutinesClient(nextSplit);

    extraState.weeklyGymProgram = {
      splitKey: nextSplit,
      splitName: splitNames[nextSplit],
      createdAt: new Date().toISOString().split('T')[0],
      schedule: newSchedule
    };
    saveExtraState();
    syncWeeklyGymProgram();
    renderWeeklyGymProgram();
    showActionToast(`🔄 Split aggiornato: ${splitNames[nextSplit]}`);
  });

  // ==========================================================================
  // MULTI-USER AUTHENTICATION & USER PROFILE
  // ==========================================================================
  const authModalDialog = document.getElementById('auth-modal-dialog');
  const userProfileDialog = document.getElementById('user-profile-dialog');
  const onboardingWizardDialog = document.getElementById('onboarding-wizard-dialog');
  const paywallNoticeDialog = document.getElementById('paywall-notice-dialog');
  let authMode = 'login'; // 'login' or 'register'

  function updateHeaderUserBadge() {
    const nameEl = document.getElementById('user-header-name');
    const badgeEl = document.getElementById('user-avatar-badge');
    if (nameEl && currentUser) {
      nameEl.textContent = currentUser.name || 'Utente';
    }
    if (badgeEl && currentUser) {
      badgeEl.textContent = currentUser.role === 'founder' ? '👑' : '👤';
    }
  }

  function checkPaywallNotice() {
    if (systemSettings?.paywallActive && currentUser?.role !== 'founder') {
      if (paywallNoticeDialog && !paywallNoticeDialog.open) {
        paywallNoticeDialog.showModal();
      }
    }
  }

  document.getElementById('btn-open-user-profile')?.addEventListener('click', () => {
    playUiTick(720);
    if (!currentUser) {
      authModalDialog?.showModal();
      return;
    }
    // Populate profile dialog
    const nameDisp = document.getElementById('profile-name-display');
    const emailDisp = document.getElementById('profile-email-display');
    const roleBadge = document.getElementById('profile-role-badge');
    const avatarDisp = document.getElementById('profile-avatar-display');
    const shareInput = document.getElementById('share-link-input');
    const founderPanel = document.getElementById('founder-monetization-panel');
    const paywallSwitch = document.getElementById('switch-paywall-active');
    const paywallStatus = document.getElementById('paywall-status-text');

    if (nameDisp) nameDisp.textContent = currentUser.name || 'Utente';
    if (emailDisp) emailDisp.textContent = currentUser.email || '';
    if (avatarDisp) avatarDisp.textContent = currentUser.role === 'founder' ? '👑' : '👤';
    if (roleBadge) {
      roleBadge.textContent = currentUser.role === 'founder' ? 'Fondatore' : 'PRO Member';
    }

    const shareUrl = remoteUrl || window.location.origin;
    if (shareInput) shareInput.value = shareUrl;

    if (currentUser.role === 'founder') {
      if (founderPanel) founderPanel.hidden = false;
      if (paywallSwitch) paywallSwitch.checked = Boolean(systemSettings?.paywallActive);
      if (paywallStatus) {
        paywallStatus.textContent = systemSettings?.paywallActive
          ? 'ATTIVATO (Richiesto 50€/mese per tutti i membri)'
          : 'DISATTIVATO (Accesso libero gratuito)';
      }
    } else {
      if (founderPanel) founderPanel.hidden = true;
    }

    userProfileDialog?.showModal();
  });

  document.getElementById('btn-open-share')?.addEventListener('click', () => {
    playUiTick(720);
    document.getElementById('btn-open-user-profile')?.click();
  });

  document.getElementById('btn-copy-share-link')?.addEventListener('click', () => {
    const input = document.getElementById('share-link-input');
    if (input) {
      input.select();
      navigator.clipboard.writeText(input.value).then(() => {
        showActionToast('✓ Link invito PROMEMORY copiato!');
      }).catch(() => {
        showActionToast('Link selezionato, premi Copia');
      });
    }
  });

  document.getElementById('btn-share-whatsapp')?.addEventListener('click', () => {
    const shareUrl = remoteUrl || window.location.origin;
    const msg = `⚡ Ti invito su PROMEMORY — Il Sistema Operativo Personale con Cervello AI, Scheda Palestra e Focus: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  });

  document.getElementById('switch-paywall-active')?.addEventListener('change', async (e) => {
    const active = e.target.checked;
    try {
      const res = await fetch('/api/admin/toggle-paywall', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ paywallActive: active, token: currentToken })
      });
      const data = await res.json();
      if (data.ok) {
        systemSettings = data.systemSettings;
        const statusEl = document.getElementById('paywall-status-text');
        if (statusEl) {
          statusEl.textContent = active
            ? 'ATTIVATO (Richiesto 50€/mese per tutti i membri)'
            : 'DISATTIVATO (Accesso libero gratuito)';
        }
        showActionToast(active ? 'Paywall 50€/mese Attivato' : 'Paywall Disattivato');
      }
    } catch (err) {
      showActionToast('Errore aggiornamento paywall');
    }
  });

  document.getElementById('btn-preview-paywall')?.addEventListener('click', () => {
    paywallNoticeDialog?.showModal();
  });

  document.getElementById('btn-reopen-questionnaire')?.addEventListener('click', () => {
    userProfileDialog?.close();
    currentWizardStep = 1;
    updateWizardUI();
    onboardingWizardDialog?.showModal();
  });

  document.getElementById('btn-logout-account')?.addEventListener('click', () => {
    userProfileDialog?.close();
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    currentToken = 'tok_tolo_master_founder';
    showActionToast('Disconnesso. Seleziona account o accedi.');
    authModalDialog?.showModal();
  });

  // Google 1-Click Login Simulation / Instant Profile
  document.getElementById('btn-google-login')?.addEventListener('click', async () => {
    playUiTick(800);
    const emailPrompt = prompt('Inserisci la tua email Google per accedere al tuo spazio PROMEMORY:', 'amico@gmail.com');
    if (!emailPrompt || !emailPrompt.includes('@')) return;

    try {
      const name = emailPrompt.split('@')[0];
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailPrompt, name, avatar: '👤' })
      });
      const data = await res.json();
      if (data.ok) {
        currentToken = data.token;
        localStorage.setItem(TOKEN_STORAGE_KEY, currentToken);
        currentUser = data.user;
        systemSettings = data.systemSettings;
        if (data.extraState) extraState = { ...extraState, ...data.extraState };
        saveExtraState();
        updateHeaderUserBadge();
        authModalDialog?.close();
        renderAll(data.state);

        if (!data.user.onboardingCompleted) {
          currentWizardStep = 1;
          const nameInput = document.getElementById('wiz-name');
          if (nameInput) nameInput.value = data.user.name || name;
          updateWizardUI();
          onboardingWizardDialog?.showModal();
        } else {
          showActionToast(`Bentornato in PROMEMORY, ${data.user.name}!`);
        }
      }
    } catch (err) {
      showActionToast('Errore durante l\'accesso con Google');
    }
  });

  // Auth Modal Tab Switch
  const authTabLogin = document.getElementById('auth-tab-btn-login');
  const authTabRegister = document.getElementById('auth-tab-btn-register');
  const authNameGroup = document.getElementById('auth-name-group');
  const btnAuthSubmit = document.getElementById('btn-auth-submit-btn');

  authTabLogin?.addEventListener('click', () => {
    authMode = 'login';
    authTabLogin.classList.add('active');
    authTabRegister?.classList.remove('active');
    if (authNameGroup) authNameGroup.hidden = true;
    if (btnAuthSubmit) btnAuthSubmit.textContent = 'Entra in PROMEMORY';
    document.getElementById('auth-error-container').hidden = true;
  });

  authTabRegister?.addEventListener('click', () => {
    authMode = 'register';
    authTabRegister.classList.add('active');
    authTabLogin?.classList.remove('active');
    if (authNameGroup) authNameGroup.hidden = false;
    if (btnAuthSubmit) btnAuthSubmit.textContent = 'Crea Account & Inizia';
    document.getElementById('auth-error-container').hidden = true;
  });

  document.getElementById('auth-credential-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-input-email').value.trim();
    const password = document.getElementById('auth-input-password').value.trim();
    const name = document.getElementById('auth-input-name')?.value.trim() || 'Utente';
    const errBox = document.getElementById('auth-error-container');

    const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const body = authMode === 'register' ? { email, password, name } : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!data.ok) {
        if (errBox) {
          errBox.textContent = data.error || 'Errore di autenticazione';
          errBox.hidden = false;
        }
        return;
      }

      currentToken = data.token;
      localStorage.setItem(TOKEN_STORAGE_KEY, currentToken);
      currentUser = data.user;
      systemSettings = data.systemSettings;
      if (data.extraState) extraState = { ...extraState, ...data.extraState };
      saveExtraState();
      updateHeaderUserBadge();
      authModalDialog?.close();
      renderAll(data.state);

      if (!data.user.onboardingCompleted) {
        currentWizardStep = 1;
        const nameInput = document.getElementById('wiz-name');
        if (nameInput) nameInput.value = data.user.name || name;
        updateWizardUI();
        onboardingWizardDialog?.showModal();
      } else {
        showActionToast(`Bentornato, ${data.user.name}!`);
      }
    } catch (err) {
      if (errBox) {
        errBox.textContent = 'Errore di connessione al server.';
        errBox.hidden = false;
      }
    }
  });

  // ==========================================================================
  // ONBOARDING WIZARD INTERACTIVE CONTROLS
  // ==========================================================================
  function updateWizardUI() {
    const counterEl = document.getElementById('wizard-step-counter');
    const barEl = document.getElementById('wizard-progress-bar');
    const prevBtn = document.getElementById('btn-wiz-prev');
    const nextBtn = document.getElementById('btn-wiz-next');

    if (counterEl) counterEl.textContent = `Passo ${currentWizardStep} di 8`;
    if (barEl) barEl.style.width = `${(currentWizardStep / 8) * 100}%`;
    if (prevBtn) prevBtn.disabled = currentWizardStep === 1;

    document.querySelectorAll('.wizard-step').forEach((s) => {
      const stepIdx = parseInt(s.dataset.step, 10);
      s.hidden = stepIdx !== currentWizardStep;
    });

    if (nextBtn) {
      if (currentWizardStep === 8) {
        nextBtn.textContent = '⚡ Attiva il mio PROMEMORY Personalizzato';
        populateWizardSummary();
      } else {
        nextBtn.textContent = 'Continua';
      }
    }
  }

  function populateWizardSummary() {
    const summaryCard = document.getElementById('wizard-summary-card');
    if (!summaryCard) return;

    const name = document.getElementById('wiz-name')?.value.trim() || currentUser?.name || 'Utente';
    const goal = document.getElementById('wiz-goal')?.value.trim() || 'Massima produttività';
    const smokesChoice = document.querySelector('.choice-card[data-choice-group="smokes"].active')?.dataset.choiceVal === 'yes';
    const smokeBaseline = document.getElementById('wiz-smoke-baseline')?.value || 15;
    const smokeTarget = document.getElementById('wiz-smoke-target')?.value || 5;
    const water = document.getElementById('wiz-water-glasses')?.value || 8;
    const wake = document.getElementById('wiz-wake-time')?.value || '06:30';
    const sleep = document.getElementById('wiz-sleep-time')?.value || '23:00';
    const deepWork = document.getElementById('wiz-deepwork-val')?.value || 4;
    const budget = document.getElementById('wiz-budget')?.value || 50;
    const splitKey = document.getElementById('wiz-gym-split-val')?.value || 'push_pull_legs';
    const gymDays = document.getElementById('wiz-gym-days')?.value || 4;

    const splitNames = {
      fighter_boxing: '🥊 Fighter Boxing & Strength (7 Giorni)',
      push_pull_legs: 'Push / Pull / Legs',
      upper_lower: 'Upper / Lower',
      full_body: 'Full Body',
      calisthenics_cardio: 'Calisthenics & Cardio'
    };

    summaryCard.innerHTML = `
      <div class="summary-row"><span class="label">Profilo:</span><span class="val">${name}</span></div>
      <div class="summary-row"><span class="label">Obiettivo:</span><span class="val">${goal}</span></div>
      <div class="summary-row"><span class="label">Fumo & Nicotina:</span><span class="val">${smokesChoice ? `Attivo (Baseline: ${smokeBaseline}, Target max: ${smokeTarget})` : 'Disattivato (Zero fumo)'}</span></div>
      <div class="summary-row"><span class="label">Idratazione:</span><span class="val">${water} bicchieri/giorno</span></div>
      <div class="summary-row"><span class="label">Ciclo Sveglia/Sonno:</span><span class="val">${wake} → ${sleep} (Sveglia a raffica ON)</span></div>
      <div class="summary-row"><span class="label">Deep Work Target:</span><span class="val">${deepWork} ore/giorno</span></div>
      <div class="summary-row"><span class="label">Budget Spesa:</span><span class="val">€${budget} / giorno</span></div>
      <div class="summary-row"><span class="label">Scheda Palestra:</span><span class="val">${splitNames[splitKey] || splitKey} (${gymDays}g/sett)</span></div>
    `;
  }

  // Choice Cards Selection (Smokes & Gym Split)
  document.querySelectorAll('.choice-card').forEach((card) => {
    card.addEventListener('click', () => {
      playUiTick(700);
      const group = card.dataset.choiceGroup;
      if (group === 'smokes') {
        document.querySelectorAll('.choice-card[data-choice-group="smokes"]').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        const smokesDetails = document.getElementById('wiz-smoking-details');
        if (smokesDetails) {
          smokesDetails.hidden = card.dataset.choiceVal !== 'yes';
        }
      } else if (card.dataset.gymSplit) {
        document.querySelectorAll('.choice-card[data-gym-split]').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        const valInput = document.getElementById('wiz-gym-split-val');
        if (valInput) valInput.value = card.dataset.gymSplit;
      }
    });
  });

  // Deep work chips
  document.querySelectorAll('.chip-choice-btn').forEach((chip) => {
    chip.addEventListener('click', () => {
      playUiTick(700);
      document.querySelectorAll('.chip-choice-btn').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const valInput = document.getElementById('wiz-deepwork-val');
      if (valInput) valInput.value = chip.dataset.hours;
    });
  });

  document.getElementById('btn-wiz-prev')?.addEventListener('click', () => {
    playUiTick(600);
    if (currentWizardStep > 1) {
      currentWizardStep--;
      updateWizardUI();
    }
  });

  document.getElementById('btn-wiz-next')?.addEventListener('click', async () => {
    playUiTick(750);
    // Validation on step 1
    if (currentWizardStep === 1) {
      const name = document.getElementById('wiz-name')?.value.trim();
      if (!name) {
        showActionToast('Inserisci il tuo nome per continuare!');
        return;
      }
    }

    if (currentWizardStep < 8) {
      currentWizardStep++;
      updateWizardUI();
      return;
    }

    // Step 8: Final Submission to /api/auth/questionnaire
    const answers = {
      name: document.getElementById('wiz-name')?.value.trim() || currentUser?.name || 'Utente',
      mainGoal: document.getElementById('wiz-goal')?.value.trim() || 'Massima produttività e forma fisica',
      smokes: document.querySelector('.choice-card[data-choice-group="smokes"].active')?.dataset.choiceVal || 'yes',
      smokeBaseline: Number(document.getElementById('wiz-smoke-baseline')?.value) || 15,
      smokeTarget: Number(document.getElementById('wiz-smoke-target')?.value) || 5,
      packCost: Number(document.getElementById('wiz-pack-cost')?.value) || 6.00,
      waterGlasses: Number(document.getElementById('wiz-water-glasses')?.value) || 8,
      trackAlcohol: document.getElementById('wiz-track-alcohol')?.checked ? 'yes' : 'no',
      trackCoffee: document.getElementById('wiz-track-coffee')?.checked ? 'yes' : 'no',
      wakeUpTime: document.getElementById('wiz-wake-time')?.value || '06:30',
      sleepTime: document.getElementById('wiz-sleep-time')?.value || '23:00',
      smartAlarmSequence: document.getElementById('wiz-smart-alarms')?.checked ? 'yes' : 'no',
      deepWorkHours: Number(document.getElementById('wiz-deepwork-val')?.value) || 4,
      dailyBudgetEuro: Number(document.getElementById('wiz-budget')?.value) || 50,
      gymSplit: document.getElementById('wiz-gym-split-val')?.value || 'push_pull_legs',
      gymDaysCount: Number(document.getElementById('wiz-gym-days')?.value) || 4
    };

    try {
      const res = await fetch('/api/auth/questionnaire', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(answers)
      });
      const data = await res.json();
      if (data.ok) {
        currentUser = data.user;
        if (data.extraState) extraState = { ...extraState, ...data.extraState };
        saveExtraState();
        updateHeaderUserBadge();
        onboardingWizardDialog?.close();
        renderAll(data.state);
        playAlarmChime('cascade');
        showActionToast('🧠 Cervello PROMEMORY Configurato con Successo!');
      }
    } catch (err) {
      showActionToast('Errore durante il salvataggio del questionario');
    }
  });

  document.getElementById('btn-dismiss-alarm')?.addEventListener('click', () => {
    if (activeAlarmInterval) clearInterval(activeAlarmInterval);
    alarmRingDialog?.close();
  });

  // Real-time WebSocket Sync with Token
  function connectWebSocket() {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}?token=${encodeURIComponent(currentToken)}`);

    ws.addEventListener('open', () => {
      syncStatusPill.querySelector('.status-dot').dataset.state = 'online';
      if (syncStatusText) syncStatusText.textContent = 'Sync Live';
    });

    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'STATE_SYNC' && msg.state) {
          if (msg.lanIp) lanIp = msg.lanIp;
          if (msg.remoteUrl) remoteUrl = msg.remoteUrl;
          if (msg.port) serverPort = msg.port;
          if (msg.extraState) {
            extraState = { ...extraState, ...msg.extraState };
            saveExtraState();
          }
          if (msg.systemSettings) {
            systemSettings = msg.systemSettings;
            checkPaywallNotice();
          }
          renderAll(msg.state);
        }
      } catch (e) {}
    });

    ws.addEventListener('close', () => {
      syncStatusPill.querySelector('.status-dot').dataset.state = 'offline';
      if (syncStatusText) syncStatusText.textContent = 'Locale';
      setTimeout(connectWebSocket, 3500);
    });
  }

  // Always render immediately from cached or fallback state so UI is 100% interactive at 0ms
  const initial = loadOfflineState() || buildFallbackState();
  renderAll(initial);

  fetch('/api/state', { headers: getAuthHeaders() })
    .then((r) => r.json())
    .then((data) => {
      if (data.lanIp) lanIp = data.lanIp;
      if (data.remoteUrl) remoteUrl = data.remoteUrl;
      if (data.port) serverPort = data.port;
      if (data.user) {
        currentUser = data.user;
        updateHeaderUserBadge();
        if (!data.user.onboardingCompleted) {
          currentWizardStep = 1;
          const nameInput = document.getElementById('wiz-name');
          if (nameInput) nameInput.value = data.user.name || 'Utente';
          updateWizardUI();
          onboardingWizardDialog?.showModal();
        }
      }
      if (data.systemSettings) {
        systemSettings = data.systemSettings;
        checkPaywallNotice();
      }
      if (data.extraState) {
        extraState = { ...extraState, ...data.extraState };
        saveExtraState();
      }
      if (data.state) renderAll(data.state);
      connectWebSocket();
      initSpeechRecognition();
    })
    .catch(() => {
      initSpeechRecognition();
    });
})();
