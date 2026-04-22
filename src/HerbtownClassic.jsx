import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, ChevronLeft, ChevronRight, RotateCcw, Check, Flag, Crown, Grid3x3, X, Lock, Unlock } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set as fbSet, remove as fbRemove } from 'firebase/database';

// ============= FIREBASE SETUP =============
// Replace these values with your Firebase config (see DEPLOY.md for instructions)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// ============= CONFIG =============
const PLAYERS = ['Frosty', 'Herby', 'Carlos'];
const PLAYER_QUOTES = {
  Herby: [
    "Bro, my NY 4 iron goes 220 though.",
    "Bro, I'm still like 70 30 maybe I need a powerpoint.",
    "Carlos fucking said good shot too early.",
    "Nikki calls it my sleep app.",
    "Bro there is no fish on the menu here for me.",
  ],
  Frosty: [
    "Where the fuck are the fat girls?",
    "That 3 putt came quicker than me with Olivia.",
    "I need Eddie and Lauren <3 here to motivate me.",
    "Did I tell you about the worms in my balls?",
    "Josh Larson touched me.",
    "Caddy is like a lax bro, I want to fuck him.",
  ],
  Carlos: [
    "That should have been a fucking gimme.",
    "Would you like to spin that $2.50?",
    "Anyone want a nootropic?",
    "I suck more dick than Molly Zung.",
    "Pretty sure that was a stadium lie.",
    "Fucking Fielding fucked me so hard.",
  ],
};
const SNAKE_VALUE = 3;
const MATCH_POINT_VALUE = 4;

// Stroke play payouts per round (net to each place)
// 1st: +$70 ($40 from 3rd + $30 from 2nd)
// 2nd: $0 (-$30 to 1st, +$30 from 3rd)
// 3rd: -$70 (-$40 to 1st, -$30 to 2nd)
const STROKE_PAYOUT = { 1: 70, 2: 0, 3: -70 };

const ROUNDS = [
  {
    id: 'cliffhangers',
    name: 'Cliffhangers',
    day: 'Thursday 2PM',
    holes: 18,
    type: 'cliffhangers',
    tees: { Frosty: 'Back', Herby: 'Back', Carlos: 'Back' },
    strokes: { Frosty: 0, Herby: 0, Carlos: 0 },
    pars: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    handicapIndex: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    yardages: {
      Back: [65, 83, 115, 157, 77, 94, 97, 117, 116, 102, 72, 142, 136, 155, 125, 90, 91, 76],
    },
  },
  {
    id: 'buffalo_fri',
    name: 'Buffalo Ridge',
    day: 'Friday 7AM',
    holes: 18,
    type: 'standard',
    tees: { Frosty: 'Black/Blue', Herby: 'Black/Blue', Carlos: 'Blue/White' },
    strokes: { Frosty: 0, Herby: 7.5, Carlos: 4 },
    pars: [5, 4, 4, 3, 4, 4, 3, 5, 3, 4, 3, 4, 4, 5, 4, 4, 3, 5],
    handicapIndex: [5, 1, 9, 17, 7, 13, 11, 3, 15, 12, 18, 4, 8, 2, 14, 10, 16, 6],
    forwardTeeHoles: [2, 4, 5, 7, 8, 12, 13, 14, 16, 18],
    yardages: {
      Black: [578, 471, 405, 195, 449, 353, 245, 524, 198, 377, 158, 477, 462, 615, 366, 425, 165, 573],
      Blue:  [547, 458, 385, 177, 418, 328, 224, 505, 179, 356, 148, 454, 435, 576, 348, 379, 151, 548],
      White: [497, 390, 333, 139, 369, 294, 195, 456, 143, 318, 122, 418, 401, 537, 309, 326, 124, 510],
    },
  },
  {
    id: 'ozarks_fri',
    name: 'Ozarks National',
    day: 'Friday 1:20PM',
    holes: 18,
    type: 'standard',
    tees: { Frosty: 'Black/Blue', Herby: 'Black/Blue', Carlos: 'Blue/White' },
    strokes: { Frosty: 0, Herby: 7, Carlos: 3.5 },
    pars: [5, 3, 4, 4, 4, 3, 5, 3, 5, 4, 5, 3, 4, 4, 4, 4, 3, 4],
    handicapIndex: [8, 18, 14, 2, 10, 12, 6, 16, 4, 13, 9, 11, 3, 5, 15, 1, 17, 7],
    forwardTeeHoles: [2, 4, 6, 9, 10, 12, 13, 14, 18],
    yardages: {
      Black: [517, 167, 345, 446, 352, 216, 543, 178, 597, 469, 531, 254, 480, 450, 407, 481, 144, 459],
      Blue:  [495, 157, 322, 433, 306, 186, 513, 153, 549, 399, 516, 213, 462, 440, 379, 428, 134, 425],
      White: [449, 129, 286, 388, 248, 166, 442, 134, 516, 391, 501, 175, 442, 410, 331, 380, 114, 401],
    },
  },
  {
    id: 'ozarks_sat',
    name: 'Ozarks National',
    day: 'Saturday 7:40AM',
    holes: 18,
    type: 'standard',
    tees: { Frosty: 'Black/Blue', Herby: 'Black/Blue', Carlos: 'Blue/White' },
    strokes: { Frosty: 0, Herby: 7, Carlos: 3.5 },
    pars: [5, 3, 4, 4, 4, 3, 5, 3, 5, 4, 5, 3, 4, 4, 4, 4, 3, 4],
    handicapIndex: [8, 18, 14, 2, 10, 12, 6, 16, 4, 13, 9, 11, 3, 5, 15, 1, 17, 7],
    forwardTeeHoles: [2, 4, 6, 9, 10, 12, 13, 14, 18],
    yardages: {
      Black: [517, 167, 345, 446, 352, 216, 543, 178, 597, 469, 531, 254, 480, 450, 407, 481, 144, 459],
      Blue:  [495, 157, 322, 433, 306, 186, 513, 153, 549, 399, 516, 213, 462, 440, 379, 428, 134, 425],
      White: [449, 129, 286, 388, 248, 166, 442, 134, 516, 391, 501, 175, 442, 410, 331, 380, 114, 401],
    },
  },
  {
    id: 'buffalo_sat',
    name: 'Buffalo Ridge',
    day: 'Saturday 2:20PM',
    holes: 18,
    type: 'standard',
    tees: { Frosty: 'Black/Blue', Herby: 'Black/Blue', Carlos: 'Blue/White' },
    strokes: { Frosty: 0, Herby: 7.5, Carlos: 4 },
    pars: [5, 4, 4, 3, 4, 4, 3, 5, 3, 4, 3, 4, 4, 5, 4, 4, 3, 5],
    handicapIndex: [5, 1, 9, 17, 7, 13, 11, 3, 15, 12, 18, 4, 8, 2, 14, 10, 16, 6],
    forwardTeeHoles: [2, 4, 5, 7, 8, 12, 13, 14, 16, 18],
    yardages: {
      Black: [578, 471, 405, 195, 449, 353, 245, 524, 198, 377, 158, 477, 462, 615, 366, 425, 165, 573],
      Blue:  [547, 458, 385, 177, 418, 328, 224, 505, 179, 356, 148, 454, 435, 576, 348, 379, 151, 548],
      White: [497, 390, 333, 139, 369, 294, 195, 456, 143, 318, 122, 418, 401, 537, 309, 326, 124, 510],
    },
  },
  {
    id: 'paynes',
    name: 'Paynes Valley',
    day: 'Sunday 8AM',
    holes: 18,
    type: 'standard',
    tees: { Frosty: 'Blue', Herby: 'Blue', Carlos: 'White' },
    strokes: { Frosty: 0, Herby: 7, Carlos: 2 },
    pars: [4, 3, 4, 5, 3, 4, 4, 5, 4, 3, 4, 4, 5, 4, 4, 3, 4, 5],
    handicapIndex: [3, 7, 17, 11, 9, 13, 15, 5, 1, 16, 12, 18, 2, 10, 4, 14, 8, 6],
    yardages: {
      Blue:  [452, 237, 304, 521, 169, 433, 350, 545, 405, 161, 405, 322, 566, 396, 418, 204, 458, 530],
      White: [393, 197, 278, 484, 142, 405, 315, 455, 372, 140, 374, 282, 493, 353, 376, 171, 424, 479],
    },
  },
];

// Tee color mapping for visual indicator
const TEE_COLORS = {
  'Black/Blue': { bg: '#1a1a1a', border: '#4a6fa5', text: '#f4ead5' },
  'Blue/White': { bg: '#2a4373', border: '#d4d4d4', text: '#f4ead5' },
  'Blue': { bg: '#2a4373', border: '#2a4373', text: '#f4ead5' },
  'White': { bg: '#e8e8e8', border: '#b0b0b0', text: '#1a1a1a' },
  'Black': { bg: '#1a1a1a', border: '#1a1a1a', text: '#f4ead5' },
  'Back': { bg: '#5a3a1a', border: '#5a3a1a', text: '#f4ead5' },
  'Front': { bg: '#c9a876', border: '#9a7a4a', text: '#1a1a1a' },
  'N/A': { bg: 'transparent', border: 'rgba(212, 165, 116, 0.3)', text: '#d4a574' },
};

// Resolve combo tees to actual tee used on a specific hole based on forwardTeeHoles list
// holeIdx is 0-based, forwardTeeHoles uses 1-based hole numbers
const resolveTeeForHole = (teeString, holeIdx, round) => {
  if (!teeString) return null;
  if (!teeString.includes('/')) return teeString; // not a combo
  const [back, forward] = teeString.split('/');
  const holeNumber = holeIdx + 1;
  const isForward = round?.forwardTeeHoles?.includes(holeNumber);
  return isForward ? forward : back;
};

// ============= HELPERS =============
const getHandicapStrokesPerHole = (totalStrokes, handicapIndex) => {
  const strokesPerHole = new Array(handicapIndex.length).fill(0);
  const whole = Math.floor(totalStrokes);
  const hasHalf = (totalStrokes - whole) >= 0.5;

  for (let i = 0; i < whole; i++) {
    const rank = (i % handicapIndex.length) + 1;
    const holeIdx = handicapIndex.findIndex((hi) => hi === rank);
    if (holeIdx !== -1) strokesPerHole[holeIdx] += 1;
  }
  if (hasHalf) {
    const rank = (whole % handicapIndex.length) + 1;
    const nextIdx = handicapIndex.findIndex((hi) => hi === rank);
    if (nextIdx !== -1) strokesPerHole[nextIdx] += 0.5;
  }
  return strokesPerHole;
};

const capAtTripleBogey = (gross, par) => {
  if (!gross || !par) return gross;
  return Math.min(gross, par + 3);
};

const generateTeams = (roundId) => {
  let hash = 0;
  for (let i = 0; i < roundId.length; i++) hash = (hash * 31 + roundId.charCodeAt(i)) >>> 0;
  const segments = [];
  for (let seg = 0; seg < 3; seg++) {
    segments.push(PLAYERS[(hash + seg * 7) % 3]);
  }
  return segments;
};

// Rank players by net score: 1 = best, 3 = worst, handles ties
const rankStrokes = (netStrokes) => {
  const entries = Object.entries(netStrokes);
  if (entries.length < PLAYERS.length) return {};
  const sorted = [...entries].sort((a, b) => a[1] - b[1]);
  const ranks = {};
  sorted.forEach(([p], i) => { ranks[p] = i + 1; });
  // Handle ties: if 1st = 2nd, they split 1st+2nd place winnings → but per rules, simpler to treat tied as same rank
  // With $70/$0/-$70 structure, a tie between 1st and 2nd means both get $35 from 3rd; 3rd still pays $70 total
  return ranks;
};

const computeStrokePayouts = (netStrokes) => {
  const payouts = { Frosty: 0, Herby: 0, Carlos: 0 };
  const entries = Object.entries(netStrokes);
  if (entries.length < PLAYERS.length) return payouts;

  const sorted = [...entries].sort((a, b) => a[1] - b[1]);
  const [p1, v1] = sorted[0];
  const [p2, v2] = sorted[1];
  const [p3, v3] = sorted[2];

  // Three-way tie → no money changes hands
  if (v1 === v2 && v2 === v3) return payouts;

  // 1st and 2nd tied (both lower than 3rd): split $70 from 3rd = $35 each
  if (v1 === v2 && v2 < v3) {
    payouts[p1] = 35;
    payouts[p2] = 35;
    payouts[p3] = -70;
    return payouts;
  }

  // 2nd and 3rd tied (both higher than 1st): each pays $35 to 1st
  if (v2 === v3 && v1 < v2) {
    payouts[p1] = 70;
    payouts[p2] = -35;
    payouts[p3] = -35;
    return payouts;
  }

  // Clean 1/2/3 ordering
  payouts[p1] = 70;
  payouts[p2] = 0;
  payouts[p3] = -70;
  return payouts;
};

// ============= STYLES =============
const styles = {
  wrapper: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0a1f0f 0%, #0d2818 50%, #0a1f0f 100%)',
    color: '#f4ead5',
    fontFamily: '"Courier New", Courier, monospace',
  },
};

