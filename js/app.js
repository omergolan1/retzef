'use strict';
/* חלונות תחתונים (bottom sheets) */
const Sheet = (() => {
  const stack = [];
  const root = () => document.getElementById('sheets');
  function open(render, opts = {}) {
    const bd = document.createElement('div');
    bd.className = 'sheet-bd';
    const sh = document.createElement('div');
    sh.className = 'sheet' + (opts.tall ? ' tall' : '');
    sh.setAttribute('role', 'dialog');
    sh.innerHTML = `<div class="grab"><i></i></div><div class="sheet-in"></div>`;
    bd.appendChild(sh);
    root().appendChild(bd);
    const inner = sh.querySelector('.sheet-in');
    const entry = {
      bd, sh, inner, render, opts,
      refresh() { const st = inner.scrollTop; inner.innerHTML = render(); inner.scrollTop = st; opts.onMount && opts.onMount(inner, entry); },
    };
    entry.refresh();
    bd.addEventListener('click', e => { if (e.target === bd) close(entry); });
    // גרירה למטה לסגירה
    let y0 = null, dy = 0;
    sh.addEventListener('touchstart', e => { if (inner.scrollTop <= 0 || e.target.closest('.grab')) { y0 = e.touches[0].clientY; dy = 0; } else y0 = null; }, { passive: true });
    sh.addEventListener('touchmove', e => {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (dy > 0) { sh.style.transition = 'none'; sh.style.transform = `translateY(${dy}px)`; }
    }, { passive: true });
    sh.addEventListener('touchend', () => {
      if (y0 == null) return;
      sh.style.transition = ''; sh.style.transform = '';
      if (dy > 110) close(entry);
      y0 = null;
    });
    requestAnimationFrame(() => requestAnimationFrame(() => bd.classList.add('show')));
    stack.push(entry);
    document.body.classList.add('noscroll');
    return entry;
  }
  function close(entry = stack[stack.length - 1]) {
    if (!entry) return;
    const i = stack.indexOf(entry);
    if (i < 0) return;
    stack.splice(i, 1);
    entry.bd.classList.remove('show');
    setTimeout(() => entry.bd.remove(), 300);
    entry.opts.onClose && entry.opts.onClose();
    if (!stack.length && !Gym.overlayOpen()) document.body.classList.remove('noscroll');
  }
  const top = () => stack[stack.length - 1];
  const refreshAll = () => stack.forEach(e => { if (!e.opts.static) e.refresh(); });
  const closeAll = () => [...stack].reverse().forEach(e => close(e));
  return { open, close, top, refreshAll, closeAll, get count() { return stack.length; } };
})();

