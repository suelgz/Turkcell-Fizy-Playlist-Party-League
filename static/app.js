document.addEventListener('DOMContentLoaded', () => {
  let allUsers = [];
  let selectedId = null;
  let trendChart = null;
  let genreChart = null;

  const AVATAR_COLORS = [
    '#7c3aed', '#2563eb', '#0891b2', '#059669',
    '#d97706', '#dc2626', '#db2777', '#4f46e5',
    '#0284c7', '#22d3a5',
  ];

  const asOfInput = document.getElementById('asOf');
  const refreshBtn = document.getElementById('refreshBtn');
  const playerList = document.getElementById('playerList');
  const playerCount = document.getElementById('playerCount');
  const searchInput = document.getElementById('userSearch');
  const selectedBadge = document.getElementById('selectedBadge');
  const selectedName = document.getElementById('selectedName');
  const emptyState = document.getElementById('emptyState');
  const playerDetail = document.getElementById('playerDetail');
  const lbList = document.getElementById('lbList');

  asOfInput.value = new Date().toISOString().slice(0, 10);

  function show(el) {
    el.classList.remove('hidden');
  }

  function hide(el) {
    el.classList.add('hidden');
  }

  function asOfParam() {
    return asOfInput.value ? `?as_of=${encodeURIComponent(asOfInput.value)}` : '';
  }

  function avatarColor(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  async function apiFetch(path) {
    const response = await fetch(path);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  function animateCounter(el, target, duration = 700, formatter = value => Math.round(value).toLocaleString()) {
    el.classList.remove('skeleton');
    el.style.width = '';
    el.style.height = '';

    const start = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatter(target * eased);
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function activateTab(tabName) {
    document.querySelectorAll('.tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });
  }

  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  function renderStats(stats) {
    animateCounter(document.getElementById('kpiUsers'), stats.active_users || 0);
    document.getElementById('kpi-users').classList.add('loaded');

    animateCounter(
      document.getElementById('kpiMinutes'),
      stats.total_listening_minutes || 0,
      850,
      value => `${Math.round(value).toLocaleString()} min`,
    );
    document.getElementById('kpiMinutesSub').textContent =
      `${Math.round((stats.total_listening_minutes || 0) / 60).toLocaleString()} hours processed`;
    document.getElementById('kpi-minutes').classList.add('loaded');

    animateCounter(
      document.getElementById('kpiPoints'),
      stats.total_points_distributed || 0,
      750,
      value => `${Math.round(value).toLocaleString()} pts`,
    );
    document.getElementById('kpi-points').classList.add('loaded');

    animateCounter(document.getElementById('kpiChallenges'), stats.total_challenges_completed || 0);
    document.getElementById('kpiGenre').textContent = `Top genre: ${stats.top_genre || '-'}`;
    document.getElementById('kpi-challenges').classList.add('loaded');
  }

  function filteredUsers() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return allUsers;

    return allUsers.filter(user =>
      user.user_id.toLowerCase().includes(query) ||
      (user.name || '').toLowerCase().includes(query)
    );
  }

  function renderPlayerList(users) {
    playerList.innerHTML = '';
    playerCount.textContent = users.length;

    if (!users.length) {
      playerList.innerHTML = '<div style="padding:20px;color:var(--muted);font-size:12px;">No players found</div>';
      return;
    }

    users.forEach(user => {
      const row = document.createElement('div');
      const initial = (user.name || user.user_id).charAt(0).toUpperCase();
      const hasScore = Number(user.total_points) > 0;

      row.className = `player-row${user.user_id === selectedId ? ' active' : ''}`;
      row.dataset.id = user.user_id;
      row.innerHTML = `
        <div class="player-avatar" style="background:${avatarColor(user.user_id)}">${initial}</div>
        <div class="player-info">
          <div class="player-name">${user.name || user.user_id}</div>
          <div class="player-id">Rank ${user.rank || '-'} | ${user.user_id}</div>
        </div>
        <div class="score-chip ${hasScore ? '' : 'dim'}">${user.total_points}</div>
      `;
      row.addEventListener('click', () => selectPlayer(user.user_id, user.name));
      playerList.appendChild(row);
    });
  }

  function renderSummaryBlock(container, rows) {
    container.innerHTML = rows.map(row => `
      <div class="engine-summary-item">
        <div class="engine-summary-label">${row.label}</div>
        <div class="engine-summary-value">${row.value}</div>
      </div>
    `).join('');
  }

  async function selectPlayer(userId, userName) {
    selectedId = userId;
    selectedName.textContent = userName || userId;
    show(selectedBadge);
    hide(emptyState);
    show(playerDetail);
    activateTab('overview');

    document.querySelectorAll('.player-row').forEach(row => {
      row.classList.toggle('active', row.dataset.id === userId);
    });

    document.getElementById('statToday').textContent = '-';
    document.getElementById('stat7d').textContent = '-';
    document.getElementById('statStreak').textContent = '-';
    document.getElementById('streakFill').style.width = '0%';

    try {
      const detail = await apiFetch(`/api/user/${encodeURIComponent(userId)}${asOfParam()}`);
      selectedName.textContent = detail.profile?.name || userName || userId;
      renderDetail(detail);
      renderCharts(detail.trend || [], detail.genres || []);
    } catch (err) {
      console.error('Player detail error:', err);
    }
  }

  function renderDetail(detail) {
    const metrics = detail.metrics || {};
    const ledger = detail.points_ledger_summary || {};
    const insights = detail.insights || {};

    document.getElementById('statToday').innerHTML =
      `${metrics.listen_minutes_today || 0}<span class="unit">min</span>`;
    document.getElementById('statTodaySub').textContent =
      `${metrics.unique_tracks_today || 0} tracks | ${metrics.playlist_additions_today || 0} added | ${metrics.shares_today || 0} shared`;

    document.getElementById('stat7d').innerHTML =
      `${metrics.listen_minutes_7d || 0}<span class="unit">min</span>`;
    document.getElementById('stat7dSub').textContent =
      `${metrics.unique_tracks_7d || 0} tracks | ${metrics.shares_7d || 0} shares`;

    const streak = metrics.listen_streak_days || 0;
    document.getElementById('statStreak').innerHTML =
      `${streak}<span class="unit">day${streak === 1 ? '' : 's'}</span>`;
    document.getElementById('streakFill').style.width = `${metrics.streak_progress_percent || 0}%`;

    renderChallengeAwards(detail.challenge_awards || []);

    renderSummaryBlock(document.getElementById('ledgerBlock'), [
      { label: 'Ledger Entries', value: ledger.entries || 0 },
      { label: 'Total Points', value: `${ledger.total_points || 0} pts` },
      { label: 'Source', value: Object.keys(ledger.sources || {}).join(', ') || '-' },
    ]);

    renderSummaryBlock(document.getElementById('insightBlock'), [
      { label: 'Favorite Genre', value: insights.favorite_genre || '-' },
      { label: 'Total Listening', value: `${insights.total_listening_minutes || 0} min` },
      { label: 'Total Shares', value: insights.total_shares || 0 },
    ]);

    renderBadges(detail.badges || []);
    renderNotifications(detail.notifications || []);
  }

  function renderChallengeAwards(awards) {
    const block = document.getElementById('challengeBlock');
    const award = awards[0];

    if (!award) {
      block.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:10px 0;">No challenge awarded for this engine run.</div>';
      return;
    }

    const suppressed = award.suppressed_challenges || [];
    block.innerHTML = `
      <div class="challenge-selected">
        <div>
          <div class="challenge-name">${award.selected_challenge_name}</div>
          <div class="challenge-meta">${award.triggered_count} triggered | ${award.suppressed_count} suppressed by backend rules</div>
          ${suppressed.length ? `<div class="challenge-suppressed">
            ${suppressed.map(challenge => `<span class="challenge-tag">${challenge.challenge_name}</span>`).join('')}
          </div>` : ''}
        </div>
        <div class="challenge-pts">${award.reward_points}<span> pts</span></div>
      </div>
    `;
  }

  function renderBadges(badges) {
    const grid = document.getElementById('badgesGrid');
    grid.innerHTML = '';

    if (!badges.length) {
      grid.innerHTML = '<div style="color:var(--muted);font-size:13px;">No badges awarded by the backend yet.</div>';
      return;
    }

    badges.forEach(badge => {
      const div = document.createElement('div');
      div.className = `badge-item ${badge.css_class || ''}`;
      div.textContent = `${badge.tier}: ${badge.badge_name}`;
      grid.appendChild(div);
    });
  }

  function renderNotifications(notifications) {
    const notifList = document.getElementById('notifList');
    notifList.innerHTML = '';

    if (!notifications.length) {
      notifList.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:10px 0;">No notifications generated.</div>';
      return;
    }

    notifications.forEach(notification => {
      notifList.innerHTML += `
        <div class="notif-item">
          <div class="notif-dot"></div>
          <div>
            <div class="notif-msg">${notification.message}</div>
            <div class="notif-meta">
              <span class="notif-channel">${notification.channel}</span>
              ${String(notification.sent_at || '').slice(0, 10)}
            </div>
          </div>
        </div>
      `;
    });
  }

  const CHART_DEFAULTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
  };

  function renderCharts(trend, genres) {
    renderTrendChart(trend);
    renderGenreChart(genres);
  }

  function renderTrendChart(trend) {
    if (trendChart) trendChart.destroy();

    const trendCtx = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(trendCtx, {
      type: 'bar',
      data: {
        labels: trend.map(row => row.date),
        datasets: [{
          data: trend.map(row => row.minutes),
          backgroundColor: trend.map(row =>
            row.minutes > 0 ? 'rgba(245,197,24,0.70)' : 'rgba(255,255,255,0.05)'
          ),
          borderColor: 'rgba(245,197,24,0.9)',
          borderWidth: 1,
          borderRadius: 5,
          borderSkipped: false,
          hoverBackgroundColor: 'rgba(245,197,24,0.95)',
        }],
      },
      options: {
        ...CHART_DEFAULTS,
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: 'rgba(221,225,239,0.40)', font: { size: 10, family: 'Inter' } },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: 'rgba(221,225,239,0.40)', font: { size: 10, family: 'Inter' } },
            beginAtZero: true,
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1d2b',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            titleColor: '#dde1ef',
            bodyColor: 'rgba(221,225,239,0.6)',
            callbacks: { label: ctx => ` ${ctx.parsed.y} min` },
          },
        },
      },
    });
  }

  function renderGenreChart(genres) {
    if (genreChart) genreChart.destroy();

    const genreCtx = document.getElementById('genreChart').getContext('2d');
    genreCtx.clearRect(0, 0, genreCtx.canvas.width, genreCtx.canvas.height);

    if (!genres.length) {
      genreCtx.fillStyle = 'rgba(221,225,239,0.2)';
      genreCtx.font = '12px Inter';
      genreCtx.textAlign = 'center';
      genreCtx.fillText('No genre data', genreCtx.canvas.width / 2, genreCtx.canvas.height / 2);
      return;
    }

    const colors = ['#f5c518', '#9d71ff', '#22d3a5', '#ff6b8a', '#2563eb'];
    genreChart = new Chart(genreCtx, {
      type: 'doughnut',
      data: {
        labels: genres.map(row => row.genre),
        datasets: [{
          data: genres.map(row => row.count),
          backgroundColor: colors.map(color => `${color}cc`),
          borderColor: '#13151f',
          borderWidth: 3,
          hoverOffset: 6,
        }],
      },
      options: {
        ...CHART_DEFAULTS,
        cutout: '65%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              color: 'rgba(221,225,239,0.50)',
              font: { size: 10, family: 'Inter' },
              boxWidth: 10,
              padding: 8,
            },
          },
          tooltip: {
            backgroundColor: '#1a1d2b',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            titleColor: '#dde1ef',
            bodyColor: 'rgba(221,225,239,0.6)',
          },
        },
      },
    });
  }

  function renderLeaderboard(rows) {
    lbList.innerHTML = '';
    const maxPoints = rows.length ? Number(rows[0].total_points) || 1 : 1;

    rows.forEach((row, index) => {
      const initial = (row.name || row.user_id).charAt(0).toUpperCase();
      const barWidth = maxPoints > 0 ? Math.round((row.total_points / maxPoints) * 100) : 0;
      const el = document.createElement('div');

      el.className = 'lb-row';
      el.dataset.id = row.user_id;
      el.style.animationDelay = `${index * 0.03}s`;
      el.innerHTML = `
        <div class="lb-rank-cell ${row.rank <= 3 ? `r${row.rank}` : ''}">#${row.rank}</div>
        <div class="player-avatar" style="background:${avatarColor(row.user_id)};width:34px;height:34px;font-size:13px;">${initial}</div>
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
        selectPlayer(row.user_id, row.name);
        const sideRow = document.querySelector(`.player-row[data-id="${row.user_id}"]`);
        if (sideRow) sideRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });

      lbList.appendChild(el);
    });
  }

  async function refreshAll() {
    try {
      const dashboard = await apiFetch(`/api/dashboard${asOfParam()}`);
      if (dashboard.as_of_date) asOfInput.value = dashboard.as_of_date;

      renderStats(dashboard.stats || {});
      allUsers = dashboard.players || [];
      renderPlayerList(filteredUsers());
      renderLeaderboard(dashboard.leaderboard || []);

      if (selectedId) {
        const selected = allUsers.find(user => user.user_id === selectedId);
        if (selected) await selectPlayer(selectedId, selected.name);
      }
    } catch (err) {
      console.error('Dashboard error:', err);
      playerList.innerHTML = `<div style="padding:20px;color:#ff6b8a;font-size:12px;">${err.message}</div>`;
    }
  }

  searchInput.addEventListener('input', () => renderPlayerList(filteredUsers()));
  refreshBtn.addEventListener('click', refreshAll);
  asOfInput.addEventListener('change', refreshAll);

  refreshAll();
});
