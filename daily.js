
// ═══════════════════════════════════════════════════════════
//  DAILY REWARDS
// ═══════════════════════════════════════════════════════════
const DAILY_REWARDS = [
  { day:1, emoji:'🪙', label:'+50 Coins',           coins:50,  xp:0   },
  { day:2, emoji:'⚡', label:'+30 XP',              coins:0,   xp:30  },
  { day:3, emoji:'💰', label:'+100 Coins',           coins:100, xp:0   },
  { day:4, emoji:'🌟', label:'+60 XP',              coins:0,   xp:60  },
  { day:5, emoji:'💎', label:'+200 Coins',           coins:200, xp:0   },
  { day:6, emoji:'🔥', label:'+100 XP',             coins:0,   xp:100 },
  { day:7, emoji:'👑', label:'+500 Coins + 150 XP', coins:500, xp:150, bonus:'🎉 JACKPOT !' },
];

// Appelé au login automatiquement — seulement si pas encore récupéré aujourd'hui
// Helper date ISO local (YYYY-MM-DD) — stable quelque soit le navigateur/timezone
function todayISO() {
  const d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function normDateISO(raw) {
  if(!raw) return '';
  if(raw.includes('-') && raw.length === 10) return raw; // déjà ISO
  try { const t = new Date(raw); return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0'); } catch(e) { return ''; }
}

function checkAndShowDailyReward() {
  if(guestMode) return; // invité
  const today = todayISO();
  const last  = normDateISO(sd.lastDailyReward || '');
  if (last === today) return; // déjà récupéré aujourd'hui
  renderDailyRewardPopup(false);
  document.getElementById('dailyRewardPopup').style.display = 'flex';
}

// Appelé par le bouton DAILY du menu — toujours afficher
function openDailyReward() {
  const today   = todayISO();
  const already = normDateISO(sd.lastDailyReward || '') === today;
  renderDailyRewardPopup(already);
  document.getElementById('dailyRewardPopup').style.display = 'flex';
}

function renderDailyRewardPopup(alreadyClaimed) {
  const today     = todayISO();
  const _y = new Date(Date.now()-86400000);
  const yesterday = _y.getFullYear()+'-'+String(_y.getMonth()+1).padStart(2,'0')+'-'+String(_y.getDate()).padStart(2,'0');
  const last = normDateISO(sd.lastDailyReward || '') || null;

  // Calcule le streak AFFICHÉ sans modifier sd.dailyStreak (sera modifié uniquement au claim)
  const currentStreak = Math.max(1, sd.dailyStreak || 1); // jamais en dessous de 1
  let streak;
  if (alreadyClaimed) {
    // Déjà réclamé aujourd'hui : afficher le streak actuel
    streak = currentStreak;
  } else {
    // Calculer le streak qu'on OBTIENDRAIT si on claimait maintenant
    if (!last)                 streak = 1;
    else if (last===yesterday) streak = (currentStreak % 7) + 1;
    else if (last===today)     streak = currentStreak; // sécurité (ne devrait pas arriver ici)
    else                       streak = 1; // streak cassé (jour manqué)
  }
  const dayIndex = (streak - 1) % 7;
  const reward   = DAILY_REWARDS[dayIndex];

  document.getElementById('drStreak').textContent = `🔥 ${streak} jour${streak>1?'s':''} de suite`;
  document.getElementById('drEmoji').textContent  = alreadyClaimed ? '✅' : reward.emoji;
  document.getElementById('drAmount').textContent = alreadyClaimed ? `${reward.label} récupéré !` : reward.label;
  document.getElementById('drBonus').textContent  = alreadyClaimed ? 'Reviens demain pour la prochaine récompense !' : (reward.bonus || '');

  const cal = document.getElementById('drCalendar');
  cal.innerHTML = '';
  DAILY_REWARDS.forEach((r, i) => {
    const done = alreadyClaimed ? i <= dayIndex : i < dayIndex;
    const cur  = i === dayIndex;
    const d = document.createElement('div');
    d.style.cssText = `background:${cur?'rgba(255,215,0,0.18)':done?'rgba(57,255,20,0.08)':'rgba(255,255,255,0.03)'};border:1px solid ${cur?'#ffd700':done?'#39ff14':'rgba(255,255,255,0.08)'};border-radius:6px;padding:0.25rem 0.05rem;text-align:center;`;
    d.innerHTML = `<div style="font-size:${cur?'1':'0.8'}rem;">${done?'✅':r.emoji}</div><div style="font-size:0.42rem;color:rgba(255,255,255,0.35);">J${i+1}</div>`;
    cal.appendChild(d);
  });

  const btn = document.getElementById('drClaimBtn');
  if (btn) {
    if (alreadyClaimed) {
      btn.textContent = '⏰ Reviens demain !';
      btn.disabled = true;
      btn.style.cssText += ';background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.35);cursor:default;';
    } else {
      btn.textContent = '✅ RÉCUPÉRER';
      btn.disabled = false;
      btn.style.cssText += ';background:linear-gradient(135deg,#ffd700,#ff8800);color:#000;cursor:pointer;';
    }
  }
}

async function claimDailyReward() {
  const today     = todayISO();
  const _y        = new Date(Date.now()-86400000);
  const yesterday = _y.getFullYear()+'-'+String(_y.getMonth()+1).padStart(2,'0')+'-'+String(_y.getDate()).padStart(2,'0');
  const last      = normDateISO(sd.lastDailyReward || '') || null;

  // Verrou Supabase uniquement
  if (last === today) {
    showNotif('✅ Déjà récupéré aujourd\'hui !');
    document.getElementById('dailyRewardPopup').style.display = 'none';
    return;
  }

  // Calculer le streak
  const prevStreak = Math.max(1, sd.dailyStreak || 1);
  if (!last)                 sd.dailyStreak = 1;
  else if (last===yesterday) sd.dailyStreak = (prevStreak % 7) + 1;
  else                       sd.dailyStreak = 1;

  const dayIndex = (sd.dailyStreak - 1) % 7;
  const reward   = DAILY_REWARDS[dayIndex];
  sd.coins           = (sd.coins||0) + reward.coins;
  if (reward.xp) sd.xp = (sd.xp||0) + reward.xp;
  sd.lastDailyReward = today;

  // PATCH direct et dédié dans Supabase — attend la confirmation avant de continuer
  if (currentUser?.id && currentSession?.access_token) {
    await supaFetch('/rest/v1/profiles?id=eq.' + currentUser.id, {
      method: 'PATCH',
      body: JSON.stringify({
        last_daily_reward: today,
        daily_streak:      sd.dailyStreak,
        coins:             sd.coins,
        xp:                sd.xp
      })
    });
    currentUser.last_daily_reward = today;
    currentUser.daily_streak      = sd.dailyStreak;
  }

  const btn = document.getElementById('drClaimBtn');
  if (btn) { btn.textContent = '✅ RÉCUPÉRÉ !'; btn.disabled = true; }
  showNotif(`🎁 ${reward.label} récupéré !`);
  updateMenu();
  setTimeout(() => { document.getElementById('dailyRewardPopup').style.display='none'; }, 1400);
}

async function showFriendsScreen() {
  showScreen('friendsScreen');
  await renderFriendsList();
}

async function sendFriendRequest() {
  const pseudo = (document.getElementById('friendSearchInput')?.value||'').trim();
  if (!pseudo) return;
  if (pseudo.toLowerCase() === (currentUser?.pseudo||'').toLowerCase()) { showNotif('❌ C\'est toi !'); return; }
  const r = await supaFetch(`/rest/v1/profiles?pseudo=eq.${encodeURIComponent(pseudo)}&select=id,pseudo`);
  if (!r.ok || !r.data?.length) { showNotif('❌ Joueur introuvable'); return; }
  const target = r.data[0];
  if ((sd.friends||[]).includes(target.id)) { showNotif('✅ Déjà amis !'); return; }
  const tp = await supaFetch(`/rest/v1/profiles?id=eq.${target.id}&select=friend_requests`);
  let reqs = [];
  try { reqs = JSON.parse(tp.data?.[0]?.friend_requests||'[]'); } catch(e) {}
  if (!reqs.includes(currentUser.id)) reqs.push(currentUser.id);
  await supaFetch(`/rest/v1/profiles?id=eq.${target.id}`, { method:'PATCH', body:JSON.stringify({ friend_requests: JSON.stringify(reqs) }) });
  document.getElementById('friendSearchInput').value = '';
  showNotif(`📨 Demande envoyée à ${pseudo} !`);
}

async function renderFriendsList() {
  const listEl = document.getElementById('friendsList');
  const reqEl  = document.getElementById('friendRequests');
  const cntEl  = document.getElementById('friendsOnlineCount');
  if (!listEl) return;

  const myP = await supaFetch(`/rest/v1/profiles?id=eq.${currentUser.id}&select=friend_requests,friends`);
  let friendIds=[], pendingIds=[];
  if (myP.ok && myP.data?.[0]) {
    try { friendIds  = JSON.parse(myP.data[0].friends||'[]'); } catch(e) {}
    try { pendingIds = JSON.parse(myP.data[0].friend_requests||'[]'); } catch(e) {}
    sd.friends = friendIds;
  }

  // Demandes
  if (pendingIds.length) {
    const pp = await supaFetch(`/rest/v1/profiles?id=in.(${pendingIds.join(',')})&select=id,pseudo`);
    reqEl.innerHTML = `<div style="font-family:'Orbitron',monospace;font-size:0.52rem;color:rgba(255,165,0,0.8);margin-bottom:0.3rem;">📨 DEMANDES (${pendingIds.length})</div>`;
    (pp.data||[]).forEach(p => {
      const d = document.createElement('div');
      d.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:rgba(255,165,0,0.06);border:1px solid rgba(255,165,0,0.18);border-radius:8px;padding:0.38rem 0.6rem;margin-bottom:0.3rem;';
      d.innerHTML = `<span style="font-size:0.68rem;color:#fff;">👤 ${p.pseudo}</span>
        <div style="display:flex;gap:0.3rem;">
          <button onclick="acceptFriendReq('${p.id}','${p.pseudo}')" style="background:rgba(57,255,20,0.1);border:1px solid #39ff14;color:#39ff14;border-radius:6px;padding:0.2rem 0.5rem;font-size:0.55rem;cursor:pointer;">✅</button>
          <button onclick="declineFriendReq('${p.id}')" style="background:rgba(255,0,0,0.07);border:1px solid rgba(255,0,0,0.3);color:#ff4444;border-radius:6px;padding:0.2rem 0.5rem;font-size:0.55rem;cursor:pointer;">❌</button>
        </div>`;
      reqEl.appendChild(d);
    });
  } else { reqEl.innerHTML = ''; }

  if (!friendIds.length) {
    listEl.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.18);font-size:0.62rem;padding:1.5rem;">Aucun ami pour l\'instant</div>';
    if(cntEl) cntEl.textContent = ''; return;
  }

  const fp = await supaFetch(`/rest/v1/profiles?id=in.(${friendIds.join(',')})&select=id,pseudo,best_score,total_kills`);
  listEl.innerHTML = '';
  let online = 0;
  (fp.data||[]).forEach(f => {
    const isOnline = onlinePlayers && Object.values(onlinePlayers).some(p => p.userId===f.id);
    if (isOnline) online++;
    const d = document.createElement('div');
    d.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:0.4rem 0.6rem;margin-bottom:0.3rem;';
    d.innerHTML = `
      <div>
        <div style="display:flex;align-items:center;gap:0.35rem;">
          <div style="width:6px;height:6px;border-radius:50%;background:${isOnline?'#39ff14':'rgba(255,255,255,0.15)'};flex-shrink:0;"></div>
          <span style="font-size:0.7rem;color:#fff;">${f.pseudo}</span>
          ${isOnline?'<span style="font-size:0.48rem;color:#39ff14;">EN LIGNE</span>':''}
        </div>
        <div style="font-size:0.52rem;color:rgba(255,255,255,0.28);margin-top:0.1rem;">🏆 ${(f.best_score||0).toLocaleString()} · 💀 ${f.total_kills||0}</div>
      </div>
      <button onclick="removeFriend('${f.id}','${f.pseudo}')" style="background:transparent;border:1px solid rgba(255,0,0,0.18);color:rgba(255,0,0,0.45);border-radius:6px;padding:0.2rem 0.4rem;font-size:0.5rem;cursor:pointer;">✕</button>`;
    listEl.appendChild(d);
  });
  if(cntEl) cntEl.textContent = online>0 ? `${online} en ligne` : '';
}

async function acceptFriendReq(fromId, fromPseudo) {
  const myP = await supaFetch(`/rest/v1/profiles?id=eq.${currentUser.id}&select=friend_requests,friends`);
  let myF=[], myR=[];
  try { myF = JSON.parse(myP.data?.[0]?.friends||'[]'); } catch(e) {}
  try { myR = JSON.parse(myP.data?.[0]?.friend_requests||'[]'); } catch(e) {}
  if (!myF.includes(fromId)) myF.push(fromId);
  myR = myR.filter(id => id!==fromId);
  await supaFetch(`/rest/v1/profiles?id=eq.${currentUser.id}`, { method:'PATCH', body:JSON.stringify({ friends:JSON.stringify(myF), friend_requests:JSON.stringify(myR) }) });
  const thP = await supaFetch(`/rest/v1/profiles?id=eq.${fromId}&select=friends`);
  let thF=[];
  try { thF = JSON.parse(thP.data?.[0]?.friends||'[]'); } catch(e) {}
  if (!thF.includes(currentUser.id)) thF.push(currentUser.id);
  await supaFetch(`/rest/v1/profiles?id=eq.${fromId}`, { method:'PATCH', body:JSON.stringify({ friends:JSON.stringify(thF) }) });
  sd.friends = myF;
  showNotif(`✅ ${fromPseudo} ajouté(e) !`);
  renderFriendsList();
}

async function declineFriendReq(fromId) {
  const myP = await supaFetch(`/rest/v1/profiles?id=eq.${currentUser.id}&select=friend_requests`);
  let myR=[];
  try { myR = JSON.parse(myP.data?.[0]?.friend_requests||'[]'); } catch(e) {}
  myR = myR.filter(id => id!==fromId);
  await supaFetch(`/rest/v1/profiles?id=eq.${currentUser.id}`, { method:'PATCH', body:JSON.stringify({ friend_requests:JSON.stringify(myR) }) });
  renderFriendsList();
}

async function removeFriend(fId, fPseudo) {
  if (!confirm(`Retirer ${fPseudo} ?`)) return;
  const myF = (sd.friends||[]).filter(id=>id!==fId);
  await supaFetch(`/rest/v1/profiles?id=eq.${currentUser.id}`, { method:'PATCH', body:JSON.stringify({ friends:JSON.stringify(myF) }) });
  sd.friends = myF;
  showNotif(`👋 ${fPseudo} retiré(e)`);
  renderFriendsList();
}

// ═══════════════════════════════════════════════════════════
//  CHAT
// ═══════════════════════════════════════════════════════════
let chatVisible = false;

function toggleChatOverlay() {
  chatVisible = !chatVisible;
  document.getElementById('chatOverlay').style.display = chatVisible ? 'block' : 'none';
  document.getElementById('chatToggleBtn').style.background = chatVisible ? 'rgba(0,245,255,0.28)' : 'rgba(0,245,255,0.12)';
  if (chatVisible) { document.getElementById('chatInput')?.focus(); scrollChatBottom(); }
}

function showChatBtn(show) {
  const btn = document.getElementById('chatToggleBtn');
  if (btn) { btn.style.display = show ? 'flex' : 'none'; btn.style.alignItems='center'; btn.style.justifyContent='center'; }
  if (!show) { chatVisible=false; const ov=document.getElementById('chatOverlay'); if(ov) ov.style.display='none'; }
}

function addChatMessage(pseudo, msg, isMe=false) {
  const el = document.getElementById('chatMessages');
  if (!el) return;
  const d = document.createElement('div');
  d.style.marginBottom = '0.15rem';
  d.innerHTML = `<span style="color:${isMe?'var(--neon-cyan)':'#fff'};font-weight:600;">${pseudo}:</span> <span style="color:rgba(255,255,255,0.75);">${msg}</span>`;
  el.appendChild(d);
  while (el.children.length > 50) el.removeChild(el.firstChild);
  scrollChatBottom();
}

function scrollChatBottom() { const el=document.getElementById('chatMessages'); if(el) el.scrollTop=el.scrollHeight; }

async function sendChatMsg() {
  const input = document.getElementById('chatInput');
  const msg = (input?.value||'').trim();
  if (!msg || !currentUser) return;
  input.value = '';
  addChatMessage(currentUser.pseudo, msg, true);
  try {
    await supaFetch('/rest/v1/chat_messages', { method:'POST', body:JSON.stringify({ user_id:currentUser.id, pseudo:currentUser.pseudo, message:msg, lobby_id:currentLobby||'global', created_at:new Date().toISOString() }) });
  } catch(e) {}
}

// ═══════════════════════════════════════════════════════════
//  TOURNAMENTS
// ═══════════════════════════════════════════════════════════
async function renderTournamentScreen() {
  showScreen('tournamentScreen');
  const content = document.getElementById('tournamentContent');
  content.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.3);padding:2rem;">Chargement...</div>';
  const r = await supaFetch('/rest/v1/tournaments?status=in.(open,active)&order=created_at.desc&limit=20');
  const list = (r.ok && Array.isArray(r.data)) ? r.data : [];
  content.innerHTML = '';

  const btnCreate = document.createElement('button');
  btnCreate.style.cssText = 'width:100%;padding:0.52rem;background:linear-gradient(135deg,rgba(255,215,0,0.1),rgba(255,140,0,0.1));border:1.5px solid #ffd700;border-radius:10px;color:#ffd700;font-family:Orbitron,monospace;font-size:0.66rem;cursor:pointer;margin-bottom:0.6rem;';
  btnCreate.textContent = '➕ CRÉER UN TOURNOI';
  btnCreate.onclick = showCreateTournament;
  content.appendChild(btnCreate);

  if (!list.length) {
    const e = document.createElement('div');
    e.style.cssText = 'text-align:center;color:rgba(255,255,255,0.22);font-size:0.62rem;padding:1.5rem;';
    e.textContent = 'Aucun tournoi actif — crée le premier !';
    content.appendChild(e);
    return;
  }

  list.forEach(t => {
    let parts = [];
    try { parts = JSON.parse(t.participants || '[]'); } catch(e) {}
    const isHost   = t.host_id === currentUser?.id;
    const isMember = parts.includes(currentUser?.id);
    const isFull   = parts.length >= t.max_players;
    const isOpen   = t.status === 'open';
    const isActive = t.status === 'active';
    const canStart = isHost && isOpen && parts.length >= 2; // hôte peut démarrer dès 2 joueurs

    const div = document.createElement('div');
    div.style.cssText = 'background:rgba(255,215,0,0.04);border:1px solid rgba(255,215,0,0.16);border-radius:10px;padding:0.55rem 0.7rem;margin-bottom:0.4rem;';

    // Header : nom + statut
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.18rem;">
        <div style="font-family:'Orbitron',monospace;font-size:0.66rem;color:#ffd700;">${t.name || 'Tournoi'} ${isHost ? '👑' : ''}</div>
        <div style="font-size:0.5rem;color:${isActive ? '#39ff14' : '#ffd700'};">${isActive ? '🟢 EN COURS' : `🟡 ${parts.length}/${t.max_players}`}</div>
      </div>
      <div style="font-size:0.5rem;color:rgba(255,255,255,0.28);margin-bottom:0.35rem;">Mode : ${t.mode || 'Normal'} · ${t.max_players} joueurs max</div>`;

    // Boutons d'action
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:0.3rem;flex-wrap:wrap;';

    if (isHost && isOpen) {
      // Démarrer (si >= 2 joueurs)
      if (canStart) {
        const btnStart = document.createElement('button');
        btnStart.style.cssText = 'flex:1;padding:0.3rem 0.2rem;background:linear-gradient(135deg,rgba(57,255,20,0.15),rgba(0,200,0,0.1));border:1px solid #39ff14;border-radius:7px;color:#39ff14;font-family:Orbitron,monospace;font-size:0.55rem;cursor:pointer;';
        btnStart.textContent = '▶ DÉMARRER';
        btnStart.onclick = () => startTournament(t.id, parts);
        actions.appendChild(btnStart);
      }
      // Supprimer
      const btnDel = document.createElement('button');
      btnDel.style.cssText = 'padding:0.3rem 0.5rem;background:rgba(255,0,0,0.08);border:1px solid rgba(255,0,0,0.3);border-radius:7px;color:#ff4444;font-size:0.55rem;cursor:pointer;';
      btnDel.textContent = '🗑 Supprimer';
      btnDel.onclick = () => deleteTournament(t.id, t.name);
      actions.appendChild(btnDel);
    } else if (isMember && isOpen && !isHost) {
      // Quitter
      const btnLeave = document.createElement('button');
      btnLeave.style.cssText = 'flex:1;padding:0.3rem 0.2rem;background:rgba(255,100,0,0.08);border:1px solid rgba(255,100,0,0.3);border-radius:7px;color:#ff8800;font-family:Orbitron,monospace;font-size:0.55rem;cursor:pointer;';
      btnLeave.textContent = '🚪 Quitter';
      btnLeave.onclick = () => leaveTournament(t.id, parts);
      actions.appendChild(btnLeave);
    } else if (!isMember && isOpen && !isFull) {
      // Rejoindre
      const btnJoin = document.createElement('button');
      btnJoin.style.cssText = 'flex:1;padding:0.3rem 0.2rem;background:rgba(255,215,0,0.07);border:1px solid #ffd700;border-radius:7px;color:#ffd700;font-family:Orbitron,monospace;font-size:0.55rem;cursor:pointer;';
      btnJoin.textContent = '⚔️ REJOINDRE';
      btnJoin.onclick = () => joinTournament(t.id);
      actions.appendChild(btnJoin);
    } else if (isActive) {
      const info = document.createElement('div');
      info.style.cssText = 'font-size:0.5rem;color:#39ff14;';
      info.textContent = isMember ? '✅ Tu participes — bonne chance !' : '🟢 Tournoi en cours';
      actions.appendChild(info);
    } else if (isFull && !isMember) {
      const info = document.createElement('div');
      info.style.cssText = 'font-size:0.5rem;color:rgba(255,255,255,0.22);';
      info.textContent = 'Complet';
      actions.appendChild(info);
    }

    if (actions.children.length) div.appendChild(actions);
    content.appendChild(div);
  });
}

async function startTournament(tId, parts) {
  const bracket = parts.reduce((a, _, i, arr) => i % 2 === 0 ? [...a, {p1:arr[i], p2:arr[i+1]||'BYE', winner:null}] : a, []);
  await supaFetch(`/rest/v1/tournaments?id=eq.${tId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'active', bracket: JSON.stringify(bracket) })
  });
  showNotif('▶ Tournoi démarré !');
  renderTournamentScreen();
}

