/* ============================================
   Georgia Sports Hub — app.js
   ESPN public API, no key required
   ============================================ */

const BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const STANDINGS_BASE = 'https://site.api.espn.com/apis/v2/sports';

function periodStr(n, sport) {
  if (!n) return '';
  if (sport === 'baseball') return ordinal(n);
  if (sport === 'hockey')   return n > 3 ? 'OT' : `P${n}`;
  if (sport === 'football') return n > 4 ? 'OT' : `Q${n}`;
  // basketball default
  return n > 4 ? `OT${n - 4}` : `Q${n}`;
}

function ordinal(n) {
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}

function shortConference(name) {
  return name
    .replace('American Football Conference', 'AFC')
    .replace('National Football Conference', 'NFC')
    .replace('Eastern Conference', 'East')
    .replace('Western Conference', 'West')
    .replace('American League', 'AL')
    .replace('National League', 'NL')
    .replace(' Conference', '');
}

async function fetchStanding(team) {
  try {
    const data = await apiFetch(`${STANDINGS_BASE}/${team.sport}/${team.league}/standings`);
    for (const group of data.children || []) {
      for (const entry of group.standings?.entries || []) {
        if (entry.team?.abbreviation === team.key) {
          const seed = entry.stats?.find(s => s.name === 'playoffSeed')?.value;
          if (seed) return `${ordinal(seed)} in ${shortConference(group.name)}`;
        }
      }
    }
  } catch {}
  return '';
}

const TEAMS = [
  {
    id: 'falcons',
    name: 'Atlanta Falcons',
    short: 'Falcons',
    sport: 'football',
    league: 'nfl',
    key: 'ATL',
    color: '#A71930',
    bg: 'linear-gradient(135deg,#101820,#A71930)',
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

    // 2. Fetch schedule, news, standings, and roster in parallel
    const [schedData, newsData, standing, rosterData] = await Promise.allSettled([
      apiFetch(`${BASE}/${team.sport}/${team.league}/teams/${team.key}/schedule`),
      apiFetch(`${BASE}/${team.sport}/${team.league}/news?team=${espnNumericId || team.key}&limit=8`),
      fetchStanding(team),
      apiFetch(`${BASE}/${team.sport}/${team.league}/teams/${team.key}/roster`),
    ]);

    const events = schedData.status === 'fulfilled' ? (schedData.value.events || []) : [];
    const articles = newsData.status === 'fulfilled' ? (newsData.value.articles || []) : [];
    const roster = rosterData.status === 'fulfilled' ? parseRoster(rosterData.value) : [];

    // Parse record — use summary string directly
    const record = infoData.team?.record?.items?.[0]?.summary || '';
    const games = parseGames(events, team.key);

    // 3. Fetch last game boxscore + upcoming games odds in parallel
    const upcomingIds = (games.upcomingGames || []).slice(0, 5).map(g => g.id);
    const liveIds     = (games.live || []).map(g => g.id);
    const recentGameId = (games.recentGames || [])[0]?.id;

    const summaryFetches = [...new Set([recentGameId, ...liveIds, ...upcomingIds].filter(Boolean))]
      .map(id => apiFetch(`${BASE}/${team.sport}/${team.league}/summary?event=${id}`)
        .then(s => ({ id, data: s })).catch(() => null));

    const summaries = (await Promise.all(summaryFetches)).filter(Boolean);

    let lastGameStats = {};
    let lastGameInfo  = null;
    const oddsMap     = {};
    let liveSimcast   = null;

    for (const { id, data } of summaries) {
      // Boxscore stats for last completed game
      if (id === recentGameId) {
        lastGameStats = parseBoxscoreStats(data, team.key);
        lastGameInfo  = (games.recentGames || [])[0];
      }
      // Odds + predictor for upcoming/live games
      if (upcomingIds.includes(id) || liveIds.includes(id)) {
        oddsMap[id] = parseGameOdds(data, team.key);
      }
      // Full simcast data for live games
      if (liveIds.includes(id)) {
        liveSimcast = parseSimcastData(data);
      }
    }

    return {
      teamInfo: infoData.team,
      record,
      standing: standing.status === 'fulfilled' ? standing.value : '',
      games,
      news: articles,
      roster,
      lastGameStats,
      lastGameInfo,
      oddsMap,
      liveSimcast,
    };
  } catch (err) {
    console.warn(`Could not load data for ${team.name}:`, err.message);
    return { teamInfo: null, record: '', standing: '', games: {}, news: [], roster: [], lastGameStats: {}, lastGameInfo: null, oddsMap: {}, liveSimcast: null };
  }
}

