(function () {
  "use strict";

  var TZ = "Asia/Tehran";
  var REFRESH_MS = 10 * 60 * 1000;

  var CITIES = {
    ahvaz: { name: "اهواز", sub: "مرکز استان خوزستان", lat: 31.3183, lon: 48.6706 },
    izeh:  { name: "ایذه", sub: "شهرستان ایذه، خوزستان", lat: 31.8364, lon: 49.8670 }
  };

  /* ---------- ابزارهای کمکی ---------- */
  var faNum = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
  var faNum1 = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });

  function n(v) { return faNum.format(Math.round(v)); }
  function toFaDigits(str) {
    return String(str).replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[d]; });
  }

  var WMO = {
    0:  ["آسمان صاف", "☀️", "🌙"],
    1:  ["عمدتاً صاف", "🌤️", "🌙"],
    2:  ["نیمه‌ابری", "⛅", "☁️"],
    3:  ["ابری", "☁️", "☁️"],
    45: ["مه", "🌫️", "🌫️"],
    48: ["مه یخ‌زده", "🌫️", "🌫️"],
    51: ["نم‌نم باران ملایم", "🌦️", "🌧️"],
    53: ["نم‌نم باران", "🌦️", "🌧️"],
    55: ["نم‌نم باران شدید", "🌧️", "🌧️"],
    56: ["نم‌نم یخ‌زده", "🌧️", "🌧️"],
    57: ["نم‌نم یخ‌زده شدید", "🌧️", "🌧️"],
    61: ["باران ملایم", "🌦️", "🌧️"],
    63: ["باران", "🌧️", "🌧️"],
    65: ["باران شدید", "🌧️", "🌧️"],
    66: ["باران یخ‌زده", "🌧️", "🌧️"],
    67: ["باران یخ‌زده شدید", "🌧️", "🌧️"],
    71: ["برف ملایم", "🌨️", "🌨️"],
    73: ["برف", "🌨️", "🌨️"],
    75: ["برف سنگین", "❄️", "❄️"],
    77: ["دانه‌های برف", "🌨️", "🌨️"],
    80: ["رگبار ملایم", "🌦️", "🌧️"],
    81: ["رگبار", "🌧️", "🌧️"],
    82: ["رگبار شدید", "⛈️", "⛈️"],
    85: ["رگبار برف", "🌨️", "🌨️"],
    86: ["رگبار برف شدید", "🌨️", "🌨️"],
    95: ["رعد و برق", "⛈️", "⛈️"],
    96: ["رعد و برق با تگرگ", "⛈️", "⛈️"],
    99: ["رعد و برق با تگرگ شدید", "⛈️", "⛈️"]
  };

  function wmo(code, isDay) {
    var w = WMO[code] || ["نامشخص", "🌡️", "🌡️"];
    return { text: w[0], icon: isDay === 0 ? w[2] : w[1] };
  }

  function windDir(deg) {
    var names = ["شمالی", "شمال‌شرقی", "شرقی", "جنوب‌شرقی", "جنوبی", "جنوب‌غربی", "غربی", "شمال‌غربی"];
    return names[Math.round(deg / 45) % 8];
  }

  function hhmm(iso) {
    // "2026-11-02T06:38" → «۰۶:۳۸»
    return toFaDigits(String(iso).split("T")[1].slice(0, 5));
  }

  /* ---------- ساعت و تاریخ ---------- */
  var ticks = document.getElementById("ticks");
  (function buildTicks() {
    var html = "";
    for (var i = 0; i < 60; i++) {
      var big = i % 5 === 0;
      var a = (i * 6 - 90) * Math.PI / 180;
      var r1 = big ? 80 : 86, r2 = 91;
      html += '<line class="tick' + (big ? " big" : "") + '" x1="' + (100 + r1 * Math.cos(a)).toFixed(2) +
        '" y1="' + (100 + r1 * Math.sin(a)).toFixed(2) + '" x2="' + (100 + r2 * Math.cos(a)).toFixed(2) +
        '" y2="' + (100 + r2 * Math.sin(a)).toFixed(2) + '"/>';
    }
    ticks.innerHTML = html;
  })();

  var partsFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  });
  var faDateFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: TZ, weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
  var enDateFmt = new Intl.DateTimeFormat("fa-IR-u-ca-gregory", {
    timeZone: TZ, year: "numeric", month: "long", day: "numeric"
  });
  var timeEl = document.getElementById("time");
  var hH = document.getElementById("hand-h");
  var hM = document.getElementById("hand-m");
  var hS = document.getElementById("hand-s");
  var dateFa = document.getElementById("date-fa");
  var dateEn = document.getElementById("date-en");
  var lastDay = "";

  function tick() {
    var now = new Date();
    var h = 0, m = 0, s = 0;
    partsFmt.formatToParts(now).forEach(function (p) {
      if (p.type === "hour") h = parseInt(p.value, 10) % 24;
      if (p.type === "minute") m = parseInt(p.value, 10);
      if (p.type === "second") s = parseInt(p.value, 10);
    });
    var pad = function (x) { return (x < 10 ? "0" : "") + x; };
    timeEl.textContent = toFaDigits(pad(h) + ":" + pad(m) + ":" + pad(s));
    hH.style.transform = "rotate(" + (((h % 12) + m / 60) * 30) + "deg)";
    hM.style.transform = "rotate(" + ((m + s / 60) * 6) + "deg)";
    hS.style.transform = "rotate(" + (s * 6) + "deg)";

    var key = now.toISOString().slice(0, 13);
    if (key.slice(0, 10) !== lastDay) {
      lastDay = key.slice(0, 10);
      dateFa.textContent = faDateFmt.format(now);
      dateEn.textContent = enDateFmt.format(now) + " میلادی";
    }
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- دریافت آب‌وهوا ---------- */
  function url(c) {
    return "https://api.open-meteo.com/v1/forecast" +
      "?latitude=" + c.lat + "&longitude=" + c.lon +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset" +
      "&forecast_days=5&timezone=" + encodeURIComponent(TZ) + "&wind_speed_unit=kmh";
  }

  var dayFmt = new Intl.DateTimeFormat("fa-IR", { weekday: "short", timeZone: "UTC" });

  function render(card, c, d) {
    var cur = d.current, daily = d.daily;
    var now = wmo(cur.weather_code, cur.is_day);

    var days = "";
    for (var i = 0; i < daily.time.length; i++) {
      var w = wmo(daily.weather_code[i], 1);
      var label = i === 0 ? "امروز" : dayFmt.format(new Date(daily.time[i] + "T12:00:00Z"));
      var rain = daily.precipitation_probability_max && daily.precipitation_probability_max[i] != null
        ? '<div class="dr">💧 ' + n(daily.precipitation_probability_max[i]) + '٪</div>' : "";
      days += '<div class="day" title="' + w.text + '">' +
        '<div class="dn">' + label + '</div>' +
        '<div class="di">' + w.icon + '</div>' +
        '<div class="dh">' + n(daily.temperature_2m_max[i]) + '°</div>' +
        '<div class="dl">' + n(daily.temperature_2m_min[i]) + '°</div>' + rain + '</div>';
    }

    card.innerHTML =
      '<div class="card-top">' +
        '<div><h2 class="city-name">' + c.name + '</h2><div class="city-sub">' + c.sub + '</div></div>' +
        '<div class="cond">به‌روز شده<br>' + hhmm(cur.time) + '</div>' +
      '</div>' +
      '<div class="now">' +
        '<div class="now-icon">' + now.icon + '</div>' +
        '<div class="now-temp">' + n(cur.temperature_2m) + '<small>°C</small></div>' +
        '<div class="now-text">' + now.text + '<span>احساس واقعی: ' + n(cur.apparent_temperature) + '°</span></div>' +
      '</div>' +
      '<div class="stats">' +
        '<div class="stat"><b>' + n(cur.relative_humidity_2m) + '٪</b><span>رطوبت</span></div>' +
        '<div class="stat"><b>' + n(cur.wind_speed_10m) + ' km/h</b><span>باد ' + windDir(cur.wind_direction_10m) + '</span></div>' +
        '<div class="stat"><b>' + n(cur.pressure_msl) + ' hPa</b><span>فشار هوا</span></div>' +
      '</div>' +
      '<div class="forecast">' + days + '</div>' +
      '<div class="sun"><span>🌅 طلوع: ' + hhmm(daily.sunrise[0]) + '</span><span>🌇 غروب: ' + hhmm(daily.sunset[0]) + '</span></div>';
  }

  function load(key) {
    var c = CITIES[key];
    var card = document.querySelector('[data-city="' + key + '"]');
    return fetch(url(c), { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (d) { render(card, c, d); return true; })
      .catch(function () {
        if (!card.querySelector(".stats")) {
          card.innerHTML = '<div class="err">دریافت اطلاعات ' + c.name + ' ممکن نشد.<br>اتصال اینترنت را بررسی و دکمه‌ی «به‌روزرسانی الان» را بزنید.</div>';
        }
        return false;
      });
  }

  var btn = document.getElementById("refresh");
  var statusEl = document.getElementById("status");

  function loadAll() {
    btn.disabled = true;
    Promise.all(Object.keys(CITIES).map(load)).then(function (res) {
      btn.disabled = false;
      var ok = res.every(Boolean);
      var t = partsFmt.format(new Date());
      statusEl.textContent = (ok ? "آخرین به‌روزرسانی: " : "خطا در دریافت بخشی از اطلاعات؛ آخرین تلاش: ") + toFaDigits(t);
    });
  }

  btn.addEventListener("click", loadAll);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) loadAll();
  });
  loadAll();
  setInterval(loadAll, REFRESH_MS);
})();