async function deleteTournament(tId, name) {
  if (!confirm(`Supprimer "${name}" ?`)) return;
  // Essai DELETE d'abord
  const r = await supaFetch(`/rest/v1/tournaments?id=eq.${tId}`, { method: 'DELETE' });
  // Si DELETE bloqué par RLS, on passe status=deleted (filtré à l'affichage)
  if (!r.ok) {
    await supaFetch(`/rest/v1/tournaments?id=eq.${tId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'deleted' })
    });
  }
  showNotif('🗑 Tournoi supprimé');
  renderTournamentScreen();
}

async function leaveTournament(tId, parts) {
  const newParts = parts.filter(id => id !== currentUser.id);
  await supaFetch(`/rest/v1/tournaments?id=eq.${tId}`, {
    method: 'PATCH',
    body: JSON.stringify({ participants: JSON.stringify(newParts) })
  });
  showNotif('🚪 Tu as quitté le tournoi');
  renderTournamentScreen();
}

function showCreateTournament() {
  const popup=document.createElement('div');
  popup.id='createTourneyPopup';
  popup.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;';
  popup.innerHTML=`<div style="background:rgba(10,5,20,0.99);border:1.5px solid #ffd700;border-radius:16px;padding:1.2rem;width:min(320px,90vw);">
    <div style="font-family:'Orbitron',monospace;font-size:0.85rem;color:#ffd700;margin-bottom:0.7rem;text-align:center;">🏆 CRÉER UN TOURNOI</div>
    <input id="tName" placeholder="Nom du tournoi" style="width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:0.42rem 0.6rem;color:#fff;font-size:0.68rem;margin-bottom:0.35rem;box-sizing:border-box;" />
    <select id="tSize" style="width:100%;background:rgba(5,5,15,0.95);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:0.42rem;color:#fff;font-size:0.68rem;margin-bottom:0.65rem;">
      <option value="4">4 joueurs</option><option value="8" selected>8 joueurs</option>
    </select>
    <div style="display:flex;gap:0.5rem;">
      <button onclick="createTournament()" style="flex:1;padding:0.45rem;background:linear-gradient(135deg,rgba(255,215,0,0.15),rgba(255,140,0,0.15));border:1px solid #ffd700;border-radius:8px;color:#ffd700;font-family:'Orbitron',monospace;font-size:0.6rem;cursor:pointer;">CRÉER</button>
      <button onclick="document.getElementById('createTourneyPopup').remove()" style="flex:1;padding:0.45rem;background:transparent;border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:rgba(255,255,255,0.32);font-size:0.6rem;cursor:pointer;">ANNULER</button>
    </div>
  </div>`;
  document.body.appendChild(popup);
}

async function createTournament() {
  const name=(document.getElementById('tName')?.value||'').trim()||`Tournoi de ${currentUser.pseudo}`;
  const size=parseInt(document.getElementById('tSize')?.value||'8');
  const r=await supaFetch('/rest/v1/tournaments',{method:'POST',body:JSON.stringify({name,max_players:size,status:'open',participants:JSON.stringify([currentUser.id]),host_id:currentUser.id,mode:'normal',created_at:new Date().toISOString()})});
  document.getElementById('createTourneyPopup')?.remove();
  if(r.ok){showNotif('🏆 Tournoi créé !');renderTournamentScreen();}else showNotif('❌ Erreur');
}

async function joinTournament(tId) {
  const r=await supaFetch(`/rest/v1/tournaments?id=eq.${tId}&select=*`);
  if(!r.ok||!r.data?.[0]){showNotif('❌ Introuvable');return;}
  const t=r.data[0]; let parts=[];
  try{parts=JSON.parse(t.participants||'[]');}catch(e){}
  if(parts.includes(currentUser.id)){showNotif('✅ Déjà inscrit !');return;}
  if(parts.length>=t.max_players){showNotif('❌ Complet');return;}
  parts.push(currentUser.id);
  const upd={participants:JSON.stringify(parts)};
  if(parts.length>=t.max_players){upd.status='active';upd.bracket=JSON.stringify(parts.reduce((a,_,i,arr)=>i%2===0?[...a,{p1:arr[i],p2:arr[i+1]||'BYE',winner:null}]:a,[]));}
  await supaFetch(`/rest/v1/tournaments?id=eq.${tId}`,{method:'PATCH',body:JSON.stringify(upd)});
  showNotif('⚔️ Tournoi rejoint !');
  renderTournamentScreen();
}

// ═══════════════════════════════════════════════════════════
//  DETAILED GAME OVER STATS
// ═══════════════════════════════════════════════════════════
function renderDetailStats(p, secs) {
  const el=document.getElementById('goDetailStats'); if(!el)return;
  const m=Math.floor(secs/60),s=secs%60;
  const spm=secs>0?Math.round(p.score/secs*60):0;
  [['⏱ Durée',`${m}m ${s}s`],['⚡ Score/min',spm.toLocaleString()],['💀 Kills',p.kills],['🐍 Taille',Math.floor(p.length)],['🏆 Score',p.score.toLocaleString()],['📈 Record',(sd.bestScore||0).toLocaleString()]].forEach(([l,v])=>{
    const d=document.createElement('div');
    d.style.cssText='display:flex;justify-content:space-between;padding:0.1rem 0;border-bottom:1px solid rgba(255,255,255,0.04);';
    d.innerHTML=`<span style="color:rgba(255,255,255,0.38);">${l}</span><span style="color:#fff;font-weight:600;">${v}</span>`;
    el.appendChild(d);
  });
}

function renderRankBlock(best) {
  const el=document.getElementById('goRankBlock'); if(!el)return;
  const RANKS=[{n:'Bronze',m:0,c:'#cd7f32'},{n:'Argent',m:2000,c:'#c0c0c0'},{n:'Or',m:5000,c:'#ffd700'},{n:'Platine',m:10000,c:'#00e5ff'},{n:'Diamant',m:20000,c:'#b9f2ff'},{n:'Maître',m:40000,c:'#bf00ff'}];
  const rank=RANKS.reduce((r,cur)=>best>=cur.m?cur:r,RANKS[0]);
  el.innerHTML=`<div style="font-family:'Orbitron',monospace;font-size:0.65rem;color:${rank.c};">🎖 ${rank.n.toUpperCase()}</div><div style="font-size:0.5rem;color:rgba(255,255,255,0.24);">Record : ${best.toLocaleString()}</div>`;
}

// ═══════════════════════════════════════════════════════════
//  EFFETS VISUELS EN JEU
// ═══════════════════════════════════════════════════════════
// Particules de fond
let bgParticles = [];
function initBgParticles() {
  bgParticles = Array.from({length:40}, () => ({
    x: Math.random() * 2000, y: Math.random() * 2000,
    r: Math.random() * 2 + 0.5,
    speed: Math.random() * 0.3 + 0.05,
    alpha: Math.random() * 0.4 + 0.05,
    color: ['#00f5ff','#ff006e','#39ff14','#ffd700'][Math.floor(Math.random()*4)]
  }));
}
initBgParticles();

// Orbe de collecte (flash quand on mange une nourriture)
let collectFlashes = [];
function addCollectFlash(x, y, color='#ffd700') {
  collectFlashes.push({ x, y, color, r:0, maxR:30, alpha:1, t:0 });
}

// Sillage du serpent (trail amélioré)
let trailParticles = [];
function addTrailParticle(x, y, color) {
  trailParticles.push({ x, y, color, r: Math.random()*3+1, alpha:0.6, vx:(Math.random()-0.5)*0.5, vy:(Math.random()-0.5)*0.5 });
  if (trailParticles.length > 200) trailParticles.shift();
}

// Explosion de mort
let deathExplosions = [];
function addDeathExplosion(x, y, snakeColor) {
  // Limiter le total pour éviter les lags
  if(deathExplosions.length > 100) deathExplosions.splice(0, 30);

  const colors = snakeColor
    ? [snakeColor, '#ffffff', '#ffd700', '#ff006e']
    : ['#ff006e','#ff4400','#ffd700','#ffffff','#ff69b4'];

  // Anneau d'onde de choc
  deathExplosions.push({ x, y, vx:0, vy:0, r:8, alpha:1, color:'#ffffff', isRing:true, ringR:8, ringMax:120 });

  // Éclats primaires — 20 sur mobile, 30 sur desktop
  const count = IS_MOBILE ? 15 : 30;
  for(let i=0;i<count;i++) {
    const angle = Math.random()*Math.PI*2;
    const speed = Math.random()*7+2;
    deathExplosions.push({
      x, y,
      vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed,
      r:Math.random()*5+2, alpha:1,
      color:colors[Math.floor(Math.random()*colors.length)],
      spin:Math.random()*0.3-0.15
    });
  }

  // Débris lents (nourriture qui tombe)
  const debrisCount = IS_MOBILE ? 6 : 15;
  for(let i=0;i<debrisCount;i++) {
    const angle = Math.random()*Math.PI*2;
    const speed = Math.random()*2+0.5;
    deathExplosions.push({
      x:x+(Math.random()-0.5)*40, y:y+(Math.random()-0.5)*40,
      vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed - 1,
      r:Math.random()*3+1, alpha:0.9,
      color:colors[Math.floor(Math.random()*colors.length)],
      gravity:0.15
    });
  }
}

// Fonction d'overlay des effets visuels — à appeler dans la boucle de rendu
function drawVisualEffects(ctx, camX, camY) {
  // Particules de fond (étoiles flottantes)
  // Particules de fond — skip sur mobile (économie significative)
  if(!IS_MOBILE) {
    bgParticles.forEach(p => {
      p.y -= p.speed;
      if (p.y < camY - 50) p.y = camY + canvas.height + 50;
      const sx = p.x - camX, sy = p.y - camY;
      if (sx < -10 || sx > canvas.width+10) return;
      ctx.globalAlpha = p.alpha * (0.5 + 0.5 * Math.sin(Date.now()*0.001 + p.x));
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(sx, sy, p.r, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // Trail serpent
  trailParticles.forEach((p, i) => {
    p.x += p.vx; p.y += p.vy; p.alpha -= 0.025;
    if (p.alpha <= 0) { trailParticles.splice(i,1); return; }
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - camX, p.y - camY, p.r, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  });

  // Flashes de collecte
  collectFlashes.forEach((f, i) => {
    f.r += 2; f.alpha -= 0.08;
    if (f.alpha <= 0) { collectFlashes.splice(i,1); return; }
    ctx.save();
    ctx.globalAlpha = f.alpha;
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(f.x - camX, f.y - camY, f.r, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
  });

  // Explosions de mort
  deathExplosions.forEach((p, i) => {
    if(p.isRing) {
      // Onde de choc circulaire
      p.ringR += 6; p.alpha -= 0.05;
      if(p.alpha <= 0) { deathExplosions.splice(i,1); return; }
      ctx.save();
      ctx.globalAlpha = p.alpha * 0.6;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = p.color; ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(p.x-camX, p.y-camY, p.ringR, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    p.x += p.vx; p.y += p.vy;
    p.vy += (p.gravity || 0.08);
    p.vx *= 0.97; p.vy *= 0.97;
    p.alpha -= 0.03; p.r -= 0.04;
    if(p.alpha <= 0 || p.r <= 0) { deathExplosions.splice(i,1); return; }
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color; ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(p.x-camX, p.y-camY, Math.max(0.1,p.r), 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  });
}

// Grille de fond néon
function drawNeonGrid(ctx, camX, camY, w, h) {
  const gridSize = 80;
  const pulse = 0.15 + 0.05 * Math.sin(Date.now() * 0.0008);
  ctx.save();
  ctx.strokeStyle = `rgba(0,245,255,${pulse})`;
  ctx.lineWidth = 0.4;
  const startX = Math.floor(camX / gridSize) * gridSize;
  const startY = Math.floor(camY / gridSize) * gridSize;
  for (let x = startX; x < camX + w + gridSize; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x - camX, 0); ctx.lineTo(x - camX, h); ctx.stroke();
  }
  for (let y = startY; y < camY + h + gridSize; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y - camY); ctx.lineTo(w, y - camY); ctx.stroke();
  }
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════
//  STATS SCREEN
// ═══════════════════════════════════════════════════════════
function showStatsScreen() {
  showScreen('statsScreen');
  const content = document.getElementById('statsContent');
  if (!content) return;
  content.innerHTML = '';
  try {

  const history = sd.gamesHistory || [];
  const totalGames  = history.length;
  const totalKillsH = history.reduce((a,g) => a+(g.kills||0), 0);
  const bestScore   = history.reduce((a,g) => Math.max(a,g.score||0), 0);
  const avgScore    = totalGames > 0 ? Math.round(history.reduce((a,g)=>a+(g.score||0),0)/totalGames) : 0;
  const avgKills    = totalGames > 0 ? (totalKillsH/totalGames).toFixed(1) : '0';
  const avgDur      = totalGames > 0 ? Math.round(history.reduce((a,g)=>a+(g.duration||0),0)/totalGames) : 0;

  const RANKS = [{n:'Bronze',m:0,c:'#cd7f32'},{n:'Argent',m:2000,c:'#c0c0c0'},{n:'Or',m:5000,c:'#ffd700'},{n:'Platine',m:10000,c:'#00e5ff'},{n:'Diamant',m:20000,c:'#b9f2ff'},{n:'Maître',m:40000,c:'#bf00ff'}];
  const rank = RANKS.reduce((r,cur) => (sd.bestScore||0)>=cur.m ? cur : r, RANKS[0]);

  // Bloc rang + moyennes
  const globalBlock = document.createElement('div');
  globalBlock.style.cssText = 'background:rgba(0,229,255,0.06);border:1px solid rgba(0,229,255,0.2);border-radius:12px;padding:0.8rem;margin-bottom:0.6rem;';
  globalBlock.innerHTML = `
    <div style="text-align:center;margin-bottom:0.5rem;">
      <div style="font-family:'Orbitron',monospace;font-size:1rem;color:${rank.c};">🎖 ${rank.n.toUpperCase()}</div>
      <div style="font-size:0.55rem;color:rgba(255,255,255,0.3);margin-top:0.1rem;">Record : ${(sd.bestScore||0).toLocaleString()} pts</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.4rem;text-align:center;">
      ${[['🎮','Parties',totalGames],['💀','Kills tot.',(sd.totalKills||0).toLocaleString()],['🏆','Record',(sd.bestScore||0).toLocaleString()],['⭐','Moy. score',avgScore.toLocaleString()],['🔪','Moy. kills',avgKills],['⏱','Moy. durée',Math.floor(avgDur/60)+'m'+avgDur%60+'s']].map(([e,l,v])=>
        `<div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:0.4rem 0.2rem;">
          <div style="font-size:0.9rem;">${e}</div>
          <div style="font-family:'Orbitron',monospace;font-size:0.6rem;color:#00e5ff;">${v}</div>
          <div style="font-size:0.48rem;color:rgba(255,255,255,0.3);">${l}</div>
        </div>`).join('')}
    </div>`;
  content.appendChild(globalBlock);

  // Titre historique
  const histTitle = document.createElement('div');
  histTitle.style.cssText = 'font-family:Orbitron,monospace;font-size:0.55rem;color:rgba(255,255,255,0.3);margin-bottom:0.4rem;letter-spacing:0.1em;';
  histTitle.textContent = 'DERNIÈRES PARTIES (' + totalGames + ')';
  content.appendChild(histTitle);

  if (!history.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;color:rgba(255,255,255,0.2);font-size:0.62rem;padding:1.5rem;';
    empty.textContent = 'Joue ta première partie pour voir tes stats ici !';
    content.appendChild(empty);
    return;
  }

  history.forEach((g, i) => {
    const d   = new Date(g.date||Date.now());
    const ds  = d.getDate().toString().padStart(2,'0')+'/'+(d.getMonth()+1).toString().padStart(2,'0')+' '+d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0');
    const m   = Math.floor((g.duration||0)/60), s = (g.duration||0)%60;
    const spm = g.duration>0 ? Math.round((g.score||0)/g.duration*60) : 0;
    const isRecord = (g.score||0) === bestScore && i === history.findIndex(x=>x.score===bestScore);
    const div = document.createElement('div');
    div.style.cssText = 'background:rgba(255,255,255,0.03);border:1px solid '+(isRecord?'rgba(255,215,0,0.3)':'rgba(255,255,255,0.07)')+';border-radius:8px;padding:0.45rem 0.6rem;margin-bottom:0.3rem;';
    div.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.2rem;">' +
        '<div style="display:flex;align-items:center;gap:0.3rem;">' +
          (isRecord?'<span style="font-size:0.7rem;">🏆</span>':'<span style="font-family:Orbitron,monospace;font-size:0.5rem;color:rgba(255,255,255,0.25);">#'+(i+1)+'</span>') +
          '<span style="font-family:Orbitron,monospace;font-size:0.65rem;color:'+(isRecord?'#ffd700':'#00e5ff')+';">'+(g.score||0).toLocaleString()+'</span>' +
        '</div>' +
        '<span style="font-size:0.5rem;color:rgba(255,255,255,0.25);">'+ds+'</span>' +
      '</div>' +
      '<div style="display:flex;gap:0.8rem;font-size:0.55rem;color:rgba(255,255,255,0.45);">' +
        '<span>💀 '+(g.kills||0)+' kills</span><span>⏱ '+m+'m'+s+'s</span><span>⚡ '+spm+'/min</span><span>🐍 '+(g.length||0)+'</span>' +
      '</div>';
    content.appendChild(div);
  });
  } catch(e) {
    content.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.3);padding:2rem;font-size:0.7rem;">Erreur chargement stats.<br>Joue une partie pour initialiser.</div>';
  }
}


// ═══════════════════════════════════════════════════════════
//  GESTION TRANSITIONS DE SAISON
// ═══════════════════════════════════════════════════════════

// Vérifié au login et à l'ouverture de l'écran saison
async function checkSeasonTransition() {
  const season   = getCurrentSeason();
  const seasonKey = 'season_' + season.num;
  const lastSeasonKey = sd.lastSeasonKey || null;

  // Même saison, rien à faire
  if (lastSeasonKey === seasonKey) return;

  // Nouvelle saison détectée !
  if (lastSeasonKey !== null) {
    // Ancienne saison terminée → afficher popup bilan
    showSeasonEndPopup(lastSeasonKey);
  }

  // Reset XP de saison et récompenses réclamées pour la nouvelle saison
  sd.seasonXP        = 0;
  sd.claimedBPRewards = [];
  sd.lastSeasonKey   = seasonKey;

  await saveNow(false).catch(() => {});
  updateSeasonUI();
  renderBPTrack();
}

function showSeasonEndPopup(oldSeasonKey) {
  const oldNum  = parseInt((oldSeasonKey || 'season_1').split('_')[1]) || 1;
  const oldSeason = SEASONS.find(s => s.num === oldNum) || SEASONS[0];
  const newSeason = getCurrentSeason();

  const popup = document.createElement('div');
  popup.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);';
  popup.innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(10,5,25,0.99),rgba(20,5,40,0.99));border:2px solid ${newSeason.color};border-radius:20px;padding:1.5rem 1.2rem;width:min(360px,92vw);text-align:center;box-shadow:0 0 50px ${newSeason.color}40;">
      <div style="font-size:2rem;margin-bottom:0.4rem;">${oldSeason.emoji}</div>
      <div style="font-family:'Orbitron',monospace;font-size:0.7rem;color:rgba(255,255,255,0.4);margin-bottom:0.2rem;">SAISON ${oldNum} TERMINÉE</div>
      <div style="font-family:'Orbitron',monospace;font-size:1rem;color:${oldSeason.color};margin-bottom:0.8rem;">${oldSeason.name}</div>
      <div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:0.6rem;margin-bottom:0.8rem;font-size:0.6rem;color:rgba(255,255,255,0.5);">
        Tes récompenses débloquées ont été gardées.<br>Ton XP de saison est remis à zéro.
      </div>
      <div style="font-size:1.5rem;margin-bottom:0.3rem;">${newSeason.emoji}</div>
      <div style="font-family:'Orbitron',monospace;font-size:0.6rem;color:rgba(255,255,255,0.4);margin-bottom:0.2rem;">NOUVELLE SAISON</div>
      <div style="font-family:'Orbitron',monospace;font-size:0.95rem;color:${newSeason.color};margin-bottom:0.8rem;">SAISON ${newSeason.num} — ${newSeason.name}</div>
      <button onclick="this.closest('div[style]').remove()" style="width:100%;padding:0.65rem;background:linear-gradient(135deg,${newSeason.color},${newSeason.color}88);border:none;border-radius:12px;font-family:'Orbitron',monospace;font-size:0.75rem;font-weight:900;color:#000;cursor:pointer;">
        ${newSeason.emoji} C'EST PARTI !
      </button>
    </div>`;
  document.body.appendChild(popup);
}


// ═══════════════════════════════════════════════════════════
//  SYSTÈME PUB GOOGLE ADSENSE
// ═══════════════════════════════════════════════════════════
let adCallback = null;
let adTimerInterval = null;

function showAdThenDo(callback) {
  adCallback = callback;
  const overlay = document.getElementById('adOverlay');
  overlay.style.display = 'flex';

  // Charger la pub AdSense
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch(e) {}

  // Reset UI
  const countdown = document.getElementById('adCountdown');
  const closeBtn  = document.getElementById('adCloseBtn');
  const timerSpan = document.getElementById('adTimer');
  countdown.style.display = 'block';
  closeBtn.style.display  = 'none';

  let seconds = 5;
  timerSpan.textContent = seconds;

  clearInterval(adTimerInterval);
  adTimerInterval = setInterval(() => {
    seconds--;
    timerSpan.textContent = seconds;
    if (seconds <= 0) {
      clearInterval(adTimerInterval);
      countdown.style.display = 'none';
      closeBtn.style.display  = 'block';
    }
  }, 1000);
}

function closeAdAndRestart() {
  document.getElementById('adOverlay').style.display = 'none';
  clearInterval(adTimerInterval);
  if (adCallback) { adCallback(); adCallback = null; }
}
