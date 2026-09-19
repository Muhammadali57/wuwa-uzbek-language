(() => {
  const API_BASE = window.WUWA_API_BASE || 'https://wuwa-uzbek-language-two.vercel.app/api';
  const $ = (s,p=document)=>p.querySelector(s);
  const tr = (k,f=k)=>window.I18N?.t(k,f) ?? f;
  const esc=v=>{const d=document.createElement('div');d.textContent=v??'';return d.innerHTML};
  const flag=c=>{c=String(c||'XX').toUpperCase();return /^[A-Z]{2}$/.test(c)&&c!=='XX'?[...c].map(x=>String.fromCodePoint(127397+x.charCodeAt())).join(''):'🌍'};
  const countryName=c=>{try{return new Intl.DisplayNames([window.I18N?.language||'en','en'],{type:'region'}).of(c)||c}catch{return c}};
  async function refresh(){
    const cards=[...document.querySelectorAll('.quote-card')]; if(!cards.length)return;
    try{
      const r=await fetch(API_BASE+'/chat',{cache:'no-store'}),d=await r.json();
      if(!r.ok||!d.ok||!Array.isArray(d.messages)||!d.messages.length)return;
      d.messages.slice(-3).reverse().forEach((m,i)=>{
        const card=cards[i];if(!card)return;
        const p=card.querySelector('p'),small=card.querySelector('small');
        if(p)p.textContent=m.message;
        if(small)small.textContent=`${flag(m.country)} ${countryName(String(m.country||'XX'))} · ${m.nickname||tr('quote1Meta','Anonymous Rover').split('·').pop().trim()}`;
      });
    }catch{}
  }
  document.addEventListener('DOMContentLoaded',()=>{window.I18N?.ready?.then(refresh);setInterval(refresh,15000);window.I18N?.onChange(refresh)});
})();