// ============= MAIN APP =============
export default function HerbtownClassic() {
  const [loading, setLoading] = useState(true);
  const [roundIdx, setRoundIdx] = useState(0);
  const [scores, setScores] = useState({});
  const [snakes, setSnakes] = useState({});
  const [ctp, setCtp] = useState({});
  const [sideBets, setSideBets] = useState({});
  const [locks, setLocks] = useState({});
  const [view, setView] = useState('home');

  const loadData = useCallback(() => {
    // Set up real-time listeners on each path — updates push instantly to all phones
    const scoresRef = ref(db, 'scores');
    const snakesRef = ref(db, 'snakes');
    const ctpRef = ref(db, 'ctp');
    const sideBetsRef = ref(db, 'sideBets');
    const locksRef = ref(db, 'locks');

    const unsubScores = onValue(scoresRef, (snap) => {
      setScores(snap.val() || {});
      setLoading(false);
    }, (err) => {
      console.error('Firebase scores error:', err);
      setLoading(false);
    });
    const unsubSnakes = onValue(snakesRef, (snap) => setSnakes(snap.val() || {}));
    const unsubCtp = onValue(ctpRef, (snap) => setCtp(snap.val() || {}));
    const unsubSideBets = onValue(sideBetsRef, (snap) => setSideBets(snap.val() || {}));
    const unsubLocks = onValue(locksRef, (snap) => setLocks(snap.val() || {}));

    return () => { unsubScores(); unsubSnakes(); unsubCtp(); unsubSideBets(); unsubLocks(); };
  }, []);

  useEffect(() => {
    const cleanup = loadData();
    return cleanup;
  }, [loadData]);

  const saveScores = async (newScores) => {
    setScores(newScores);
    try {
      if (Object.keys(newScores).length === 0) await fbRemove(ref(db, 'scores'));
      else await fbSet(ref(db, 'scores'), newScores);
    } catch (e) { console.error('save scores:', e); }
  };
  const saveSnakes = async (newSnakes) => {
    setSnakes(newSnakes);
    try {
      if (Object.keys(newSnakes).length === 0) await fbRemove(ref(db, 'snakes'));
      else await fbSet(ref(db, 'snakes'), newSnakes);
    } catch (e) { console.error('save snakes:', e); }
  };
  const saveCtp = async (newCtp) => {
    setCtp(newCtp);
    try {
      if (Object.keys(newCtp).length === 0) await fbRemove(ref(db, 'ctp'));
      else await fbSet(ref(db, 'ctp'), newCtp);
    } catch (e) { console.error('save ctp:', e); }
  };
  const saveSideBets = async (newSideBets) => {
    setSideBets(newSideBets);
    try {
      if (Object.keys(newSideBets).length === 0) await fbRemove(ref(db, 'sideBets'));
      else await fbSet(ref(db, 'sideBets'), newSideBets);
    } catch (e) { console.error('save sideBets:', e); }
  };
  const saveLocks = async (newLocks) => {
    setLocks(newLocks);
    try {
      if (Object.keys(newLocks).length === 0) await fbRemove(ref(db, 'locks'));
      else await fbSet(ref(db, 'locks'), newLocks);
    } catch (e) { console.error('save locks:', e); }
  };

  const resetAll = async () => {
    if (!confirm('Reset ALL scores for ALL rounds? This cannot be undone.')) return;
    await saveScores({});
    await saveSnakes({});
    await saveCtp({});
    await saveSideBets({});
    await saveLocks({});
  };

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '16px' }}>
          <Flag size={48} style={{ color: '#d4a574' }} />
          <div style={{ fontSize: '12px', letterSpacing: '3px', opacity: 0.7 }}>LOADING THE CLASSIC...</div>
        </div>
      </div>
    );
  }

  const currentRound = ROUNDS[roundIdx];

  return (
    <div style={styles.wrapper}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Unifraktur+Maguntia&family=Special+Elite&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; }
        button { font-family: inherit; cursor: pointer; }
        input[type="number"] { -moz-appearance: textfield; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .fade-in { animation: fadeIn 0.4s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .pulse-dot { animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .safe-top { padding-top: calc(env(safe-area-inset-top, 20px) + 24px); }
        .safe-bottom { padding-bottom: max(env(safe-area-inset-bottom), 0px); }
      `}</style>

      {view === 'home' && (
        <HomeView
          setRoundIdx={setRoundIdx}
          setView={setView}
          scores={scores}
          snakes={snakes}
          ctp={ctp}
          sideBets={sideBets}
          locks={locks}
          resetAll={resetAll}
        />
      )}
      {view === 'round' && (
        <RoundView
          round={currentRound}
          roundIdx={roundIdx}
          scores={scores}
          snakes={snakes}
          ctp={ctp}
          sideBets={sideBets}
          locks={locks}
          saveScores={saveScores}
          saveSnakes={saveSnakes}
          saveCtp={saveCtp}
          saveSideBets={saveSideBets}
          saveLocks={saveLocks}
          setView={setView}
          setRoundIdx={setRoundIdx}
        />
      )}
      {view === 'summary' && (
        <SummaryView
          scores={scores}
          snakes={snakes}
          ctp={ctp}
          sideBets={sideBets}
          setView={setView}
        />
      )}
    </div>
  );
}

// ============= LOGO =============
function HerbtownLogo() {
  return (
    <svg width="100%" viewBox="0 0 380 460" role="img" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: '320px', display: 'block', margin: '0 auto', filter: 'drop-shadow(0 4px 14px rgba(212, 165, 116, 0.2))' }}>
      <title>The 3rd Annual Herbtown Classic</title>
      <desc>Tournament crest logo</desc>
      <defs>
        <clipPath id="shield_logo">
          <path d="M 190 40 L 320 70 L 320 240 Q 320 340 190 400 Q 60 340 60 240 L 60 70 Z"/>
        </clipPath>
        <linearGradient id="skyGrad_logo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7cb8e0"/>
          <stop offset="100%" stopColor="#c8e0f0"/>
        </linearGradient>
      </defs>

      {/* Outer shield */}
      <path d="M 190 40 L 320 70 L 320 240 Q 320 340 190 400 Q 60 340 60 240 L 60 70 Z"
        fill="#0d2818" stroke="#d4a574" strokeWidth="3"/>
      <path d="M 190 52 L 310 78 L 310 238 Q 310 332 190 388 Q 70 332 70 238 L 70 78 Z"
        fill="none" stroke="#d4a574" strokeWidth="1" opacity="0.6"/>

      {/* Sky + landscape */}
      <g clipPath="url(#shield_logo)">
        <rect x="60" y="40" width="260" height="240" fill="url(#skyGrad_logo)"/>
        <path d="M 60 230 Q 100 210 140 215 Q 180 222 220 215 Q 260 208 320 220 L 320 260 L 60 260 Z" fill="#e8d4a8"/>
        <path d="M 60 245 Q 110 225 160 230 Q 220 238 280 228 Q 310 225 320 230 L 320 265 L 60 265 Z" fill="#d4b88a" opacity="0.7"/>
        <path d="M 60 250 Q 140 240 220 248 Q 280 254 320 248 L 320 310 L 60 310 Z" fill="#6ba84e"/>
        <path d="M 60 265 Q 150 258 250 262 Q 300 266 320 260 L 320 310 L 60 310 Z" fill="#5a9840" opacity="0.8"/>
        <line x1="270" y1="218" x2="270" y2="238" stroke="#3a2510" strokeWidth="1.2"/>
        <path d="M 270 218 L 280 221 L 270 224 Z" fill="#c44b4b"/>
        <ellipse cx="110" cy="95" rx="18" ry="4" fill="#f4ead5" opacity="0.7"/>
        <ellipse cx="250" cy="110" rx="22" ry="5" fill="#f4ead5" opacity="0.6"/>
      </g>

      {/* Top banner */}
      <path d="M 40 95 Q 190 60 340 95 L 340 130 Q 190 95 40 130 Z" fill="#c44b4b" stroke="#8a2a2a" strokeWidth="1.5"/>
      <path d="M 40 95 L 30 110 L 40 130 Z" fill="#8a2a2a"/>
      <path d="M 340 95 L 350 110 L 340 130 Z" fill="#8a2a2a"/>
      <text x="190" y="117" textAnchor="middle" fontFamily="Georgia, serif" fontSize="15" fontWeight="700" fill="#f4ead5" letterSpacing="3">THE 3RD ANNUAL</text>

      {/* Stars */}
      <path d="M 60 108 L 62 112 L 66 113 L 63 116 L 64 120 L 60 118 L 56 120 L 57 116 L 54 113 L 58 112 Z" fill="#d4a574"/>
      <path d="M 320 108 L 322 112 L 326 113 L 323 116 L 324 120 L 320 118 L 316 120 L 317 116 L 314 113 L 318 112 Z" fill="#d4a574"/>

      {/* Golfer legs */}
      <path d="M 185 265 L 182 305 L 188 340 L 200 340 L 198 305 L 200 265 Z" fill="#f0f0f0" stroke="#2a2a2a" strokeWidth="1.5"/>
      <path d="M 165 265 L 160 305 L 165 340 L 180 340 L 183 305 L 185 265 Z" fill="#f4f4f4" stroke="#2a2a2a" strokeWidth="1.5"/>
      <line x1="172" y1="270" x2="170" y2="300" stroke="#d8d8d8" strokeWidth="1.5"/>
      <line x1="192" y1="270" x2="190" y2="300" stroke="#d8d8d8" strokeWidth="1.5"/>

      {/* Socks */}
      <rect x="160" y="340" width="20" height="18" fill="#1a1a1a" stroke="#0a0a0a" strokeWidth="1"/>
      <rect x="185" y="340" width="18" height="18" fill="#1a1a1a" stroke="#0a0a0a" strokeWidth="1"/>

      {/* Shoes */}
      <ellipse cx="170" cy="365" rx="15" ry="6" fill="#f8f8f8" stroke="#1a1a1a" strokeWidth="1.3"/>
      <ellipse cx="170" cy="362" rx="12" ry="3" fill="#ffffff"/>
      <line x1="165" y1="364" x2="163" y2="367" stroke="#1a1a1a" strokeWidth="1.5"/>
      <line x1="169" y1="364" x2="167" y2="367" stroke="#1a1a1a" strokeWidth="1.5"/>
      <line x1="173" y1="364" x2="171" y2="367" stroke="#1a1a1a" strokeWidth="1.5"/>
      <line x1="168" y1="361" x2="172" y2="363" stroke="#c8c8c8" strokeWidth="0.8"/>
      <line x1="167" y1="363" x2="173" y2="361" stroke="#c8c8c8" strokeWidth="0.8"/>
      <ellipse cx="195" cy="365" rx="14" ry="5.5" fill="#f8f8f8" stroke="#1a1a1a" strokeWidth="1.3"/>
      <ellipse cx="195" cy="362" rx="11" ry="3" fill="#ffffff"/>
      <line x1="191" y1="364" x2="189" y2="367" stroke="#1a1a1a" strokeWidth="1.5"/>
      <line x1="194" y1="364" x2="192" y2="367" stroke="#1a1a1a" strokeWidth="1.5"/>
      <line x1="197" y1="364" x2="195" y2="367" stroke="#1a1a1a" strokeWidth="1.5"/>

      {/* Polo */}
      <path d="M 163 220 Q 155 245 165 265 L 205 265 Q 215 245 207 220 Q 200 215 185 213 Q 172 215 163 220 Z" fill="#1e3a5f" stroke="#0a1a2f" strokeWidth="1.5"/>
      <path d="M 178 217 L 182 225 L 185 220 L 188 225 L 192 217 Q 185 215 178 217 Z" fill="#1e3a5f" stroke="#0a1a2f" strokeWidth="1.2"/>
      <line x1="185" y1="220" x2="185" y2="235" stroke="#0a1a2f" strokeWidth="1"/>
      <circle cx="185" cy="225" r="0.8" fill="#f4ead5"/>
      <circle cx="185" cy="232" r="0.8" fill="#f4ead5"/>
      <circle cx="197" cy="233" r="2.5" fill="#4a9fc8" opacity="0.9"/>

      {/* Arms */}
      <path d="M 165 230 Q 155 255 165 285 Q 175 290 185 285 Z" fill="#1e3a5f" stroke="#0a1a2f" strokeWidth="1.5"/>
      <path d="M 207 230 Q 215 250 200 275 Q 190 285 180 283 Z" fill="#1e3a5f" stroke="#0a1a2f" strokeWidth="1.5"/>
      <path d="M 160 245 Q 155 248 157 252" fill="none" stroke="#0a1a2f" strokeWidth="1"/>
      <path d="M 212 245 Q 217 248 215 252" fill="none" stroke="#0a1a2f" strokeWidth="1"/>

      {/* Forearms */}
      <path d="M 165 280 Q 160 290 170 298 L 180 298 Q 185 290 180 282 Z" fill="#d4a890" stroke="#3a2510" strokeWidth="1.2"/>
      <path d="M 195 278 Q 205 287 198 298 L 190 298 Q 186 290 188 280 Z" fill="#d4a890" stroke="#3a2510" strokeWidth="1.2"/>

      {/* Hands */}
      <path d="M 168 296 Q 165 303 172 308 Q 178 308 182 303 Q 185 298 180 296 Z" fill="#f8f8f8" stroke="#2a2a2a" strokeWidth="1.2"/>
      <path d="M 183 298 Q 188 302 193 305 Q 196 307 193 310 Q 186 309 180 305 Z" fill="#d4a890" stroke="#3a2510" strokeWidth="1.2"/>

      {/* Club */}
      <line x1="188" y1="298" x2="194" y2="288" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round"/>
      <line x1="188" y1="300" x2="225" y2="360" stroke="#c8c8c8" strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="188" y1="300" x2="225" y2="360" stroke="#8a8a8a" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
      <ellipse cx="228" cy="362" rx="11" ry="6" fill="#1a1a1a" stroke="#0a0a0a" strokeWidth="1.2" transform="rotate(-15 228 362)"/>
      <ellipse cx="226" cy="360" rx="6" ry="3" fill="#4a4a4a" transform="rotate(-15 228 362)"/>
      <circle cx="228" cy="361" r="1" fill="#c44b4b"/>

      {/* Ball + tee */}
      <ellipse cx="243" cy="363" rx="3.5" ry="3.5" fill="#ffffff" stroke="#1a1a1a" strokeWidth="0.8"/>
      <circle cx="242" cy="362" r="0.3" fill="#8a8a8a"/>
      <circle cx="244" cy="363" r="0.3" fill="#8a8a8a"/>
      <circle cx="243" cy="364" r="0.3" fill="#8a8a8a"/>
      <path d="M 240 367 L 241 372 L 245 372 L 246 367 Z" fill="#f4ead5" stroke="#3a2510" strokeWidth="0.7"/>

      {/* Head */}
      <ellipse cx="188" cy="200" rx="19" ry="22" fill="#d4a890" stroke="#3a2510" strokeWidth="1.5"/>
      <path d="M 172 190 Q 188 195 205 190 Q 205 198 188 200 Q 172 198 172 190 Z" fill="#3a2510" opacity="0.35"/>
      <path d="M 178 213 Q 188 218 198 213 Q 195 218 188 220 Q 181 218 178 213 Z" fill="#3a2510" opacity="0.15"/>

      {/* Aviators */}
      <line x1="186" y1="201" x2="190" y2="201" stroke="#c8a858" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M 174 199 Q 172 203 174 207 Q 178 210 183 208 Q 186 206 186 202 Q 186 199 184 198 Q 179 197 174 199 Z" fill="#2a3a4a" stroke="#c8a858" strokeWidth="1.3"/>
      <path d="M 175 200 Q 178 199 181 200 Q 180 202 177 202 Q 175 201 175 200 Z" fill="#7ca8c8" opacity="0.7"/>
      <ellipse cx="179" cy="204" rx="1.5" ry="0.8" fill="#a8c8e0" opacity="0.5"/>
      <path d="M 202 199 Q 204 203 202 207 Q 198 210 193 208 Q 190 206 190 202 Q 190 199 192 198 Q 197 197 202 199 Z" fill="#2a3a4a" stroke="#c8a858" strokeWidth="1.3"/>
      <path d="M 195 200 Q 198 199 201 200 Q 200 202 197 202 Q 195 201 195 200 Z" fill="#7ca8c8" opacity="0.7"/>
      <ellipse cx="199" cy="204" rx="1.5" ry="0.8" fill="#a8c8e0" opacity="0.5"/>
      <line x1="174" y1="199" x2="186" y2="199" stroke="#c8a858" strokeWidth="0.8"/>
      <line x1="190" y1="199" x2="202" y2="199" stroke="#c8a858" strokeWidth="0.8"/>

      {/* Smile */}
      <path d="M 184 211 Q 188 213 192 211" fill="none" stroke="#3a2510" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M 188 205 Q 186 209 188 211" fill="none" stroke="#3a2510" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>

      {/* Neck */}
      <path d="M 180 218 L 178 228 L 198 228 L 196 218 Z" fill="#d4a890" stroke="#3a2510" strokeWidth="1.2"/>

      {/* Straw fedora with ALO */}
      <ellipse cx="188" cy="180" rx="34" ry="5.5" fill="#c9a876" stroke="#8a6a3a" strokeWidth="1.5"/>
      <ellipse cx="188" cy="178" rx="34" ry="4" fill="#d8b888"/>
      <path d="M 158 180 Q 173 183 188 180 Q 203 183 218 180" fill="none" stroke="#a88858" strokeWidth="0.4" opacity="0.7"/>
      <path d="M 160 182 Q 175 184 188 181 Q 201 184 216 182" fill="none" stroke="#a88858" strokeWidth="0.4" opacity="0.6"/>
      <path d="M 170 178 Q 168 165 171 158 Q 178 153 188 152 Q 198 153 205 158 Q 208 165 206 178 Z" fill="#c9a876" stroke="#8a6a3a" strokeWidth="1.5"/>
      <path d="M 172 161 Q 188 159 204 161" fill="none" stroke="#a88858" strokeWidth="0.4" opacity="0.7"/>
      <path d="M 171 166 Q 188 164 205 166" fill="none" stroke="#a88858" strokeWidth="0.4" opacity="0.6"/>
      <ellipse cx="188" cy="174" rx="18" ry="3.2" fill="#1a1a1a" stroke="#0a0a0a" strokeWidth="0.6"/>
      <text x="188" y="177" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="6" fontWeight="700" fill="#f4ead5" letterSpacing="1.2">ALO</text>
      <path d="M 173 185 Q 180 183 185 184 M 192 184 Q 198 183 203 185" fill="none" stroke="#2a1810" strokeWidth="2" strokeLinecap="round"/>

      {/* Watch */}
      <rect x="172" y="291" width="4" height="3" fill="#e8e8e8" stroke="#1a1a1a" strokeWidth="0.6"/>

      {/* Ground shadow */}
      <ellipse cx="185" cy="372" rx="40" ry="4" fill="#1a1a1a" opacity="0.2"/>

      {/* Bottom banner */}
      <path d="M 40 360 Q 190 395 340 360 L 340 405 Q 190 440 40 405 Z" fill="#c44b4b" stroke="#8a2a2a" strokeWidth="1.5"/>
      <path d="M 40 360 L 30 380 L 40 405 Z" fill="#8a2a2a"/>
      <path d="M 340 360 L 350 380 L 340 405 Z" fill="#8a2a2a"/>
      <text x="190" y="390" textAnchor="middle" fontFamily="Georgia, serif" fontSize="22" fontWeight="700" fill="#f4ead5" letterSpacing="2">HERBTOWN</text>
      <text x="190" y="412" textAnchor="middle" fontFamily="Georgia, serif" fontSize="14" fontWeight="700" fill="#f4ead5" letterSpacing="4">CLASSIC</text>
      <text x="190" y="442" textAnchor="middle" fontFamily="Georgia, serif" fontSize="11" fontStyle="italic" fill="#d4a574" letterSpacing="2">BIG CEDAR LODGE · MMXXVI</text>
    </svg>
  );
}

// ============= HOME VIEW =============
function HomeView({ setRoundIdx, setView, scores, snakes, ctp, sideBets, locks, resetAll }) {
  return (
    <div className="fade-in safe-top" style={{ paddingLeft: '18px', paddingRight: '18px', paddingBottom: '100px', maxWidth: '500px', margin: '0 auto' }}>
      {/* Header - Logo */}
      <div style={{ textAlign: 'center', marginBottom: '20px', paddingTop: '8px' }}>
        <HerbtownLogo />
        <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '10px', opacity: 0.6 }}>
          <span className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6b9e4e', display: 'inline-block' }}></span>
          LIVE · SYNCED
        </div>
      </div>

      {/* Live Tracker */}
      <LiveTracker scores={scores} setRoundIdx={setRoundIdx} setView={setView} />

      {/* Trip Standings */}
      <TripStandings scores={scores} snakes={snakes} ctp={ctp} sideBets={sideBets} />

      {/* Rounds */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '10px', letterSpacing: '3px', color: '#d4a574', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, #d4a574)' }}></div>
          THE ROUNDS
          <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, #d4a574, transparent)' }}></div>
        </div>
        {ROUNDS.map((r, i) => {
          const progress = getRoundProgress(r, scores);
          const isLocked = !!locks?.[r.id];
          return (
            <button
              key={r.id}
              onClick={() => { setRoundIdx(i); setView('round'); }}
              style={{
                width: '100%',
                marginBottom: '8px',
                padding: '14px 16px',
                background: isLocked ? 'rgba(212, 165, 116, 0.1)' : (progress === r.holes ? 'rgba(107, 158, 78, 0.12)' : 'rgba(244, 234, 213, 0.05)'),
                border: `1px solid ${isLocked ? '#d4a574' : (progress === r.holes ? '#6b9e4e' : 'rgba(212, 165, 116, 0.3)')}`,
                borderRadius: '2px',
                color: '#f4ead5',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '2px', color: '#d4a574', opacity: 0.85 }}>
                  {r.day}
                </div>
                <div style={{ fontFamily: '"Special Elite", serif', fontSize: '17px', marginTop: '2px' }}>
                  {r.name}
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {PLAYERS.map((p) => (
                    <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', opacity: 0.75 }}>
                      <span style={{ opacity: 0.7 }}>{p}:</span>
                      <TeeBadge tee={r.tees[p]} />
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '5px' }}>
                  {progress}/{r.holes} holes{isLocked ? ' · LOCKED' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isLocked && <Lock size={14} style={{ color: '#d4a574' }} />}
                {!isLocked && progress === r.holes && <Check size={16} style={{ color: '#6b9e4e' }} />}
                <ChevronRight size={18} style={{ opacity: 0.5 }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer actions */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button
          onClick={() => setView('summary')}
          style={{
            flex: 1,
            padding: '14px',
            background: 'rgba(212, 165, 116, 0.15)',
            border: '1px solid #d4a574',
            borderRadius: '2px',
            color: '#d4a574',
            fontSize: '11px',
            letterSpacing: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontWeight: 600,
          }}
        >
          <Trophy size={14} /> THE LEDGER
        </button>
      </div>
    </div>
  );
}

function getRoundProgress(round, scores) {
  const roundScores = scores[round.id] || {};
  let completed = 0;
  for (let h = 0; h < round.holes; h++) {
    const holeScores = roundScores[h] || {};
    if (PLAYERS.every((p) => holeScores[p] != null && holeScores[p] !== '')) {
      completed++;
    }
  }
  return completed;
}

// ============= LIVE TRACKER =============
function LiveTracker({ scores, setRoundIdx, setView }) {
  // Find the "current" round: first round with any scores that isn't fully complete,
  // or the most recently-touched incomplete round.
  let activeRoundIdx = -1;
  let activeRound = null;
  let currentHole = 0;

  for (let i = 0; i < ROUNDS.length; i++) {
    const r = ROUNDS[i];
    const rs = scores[r.id] || {};
    const hasAnyScore = Object.keys(rs).length > 0;
    const completed = getRoundProgress(r, scores);
    if (hasAnyScore && completed < r.holes) {
      activeRoundIdx = i;
      activeRound = r;
      // Find first hole without all 3 scores
      for (let h = 0; h < r.holes; h++) {
        const hs = rs[h] || {};
        if (!PLAYERS.every((p) => hs[p] != null && hs[p] !== '')) {
          currentHole = h;
          break;
        }
      }
      break;
    }
  }

  // If no in-progress round, nothing to show
  if (!activeRound) return null;

  const roundScores = scores[activeRound.id] || {};

  // Running total scores per player (through most recent completed hole)
  const running = {};
  const holesCompleted = {};
  PLAYERS.forEach((p) => {
    running[p] = 0;
    holesCompleted[p] = 0;
    for (let h = 0; h < activeRound.holes; h++) {
      const s = roundScores[h]?.[p];
      if (s != null && s !== '') {
        const n = parseInt(s, 10);
        if (!isNaN(n)) {
          running[p] += n;
          holesCompleted[p] += 1;
        }
      }
    }
  });

  // Par through the number of holes they've played
  const parThrough = (p) => {
    let par = 0;
    for (let h = 0; h < holesCompleted[p]; h++) {
      par += activeRound.pars[h] || 0;
    }
    return par;
  };

  return (
    <div
      onClick={() => { setRoundIdx(activeRoundIdx); setView('round'); }}
      style={{
        marginBottom: '14px',
        padding: '14px',
        background: 'rgba(107, 158, 78, 0.08)',
        border: '1px solid #6b9e4e',
        borderRadius: '2px',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6b9e4e', display: 'inline-block' }}></span>
          <div>
            <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#6b9e4e', fontWeight: 700 }}>LIVE NOW</div>
            <div style={{ fontFamily: '"Special Elite", serif', fontSize: '15px', color: '#f4ead5' }}>{activeRound.name}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '9px', letterSpacing: '2px', opacity: 0.6 }}>HOLE</div>
          <div style={{ fontFamily: '"Unifraktur Maguntia", serif', fontSize: '26px', color: '#d4a574', lineHeight: 1 }}>
            {currentHole + 1}
          </div>
        </div>
      </div>

      {/* Per-player running line */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '10px' }}>
        {PLAYERS.map((p) => {
          const score = running[p];
          const par = parThrough(p);
          const toPar = score - par;
          const toParLabel = holesCompleted[p] === 0 ? '—' : (toPar === 0 ? 'E' : (toPar > 0 ? `+${toPar}` : `${toPar}`));
          const toParColor = toPar < 0 ? '#6b9e4e' : (toPar > 0 ? '#c44b4b' : '#d4a574');
          return (
            <div key={p} style={{ padding: '6px', background: 'rgba(0,0,0,0.25)', borderRadius: '2px', textAlign: 'center' }}>
              <div style={{ fontFamily: '"Special Elite", serif', fontSize: '11px', color: '#d4a574', marginBottom: '2px' }}>{p}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: toParColor, lineHeight: 1 }}>{toParLabel}</div>
              <div style={{ fontSize: '9px', opacity: 0.55, marginTop: '2px' }}>
                {holesCompleted[p] === 0 ? 'not yet' : `thru ${holesCompleted[p]}`}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '8px', fontSize: '9px', opacity: 0.55, textAlign: 'center', letterSpacing: '1px' }}>
        TAP TO VIEW ROUND
      </div>
    </div>
  );
}

// ============= TRIP STANDINGS =============
function TripStandings({ scores, snakes, ctp, sideBets }) {
  const { totals } = computeTripTotals(scores, snakes, ctp, sideBets);
  const maxTotal = Math.max(...PLAYERS.map((p) => totals[p].total));

  return (
    <div style={{
      background: 'rgba(244, 234, 213, 0.04)',
      border: '1px solid rgba(212, 165, 116, 0.3)',
      padding: '16px 14px',
      marginBottom: '20px',
      borderRadius: '2px',
    }}>
      <div style={{ fontSize: '10px', letterSpacing: '3px', color: '#d4a574', marginBottom: '12px', textAlign: 'center' }}>
        ⟢ THE STANDINGS ⟢
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.55fr 0.55fr 0.45fr 0.5fr 0.75fr', gap: '5px', fontSize: '9px', opacity: 0.55, letterSpacing: '1px', marginBottom: '6px', padding: '0 2px' }}>
        <div>PLAYER</div>
        <div style={{ textAlign: 'center' }}>STROKE</div>
        <div style={{ textAlign: 'center' }}>MATCH</div>
        <div style={{ textAlign: 'center' }}>🐍</div>
        <div style={{ textAlign: 'center' }}>⚡</div>
        <div style={{ textAlign: 'right' }}>TOTAL</div>
      </div>
      {PLAYERS.map((p, idx) => {
        const t = totals[p];
        const leader = t.total === maxTotal && maxTotal !== 0;
        return (
          <div key={p} style={{
            display: 'grid',
            gridTemplateColumns: '1fr 0.55fr 0.55fr 0.45fr 0.5fr 0.75fr',
            gap: '5px',
            padding: '9px 2px',
            borderBottom: idx < 2 ? '1px dashed rgba(212, 165, 116, 0.15)' : 'none',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {leader && <Crown size={11} style={{ color: '#d4a574', flexShrink: 0 }} />}
              <span style={{ fontFamily: '"Special Elite", serif', fontSize: '14px' }}>{p}</span>
            </div>
            <div style={{ textAlign: 'center', fontSize: '12px', color: t.stroke >= 0 ? '#6b9e4e' : '#c44b4b' }}>
              {t.stroke >= 0 ? '+' : ''}{t.stroke}
            </div>
            <div style={{ textAlign: 'center', fontSize: '12px', color: t.match >= 0 ? '#6b9e4e' : '#c44b4b' }}>
              {t.match >= 0 ? '+' : ''}{t.match}
            </div>
            <div style={{ textAlign: 'center', fontSize: '12px', color: t.snake >= 0 ? '#6b9e4e' : '#c44b4b' }}>
              {t.snake >= 0 ? '+' : ''}{t.snake}
            </div>
            <div style={{ textAlign: 'center', fontSize: '12px', color: t.side >= 0 ? '#6b9e4e' : '#c44b4b' }}>
              {t.side >= 0 ? '+' : ''}{t.side}
            </div>
            <div style={{ textAlign: 'right', fontSize: '15px', fontWeight: 700, color: t.total >= 0 ? '#6b9e4e' : '#c44b4b' }}>
              {t.total >= 0 ? '+' : ''}${t.total}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function computeTripTotals(scores, snakes, ctp, sideBets) {
  const totals = {};
  PLAYERS.forEach((p) => { totals[p] = { stroke: 0, match: 0, snake: 0, side: 0, total: 0, matchPoints: 0 }; });

  // Pairwise debts: debts[from][to] = amount from owes to (positive)
  const debts = {};
  PLAYERS.forEach((p) => {
    debts[p] = {};
    PLAYERS.forEach((q) => { if (p !== q) debts[p][q] = 0; });
  });

  ROUNDS.forEach((round) => {
    const r = computeRoundResults(round, scores, snakes, ctp);
    PLAYERS.forEach((p) => {
      totals[p].stroke += r.strokePayouts[p] || 0;
      totals[p].match += r.matchPayouts[p] || 0;
      totals[p].snake += r.snakePayouts[p] || 0;
      totals[p].matchPoints += r.matchPoints[p] || 0;
    });

    // Pairwise from stroke play (treat 1st->3rd pays $40, 2nd->3rd swaps $30)
    // Simpler: for each pair, subtract the difference between their stroke payouts divided proportionally
    // Actually easier — use the computed payouts to derive who pays whom pairwise:
    addStrokeDebts(debts, r.strokePayouts);
    // Match play: per-hole we know winners. Aggregated at trip level as net totals per player.
    addMatchDebts(debts, r.matchDetails);
    // Snakes: last holders split the pot owed to non-holders
    if (r.snakePayment.losers && r.snakePayment.losers.length > 0 && r.snakePayment.amount > 0 && !r.snakePayment.wash) {
      const losers = r.snakePayment.losers;
      const nonLosers = PLAYERS.filter((p) => !losers.includes(p));
      if (nonLosers.length > 0) {
        const perLoser = r.snakePayment.amount / losers.length;
        const perRecipient = perLoser / nonLosers.length;
        losers.forEach((loser) => {
          nonLosers.forEach((winner) => {
            debts[loser][winner] += perRecipient;
          });
        });
      }
    }
  });

  // Side bets: iterate every hole, apply winner-takes-amount to pairwise
  Object.keys(sideBets || {}).forEach((roundId) => {
    const roundBets = sideBets[roundId] || {};
    Object.keys(roundBets).forEach((holeIdx) => {
      const bets = roundBets[holeIdx] || [];
      bets.forEach((bet) => {
        if (!bet.winner) return;
        const loser = bet.winner === bet.player1 ? bet.player2 : bet.player1;
        if (!PLAYERS.includes(bet.winner) || !PLAYERS.includes(loser)) return;
        debts[loser][bet.winner] += bet.amount;
        totals[bet.winner].side += bet.amount;
        totals[loser].side -= bet.amount;
      });
    });
  });

  PLAYERS.forEach((p) => {
    totals[p].total = totals[p].stroke + totals[p].match + totals[p].snake + totals[p].side;
    totals[p].stroke = Math.round(totals[p].stroke);
    totals[p].match = Math.round(totals[p].match);
    totals[p].snake = Math.round(totals[p].snake);
    totals[p].side = Math.round(totals[p].side);
    totals[p].total = Math.round(totals[p].total);
  });

  // Simplify: if both A→B and B→A, net them
  const netDebts = {};
  PLAYERS.forEach((p) => {
    netDebts[p] = {};
    PLAYERS.forEach((q) => { if (p !== q) netDebts[p][q] = 0; });
  });
  for (let i = 0; i < PLAYERS.length; i++) {
    for (let j = i + 1; j < PLAYERS.length; j++) {
      const a = PLAYERS[i], b = PLAYERS[j];
      const aToB = debts[a][b] || 0;
      const bToA = debts[b][a] || 0;
      const net = aToB - bToA;
      if (net > 0) netDebts[a][b] = net;
      else if (net < 0) netDebts[b][a] = -net;
    }
  }

  return { totals, debts, netDebts };
}

// Helper: stroke payouts can be derived pairwise
// With $70/$0/-$70 (or variant for ties), the 1st place "receives" from 2nd and 3rd.
// We approximate pairwise from the amounts: distribute each player's payout proportionally.
function addStrokeDebts(debts, strokePayouts) {
  // Standard case: 1st gets +70 ($40 from 3rd, $30 from 2nd)
  //                2nd gets  0 (−$30 to 1st, +$30 from 3rd) — effectively 3rd pays 2nd $30, 2nd pays 1st $30
  //                3rd gets -70 (pays $40 to 1st, $30 to 2nd)
  // Tie 1-2: split $35 each from 3rd (3rd pays each $35, total $70)
  // Tie 2-3: each pays $35 to 1st
  const entries = Object.entries(strokePayouts).sort((a, b) => b[1] - a[1]);
  const [p1, v1] = entries[0];
  const [p2, v2] = entries[1];
  const [p3, v3] = entries[2];

  if (v1 === 0 && v2 === 0 && v3 === 0) return; // no data

  if (v1 === 70 && v2 === 0 && v3 === -70) {
    debts[p3][p1] += 40;
    debts[p2][p1] += 30;
    debts[p3][p2] += 30;
  } else if (v1 === 35 && v2 === 35 && v3 === -70) {
    debts[p3][p1] += 35;
    debts[p3][p2] += 35;
  } else if (v1 === 70 && v2 === -35 && v3 === -35) {
    debts[p2][p1] += 35;
    debts[p3][p1] += 35;
  }
}

// Match play is zero-sum per hole. matchDetails contains per-hole winners.
function addMatchDebts(debts, matchDetails) {
  if (!matchDetails) return;
  matchDetails.forEach((h) => {
    // h = { winner: 'solo'|'team'|null, soloPlayer, teamPlayers }
    if (!h.winner) return;
    if (h.winner === 'solo') {
      // solo wins $8: $4 from each team member
      h.teamPlayers.forEach((p) => { debts[p][h.soloPlayer] += MATCH_POINT_VALUE; });
    } else if (h.winner === 'team') {
      // team wins $4 each from solo ($8 total from solo)
      h.teamPlayers.forEach((p) => { debts[h.soloPlayer][p] += MATCH_POINT_VALUE; });
    }
  });
}

// ============= ROUND VIEW =============
function RoundView({ round, roundIdx, scores, snakes, ctp, sideBets, locks, saveScores, saveSnakes, saveCtp, saveSideBets, saveLocks, setView, setRoundIdx }) {
  const [currentHole, setCurrentHole] = useState(0);
  const [showSideBetModal, setShowSideBetModal] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);
  const roundScores = scores[round.id] || {};
  const roundSnakes = snakes[round.id] || {};
  const roundCtp = ctp[round.id] || {};
  const roundSideBets = sideBets[round.id] || {};
  const isLocked = !!locks?.[round.id];

  // Round is complete when all holes have all 3 player scores
  const roundComplete = (() => {
    for (let h = 0; h < round.holes; h++) {
      const hs = roundScores[h] || {};
      if (!PLAYERS.every((p) => hs[p] != null && hs[p] !== '')) return false;
    }
    return true;
  })();

  const toggleLock = async () => {
    if (isLocked) {
      if (!confirm('Unlock this round? Scores will become editable again.')) return;
      const newLocks = { ...locks };
      delete newLocks[round.id];
      await saveLocks(newLocks);
    } else {
      if (!confirm('Lock in this round? No more edits will be allowed (can be unlocked if needed).')) return;
      await saveLocks({ ...locks, [round.id]: true });
    }
  };

  useEffect(() => {
    for (let h = 0; h < round.holes; h++) {
      const hs = roundScores[h] || {};
      if (!PLAYERS.every((p) => hs[p] != null && hs[p] !== '')) {
        setCurrentHole(h);
        return;
      }
    }
    setCurrentHole(round.holes - 1);
  }, [round.id]);

  const setHoleScore = (holeIdx, player, value) => {
    if (isLocked) return;
    const newScores = { ...scores };
    if (!newScores[round.id]) newScores[round.id] = {};
    if (!newScores[round.id][holeIdx]) newScores[round.id][holeIdx] = {};
    newScores[round.id][holeIdx][player] = value;
    saveScores(newScores);
  };

  const toggleSnake = (holeIdx, player) => {
    if (isLocked) return;
    const newSnakes = { ...snakes };
    if (!newSnakes[round.id]) newSnakes[round.id] = {};
    // Normalize current value to array (handles legacy string entries)
    const current = newSnakes[round.id][holeIdx];
    let arr = Array.isArray(current) ? [...current] : (current ? [current] : []);
    if (arr.includes(player)) {
      arr = arr.filter((p) => p !== player);
    } else {
      arr.push(player);
    }
    if (arr.length === 0) {
      delete newSnakes[round.id][holeIdx];
    } else {
      newSnakes[round.id][holeIdx] = arr;
    }
    saveSnakes(newSnakes);
  };

  const setCtpWinner = (holeIdx, player) => {
    if (isLocked) return;
    const newCtp = { ...ctp };
    if (!newCtp[round.id]) newCtp[round.id] = {};
    if (newCtp[round.id][holeIdx] === player) {
      delete newCtp[round.id][holeIdx];
    } else {
      newCtp[round.id][holeIdx] = player;
    }
    saveCtp(newCtp);
  };

  const clearHole = (holeIdx) => {
    if (isLocked) return;
    if (!confirm(`Clear all scores for hole ${holeIdx + 1}? (Snakes, CTP, and side bets on this hole will also be cleared.)`)) return;
    // Clear scores
    const newScores = { ...scores };
    if (newScores[round.id]?.[holeIdx]) {
      const rc = { ...newScores[round.id] };
      delete rc[holeIdx];
      newScores[round.id] = rc;
    }
    saveScores(newScores);
    // Clear snake
    const newSnakes = { ...snakes };
    if (newSnakes[round.id]?.[holeIdx]) {
      const rs = { ...newSnakes[round.id] };
      delete rs[holeIdx];
      newSnakes[round.id] = rs;
    }
    saveSnakes(newSnakes);
    // Clear CTP
    const newCtp = { ...ctp };
    if (newCtp[round.id]?.[holeIdx]) {
      const rct = { ...newCtp[round.id] };
      delete rct[holeIdx];
      newCtp[round.id] = rct;
    }
    saveCtp(newCtp);
    // Clear side bets
    const newSB = { ...sideBets };
    if (newSB[round.id]?.[holeIdx]) {
      const rsb = { ...newSB[round.id] };
      delete rsb[holeIdx];
      newSB[round.id] = rsb;
    }
    saveSideBets(newSB);
  };

  const addSideBet = (holeIdx, bet) => {
    if (isLocked) return;
    // bet = { player1, player2, amount, winner: null }
    const newSB = { ...sideBets };
    if (!newSB[round.id]) newSB[round.id] = {};
    if (!newSB[round.id][holeIdx]) newSB[round.id][holeIdx] = [];
    const betWithId = { ...bet, id: Date.now().toString() };
    newSB[round.id][holeIdx] = [...newSB[round.id][holeIdx], betWithId];
    saveSideBets(newSB);
  };

  const setSideBetWinner = (holeIdx, betId, winner) => {
    if (isLocked) return;
    const newSB = { ...sideBets };
    if (!newSB[round.id]?.[holeIdx]) return;
    newSB[round.id][holeIdx] = newSB[round.id][holeIdx].map((b) =>
      b.id === betId ? { ...b, winner: b.winner === winner ? null : winner } : b
    );
    saveSideBets(newSB);
  };

  const removeSideBet = (holeIdx, betId) => {
    if (isLocked) return;
    const newSB = { ...sideBets };
    if (!newSB[round.id]?.[holeIdx]) return;
    newSB[round.id][holeIdx] = newSB[round.id][holeIdx].filter((b) => b.id !== betId);
    if (newSB[round.id][holeIdx].length === 0) {
      const rsb = { ...newSB[round.id] };
      delete rsb[holeIdx];
      newSB[round.id] = rsb;
    }
    saveSideBets(newSB);
  };

  const results = computeRoundResults(round, scores, snakes, ctp);
  const teams = round.type === 'standard' ? generateTeams(round.id) : null;

  return (
    <div className="fade-in safe-top" style={{ paddingLeft: '14px', paddingRight: '14px', paddingBottom: '120px', maxWidth: '500px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <button
          onClick={() => setView('home')}
          style={{
            padding: '7px 10px',
            background: 'transparent',
            border: '1px solid rgba(212, 165, 116, 0.3)',
            color: '#d4a574',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            letterSpacing: '2px',
          }}
        >
          <ChevronLeft size={13} /> BACK
        </button>
        <div style={{ flex: 1 }}></div>
        <button
          onClick={() => roundIdx > 0 && setRoundIdx(roundIdx - 1)}
          disabled={roundIdx === 0}
          style={{ padding: '6px', background: 'transparent', border: 'none', color: '#d4a574', opacity: roundIdx === 0 ? 0.2 : 1 }}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: '10px', letterSpacing: '2px', opacity: 0.6 }}>{roundIdx + 1}/{ROUNDS.length}</span>
        <button
          onClick={() => roundIdx < ROUNDS.length - 1 && setRoundIdx(roundIdx + 1)}
          disabled={roundIdx === ROUNDS.length - 1}
          style={{ padding: '6px', background: 'transparent', border: 'none', color: '#d4a574', opacity: roundIdx === ROUNDS.length - 1 ? 0.2 : 1 }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Title */}
      <div style={{ marginBottom: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#d4a574', marginBottom: '2px' }}>{round.day.toUpperCase()}</div>
        <h2 style={{ fontFamily: '"Unifraktur Maguntia", serif', fontSize: '28px', margin: 0, color: '#f4ead5' }}>
          {round.name}
        </h2>
        {round.type === 'standard' && teams && (
          <div style={{ fontSize: '10px', marginTop: '6px', opacity: 0.55, letterSpacing: '1px' }}>
            Solo rotation: {teams[0]} → {teams[1]} → {teams[2]}
          </div>
        )}
        {round.type === 'cliffhangers' && (
          <div style={{ fontSize: '10px', marginTop: '6px', opacity: 0.55, letterSpacing: '1px' }}>
            No handicaps · CTP per hole · Snakes · Overall strokes
          </div>
        )}
      </div>

      {/* Lock banner */}
      {isLocked && (
        <div style={{
          padding: '12px',
          marginBottom: '10px',
          background: 'rgba(212, 165, 116, 0.15)',
          border: '2px solid #d4a574',
          borderRadius: '2px',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
        }}>
          <Lock size={18} style={{ color: '#d4a574' }} />
          <div>
            <div style={{ fontSize: '11px', letterSpacing: '3px', color: '#d4a574', fontWeight: 700 }}>ROUND LOCKED</div>
            <div style={{ fontSize: '9px', opacity: 0.7, letterSpacing: '1px', marginTop: '2px' }}>No more edits allowed</div>
          </div>
        </div>
      )}

      {/* View Full Scorecard button */}
      <button
        onClick={() => setShowScorecard(true)}
        style={{
          width: '100%',
          padding: '10px',
          marginBottom: '10px',
          background: 'rgba(212, 165, 116, 0.12)',
          border: '1px solid rgba(212, 165, 116, 0.5)',
          color: '#d4a574',
          borderRadius: '2px',
          fontSize: '10px',
          letterSpacing: '2px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <Grid3x3 size={13} /> VIEW FULL SCORECARD
      </button>

      <HoleStrip round={round} currentHole={currentHole} setCurrentHole={setCurrentHole} roundScores={roundScores} />

      <HoleCard
        round={round}
        holeIdx={currentHole}
        roundScores={roundScores}
        roundSnakes={roundSnakes}
        roundCtp={roundCtp}
        roundSideBets={roundSideBets}
        setHoleScore={setHoleScore}
        toggleSnake={toggleSnake}
        setCtpWinner={setCtpWinner}
        clearHole={clearHole}
        setShowSideBetModal={setShowSideBetModal}
        setSideBetWinner={setSideBetWinner}
        removeSideBet={removeSideBet}
        teams={teams}
      />

      {showSideBetModal && (
        <SideBetModal
          holeIdx={currentHole}
          onAdd={(bet) => { addSideBet(currentHole, bet); setShowSideBetModal(false); }}
          onClose={() => setShowSideBetModal(false)}
        />
      )}

      {showScorecard && (
        <ScorecardModal
          round={round}
          roundScores={roundScores}
          roundSnakes={roundSnakes}
          roundCtp={roundCtp}
          results={results}
          onJumpToHole={(h) => { setCurrentHole(h); setShowScorecard(false); }}
          onClose={() => setShowScorecard(false)}
        />
      )}

      {/* Nav */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button
          onClick={() => currentHole > 0 && setCurrentHole(currentHole - 1)}
          disabled={currentHole === 0}
          style={{
            flex: 1, padding: '14px',
            background: 'transparent',
            border: '1px solid rgba(212, 165, 116, 0.3)',
            color: '#d4a574', borderRadius: '2px',
            opacity: currentHole === 0 ? 0.3 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            fontSize: '11px', letterSpacing: '2px',
          }}
        >
          <ChevronLeft size={14} /> PREV
        </button>
        <button
          onClick={() => currentHole < round.holes - 1 && setCurrentHole(currentHole + 1)}
          disabled={currentHole === round.holes - 1}
          style={{
            flex: 1, padding: '14px',
            background: '#d4a574',
            border: '1px solid #d4a574',
            color: '#0a1f0f', borderRadius: '2px',
            opacity: currentHole === round.holes - 1 ? 0.3 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            fontSize: '11px', letterSpacing: '2px', fontWeight: 700,
          }}
        >
          NEXT HOLE <ChevronRight size={14} />
        </button>
      </div>

      <RoundSummary round={round} results={results} roundSideBets={roundSideBets} />

      {/* Lock In Round button (only if round is complete) */}
      {(roundComplete || isLocked) && (
        <button
          onClick={toggleLock}
          style={{
            width: '100%',
            marginTop: '14px',
            padding: '14px',
            background: isLocked ? 'rgba(244, 234, 213, 0.08)' : 'rgba(212, 165, 116, 0.18)',
            border: `2px solid ${isLocked ? 'rgba(212, 165, 116, 0.5)' : '#d4a574'}`,
            color: '#d4a574',
            borderRadius: '2px',
            fontSize: '11px',
            letterSpacing: '3px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
          }}
        >
          {isLocked ? <><Unlock size={15} /> UNLOCK ROUND</> : <><Lock size={15} /> LOCK IN ROUND</>}
        </button>
      )}
    </div>
  );
}

function HoleStrip({ round, currentHole, setCurrentHole, roundScores }) {
  return (
    <div style={{
      display: 'flex',
      overflowX: 'auto',
      gap: '4px',
      padding: '2px 0 10px',
      marginBottom: '6px',
      scrollbarWidth: 'none',
    }}>
      {Array.from({ length: round.holes }).map((_, i) => {
        const hs = roundScores[i] || {};
        const complete = PLAYERS.every((p) => hs[p] != null && hs[p] !== '');
        const active = i === currentHole;
        return (
          <button
            key={i}
            onClick={() => setCurrentHole(i)}
            style={{
              minWidth: '32px',
              height: '32px',
              background: active ? '#d4a574' : complete ? 'rgba(107, 158, 78, 0.2)' : 'transparent',
              border: `1px solid ${active ? '#d4a574' : complete ? '#6b9e4e' : 'rgba(212, 165, 116, 0.2)'}`,
              color: active ? '#0a1f0f' : '#f4ead5',
              borderRadius: '2px',
              fontSize: '12px',
              fontWeight: active ? 700 : 400,
              flexShrink: 0,
            }}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}

function TeeBadge({ tee, size = 'sm' }) {
  if (!tee || tee === 'N/A') return null;
  const colors = TEE_COLORS[tee] || TEE_COLORS['N/A'];
  const styles = size === 'sm'
    ? { fontSize: '8px', padding: '2px 5px', letterSpacing: '0.5px' }
    : { fontSize: '9px', padding: '3px 6px', letterSpacing: '0.5px' };
  return (
    <span style={{
      ...styles,
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      color: colors.text,
      borderRadius: '2px',
      fontWeight: 700,
      whiteSpace: 'nowrap',
      display: 'inline-block',
    }}>
      {tee}
    </span>
  );
}

// Circular player headshot sticker
function PlayerAvatar({ player, size = 24, showBorder = false }) {
  if (!player || !PLAYERS.includes(player)) return null;
  const src = `/${player.toLowerCase()}.png`;
  return (
    <img
      src={src}
      alt={player}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        border: showBorder ? '2px solid #d4a574' : 'none',
        borderRadius: showBorder ? '50%' : '0',
        flexShrink: 0,
        display: 'inline-block',
        verticalAlign: 'middle',
        filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
      }}
    />
  );
}

// Shame display: sticker + speech bubble for snake holders
function ShameSticker({ player, avatarSize = 90, seed = '' }) {
  const quotes = PLAYER_QUOTES[player] || [];
  // Stable pseudo-random pick: seed combines player name + seed (e.g., round id or hour)
  // so it doesn't flicker on every render but varies by context
  let hash = 0;
  const str = `${player}-${seed}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % (quotes.length || 1);
  const quote = quotes[idx] || null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', maxWidth: '160px' }}>
      {/* Speech bubble above avatar */}
      {quote && (
        <div style={{ position: 'relative', marginBottom: '4px' }}>
          <div style={{
            background: '#f4ead5',
            color: '#0a1f0f',
            padding: '8px 10px',
            borderRadius: '12px',
            fontSize: '11px',
            fontStyle: 'italic',
            fontFamily: 'Georgia, serif',
            lineHeight: 1.3,
            textAlign: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            position: 'relative',
            maxWidth: '160px',
          }}>
            "{quote}"
            {/* Speech bubble tail */}
            <div style={{
              position: 'absolute',
              bottom: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              borderTop: '8px solid #f4ead5',
            }} />
          </div>
        </div>
      )}
      <PlayerAvatar player={player} size={avatarSize} />
      <span style={{
        fontFamily: '"Special Elite", serif',
        color: '#c44b4b',
        fontWeight: 700,
        fontSize: '14px',
        letterSpacing: '1px',
      }}>{player}</span>
    </div>
  );
}

function HoleCard({ round, holeIdx, roundScores, roundSnakes, roundCtp, roundSideBets, setHoleScore, toggleSnake, setCtpWinner, clearHole, setShowSideBetModal, setSideBetWinner, removeSideBet, teams }) {
  const holeScores = roundScores[holeIdx] || {};
  const par = round.pars[holeIdx] || 4;
  const hcpIdx = round.handicapIndex[holeIdx] || holeIdx + 1;
  const rawSnakes = roundSnakes[holeIdx];
  const snakeHolders = Array.isArray(rawSnakes) ? rawSnakes : (rawSnakes ? [rawSnakes] : []);
  const ctpWinner = roundCtp[holeIdx];
  const holeSideBets = roundSideBets[holeIdx] || [];

  const segment = round.type === 'standard' ? Math.floor(holeIdx / 6) : null;
  const soloPlayer = teams ? teams[segment] : null;

  // Net scores for this hole
  const netScores = {};
  PLAYERS.forEach((p) => {
    const gross = holeScores[p];
    if (gross != null && gross !== '') {
      const grossNum = parseInt(gross, 10);
      if (!isNaN(grossNum)) {
        const capped = capAtTripleBogey(grossNum, par);
        if (round.type === 'cliffhangers') {
          netScores[p] = capped;
        } else {
          const strokesThisHole = getHandicapStrokesPerHole(round.strokes[p], round.handicapIndex)[holeIdx] || 0;
          netScores[p] = capped - strokesThisHole;
        }
      }
    }
  });

  // Match result
  let matchResult = null;
  if (round.type === 'standard' && soloPlayer && PLAYERS.every((p) => netScores[p] != null)) {
    const soloScore = netScores[soloPlayer];
    const team = PLAYERS.filter((p) => p !== soloPlayer);
    const teamBest = Math.min(...team.map((p) => netScores[p]));
    if (soloScore < teamBest) matchResult = { winner: 'solo', text: `${soloPlayer} +2` };
    else if (teamBest < soloScore) matchResult = { winner: 'team', text: `${team.join(' & ')} +1 each` };
    else matchResult = { winner: 'tie', text: 'Tie · no points' };
  }

  return (
    <div style={{
      background: 'rgba(244, 234, 213, 0.04)',
      border: '1px solid rgba(212, 165, 116, 0.3)',
      padding: '16px 14px',
      borderRadius: '2px',
    }}>
      {/* Hole header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px dashed rgba(212, 165, 116, 0.2)' }}>
        <div>
          <div style={{ fontSize: '9px', letterSpacing: '3px', color: '#d4a574' }}>HOLE</div>
          <div style={{ fontFamily: '"Unifraktur Maguntia", serif', fontSize: '46px', lineHeight: 0.9, color: '#f4ead5' }}>
            {holeIdx + 1}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '10px', letterSpacing: '1.5px', opacity: 0.7 }}>
          <div>PAR <span style={{ color: '#d4a574', fontSize: '14px', fontWeight: 600 }}>{par}</span></div>
          {round.type === 'standard' && <div style={{ marginTop: '3px' }}>HCP IDX {hcpIdx}</div>}
        </div>
      </div>

      {/* Segment */}
      {round.type === 'standard' && (
        <div style={{
          background: 'rgba(212, 165, 116, 0.1)',
          border: '1px solid rgba(212, 165, 116, 0.3)',
          padding: '8px 10px',
          marginBottom: '14px',
          fontSize: '10px',
          letterSpacing: '1.5px',
          textAlign: 'center',
        }}>
          SEG {segment + 1} · SOLO: <span style={{ color: '#d4a574', fontWeight: 700 }}>{soloPlayer}</span>
          <span style={{ opacity: 0.5 }}> vs </span>
          <span>{PLAYERS.filter((p) => p !== soloPlayer).join(' + ')}</span>
        </div>
      )}

      {/* Player rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        {PLAYERS.map((p) => {
          const gross = holeScores[p] || '';
          const strokesThisHole = round.type === 'standard' ? getHandicapStrokesPerHole(round.strokes[p], round.handicapIndex)[holeIdx] || 0 : 0;
          const isSnake = snakeHolders.includes(p);
          const isCtp = ctpWinner === p;
          const hasStroke = strokesThisHole > 0;

          return (
            <div key={p} style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              gap: '8px',
              alignItems: 'center',
              padding: '7px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '2px',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontFamily: '"Special Elite", serif', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                  {p}
                  <TeeBadge tee={resolveTeeForHole(round.tees[p], holeIdx, round)} />
                  {(() => {
                    const tee = resolveTeeForHole(round.tees[p], holeIdx, round);
                    const yds = round.yardages?.[tee]?.[holeIdx];
                    return yds ? (
                      <span style={{ fontSize: '10px', color: '#d4a574', opacity: 0.85, fontWeight: 600, fontFamily: '"DM Mono", monospace' }}>
                        {yds}y
                      </span>
                    ) : null;
                  })()}
                  {hasStroke && (
                    <span style={{ fontSize: '9px', padding: '1px 4px', background: '#d4a574', color: '#0a1f0f', borderRadius: '2px', fontWeight: 700 }}>
                      +{strokesThisHole === 0.5 ? '½' : strokesThisHole}
                    </span>
                  )}
                </div>
                {netScores[p] != null && (
                  <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '1px' }}>
                    NET <span style={{ color: '#d4a574' }}>{netScores[p]}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <button
                  onClick={() => {
                    const cur = parseInt(gross, 10) || 0;
                    if (cur > 1) setHoleScore(holeIdx, p, String(cur - 1));
                  }}
                  style={{ width: '30px', height: '36px', background: 'transparent', border: '1px solid rgba(212, 165, 116, 0.3)', color: '#d4a574', borderRadius: '2px', fontSize: '17px' }}
                >−</button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={gross}
                  onChange={(e) => setHoleScore(holeIdx, p, e.target.value)}
                  placeholder="—"
                  style={{
                    width: '44px',
                    height: '36px',
                    textAlign: 'center',
                    background: '#0a1f0f',
                    border: '1px solid rgba(212, 165, 116, 0.4)',
                    color: '#f4ead5',
                    fontSize: '17px',
                    borderRadius: '2px',
                    fontFamily: '"DM Mono", monospace',
                    fontWeight: 600,
                  }}
                />
                <button
                  onClick={() => {
                    const cur = parseInt(gross, 10) || 0;
                    setHoleScore(holeIdx, p, String(cur + 1));
                  }}
                  style={{ width: '30px', height: '36px', background: 'transparent', border: '1px solid rgba(212, 165, 116, 0.3)', color: '#d4a574', borderRadius: '2px', fontSize: '17px' }}
                >+</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button
                  onClick={() => toggleSnake(holeIdx, p)}
                  title="3-putt / Snake"
                  style={{
                    width: '30px', height: '17px',
                    background: isSnake ? '#c44b4b' : 'transparent',
                    border: `1px solid ${isSnake ? '#c44b4b' : 'rgba(196, 75, 75, 0.3)'}`,
                    color: isSnake ? '#fff' : 'rgba(196, 75, 75, 0.6)',
                    borderRadius: '2px',
                    fontSize: '9px',
                  }}
                >🐍</button>
                {round.type === 'cliffhangers' && (
                  <button
                    onClick={() => setCtpWinner(holeIdx, p)}
                    title="Closest to pin"
                    style={{
                      width: '30px', height: '17px',
                      background: isCtp ? '#d4a574' : 'transparent',
                      border: `1px solid ${isCtp ? '#d4a574' : 'rgba(212, 165, 116, 0.3)'}`,
                      color: isCtp ? '#0a1f0f' : 'rgba(212, 165, 116, 0.6)',
                      borderRadius: '2px',
                      fontSize: '9px',
                    }}
                  >⛳</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '10px', fontSize: '8px', opacity: 0.5, letterSpacing: '1px', borderTop: '1px dashed rgba(212, 165, 116, 0.15)', paddingTop: '8px' }}>
        <span>🐍 = 3-PUTT</span>
        {round.type === 'cliffhangers' && <span>⛳ = CLOSEST TO PIN</span>}
      </div>

      {matchResult && round.type === 'standard' && (
        <div style={{
          marginTop: '10px',
          padding: '8px',
          background: matchResult.winner === 'tie' ? 'rgba(244, 234, 213, 0.05)' : 'rgba(107, 158, 78, 0.15)',
          border: `1px solid ${matchResult.winner === 'tie' ? 'rgba(212, 165, 116, 0.3)' : '#6b9e4e'}`,
          borderRadius: '2px',
          fontSize: '11px',
          letterSpacing: '1.5px',
          textAlign: 'center',
        }}>
          <Trophy size={11} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />
          {matchResult.text}
        </div>
      )}

      {/* Side Bets on this hole */}
      {holeSideBets.length > 0 && (
        <div style={{ marginTop: '10px', padding: '8px', background: 'rgba(180, 120, 200, 0.08)', border: '1px solid rgba(180, 120, 200, 0.4)', borderRadius: '2px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '2px', color: '#c090d0', marginBottom: '6px', textAlign: 'center' }}>⚡ SIDE BETS ⚡</div>
          {holeSideBets.map((bet) => (
            <div key={bet.id} style={{ marginBottom: '6px', padding: '6px', background: 'rgba(0,0,0,0.15)', borderRadius: '2px' }}>
              <div style={{ fontSize: '11px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  <span style={{ fontFamily: '"Special Elite", serif' }}>{bet.player1}</span> vs <span style={{ fontFamily: '"Special Elite", serif' }}>{bet.player2}</span>
                  <span style={{ color: '#d4a574', marginLeft: '6px', fontWeight: 600 }}>${bet.amount}</span>
                </span>
                <button onClick={() => removeSideBet(holeIdx, bet.id)} style={{ background: 'transparent', border: 'none', color: 'rgba(196, 75, 75, 0.7)', fontSize: '11px', cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setSideBetWinner(holeIdx, bet.id, bet.player1)}
                  style={{
                    flex: 1, padding: '5px', fontSize: '10px',
                    background: bet.winner === bet.player1 ? '#6b9e4e' : 'transparent',
                    border: `1px solid ${bet.winner === bet.player1 ? '#6b9e4e' : 'rgba(212, 165, 116, 0.3)'}`,
                    color: bet.winner === bet.player1 ? '#0a1f0f' : '#f4ead5',
                    borderRadius: '2px', letterSpacing: '1px', fontWeight: bet.winner === bet.player1 ? 700 : 400,
                  }}
                >{bet.player1} WON</button>
                <button
                  onClick={() => setSideBetWinner(holeIdx, bet.id, bet.player2)}
                  style={{
                    flex: 1, padding: '5px', fontSize: '10px',
                    background: bet.winner === bet.player2 ? '#6b9e4e' : 'transparent',
                    border: `1px solid ${bet.winner === bet.player2 ? '#6b9e4e' : 'rgba(212, 165, 116, 0.3)'}`,
                    color: bet.winner === bet.player2 ? '#0a1f0f' : '#f4ead5',
                    borderRadius: '2px', letterSpacing: '1px', fontWeight: bet.winner === bet.player2 ? 700 : 400,
                  }}
                >{bet.player2} WON</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons: Side bet + Clear hole */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
        <button
          onClick={() => setShowSideBetModal(true)}
          style={{
            flex: 1, padding: '9px',
            background: 'rgba(180, 120, 200, 0.15)',
            border: '1px solid rgba(180, 120, 200, 0.5)',
            color: '#c090d0',
            borderRadius: '2px',
            fontSize: '10px',
            letterSpacing: '2px',
            fontWeight: 600,
          }}
        >⚡ ADD SIDE BET</button>
        <button
          onClick={() => clearHole(holeIdx)}
          style={{
            padding: '9px 12px',
            background: 'transparent',
            border: '1px solid rgba(196, 75, 75, 0.5)',
            color: 'rgba(196, 75, 75, 0.9)',
            borderRadius: '2px',
            fontSize: '10px',
            letterSpacing: '2px',
            fontWeight: 600,
          }}
        >↺ CLEAR HOLE</button>
      </div>
    </div>
  );
}

// ============= SIDE BET MODAL =============
function SideBetModal({ holeIdx, onAdd, onClose }) {
  const [player1, setPlayer1] = useState(PLAYERS[0]);
  const [player2, setPlayer2] = useState(PLAYERS[1]);
  const [amount, setAmount] = useState('5');

  const handleAdd = () => {
    if (player1 === player2) { alert('Pick two different players'); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { alert('Enter a valid amount'); return; }
    onAdd({ player1, player2, amount: amt, winner: null });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0d2818',
          border: '2px solid #c090d0',
          borderRadius: '4px',
          padding: '24px 20px',
          maxWidth: '340px',
          width: '100%',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '3px', color: '#c090d0', marginBottom: '4px' }}>⚡ SIDE BET · HOLE {holeIdx + 1} ⚡</div>
          <div style={{ fontFamily: '"Unifraktur Maguntia", serif', fontSize: '24px', color: '#f4ead5' }}>Double or Nothing</div>
        </div>

        {/* Player 1 */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '2px', color: '#d4a574', marginBottom: '6px' }}>PLAYER 1</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {PLAYERS.map((p) => (
              <button
                key={p}
                onClick={() => setPlayer1(p)}
                style={{
                  flex: 1, padding: '10px',
                  background: player1 === p ? '#d4a574' : 'transparent',
                  border: `1px solid ${player1 === p ? '#d4a574' : 'rgba(212, 165, 116, 0.3)'}`,
                  color: player1 === p ? '#0a1f0f' : '#f4ead5',
                  borderRadius: '2px',
                  fontSize: '12px',
                  fontFamily: '"Special Elite", serif',
                  fontWeight: player1 === p ? 700 : 400,
                }}
              >{p}</button>
            ))}
          </div>
        </div>

        {/* VS */}
        <div style={{ textAlign: 'center', color: '#c090d0', fontSize: '12px', letterSpacing: '2px', marginBottom: '14px' }}>VS</div>

        {/* Player 2 */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '2px', color: '#d4a574', marginBottom: '6px' }}>PLAYER 2</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {PLAYERS.map((p) => (
              <button
                key={p}
                onClick={() => setPlayer2(p)}
                style={{
                  flex: 1, padding: '10px',
                  background: player2 === p ? '#d4a574' : 'transparent',
                  border: `1px solid ${player2 === p ? '#d4a574' : 'rgba(212, 165, 116, 0.3)'}`,
                  color: player2 === p ? '#0a1f0f' : '#f4ead5',
                  borderRadius: '2px',
                  fontSize: '12px',
                  fontFamily: '"Special Elite", serif',
                  fontWeight: player2 === p ? 700 : 400,
                  opacity: p === player1 ? 0.3 : 1,
                }}
                disabled={p === player1}
              >{p}</button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '2px', color: '#d4a574', marginBottom: '6px' }}>AMOUNT ($)</div>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
            {[5, 10, 20, 50].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String(v))}
                style={{
                  flex: 1, padding: '8px',
                  background: amount === String(v) ? 'rgba(212, 165, 116, 0.3)' : 'transparent',
                  border: `1px solid rgba(212, 165, 116, 0.3)`,
                  color: '#f4ead5',
                  borderRadius: '2px',
                  fontSize: '11px',
                }}
              >${v}</button>
            ))}
          </div>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Custom"
            style={{
              width: '100%', padding: '10px',
              background: '#0a1f0f',
              border: '1px solid rgba(212, 165, 116, 0.4)',
              color: '#f4ead5',
              fontSize: '16px',
              borderRadius: '2px',
              fontFamily: '"DM Mono", monospace',
              textAlign: 'center',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px',
              background: 'transparent',
              border: '1px solid rgba(244, 234, 213, 0.3)',
              color: '#f4ead5',
              borderRadius: '2px',
              fontSize: '11px',
              letterSpacing: '2px',
            }}
          >CANCEL</button>
          <button
            onClick={handleAdd}
            style={{
              flex: 1, padding: '12px',
              background: '#c090d0',
              border: '1px solid #c090d0',
              color: '#0a1f0f',
              borderRadius: '2px',
              fontSize: '11px',
              letterSpacing: '2px',
              fontWeight: 700,
            }}
          >LOCK IT IN</button>
        </div>
      </div>
    </div>
  );
}

// ============= SCORECARD MODAL =============
function ScorecardModal({ round, roundScores, roundSnakes, roundCtp, results, onJumpToHole, onClose }) {
  // Build per-player running totals; split into Front 9 and Back 9 (for 18-hole rounds)
  const is18 = round.holes === 18;
  const frontHoles = is18 ? 9 : round.holes;
  const backHoles = is18 ? 9 : 0;

  const getScoreForHole = (p, h) => {
    const raw = roundScores[h]?.[p];
    if (raw == null || raw === '') return null;
    const n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  };

  const getScoreStyle = (gross, par) => {
    if (gross == null) return { color: '#f4ead5', bg: 'transparent' };
    const diff = gross - par;
    // Eagle or better: bright gold double circle feel
    if (diff <= -2) return { color: '#f4ead5', bg: '#d4a574', ring: true };
    // Birdie: gold circle
    if (diff === -1) return { color: '#0a1f0f', bg: '#d4a574' };
    // Par: no decoration
    if (diff === 0) return { color: '#f4ead5', bg: 'transparent' };
    // Bogey: subtle outline
    if (diff === 1) return { color: '#f4ead5', bg: 'transparent', border: true };
    // Double+: red-ish outline
    return { color: '#c44b4b', bg: 'transparent', border: true, doubleBorder: true };
  };

  const computeSubTotal = (p, startHole, count) => {
    let total = 0;
    let hasAny = false;
    for (let h = startHole; h < startHole + count; h++) {
      const s = getScoreForHole(p, h);
      if (s != null) { total += s; hasAny = true; }
    }
    return hasAny ? total : null;
  };

  const computePar = (startHole, count) => {
    let total = 0;
    for (let h = startHole; h < startHole + count; h++) {
      total += round.pars[h] || 0;
    }
    return total;
  };

  const renderSection = (label, startHole, holeCount) => {
    if (holeCount === 0) return null;
    const holeNumbers = Array.from({ length: holeCount }, (_, i) => startHole + i);

    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '10px', letterSpacing: '3px', color: '#d4a574', marginBottom: '6px', textAlign: 'center' }}>
          {label}
        </div>
        <div style={{
          overflowX: 'auto',
          border: '1px solid rgba(212, 165, 116, 0.3)',
          borderRadius: '2px',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <div style={{ minWidth: `${80 + holeCount * 28 + 50}px` }}>
            {/* Header: Hole numbers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `60px repeat(${holeCount}, 28px) 50px`,
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '1px',
              background: 'rgba(212, 165, 116, 0.15)',
              borderBottom: '1px solid rgba(212, 165, 116, 0.3)',
            }}>
              <div style={{ padding: '6px 4px', color: '#d4a574' }}>HOLE</div>
              {holeNumbers.map((h) => (
                <div key={h} style={{ padding: '6px 0', textAlign: 'center', color: '#f4ead5' }}>
                  {h + 1}
                </div>
              ))}
              <div style={{ padding: '6px 4px', textAlign: 'center', color: '#d4a574' }}>
                {holeCount === 9 ? (startHole === 0 ? 'OUT' : 'IN') : 'TOT'}
              </div>
            </div>
            {/* Par row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `60px repeat(${holeCount}, 28px) 50px`,
              fontSize: '10px',
              background: 'rgba(0,0,0,0.3)',
              borderBottom: '1px dashed rgba(212, 165, 116, 0.2)',
            }}>
              <div style={{ padding: '5px 4px', color: '#d4a574', letterSpacing: '1px', fontSize: '9px', fontWeight: 600 }}>PAR</div>
              {holeNumbers.map((h) => (
                <div key={h} style={{ padding: '5px 0', textAlign: 'center', opacity: 0.7 }}>
                  {round.pars[h]}
                </div>
              ))}
              <div style={{ padding: '5px 4px', textAlign: 'center', color: '#d4a574', fontWeight: 600 }}>
                {computePar(startHole, holeCount)}
              </div>
            </div>
            {/* Handicap index row (only for standard rounds) */}
            {round.type === 'standard' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: `60px repeat(${holeCount}, 28px) 50px`,
                fontSize: '9px',
                borderBottom: '1px solid rgba(212, 165, 116, 0.3)',
                opacity: 0.55,
              }}>
                <div style={{ padding: '4px', letterSpacing: '1px', fontSize: '8px' }}>HCP</div>
                {holeNumbers.map((h) => (
                  <div key={h} style={{ padding: '4px 0', textAlign: 'center' }}>
                    {round.handicapIndex[h]}
                  </div>
                ))}
                <div style={{ padding: '4px' }}></div>
              </div>
            )}
            {/* Player rows */}
            {PLAYERS.map((p, idx) => {
              const subTotal = computeSubTotal(p, startHole, holeCount);
              return (
                <div key={p} style={{
                  display: 'grid',
                  gridTemplateColumns: `60px repeat(${holeCount}, 28px) 50px`,
                  fontSize: '13px',
                  borderBottom: idx < PLAYERS.length - 1 ? '1px dashed rgba(212, 165, 116, 0.15)' : 'none',
                }}>
                  <div style={{
                    padding: '8px 4px',
                    fontFamily: '"Special Elite", serif',
                    fontSize: '12px',
                    color: '#d4a574',
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                    {p}
                  </div>
                  {holeNumbers.map((h) => {
                    const score = getScoreForHole(p, h);
                    const par = round.pars[h];
                    const style = getScoreStyle(score, par);
                    const snakers = Array.isArray(roundSnakes[h]) ? roundSnakes[h] : (roundSnakes[h] ? [roundSnakes[h]] : []);
                    const hasSnake = snakers.includes(p);
                    const ctpWinner = roundCtp[h] === p;
                    return (
                      <div key={h} onClick={() => onJumpToHole(h)} style={{
                        padding: '6px 0',
                        textAlign: 'center',
                        position: 'relative',
                        cursor: 'pointer',
                      }}>
                        <div style={{
                          width: '22px',
                          height: '22px',
                          margin: '0 auto',
                          borderRadius: style.bg !== 'transparent' || style.doubleBorder ? '50%' : '2px',
                          background: style.bg,
                          border: style.border ? `1px solid ${style.doubleBorder ? '#c44b4b' : 'rgba(244, 234, 213, 0.5)'}` : (style.ring ? '2px solid #d4a574' : 'none'),
                          boxShadow: style.ring ? 'inset 0 0 0 2px #0a1f0f, 0 0 0 2px #d4a574' : 'none',
                          color: style.color,
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                        }}>
                          {score != null ? score : '—'}
                        </div>
                        {hasSnake && (
                          <div style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            fontSize: '8px',
                            lineHeight: 1,
                          }}>🐍</div>
                        )}
                        {ctpWinner && round.type === 'cliffhangers' && (
                          <div style={{
                            position: 'absolute',
                            top: '2px',
                            left: '2px',
                            fontSize: '8px',
                            lineHeight: 1,
                          }}>⛳</div>
                        )}
                      </div>
                    );
                  })}
                  <div style={{
                    padding: '8px 4px',
                    textAlign: 'center',
                    fontWeight: 700,
                    color: '#d4a574',
                    fontSize: '14px',
                  }}>
                    {subTotal != null ? subTotal : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 1000,
        overflowY: 'auto',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0d2818',
          border: '2px solid #d4a574',
          borderRadius: '4px',
          padding: '18px 14px',
          maxWidth: '100%',
          margin: '0 auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '3px', color: '#d4a574' }}>SCORECARD</div>
            <div style={{ fontFamily: '"Unifraktur Maguntia", serif', fontSize: '22px', color: '#f4ead5' }}>
              {round.name}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '34px', height: '34px',
              background: 'transparent',
              border: '1px solid rgba(212, 165, 116, 0.4)',
              color: '#d4a574',
              borderRadius: '2px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          ><X size={16} /></button>
        </div>

        {/* Scorecard sections */}
        {is18 ? (
          <>
            {renderSection('FRONT NINE', 0, 9)}
            {renderSection('BACK NINE', 9, 9)}
            {/* Grand total */}
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: 'rgba(212, 165, 116, 0.1)',
              border: '1px solid #d4a574',
              borderRadius: '2px',
            }}>
              <div style={{ fontSize: '10px', letterSpacing: '3px', color: '#d4a574', marginBottom: '8px', textAlign: 'center' }}>
                TOTAL
              </div>
              {PLAYERS.map((p, idx) => {
                const gross = results.grossStrokes[p];
                const net = results.netStrokes[p];
                return (
                  <div key={p} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 0.7fr 0.7fr 0.7fr',
                    gap: '6px',
                    padding: '6px 0',
                    borderTop: idx === 0 ? 'none' : '1px dashed rgba(212, 165, 116, 0.15)',
                    fontSize: '13px',
                    alignItems: 'center',
                  }}>
                    <span style={{ fontFamily: '"Special Elite", serif' }}>{p}</span>
                    <span style={{ textAlign: 'right', opacity: 0.7, fontSize: '11px' }}>
                      GROSS <span style={{ color: '#f4ead5', fontWeight: 600, fontSize: '14px', marginLeft: '4px' }}>{gross != null ? gross : '—'}</span>
                    </span>
                    {round.type === 'standard' ? (
                      <>
                        <span style={{ textAlign: 'right', opacity: 0.5, fontSize: '11px' }}>
                          HCP <span style={{ fontSize: '12px' }}>{round.strokes[p]}</span>
                        </span>
                        <span style={{ textAlign: 'right', fontSize: '11px', opacity: 0.7 }}>
                          NET <span style={{ color: '#d4a574', fontWeight: 700, fontSize: '14px', marginLeft: '4px' }}>{net != null ? net : '—'}</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <span></span>
                        <span style={{ textAlign: 'right' }}></span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          renderSection('FULL ROUND', 0, round.holes)
        )}

        {/* Legend */}
        <div style={{ marginTop: '14px', padding: '10px', background: 'rgba(0,0,0,0.25)', borderRadius: '2px', fontSize: '9px', opacity: 0.75 }}>
          <div style={{ letterSpacing: '2px', color: '#d4a574', marginBottom: '6px', fontSize: '9px', fontWeight: 600 }}>LEGEND</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #d4a574', display: 'inline-block' }}></span> Eagle
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#d4a574', display: 'inline-block' }}></span> Birdie
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '2px', border: '1px solid rgba(244, 234, 213, 0.5)', display: 'inline-block' }}></span> Bogey
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1px solid #c44b4b', display: 'inline-block' }}></span> Dbl+
            </span>
            <span>🐍 Snake</span>
            {round.type === 'cliffhangers' && <span>⛳ CTP</span>}
          </div>
          <div style={{ marginTop: '6px', opacity: 0.55, fontSize: '9px' }}>Tap any cell to jump to that hole</div>
        </div>
      </div>
    </div>
  );
}

// ============= ROUND SUMMARY =============
function RoundSummary({ round, results, roundSideBets }) {
  // Compute side bet totals per player (only settled bets with a winner count)
  const sideBetTotals = { Frosty: 0, Herby: 0, Carlos: 0 };
  const settledBetCount = { total: 0, pending: 0 };
  if (roundSideBets) {
    Object.values(roundSideBets).forEach((betsOnHole) => {
      (betsOnHole || []).forEach((bet) => {
        if (!bet.winner) { settledBetCount.pending += 1; return; }
        settledBetCount.total += 1;
        const loser = bet.winner === bet.player1 ? bet.player2 : bet.player1;
        sideBetTotals[bet.winner] = (sideBetTotals[bet.winner] || 0) + bet.amount;
        sideBetTotals[loser] = (sideBetTotals[loser] || 0) - bet.amount;
      });
    });
  }

  // Running round $ total per player (stroke + match + snake + side)
  const runningTotals = {};
  PLAYERS.forEach((p) => {
    runningTotals[p] = Math.round(
      (results.strokePayouts[p] || 0) +
      (results.matchPayouts[p] || 0) +
      (results.snakePayouts[p] || 0) +
      (sideBetTotals[p] || 0)
    );
  });

  return (
    <div style={{
      marginTop: '20px',
      background: 'rgba(10, 31, 15, 0.8)',
      border: '1px solid rgba(212, 165, 116, 0.3)',
      padding: '16px 14px',
      borderRadius: '2px',
    }}>
      <div style={{ fontSize: '10px', letterSpacing: '3px', color: '#d4a574', marginBottom: '12px', textAlign: 'center' }}>
        ⟢ ROUND SCORECARD ⟢
      </div>

      {/* Round-so-far running totals */}
      <div style={{
        marginBottom: '16px',
        padding: '10px',
        background: 'rgba(212, 165, 116, 0.08)',
        border: '1px solid rgba(212, 165, 116, 0.3)',
        borderRadius: '2px',
      }}>
        <div style={{ fontSize: '10px', letterSpacing: '2px', color: '#d4a574', marginBottom: '8px', fontWeight: 600, textAlign: 'center' }}>
          WHERE THINGS STAND
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.55fr 0.55fr 0.55fr 0.5fr 0.65fr', gap: '4px', fontSize: '9px', opacity: 0.55, letterSpacing: '1px', marginBottom: '4px' }}>
          <div>PLAYER</div>
          <div style={{ textAlign: 'center' }}>STROKE</div>
          <div style={{ textAlign: 'center' }}>MATCH</div>
          <div style={{ textAlign: 'center' }}>🐍</div>
          <div style={{ textAlign: 'center' }}>⚡</div>
          <div style={{ textAlign: 'right' }}>ROUND</div>
        </div>
        {PLAYERS.map((p) => {
          const stroke = Math.round(results.strokePayouts[p] || 0);
          const match = Math.round(results.matchPayouts[p] || 0);
          const snake = Math.round(results.snakePayouts[p] || 0);
          const side = Math.round(sideBetTotals[p] || 0);
          const total = runningTotals[p];
          return (
            <div key={p} style={{
              display: 'grid',
              gridTemplateColumns: '1.1fr 0.55fr 0.55fr 0.55fr 0.5fr 0.65fr',
              gap: '4px',
              padding: '5px 0',
              fontSize: '12px',
              alignItems: 'center',
            }}>
              <span style={{ fontFamily: '"Special Elite", serif', fontSize: '13px' }}>{p}</span>
              <span style={{ textAlign: 'center', color: stroke >= 0 ? '#6b9e4e' : '#c44b4b', fontSize: '11px' }}>
                {stroke >= 0 ? '+' : ''}{stroke}
              </span>
              <span style={{ textAlign: 'center', color: match >= 0 ? '#6b9e4e' : '#c44b4b', fontSize: '11px' }}>
                {match >= 0 ? '+' : ''}{match}
              </span>
              <span style={{ textAlign: 'center', color: snake >= 0 ? '#6b9e4e' : '#c44b4b', fontSize: '11px' }}>
                {snake >= 0 ? '+' : ''}{snake}
              </span>
              <span style={{ textAlign: 'center', color: side >= 0 ? '#6b9e4e' : '#c44b4b', fontSize: '11px' }}>
                {side >= 0 ? '+' : ''}{side}
              </span>
              <span style={{ textAlign: 'right', fontWeight: 700, color: total >= 0 ? '#6b9e4e' : '#c44b4b', fontSize: '14px' }}>
                {total >= 0 ? '+' : ''}${total}
              </span>
            </div>
          );
        })}
        {(settledBetCount.total > 0 || settledBetCount.pending > 0) && (
          <div style={{ fontSize: '9px', opacity: 0.55, marginTop: '6px', textAlign: 'center', letterSpacing: '1px' }}>
            ⚡ {settledBetCount.total} side bet{settledBetCount.total !== 1 ? 's' : ''} settled
            {settledBetCount.pending > 0 && ` · ${settledBetCount.pending} pending`}
          </div>
        )}
      </div>

      {/* Strokes */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '10px', opacity: 0.55, letterSpacing: '2px', marginBottom: '6px' }}>STROKES</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.55fr 0.55fr 0.55fr 0.6fr', gap: '6px', fontSize: '9px', opacity: 0.5, letterSpacing: '1px', marginBottom: '4px' }}>
          <div>PLAYER</div>
          <div style={{ textAlign: 'right' }}>GROSS</div>
          <div style={{ textAlign: 'right' }}>HCP</div>
          <div style={{ textAlign: 'right' }}>NET</div>
          <div style={{ textAlign: 'right' }}>$</div>
        </div>
        {PLAYERS.map((p, i) => (
          <div key={p} style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.55fr 0.55fr 0.55fr 0.6fr',
            gap: '6px',
            padding: '5px 0',
            borderTop: i === 0 ? 'none' : '1px dashed rgba(212, 165, 116, 0.1)',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: '"Special Elite", serif', fontSize: '13px' }}>
              {results.strokePayouts[p] === 70 && <Crown size={11} style={{ color: '#d4a574' }} />}
              {p}
            </div>
            <div style={{ textAlign: 'right', fontSize: '13px' }}>{results.grossStrokes[p] || '—'}</div>
            <div style={{ textAlign: 'right', fontSize: '11px', opacity: 0.6 }}>
              {round.type === 'standard' ? `-${round.strokes[p]}` : '—'}
            </div>
            <div style={{ textAlign: 'right', fontSize: '13px', color: results.strokePayouts[p] > 0 ? '#d4a574' : '#f4ead5', fontWeight: 600 }}>
              {results.netStrokes[p] != null ? results.netStrokes[p] : '—'}
            </div>
            <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: 600, color: (results.strokePayouts[p] || 0) >= 0 ? '#6b9e4e' : '#c44b4b' }}>
              {(results.strokePayouts[p] || 0) > 0 ? '+' : ''}{results.strokePayouts[p] || 0}
            </div>
          </div>
        ))}
      </div>

      {/* Match Play */}
      {round.type === 'standard' && (
        <div style={{ marginBottom: '14px', paddingTop: '10px', borderTop: '1px dashed rgba(212, 165, 116, 0.2)' }}>
          <div style={{ fontSize: '10px', opacity: 0.55, letterSpacing: '2px', marginBottom: '6px' }}>
            MATCH PLAY · ${MATCH_POINT_VALUE}/pt
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.6fr 0.6fr', gap: '6px', fontSize: '9px', opacity: 0.5, letterSpacing: '1px', marginBottom: '4px' }}>
            <div>PLAYER</div>
            <div style={{ textAlign: 'right' }}>POINTS</div>
            <div style={{ textAlign: 'right' }}>$ NET</div>
          </div>
          {PLAYERS.map((p) => (
            <div key={p} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.6fr 0.6fr', gap: '6px', padding: '4px 0', fontSize: '13px' }}>
              <span style={{ fontFamily: '"Special Elite", serif' }}>{p}</span>
              <span style={{ textAlign: 'right', color: '#d4a574', fontWeight: 600 }}>{results.matchPoints[p]}</span>
              <span style={{ textAlign: 'right', fontWeight: 600, color: results.matchPayouts[p] >= 0 ? '#6b9e4e' : '#c44b4b' }}>
                {results.matchPayouts[p] >= 0 ? '+' : ''}${results.matchPayouts[p]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Snakes */}
      <div style={{ paddingTop: '10px', borderTop: '1px dashed rgba(212, 165, 116, 0.2)' }}>
        <div style={{ fontSize: '10px', opacity: 0.55, letterSpacing: '2px', marginBottom: '6px' }}>
          SNAKES · ${SNAKE_VALUE} each
        </div>
        {PLAYERS.map((p) => (
          <div key={p} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '12px' }}>
            <span style={{ fontFamily: '"Special Elite", serif' }}>{p}</span>
            <span style={{ opacity: 0.7 }}>
              {results.snakesByPlayer[p]?.count || 0} snake{(results.snakesByPlayer[p]?.count || 0) !== 1 ? 's' : ''}
            </span>
          </div>
        ))}
        {results.snakePayment.pending && results.snakePayment.pendingHolders.length > 0 && (
          <div style={{
            marginTop: '10px',
            padding: '16px 12px',
            background: 'rgba(196, 75, 75, 0.08)',
            border: '2px dashed rgba(196, 75, 75, 0.5)',
            borderRadius: '4px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '10px',
              letterSpacing: '4px',
              color: '#c44b4b',
              fontWeight: 700,
              marginBottom: '14px',
            }}>
              🐍 CURRENTLY HOLDING THE SNAKE 🐍
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '14px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {results.snakePayment.pendingHolders.map((p) => (
                <ShameSticker key={p} player={p} avatarSize={90} seed={`${round.id}-${results.snakePayment.totalSnakes}`} />
              ))}
            </div>
            <div style={{ fontSize: '10px', opacity: 0.7, letterSpacing: '1px', fontStyle: 'italic' }}>
              {results.snakePayment.totalSnakes} snake{results.snakePayment.totalSnakes !== 1 ? 's' : ''} · ${results.snakePayment.amount} pot · finalizes when round ends
            </div>
          </div>
        )}
        {results.snakePayment.wash && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            background: 'rgba(244, 234, 213, 0.05)',
            border: '1px solid rgba(212, 165, 116, 0.3)',
            borderRadius: '2px',
            fontSize: '11px',
            textAlign: 'center',
            letterSpacing: '1px',
          }}>
            🐍 <span style={{ color: '#d4a574', fontWeight: 700 }}>WASH</span> — all 3 snaked on the last hole
            <div style={{ fontSize: '9px', opacity: 0.6, marginTop: '2px' }}>
              ({results.snakePayment.totalSnakes} snakes total · no money changes hands)
            </div>
          </div>
        )}
        {results.snakePayment.losers && results.snakePayment.losers.length > 0 && !results.snakePayment.wash && (
          <div style={{
            marginTop: '10px',
            padding: '16px 12px',
            background: 'rgba(196, 75, 75, 0.12)',
            border: '2px solid rgba(196, 75, 75, 0.5)',
            borderRadius: '4px',
            textAlign: 'center',
          }}>
            {/* Shame label */}
            <div style={{
              fontSize: '10px',
              letterSpacing: '4px',
              color: '#c44b4b',
              fontWeight: 700,
              marginBottom: '14px',
            }}>
              🐍 SNAKE HOLDER{results.snakePayment.losers.length > 1 ? 'S' : ''} 🐍
            </div>

            {/* Big sticker faces with quotes */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '14px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {results.snakePayment.losers.map((p) => (
                <ShameSticker key={p} player={p} avatarSize={90} seed={`${round.id}-final`} />
              ))}
            </div>

            {/* Payment line */}
            <div style={{ fontSize: '13px', letterSpacing: '1px', color: '#f4ead5' }}>
              {results.snakePayment.losers.length > 1 ? 'SPLIT' : 'PAYS'}{' '}
              <span style={{ color: '#c44b4b', fontWeight: 700, fontSize: '22px' }}>${results.snakePayment.amount}</span>
            </div>
            <div style={{ fontSize: '9px', opacity: 0.6, marginTop: '4px', letterSpacing: '1px' }}>
              {results.snakePayment.totalSnakes} snake{results.snakePayment.totalSnakes !== 1 ? 's' : ''} · {results.snakePayment.losers.length > 1 ? `last ${results.snakePayment.losers.length} snakers split the pot` : 'last snaker pays'}
            </div>
          </div>
        )}
      </div>

      {/* CTP */}
      {round.type === 'cliffhangers' && (
        <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed rgba(212, 165, 116, 0.2)' }}>
          <div style={{ fontSize: '10px', opacity: 0.55, letterSpacing: '2px', marginBottom: '6px' }}>CLOSEST TO PIN</div>
          {PLAYERS.map((p) => (
            <div key={p} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '12px' }}>
              <span style={{ fontFamily: '"Special Elite", serif' }}>{p}</span>
              <span style={{ color: '#d4a574', fontWeight: 600 }}>{results.ctpCounts[p] || 0}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

// ============= COMPUTATION =============
function computeRoundResults(round, scores, snakes, ctp) {
  const roundScores = scores[round.id] || {};
  const roundSnakes = snakes[round.id] || {};
  const roundCtp = ctp[round.id] || {};

  // Gross / Net strokes
  const grossStrokes = {};
  const netStrokes = {};
  let allComplete = true;
  PLAYERS.forEach((p) => {
    let gross = 0;
    let hasAny = false;
    let playerComplete = true;
    for (let h = 0; h < round.holes; h++) {
      const s = roundScores[h]?.[p];
      if (s != null && s !== '') {
        const num = parseInt(s, 10);
        if (!isNaN(num)) {
          const par = round.pars[h] || 4;
          gross += capAtTripleBogey(num, par);
          hasAny = true;
        } else {
          playerComplete = false;
        }
      } else {
        playerComplete = false;
      }
    }
    if (hasAny) {
      grossStrokes[p] = gross;
      netStrokes[p] = round.type === 'standard' ? +(gross - round.strokes[p]).toFixed(1) : gross;
    }
    if (!playerComplete) allComplete = false;
  });

  // Stroke payouts only calculated when round is complete
  const strokePayouts = allComplete && Object.keys(netStrokes).length === PLAYERS.length
    ? computeStrokePayouts(netStrokes)
    : { Frosty: 0, Herby: 0, Carlos: 0 };

  // Match play points: solo win = solo gets 2; team win = each team member gets 1
  const matchPoints = { Frosty: 0, Herby: 0, Carlos: 0 };

  if (round.type === 'standard') {
    const teams = generateTeams(round.id);
    for (let h = 0; h < round.holes; h++) {
      const holeScores = roundScores[h] || {};
      if (!PLAYERS.every((p) => holeScores[p] != null && holeScores[p] !== '')) continue;
      const segment = Math.floor(h / 6);
      const solo = teams[segment];
      const team = PLAYERS.filter((p) => p !== solo);

      const netH = {};
      PLAYERS.forEach((p) => {
        const gross = parseInt(holeScores[p], 10);
        if (!isNaN(gross)) {
          const par = round.pars[h] || 4;
          const capped = capAtTripleBogey(gross, par);
          const strokesH = getHandicapStrokesPerHole(round.strokes[p], round.handicapIndex)[h] || 0;
          netH[p] = capped - strokesH;
        }
      });

      const soloNet = netH[solo];
      const teamBest = Math.min(...team.map((p) => netH[p]));

      if (soloNet < teamBest) {
        matchPoints[solo] += 2;
      } else if (teamBest < soloNet) {
        team.forEach((p) => { matchPoints[p] += 1; });
      }
      // tie = 0 points all around
    }
  }

  // Match payouts: zero-sum, $4 per point.
  const matchPayouts = { Frosty: 0, Herby: 0, Carlos: 0 };
  const matchDetails = []; // per-hole match outcomes for debt computation
  if (round.type === 'standard') {
    const teams = generateTeams(round.id);
    for (let h = 0; h < round.holes; h++) {
      const holeScores = roundScores[h] || {};
      if (!PLAYERS.every((p) => holeScores[p] != null && holeScores[p] !== '')) continue;
      const segment = Math.floor(h / 6);
      const solo = teams[segment];
      const team = PLAYERS.filter((p) => p !== solo);

      const netH = {};
      PLAYERS.forEach((p) => {
        const gross = parseInt(holeScores[p], 10);
        if (!isNaN(gross)) {
          const par = round.pars[h] || 4;
          const capped = capAtTripleBogey(gross, par);
          const strokesH = getHandicapStrokesPerHole(round.strokes[p], round.handicapIndex)[h] || 0;
          netH[p] = capped - strokesH;
        }
      });

      const soloNet = netH[solo];
      const teamBest = Math.min(...team.map((p) => netH[p]));

      if (soloNet < teamBest) {
        matchPayouts[solo] += 2 * MATCH_POINT_VALUE;
        team.forEach((p) => { matchPayouts[p] -= 1 * MATCH_POINT_VALUE; });
        matchDetails.push({ winner: 'solo', soloPlayer: solo, teamPlayers: team });
      } else if (teamBest < soloNet) {
        matchPayouts[solo] -= 2 * MATCH_POINT_VALUE;
        team.forEach((p) => { matchPayouts[p] += 1 * MATCH_POINT_VALUE; });
        matchDetails.push({ winner: 'team', soloPlayer: solo, teamPlayers: team });
      }
    }
  }

  // Snakes: last holder(s) pay total × SNAKE_VALUE
  // If multiple players snake on the final-snake hole, they split the payout owed to non-snakers
  // If all 3 snake on the last hole → wash (no money changes)
  const snakesByPlayer = {};
  PLAYERS.forEach((p) => { snakesByPlayer[p] = { count: 0 }; });
  let totalSnakes = 0;
  let lastHolders = []; // array of players who snaked on the most recent snake hole
  let lastHoleIdx = -1;
  const holeKeys = Object.keys(roundSnakes).map(Number).sort((a, b) => a - b);
  holeKeys.forEach((h) => {
    const raw = roundSnakes[h];
    const playersOnHole = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    const validPlayers = playersOnHole.filter((p) => PLAYERS.includes(p));
    if (validPlayers.length === 0) return;
    validPlayers.forEach((p) => { snakesByPlayer[p].count += 1; totalSnakes += 1; });
    if (h > lastHoleIdx) {
      lastHoleIdx = h;
      lastHolders = validPlayers;
    }
  });

  const snakeAmount = totalSnakes * SNAKE_VALUE;
  const snakePayouts = { Frosty: 0, Herby: 0, Carlos: 0 };
  // Only finalize snake payouts when the round is complete (all holes scored by all players)
  // — until then, the "last holder" can still change as more snakes happen
  if (allComplete && lastHolders.length > 0 && totalSnakes > 0) {
    const nonHolders = PLAYERS.filter((p) => !lastHolders.includes(p));
    if (nonHolders.length === 0) {
      // All 3 snaked on the last hole — wash, no payout
    } else {
      // Each last holder pays (snakeAmount / lastHolders.length) total
      // That amount is split equally among the non-holders
      const perLoser = snakeAmount / lastHolders.length;
      const perWinner = snakeAmount / lastHolders.length / nonHolders.length;
      lastHolders.forEach((p) => { snakePayouts[p] = -perLoser; });
      nonHolders.forEach((p) => { snakePayouts[p] = perWinner * lastHolders.length; });
    }
  }

  const snakePayment = {
    losers: allComplete ? lastHolders : [],
    loser: allComplete && lastHolders.length === 1 ? lastHolders[0] : null,
    totalSnakes,
    amount: snakeAmount,
    wash: allComplete && lastHolders.length === PLAYERS.length && totalSnakes > 0,
    pending: !allComplete && totalSnakes > 0,
    pendingHolders: lastHolders, // who currently holds — shown as "leading holder" if round in progress
  };

  // CTP
  const ctpCounts = {};
  PLAYERS.forEach((p) => { ctpCounts[p] = 0; });
  Object.values(roundCtp).forEach((p) => {
    if (PLAYERS.includes(p)) ctpCounts[p] += 1;
  });

  return {
    grossStrokes,
    netStrokes,
    strokePayouts,
    matchPoints,
    matchPayouts,
    matchDetails,
    snakesByPlayer,
    snakePayment,
    snakePayouts,
    ctpCounts,
  };
}

// ============= SUMMARY VIEW =============
function SummaryView({ scores, snakes, ctp, sideBets, setView }) {
  const { totals, debts, netDebts } = computeTripTotals(scores, snakes, ctp, sideBets);
  const maxTotal = Math.max(...PLAYERS.map((p) => totals[p].total));

  return (
    <div className="fade-in safe-top" style={{ paddingLeft: '16px', paddingRight: '16px', paddingBottom: '80px', maxWidth: '500px', margin: '0 auto' }}>
      <button
        onClick={() => setView('home')}
        style={{
          padding: '7px 10px',
          background: 'transparent',
          border: '1px solid rgba(212, 165, 116, 0.3)',
          color: '#d4a574',
          borderRadius: '2px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '10px',
          letterSpacing: '2px',
          marginBottom: '16px',
        }}
      >
        <ChevronLeft size={13} /> BACK
      </button>

      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <Trophy size={36} style={{ color: '#d4a574', marginBottom: '6px' }} />
        <h2 style={{ fontFamily: '"Unifraktur Maguntia", serif', fontSize: '38px', margin: 0 }}>The Ledger</h2>
        <div style={{ fontSize: '10px', letterSpacing: '3px', color: '#d4a574', marginTop: '4px' }}>
          THIRD ANNUAL HERBTOWN CLASSIC
        </div>
      </div>

      {/* Player cards */}
      {PLAYERS.map((p) => {
        const t = totals[p];
        const leader = t.total === maxTotal && maxTotal > 0;
        return (
          <div key={p} style={{
            background: 'rgba(244, 234, 213, 0.04)',
            border: `1px solid ${leader ? '#d4a574' : 'rgba(212, 165, 116, 0.25)'}`,
            padding: '14px',
            marginBottom: '10px',
            borderRadius: '2px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontFamily: '"Unifraktur Maguntia", serif', fontSize: '26px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {leader && <Crown size={18} style={{ color: '#d4a574' }} />}
                <PlayerAvatar player={p} size={36} />
                {p}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '9px', opacity: 0.5, letterSpacing: '2px' }}>TOTAL</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: t.total >= 0 ? '#6b9e4e' : '#c44b4b' }}>
                  {t.total >= 0 ? '+' : ''}${t.total}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', fontSize: '10px' }}>
              <div style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '2px' }}>
                <div style={{ opacity: 0.5, letterSpacing: '1.5px', marginBottom: '2px', fontSize: '8px' }}>STROKE</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: t.stroke >= 0 ? '#6b9e4e' : '#c44b4b' }}>
                  {t.stroke >= 0 ? '+' : ''}${t.stroke}
                </div>
              </div>
              <div style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '2px' }}>
                <div style={{ opacity: 0.5, letterSpacing: '1.5px', marginBottom: '2px', fontSize: '8px' }}>MATCH</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: t.match >= 0 ? '#6b9e4e' : '#c44b4b' }}>
                  {t.match >= 0 ? '+' : ''}${t.match}
                </div>
              </div>
              <div style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '2px' }}>
                <div style={{ opacity: 0.5, letterSpacing: '1.5px', marginBottom: '2px', fontSize: '8px' }}>SNAKES</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: t.snake >= 0 ? '#6b9e4e' : '#c44b4b' }}>
                  {t.snake >= 0 ? '+' : ''}${t.snake}
                </div>
              </div>
              <div style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '2px' }}>
                <div style={{ opacity: 0.5, letterSpacing: '1.5px', marginBottom: '2px', fontSize: '8px' }}>⚡ SIDE</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: t.side >= 0 ? '#6b9e4e' : '#c44b4b' }}>
                  {t.side >= 0 ? '+' : ''}${t.side}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Settlements section */}
      <Settlements debts={debts} netDebts={netDebts} />

      {/* Per-round breakdown */}
      <div style={{ marginTop: '24px' }}>
        <div style={{ fontSize: '10px', letterSpacing: '3px', color: '#d4a574', marginBottom: '10px', textAlign: 'center' }}>
          ⟢ ROUND BY ROUND ⟢
        </div>
        {ROUNDS.map((r) => {
          const results = computeRoundResults(r, scores, snakes, ctp);
          const hasData = Object.keys(results.grossStrokes).length > 0;
          if (!hasData) return null;
          return (
            <div key={r.id} style={{
              background: 'rgba(244, 234, 213, 0.03)',
              border: '1px solid rgba(212, 165, 116, 0.15)',
              padding: '10px 12px',
              marginBottom: '8px',
              borderRadius: '2px',
            }}>
              <div style={{ fontFamily: '"Special Elite", serif', fontSize: '13px', marginBottom: '6px', color: '#d4a574' }}>
                {r.name}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', fontSize: '11px' }}>
                {PLAYERS.map((p) => {
                  const roundTotal = (results.strokePayouts[p] || 0) + (results.matchPayouts[p] || 0) + (results.snakePayouts[p] || 0);
                  return (
                    <div key={p} style={{ textAlign: 'center' }}>
                      <div style={{ opacity: 0.55, fontSize: '10px', marginBottom: '1px' }}>{p}</div>
                      <div style={{ fontWeight: 600, color: roundTotal >= 0 ? '#6b9e4e' : '#c44b4b' }}>
                        {roundTotal >= 0 ? '+' : ''}${roundTotal}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============= SETTLEMENTS =============
function Settlements({ debts, netDebts }) {
  const rawList = [];
  PLAYERS.forEach((from) => {
    PLAYERS.forEach((to) => {
      if (from === to) return;
      const amt = Math.round(debts[from]?.[to] || 0);
      if (amt > 0) rawList.push({ from, to, amount: amt });
    });
  });

  const netList = [];
  PLAYERS.forEach((from) => {
    PLAYERS.forEach((to) => {
      if (from === to) return;
      const amt = Math.round(netDebts[from]?.[to] || 0);
      if (amt > 0) netList.push({ from, to, amount: amt });
    });
  });

  if (rawList.length === 0 && netList.length === 0) return null;

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ fontSize: '10px', letterSpacing: '3px', color: '#d4a574', marginBottom: '10px', textAlign: 'center' }}>
        ⟢ SETTLEMENTS ⟢
      </div>

      <div style={{
        background: 'rgba(107, 158, 78, 0.08)',
        border: '1px solid #6b9e4e',
        padding: '14px',
        borderRadius: '2px',
        marginBottom: '10px',
      }}>
        <div style={{ fontSize: '10px', letterSpacing: '2px', color: '#6b9e4e', marginBottom: '8px', fontWeight: 600 }}>
          NET SETTLEMENT (WHO PAYS WHO)
        </div>
        {netList.length === 0 ? (
          <div style={{ fontSize: '12px', opacity: 0.6, textAlign: 'center', padding: '8px' }}>Everyone's even!</div>
        ) : (
          netList.map((d, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 4px',
              borderBottom: i < netList.length - 1 ? '1px dashed rgba(107, 158, 78, 0.2)' : 'none',
            }}>
              <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PlayerAvatar player={d.from} size={24} />
                <span style={{ fontFamily: '"Special Elite", serif', color: '#c44b4b' }}>{d.from}</span>
                <span style={{ opacity: 0.5, margin: '0 4px' }}>→</span>
                <PlayerAvatar player={d.to} size={24} />
                <span style={{ fontFamily: '"Special Elite", serif', color: '#6b9e4e' }}>{d.to}</span>
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#d4a574' }}>${d.amount}</div>
            </div>
          ))
        )}
      </div>

      <details style={{
        background: 'rgba(244, 234, 213, 0.03)',
        border: '1px solid rgba(212, 165, 116, 0.2)',
        borderRadius: '2px',
        padding: '10px 14px',
      }}>
        <summary style={{
          fontSize: '10px', letterSpacing: '2px', color: '#d4a574',
          cursor: 'pointer', fontWeight: 600, listStyle: 'none',
        }}>
          ▸ SHOW RAW DEBTS ({rawList.length} transactions)
        </summary>
        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed rgba(212, 165, 116, 0.2)' }}>
          {rawList.length === 0 ? (
            <div style={{ fontSize: '11px', opacity: 0.6, textAlign: 'center', padding: '8px' }}>No debts yet</div>
          ) : (
            rawList.map((d, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '5px 0', fontSize: '11px', opacity: 0.8,
              }}>
                <div>
                  <span style={{ fontFamily: '"Special Elite", serif' }}>{d.from}</span>
                  <span style={{ opacity: 0.5, margin: '0 6px' }}>owes</span>
                  <span style={{ fontFamily: '"Special Elite", serif' }}>{d.to}</span>
                </div>
                <div style={{ fontWeight: 600, color: '#d4a574' }}>${d.amount}</div>
              </div>
            ))
          )}
        </div>
      </details>
    </div>
  );
}