// ── Roster Helpers ───────────────────────────────────────────────────────────────
function parseRoster(rosterData) {
  const raw = rosterData.athletes || [];
  if (!raw.length) return [];
  // NFL/NCAAF: grouped by position (each item has an `items` array)
  if (raw[0]?.items) return raw.flatMap(g => g.items || []);
  // NBA/NCAAB: flat array
  return raw;
}

function parseBoxscoreStats(summaryData, teamKey) {
  const bsTeams = summaryData?.boxscore?.players || [];
  const teamData = bsTeams.find(t => t.team?.abbreviation === teamKey);
  if (!teamData) return {};
  const result = {};
  for (const group of teamData.statistics || []) {
    const labels = group.labels || group.names || [];
    for (const entry of group.athletes || []) {
      const id = entry.athlete?.id;
      const stats = entry.stats || [];
      if (id && stats.some(s => s && s !== '0' && s !== '0.0' && s !== '--')) {
        if (!result[id]) result[id] = [];
        result[id].push({ labels, stats, groupName: group.name });
      }
    }
  }
  return result;
}

function parseGameOdds(summaryData, teamKey) {
  const result = {};

  // Predictor (ESPN win probability model)
  const pred = summaryData?.predictor;
  if (pred) {
    const comps = summaryData?.header?.competitions?.[0]?.competitors || [];
    const homeComp = comps.find(c => c.homeAway === 'home');
    const awayComp = comps.find(c => c.homeAway === 'away');
    const isHome = homeComp?.team?.abbreviation === teamKey;
    result.ourWinPct  = isHome ? parseFloat(pred.homeTeam?.gameProjection) : parseFloat(pred.awayTeam?.gameProjection);
    result.oppWinPct  = isHome ? parseFloat(pred.awayTeam?.gameProjection) : parseFloat(pred.homeTeam?.gameProjection);
  }

  // DraftKings / bookmaker odds
  const odds = summaryData?.odds?.[0];
  if (odds) {
    result.spreadDetails = odds.details || '';       // e.g. "ATL -4.5"
    result.overUnder     = odds.overUnder ?? null;   // e.g. 225.5
    const ml = odds.moneyline || {};
    const comp = summaryData?.header?.competitions?.[0]?.competitors || [];
    const homeAbbrev = comp.find(c => c.homeAway === 'home')?.team?.abbreviation;
    const isHome = homeAbbrev === teamKey;
    result.ourML  = isHome ? ml.home?.close?.odds : ml.away?.close?.odds;
    result.oppML  = isHome ? ml.away?.close?.odds : ml.home?.close?.odds;
  }

  return Object.keys(result).length ? result : null;
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

function renderScorePanel(games, team, liveSimcast) {
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
      const periodLabel = game.period ? periodStr(game.period, team.sport) : '';
      statusEl = `<div class="game-status status-live"><span class="live-dot"></span>${periodLabel} ${game.clock}</div>`;
    } else {
      statusEl = `<div class="game-status status-final">${game.statusText}</div>`;
    }

    const awayWin = game.away.winner;
    const homeWin = game.home.winner;
    const awayScoreCls = state === 'post' ? (awayWin ? 'winner' : 'loser') : '';
    const homeScoreCls = state === 'post' ? (homeWin ? 'winner' : 'loser') : '';

    // Use fresh scores from simcast for live games
    const awayScore = (state === 'in' && liveSimcast) ? (liveSimcast.away?.score ?? game.away.score) : game.away.score;
    const homeScore = (state === 'in' && liveSimcast) ? (liveSimcast.home?.score ?? game.home.score) : game.home.score;

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
              <span class="score-num ${awayScoreCls}">${awayScore}</span>
              <span class="score-separator">–</span>
              <span class="score-num ${homeScoreCls}">${homeScore}</span>
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

  // Live simcast plays panel (dashboard card)
  if (live.length && liveSimcast?.recent?.length) {
    const { recent, teamStats } = liveSimcast;

    const statsHtml = teamStats.length ? `
      <div class="sc-stats" style="border-top:1px solid var(--border);padding:8px 14px;">
        ${teamStats.map(t => `
          <div class="sc-stat-row">
            <span class="sc-stat-team">${t.abbrev}</span>
            ${t.fg ? `<span class="sc-stat">FG ${t.fg}%</span>` : ''}
            ${t.reb ? `<span class="sc-stat">REB ${t.reb}</span>` : ''}
            ${t.to ? `<span class="sc-stat">TO ${t.to}</span>` : ''}
          </div>`).join('')}
      </div>` : '';

    const playsHtml = recent.slice(0, 5).map(p => {
      const perBase = p.period?.number ? periodStr(p.period.number, team.sport) : '';
      const perHalf = (team.sport === 'baseball' && p.period?.type) ? `${p.period.type} ` : '';
      const per = perHalf + perBase;
      const clk = team.sport === 'baseball' ? '' : (p.clock?.displayValue || '');
      return `
        <div class="sc-play ${p.scoringPlay ? 'sc-play-scoring' : ''}">
          <span class="sc-play-time">${per} ${clk}</span>
          <span class="sc-play-text">${escHtml(p.text)}</span>
          ${p.scoringPlay ? `<span class="sc-play-score">${p.awayScore}–${p.homeScore}</span>` : ''}
        </div>`;
    }).join('');

    parts.push(`
      <div class="card-simcast">
        ${statsHtml}
        <div class="sc-plays-header" style="padding:6px 14px 4px">Recent Plays</div>
        <div class="sc-plays" style="max-height:180px">${playsHtml}</div>
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
function getNextGameDate(team) {
  const data = allData[team.id];
  if (!data) return Infinity;
  const games = data.games || {};
  // Live games first
  if (games.live?.length) return 0;
  // Then next upcoming game
  if (games.nextGame?.date) return games.nextGame.date.getTime();
  return Infinity;
}

function renderDashboard() {
  const groups = {};
  for (const team of TEAMS) {
    if (!groups[team.group]) groups[team.group] = [];
    groups[team.group].push(team);
  }

  // Sort teams within each group by next upcoming game
  for (const teams of Object.values(groups)) {
    teams.sort((a, b) => getNextGameDate(a) - getNextGameDate(b));
  }

  // Sort groups so the group with the soonest next game comes first
  const sortedGroups = Object.entries(groups).sort((a, b) => {
    const aMin = Math.min(...a[1].map(t => getNextGameDate(t)));
    const bMin = Math.min(...b[1].map(t => getNextGameDate(t)));
    return aMin - bMin;
  });

  const html = sortedGroups.map(([groupName, teams]) => {
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
  const record = data.record ? `<span class="team-record">${data.record}</span>` : '';
  const liveSimcast = data.liveSimcast || null;

  return `
    <div class="team-card" id="card-${team.id}">
      <div class="team-card-header" data-team="${team.id}" role="button" tabindex="0">
        ${logoImg(team.logo, 'team-logo', team.emoji)}
        <div class="team-meta">
          <div class="team-name">${team.name}</div>
        </div>
        ${record}
      </div>
      ${renderScorePanel(games, team, liveSimcast)}
      ${renderNewsPanel(news, 3)}
    </div>
  `;
}

// ── Roster Panel ────────────────────────────────────────────────────────────────
const KEY_STATS = {
  basketball: ['PTS', 'REB', 'AST', 'STL'],
  football:   null, // use first 4 cols of each position group
  baseball:   ['AB', 'H', 'HR', 'RBI'],
  hockey:     ['G', 'A', 'PTS', '+/-'],
};

function renderRosterPanel(team, data) {
  const { roster = [], lastGameStats = {}, lastGameInfo = null } = data;
  if (!roster.length) return '';

  const gameLabel = lastGameInfo
    ? `Last game vs ${lastGameInfo.opp?.name?.split(' ').pop() || lastGameInfo.opp?.name}`
    : '';

  const cards = roster.map(athlete => {
    const name    = athlete.displayName || athlete.fullName || '';
    const jersey  = athlete.jersey || '';
    const pos     = athlete.position?.abbreviation || '';
    const ht      = athlete.displayHeight || '';
    const wt      = athlete.displayWeight || '';
    const exp     = athlete.experience?.years;
    const college = athlete.college?.name || '';
    const img     = athlete.headshot?.href || '';
    const espnUrl = athlete.links?.find(l => l.rel?.includes('playercard'))?.href || '#';
    const id      = athlete.id;

    const groups = lastGameStats[id] || [];
    let statsHtml = '';
    if (groups.length) {
      const preferred = KEY_STATS[team.sport];
      const { labels, stats } = groups[0];
      const cols = preferred
        ? preferred.filter(c => labels.includes(c))
        : labels.slice(0, 4);
      const pairs = cols.map(col => {
        const idx = labels.indexOf(col);
        const val = idx >= 0 ? stats[idx] : null;
        return val && val !== '--' && val !== '0' && val !== '0.0'
          ? `<div class="rp-stat"><div class="rp-stat-val">${escHtml(val)}</div><div class="rp-stat-lbl">${col}</div></div>`
          : '';
      }).filter(Boolean);

      // For football, also check other groups (QB might have rushing too)
      if (team.sport === 'football' && groups.length > 1) {
        for (let i = 1; i < groups.length; i++) {
          const g = groups[i];
          g.labels.slice(0, 3).forEach((col, ci) => {
            const val = g.stats[ci];
            if (val && val !== '--' && val !== '0') {
              pairs.push(`<div class="rp-stat"><div class="rp-stat-val">${escHtml(val)}</div><div class="rp-stat-lbl">${col}</div></div>`);
            }
          });
        }
      }

      if (pairs.length) {
        const groupLabel = groups.length > 1 ? '' : (groups[0].groupName ? `<span class="rp-group">${groups[0].groupName}</span>` : '');
        statsHtml = `<div class="rp-stats">${groupLabel}${pairs.join('')}</div>`;
      }
    }

    const metaParts = [pos, ht, wt].filter(Boolean);
    const expStr = exp != null ? (exp === 0 ? 'Rookie' : `${exp}yr`) : '';

    return `
      <a class="rp-card" href="${espnUrl}" target="_blank" rel="noopener noreferrer" style="--team-color:${team.color}">
        <div class="rp-photo-wrap">
          ${img
            ? `<img class="rp-photo" src="${escHtml(img)}" alt="${escHtml(name)}" loading="lazy" onerror="this.style.display='none'">`
            : `<div class="rp-photo-placeholder">${jersey || '?'}</div>`}
          ${jersey ? `<span class="rp-jersey">#${jersey}</span>` : ''}
        </div>
        <div class="rp-body">
          <div class="rp-name">${escHtml(name)}</div>
          <div class="rp-meta">${escHtml(metaParts.join(' · '))}${expStr ? ` · ${expStr}` : ''}${college ? ` · ${escHtml(college)}` : ''}</div>
          ${statsHtml}
        </div>
      </a>`;
  }).join('');

  return `
    <div class="panel-box rp-panel">
      <div class="panel-box-header rp-toggle" style="color:${team.color}" onclick="this.closest('.rp-panel').classList.toggle('rp-open')" role="button" tabindex="0">
        Roster & Stats
        ${gameLabel ? `<span class="rp-game-label">${escHtml(gameLabel)}</span>` : ''}
        <span class="rp-chevron">▾</span>
      </div>
      <div class="rp-body-wrap">
        <div class="rp-grid">${cards}</div>
      </div>
    </div>`;
}

// ── Single Team View ────────────────────────────────────────────────────────────
function renderTeamView(team) {
  const data = allData[team.id] || {};
  const games = data.games || {};
  const news = data.news || [];
  const record = data.record || '';
  const standing = data.standing || '';
  const oddsMap = data.oddsMap || {};

  // Hero
  const heroHtml = `
    <div class="team-view-hero" style="background:${team.bg};border:1px solid ${team.color}44">
      ${logoImg(team.logo, 'team-view-logo', team.emoji)}
      <div class="team-view-name">${team.name}</div>
      ${record ? `<div class="team-view-record">${record}${standing ? `<div class="team-view-standing">${standing}</div>` : ''}</div>` : ''}
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
      const odds = oddsMap[g.id];
      let resultHtml = '';
      let oddsHtml = '';

      if (g.state === 'in') {
        const per = g.period ? periodStr(g.period, team.sport) : '';
        resultHtml = `<div class="sched-result"><span class="live-dot"></span>${per} ${g.clock}</div>`;
      } else if (g.state === 'post' && g.result) {
        const cls = g.result === 'W' ? 'win' : g.result === 'L' ? 'loss' : '';
        const score = `${g.our.score}–${g.opp.score}`;
        resultHtml = `<div class="sched-result"><span class="${cls}">${g.result} ${score}</span></div>`;
      } else {
        const timeStr = g.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        let winProbHtml = '';
        if (odds?.ourWinPct != null && !isNaN(odds.ourWinPct)) {
          const pct = Math.round(odds.ourWinPct);
          const barW = Math.max(5, Math.min(95, pct));
          winProbHtml = `
            <div class="odds-prob-bar" title="${team.short} win probability: ${pct}%">
              <div class="odds-prob-fill" style="width:${barW}%;background:${team.color}"></div>
            </div>
            <div class="odds-prob-label">${team.short} <b>${pct}%</b></div>`;
        }
        resultHtml = `<div class="sched-result sched-result-pre"><span class="upcoming">${timeStr}</span>${winProbHtml}</div>`;

        // Spread + OU row
        if (odds?.spreadDetails || odds?.overUnder != null) {
          const parts = [];
          if (odds.spreadDetails) parts.push(`<span class="odds-chip">${escHtml(odds.spreadDetails)}</span>`);
          if (odds.overUnder != null) parts.push(`<span class="odds-chip">O/U ${odds.overUnder}</span>`);
          if (odds.ourML) parts.push(`<span class="odds-chip">ML ${escHtml(odds.ourML)}</span>`);
          oddsHtml = `<div class="odds-row"><span class="odds-src">DraftKings</span>${parts.join('')}</div>`;
        }
      }

      return `
        <div class="sched-item" onclick="openMatchupModal('${g.id}','${team.id}')" role="button" tabindex="0">
          <div class="sched-main">
            <div class="sched-matchup">${escHtml(g.name || `${g.away.abbrev} @ ${g.home.abbrev}`)}</div>
            <div class="sched-date">${fmtDate(g.date)}${g.tv ? ` · ${g.tv}` : ''}${g.venue ? ` · ${escHtml(g.venue)}` : ''}</div>
            ${oddsHtml}
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

  const liveGame = (games.live || [])[0];
  const simcastPlaceholder = liveGame
    ? `<div id="simcast-panel" class="panel-box sc-panel"><div class="sc-loading">Loading live game…</div></div>`
    : '';

  // Clear any previous simcast interval
  if (simcastInterval) { clearInterval(simcastInterval); simcastInterval = null; }

  const rosterHtml = renderRosterPanel(team, data);

  document.getElementById('mainContainer').innerHTML = `
    ${heroHtml}
    <div class="team-view">
      ${simcastPlaceholder}
      <div class="panel-box sched-panel sched-open">
        <div class="panel-box-header sched-toggle" style="color:${team.color}" onclick="this.closest('.sched-panel').classList.toggle('sched-open')" role="button" tabindex="0">
          Schedule & Scores
          <span class="sched-chevron">▾</span>
        </div>
        <div class="sched-body-wrap">
          <div class="schedule-list">${schedHtml}</div>
        </div>
      </div>
      ${rosterHtml}
      <div class="panel-box">
        <div class="panel-box-header" style="color:${team.color}">Latest News</div>
        <div class="news-list-full">${newsHtml}</div>
      </div>
    </div>
  `;

  if (liveGame) {
    loadSimcast(liveGame.id, team.sport, team.league, team);
    simcastInterval = setInterval(() => loadSimcast(liveGame.id, team.sport, team.league, team), 30_000);
  }
}

// ── Simcast ─────────────────────────────────────────────────────────────────────
let simcastInterval = null;

function parseSimcastData(data) {
  const comp = data.header?.competitions?.[0] || {};
  const competitors = comp.competitors || [];
  const away = competitors.find(c => c.homeAway === 'away') || competitors[0] || {};
  const home = competitors.find(c => c.homeAway === 'home') || competitors[1] || {};
  const status = comp.status || {};

  const plays = (data.plays || []).filter(p => p.text && !p.type?.text?.startsWith('End'));
  const recent = plays.slice(-10).reverse();

  const bsTeams = data.boxscore?.teams || [];
  const teamStats = bsTeams.map(t => {
    const s = Object.fromEntries((t.statistics || []).map(x => [x.name, x.displayValue]));
    return { abbrev: t.team?.abbreviation, fg: s.fieldGoalPct, reb: s.rebounds, to: s.turnovers, pts: s.points };
  });

  return { away, home, status, recent, teamStats };
}

async function fetchSimcast(gameId, sport, league) {
  const data = await apiFetch(`${BASE}/${sport}/${league}/summary?event=${gameId}`);
  return parseSimcastData(data);
}

function renderSimcast(data, team) {
  const { away, home, status, recent, teamStats } = data;
  const period = status.period || 0;
  const clock = status.displayClock || '';
  const desc = status.type?.description || '';
  const isHalftime = desc.toLowerCase().includes('half');
  const halfInning = status.periodPrefix || '';  // "Top" or "Bot" for baseball

  const teamLogo = (t) => t.team?.logos?.[0]?.href || t.team?.logo || '';
  const abbrev = (t) => t.team?.abbreviation || '';

  const scoreHtml = (t, side) => `
    <div class="sc-team">
      <img src="${teamLogo(t)}" class="sc-logo" alt="${abbrev(t)}" onerror="this.style.display='none'">
      <div class="sc-abbrev">${abbrev(t)}</div>
      <div class="sc-score ${side === 'home' ? 'sc-home' : 'sc-away'}">${t.score ?? '-'}</div>
    </div>`;

  const basePeriod = isHalftime ? 'Halftime' : period ? periodStr(period, team.sport) : '';
  const periodLabel = (team.sport === 'baseball' && halfInning)
    ? `${halfInning} ${basePeriod}` : basePeriod;

  const statsHtml = teamStats.length ? `
    <div class="sc-stats">
      ${teamStats.map(t => `
        <div class="sc-stat-row">
          <span class="sc-stat-team">${t.abbrev}</span>
          ${t.fg ? `<span class="sc-stat">FG ${t.fg}%</span>` : ''}
          ${t.reb ? `<span class="sc-stat">REB ${t.reb}</span>` : ''}
          ${t.to ? `<span class="sc-stat">TO ${t.to}</span>` : ''}
        </div>`).join('')}
    </div>` : '';

  const playsHtml = recent.length ? recent.map(p => {
    const perBase = p.period?.number ? periodStr(p.period.number, team.sport) : '';
    const perHalf = (team.sport === 'baseball' && p.period?.type) ? `${p.period.type} ` : '';
    const per = perHalf + perBase;
    const clk = team.sport === 'baseball' ? '' : (p.clock?.displayValue || '');
    const scoring = p.scoringPlay;
    return `
      <div class="sc-play ${scoring ? 'sc-play-scoring' : ''}">
        <span class="sc-play-time">${per} ${clk}</span>
        <span class="sc-play-text">${escHtml(p.text)}</span>
        ${scoring ? `<span class="sc-play-score">${p.awayScore}–${p.homeScore}</span>` : ''}
      </div>`;
  }).join('') : '<div class="sc-play">No plays yet</div>';

  return `
    <div class="panel-box sc-panel">
      <div class="panel-box-header" style="color:${team.color}">
        <span class="live-dot"></span> Live Simcast
      </div>
      <div class="sc-scoreboard">
        ${scoreHtml(away, 'away')}
        <div class="sc-middle">
          <div class="sc-period">${periodLabel}</div>
          <div class="sc-clock">${isHalftime || team.sport === 'baseball' ? '' : clock}</div>
        </div>
        ${scoreHtml(home, 'home')}
      </div>
      ${statsHtml}
      <div class="sc-plays-header">Recent Plays</div>
      <div class="sc-plays">${playsHtml}</div>
    </div>`;
}

async function refreshSimcast(gameId, sport, league, team) {
  const el = document.getElementById('simcast-panel');
  if (!el) { clearInterval(simcastInterval); simcastInterval = null; return; }
  try {
    const data = await fetchSimcast(gameId, sport, league);
    el.outerHTML = renderSimcast(data, team);  // re-inject by ID won't work after outerHTML; use innerHTML approach
  } catch {}
}

async function loadSimcast(gameId, sport, league, team) {
  const el = document.getElementById('simcast-panel');
  if (!el) return;
  try {
    const data = await fetchSimcast(gameId, sport, league);
    el.outerHTML = renderSimcast(data, team);
  } catch (err) {
    if (el) el.innerHTML = '<div class="error-state">Simcast unavailable</div>';
  }
}

// ── Matchup Modal ────────────────────────────────────────────────────────────────
async function openMatchupModal(gameId, teamId) {
  const team = TEAMS.find(t => t.id === teamId);
  if (!team) return;

  const data = allData[teamId] || {};
  const games = data.games || {};
  const allGames = [
    ...(games.live || []),
    ...(games.recentGames || []),
    ...(games.upcomingGames || []),
  ];
  const game = allGames.find(g => g.id === gameId);
  if (!game) return;

  const modal = document.getElementById('matchupModal');
  const overlay = document.getElementById('matchupOverlay');
  const body = document.getElementById('matchupModalBody');
  body.innerHTML = '<div class="mu-loading">Loading matchup…</div>';
  modal.classList.add('open');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    const summary = await apiFetch(`${BASE}/${team.sport}/${team.league}/summary?event=${gameId}`);
    body.innerHTML = renderMatchupContent(summary, game, team, data.oddsMap || {});
  } catch {
    body.innerHTML = '<div class="mu-loading">Could not load matchup data.</div>';
  }
}

function closeMatchupModal() {
  document.getElementById('matchupModal').classList.remove('open');
  document.getElementById('matchupOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function renderMatchupContent(summary, game, team, oddsMap) {
  const comps = summary.header?.competitions?.[0]?.competitors || [];
  const awayComp = comps.find(c => c.homeAway === 'away') || comps[0] || {};
  const homeComp = comps.find(c => c.homeAway === 'home') || comps[1] || {};

  const awayRec  = awayComp.record?.[0]?.summary || '';
  const homeRec  = homeComp.record?.[0]?.summary || '';
  const awayLogo = awayComp.team?.logos?.[0]?.href || game.away.logo;
  const homeLogo = homeComp.team?.logos?.[0]?.href || game.home.logo;
  const awayName = awayComp.team?.displayName || game.away.name;
  const homeName = homeComp.team?.displayName || game.home.name;

  // Score / time block
  const isLive  = game.state === 'in';
  const isFinal = game.state === 'post';
  let scoreHtml = '';
  if (isLive || isFinal) {
    const awayWin = game.away.winner;
    const homeWin = game.home.winner;
    const aCls = isFinal ? (awayWin ? 'mu-score-winner' : 'mu-score-loser') : '';
    const hCls = isFinal ? (homeWin ? 'mu-score-winner' : 'mu-score-loser') : '';
    const statusLabel = isLive
      ? `<div class="mu-status-live"><span class="live-dot"></span>${game.period ? periodStr(game.period, team.sport) : ''} ${game.clock}</div>`
      : `<div class="mu-status-final">Final</div>`;
    scoreHtml = `
      <div class="mu-scores">
        <span class="mu-score ${aCls}">${game.away.score}</span>
        <div class="mu-score-sep">${statusLabel}</div>
        <span class="mu-score ${hCls}">${game.home.score}</span>
      </div>`;
  } else {
    const timeStr = game.date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    scoreHtml = `<div class="mu-gametime">${fmtDate(game.date)}<br>${timeStr}${game.tv ? `<br>${escHtml(game.tv)}` : ''}</div>`;
  }

  // Win probability
  const odds = oddsMap[game.id] || parseGameOdds(summary, team.key);
  let winProbHtml = '';
  if (odds?.ourWinPct != null && !isNaN(odds.ourWinPct)) {
    const ourPct = Math.round(odds.ourWinPct);
    const oppPct = 100 - ourPct;
    const awayPct = game.isHome ? oppPct : ourPct;
    const homePct = game.isHome ? ourPct : oppPct;
    winProbHtml = `
      <div class="mu-winprob">
        <div class="mu-winprob-labels">
          <span>${awayPct}%</span>
          <span class="mu-winprob-title">Win Probability</span>
          <span>${homePct}%</span>
        </div>
        <div class="mu-winprob-bar">
          <div class="mu-winprob-away" style="width:${awayPct}%;background:${game.isHome ? '#555' : team.color}"></div>
          <div class="mu-winprob-home" style="width:${homePct}%;background:${game.isHome ? team.color : '#555'}"></div>
        </div>
      </div>`;
  }

  // Betting odds
  let oddsHtml = '';
  if (odds?.spreadDetails || odds?.overUnder != null || odds?.ourML) {
    const chips = [];
    if (odds.spreadDetails) chips.push(`<div class="mu-odds-chip"><div class="mu-odds-val">${escHtml(odds.spreadDetails)}</div><div class="mu-odds-lbl">Spread</div></div>`);
    if (odds.overUnder != null) chips.push(`<div class="mu-odds-chip"><div class="mu-odds-val">${odds.overUnder}</div><div class="mu-odds-lbl">O/U</div></div>`);
    if (odds.ourML) chips.push(`<div class="mu-odds-chip"><div class="mu-odds-val">${escHtml(String(odds.ourML))}</div><div class="mu-odds-lbl">${escHtml(team.short)} ML</div></div>`);
    oddsHtml = `
      <div class="mu-odds">
        <div class="mu-odds-src">DraftKings</div>
        <div class="mu-odds-chips">${chips.join('')}</div>
      </div>`;
  }

  // Leaders (top performers)
  let leadersHtml = '';
  const leaders = summary.leaders || [];
  const leaderRows = leaders.slice(0, 4).map(cat => {
    const leader = cat.leaders?.[0];
    if (!leader) return '';
    const ath      = leader.athlete;
    const photo    = ath?.headshot?.href || '';
    const athName  = ath?.displayName || ath?.fullName || '';
    const teamAbbr = leader.team?.abbreviation || '';
    return `
      <div class="mu-leader-row">
        <div class="mu-leader-stat-name">${escHtml(cat.displayName || cat.name || '')}</div>
        <div class="mu-leader-info">
          ${photo ? `<img class="mu-leader-photo" src="${escHtml(photo)}" alt="" onerror="this.style.display='none'">` : ''}
          <div>
            <div class="mu-leader-name">${escHtml(athName)}</div>
            <div class="mu-leader-team">${escHtml(teamAbbr)}</div>
          </div>
          <div class="mu-leader-value">${escHtml(leader.displayValue || '')}</div>
        </div>
      </div>`;
  }).filter(Boolean);
  if (leaderRows.length) {
    leadersHtml = `
      <div class="mu-section">
        <div class="mu-section-title">${isFinal ? 'Game Leaders' : 'Season Leaders'}</div>
        ${leaderRows.join('')}
      </div>`;
  }

  // Venue
  const venueName = summary.gameInfo?.venue?.fullName || game.venue || '';
  const venueCity = summary.gameInfo?.venue?.address?.city || '';
  const venueHtml = venueName
    ? `<div class="mu-venue">📍 ${escHtml(venueName)}${venueCity ? `, ${escHtml(venueCity)}` : ''}</div>`
    : '';

  return `
    <div class="mu-teams">
      <div class="mu-team">
        <img class="mu-team-logo" src="${escHtml(awayLogo)}" alt="" onerror="this.style.display='none'">
        <div class="mu-team-name">${escHtml(awayName)}</div>
        ${awayRec ? `<div class="mu-team-rec">${escHtml(awayRec)}</div>` : ''}
        <div class="mu-team-label">Away</div>
      </div>
      <div class="mu-center">${scoreHtml}</div>
      <div class="mu-team">
        <img class="mu-team-logo" src="${escHtml(homeLogo)}" alt="" onerror="this.style.display='none'">
        <div class="mu-team-name">${escHtml(homeName)}</div>
        ${homeRec ? `<div class="mu-team-rec">${escHtml(homeRec)}</div>` : ''}
        <div class="mu-team-label">Home</div>
      </div>
    </div>
    ${winProbHtml}
    ${oddsHtml}
    ${leadersHtml}
    ${venueHtml}
  `;
}

// ── Navigation ──────────────────────────────────────────────────────────────────
function buildNavTabs() {
  const container = document.getElementById('navTabs');
  TEAMS.forEach(team => {
    const btn = document.createElement('button');
    btn.className = 'nav-link';
    btn.dataset.team = team.id;
    btn.innerHTML = `<img class="nav-link-logo" src="${team.logo}" alt="" onerror="this.outerHTML='<span class=nav-link-emoji>${team.emoji}</span>'">${team.short}`;
    btn.addEventListener('click', () => switchTeam(team.id));
    container.appendChild(btn);
  });
}

function switchTeam(teamId) {
  if (simcastInterval) { clearInterval(simcastInterval); simcastInterval = null; }
  activeTeam = teamId;

  // Update active link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.team === teamId);
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
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.checked = theme === 'light';
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ── Nav Drawer ──────────────────────────────────────────────────────────────────
function initDrawer() {
  const menuBtn = document.getElementById('menuToggle');
  const closeBtn = document.getElementById('menuClose');
  const overlay = document.getElementById('navOverlay');
  const drawer = document.getElementById('navDrawer');

  function openDrawer() {
    drawer.classList.add('open');
    overlay.classList.add('open');
    menuBtn.classList.add('open');
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    menuBtn.classList.remove('open');
  }

  menuBtn.addEventListener('click', () => {
    drawer.classList.contains('open') ? closeDrawer() : openDrawer();
  });
  closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  // Close drawer when a nav link is clicked
  drawer.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-link')) closeDrawer();
  });
}

// ── Init ────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('footerYear').textContent = new Date().getFullYear();

  initTheme();
  document.getElementById('themeToggle').addEventListener('change', toggleTheme);

  initDrawer();
  buildNavTabs();

  document.getElementById('refreshBtn').addEventListener('click', loadAll);

  // Show loading then fetch
  await loadAll();

  // Auto-refresh every 90 seconds (live games)
  setInterval(loadAll, 90_000);
});
