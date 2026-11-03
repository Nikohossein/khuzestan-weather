(function(){
  "use strict";
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  var body=document.body, cv=document.getElementById("fx"), ctx=cv.getContext("2d"), W,H,P=[],mode="clear";
  function size(){W=cv.width=innerWidth;H=cv.height=innerHeight;}
  addEventListener("resize",size);size();

  /* ذرات بر اساس وضعیت هوا: ستاره، باران، گرد و غبار، ذرات گرم */
  function spawn(){
    var n=mode==="rain"?140:mode==="night"?90:70;P=[];
    for(var i=0;i<n;i++)P.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*2+.4,v:Math.random()*.6+.2,a:Math.random()*Math.PI*2});
  }
  function frame(t){
    ctx.clearRect(0,0,W,H);
    P.forEach(function(p){
      if(mode==="rain"){
        ctx.strokeStyle="rgba(150,220,255,.35)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-3,p.y+16);ctx.stroke();
        p.y+=p.v*22+6;p.x-=1.2;
      }else if(mode==="night"){
        ctx.fillStyle="rgba(255,255,255,"+(.3+.7*Math.abs(Math.sin(t/900+p.a)))+")";ctx.beginPath();ctx.arc(p.x,p.y,p.r*.8,0,6.3);ctx.fill();p.y+=p.v*.08;
      }else if(mode==="dust"){
        ctx.fillStyle="rgba(255,190,110,.28)";ctx.beginPath();ctx.arc(p.x,p.y,p.r*1.6,0,6.3);ctx.fill();p.x+=p.v*5;p.y+=Math.sin(t/700+p.a)*.6;
      }else{
        ctx.fillStyle="rgba(255,210,130,.35)";ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.3);ctx.fill();p.y-=p.v*.7;p.x+=Math.sin(t/1200+p.a)*.4;
      }
      if(p.y>H+20)p.y=-20;if(p.y<-20)p.y=H+20;if(p.x>W+20)p.x=-20;if(p.x<-20)p.x=W+20;
    });
    requestAnimationFrame(frame);
  }
  if(!reduce){spawn();requestAnimationFrame(frame);}

  /* تغییر تم آسمان با وضعیت هوا (رویداد از script.js) */
  addEventListener("wx",function(e){
    var c=e.detail.code,day=e.detail.isDay,s="clear";
    if(!day)s="night";
    if(c>=2&&c<=3||c>=45&&c<=48)s=day?"cloud":"night";
    if(c>=51&&c<=67||c>=80&&c<=82||c>=95)s="rain";
    body.setAttribute("data-sky",s);mode=s==="cloud"?"clear":s;if(!reduce)spawn();
  });

  /* نور دنبال‌کننده‌ی ماوس + نشانگر 3D کارت‌ها */
  var spot=document.querySelector(".spot");
  addEventListener("pointermove",function(e){body.style.setProperty("--mx",e.clientX+"px");body.style.setProperty("--my",e.clientY+"px");});
  if(!reduce&&matchMedia("(hover:hover)").matches){
    document.addEventListener("pointermove",function(e){
      var c=e.target.closest&&e.target.closest(".card");
      document.querySelectorAll(".card").forEach(function(k){if(k!==c)k.style.transform="";});
      if(!c)return;var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      c.style.transform="perspective(1000px) rotateY("+(x*-7)+"deg) rotateX("+(y*7)+"deg) translateZ(0)";
    });
    document.addEventListener("pointerleave",function(){document.querySelectorAll(".card").forEach(function(k){k.style.transform="";});});
  }

  /* ورود نرم عناصر هنگام اسکرول */
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);}});},{threshold:.1});
  function watch(){document.querySelectorAll(".card,.mini,.others-title").forEach(function(el,i){
    if(el.dataset.w)return;el.dataset.w=1;el.classList.add("reveal");el.style.transitionDelay=(i%4)*90+"ms";io.observe(el);});}
  new MutationObserver(watch).observe(document.querySelector(".wrap"),{childList:true,subtree:true});watch();
})();
