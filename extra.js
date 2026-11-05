(function(){
  "use strict";
  var K=window.KW; if(!K)return;
  var n=K.n,fa=K.fa,wmo=K.wmo,wd=K.wd,TZ="Asia/Tehran";
  var $=function(s,r){return (r||document).querySelector(s)};
  var raw={},view={q:"",sort:"name"},last=null;
  var norm=function(s){return String(s).replace(/ي/g,"ی").replace(/ك/g,"ک").replace(/[\u200c\s]/g,"")};

  /* ---------- هشدارها ---------- */
  function rules(name,o){
    var a=[];
    if(o.app!=null){if(o.app>=50)a.push(["🔥","گرمای بسیار شدید","red"]);else if(o.app>=45)a.push(["🌡️","گرمای شدید","orange"]);else if(o.app<=0)a.push(["🥶","سرمای شدید","blue"]);}
    if(o.gust!=null){if(o.gust>=70)a.push(["🌪️","باد بسیار شدید","red"]);else if(o.gust>=50)a.push(["💨","باد شدید","orange"]);}
    if(o.code>=95)a.push(["⛈️","رعد و برق","orange"]);
    else if(o.code===65||o.code===82)a.push(["🌧️","باران شدید","blue"]);
    if(o.code===45||o.code===48)a.push(["🌫️","مه","blue"]);
    if(o.pm10>=300||o.dust>=200)a.push(["🌫️","گرد و غبار شدید","red"]);
    else if(o.pm10>=150||o.dust>=100)a.push(["🌫️","گرد و غبار","orange"]);
    return a;
  }
  var bar=document.createElement("section");bar.id="alerts";bar.setAttribute("aria-live","polite");
  $("#cities").parentNode.insertBefore(bar,$("#cities"));
  function renderAlerts(){
    var g={};
    Object.keys(raw).forEach(function(c){rules(c,raw[c]).forEach(function(r){(g[r[1]]=g[r[1]]||{i:r[0],c:r[2],l:[]}).l.push(c);});});
    var ks=Object.keys(g);
    bar.innerHTML=ks.length?ks.map(function(k){return '<div class="al '+g[k].c+'"><span class="ai">'+g[k].i+'</span><div><b>هشدار: '+k+'</b><small>'+g[k].l.join("، ")+'</small></div></div>';}).join(""):
      '<div class="al ok"><span class="ai">✅</span><div><b>هشدار فعالی ثبت نشده</b><small>شرایط جوی عادی است (بر پایه‌ی داده‌های مدل‌های جهانی)</small></div></div>';
  }
  window.addEventListener("wx",function(e){var d=e.detail;raw[d.name]=Object.assign(raw[d.name]||{},{app:d.app,gust:d.gust,code:d.code,t:d.t,h:d.hum});renderAlerts();});
  window.addEventListener("aq",function(e){var d=e.detail;raw[d.name]=Object.assign(raw[d.name]||{},{pm10:d.pm10,dust:d.dust});renderAlerts();});

  /* ---------- خلاصه‌ی استان + جستجو و مرتب‌سازی ---------- */
  var wrap=$(".others-wrap"),box=$("#others");
  var tools=document.createElement("div");tools.className="tools";
  tools.innerHTML='<div class="sum" id="sum"></div><div class="bar"><input id="q" type="search" placeholder="جستجوی شهر…" aria-label="جستجوی شهر">'+
    '<div class="chips" role="group" aria-label="مرتب‌سازی"><button data-s="name" class="on">الفبایی</button><button data-s="hot">داغ‌ترین</button><button data-s="cold">سردترین</button><button data-s="humid">مرطوب‌ترین</button><button data-s="rain">بارانی‌ترین</button></div></div>';
  wrap.insertBefore(tools,box);
  var sel=document.createElement("select");sel.id="prov";sel.setAttribute("aria-label","انتخاب استان");
  sel.innerHTML=K.IRAN.map(function(p){return '<option value="'+p.n+'">'+p.n+' ('+fa(p.c.length)+' شهر)</option>'}).join("");sel.value=K.prov();
  var bar0=$(".bar",tools);bar0.insertBefore(sel,bar0.firstChild);
  var sug=document.createElement("div");sug.className="sug";sug.hidden=true;tools.appendChild(sug);
  sel.addEventListener("change",function(){
    Object.keys(raw).forEach(function(k){if(!Object.keys(K.CITIES).some(function(c){return K.CITIES[c].name===k}))delete raw[k];});
    last=null;$("#q").value="";view.q="";sug.hidden=true;K.setProvince(sel.value);K.reload();
  });
  function findAll(q){var r=[];q=norm(q);if(q.length<2)return r;
    K.IRAN.forEach(function(p){p.c.forEach(function(c){if(r.length<8&&norm(c[0]).indexOf(q)>-1)r.push({name:c[0],lat:c[1],lon:c[2],sub:"استان "+p.n});});});return r;}
  sug.addEventListener("click",function(e){var b=e.target.closest("[data-k]");if(!b)return;var c=sug._r[+b.dataset.k];sug.hidden=true;open(c,b);});
  function applyView(){
    var d=last;if(!d)return;
    var idx=d.map(function(_,i){return i});
    var key={name:function(i){return 0},hot:function(i){return -d[i].current.temperature_2m},cold:function(i){return d[i].current.temperature_2m},
      humid:function(i){return -d[i].current.relative_humidity_2m},rain:function(i){return -(d[i].daily.precipitation_probability_max[0]||0)}}[view.sort];
    idx.sort(function(a,b){return view.sort==="name"?K.OTHERS[a].name.localeCompare(K.OTHERS[b].name,"fa"):key(a)-key(b)});
    var q=norm(view.q);
    idx.forEach(function(i,r){var el=box.querySelector('[data-i="'+i+'"]');if(!el)return;
      el.style.order=r;el.hidden=q&&norm(K.OTHERS[i].name).indexOf(q)<0;});
  }
  window.addEventListener("others",function(e){
    last=e.detail;
    last.forEach(function(d,i){var c=d.current,nm=K.OTHERS[i].name;raw[nm]=Object.assign(raw[nm]||{},{app:c.apparent_temperature,gust:c.wind_gusts_10m,code:c.weather_code,t:c.temperature_2m,h:c.relative_humidity_2m});});
    renderAlerts();
    var all=Object.keys(raw).filter(function(k){return raw[k].t!=null});
    var by=function(f,s){return all.slice().sort(function(a,b){return s*(f(raw[a])-f(raw[b]))})[0]};
    var hot=by(function(o){return o.t},-1),cold=by(function(o){return o.t},1),hum=by(function(o){return o.h},-1),wind=by(function(o){return o.gust||0},-1);
    $("#sum").innerHTML='<div><span>🔥 داغ‌ترین</span><b>'+hot+'</b><i>'+n(raw[hot].t)+'°</i></div><div><span>❄️ خنک‌ترین</span><b>'+cold+'</b><i>'+n(raw[cold].t)+'°</i></div>'+
      '<div><span>💧 مرطوب‌ترین</span><b>'+hum+'</b><i>'+n(raw[hum].h)+'٪</i></div><div><span>💨 تندترین باد</span><b>'+wind+'</b><i>'+n(raw[wind].gust)+' km/h</i></div>';
    applyView();
  });
  $("#q").addEventListener("input",function(e){view.q=e.target.value;applyView();
    var r=findAll(e.target.value);sug._r=r;sug.hidden=!r.length;
    sug.innerHTML=r.map(function(c,i){return '<button type="button" data-k="'+i+'">'+c.name+'<small>'+c.sub+'</small></button>'}).join("");});
  tools.addEventListener("click",function(e){var b=e.target.closest("[data-s]");if(!b)return;view.sort=b.dataset.s;
    tools.querySelectorAll("[data-s]").forEach(function(x){x.classList.toggle("on",x===b)});applyView();});

  /* ---------- فاز ماه ---------- */
  function moon(){
    var d=(Date.now()-Date.UTC(2000,0,6,18,14))/864e5,p=((d%29.530588)+29.530588)%29.530588,f=p/29.530588;
    var names=["هلال اول (محاق)","هلال نو","تربیع اول","بدر در حال رشد","ماه کامل","بدر در حال کاهش","تربیع آخر","هلال آخر"],em=["🌑","🌒","🌓","🌔","🌕","🌖","🌗","🌘"];
    var i=Math.round(f*8)%8;return{e:em[i],t:names[i],il:Math.round((1-Math.cos(f*2*Math.PI))/2*100)};
  }

  /* ---------- پنجره‌ی جزئیات کامل ---------- */
  var modal=document.createElement("div");modal.className="modal";modal.hidden=true;modal.setAttribute("role","dialog");modal.setAttribute("aria-modal","true");
  modal.innerHTML='<div class="sheet"><button class="x" aria-label="بستن">✕</button><div id="mbody"></div></div>';document.body.appendChild(modal);
  var opener=null;
  function close(){modal.hidden=true;document.body.style.overflow="";if(opener)opener.focus();}
  modal.addEventListener("click",function(e){if(e.target===modal||e.target.closest(".x"))close();});
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!modal.hidden)close();});

  function tips(c,uv,aq,rain){
    var t=[];
    if(c.apparent_temperature>=45)t.push("🔥 گرمای شدید: از ۱۱ تا ۱۷ از تابش مستقیم پرهیز کنید و آب فراوان بنوشید.");
    else if(c.apparent_temperature>=38)t.push("☀️ هوا گرم است؛ فعالیت سنگین را به صبح یا غروب موکول کنید.");
    else if(c.apparent_temperature<=5)t.push("🧥 هوا سرد است؛ لباس گرم بپوشید.");
    if(uv>=8)t.push("🧴 UV بسیار بالاست؛ کرم ضدآفتاب و کلاه فراموش نشود.");
    if(aq!=null&&aq>100)t.push("😷 کیفیت هوا ضعیف است؛ گروه‌های حساس ماسک بزنند و بیرون نروند.");
    if(rain>=60)t.push("☂️ احتمال بارش بالاست؛ چتر همراه داشته باشید.");
    if(c.wind_gusts_10m>=50)t.push("💨 تندباد؛ وسایل سبک را ایمن کنید.");
    if(!t.length)t.push("😊 شرایط مناسبی برای فعالیت در فضای باز است.");
    return t;
  }
  function chart(d){
    var h=d.hourly,cur=d.current.time.slice(0,13),s=0,i;
    for(i=0;i<h.time.length;i++)if(h.time[i].slice(0,13)>=cur){s=i;break;}
    var t=h.temperature_2m.slice(s,s+24),p=h.precipitation_probability.slice(s,s+24),tm=h.time.slice(s,s+24);
    var mn=Math.min.apply(null,t),mx=Math.max.apply(null,t);if(mx-mn<4){mn-=2;mx+=2;}
    var W=640,H=190,pl=16,pt=26,pb=34,x=function(k){return pl+(W-2*pl)*k/(t.length-1)},y=function(v){return pt+(H-pt-pb)*(1-(v-mn)/(mx-mn))};
    var bars="",marks="",bw=(W-2*pl)/t.length*.55;
    p.forEach(function(v,k){var bh=(H-pt-pb)*(v||0)/100*.6;bars+='<rect x="'+(x(k)-bw/2).toFixed(1)+'" y="'+(H-pb-bh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="3" fill="#38bdf8" opacity=".38"/>';});
    for(i=0;i<t.length;i+=3)marks+='<circle cx="'+x(i).toFixed(1)+'" cy="'+y(t[i]).toFixed(1)+'" r="3.5" class="cdot"/><text x="'+x(i).toFixed(1)+'" y="'+(y(t[i])-10).toFixed(1)+'" class="ct">'+n(t[i])+'°</text><text x="'+x(i).toFixed(1)+'" y="'+(H-10)+'" class="ch">'+fa(tm[i].slice(11,13))+'</text>';
    var ln="M"+t.map(function(v,k){return x(k).toFixed(1)+","+y(v).toFixed(1)}).join(" L");
    return '<div class="chart" dir="ltr"><svg viewBox="0 0 '+W+' '+H+'">'+bars+'<path d="'+ln+'" class="cline"/>'+marks+'</svg></div><div class="leg">ستون‌های آبی: احتمال بارش</div>';
  }
  function open(c,from){
    opener=from||null;modal.hidden=false;document.body.style.overflow="hidden";
    var mb=$("#mbody");mb.innerHTML='<div class="skeleton">در حال دریافت جزئیات '+c.name+'…</div>';$(".x",modal).focus();
    var tz=encodeURIComponent(TZ),ll="latitude="+c.lat+"&longitude="+c.lon;
    var f="https://api.open-meteo.com/v1/forecast?"+ll+"&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,dew_point_2m,cloud_cover,visibility,precipitation"+
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max,sunrise,sunset,daylight_duration,wind_speed_10m_max&hourly=temperature_2m,precipitation_probability&forecast_days=7&timezone="+tz;
    var a="https://air-quality-api.open-meteo.com/v1/air-quality?"+ll+"&current=us_aqi,pm10,pm2_5,dust&timezone="+tz;
    Promise.all([fetch(f).then(function(r){if(!r.ok)throw 0;return r.json()}),fetch(a).then(function(r){return r.ok?r.json():null}).catch(function(){return null})]).then(function(res){
      var d=res[0],q=res[1]&&res[1].current,cur=d.current,dl=d.daily,w=wmo(cur.weather_code,cur.is_day),m=moon(),uv=dl.uv_index_max[0];
      var aqv=q&&q.us_aqi!=null?q.us_aqi:null,ai=aqv!=null?K.aqi(aqv):null,dd=Math.round(dl.daylight_duration[0]/60);
      var st=function(b,s){return '<div class="stat"><b>'+b+'</b><span>'+s+'</span></div>'};
      var days=dl.time.map(function(t,i){var ww=wmo(dl.weather_code[i],1),lb=i?new Intl.DateTimeFormat("fa-IR",{weekday:"long",day:"numeric",month:"short",timeZone:"UTC"}).format(new Date(t+"T12:00:00Z")):"امروز";
        return '<div class="drow"><span class="dn">'+lb+'</span><span class="di" title="'+ww.text+'">'+ww.icon+'</span><span class="dr">💧 '+n(dl.precipitation_probability_max[i]||0)+'٪</span><span class="dt"><b>'+n(dl.temperature_2m_max[i])+'°</b> / '+n(dl.temperature_2m_min[i])+'°</span></div>';}).join("");
      mb.innerHTML='<h2 class="city-name">'+c.name+'</h2><div class="city-sub">'+(c.sub||"استان خوزستان")+' · به‌روز شده '+fa(cur.time.slice(11,16))+'</div>'+
        '<div class="now"><div class="now-icon">'+w.icon+'</div><div class="now-temp">'+n(cur.temperature_2m)+'<small>°C</small></div><div class="now-text">'+w.text+'<span>احساس واقعی: '+n(cur.apparent_temperature)+'°</span></div></div>'+
        '<div class="stats s4">'+st(n(cur.relative_humidity_2m)+'٪','رطوبت')+st(n(cur.wind_speed_10m)+' km/h','باد '+wd(cur.wind_direction_10m))+st(n(cur.wind_gusts_10m)+' km/h','تندباد')+st(n(cur.pressure_msl)+' hPa','فشار')+
        st(n(cur.dew_point_2m)+'°','نقطه‌ی شبنم')+st(n(cur.cloud_cover)+'٪','پوشش ابر')+st(new Intl.NumberFormat("fa-IR",{maximumFractionDigits:1}).format(cur.visibility/1000)+' km','دید افقی')+st(uv==null?"—":new Intl.NumberFormat("fa-IR",{maximumFractionDigits:1}).format(uv),'UV · '+K.uvl(uv))+'</div>'+
        (ai?'<div class="air"><div class="air-main"><span class="dot" style="background:'+ai[1]+'"></span><b>کیفیت هوا: '+n(aqv)+'</b><span>'+ai[0]+'</span></div><div class="air-sub">PM10: '+n(q.pm10)+' · PM2.5: '+n(q.pm2_5)+' · گرد و غبار: '+n(q.dust)+' µg/m³</div></div>':'')+
        '<div class="sec-title">توصیه‌ها</div><ul class="tips">'+tips(cur,uv,aqv,dl.precipitation_probability_max[0]||0).map(function(x){return '<li>'+x+'</li>'}).join("")+'</ul>'+
        '<div class="sec-title">دما و بارش ۲۴ ساعت آینده</div>'+chart(d)+
        '<div class="sec-title">پیش‌بینی ۷ روزه</div><div class="days7">'+days+'</div>'+
        '<div class="astro"><div>🌅 طلوع<b>'+fa(dl.sunrise[0].slice(11,16))+'</b></div><div>🌇 غروب<b>'+fa(dl.sunset[0].slice(11,16))+'</b></div><div>⏳ طول روز<b>'+fa(Math.floor(dd/60))+' ساعت و '+fa(dd%60)+' دقیقه</b></div><div>'+m.e+' ماه<b>'+m.t+' · '+fa(m.il)+'٪</b></div></div>';
    }).catch(function(){mb.innerHTML='<div class="err">دریافت جزئیات ممکن نشد. اتصال اینترنت را بررسی کنید.</div>';});
  }
  document.addEventListener("click",function(e){
    var m=e.target.closest(".mini"),h=e.target.closest(".card .city-name");
    if(m)open(K.OTHERS[+m.dataset.i],m);else if(h)open(K.CITIES[h.closest(".card").dataset.city],h);
  });
  document.addEventListener("keydown",function(e){
    if(e.key!=="Enter"&&e.key!==" ")return;var t=e.target;
    if(t.classList&&(t.classList.contains("mini")||t.classList.contains("city-name"))){e.preventDefault();t.click();}
  });
})();
