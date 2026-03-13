/* ============================================
   Georgia Sports Hub — app.js
   ESPN public API, no key required
   ============================================ */

const BASE = 'https://site.api.espn.com/apis/site/v2/sports';

const TEAMS = [
  {
    id: 'falcons',
    name: 'Atlanta Falcons',
    short: 'Falcons',
    sport: 'football',
    league: 'nfl',
    key: 'ATL',
    color: '#A71930',
    bg: 'linear-gradient(135deg,#1a0408,#2d0a0f)',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png',
    emoji: '🏈',
    type: 'pro',
    group: 'Atlanta Pro Teams',
  },
  {
    id: 'braves',
    name: 'Atlanta Braves',
    short: 'Braves',
    sport: 'baseball',
    league: 'mlb',
    key: 'ATL',
    color: '#CE1141',
    bg: 'linear-gradient(135deg,#1a0408,#2d0a0f)',
    logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/atl.png',
    emoji: '⚾',
    type: 'pro',
    group: 'Atlanta Pro Teams',
  },
  {
    id: 'hawks',
    name: 'Atlanta Hawks',
    short: 'Hawks',
    sport: 'basketball',
    league: 'nba',
    key: 'ATL',
    color: '#E03A3E',
    bg: 'linear-gradient(135deg,#E03A3E,#8B0000)',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/atl.png',
    emoji: '🏀',
    type: 'pro',
    group: 'Atlanta Pro Teams',
  },
  {
    id: 'united',
    name: 'Atlanta United FC',
    short: 'United',
    sport: 'soccer',
    league: 'usa.1',
    key: '18418',
    color: '#80000A',
    bg: 'linear-gradient(135deg,#0d0102,#1a0204)',
    logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/18418.png',
    emoji: '⚽',
    type: 'pro',
    group: 'Atlanta Pro Teams',
  },
  {
    id: 'uga-football',
    name: 'UGA Bulldogs Football',
    short: 'UGA Football',
    sport: 'football',
    league: 'college-football',
    key: '61',
    color: '#BA0C2F',
    bg: 'linear-gradient(135deg,#150308,#0f0f0f)',
    logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/61.png',
    emoji: '🏈',
    type: 'college',
    group: 'UGA Bulldogs',
  },
  {
    id: 'uga-mbball',
    name: "UGA Men's Basketball",
    short: "UGA Men's",
    sport: 'basketball',
    league: 'mens-college-basketball',
    key: '61',
    color: '#BA0C2F',
    bg: 'linear-gradient(135deg,#150308,#0f0f0f)',
    logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/61.png',
    emoji: '🏀',
    type: 'college',
    group: 'UGA Bulldogs',
  },
  {
    id: 'uga-wbball',
    name: "UGA Women's Basketball",
    short: "UGA Women's",
    sport: 'basketball',
    league: 'womens-college-basketball',
    key: '61',
    color: '#BA0C2F',
    bg: 'linear-gradient(135deg,#150308,#0f0f0f)',
    logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/61.png',
    emoji: '🏀',
    type: 'college',
    group: 'UGA Bulldogs',
  },
];

// ── State ──────────────────────────────────────────────────────────────────────
let allData = {};       // { [teamId]: { teamInfo, games, news } }
let activeTeam = 'all';

// ── API Helpers ────────────────────────────────────────────────────────────────
async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.json();
}

async function loadTeamData(team) {
  try {
    // 1. Team info (gives us numeric ID for news, plus record)
    const infoData = await apiFetch(`${BASE}/${team.sport}/${team.league}/teams/${team.key}`);
    const espnNumericId = infoData.team?.id;

    // 2. Fetch schedule and news in parallel
    const [schedData, newsData] = await Promise.allSettled([
      apiFetch(`${BASE}/${team.sport}/${team.league}/teams/${team.key}/schedule`),
      apiFetch(`${BASE}/${team.sport}/${team.league}/news?team=${espnNumericId || team.key}&limit=8`),
    ]);

    const events = schedData.status === 'fulfilled' ? (schedData.value.events || []) : [];
    const articles = newsData.status === 'fulfilled' ? (newsData.value.articles || []) : [];

    // Parse record — use summary string directly
    const record = infoData.team?.record?.items?.[0]?.summary || '';

    return {
      teamInfo: infoData.team,
      record,
      games: parseGames(events, team.key),
      news: articles,
    };
  } catch (err) {
    console.warn(`Could not load data for ${team.name}:`, err.message);
    return { teamInfo: null, record: '', games: {}, news: [] };
  }
}