/* האפליקציה */
const App = (() => {
  const ICON = {
    plus: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    gear: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    chevL: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chevR: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    down: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    up: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    dots: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  };

  const state = {
    tab: 'today',
    date: U.today(),
    calMonth: U.monthStart(U.today()),
    calFilter: 'all',
    gymSeg: 'plans',
    progEx: null,
    progMetric: 'max',
  };
  try { const t = localStorage.getItem('retzef_tab'); if (['today', 'cal', 'gym'].includes(t)) state.tab = t; } catch (e) {}

  const actions = {};
  const on = (name, fn) => { actions[name] = fn; };

  function render() {
    const main = document.getElementById('main');
    main.innerHTML = state.tab === 'gym' ? Gym.render() : state.tab === 'cal' ? Habits.renderCalendar() : Habits.renderToday();
    document.querySelectorAll('#tabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === state.tab));
    renderMini();
  }
  function renderMini() {
    const a = Store.d.active, el = document.getElementById('mini');
    if (a && !Gym.overlayOpen()) {
      el.innerHTML = `<button class="mini-bar" data-act="wk-open"><span class="pulse"></span><b>${U.esc(a.name)}</b><span data-live="elapsed">${U.fmtTimer((Date.now() - a.start) / 1000)}</span><span class="mini-go">חזור לאימון</span></button>`;
      el.hidden = false;
    } else { el.innerHTML = ''; el.hidden = true; }
  }
  function refresh() {
    render();
    Sheet.refreshAll();
    if (Gym.overlayOpen()) Gym.renderWorkout();
  }

  let toastT;
  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('show'), 2200);
  }
  function haptic(ms = 12) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }

  function confirm(msg, ok = 'אישור', danger = false) {
    return new Promise(res => {
      let done = false;
      const e = Sheet.open(() => `<div class="confirm"><p>${U.esc(msg)}</p>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} wide" data-act="cf-ok">${U.esc(ok)}</button>
        <button class="btn btn-ghost wide" data-act="cf-no">ביטול</button></div>`,
      { static: true, onClose: () => { if (!done) { done = true; res(false); } } });
      e.resolve = v => { done = true; res(v); Sheet.close(e); };
    });
  }
  function menu(title, items, dangerIndex = -1) {
    return new Promise(res => {
      let done = false;
      const e = Sheet.open(() => `<div class="confirm"><h3>${U.esc(title)}</h3>
        <div class="menu-list">${items.map((t, i) => `<button class="menu-item ${i === dangerIndex ? 'danger-text' : ''}" data-act="menu-pick" data-i="${i}">${U.esc(t)}</button>`).join('')}</div>
        <button class="btn btn-ghost wide" data-act="cf-no">ביטול</button></div>`,
      { static: true, onClose: () => { if (!done) { done = true; res(-1); } } });
      e.resolve = v => { done = true; res(v); Sheet.close(e); };
    });
  }

  /* הגדרות וגיבוי */
  function openSettings() {
    Sheet.open(() => {
      const st = Store.d.settings;
      const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
      return `<div class="sheet-head"><h2>הגדרות</h2><button class="icon-btn" data-act="sheet-close" aria-label="סגור">${ICON.x}</button></div>
        <div class="card list-card settings">
          <div class="set-row"><span>זמן מנוחה בין סטים</span><div class="stepper" dir="ltr">
            <button data-act="set-rest" data-d="-15" ${st.rest <= 15 ? 'disabled' : ''}>−</button><b>${U.fmtTimer(st.rest)}</b>
            <button data-act="set-rest" data-d="15" ${st.rest >= 600 ? 'disabled' : ''}>+</button></div></div>
          <div class="set-row"><span>צליל בסוף מנוחה</span><button class="toggle ${st.sound ? 'on' : ''}" data-act="set-sound" aria-label="צליל"><i></i></button></div>
          <div class="set-row"><span>השבוע מתחיל ביום</span><div class="seg tiny">
            <button class="${st.weekStart === 0 ? 'on' : ''}" data-act="set-ws" data-v="0">ראשון</button>
            <button class="${st.weekStart === 1 ? 'on' : ''}" data-act="set-ws" data-v="1">שני</button></div></div>
        </div>
        <h3 class="section-title">גיבוי</h3>
        <p class="muted small">הנתונים נשמרים רק בטלפון הזה. מומלץ לייצא גיבוי מדי פעם (למשל לקבצים או לאימייל).</p>
        <div class="card list-card">
          <button class="menu-item" data-act="backup-export">📤 ייצוא גיבוי</button>
          <label class="menu-item file-label">📥 שחזור מגיבוי<input type="file" accept="application/json,.json" id="import-file" hidden></label>
        </div>
        ${standalone ? '' : `<h3 class="section-title">התקנה באייפון</h3>
        <div class="card install"><ol>
          <li>פתח את הקישור ב-<b>Safari</b></li>
          <li>לחץ על כפתור השיתוף <span class="share-ic">⬆︎</span></li>
          <li>בחר <b>"הוסף למסך הבית"</b></li>
        </ol><p class="muted small">האפליקציה תיפתח במסך מלא ותעבוד גם בלי אינטרנט.</p></div>`}
        <button class="btn btn-ghost danger-text wide" data-act="reset-all">מחיקת כל הנתונים</button>
        <p class="muted small center">רצף · גרסה 1.0</p>`;
    }, {
      onMount(el) {
        const f = el.querySelector('#import-file');
        f && f.addEventListener('change', importFile);
      },
    });
  }
  async function exportBackup() {
    const json = JSON.stringify(Store.d, null, 1);
    const name = `retzef-backup-${U.dkey()}.json`;
    try {
      const file = new File([json], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'גיבוי רצף' }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }
  async function importFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.goals) || !Array.isArray(data.sessions)) throw new Error();
      const ok = await confirm(`לשחזר גיבוי עם ${data.goals.length} יעדים ו-${data.sessions.length} אימונים? הנתונים הנוכחיים יוחלפו.`, 'שחזר');
      if (!ok) return;
      Store.replace(data);
      Sheet.closeAll();
      refresh();
      toast('הגיבוי שוחזר');
    } catch (err) { toast('הקובץ לא תקין'); }
    e.target.value = '';
  }

  function registerActions() {
    on('tab', el => {
      state.tab = el.dataset.tab;
      try { localStorage.setItem('retzef_tab', state.tab); } catch (e) {}
      if (state.tab === 'today') state.date = U.today();
      render(); window.scrollTo(0, 0);
    });
    on('sheet-close', () => Sheet.close());
    on('cf-ok', () => Sheet.top().resolve(true));
    on('cf-no', () => Sheet.top().resolve ? Sheet.top().resolve(false) : Sheet.close());
    on('menu-pick', el => Sheet.top().resolve(+el.dataset.i));
    on('settings', openSettings);
    on('set-rest', el => { const s = Store.d.settings; s.rest = Math.max(15, Math.min(600, s.rest + (+el.dataset.d))); Store.save(); Sheet.top().refresh(); });
    on('set-sound', () => { Store.d.settings.sound = !Store.d.settings.sound; Store.save(); Sheet.top().refresh(); });
    on('set-ws', el => { Store.d.settings.weekStart = +el.dataset.v; Store.save(); refresh(); });
    on('backup-export', exportBackup);
    on('reset-all', async () => {
      const ok = await confirm('למחוק את כל היעדים, האימונים וההיסטוריה? אי אפשר לבטל את זה.', 'מחק הכל', true);
      if (!ok) return;
      Store.reset(); Sheet.closeAll(); refresh(); toast('כל הנתונים נמחקו');
    });
    Habits.registerActions(on);
    Gym.registerActions(on);
  }

  function bindEvents() {
    let lpTimer = null, lpFired = false, lpStart = null;
    document.addEventListener('pointerdown', e => {
      const el = e.target.closest('[data-long]');
      lpFired = false;
      if (!el) return;
      lpStart = { x: e.clientX, y: e.clientY };
      clearTimeout(lpTimer);
      lpTimer = setTimeout(() => { lpFired = true; actions[el.dataset.long] && actions[el.dataset.long](el, e); }, 480);
    });
    const cancelLp = () => clearTimeout(lpTimer);
    document.addEventListener('pointerup', cancelLp);
    document.addEventListener('pointercancel', cancelLp);
    document.addEventListener('pointermove', e => { if (lpStart && Math.hypot(e.clientX - lpStart.x, e.clientY - lpStart.y) > 10) cancelLp(); });
    document.addEventListener('scroll', cancelLp, true);
    document.addEventListener('contextmenu', e => { if (e.target.closest('[data-long]')) e.preventDefault(); });

    document.addEventListener('click', e => {
      if (lpFired) { lpFired = false; e.preventDefault(); e.stopPropagation(); return; }
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled) return;
      const fn = actions[el.dataset.act];
      if (fn) { e.preventDefault(); fn(el, e); }
    }, true);
    document.addEventListener('change', e => {
      const el = e.target.closest('[data-change]');
      if (el) Gym.onChange(el.dataset.change, el);
    });

    // מעבר יום כשהאפליקציה חוזרת מהרקע
    let lastDay = U.dkey();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      const now = U.dkey();
      if (now !== lastDay) {
        if (U.dkey(state.date) === lastDay) state.date = U.today();
        lastDay = now;
        refresh();
      }
    });
  }

  function init() {
    Store.load();
    registerActions();
    bindEvents();
    Gym.init();
    render();
    if (Store.d.active) renderMini();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  return { ICON, state, render, renderMini, refresh, toast, haptic, confirm, menu, init };
})();

document.addEventListener('DOMContentLoaded', App.init);
