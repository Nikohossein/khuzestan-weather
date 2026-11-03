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
      "&hourly=temperature_2m,precipitation_probability&forecast_days=5&timezone=" + encodeURIComponent(TZ) + "&wind_speed_unit=kmh";
  }

  var dayFmt = new Intl.DateTimeFormat("fa-IR", { weekday: "short", timeZone: "UTC" });

  /* نمودار دمای ۲۴ ساعت آینده */
  function chartSvg(d) {
    var h = d.hourly;
    if (!h || !h.time || !h.temperature_2m) return "";
    var cur = d.current.time.slice(0, 13), start = 0, i;
    for (i = 0; i < h.time.length; i++) {
      if (h.time[i].slice(0, 13) >= cur) { start = i; break; }
    }
    var t = h.temperature_2m.slice(start, start + 24);
    var times = h.time.slice(start, start + 24);
    if (t.length < 2) return "";
    var min = Math.min.apply(null, t), max = Math.max.apply(null, t);
    if (max - min < 4) { var mid = (max + min) / 2; min = mid - 2; max = mid + 2; }
    var W = 600, H = 170, pl = 18, pr = 18, pt = 28, pb = 34;
    var x = function (k) { return pl + (W - pl - pr) * k / (t.length - 1); };
    var y = function (v) { return pt + (H - pt - pb) * (1 - (v - min) / (max - min)); };
    var pts = t.map(function (v, k) { return x(k).toFixed(1) + "," + y(v).toFixed(1); });
    var line = "M" + pts.join(" L");
    var area = line + " L" + x(t.length - 1).toFixed(1) + "," + (H - pb) + " L" + x(0).toFixed(1) + "," + (H - pb) + " Z";
    var marks = "";
    for (i = 0; i < t.length; i += 3) {
      marks += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(t[i]).toFixed(1) + '" r="3.5" class="cdot"/>' +
        '<text x="' + x(i).toFixed(1) + '" y="' + (y(t[i]) - 10).toFixed(1) + '" class="ct">' + n(t[i]) + '°</text>' +
        '<text x="' + x(i).toFixed(1) + '" y="' + (H - 10) + '" class="ch">' + toFaDigits(times[i].slice(11, 13)) + '</text>';
    }
    return '<div class="chart" dir="ltr"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="نمودار دمای ۲۴ ساعت آینده">' +
      '<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb454" stop-opacity=".45"/><stop offset="1" stop-color="#ffb454" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#cg)"/><path d="' + line + '" class="cline"/>' + marks + '</svg></div>';
  }

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
      '<div class="air">در حال دریافت کیفیت هوا…</div>' +
      '<div class="sec-title">دمای ۲۴ ساعت آینده (ساعت به وقت ایران)</div>' + chartSvg(d) +
      '<div class="sec-title">پیش‌بینی ۵ روز آینده</div>' +
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
      .then(function (d) { render(card, c, d); loadAir(card, c); return true; })
      .catch(function () {
        if (!card.querySelector(".stats")) {
          card.innerHTML = '<div class="err">دریافت اطلاعات ' + c.name + ' ممکن نشد.<br>اتصال اینترنت را بررسی و دکمه‌ی «به‌روزرسانی الان» را بزنید.</div>';
        }
        return false;
      });
  }

  /* کیفیت هوا و گرد و غبار */
  function aqiInfo(v) {
    if (v <= 50) return ["خوب", "#4ade80"];
    if (v <= 100) return ["متوسط", "#facc15"];
    if (v <= 150) return ["ناسالم برای گروه‌های حساس", "#fb923c"];
    if (v <= 200) return ["ناسالم", "#f87171"];
    if (v <= 300) return ["بسیار ناسالم", "#c084fc"];
    return ["خطرناک", "#ef4444"];
  }
  function val(x) { return x == null ? "—" : n(x); }

  function loadAir(card, c) {
    var el = card.querySelector(".air");
    if (!el) return;
    var u = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=" + c.lat + "&longitude=" + c.lon +
      "&current=us_aqi,pm10,pm2_5,dust&timezone=" + encodeURIComponent(TZ);
    fetch(u, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        var a = d.current;
        if (!a || a.us_aqi == null) { el.remove(); return; }
        var info = aqiInfo(a.us_aqi);
        el.innerHTML = '<div class="air-main"><span class="dot" style="background:' + info[1] + '"></span>' +
          '<b>کیفیت هوا: ' + n(a.us_aqi) + '</b><span>' + info[0] + '</span></div>' +
          '<div class="air-sub">PM10: ' + val(a.pm10) + ' · PM2.5: ' + val(a.pm2_5) +
          ' · گرد و غبار: ' + val(a.dust) + ' µg/m³</div>';
      })
      .catch(function () { el.remove(); });
  }

  /* سایر شهرهای خوزستان (یک درخواست برای همه) */
  var OTHERS = [
    { name: "آبادان", lat: 30.3392, lon: 48.3043 },
    { name: "خرمشهر", lat: 30.4256, lon: 48.1893 },
    { name: "ماهشهر", lat: 30.5592, lon: 49.1981 },
    { name: "بهبهان", lat: 30.5959, lon: 50.2417 },
    { name: "دزفول", lat: 32.3830, lon: 48.4058 },
    { name: "شوشتر", lat: 32.0450, lon: 48.8570 },
    { name: "اندیمشک", lat: 32.4600, lon: 48.3500 },
    { name: "مسجدسلیمان", lat: 31.9364, lon: 49.3036 }
  ];

  function loadOthers() {
    var box = document.getElementById("others");
    if (!box) return Promise.resolve(true);
    var u = "https://api.open-meteo.com/v1/forecast?latitude=" +
      OTHERS.map(function (o) { return o.lat; }).join(",") + "&longitude=" +
      OTHERS.map(function (o) { return o.lon; }).join(",") +
      "&current=temperature_2m,relative_humidity_2m,weather_code,is_day" +
      "&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=" + encodeURIComponent(TZ);
    return fetch(u, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (arr) {
        if (!Array.isArray(arr)) arr = [arr];
        box.innerHTML = arr.map(function (d, i) {
          var w = wmo(d.current.weather_code, d.current.is_day);
          return '<div class="mini"><div class="mini-top"><b>' + OTHERS[i].name + '</b><span class="mini-ic">' + w.icon + '</span></div>' +
            '<div class="mini-t">' + n(d.current.temperature_2m) + '°</div>' +
            '<div class="mini-s">' + w.text + '</div>' +
            '<div class="mini-r">بیشینه ' + n(d.daily.temperature_2m_max[0]) + '° · کمینه ' + n(d.daily.temperature_2m_min[0]) + '° · رطوبت ' + n(d.current.relative_humidity_2m) + '٪</div></div>';
        }).join("");
        return true;
      })
      .catch(function () {
        if (!box.querySelector(".mini")) {
          box.innerHTML = '<div class="err" style="grid-column:1/-1">دریافت اطلاعات سایر شهرها ممکن نشد.</div>';
        }
        return false;
      });
  }

  var btn = document.getElementById("refresh");
  var statusEl = document.getElementById("status");

  function loadAll() {
    btn.disabled = true;
    Promise.all(Object.keys(CITIES).map(load).concat([loadOthers()])).then(function (res) {
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