function parseGames(events, teamKey) {
  const now = new Date();
  const live = [];
  const recent = [];
  const upcoming = [];

  for (const event of events) {
    const comp = event.competitions?.[0];
    if (!comp) continue;
    const state = comp.status?.type?.state;
    const eventDate = new Date(comp.date);
    const info = extractGameInfo(event, teamKey);
    if (!info) continue;

    if (state === 'in') {
      live.push(info);
    } else if (state === 'post') {
      recent.push(info);
    } else if (state === 'pre') {
      upcoming.push(info);
    }
  }

  // Sort recent desc, upcoming asc
  recent.sort((a, b) => b.date - a.date);
  upcoming.sort((a, b) => a.date - b.date);

  return {
    live,
    lastGame: recent[0] || null,
    nextGame: upcoming[0] || null,
    recentGames: recent.slice(0, 5),
    upcomingGames: upcoming.slice(0, 5),
  };
}

function extractGameInfo(event, teamKey) {
  const comp = event.competitions?.[0];
  if (!comp) return null;
  const home = comp.competitors?.find(c => c.homeAway === 'home');
  const away = comp.competitors?.find(c => c.homeAway === 'away');
  if (!home || !away) return null;

  const status = comp.status?.type;
  const date = new Date(comp.date);

  // Which side is "our" team?
  const isHome = isOurTeam(home.team, teamKey);
  const ourSide = isHome ? home : away;
  const oppSide = isHome ? away : home;
  const scoreVal = s => s?.score?.displayValue ?? s?.score ?? '-';
  const ourScore = parseInt(scoreVal(ourSide), 10);
  const oppScore = parseInt(scoreVal(oppSide), 10);

  let result = null;
  if (status?.state === 'post' && !isNaN(ourScore) && !isNaN(oppScore)) {
    result = ourScore > oppScore ? 'W' : ourScore < oppScore ? 'L' : 'T';
  }

  const tv = comp.broadcasts?.flatMap(b => b.names || []).join(', ') || '';

  return {
    id: event.id,
    name: event.name,
    date,
    state: status?.state,
    statusText: status?.description || '',
    clock: comp.status?.displayClock || '',
    period: comp.status?.period,
    isHome,
    home: {
      name: home.team?.displayName || home.team?.shortDisplayName || home.team?.abbreviation,
      abbrev: home.team?.abbreviation,
      score: home.score?.displayValue ?? home.score ?? '-',
      winner: home.winner || false,
      logo: home.team?.logos?.[0]?.href || home.team?.logo || '',
    },
    away: {
      name: away.team?.displayName || away.team?.shortDisplayName || away.team?.abbreviation,
      abbrev: away.team?.abbreviation,
      score: away.score?.displayValue ?? away.score ?? '-',
      winner: away.winner || false,
      logo: away.team?.logos?.[0]?.href || away.team?.logo || '',
    },
    our: { score: scoreVal(ourSide), winner: ourSide.winner || false },
    opp: { name: oppSide.team?.displayName || oppSide.team?.abbreviation, score: scoreVal(oppSide) },
    result,
    tv,
    venue: comp.venue?.fullName || '',
  };
}

function isOurTeam(team, key) {
  if (!team) return false;
  const k = String(key).toLowerCase();
  return (
    String(team.id) === k ||
    (team.abbreviation || '').toLowerCase() === k ||
    (team.slug || '').toLowerCase().includes(k)
  );
}

