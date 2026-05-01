/* ═══════════════════════════════════════════════════════════════
   Fizy Playlist Party League — Frontend Engine
   Dark theme · Chart.js · Animated counters · English UI
═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ── State ────────────────────────────────────────────────────
  let allUsers      = [];
  let selectedId    = null;
  let trendChart    = null;
  let genreChart    = null;

  // ── Avatar colors (deterministic by initial) ─────────────────
  const AVATAR_COLORS = [
    '#7c3aed','#2563eb','#0891b2','#059669',
    '#d97706','#dc2626','#db2777','#7c3aed',
    '#4f46e5','#0284c7',
  ];
  function avatarColor(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  }

  // ── Badge metadata ───────────────────────────────────────────
  const BADGE_META = {
    b1: { label: 'Bronze',   cls: 'bronze',   icon: '🥉' },
    b2: { label: 'Silver',   cls: 'silver',   icon: '🥈' },
    b3: { label: 'Gold',     cls: 'gold',     icon: '🥇' },
    b4: { label: 'Platinum', cls: 'platinum', icon: '💎' },
  };

  // ── DOM refs ─────────────────────────────────────────────────
  const asOfInput    = document.getElementById('asOf');
  const refreshBtn   = document.getElementById('refreshBtn');
  const playerList   = document.getElementById('playerList');
  const playerCount  = document.getElementById('playerCount');
  const searchInput  = document.getElementById('userSearch');
  const panelTitle   = document.getElementById('panelTitle');
  const selectedBadge = document.getElementById('selectedBadge');
  const selectedName = document.getElementById('selectedName');
  const emptyState   = document.getElementById('emptyState');
  const playerDetail = document.getElementById('playerDetail');
  const lbList       = document.getElementById('lbList');

  // ── Date default ─────────────────────────────────────────────
  const today = new Date();
  asOfInput.value = today.toISOString().slice(0, 10);

  // ── Helpers ──────────────────────────────────────────────────
  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  function asOfParam() {
    return asOfInput.value ? `?as_of=${asOfInput.value}` : '';
  }

  async function apiFetch(path) {
    const res = await fetch(path);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ── Animated counter ─────────────────────────────────────────
  function animateCounter(el, target, duration = 900, formatter = v => Math.round(v).toLocaleString()) {
    el.classList.remove('skeleton');
    el.style.width = '';
    el.style.height = '';
    const start     = performance.now();
    const from      = 0;

    function step(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const value    = from + (target - from) * eased;
      el.textContent = formatter(value);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ── Tabs ──────────────────────────────────────────────────────
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // ── Load platform stats (hero KPIs) ──────────────────────────
  async function loadStats() {
    try {
      const data = await apiFetch(`/api/stats${asOfParam()}`);

      animateCounter(document.getElementById('kpiUsers'),
        data.active_users, 700);

      document.getElementById('kpi-users').classList.add('loaded');

      animateCounter(document.getElementById('kpiMinutes'),
        data.total_listening_minutes, 900,
        v => Math.round(v).toLocaleString() + ' min');
      document.getElementById('kpiMinutesSub').textContent =
        `≈ ${Math.round(data.total_listening_minutes / 60)} hours total`;
      document.getElementById('kpi-minutes').classList.add('loaded');

      animateCounter(document.getElementById('kpiPoints'),
        data.total_points_distributed, 800,
        v => Math.round(v).toLocaleString() + ' pts');
      document.getElementById('kpi-points').classList.add('loaded');

      animateCounter(document.getElementById('kpiChallenges'),
        data.total_challenges_completed, 700);
      document.getElementById('kpiGenre').textContent =
        `Top genre: ${data.top_genre}`;
      document.getElementById('kpi-challenges').classList.add('loaded');

    } catch (err) {
      console.error('Stats error:', err);
    }
  }

  // ── Load player list ──────────────────────────────────────────
  async function loadUsers() {
    try {
      const users = await apiFetch(`/api/users${asOfParam()}`);
      allUsers = users;
      playerCount.textContent = users.length;
      renderPlayerList(users);
    } catch (err) {
      console.error('Users error:', err);
      playerList.innerHTML = `<div style="padding:20px;color:#ff6b8a;font-size:12px;">Failed to load players: ${err.message}</div>`;
    }
  }

  // ── Render player list ────────────────────────────────────────
  function renderPlayerList(users) {
    playerList.innerHTML = '';
    if (!users.length) {
      playerList.innerHTML = `<div style="padding:20px 20px;color:var(--muted);font-size:12px;">No players found</div>`;
      return;
    }
    users.forEach(user => {
      const color   = avatarColor(user.user_id);
      const initial = (user.name || user.user_id).charAt(0).toUpperCase();
      const hasScore = user.total_points > 0;

      const row = document.createElement('div');
      row.className = 'player-row' + (user.user_id === selectedId ? ' active' : '');
      row.dataset.id = user.user_id;
      row.innerHTML = `
        <div class="player-avatar" style="background:${color}">${initial}</div>
        <div class="player-info">
          <div class="player-name">${user.name || user.user_id}</div>
          <div class="player-id">${user.user_id}</div>
        </div>
        <div class="score-chip ${hasScore ? '' : 'dim'}">${user.total_points}</div>
      `;
      row.addEventListener('click', () => selectPlayer(user.user_id, user.name));
      playerList.appendChild(row);
    });
  }

  // ── Search ────────────────────────────────────────────────────
  searchInput.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    const filtered = allUsers.filter(u =>
      u.user_id.toLowerCase().includes(q) ||
      (u.name || '').toLowerCase().includes(q)
    );
    playerCount.textContent = filtered.length;
    renderPlayerList(filtered);
  });

  // ── Select player ─────────────────────────────────────────────
  async function selectPlayer(userId, userName) {
    selectedId = userId;

    // Update sidebar active state
    document.querySelectorAll('.player-row').forEach(r =>
      r.classList.toggle('active', r.dataset.id === userId)
    );

    // Update header
    selectedName.textContent = userName || userId;
    show(selectedBadge);

    // Switch to overview tab
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="overview"]').classList.add('active');
    document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-overview').classList.add('active');

    // Show detail, hide empty
    hide(emptyState);
    show(playerDetail);

    // Reset stats to loading state
    document.getElementById('statToday').textContent    = '—';
    document.getElementById('stat7d').textContent       = '—';
    document.getElementById('statStreak').textContent   = '—';
    document.getElementById('streakFill').style.width   = '0%';
    document.getElementById('statTodaySub').textContent = '';
    document.getElementById('stat7dSub').textContent    = '';

    try {
      const [detail, trend] = await Promise.all([
        apiFetch(`/api/user/${encodeURIComponent(userId)}${asOfParam()}`),
        apiFetch(`/api/user/${encodeURIComponent(userId)}/trend${asOfParam()}`),
      ]);
      renderDetail(detail, userId);
      renderCharts(trend);
    } catch (err) {
      console.error('Player detail error:', err);
    }
  }

  // ── Render player detail ──────────────────────────────────────
  function renderDetail(raw, userId) {
    const s = raw.state || {};

    // Stats
    const todayMin = s.listen_minutes_today ?? 0;
    const todayTrk = s.unique_tracks_today  ?? 0;
    const todayAdd = s.playlist_additions_today ?? 0;
    const todayShr = s.shares_today         ?? 0;
    const wkMin    = s.listen_minutes_7d    ?? 0;
    const wkTrk    = s.unique_tracks_7d     ?? 0;
    const wkShr    = s.shares_7d            ?? 0;
    const streak   = s.listen_streak_days   ?? 0;

    document.getElementById('statToday').innerHTML =
      `${todayMin}<span class="unit">min</span>`;
    document.getElementById('statTodaySub').textContent =
      `${todayTrk} tracks · ${todayAdd} added · ${todayShr} shared`;

    document.getElementById('stat7d').innerHTML =
      `${wkMin}<span class="unit">min</span>`;
    document.getElementById('stat7dSub').textContent =
      `${wkTrk} tracks · ${wkShr} shares`;

    document.getElementById('statStreak').innerHTML =
      `${streak}<span class="unit">day${streak !== 1 ? 's' : ''}</span>`;
    document.getElementById('streakFill').style.width =
      Math.min(100, streak * 20) + '%';

    // Challenges
    const awards     = raw.awards || [];
    const selected   = awards[0]?.selected_challenge  || null;
    const triggered  = awards.flatMap(a => a.triggered_challenges  || []);
    const suppressed = awards.flatMap(a => a.suppressed_challenges  || []);
    const pts        = awards[0]?.reward_points        || 0;

    const block = document.getElementById('challengeBlock');
    if (selected) {
      const otherIds = suppressed.filter(id => id !== selected);
      block.innerHTML = `
        <div class="challenge-selected">
          <div>
            <div class="challenge-name">${selected}</div>
            <div class="challenge-meta">${triggered.length} triggered · ${suppressed.length} suppressed</div>
            ${otherIds.length ? `<div class="challenge-suppressed">
              ${otherIds.map(id => `<span class="challenge-tag">${id}</span>`).join('')}
            </div>` : ''}
          </div>
          <div class="challenge-pts">${pts}<span> pts</span></div>
        </div>`;
    } else {
      block.innerHTML = `<div style="color:var(--muted);font-size:13px;padding:10px 0;">No challenge won today.</div>`;
    }

    // Badges
    const grid = document.getElementById('badgesGrid');
    grid.innerHTML = '';
    const userBadges = raw.badges || [];
    if (userBadges.length) {
      userBadges.forEach(b => {
        const meta = BADGE_META[b.badge_id || b] || { label: b, cls: '', icon: '🏅' };
        const div = document.createElement('div');
        div.className = `badge-item ${meta.cls}`;
        div.textContent = `${meta.icon}  ${meta.label}`;
        grid.appendChild(div);
      });
    } else {
      grid.innerHTML = `<div style="color:var(--muted);font-size:13px;">No achievements yet — keep listening!</div>`;
    }

    // Notifications
    const notifList = document.getElementById('notifList');
    notifList.innerHTML = '';
    const notifs = raw.notifs || [];
    if (notifs.length) {
      notifs.forEach(n => {
        notifList.innerHTML += `
          <div class="notif-item">
            <div class="notif-dot"></div>
            <div>
              <div class="notif-msg">${n.message}</div>
              <div class="notif-meta">
                <span class="notif-channel">${n.channel}</span>
                &nbsp;${(n.sent_at || '').toString().slice(0, 10)}
              </div>
            </div>
          </div>`;
      });
    } else {
      notifList.innerHTML = `<div style="color:var(--muted);font-size:13px;padding:10px 0;">No notifications yet.</div>`;
    }
  }

  // ── Chart.js charts ───────────────────────────────────────────
  const CHART_DEFAULTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
  };

  function renderCharts(data) {
    const trend  = data.trend  || [];
    const genres = data.genres || [];

    // ── Bar: 7-day trend ───────────────────────────────────────
    if (trendChart) trendChart.destroy();
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(trendCtx, {
      type: 'bar',
      data: {
        labels: trend.map(d => d.date),
        datasets: [{
          data:            trend.map(d => d.minutes),
          backgroundColor: trend.map(d =>
            d.minutes > 0
              ? 'rgba(245,197,24,0.70)'
              : 'rgba(255,255,255,0.05)'
          ),
          borderColor:     'rgba(245,197,24,0.9)',
          borderWidth:     1,
          borderRadius:    5,
          borderSkipped:   false,
          hoverBackgroundColor: 'rgba(245,197,24,0.95)',
        }],
      },
      options: {
        ...CHART_DEFAULTS,
        scales: {
          x: {
            grid:  { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: 'rgba(221,225,239,0.40)', font: { size: 10, family: 'Inter' } },
          },
          y: {
            grid:      { color: 'rgba(255,255,255,0.04)' },
            ticks:     { color: 'rgba(221,225,239,0.40)', font: { size: 10, family: 'Inter' } },
            beginAtZero: true,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1d2b',
            borderColor:     'rgba(255,255,255,0.1)',
            borderWidth:     1,
            titleColor:      '#dde1ef',
            bodyColor:       'rgba(221,225,239,0.6)',
            callbacks: {
              label: ctx => ` ${ctx.parsed.y} min`,
            },
          },
        },
      },
    });

    // ── Donut: genre breakdown ─────────────────────────────────
    if (genreChart) genreChart.destroy();
    const GENRE_COLORS = ['#f5c518','#9d71ff','#22d3a5','#ff6b8a','#2563eb'];

    const genreCtx = document.getElementById('genreChart').getContext('2d');
    if (genres.length) {
      genreChart = new Chart(genreCtx, {
        type: 'doughnut',
        data: {
          labels:   genres.map(g => g.genre),
          datasets: [{
            data:            genres.map(g => g.count),
            backgroundColor: GENRE_COLORS.map(c => c + 'cc'),
            borderColor:     '#13151f',
            borderWidth:     3,
            hoverOffset:     6,
          }],
        },
        options: {
          ...CHART_DEFAULTS,
          cutout: '65%',
          plugins: {
            legend: {
              display:  true,
              position: 'bottom',
              labels: {
                color:     'rgba(221,225,239,0.50)',
                font:      { size: 10, family: 'Inter' },
                boxWidth:  10,
                padding:   8,
              },
            },
            tooltip: {
              backgroundColor: '#1a1d2b',
              borderColor:     'rgba(255,255,255,0.1)',
              borderWidth:     1,
              titleColor:      '#dde1ef',
              bodyColor:       'rgba(221,225,239,0.6)',
            },
          },
        },
      });
    } else {
      genreCtx.fillStyle = 'rgba(221,225,239,0.2)';
      genreCtx.font = '12px Inter';
      genreCtx.textAlign = 'center';
      genreCtx.fillText('No genre data', genreCtx.canvas.width / 2, genreCtx.canvas.height / 2);
    }
  }

  // ── Leaderboard ───────────────────────────────────────────────
  async function loadLeaderboard() {
    try {
      const data = await apiFetch(`/api/leaderboard${asOfParam()}`);
      renderLeaderboard(data);
    } catch (err) {
      console.error('Leaderboard error:', err);
    }
  }

  function renderLeaderboard(data) {
    lbList.innerHTML = '';
    const maxPts = data.length ? data[0].total_points : 1;

    const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

    data.forEach((row, i) => {
      const rank      = row.rank;
      const color     = avatarColor(row.user_id);
      const initial   = (row.name || row.user_id).charAt(0).toUpperCase();
      const barWidth  = maxPts > 0 ? Math.round((row.total_points / maxPts) * 100) : 0;

      const el = document.createElement('div');
      el.className  = 'lb-row';
      el.dataset.id = row.user_id;
      el.style.animationDelay = `${i * 0.03}s`;

      el.innerHTML = `
        <div class="lb-rank-cell ${rank <= 3 ? 'r'+rank : ''}">
          ${rank <= 3 ? MEDALS[rank] : rank}
        </div>
        <div class="player-avatar" style="background:${color};width:34px;height:34px;font-size:13px;">${initial}</div>
        <div class="lb-info">
          <div class="lb-name">${row.name || row.user_id}</div>
          <div class="lb-id">${row.user_id}</div>
        </div>
        <div class="lb-bar-wrap">
          <div class="lb-bar-fill" style="width:${barWidth}%"></div>
        </div>
        <div class="lb-score">${row.total_points}<span class="pts"> pts</span></div>
      `;

      el.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-tab="overview"]').classList.add('active');
        document.querySelectorAll('.tab-content').forEach(p => p.classList.remove('active'));
        document.getElementById('tab-overview').classList.add('active');
        selectPlayer(row.user_id, row.name);

        // Sync sidebar selection
        const sideRow = document.querySelector(`.player-row[data-id="${row.user_id}"]`);
        if (sideRow) {
          sideRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          document.querySelectorAll('.player-row').forEach(r => r.classList.remove('active'));
          sideRow.classList.add('active');
        }
      });

      lbList.appendChild(el);
    });
  }

  // ── Refresh all ───────────────────────────────────────────────
  async function refreshAll() {
    await Promise.all([loadStats(), loadUsers(), loadLeaderboard()]);
    if (selectedId) {
      const user = allUsers.find(u => u.user_id === selectedId);
      selectPlayer(selectedId, user?.name);
    }
  }

  refreshBtn.addEventListener('click', refreshAll);
  asOfInput.addEventListener('change', refreshAll);

  // ── Init ──────────────────────────────────────────────────────
  Promise.all([loadStats(), loadUsers(), loadLeaderboard()]);

});
