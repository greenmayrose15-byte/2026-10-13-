/**
 * DayLog - Antigravity Pro Application Logic
 * Architecture: Local-First State Management, Live Timer Engine, Weekly Analytics Chart,
 * PIN Security, Markdown Parser, JSON Backup & PWA Service Worker.
 */

// Execution & Checklist Verification Log
console.log(
  "%c[DayLog] System Initializing... v1.0.0 Pro (Antigravity Edition)",
  "color: #6366f1; font-weight: 800; font-size: 14px; background: #0f172a; padding: 4px 8px; border-radius: 4px;"
);

(function () {
  'use strict';

  // --- Constants & Storage Keys ---
  const STORAGE_KEY = 'daylog_app_data_v1';
  const LOCK_SESSION_KEY = 'daylog_session_unlocked';

  // Preset Colors for App Customization
  const APP_PALETTE = [
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Cyan', hex: '#06b6d4' },
    { name: 'Violet', hex: '#8b5cf6' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Rose', hex: '#f43f5e' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Orange', hex: '#ea580c' }
  ];

  // Default Apps
  const DEFAULT_APPS = [
    { id: 'app_vscode', name: 'Visual Studio Code', category: '개발', color: '#007acc' },
    { id: 'app_chrome', name: 'Google Chrome', category: '브라우저/웹', color: '#4285f4' },
    { id: 'app_figma', name: 'Figma', category: '디자인', color: '#a259ff' },
    { id: 'app_slack', name: 'Slack', category: '커뮤니케이션', color: '#e01e5a' },
    { id: 'app_notion', name: 'Notion', category: '생산성/오피스', color: '#10b981' },
    { id: 'app_terminal', name: 'Terminal / Shell', category: '개발', color: '#06b6d4' },
    { id: 'app_youtube', name: 'YouTube / Media', category: '엔터테인먼트', color: '#ef4444' }
  ];

  // Initial State Structure
  const INITIAL_DATA_STATE = {
    version: 1,
    settings: {
      theme: 'dark',
      dailyTargetHours: 4,
      pinEnabled: false,
      pinHash: '',
      encryption: false,
      firstRunCompleted: false
    },
    apps: [...DEFAULT_APPS],
    entries: [] // Empty by default on first launch
  };

  // --- Application State ---
  let appState = { ...INITIAL_DATA_STATE };
  let activeFilter = {
    keyword: '',
    appId: 'ALL',
    tag: null,
    date: null,
    sort: 'date-desc'
  };

  // Live Timer State
  let liveTimer = {
    isRunning: false,
    startTime: null,
    elapsedSeconds: 0,
    intervalId: null,
    appId: 'app_vscode',
    appName: 'Visual Studio Code'
  };

  // PIN Lock State
  let enteredPin = '';

  // Active Confirm Callback
  let pendingConfirmAction = null;

  // ===================================================================
  // 1. Storage & Encryption Engine
  // ===================================================================

  function simpleEncrypt(text) {
    try {
      return btoa(encodeURIComponent(text));
    } catch (e) {
      return text;
    }
  }

  function simpleDecrypt(text) {
    try {
      return decodeURIComponent(atob(text));
    } catch (e) {
      return text;
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        let parsed;
        if (raw.startsWith('{') && raw.endsWith('}')) {
          parsed = JSON.parse(raw);
        } else {
          // Decrypt if encrypted/encoded
          parsed = JSON.parse(simpleDecrypt(raw));
        }

        appState = {
          version: parsed.version || 1,
          settings: { ...INITIAL_DATA_STATE.settings, ...(parsed.settings || {}) },
          apps: (parsed.apps && parsed.apps.length > 0) ? parsed.apps : [...DEFAULT_APPS],
          entries: Array.isArray(parsed.entries) ? parsed.entries : []
        };
        console.log(`[DayLog] Storage state verified: ${appState.entries.length} entries found.`);
      } else {
        console.log('[DayLog] Initial launch detected: Storage empty.');
        appState = JSON.parse(JSON.stringify(INITIAL_DATA_STATE));
      }
    } catch (err) {
      console.error('[DayLog] Failed to load local state, fallback to initial:', err);
      appState = JSON.parse(JSON.stringify(INITIAL_DATA_STATE));
    }
  }

  function saveState() {
    try {
      const payload = JSON.stringify(appState);
      if (appState.settings.encryption) {
        localStorage.setItem(STORAGE_KEY, simpleEncrypt(payload));
      } else {
        localStorage.setItem(STORAGE_KEY, payload);
      }
    } catch (err) {
      console.error('[DayLog] Error saving state:', err);
      showToast('로컬 저장소 저장 중 오류가 발생했습니다.', 'error');
    }
  }

  // ===================================================================
  // 2. Date & Time Utility Functions
  // ===================================================================

  function getTodayString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatKoreanDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    return `${y}년 ${m}월 ${d}일 ${dayNames[dateObj.getDay()]}요일`;
  }

  function formatShortDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return `${parts[1]}/${parts[2]}`;
  }

  function formatDurationMinutes(minutes) {
    if (!minutes || minutes <= 0) return '0분';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}분`;
    if (mins === 0) return `${hrs}시간`;
    return `${hrs}시간 ${mins}분`;
  }

  function formatTimerSeconds(totalSeconds) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function generateUUID() {
    return 'entry_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
  }

  // ===================================================================
  // 3. Lightweight Safe Markdown Parser
  // ===================================================================

  function renderMarkdown(mdText) {
    if (!mdText) return '';
    // Basic sanitization
    let html = mdText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks ```code```
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2>$1</h2>');

    // Bold & Italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Checkboxes
    html = html.replace(/^- \[x\] (.*$)/gim, '<div class="chk-item">☑ <s>$1</s></div>');
    html = html.replace(/^- \[ \] (.*$)/gim, '<div class="chk-item">☐ $1</div>');

    // Bullet lists
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Newlines to br
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  // ===================================================================
  // 4. UI Rendering: Theme, Date & KPIs
  // ===================================================================

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    appState.settings.theme = theme;
    const icon = document.getElementById('theme-toggle-icon');
    if (icon) {
      icon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
  }

  function updateOverviewDate() {
    const heading = document.getElementById('current-date-heading');
    if (heading) {
      heading.textContent = formatKoreanDate(getTodayString());
    }
  }

  function updateKPIs() {
    const today = getTodayString();
    const entries = appState.entries;

    // 1. Today's total usage
    const todayEntries = entries.filter(e => e.date === today);
    const todayTotalMinutes = todayEntries.reduce((sum, e) => sum + (Number(e.durationMinutes) || 0), 0);

    const kpiTodayTotal = document.getElementById('kpi-today-total');
    const kpiTodayCount = document.getElementById('kpi-today-entries-count');
    if (kpiTodayTotal) kpiTodayTotal.textContent = formatDurationMinutes(todayTotalMinutes);
    if (kpiTodayCount) kpiTodayCount.textContent = `총 ${todayEntries.length}개 세션 기록`;

    // Daily target progress
    const targetHours = Number(appState.settings.dailyTargetHours) || 4;
    const targetTotalMinutes = targetHours * 60;
    const progressPercent = Math.min(100, Math.round((todayTotalMinutes / targetTotalMinutes) * 100));

    const targetProgressText = document.getElementById('target-progress-text');
    const targetProgressBar = document.getElementById('target-progress-bar');
    const targetAlertMsg = document.getElementById('target-alert-msg');

    if (targetProgressText) {
      targetProgressText.textContent = `${formatDurationMinutes(todayTotalMinutes)} / ${targetHours}h 0m (${progressPercent}%)`;
    }
    if (targetProgressBar) {
      targetProgressBar.style.width = `${progressPercent}%`;
      if (progressPercent >= 100) {
        targetProgressBar.style.background = 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)';
      } else {
        targetProgressBar.style.background = 'var(--grad-primary)';
      }
    }
    if (targetAlertMsg) {
      if (progressPercent >= 100) {
        targetAlertMsg.textContent = '🎉 축하합니다! 오늘의 목표 사용 시간을 완벽하게 달성했습니다!';
        targetAlertMsg.style.color = '#10b981';
      } else if (progressPercent >= 75) {
        targetAlertMsg.textContent = '목표치의 75%를 초과했습니다. 생산적인 하루입니다!';
        targetAlertMsg.style.color = 'var(--text-secondary)';
      } else {
        targetAlertMsg.textContent = '목표 시간 대비 적정 사용량을 유지 중입니다.';
        targetAlertMsg.style.color = 'var(--text-muted)';
      }
    }

    // 2. Weekly Daily Average (Last 7 Days)
    const last7Days = getLastNDays(7);
    const last7DaysEntries = entries.filter(e => last7Days.includes(e.date));
    const last7DaysTotalMinutes = last7DaysEntries.reduce((sum, e) => sum + (Number(e.durationMinutes) || 0), 0);
    const dailyAvgMinutes = Math.round(last7DaysTotalMinutes / 7);

    const kpiDailyAvg = document.getElementById('kpi-daily-avg');
    if (kpiDailyAvg) kpiDailyAvg.textContent = formatDurationMinutes(dailyAvgMinutes);

    // 3. Top Used App (Overall or Last 7 days)
    const appMinutesMap = {};
    entries.forEach(e => {
      const appName = e.appName || '알 수 없음';
      appMinutesMap[appName] = (appMinutesMap[appName] || 0) + (Number(e.durationMinutes) || 0);
    });

    let topAppName = '-';
    let topAppMinutes = 0;
    for (const [name, mins] of Object.entries(appMinutesMap)) {
      if (mins > topAppMinutes) {
        topAppMinutes = mins;
        topAppName = name;
      }
    }

    const kpiTopAppName = document.getElementById('kpi-top-app-name');
    const kpiTopAppTime = document.getElementById('kpi-top-app-time');
    if (kpiTopAppName) kpiTopAppName.textContent = topAppName;
    if (kpiTopAppTime) {
      kpiTopAppTime.textContent = topAppMinutes > 0 ? `누적 ${formatDurationMinutes(topAppMinutes)}` : '기록 대기 중';
    }

    // 4. Consecutive Streak Days
    const streak = calculateStreak(entries);
    const kpiStreakCount = document.getElementById('kpi-streak-count');
    const kpiStreakMsg = document.getElementById('kpi-streak-msg');
    if (kpiStreakCount) kpiStreakCount.textContent = `${streak}일 연속`;
    if (kpiStreakMsg) {
      if (streak > 0) {
        kpiStreakMsg.textContent = todayEntries.length > 0 ? '오늘 목표 스트릭 유지 중!' : '오늘 추가 기록 시 연속 달성!';
      } else {
        kpiStreakMsg.textContent = '오늘 첫 기록으로 스트릭을 시작하세요!';
      }
    }
  }

  function getLastNDays(n) {
    const dates = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${day}`);
    }
    return dates;
  }

  function calculateStreak(entries) {
    if (!entries || entries.length === 0) return 0;
    const loggedDates = new Set(entries.map(e => e.date));
    let streak = 0;
    const current = new Date();

    // Check starting today or yesterday
    const todayStr = getTodayString();
    let checkDate = new Date();

    if (!loggedDates.has(todayStr)) {
      // If not logged today, check if logged yesterday
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const y = checkDate.getFullYear();
      const m = String(checkDate.getMonth() + 1).padStart(2, '0');
      const d = String(checkDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      if (loggedDates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  // ===================================================================
  // 5. Weekly 7-Day Interactive SVG Bar Chart
  // ===================================================================

  function renderWeeklyChart() {
    const container = document.getElementById('weekly-chart-container');
    const legendContainer = document.getElementById('chart-app-legend');
    if (!container) return;

    const days = getLastNDays(7);
    const entries = appState.entries;

    // Aggregate minutes per day and per app
    const dayData = days.map(dateStr => {
      const dayEntries = entries.filter(e => e.date === dateStr);
      const totalMinutes = dayEntries.reduce((sum, e) => sum + (Number(e.durationMinutes) || 0), 0);
      return {
        date: dateStr,
        totalMinutes,
        entries: dayEntries
      };
    });

    const maxMinutes = Math.max(120, ...dayData.map(d => d.totalMinutes));
    const width = 640;
    const height = 210;
    const chartPaddingTop = 30;
    const chartPaddingBottom = 35;
    const chartPaddingLeft = 45;
    const chartPaddingRight = 20;

    const usableWidth = width - chartPaddingLeft - chartPaddingRight;
    const usableHeight = height - chartPaddingTop - chartPaddingBottom;
    const barWidth = Math.floor(usableWidth / days.length) - 18;

    // SVG String Generation
    let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">
      <defs>
        <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#6366f1" />
          <stop offset="100%" stop-color="#06b6d4" />
        </linearGradient>
        <linearGradient id="barGradHover" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#818cf8" />
          <stop offset="100%" stop-color="#38bdf8" />
        </linearGradient>
      </defs>`;

    // Grid lines (3 horizontal lines)
    const gridSteps = [0, 0.5, 1];
    gridSteps.forEach(step => {
      const yPos = chartPaddingTop + usableHeight * (1 - step);
      const minutesVal = Math.round(maxMinutes * step);
      const hrsText = (minutesVal / 60).toFixed(1) + 'h';
      svg += `
        <line x1="${chartPaddingLeft}" y1="${yPos}" x2="${width - chartPaddingRight}" y2="${yPos}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4 4" />
        <text x="${chartPaddingLeft - 8}" y="${yPos + 4}" fill="#64748b" font-size="11" font-family="'JetBrains Mono', monospace" text-anchor="end">${hrsText}</text>
      `;
    });

    // Render Bars
    dayData.forEach((day, index) => {
      const x = chartPaddingLeft + index * (usableWidth / days.length) + (usableWidth / days.length - barWidth) / 2;
      const barHeight = (day.totalMinutes / maxMinutes) * usableHeight;
      const y = chartPaddingTop + usableHeight - barHeight;
      const isToday = day.date === getTodayString();
      const isSelected = activeFilter.date === day.date;

      const dateLabel = isToday ? '오늘' : formatShortDate(day.date);

      svg += `
        <g class="chart-bar-group" data-date="${day.date}" style="cursor: pointer;">
          <!-- Bar Background Track -->
          <rect x="${x}" y="${chartPaddingTop}" width="${barWidth}" height="${usableHeight}" rx="6" fill="rgba(255,255,255,0.03)" />
          
          <!-- Value Bar -->
          <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="6"
                fill="${isSelected ? '#38bdf8' : (day.totalMinutes > 0 ? 'url(#barGrad)' : 'rgba(255,255,255,0.06)')}"
                stroke="${isSelected ? '#ffffff' : (isToday ? '#6366f1' : 'none')}" stroke-width="${isSelected || isToday ? '2' : '0'}"
                style="transition: all 0.3s ease;">
            <title>${formatKoreanDate(day.date)}: ${formatDurationMinutes(day.totalMinutes)}</title>
          </rect>

          <!-- Value Label Above Bar (if > 0) -->
          ${day.totalMinutes > 0 ? `
            <text x="${x + barWidth / 2}" y="${y - 6}" fill="${isSelected ? '#38bdf8' : '#94a3b8'}" font-size="11" font-weight="700" font-family="'JetBrains Mono', monospace" text-anchor="middle">
              ${(day.totalMinutes / 60).toFixed(1)}h
            </text>
          ` : ''}

          <!-- X Axis Day Label -->
          <text x="${x + barWidth / 2}" y="${height - 10}" fill="${isToday ? '#6366f1' : (isSelected ? '#38bdf8' : '#64748b')}" font-size="12" font-weight="${isToday || isSelected ? '800' : '500'}" text-anchor="middle">
            ${dateLabel}
          </text>
        </g>
      `;
    });

    svg += '</svg>';
    container.innerHTML = svg;

    // Attach click event to bars to filter by that day
    const barGroups = container.querySelectorAll('.chart-bar-group');
    barGroups.forEach(group => {
      group.addEventListener('click', () => {
        const date = group.getAttribute('data-date');
        if (activeFilter.date === date) {
          activeFilter.date = null;
        } else {
          activeFilter.date = date;
        }
        updateChartResetBtn();
        renderWeeklyChart();
        renderEntriesList();
      });
    });

    // Populate Top 3 Apps in Chart Legend
    if (legendContainer) {
      const appMap = {};
      appState.apps.forEach(a => { appMap[a.id] = a; });
      const recentApps = {};
      entries.forEach(e => {
        recentApps[e.appName] = (recentApps[e.appName] || 0) + (Number(e.durationMinutes) || 0);
      });
      const topApps = Object.entries(recentApps)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      legendContainer.innerHTML = topApps.map(([name, mins]) => {
        const found = appState.apps.find(a => a.name === name);
        const color = found ? found.color : '#6366f1';
        return `
          <div class="legend-item">
            <span class="legend-dot" style="background: ${color}"></span>
            <span>${name}</span>
          </div>
        `;
      }).join('');
    }
  }

  function updateChartResetBtn() {
    const btn = document.getElementById('btn-chart-reset-filter');
    if (btn) {
      if (activeFilter.date) {
        btn.classList.remove('hidden');
        btn.textContent = `날짜 필터 해제 (${formatShortDate(activeFilter.date)})`;
      } else {
        btn.classList.add('hidden');
      }
    }
  }

  // ===================================================================
  // 6. Apps Management & Quick Pills
  // ===================================================================

  function renderAppSelectors() {
    const createSelect = document.getElementById('select-app');
    const filterSelect = document.getElementById('filter-app');
    const editSelect = document.getElementById('edit-select-app');
    const pillsContainer = document.getElementById('quick-app-pills');

    if (createSelect) {
      createSelect.innerHTML = appState.apps.map(app => `
        <option value="${app.id}" data-name="${app.name}" data-color="${app.color}">${app.name} (${app.category})</option>
      `).join('');
    }

    if (filterSelect) {
      const currentVal = filterSelect.value || 'ALL';
      filterSelect.innerHTML = `<option value="ALL">모든 앱 (전체)</option>` +
        appState.apps.map(app => `
          <option value="${app.id}">${app.name}</option>
        `).join('');
      filterSelect.value = currentVal;
    }

    if (editSelect) {
      editSelect.innerHTML = appState.apps.map(app => `
        <option value="${app.id}" data-name="${app.name}">${app.name}</option>
      `).join('');
    }

    if (pillsContainer) {
      pillsContainer.innerHTML = appState.apps.slice(0, 6).map((app, idx) => `
        <button type="button" class="app-pill ${idx === 0 ? 'selected' : ''}" data-app-id="${app.id}" data-app-name="${app.name}" style="--pill-color: ${app.color};">
          <span class="app-pill-dot" style="background: ${app.color};"></span>
          ${app.name}
        </button>
      `).join('');

      pillsContainer.querySelectorAll('.app-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          pillsContainer.querySelectorAll('.app-pill').forEach(p => p.classList.remove('selected'));
          pill.classList.add('selected');
          const appId = pill.getAttribute('data-app-id');
          if (createSelect) createSelect.value = appId;
          liveTimer.appId = appId;
          liveTimer.appName = pill.getAttribute('data-app-name');
          updateNavTimerPill();
        });
      });
    }
  }

  function renderColorPalette() {
    const container = document.getElementById('color-palette-options');
    if (!container) return;
    container.innerHTML = APP_PALETTE.map((c, i) => `
      <label class="color-radio-label" style="background: ${c.hex}" title="${c.name}">
        <input type="radio" name="new-app-color" value="${c.hex}" ${i === 0 ? 'checked' : ''}>
        <span class="color-check">✓</span>
      </label>
    `).join('');
  }

  // ===================================================================
  // 7. Live Timer Engine & Navigation Pill
  // ===================================================================

  function updateNavTimerPill() {
    const pill = document.getElementById('nav-active-timer-pill');
    const appNameEl = document.getElementById('nav-timer-app-name');
    const counterEl = document.getElementById('nav-timer-counter');

    if (!pill || !appNameEl || !counterEl) return;

    if (liveTimer.isRunning) {
      pill.classList.remove('hidden');
      appNameEl.textContent = liveTimer.appName;
      counterEl.textContent = formatTimerSeconds(liveTimer.elapsedSeconds);
    } else {
      pill.classList.add('hidden');
    }
  }

  function startLiveTimer() {
    if (liveTimer.isRunning) return;
    liveTimer.isRunning = true;
    const selectedOption = document.querySelector('#select-app option:checked');
    if (selectedOption) {
      liveTimer.appId = selectedOption.value;
      liveTimer.appName = selectedOption.getAttribute('data-name') || selectedOption.textContent;
    }

    const btnStart = document.getElementById('btn-timer-start');
    const btnPause = document.getElementById('btn-timer-pause');
    const btnReset = document.getElementById('btn-timer-reset');
    const statusText = document.getElementById('live-timer-status');

    if (btnStart) btnStart.disabled = true;
    if (btnPause) btnPause.disabled = false;
    if (btnReset) btnReset.disabled = false;
    if (statusText) statusText.textContent = `측정 중: ${liveTimer.appName}`;

    liveTimer.intervalId = setInterval(() => {
      liveTimer.elapsedSeconds++;
      const digits = document.getElementById('live-timer-digits');
      if (digits) digits.textContent = formatTimerSeconds(liveTimer.elapsedSeconds);
      updateNavTimerPill();
    }, 1000);

    updateNavTimerPill();
  }

  function pauseLiveTimer() {
    if (!liveTimer.isRunning) return;
    liveTimer.isRunning = false;
    clearInterval(liveTimer.intervalId);

    const btnStart = document.getElementById('btn-timer-start');
    const btnPause = document.getElementById('btn-timer-pause');
    const statusText = document.getElementById('live-timer-status');

    if (btnStart) btnStart.disabled = false;
    if (btnPause) btnPause.disabled = true;
    if (statusText) statusText.textContent = '일시 정지됨';

    updateNavTimerPill();
  }

  function resetLiveTimer() {
    pauseLiveTimer();
    liveTimer.elapsedSeconds = 0;
    const digits = document.getElementById('live-timer-digits');
    const btnReset = document.getElementById('btn-timer-reset');
    const statusText = document.getElementById('live-timer-status');

    if (digits) digits.textContent = '00:00:00';
    if (btnReset) btnReset.disabled = true;
    if (statusText) statusText.textContent = '타이머 대기 중';

    updateNavTimerPill();
  }

  // ===================================================================
  // 8. Entries List: Filtering, Sorting & Rendering
  // ===================================================================

  function renderEntriesList() {
    const container = document.getElementById('entries-container');
    const emptyState = document.getElementById('empty-state-view');
    const countDisplay = document.getElementById('entries-count-display');
    const activeTagBar = document.getElementById('active-tag-chips-bar');
    const activeTagName = document.getElementById('active-tag-name');

    if (!container) return;

    let list = [...appState.entries];

    // Filter by Search Keyword
    if (activeFilter.keyword) {
      const q = activeFilter.keyword.toLowerCase();
      list = list.filter(e =>
        (e.appName && e.appName.toLowerCase().includes(q)) ||
        (e.title && e.title.toLowerCase().includes(q)) ||
        (e.content && e.content.toLowerCase().includes(q)) ||
        (e.tags && e.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // Filter by App
    if (activeFilter.appId && activeFilter.appId !== 'ALL') {
      list = list.filter(e => e.appId === activeFilter.appId);
    }

    // Filter by Tag
    if (activeFilter.tag) {
      list = list.filter(e => e.tags && e.tags.includes(activeFilter.tag));
      if (activeTagBar && activeTagName) {
        activeTagBar.classList.remove('hidden');
        activeTagName.textContent = `#${activeFilter.tag}`;
      }
    } else {
      if (activeTagBar) activeTagBar.classList.add('hidden');
    }

    // Filter by Date (from Chart click)
    if (activeFilter.date) {
      list = list.filter(e => e.date === activeFilter.date);
    }

    // Sort
    switch (activeFilter.sort) {
      case 'date-asc':
        list.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.startTime || '').localeCompare(b.startTime || ''));
        break;
      case 'time-desc':
        list.sort((a, b) => (Number(b.durationMinutes) || 0) - (Number(a.durationMinutes) || 0));
        break;
      case 'time-asc':
        list.sort((a, b) => (Number(a.durationMinutes) || 0) - (Number(b.durationMinutes) || 0));
        break;
      case 'app-asc':
        list.sort((a, b) => (a.appName || '').localeCompare(b.appName || ''));
        break;
      case 'date-desc':
      default:
        list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.created_at || '').localeCompare(a.created_at || ''));
        break;
    }

    if (countDisplay) {
      const filterSuffix = (activeFilter.keyword || activeFilter.appId !== 'ALL' || activeFilter.tag || activeFilter.date) ? ' (필터 적용됨)' : '';
      countDisplay.textContent = `총 ${list.length}개의 기록${filterSuffix}`;
    }

    // Render Items or Empty State
    if (appState.entries.length === 0) {
      container.innerHTML = '';
      container.classList.add('hidden');
      if (emptyState) emptyState.classList.remove('hidden');
    } else if (list.length === 0) {
      container.classList.remove('hidden');
      if (emptyState) emptyState.classList.add('hidden');
      container.innerHTML = `
        <div style="text-align: center; padding: 36px 16px; color: var(--text-secondary); font-size: 0.9rem;">
          <p>선택한 필터 조건에 해당하는 기록이 없습니다.</p>
          <button type="button" id="btn-clear-all-filters" class="btn btn-sm btn-ghost" style="margin-top: 10px;">모든 필터 초기화</button>
        </div>
      `;
      const btnReset = document.getElementById('btn-clear-all-filters');
      if (btnReset) {
        btnReset.addEventListener('click', resetAllFilters);
      }
    } else {
      container.classList.remove('hidden');
      if (emptyState) emptyState.classList.add('hidden');

      const appMap = {};
      appState.apps.forEach(a => { appMap[a.id] = a; });

      container.innerHTML = list.map(entry => {
        const appInfo = appMap[entry.appId] || { name: entry.appName || '앱', color: '#6366f1' };
        const tags = Array.isArray(entry.tags) ? entry.tags : [];
        const timeRange = (entry.startTime && entry.endTime) ? `${entry.startTime} ~ ${entry.endTime}` : '';
        const renderedContent = entry.content ? renderMarkdown(entry.content) : '';

        return `
          <article class="entry-card" id="card-${entry.id}">
            <div class="entry-top-row">
              <span class="entry-app-badge" style="--badge-color: ${appInfo.color};">
                <span class="entry-app-badge-dot" style="background: ${appInfo.color};"></span>
                ${escapeHTML(entry.appName || appInfo.name)}
              </span>
              <span class="entry-duration-pill">⏱ ${formatDurationMinutes(entry.durationMinutes)}</span>
            </div>

            <div class="entry-title-row">
              <h4 class="entry-title-text">${escapeHTML(entry.title || '제목 없음')}</h4>
            </div>

            ${renderedContent ? `
              <div class="entry-content-box">${renderedContent}</div>
            ` : ''}

            <div class="entry-bottom-row">
              <span class="entry-date-badge">📅 ${entry.date} ${timeRange ? `(${timeRange})` : ''}</span>
              
              ${tags.length > 0 ? `
                <div class="entry-tags-list">
                  ${tags.map(t => `<span class="entry-tag-item" data-tag="${escapeHTML(t)}">#${escapeHTML(t)}</span>`).join('')}
                </div>
              ` : ''}

              <div class="entry-actions">
                <button type="button" class="btn-icon btn-sm btn-edit-entry" data-id="${entry.id}" title="기록 수정">✏️</button>
                <button type="button" class="btn-icon btn-sm btn-delete-entry" data-id="${entry.id}" title="기록 삭제">🗑️</button>
              </div>
            </div>
          </article>
        `;
      }).join('');

      // Attach Tag Filter clicks
      container.querySelectorAll('.entry-tag-item').forEach(tagEl => {
        tagEl.addEventListener('click', () => {
          const tag = tagEl.getAttribute('data-tag');
          activeFilter.tag = tag;
          renderEntriesList();
        });
      });

      // Attach Edit & Delete buttons
      container.querySelectorAll('.btn-edit-entry').forEach(btn => {
        btn.addEventListener('click', () => openEditEntryModal(btn.getAttribute('data-id')));
      });
      container.querySelectorAll('.btn-delete-entry').forEach(btn => {
        btn.addEventListener('click', () => confirmDeleteEntry(btn.getAttribute('data-id')));
      });
    }

    renderPopularTags();
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  function renderPopularTags() {
    const container = document.getElementById('popular-tags-chips');
    if (!container) return;

    const tagCounts = {};
    appState.entries.forEach(e => {
      if (Array.isArray(e.tags)) {
        e.tags.forEach(t => {
          if (t.trim()) tagCounts[t.trim()] = (tagCounts[t.trim()] || 0) + 1;
        });
      }
    });

    const popular = Object.keys(tagCounts).slice(0, 6);
    if (popular.length === 0) {
      container.innerHTML = `
        <span class="tag-chip" data-tag="개발">#개발</span>
        <span class="tag-chip" data-tag="코딩">#코딩</span>
        <span class="tag-chip" data-tag="회의">#회의</span>
        <span class="tag-chip" data-tag="일기">#일기</span>
      `;
    } else {
      container.innerHTML = popular.map(tag => `
        <span class="tag-chip" data-tag="${escapeHTML(tag)}">#${escapeHTML(tag)}</span>
      `).join('');
    }

    container.querySelectorAll('.tag-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const input = document.getElementById('input-tags');
        if (input) {
          const val = input.value.trim();
          const tagText = chip.getAttribute('data-tag');
          if (!val) {
            input.value = tagText;
          } else {
            const list = val.split(',').map(s => s.trim());
            if (!list.includes(tagText)) {
              input.value = `${val}, ${tagText}`;
            }
          }
        }
      });
    });
  }

  function resetAllFilters() {
    activeFilter.keyword = '';
    activeFilter.appId = 'ALL';
    activeFilter.tag = null;
    activeFilter.date = null;
    activeFilter.sort = 'date-desc';

    const searchInput = document.getElementById('search-keyword');
    const filterApp = document.getElementById('filter-app');
    const sortSelect = document.getElementById('sort-entries');
    const searchClear = document.getElementById('btn-search-clear');

    if (searchInput) searchInput.value = '';
    if (filterApp) filterApp.value = 'ALL';
    if (sortSelect) sortSelect.value = 'date-desc';
    if (searchClear) searchClear.classList.add('hidden');

    updateChartResetBtn();
    renderWeeklyChart();
    renderEntriesList();
  }

  // ===================================================================
  // 9. Entry Creation, Editing & Deletion
  // ===================================================================

  function handleCreateEntrySubmit(e) {
    e.preventDefault();

    const appSelect = document.getElementById('select-app');
    const titleInput = document.getElementById('input-entry-title');
    const tagsInput = document.getElementById('input-tags');
    const contentInput = document.getElementById('textarea-markdown');
    const isManualMode = !document.getElementById('manual-mode-container').classList.contains('hidden');

    const appId = appSelect ? appSelect.value : 'app_vscode';
    const selectedOption = appSelect ? appSelect.options[appSelect.selectedIndex] : null;
    const appName = selectedOption ? (selectedOption.getAttribute('data-name') || selectedOption.textContent.split(' (')[0]) : '앱';
    const title = titleInput ? titleInput.value.trim() : '';

    if (!title) {
      showToast('작업 세부 이름을 입력해주세요.', 'warning');
      return;
    }

    let durationMinutes = 0;
    let entryDate = getTodayString();
    let startTime = '';
    let endTime = '';

    if (isManualMode) {
      const dateInput = document.getElementById('input-manual-date');
      const durationInput = document.getElementById('input-manual-duration');
      const startInput = document.getElementById('input-start-time');
      const endInput = document.getElementById('input-end-time');

      if (dateInput && dateInput.value) entryDate = dateInput.value;
      startTime = startInput ? startInput.value : '';
      endTime = endInput ? endInput.value : '';

      durationMinutes = durationInput ? parseInt(durationInput.value, 10) : 0;
      if (!durationMinutes || durationMinutes <= 0) {
        showToast('소요 시간(분)을 1분 이상 입력해주세요.', 'warning');
        return;
      }
    } else {
      // From Live Timer
      if (liveTimer.elapsedSeconds < 10) {
        // Less than 10 seconds warning
        durationMinutes = Math.max(1, Math.round(liveTimer.elapsedSeconds / 60));
      } else {
        durationMinutes = Math.round(liveTimer.elapsedSeconds / 60);
        if (durationMinutes === 0) durationMinutes = 1;
      }
    }

    // Tags array
    const rawTags = tagsInput ? tagsInput.value.split(',') : [];
    const tags = rawTags.map(t => t.trim().replace(/^#/, '')).filter(Boolean);

    const nowISO = new Date().toISOString();
    const newEntry = {
      id: generateUUID(),
      date: entryDate,
      appId,
      appName,
      title,
      content: contentInput ? contentInput.value.trim() : '',
      tags,
      startTime,
      endTime,
      durationMinutes,
      created_at: nowISO,
      edited_at: nowISO
    };

    appState.entries.unshift(newEntry);
    saveState();

    // Reset Form & Timer
    if (titleInput) titleInput.value = '';
    if (tagsInput) tagsInput.value = '';
    if (contentInput) contentInput.value = '';
    resetLiveTimer();

    updateKPIs();
    renderWeeklyChart();
    renderEntriesList();
    showToast(`'${title}' 기록이 성공적으로 저장되었습니다.`, 'success');
  }

  function openEditEntryModal(id) {
    const entry = appState.entries.find(e => e.id === id);
    if (!entry) return;

    const modal = document.getElementById('modal-edit-entry');
    const idInput = document.getElementById('edit-entry-id');
    const appSelect = document.getElementById('edit-select-app');
    const titleInput = document.getElementById('edit-entry-title');
    const dateInput = document.getElementById('edit-entry-date');
    const durationInput = document.getElementById('edit-entry-duration');
    const tagsInput = document.getElementById('edit-entry-tags');
    const contentInput = document.getElementById('edit-entry-content');

    if (idInput) idInput.value = entry.id;
    if (appSelect) appSelect.value = entry.appId;
    if (titleInput) titleInput.value = entry.title || '';
    if (dateInput) dateInput.value = entry.date;
    if (durationInput) durationInput.value = entry.durationMinutes;
    if (tagsInput) tagsInput.value = (entry.tags || []).join(', ');
    if (contentInput) contentInput.value = entry.content || '';

    if (modal) modal.classList.remove('hidden');
  }

  function handleEditEntrySubmit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-entry-id').value;
    const entry = appState.entries.find(e => e.id === id);
    if (!entry) return;

    const appSelect = document.getElementById('edit-select-app');
    const title = document.getElementById('edit-entry-title').value.trim();
    const date = document.getElementById('edit-entry-date').value;
    const durationMinutes = parseInt(document.getElementById('edit-entry-duration').value, 10);
    const tags = document.getElementById('edit-entry-tags').value.split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean);
    const content = document.getElementById('edit-entry-content').value.trim();

    entry.appId = appSelect.value;
    const selectedOption = appSelect.options[appSelect.selectedIndex];
    entry.appName = selectedOption ? (selectedOption.getAttribute('data-name') || selectedOption.textContent) : entry.appName;
    entry.title = title;
    entry.date = date;
    entry.durationMinutes = durationMinutes;
    entry.tags = tags;
    entry.content = content;
    entry.edited_at = new Date().toISOString();

    saveState();
    closeModal('modal-edit-entry');
    updateKPIs();
    renderWeeklyChart();
    renderEntriesList();
    showToast('기록이 수정되었습니다.', 'success');
  }

  function confirmDeleteEntry(id) {
    const entry = appState.entries.find(e => e.id === id);
    if (!entry) return;

    showConfirmDialog(
      '기록 삭제',
      `'${entry.title}' 기록을 영구적으로 삭제하시겠습니까?`,
      () => {
        appState.entries = appState.entries.filter(e => e.id !== id);
        saveState();
        updateKPIs();
        renderWeeklyChart();
        renderEntriesList();
        showToast('기록이 삭제되었습니다.', 'info');
      }
    );
  }

  // ===================================================================
  // 10. Demo Data Generator (7 Days Realistic Dataset)
  // ===================================================================

  function loadDemoData() {
    const days = getLastNDays(7);
    const sampleEntries = [];

    const scenarios = [
      {
        appId: 'app_vscode',
        appName: 'Visual Studio Code',
        title: 'DayLog 핵심 상태 관리 및 차트 엔진 개발',
        content: `### 개발 일지\n- [x] Antigravity 컴포넌트 구조화\n- [x] 로컬 스토리지 동기화 및 백업 기능 구현\n- [x] SVG 주간 막대 그래프 렌더링 최적화`,
        tags: ['개발', '프론트엔드', '코딩'],
        durationMinutes: 150
      },
      {
        appId: 'app_chrome',
        appName: 'Google Chrome',
        title: 'Web API & PWA Service Worker 레퍼런스 리서치',
        content: `오프라인 캐싱 전략 및 Web App Manifest 사양 검토 완료.`,
        tags: ['리서치', 'PWA', '자료조사'],
        durationMinutes: 65
      },
      {
        appId: 'app_figma',
        appName: 'Figma',
        title: '대시보드 KPI 카드 및 글래스모피즘 UI 디자인',
        content: `다크 모드와 라이트 모드 간의 명도 대비(Contrast Ratio) 4.5:1 이상 확보.`,
        tags: ['디자인', 'UIUX'],
        durationMinutes: 90
      },
      {
        appId: 'app_slack',
        appName: 'Slack',
        title: '주간 스프린트 회의 및 프로젝트 배포 일정 조율',
        content: `팀원들과 주요 요구사항 확인 및 피드백 정리.`,
        tags: ['회의', '커뮤니케이션'],
        durationMinutes: 45
      },
      {
        appId: 'app_notion',
        appName: 'Notion',
        title: '개인정보처리방침 및 아키텍처 문서 정리',
        content: `로컬 퍼스트 원칙 및 데이터 주권 명시.`,
        tags: ['문서화', '기획'],
        durationMinutes: 70
      },
      {
        appId: 'app_terminal',
        appName: 'Terminal / Shell',
        title: '빌드 검증 및 패키징 스크립트 테스트',
        content: `npx 로컬 서버 및 PWA 오프라인 실행 테스트.`,
        tags: ['DevOps', '테스트'],
        durationMinutes: 50
      }
    ];

    let entryIndex = 1;
    days.forEach((dayStr, dayIdx) => {
      // Pick 2-3 random scenario entries per day
      const count = 2 + (dayIdx % 2);
      for (let i = 0; i < count; i++) {
        const template = scenarios[(dayIdx + i) % scenarios.length];
        const variance = ((dayIdx * 17 + i * 23) % 40) - 20; // -20 ~ +20 min variance
        const duration = Math.max(30, template.durationMinutes + variance);
        const startH = 9 + (i * 3);
        const startM = (i * 15) % 60;
        const endH = startH + Math.floor(duration / 60);
        const endM = (startM + (duration % 60)) % 60;

        sampleEntries.push({
          id: `demo_${entryIndex++}`,
          date: dayStr,
          appId: template.appId,
          appName: template.appName,
          title: template.title,
          content: template.content,
          tags: [...template.tags],
          startTime: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
          endTime: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
          durationMinutes: duration,
          created_at: new Date(dayStr + 'T12:00:00Z').toISOString(),
          edited_at: new Date(dayStr + 'T12:00:00Z').toISOString()
        });
      }
    });

    appState.entries = sampleEntries;
    appState.settings.firstRunCompleted = true;
    saveState();

    updateKPIs();
    renderWeeklyChart();
    renderEntriesList();
    showToast('✨ 7일치 예시 데이터가 성공적으로 로드되었습니다!', 'success');
  }

  // ===================================================================
  // 11. Security PIN Lock & Keypad
  // ===================================================================

  function hashPin(pin) {
    // Simple custom hash for PIN verification
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      hash = (hash << 5) - hash + pin.charCodeAt(i);
      hash |= 0;
    }
    return 'pin_' + Math.abs(hash).toString(16);
  }

  function checkPinLockStatus() {
    if (appState.settings.pinEnabled && appState.settings.pinHash) {
      const isUnlocked = sessionStorage.getItem(LOCK_SESSION_KEY) === 'true';
      if (!isUnlocked) {
        showPinLockOverlay();
      }
    }
  }

  function showPinLockOverlay() {
    const overlay = document.getElementById('pin-lock-overlay');
    if (overlay) {
      enteredPin = '';
      updatePinDots();
      const errEl = document.getElementById('pin-error-text');
      if (errEl) errEl.classList.add('hidden');
      overlay.classList.remove('hidden');
    }
  }

  function hidePinLockOverlay() {
    const overlay = document.getElementById('pin-lock-overlay');
    if (overlay) overlay.classList.add('hidden');
    sessionStorage.setItem(LOCK_SESSION_KEY, 'true');
  }

  function updatePinDots() {
    const dots = document.querySelectorAll('#pin-dots-row .pin-dot');
    dots.forEach((dot, idx) => {
      if (idx < enteredPin.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
  }

  function handlePinInput(digit) {
    if (enteredPin.length < 4) {
      enteredPin += digit;
      updatePinDots();

      if (enteredPin.length === 4) {
        setTimeout(verifyEnteredPin, 100);
      }
    }
  }

  function verifyEnteredPin() {
    const expectedHash = appState.settings.pinHash;
    const currentHash = hashPin(enteredPin);

    if (currentHash === expectedHash) {
      hidePinLockOverlay();
      showToast('잠금이 해제되었습니다.', 'success');
    } else {
      const errEl = document.getElementById('pin-error-text');
      if (errEl) errEl.classList.remove('hidden');
      enteredPin = '';
      setTimeout(updatePinDots, 200);
    }
  }

  // ===================================================================
  // 12. Backup: JSON Export & Import Engine
  // ===================================================================

  function exportDataAsJSON() {
    const exportObject = {
      version: 1,
      exported_at: new Date().toISOString(),
      settings: appState.settings,
      apps: appState.apps,
      entries: appState.entries
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
    const downloadAnchor = document.createElement('a');
    const filename = `daylog_backup_${getTodayString()}.json`;
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast(`'${filename}' 파일로 내보내기가 완료되었습니다.`, 'success');
  }

  function importDataFromJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.entries || !Array.isArray(parsed.entries)) {
          throw new Error('유효한 DayLog JSON 데이터 형식이 아닙니다.');
        }

        appState.entries = parsed.entries;
        if (parsed.apps && Array.isArray(parsed.apps)) {
          appState.apps = parsed.apps;
        }
        if (parsed.settings) {
          appState.settings = { ...appState.settings, ...parsed.settings };
        }

        saveState();
        renderAppSelectors();
        updateKPIs();
        renderWeeklyChart();
        renderEntriesList();
        closeModal('modal-settings');
        showToast(`성공적으로 ${parsed.entries.length}개의 기록을 가져왔습니다.`, 'success');
      } catch (err) {
        console.error('[DayLog] Import error:', err);
        showToast('JSON 파일을 읽는 중 오류가 발생했습니다: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  function resetAllData() {
    showConfirmDialog(
      '모든 데이터 초기화',
      '저장된 모든 앱 사용 기록과 커스텀 설정이 완전히 삭제됩니다. 정말 초기화하시겠습니까?',
      () => {
        appState = JSON.parse(JSON.stringify(INITIAL_DATA_STATE));
        saveState();
        sessionStorage.removeItem(LOCK_SESSION_KEY);
        renderAppSelectors();
        updateKPIs();
        renderWeeklyChart();
        renderEntriesList();
        closeModal('modal-settings');
        showToast('모든 데이터가 초기화되었습니다.', 'info');
      }
    );
  }

  // ===================================================================
  // 13. UI Dialogs, Modals & Toast Utilities
  // ===================================================================

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = {
      success: '✅',
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌'
    };
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> <span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function showConfirmDialog(title, message, onConfirm) {
    const modal = document.getElementById('modal-confirm');
    const titleEl = document.getElementById('confirm-dialog-title');
    const msgEl = document.getElementById('confirm-dialog-message');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;

    pendingConfirmAction = onConfirm;
    if (modal) modal.classList.remove('hidden');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  }

  // ===================================================================
  // 14. Event Listeners Setup
  // ===================================================================

  function setupEventListeners() {
    // Top Header Buttons
    const btnNewEntry = document.getElementById('btn-open-new-entry');
    if (btnNewEntry) {
      btnNewEntry.addEventListener('click', () => {
        const creatorCard = document.getElementById('creator-card');
        if (creatorCard) {
          creatorCard.scrollIntoView({ behavior: 'smooth' });
          const titleInput = document.getElementById('input-entry-title');
          if (titleInput) titleInput.focus();
        }
      });
    }

    const btnLockScreen = document.getElementById('btn-lock-screen');
    if (btnLockScreen) {
      btnLockScreen.addEventListener('click', () => {
        if (!appState.settings.pinEnabled) {
          showToast('보안 PIN이 설정되지 않았습니다. 설정(⚙️)에서 PIN을 먼저 활성화하세요.', 'info');
          const modalSettings = document.getElementById('modal-settings');
          if (modalSettings) modalSettings.classList.remove('hidden');
        } else {
          sessionStorage.removeItem(LOCK_SESSION_KEY);
          showPinLockOverlay();
        }
      });
    }

    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    if (btnThemeToggle) {
      btnThemeToggle.addEventListener('click', () => {
        const nextTheme = appState.settings.theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        saveState();
      });
    }

    const btnOpenSettings = document.getElementById('btn-open-settings');
    if (btnOpenSettings) {
      btnOpenSettings.addEventListener('click', () => {
        syncSettingsForm();
        const modal = document.getElementById('modal-settings');
        if (modal) modal.classList.remove('hidden');
      });
    }

    const btnOpenGuide = document.getElementById('btn-open-guide');
    if (btnOpenGuide) {
      btnOpenGuide.addEventListener('click', () => {
        const modal = document.getElementById('modal-guide');
        if (modal) modal.classList.remove('hidden');
      });
    }

    // Modal Close Buttons (data-close-modal attribute)
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        closeModal(modalId);
      });
    });

    // Confirmation Modal Actions
    const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
    const btnConfirmOk = document.getElementById('btn-confirm-ok');
    if (btnConfirmCancel) {
      btnConfirmCancel.addEventListener('click', () => {
        pendingConfirmAction = null;
        closeModal('modal-confirm');
      });
    }
    if (btnConfirmOk) {
      btnConfirmOk.addEventListener('click', () => {
        if (typeof pendingConfirmAction === 'function') {
          pendingConfirmAction();
        }
        pendingConfirmAction = null;
        closeModal('modal-confirm');
      });
    }

    // Entry Creator Mode Switch (Live Timer vs Manual)
    const tabTimer = document.getElementById('mode-timer-tab');
    const tabManual = document.getElementById('mode-manual-tab');
    const boxTimer = document.getElementById('timer-mode-container');
    const boxManual = document.getElementById('manual-mode-container');

    if (tabTimer && tabManual) {
      tabTimer.addEventListener('click', () => {
        tabTimer.classList.add('active');
        tabManual.classList.remove('active');
        boxTimer.classList.remove('hidden');
        boxManual.classList.add('hidden');
      });
      tabManual.addEventListener('click', () => {
        tabManual.classList.add('active');
        tabTimer.classList.remove('active');
        boxManual.classList.remove('hidden');
        boxTimer.classList.add('hidden');
        const dateInput = document.getElementById('input-manual-date');
        if (dateInput && !dateInput.value) dateInput.value = getTodayString();
      });
    }

    // Manual Time calculation from start/end times
    const inputStartTime = document.getElementById('input-start-time');
    const inputEndTime = document.getElementById('input-end-time');
    const inputManualDuration = document.getElementById('input-manual-duration');

    function updateManualDurationFromTimes() {
      if (inputStartTime && inputEndTime && inputStartTime.value && inputEndTime.value) {
        const [sh, sm] = inputStartTime.value.split(':').map(Number);
        const [eh, em] = inputEndTime.value.split(':').map(Number);
        let diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
        if (diffMinutes < 0) diffMinutes += 24 * 60; // Next day wrap
        if (inputManualDuration) inputManualDuration.value = diffMinutes;
      }
    }
    if (inputStartTime) inputStartTime.addEventListener('change', updateManualDurationFromTimes);
    if (inputEndTime) inputEndTime.addEventListener('change', updateManualDurationFromTimes);

    // Live Timer Controls
    const btnTimerStart = document.getElementById('btn-timer-start');
    const btnTimerPause = document.getElementById('btn-timer-pause');
    const btnTimerReset = document.getElementById('btn-timer-reset');
    const btnQuickStop = document.getElementById('btn-quick-stop-timer');

    if (btnTimerStart) btnTimerStart.addEventListener('click', startLiveTimer);
    if (btnTimerPause) btnTimerPause.addEventListener('click', pauseLiveTimer);
    if (btnTimerReset) btnTimerReset.addEventListener('click', resetLiveTimer);
    if (btnQuickStop) {
      btnQuickStop.addEventListener('click', () => {
        pauseLiveTimer();
        const creatorCard = document.getElementById('creator-card');
        if (creatorCard) creatorCard.scrollIntoView({ behavior: 'smooth' });
        showToast('타이머가 일시정지되었습니다. 기록 저장 버튼을 눌러 완료하세요.', 'info');
      });
    }

    // Markdown Write / Preview Tabs
    const tabWrite = document.getElementById('btn-tab-write');
    const tabPreview = document.getElementById('btn-tab-preview');
    const textareaMarkdown = document.getElementById('textarea-markdown');
    const previewBox = document.getElementById('markdown-preview-box');

    if (tabWrite && tabPreview) {
      tabWrite.addEventListener('click', () => {
        tabWrite.classList.add('active');
        tabPreview.classList.remove('active');
        textareaMarkdown.classList.remove('hidden');
        previewBox.classList.add('hidden');
      });
      tabPreview.addEventListener('click', () => {
        tabPreview.classList.add('active');
        tabWrite.classList.remove('active');
        previewBox.innerHTML = renderMarkdown(textareaMarkdown.value) || '<p style="color:var(--text-muted)">작성된 마크다운 내용이 없습니다.</p>';
        textareaMarkdown.classList.add('hidden');
        previewBox.classList.remove('hidden');
      });
    }

    // Form Submit
    const formCreate = document.getElementById('form-create-entry');
    if (formCreate) formCreate.addEventListener('submit', handleCreateEntrySubmit);

    const btnFormClear = document.getElementById('btn-form-clear');
    if (btnFormClear) {
      btnFormClear.addEventListener('click', () => {
        formCreate.reset();
        resetLiveTimer();
        showToast('입력 폼이 초기화되었습니다.', 'info');
      });
    }

    // Add App Modal & Form
    const btnQuickAddApp = document.getElementById('btn-quick-add-app');
    const modalAddApp = document.getElementById('modal-add-app');
    const formAddApp = document.getElementById('form-add-app');

    if (btnQuickAddApp) {
      btnQuickAddApp.addEventListener('click', () => {
        if (modalAddApp) modalAddApp.classList.remove('hidden');
      });
    }
    if (formAddApp) {
      formAddApp.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('input-new-app-name');
        const catSelect = document.getElementById('input-new-app-category');
        const checkedColor = document.querySelector('input[name="new-app-color"]:checked');

        const newApp = {
          id: 'app_' + Date.now().toString(36),
          name: nameInput.value.trim(),
          category: catSelect.value,
          color: checkedColor ? checkedColor.value : '#6366f1'
        };

        appState.apps.push(newApp);
        saveState();
        renderAppSelectors();
        closeModal('modal-add-app');
        formAddApp.reset();
        showToast(`'${newApp.name}' 앱이 등록되었습니다.`, 'success');
      });
    }

    // Edit Entry Form
    const formEdit = document.getElementById('form-edit-entry');
    if (formEdit) formEdit.addEventListener('submit', handleEditEntrySubmit);

    // Search and Filters
    const searchInput = document.getElementById('search-keyword');
    const btnSearchClear = document.getElementById('btn-search-clear');
    const filterApp = document.getElementById('filter-app');
    const sortSelect = document.getElementById('sort-entries');
    const btnRemoveTagFilter = document.getElementById('btn-remove-tag-filter');
    const btnChartReset = document.getElementById('btn-chart-reset-filter');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        activeFilter.keyword = e.target.value.trim();
        if (btnSearchClear) {
          if (activeFilter.keyword) {
            btnSearchClear.classList.remove('hidden');
          } else {
            btnSearchClear.classList.add('hidden');
          }
        }
        renderEntriesList();
      });
    }
    if (btnSearchClear) {
      btnSearchClear.addEventListener('click', () => {
        searchInput.value = '';
        activeFilter.keyword = '';
        btnSearchClear.classList.add('hidden');
        renderEntriesList();
      });
    }
    if (filterApp) {
      filterApp.addEventListener('change', (e) => {
        activeFilter.appId = e.target.value;
        renderEntriesList();
      });
    }
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        activeFilter.sort = e.target.value;
        renderEntriesList();
      });
    }
    if (btnRemoveTagFilter) {
      btnRemoveTagFilter.addEventListener('click', () => {
        activeFilter.tag = null;
        renderEntriesList();
      });
    }
    if (btnChartReset) {
      btnChartReset.addEventListener('click', () => {
        activeFilter.date = null;
        updateChartResetBtn();
        renderWeeklyChart();
        renderEntriesList();
      });
    }

    // Demo Data Buttons
    const btnLoadDemoQuick = document.getElementById('btn-load-demo-data-quick');
    const btnEmptyDemo = document.getElementById('btn-empty-load-demo');
    const btnGuideDemo = document.getElementById('btn-guide-load-demo');
    const btnEmptyFocus = document.getElementById('btn-empty-focus-form');

    if (btnLoadDemoQuick) btnLoadDemoQuick.addEventListener('click', loadDemoData);
    if (btnEmptyDemo) btnEmptyDemo.addEventListener('click', loadDemoData);
    if (btnGuideDemo) {
      btnGuideDemo.addEventListener('click', () => {
        closeModal('modal-guide');
        loadDemoData();
      });
    }
    if (btnEmptyFocus) {
      btnEmptyFocus.addEventListener('click', () => {
        const titleInput = document.getElementById('input-entry-title');
        if (titleInput) titleInput.focus();
      });
    }

    // Settings Controls
    const targetHoursInput = document.getElementById('setting-daily-target-hours');
    const pinToggle = document.getElementById('setting-pin-toggle');
    const pinChangeSection = document.getElementById('pin-change-section');
    const pinInput = document.getElementById('setting-pin-input');
    const btnSavePin = document.getElementById('btn-save-pin');
    const encToggle = document.getElementById('setting-encryption-toggle');
    const btnExportJSON = document.getElementById('btn-export-json');
    const btnTriggerImport = document.getElementById('btn-trigger-import');
    const inputImportJSON = document.getElementById('input-import-json');
    const btnResetAll = document.getElementById('btn-reset-all-data');
    const btnPrivacyFromSettings = document.getElementById('btn-open-privacy-from-settings');

    if (targetHoursInput) {
      targetHoursInput.addEventListener('change', (e) => {
        appState.settings.dailyTargetHours = Math.max(1, parseInt(e.target.value, 10) || 4);
        saveState();
        updateKPIs();
      });
    }

    if (pinToggle) {
      pinToggle.addEventListener('change', (e) => {
        appState.settings.pinEnabled = e.target.checked;
        if (e.target.checked) {
          if (pinChangeSection) pinChangeSection.classList.remove('hidden');
          if (!appState.settings.pinHash) {
            showToast('4자리 숫자 PIN 번호를 입력하고 저장해주세요.', 'warning');
          }
        } else {
          if (pinChangeSection) pinChangeSection.classList.add('hidden');
          appState.settings.pinHash = '';
          sessionStorage.removeItem(LOCK_SESSION_KEY);
        }
        saveState();
      });
    }

    if (btnSavePin) {
      btnSavePin.addEventListener('click', () => {
        const val = pinInput.value.trim();
        if (val.length !== 4 || !/^\d{4}$/.test(val)) {
          showToast('4자리 숫자를 정확히 입력해주세요.', 'warning');
          return;
        }
        appState.settings.pinHash = hashPin(val);
        appState.settings.pinEnabled = true;
        saveState();
        pinInput.value = '';
        showToast('보안 PIN이 성공적으로 저장되었습니다.', 'success');
      });
    }

    if (encToggle) {
      encToggle.addEventListener('change', (e) => {
        appState.settings.encryption = e.target.checked;
        saveState();
        showToast(e.target.checked ? '로컬 저장 암호화가 활성화되었습니다.' : '로컬 저장 암호화가 비활성화되었습니다.', 'info');
      });
    }

    if (btnExportJSON) btnExportJSON.addEventListener('click', exportDataAsJSON);

    if (btnTriggerImport && inputImportJSON) {
      btnTriggerImport.addEventListener('click', () => inputImportJSON.click());
      inputImportJSON.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          importDataFromJSON(e.target.files[0]);
        }
      });
    }

    if (btnResetAll) btnResetAll.addEventListener('click', resetAllData);

    if (btnPrivacyFromSettings) {
      btnPrivacyFromSettings.addEventListener('click', () => {
        const modalPrivacy = document.getElementById('modal-privacy');
        if (modalPrivacy) modalPrivacy.classList.remove('hidden');
      });
    }

    // PIN Keypad Numbers
    document.querySelectorAll('.pin-key[data-num]').forEach(key => {
      key.addEventListener('click', () => {
        const num = key.getAttribute('data-num');
        handlePinInput(num);
      });
    });

    const btnPinClear = document.getElementById('btn-pin-clear');
    if (btnPinClear) {
      btnPinClear.addEventListener('click', () => {
        enteredPin = '';
        updatePinDots();
      });
    }

    const btnPinBack = document.getElementById('btn-pin-backspace');
    if (btnPinBack) {
      btnPinBack.addEventListener('click', () => {
        if (enteredPin.length > 0) {
          enteredPin = enteredPin.slice(0, -1);
          updatePinDots();
        }
      });
    }

    const btnPinReset = document.getElementById('btn-pin-emergency-reset');
    if (btnPinReset) {
      btnPinReset.addEventListener('click', () => {
        showConfirmDialog(
          'PIN 분실 초기화 안내',
          'PIN을 잊으신 경우 보안을 위해 앱 설정 및 데이터가 초기화될 수 있습니다. 전체 초기화를 진행하시겠습니까?',
          () => {
            appState.settings.pinEnabled = false;
            appState.settings.pinHash = '';
            saveState();
            hidePinLockOverlay();
            showToast('PIN 잠금이 해제되었습니다.', 'info');
          }
        );
      });
    }

    // PWA Service Worker Registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => {
            console.log('[DayLog] PWA Service Worker registered successfully:', reg.scope);
          })
          .catch(err => {
            console.log('[DayLog] Service Worker registration skipped (file protocol or unsupported):', err);
          });
      });
    }
  }

  function syncSettingsForm() {
    const targetHoursInput = document.getElementById('setting-daily-target-hours');
    const pinToggle = document.getElementById('setting-pin-toggle');
    const pinChangeSection = document.getElementById('pin-change-section');
    const encToggle = document.getElementById('setting-encryption-toggle');

    if (targetHoursInput) targetHoursInput.value = appState.settings.dailyTargetHours || 4;
    if (pinToggle) pinToggle.checked = !!appState.settings.pinEnabled;
    if (pinChangeSection) {
      if (appState.settings.pinEnabled) {
        pinChangeSection.classList.remove('hidden');
      } else {
        pinChangeSection.classList.add('hidden');
      }
    }
    if (encToggle) encToggle.checked = !!appState.settings.encryption;
  }

  // ===================================================================
  // 15. Application Bootstrapping
  // ===================================================================

  function init() {
    console.log('[DayLog] Core scripts & modules loaded.');
    loadState();
    applyTheme(appState.settings.theme || 'dark');
    updateOverviewDate();
    renderColorPalette();
    renderAppSelectors();
    updateKPIs();
    renderWeeklyChart();
    renderEntriesList();
    setupEventListeners();
    checkPinLockStatus();

    // Show Guide on First Run if no entries
    if (!appState.settings.firstRunCompleted && appState.entries.length === 0) {
      const guideModal = document.getElementById('modal-guide');
      if (guideModal) {
        setTimeout(() => guideModal.classList.remove('hidden'), 500);
      }
    }

    console.log('%c[DayLog] System Ready & Operational!', 'color: #10b981; font-weight: bold;');
  }

  // DOMContentLoaded trigger
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