// ── Formatting ─────────────────────────────────────────────────────────────────
function fmtDate(date) {
  if (!(date instanceof Date) || isNaN(date)) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtDateTime(date) {
  if (!(date instanceof Date) || isNaN(date)) return '';
  const d = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const t = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${d} · ${t}`;
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return '';
  const sec = Math.floor((Date.now() - date) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return fmtDate(date);
}

// ── Render Helpers ─────────────────────────────────────────────────────────────
function logoImg(url, cls, fallback) {
  if (!url) return `<div class="${cls}-placeholder" style="background:var(--surface2)">${fallback || '🏅'}</div>`;
  return `<img class="${cls}" src="${url}" alt="" loading="lazy" onerror="this.style.display='none'">`;
}

function renderScorePanel(games, team) {
  const live = games.live || [];
  const lastGame = games.lastGame || null;
  const nextGame = games.nextGame || null;
  const game = live[0] || lastGame;
  const parts = [];

  if (game) {
    const label = live.length ? 'Live Now' : 'Last Game';
    const state = game.state;
    let statusEl = '';
    if (state === 'in') {
      const periodLabel = game.period ? `Q${game.period}` : '';
      statusEl = `<div class="game-status status-live"><span class="live-dot"></span>${periodLabel} ${game.clock}</div>`;
    } else {
      statusEl = `<div class="game-status status-final">${game.statusText}</div>`;
    }

    const awayWin = game.away.winner;
    const homeWin = game.home.winner;
    const awayScoreCls = state === 'post' ? (awayWin ? 'winner' : 'loser') : '';
    const homeScoreCls = state === 'post' ? (homeWin ? 'winner' : 'loser') : '';

    parts.push(`
      <div class="game-panel">
        <div class="game-panel-label">${label}</div>
        <div class="game-row">
          <div class="game-team-block">
            ${logoImg(game.away.logo, 'game-team-logo', game.away.abbrev)}
            <span class="game-team-abbrev">${game.away.abbrev || ''}</span>
          </div>
          <div class="game-scores">
            <div class="score-line">
              <span class="score-num ${awayScoreCls}">${game.away.score}</span>
              <span class="score-separator">–</span>
              <span class="score-num ${homeScoreCls}">${game.home.score}</span>
            </div>
            ${statusEl}
            <div class="game-date">${fmtDate(game.date)}${game.tv ? ` · ${game.tv}` : ''}</div>
          </div>
          <div class="game-team-block">
            ${logoImg(game.home.logo, 'game-team-logo', game.home.abbrev)}
            <span class="game-team-abbrev">${game.home.abbrev || ''}</span>
          </div>
        </div>
      </div>
    `);
  }

  if (nextGame && !live.length) {
    parts.push(`
      <div class="game-panel" style="padding-bottom:12px">
        <div class="game-panel-label">Next Game</div>
        <div class="upcoming-row">
          <div>
            <div class="upcoming-matchup">${nextGame.away.abbrev} @ ${nextGame.home.abbrev}</div>
            <div class="game-status status-upcoming" style="margin-top:3px">${fmtDateTime(nextGame.date)}</div>
            ${nextGame.tv ? `<div class="game-date">${nextGame.tv}</div>` : ''}
          </div>
          ${logoImg(nextGame.away.logo, 'game-team-logo', nextGame.away.abbrev)}
        </div>
      </div>
    `);
  }

  if (!game && !nextGame) {
    parts.push(`<div class="game-panel"><div class="no-data">No games scheduled right now.</div></div>`);
  }

  return parts.join('');
}

function renderNewsPanel(articles, max = 3) {
  if (!articles.length) {
    return `<div class="news-panel"><div class="no-data">No news available.</div></div>`;
  }
  const items = articles.slice(0, max).map(a => {
    const img = a.images?.[0]?.url;
    const url = a.links?.web?.href || '#';
    const thumb = img
      ? `<img class="news-thumb" src="${img}" alt="" loading="lazy" onerror="this.style.display='none'">`
      : `<div class="news-thumb-placeholder" style="background:var(--surface2)">📰</div>`;
    return `
      <a class="news-item" href="${url}" target="_blank" rel="noopener noreferrer">
        ${thumb}
        <div class="news-text">
          <div class="news-headline">${escHtml(a.headline || '')}</div>
          <div class="news-meta">${timeAgo(a.published)}</div>
        </div>
      </a>
    `;
  }).join('');
  return `<div class="news-panel"><div class="news-panel-label">Latest News</div>${items}</div>`;
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Dashboard (All Teams) ──────────────────────────────────────────────────────
function renderDashboard() {
  const groups = {};
  for (const team of TEAMS) {
    if (!groups[team.group]) groups[team.group] = [];
    groups[team.group].push(team);
  }

  const html = Object.entries(groups).map(([groupName, teams]) => {
    const cards = teams.map(team => { try { return renderTeamCard(team); } catch(e) { console.error('Card error', team.id, e); return ''; } }).join('');
    return `
      <div class="group-block">
        <div class="section-label">${groupName}</div>
        <div class="team-grid">${cards}</div>
      </div>
    `;
  }).join('');

  document.getElementById('mainContainer').innerHTML = html;
  bindCardHeaders();
}

function renderTeamCard(team) {
  const data = allData[team.id] || {};
  const games = data.games || {};
  const news = data.news || [];
  const record = data.record ? `<span style="color:var(--text-muted)">${data.record}</span>` : '';

  const badgeStyle = `background:${team.color}22;color:${team.color};`;
  const badgeLabel = team.type === 'college' ? 'NCAA' : 'PRO';

  return `
    <div class="team-card" id="card-${team.id}">
      <div class="team-card-header" data-team="${team.id}" role="button" tabindex="0">
        ${logoImg(team.logo, 'team-logo', team.emoji)}
        <div class="team-meta">
          <div class="team-name">${team.name}</div>
          <div class="team-record">${record || '&nbsp;'}</div>
        </div>
        <span class="team-badge" style="${badgeStyle}">${badgeLabel}</span>
      </div>
      ${renderScorePanel(games, team)}
      ${renderNewsPanel(news, 3)}
    </div>
  `;
}

// ── Single Team View ────────────────────────────────────────────────────────────
function renderTeamView(team) {
  const data = allData[team.id] || {};
  const games = data.games || {};
  const news = data.news || [];
  const record = data.record || '';

  // Hero
  const heroHtml = `
    <div class="team-view-hero" style="background:${team.bg};border:1px solid ${team.color}44">
      ${logoImg(team.logo, 'team-view-logo', team.emoji)}
      <div>
        <div class="team-view-name">${team.name}</div>
        <div class="team-view-record" style="color:${team.color}">${record || 'Season in progress'}</div>
      </div>
    </div>
  `;

  // Schedule
  const allGames = [
    ...(games.live || []),
    ...(games.recentGames || []),
    ...(games.upcomingGames || []),
  ];

  let schedHtml = '';
  if (allGames.length === 0) {
    schedHtml = `<div class="error-state">No schedule data available.</div>`;
  } else {
    // Show live first, then upcoming, then recent
    const ordered = [
      ...(games.live || []),
      ...(games.upcomingGames || []),
      ...(games.recentGames || []),
    ];
    schedHtml = ordered.map(g => {
      let resultHtml = '';
      if (g.state === 'in') {
        const per = g.period ? `Q${g.period}` : '';
        resultHtml = `<div class="sched-result"><span class="live-dot"></span>${per} ${g.clock}</div>`;
      } else if (g.state === 'post' && g.result) {
        const cls = g.result === 'W' ? 'win' : g.result === 'L' ? 'loss' : '';
        const score = `${g.our.score}–${g.opp.score}`;
        resultHtml = `<div class="sched-result"><span class="${cls}">${g.result} ${score}</span></div>`;
      } else {
        resultHtml = `<div class="sched-result"><span class="upcoming">${g.date.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</span></div>`;
      }

      return `
        <div class="sched-item">
          <div>
            <div class="sched-matchup">${escHtml(g.name || `${g.away.abbrev} @ ${g.home.abbrev}`)}</div>
            <div class="sched-date">${fmtDate(g.date)}${g.tv ? ` · ${g.tv}` : ''}${g.venue ? ` · ${escHtml(g.venue)}` : ''}</div>
          </div>
          ${resultHtml}
        </div>
      `;
    }).join('');
  }

  // News
  let newsHtml = '';
  if (!news.length) {
    newsHtml = `<div class="error-state">No news available.</div>`;
  } else {
    newsHtml = news.map(a => {
      const img = a.images?.[0]?.url;
      const url = a.links?.web?.href || '#';
      const thumb = img
        ? `<img class="news-thumb-full" src="${img}" alt="" loading="lazy" onerror="this.style.display='none'">`
        : `<div class="news-thumb-placeholder-full" style="background:var(--surface2)">${team.emoji}</div>`;
      return `
        <a class="news-item-full" href="${url}" target="_blank" rel="noopener noreferrer">
          ${thumb}
          <div>
            <div class="news-headline-full">${escHtml(a.headline || '')}</div>
            ${a.description ? `<div class="news-desc">${escHtml(a.description)}</div>` : ''}
            <div class="news-meta-full">${timeAgo(a.published)}</div>
          </div>
        </a>
      `;
    }).join('');
  }

  document.getElementById('mainContainer').innerHTML = `
    ${heroHtml}
    <div class="team-view">
      <div class="panel-box">
        <div class="panel-box-header" style="color:${team.color}">Schedule & Scores</div>
        <div class="schedule-list">${schedHtml}</div>
      </div>
      <div class="panel-box">
        <div class="panel-box-header" style="color:${team.color}">Latest News</div>
        <div class="news-list-full">${newsHtml}</div>
      </div>
    </div>
  `;
}

// ── Navigation ──────────────────────────────────────────────────────────────────
function buildNavTabs() {
  const container = document.getElementById('navTabs');
  TEAMS.forEach(team => {
    const btn = document.createElement('button');
    btn.className = 'nav-tab';
    btn.dataset.team = team.id;
    btn.textContent = team.short;
    btn.addEventListener('click', () => switchTeam(team.id));
    container.appendChild(btn);
  });

  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchTeam(tab.dataset.team);
    });
  });
}

function switchTeam(teamId) {
  activeTeam = teamId;

  // Update active tab
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.team === teamId);
  });

  // Update content
  const team = TEAMS.find(t => t.id === teamId);
  if (teamId === 'all') {
    renderDashboard();
  } else if (team) {
    renderTeamView(team);
  }
}

function bindCardHeaders() {
  document.querySelectorAll('.team-card-header[data-team]').forEach(el => {
    el.addEventListener('click', () => switchTeam(el.dataset.team));
    el.addEventListener('keydown', e => { if (e.key === 'Enter') switchTeam(el.dataset.team); });
  });
}

// ── Load & Refresh ──────────────────────────────────────────────────────────────
async function loadAll() {
  const refreshBtn = document.getElementById('refreshBtn');
  const lastUpdatedEl = document.getElementById('lastUpdated');
  refreshBtn.classList.add('spinning');
  refreshBtn.disabled = true;

  // Fetch all teams in parallel
  const results = await Promise.all(
    TEAMS.map(async team => ({ id: team.id, data: await loadTeamData(team) }))
  );

  for (const { id, data } of results) {
    allData[id] = data;
  }

  const now = new Date();
  lastUpdatedEl.textContent = `Updated ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;

  refreshBtn.classList.remove('spinning');
  refreshBtn.disabled = false;

  // Re-render current view
  if (activeTeam === 'all') {
    renderDashboard();
  } else {
    const team = TEAMS.find(t => t.id === activeTeam);
    if (team) renderTeamView(team);
  }
}

// ── Theme Toggle ────────────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ── Init ────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('footerYear').textContent = new Date().getFullYear();

  initTheme();
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  buildNavTabs();

  document.getElementById('refreshBtn').addEventListener('click', loadAll);

  // Show loading then fetch
  await loadAll();

  // Auto-refresh every 90 seconds (live games)
  setInterval(loadAll, 90_000);
});
