(function(){
 const API=window.__HATCHABLE__.api;
 window.PTS_ADMIN=false;
 async function session(){
  const r=await fetch(API+"/admin/session"),d=await r.json().catch(()=>({}));
  if(r.ok){window.PTS_ADMIN=true;document.body.classList.add("is-admin");render(d);return}
  window.PTS_ADMIN=false;document.body.classList.remove("is-admin");render(null);
 }
 function render(me){
  const root=document.getElementById("topbarActions"); if(!root)return;
  const old=document.getElementById("adminSession");if(old)old.remove();
  const el=document.createElement("span");el.id="adminSession";el.style.marginLeft="8px";
  if(me){el.innerHTML='<span class="subtle">Administrator: '+(me.email||me.display_name||me.handle)+'</span> <button class="btn sm" id="siteSettings">Site settings</button> <button class="btn sm" id="adminLogout">Log out</button>';root.append(el);document.getElementById("siteSettings").onclick=()=>window.openSiteSettings&&window.openSiteSettings();document.getElementById("adminLogout").onclick=()=>{location.href="https://hatchable.com/logout?next="+encodeURIComponent(location.href)}}
  else {el.innerHTML='<button class="btn sm" id="adminLogin">Login</button>';root.append(el);document.getElementById("adminLogin").onclick=async()=>{const r=await fetch(API+"/admin/session"),d=await r.json().catch(()=>({}));location.href=d.login_url||"https://hatchable.com/login?next="+encodeURIComponent(location.href)}}
 }
 const hide=()=>{
  if(window.PTS_ADMIN)return;
  document.querySelectorAll("button").forEach(b=>{const t=(b.textContent||"").trim().toLowerCase();if(/^(\+ )?(new|add|create|edit|delete|disband|save|publish|generate|enter score|rate players|transfer|release|archive|force archive|give award|complete)/.test(t)||t.includes("roll over"))b.style.display="none"});
  document.querySelectorAll("[data-edit-club],[data-disband-club],[data-give-club-award],[data-player-photo],[data-player-move],[data-give-award]").forEach(x=>x.style.display="none");
 };
 new MutationObserver(()=>{hide();const top=document.getElementById("topbarActions");if(top&&!document.getElementById("adminSession"))render(window.PTS_ADMIN?{handle:"Admin"}:null)}).observe(document.body,{childList:true,subtree:true});
 session();
})();