import{h,e as w,d as p}from"./instantdb-D5dQ5UkJ.js";/* empty css              */const f=document.getElementById("leaderboard-status"),b=document.getElementById("leaderboard-table"),i=document.getElementById("leaderboard-rows"),g=t=>{if(!t)return"--";const r=new Date(t);return Number.isNaN(r.getTime())?"--":r.toLocaleDateString(void 0,{year:"numeric",month:"short",day:"numeric"})},y=(t,r=null)=>{i.innerHTML="",t.forEach((n,d)=>{const a=document.createElement("div"),s=r&&n.id===r,e=d+1;a.className=s?"leaderboard-row user-entry":"leaderboard-row",a.innerHTML=`
      <span class="rank-number">#${e}</span>
      <span>${n.nickname||"Anonymous"}${s?" (You)":""}</span>
      <span>${n.totalTargets??0}</span>
      <span>${n.levelsCompleted??0}</span>
      <span>${g(n.createdAt)}</span>
    `,i.appendChild(a)})},l=t=>{f.textContent=t,b.hidden=!0},E=new URLSearchParams(window.location.search),c=E.get("entry");!h||!w()||!p?l("Leaderboard is not configured yet."):p.subscribeQuery({leaderboard_entries:{}},t=>{if(t.error){l("Could not load leaderboard.");return}const r=t.data?.leaderboard_entries||[];if(!r.length){l("No scores yet. Be the first!");return}const n=[...r].sort((e,o)=>{const u=(o.totalTargets||0)-(e.totalTargets||0);if(u!==0)return u;const m=(o.levelsCompleted||0)-(e.levelsCompleted||0);return m!==0?m:(o.createdAt||0)-(e.createdAt||0)}),d=n.slice(0,10);let a=null,s=null;if(c){const e=n.findIndex(o=>o.id===c);e!==-1&&(a=e+1,s=n[e])}if(f.textContent="",b.hidden=!1,y(d,c),a&&a>10){const e=document.createElement("div");e.className="leaderboard-row user-entry",e.innerHTML=`
        <span class="rank-number">#${a}</span>
        <span>${s.nickname||"Anonymous"} (You)</span>
        <span>${s.totalTargets??0}</span>
        <span>${s.levelsCompleted??0}</span>
        <span>${g(s.createdAt)}</span>
      `,i.appendChild(e)}});
