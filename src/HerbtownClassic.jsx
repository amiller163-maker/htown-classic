import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, ChevronLeft, ChevronRight, RotateCcw, Check, Flag, Crown } from 'lucide-react';
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
    holes: 9,
    type: 'cliffhangers',
    // Everyone plays same tees at Cliffhangers
    tees: { Frosty: 'Back', Herby: 'Back', Carlos: 'Back' },
    strokes: { Frosty: 0, Herby: 0, Carlos: 0 },
    // All par 3s (9 holes)
    pars: [3, 3, 3, 3, 3, 3, 3, 3, 3],
    // No hcp index on card → use hole order
    handicapIndex: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  },
  {
    id: 'buffalo_fri',
    name: 'Buffalo Ridge (Forecaddie)',
    day: 'Friday 7AM',
    holes: 18,
    type: 'standard',
    tees: { Frosty: 'Black/Blue', Herby: 'Black/Blue', Carlos: 'Blue/White' },
    strokes: { Frosty: 0, Herby: 7.5, Carlos: 4 },
    // Buffalo Ridge: 5,4,4,3,4,4,3,5,3 | 4,3,4,4,5,4,4,3,5 = Par 71
    pars: [5, 4, 4, 3, 4, 4, 3, 5, 3, 4, 3, 4, 4, 5, 4, 4, 3, 5],
    // HCP: 5,1,9,17,7,13,11,3,15 | 12,18,4,8,2,14,10,16,6
    handicapIndex: [5, 1, 9, 17, 7, 13, 11, 3, 15, 12, 18, 4, 8, 2, 14, 10, 16, 6],
  },
  {
    id: 'ozarks_fri',
    name: 'Ozarks National',
    day: 'Friday 1:20PM',
    holes: 18,
    type: 'standard',
    tees: { Frosty: 'Black/Blue', Herby: 'Black/Blue', Carlos: 'Blue/White' },
    strokes: { Frosty: 0, Herby: 7, Carlos: 3.5 },
    // Ozarks: 5,3,4,4,4,3,5,3,5 | 4,5,3,4,4,4,4,3,4 = Par 71
    pars: [5, 3, 4, 4, 4, 3, 5, 3, 5, 4, 5, 3, 4, 4, 4, 4, 3, 4],
    // HCP: 8,18,14,2,10,12,6,16,4 | 13,9,11,3,5,15,1,17,7
    handicapIndex: [8, 18, 14, 2, 10, 12, 6, 16, 4, 13, 9, 11, 3, 5, 15, 1, 17, 7],
  },
  {
    id: 'ozarks_sat',
    name: 'Ozarks (Forecaddie)',
    day: 'Saturday 7:40AM',
    holes: 18,
    type: 'standard',
    tees: { Frosty: 'Black/Blue', Herby: 'Black/Blue', Carlos: 'Blue/White' },
    strokes: { Frosty: 0, Herby: 7, Carlos: 3.5 },
    pars: [5, 3, 4, 4, 4, 3, 5, 3, 5, 4, 5, 3, 4, 4, 4, 4, 3, 4],
    handicapIndex: [8, 18, 14, 2, 10, 12, 6, 16, 4, 13, 9, 11, 3, 5, 15, 1, 17, 7],
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
  },
  {
    id: 'paynes',
    name: 'Paynes Valley',
    day: 'Sunday 8AM',
    holes: 18,
    type: 'standard',
    tees: { Frosty: 'Blue', Herby: 'Blue', Carlos: 'White' },
    strokes: { Frosty: 0, Herby: 7, Carlos: 2 },
    // Paynes: 4,3,4,5,3,4,4,5,4 | 3,4,4,5,4,4,3,4,5 = Par 72
    pars: [4, 3, 4, 5, 3, 4, 4, 5, 4, 3, 4, 4, 5, 4, 4, 3, 4, 5],
    // HCP: 3,7,17,11,9,13,15,5,1 | 16,12,18,2,10,4,14,8,6
    handicapIndex: [3, 7, 17, 11, 9, 13, 15, 5, 1, 16, 12, 18, 2, 10, 4, 14, 8, 6],
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

// Resolve combo tees to actual tee used on a specific hole (based on handicap index)
// For 18-hole courses: handicap index 1-9 (harder) → first color, 10-18 (easier) → second color
const resolveTeeForHole = (teeString, handicapIdx) => {
  if (!teeString) return null;
  if (!teeString.includes('/')) return teeString; // not a combo
  const [harder, easier] = teeString.split('/');
  return handicapIdx <= 9 ? harder : easier;
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
  const [view, setView] = useState('home');

  const loadData = useCallback(() => {
    // Set up real-time listeners on each path — updates push instantly to all phones
    const scoresRef = ref(db, 'scores');
    const snakesRef = ref(db, 'snakes');
    const ctpRef = ref(db, 'ctp');

    const unsubScores = onValue(scoresRef, (snap) => {
      setScores(snap.val() || {});
      setLoading(false);
    }, (err) => {
      console.error('Firebase scores error:', err);
      setLoading(false);
    });
    const unsubSnakes = onValue(snakesRef, (snap) => setSnakes(snap.val() || {}));
    const unsubCtp = onValue(ctpRef, (snap) => setCtp(snap.val() || {}));

    return () => { unsubScores(); unsubSnakes(); unsubCtp(); };
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

  const resetAll = async () => {
    if (!confirm('Reset ALL scores for ALL rounds? This cannot be undone.')) return;
    await saveScores({});
    await saveSnakes({});
    await saveCtp({});
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
      `}</style>

      {view === 'home' && (
        <HomeView
          setRoundIdx={setRoundIdx}
          setView={setView}
          scores={scores}
          snakes={snakes}
          ctp={ctp}
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
          saveScores={saveScores}
          saveSnakes={saveSnakes}
          saveCtp={saveCtp}
          setView={setView}
          setRoundIdx={setRoundIdx}
        />
      )}
      {view === 'summary' && (
        <SummaryView
          scores={scores}
          snakes={snakes}
          ctp={ctp}
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
function HomeView({ setRoundIdx, setView, scores, snakes, ctp, resetAll }) {
  return (
    <div className="fade-in" style={{ padding: '20px 18px 100px', maxWidth: '500px', margin: '0 auto' }}>
      {/* Header - Logo */}
      <div style={{ textAlign: 'center', marginBottom: '20px', paddingTop: '8px' }}>
        <HerbtownLogo />
        <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '10px', opacity: 0.6 }}>
          <span className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6b9e4e', display: 'inline-block' }}></span>
          LIVE · SYNCED
        </div>
      </div>

      {/* Trip Standings */}
      <TripStandings scores={scores} snakes={snakes} ctp={ctp} />

      {/* Rounds */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '10px', letterSpacing: '3px', color: '#d4a574', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, #d4a574)' }}></div>
          THE ROUNDS
          <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, #d4a574, transparent)' }}></div>
        </div>
        {ROUNDS.map((r, i) => {
          const progress = getRoundProgress(r, scores);
          return (
            <button
              key={r.id}
              onClick={() => { setRoundIdx(i); setView('round'); }}
              style={{
                width: '100%',
                marginBottom: '8px',
                padding: '14px 16px',
                background: progress === r.holes ? 'rgba(107, 158, 78, 0.12)' : 'rgba(244, 234, 213, 0.05)',
                border: `1px solid ${progress === r.holes ? '#6b9e4e' : 'rgba(212, 165, 116, 0.3)'}`,
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
                  {progress}/{r.holes} holes
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {progress === r.holes && <Check size={16} style={{ color: '#6b9e4e' }} />}
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
        <button
          onClick={resetAll}
          style={{
            padding: '14px 16px',
            background: 'transparent',
            border: '1px solid rgba(244, 234, 213, 0.2)',
            borderRadius: '2px',
            color: 'rgba(244, 234, 213, 0.5)',
          }}
        >
          <RotateCcw size={14} />
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

// ============= TRIP STANDINGS =============
function TripStandings({ scores, snakes, ctp }) {
  const totals = computeTripTotals(scores, snakes, ctp);
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

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.6fr 0.6fr 0.55fr 0.8fr', gap: '6px', fontSize: '9px', opacity: 0.55, letterSpacing: '1px', marginBottom: '6px', padding: '0 2px' }}>
        <div>PLAYER</div>
        <div style={{ textAlign: 'center' }}>STROKE</div>
        <div style={{ textAlign: 'center' }}>MATCH</div>
        <div style={{ textAlign: 'center' }}>🐍</div>
        <div style={{ textAlign: 'right' }}>TOTAL</div>
      </div>
      {PLAYERS.map((p, idx) => {
        const t = totals[p];
        const leader = t.total === maxTotal && maxTotal !== 0;
        return (
          <div key={p} style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.6fr 0.6fr 0.55fr 0.8fr',
            gap: '6px',
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
            <div style={{ textAlign: 'right', fontSize: '15px', fontWeight: 700, color: t.total >= 0 ? '#6b9e4e' : '#c44b4b' }}>
              {t.total >= 0 ? '+' : ''}${t.total}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function computeTripTotals(scores, snakes, ctp) {
  const totals = {};
  PLAYERS.forEach((p) => { totals[p] = { stroke: 0, match: 0, snake: 0, total: 0, matchPoints: 0 }; });

  ROUNDS.forEach((round) => {
    const r = computeRoundResults(round, scores, snakes, ctp);
    PLAYERS.forEach((p) => {
      totals[p].stroke += r.strokePayouts[p] || 0;
      totals[p].match += r.matchPayouts[p] || 0;
      totals[p].snake += r.snakePayouts[p] || 0;
      totals[p].matchPoints += r.matchPoints[p] || 0;
    });
  });

  PLAYERS.forEach((p) => {
    totals[p].total = totals[p].stroke + totals[p].match + totals[p].snake;
    totals[p].stroke = Math.round(totals[p].stroke);
    totals[p].match = Math.round(totals[p].match);
    totals[p].snake = Math.round(totals[p].snake);
    totals[p].total = Math.round(totals[p].total);
  });
  return totals;
}

// ============= ROUND VIEW =============
function RoundView({ round, roundIdx, scores, snakes, ctp, saveScores, saveSnakes, saveCtp, setView, setRoundIdx }) {
  const [currentHole, setCurrentHole] = useState(0);
  const roundScores = scores[round.id] || {};
  const roundSnakes = snakes[round.id] || {};
  const roundCtp = ctp[round.id] || {};

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
    const newScores = { ...scores };
    if (!newScores[round.id]) newScores[round.id] = {};
    if (!newScores[round.id][holeIdx]) newScores[round.id][holeIdx] = {};
    newScores[round.id][holeIdx][player] = value;
    saveScores(newScores);
  };

  const toggleSnake = (holeIdx, player) => {
    const newSnakes = { ...snakes };
    if (!newSnakes[round.id]) newSnakes[round.id] = {};
    if (newSnakes[round.id][holeIdx] === player) {
      delete newSnakes[round.id][holeIdx];
    } else {
      newSnakes[round.id][holeIdx] = player;
    }
    saveSnakes(newSnakes);
  };

  const setCtpWinner = (holeIdx, player) => {
    const newCtp = { ...ctp };
    if (!newCtp[round.id]) newCtp[round.id] = {};
    if (newCtp[round.id][holeIdx] === player) {
      delete newCtp[round.id][holeIdx];
    } else {
      newCtp[round.id][holeIdx] = player;
    }
    saveCtp(newCtp);
  };

  const results = computeRoundResults(round, scores, snakes, ctp);
  const teams = round.type === 'standard' ? generateTeams(round.id) : null;

  return (
    <div className="fade-in" style={{ padding: '16px 14px 120px', maxWidth: '500px', margin: '0 auto' }}>
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

      <HoleStrip round={round} currentHole={currentHole} setCurrentHole={setCurrentHole} roundScores={roundScores} />

      <HoleCard
        round={round}
        holeIdx={currentHole}
        roundScores={roundScores}
        roundSnakes={roundSnakes}
        roundCtp={roundCtp}
        setHoleScore={setHoleScore}
        toggleSnake={toggleSnake}
        setCtpWinner={setCtpWinner}
        teams={teams}
      />

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

      <RoundSummary round={round} results={results} />
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

function HoleCard({ round, holeIdx, roundScores, roundSnakes, roundCtp, setHoleScore, toggleSnake, setCtpWinner, teams }) {
  const holeScores = roundScores[holeIdx] || {};
  const par = round.pars[holeIdx] || 4;
  const hcpIdx = round.handicapIndex[holeIdx] || holeIdx + 1;
  const snakeHolder = roundSnakes[holeIdx];
  const ctpWinner = roundCtp[holeIdx];

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
          const isSnake = snakeHolder === p;
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
                  <TeeBadge tee={resolveTeeForHole(round.tees[p], hcpIdx)} />
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
    </div>
  );
}

// ============= ROUND SUMMARY =============
function RoundSummary({ round, results }) {
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
        {results.snakePayment.loser && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            background: 'rgba(196, 75, 75, 0.1)',
            border: '1px solid rgba(196, 75, 75, 0.4)',
            borderRadius: '2px',
            fontSize: '11px',
            textAlign: 'center',
            letterSpacing: '1px',
          }}>
            <span style={{ color: '#c44b4b', fontWeight: 700 }}>{results.snakePayment.loser}</span> pays <span style={{ color: '#c44b4b', fontWeight: 700 }}>${results.snakePayment.amount}</span>
            <div style={{ fontSize: '9px', opacity: 0.6, marginTop: '2px' }}>
              ({results.snakePayment.totalSnakes} snake{results.snakePayment.totalSnakes !== 1 ? 's' : ''} · last holder pays · split ${results.snakePayment.amount / 2} to each)
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

      {/* Round total */}
      <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #d4a574' }}>
        <div style={{ fontSize: '10px', opacity: 0.7, letterSpacing: '2px', marginBottom: '6px', color: '#d4a574' }}>ROUND TOTAL</div>
        {PLAYERS.map((p) => {
          const total = (results.strokePayouts[p] || 0) + (results.matchPayouts[p] || 0) + (results.snakePayouts[p] || 0);
          return (
            <div key={p} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '14px' }}>
              <span style={{ fontFamily: '"Special Elite", serif' }}>{p}</span>
              <span style={{ fontWeight: 700, color: total >= 0 ? '#6b9e4e' : '#c44b4b' }}>
                {total >= 0 ? '+' : ''}${total}
              </span>
            </div>
          );
        })}
      </div>
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

  // Match payouts: zero-sum, $4 per point. Net redistribution — each player's $ = (their pts - avg pts) * $4 × 3
  // Simpler: match $ net = (matchPoints[p] * 4) - (avgPoints * 4). But that doesn't zero-sum cleanly with 2/1/1.
  // Correct zero-sum: Each point is worth $4 taken from the pool. Total points distributed = variable per hole.
  // Per round: player's match $ = (points won × $4) - (their share of total points paid out × $4)
  // Since at each hole either solo gets 2 or team gets 1 each (2 total distributed), payouts must zero-sum.
  // Best interpretation: everyone starts at 0, each hole the winner(s) gain points, loser(s) lose points equivalently.
  // Solo wins hole: solo +2, each of team -1 → net 0 for hole
  // Team wins hole: each team +1, solo -2 → net 0 for hole
  // So effectively: matchPayouts[p] = matchPoints[p] × $4 ... but we need to ALSO subtract points "lost"
  // Let's recompute with both gains and losses
  const matchPayouts = { Frosty: 0, Herby: 0, Carlos: 0 };
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
        // Solo wins: gets $8 (2 pts), each team member loses $4 (1 pt)
        matchPayouts[solo] += 2 * MATCH_POINT_VALUE;
        team.forEach((p) => { matchPayouts[p] -= 1 * MATCH_POINT_VALUE; });
      } else if (teamBest < soloNet) {
        // Team wins: each gets $4 (1 pt), solo loses $8 (2 pts)
        matchPayouts[solo] -= 2 * MATCH_POINT_VALUE;
        team.forEach((p) => { matchPayouts[p] += 1 * MATCH_POINT_VALUE; });
      }
    }
  }

  // Snakes: last holder pays total × SNAKE_VALUE, split evenly to other two
  const snakesByPlayer = {};
  PLAYERS.forEach((p) => { snakesByPlayer[p] = { count: 0 }; });
  let lastHolder = null;
  let totalSnakes = 0;
  const holeKeys = Object.keys(roundSnakes).map(Number).sort((a, b) => a - b);
  holeKeys.forEach((h) => {
    const p = roundSnakes[h];
    if (PLAYERS.includes(p)) {
      snakesByPlayer[p].count += 1;
      lastHolder = p;
      totalSnakes += 1;
    }
  });

  const snakeAmount = totalSnakes * SNAKE_VALUE;
  const snakePayouts = { Frosty: 0, Herby: 0, Carlos: 0 };
  if (lastHolder && totalSnakes > 0) {
    snakePayouts[lastHolder] = -snakeAmount;
    PLAYERS.filter((p) => p !== lastHolder).forEach((p) => {
      snakePayouts[p] = snakeAmount / 2;
    });
  }

  const snakePayment = {
    loser: lastHolder,
    totalSnakes,
    amount: snakeAmount,
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
    snakesByPlayer,
    snakePayment,
    snakePayouts,
    ctpCounts,
  };
}

// ============= SUMMARY VIEW =============
function SummaryView({ scores, snakes, ctp, setView }) {
  const totals = computeTripTotals(scores, snakes, ctp);
  const maxTotal = Math.max(...PLAYERS.map((p) => totals[p].total));

  return (
    <div className="fade-in" style={{ padding: '20px 16px 80px', maxWidth: '500px', margin: '0 auto' }}>
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
                {p}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '9px', opacity: 0.5, letterSpacing: '2px' }}>TOTAL</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: t.total >= 0 ? '#6b9e4e' : '#c44b4b' }}>
                  {t.total >= 0 ? '+' : ''}${t.total}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '10px' }}>
              <div style={{ padding: '7px', background: 'rgba(0,0,0,0.2)', borderRadius: '2px' }}>
                <div style={{ opacity: 0.5, letterSpacing: '1.5px', marginBottom: '2px', fontSize: '9px' }}>STROKE</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: t.stroke >= 0 ? '#6b9e4e' : '#c44b4b' }}>
                  {t.stroke >= 0 ? '+' : ''}${t.stroke}
                </div>
              </div>
              <div style={{ padding: '7px', background: 'rgba(0,0,0,0.2)', borderRadius: '2px' }}>
                <div style={{ opacity: 0.5, letterSpacing: '1.5px', marginBottom: '2px', fontSize: '9px' }}>MATCH · {t.matchPoints}pts</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: t.match >= 0 ? '#6b9e4e' : '#c44b4b' }}>
                  {t.match >= 0 ? '+' : ''}${t.match}
                </div>
              </div>
              <div style={{ padding: '7px', background: 'rgba(0,0,0,0.2)', borderRadius: '2px' }}>
                <div style={{ opacity: 0.5, letterSpacing: '1.5px', marginBottom: '2px', fontSize: '9px' }}>SNAKES</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: t.snake >= 0 ? '#6b9e4e' : '#c44b4b' }}>
                  {t.snake >= 0 ? '+' : ''}${t.snake}
                </div>
              </div>
            </div>
          </div>
        );
      })}

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
