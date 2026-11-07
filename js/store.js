'use strict';
/* שמירת נתונים מקומית בטלפון (localStorage) */
const Store = (() => {
  const KEY = 'retzef_v1';

  const DEFAULT_EXERCISES = [
    ['לחיצת חזה במוט', 'חזה'], ['לחיצת חזה בדאמבלים', 'חזה'], ['לחיצת חזה בשיפוע עליון', 'חזה'],
    ['פרפר במכונה', 'חזה'], ['שכיבות סמיכה', 'חזה'], ['מקבילים', 'חזה'],
    ['מתח', 'גב'], ['פולי עליון', 'גב'], ['חתירה במוט', 'גב'], ['חתירה בדאמבל', 'גב'],
    ['חתירה בפולי תחתון', 'גב'], ['דדליפט', 'גב'],
    ['סקוואט', 'רגליים'], ['לחיצת רגליים', 'רגליים'], ['לאנג׳ים', 'רגליים'], ['דדליפט רומני', 'רגליים'],
    ['פשיטת ברכיים', 'רגליים'], ['כפיפת ברכיים', 'רגליים'], ['הרמות עקבים', 'רגליים'], ['היפ ת׳ראסט', 'רגליים'],
    ['לחיצת כתפיים', 'כתפיים'], ['לחיצת כתפיים בדאמבלים', 'כתפיים'], ['הרחקה צידית', 'כתפיים'],
    ['פייס פול', 'כתפיים'], ['פרפר אחורי', 'כתפיים'],
    ['כפיפת מרפקים במוט', 'ידיים'], ['כפיפת מרפקים בדאמבלים', 'ידיים'], ['פטישים', 'ידיים'],
    ['פשיטת מרפקים בפולי', 'ידיים'], ['פשיטת מרפקים מעל הראש', 'ידיים'],
    ['פלאנק', 'בטן'], ['כפיפות בטן', 'בטן'], ['הרמות רגליים בתלייה', 'בטן'],
  ];

  const freshSettings = () => ({ rest: 90, weekStart: 0, sound: true });
  const fresh = () => ({
    version: 1,
    goals: [],
    logs: {},
    exercises: DEFAULT_EXERCISES.map(([name, muscle], i) => ({ id: 'ex' + i, name, muscle })),
    routines: [],
    sessions: [],
    active: null,
    settings: freshSettings(),
  });

  let data = null;
  let timer = null;

  function normalize(d) {
    const f = fresh();
    for (const k of Object.keys(f)) if (d[k] === undefined) d[k] = f[k];
    d.settings = { ...freshSettings(), ...(d.settings || {}) };
    return d;
  }

  function load() {
    try { data = JSON.parse(localStorage.getItem(KEY)); } catch (e) { data = null; }
    if (!data || typeof data !== 'object') data = fresh();
    normalize(data);
    save();
    try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
  }

  function save() {
    clearTimeout(timer);
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { if (window.App) App.toast('שגיאה בשמירת הנתונים'); }
  }
  function saveSoon() { clearTimeout(timer); timer = setTimeout(save, 400); }

  function replace(newData) {
    if (!newData || !Array.isArray(newData.goals) || !Array.isArray(newData.sessions)) throw new Error('bad');
    data = normalize(newData);
    save();
  }
  function reset() { data = fresh(); save(); }

  return {
    load, save, saveSoon, replace, reset,
    get d() { return data; },
  };
})();
