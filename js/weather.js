/* ----- Météo (Open-Meteo, facultative) ----- */
const WMO = c => c === 0 ? ['☀️', 'Dégagé'] : c <= 2 ? ['🌤', 'Éclaircies'] : c === 3 ? ['☁️', 'Couvert'] : c <= 48 ? ['🌫', 'Brouillard'] : c <= 57 ? ['🌦', 'Bruine'] : c <= 67 ? ['🌧', 'Pluie'] : c <= 77 ? ['❄️', 'Neige'] : c <= 82 ? ['🌧', 'Averses'] : c <= 86 ? ['🌨', 'Neige'] : ['⛈', 'Orage'];
function paintWeather(c) {
  const el = $('#weather'); if (!el || !c) return;
  const [ic, lb] = WMO(c.cur.weather_code), d = c.day;
  el.innerHTML = `<div class="wi">${ic}</div><div><b>${Math.round(c.cur.temperature_2m)}°</b> ${lb}<br><small>${Math.round(d.temperature_2m_min[0])}° / ${Math.round(d.temperature_2m_max[0])}°${d.precipitation_probability_max[0] != null ? ' · 💧' + d.precipitation_probability_max[0] + ' %' : ''}</small></div>`;
}
async function loadWeather() {
  if (!S.settings.weather || !$('#weather')) return;
  let c = null; try { c = JSON.parse(localStorage.getItem('weather-cache') || 'null'); } catch (e) { }
  if (c) paintWeather(c);
  if (c && Date.now() - c.t < 3600e3) return;
  if (!navigator.onLine) return;
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${S.settings.lat}&longitude=${S.settings.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1`;
    const j = await (await fetch(u)).json();
    c = { t: Date.now(), cur: j.current, day: j.daily }; localStorage.setItem('weather-cache', JSON.stringify(c)); paintWeather(c);
  } catch (e) { /* pas de météo si indisponible */ }
}

