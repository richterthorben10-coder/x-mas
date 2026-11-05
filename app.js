(()=>{'use strict';
const $=id=>document.getElementById(id);
const money=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(Number(v)||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sections=['loading','setup','auth','onboard','app'];
const showSection=id=>sections.forEach(s=>$(s).classList.toggle('hidden',id!==s));
function notify(str,ok=false){let e=$('message');e.textContent=str;e.classList.toggle('ok',ok);e.classList.remove('hidden');}
function clearMessage(){$('message').classList.add('hidden')}
const cfg=window.GESCHENKE_CONFIG;
if(!cfg||!/^https:\/\/[\w-]+\.supabase\.co$/.test(cfg.supabaseUrl)||!cfg.supabaseKey||cfg.supabaseKey.startsWith('DEIN-')||!window.supabase){showSection('setup');return}
const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
let uid=null,household=null,people=[],gifts=[],channel=null,dialog=null,refreshId=0;
const stage=g=>g.wrapped?2:g.bought?1:0;
const sorted=arr=>[...arr].sort((a,b)=>stage(a)-stage(b)||new Date(a.created_at)-new Date(b.created_at));
function fmtError(e){const msg=e?.message||String(e);if(/Failed to fetch|network|fetch failed/i.test(msg))return 'Keine Internetverbindung oder Cloud nicht erreichbar. Deine Änderung wurde nicht gespeichert.';return msg}
async function run(fn){try{clearMessage();await fn()}catch(e){notify(fmtError(e));console.error(e)}}
async function refresh(){if(!uid||!household)return;let current=++refreshId;
 const [pr,gr]=await Promise.all([db.from('people').select('id,household_id,name,budget,created_at').eq('household_id',household.id).order('created_at'),db.from('gifts').select('id,person_id,name,price,bought,wrapped,created_at').order('created_at')]);
 if(pr.error)throw pr.error;if(gr.error)throw gr.error;if(current!==refreshId)return;
 people=pr.data;gifts=gr.data;render();}
function listen(){if(channel)db.removeChannel(channel);channel=db.channel('geschenke-'+household.id)
 .on('postgres_changes',{event:'*',schema:'public',table:'people',filter:'household_id=eq.'+household.id},()=>run(refresh))
 .on('postgres_changes',{event:'*',schema:'public',table:'gifts'},()=>run(refresh))
 .subscribe(status=>{$('live').textContent=status==='SUBSCRIBED'?'● Live-Synchronisierung aktiv':'● Cloud verbunden · Live: '+status;});}
async function loadHouse(){const {data:membership,error}=await db.from('household_members').select('household_id').eq('user_id',uid).maybeSingle();if(error)throw error;
 if(!membership){household=null;showSection('onboard');return}
 const {data,error:he}=await db.from('households').select('id,name,invite_code').eq('id',membership.household_id).single();if(he)throw he;
 household=data;showSection('app');await refresh();listen();}
async function syncAuth(session){if(channel){await db.removeChannel(channel);channel=null}household=null;people=[];gifts=[];uid=session?.user?.id||null;refreshId++;
 if(!uid){showSection('auth');return}showSection('loading');await loadHouse()}
// Schutz gegen doppelt ausgelöste INITIAL_SESSION Events.
let authTicket=0;
async function authFlow(session){let ticket=++authTicket;try{await syncAuth(session)}catch(e){if(ticket===authTicket){notify(fmtError(e));showSection('auth')}}}
db.auth.onAuthStateChange((event,session)=>{if(['INITIAL_SESSION','SIGNED_IN','SIGNED_OUT','USER_UPDATED'].includes(event))setTimeout(()=>authFlow(session),0)});
$('authForm').addEventListener('submit',e=>{e.preventDefault();run(async()=>{let email=e.target.email.value.trim(),password=e.target.password.value;const {error}=await db.auth.signInWithPassword({email,password});if(error)throw error;notify('Erfolgreich angemeldet.',true)})});
$('signup').onclick=()=>run(async()=>{let f=$('authForm');if(!f.reportValidity())return;let email=f.email.value.trim(),password=f.password.value;const {data,error}=await db.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error;notify(data.session?'Konto angelegt und angemeldet.':'Konto angelegt. Bitte prüfe dein E-Mail-Postfach und bestätige deine Adresse.',true)});
async function logout(){const {error}=await db.auth.signOut();if(error)throw error;}
$('logout').onclick=()=>run(logout);$('logoutOnboard').onclick=()=>run(logout);
$('createHouse').onclick=()=>run(async()=>{let {error}=await db.rpc('create_household');if(error)throw error;await loadHouse();notify('Liste angelegt. Teile jetzt den Einladungscode.',true);openInvite()});
$('joinForm').addEventListener('submit',e=>{e.preventDefault();run(async()=>{let code=$('joinCode').value.trim();let {error}=await db.rpc('join_household',{code});if(error)throw error;await loadHouse();notify('Du bist eurer gemeinsamen Liste beigetreten!',true)})});
function render(){const q=$('search').value.trim().toLocaleLowerCase('de');$('countGifts').textContent=gifts.length;$('countOpen').textContent=gifts.filter(g=>!g.bought).length;$('countWrap').textContent=gifts.filter(g=>!g.wrapped).length;
 const list=[...people].sort((a,b)=>{let sa=gifts.filter(g=>g.person_id===a.id),sb=gifts.filter(g=>g.person_id===b.id);let ma=sa.length?Math.min(...sa.map(stage)):0,mb=sb.length?Math.min(...sb.map(stage)):0;return ma-mb||a.name.localeCompare(b.name,'de')});
 $('people').innerHTML=list.map(p=>{let all=sorted(gifts.filter(g=>g.person_id===p.id));let shown=all.filter(g=>!q||p.name.toLocaleLowerCase('de').includes(q)||g.name.toLocaleLowerCase('de').includes(q));if(q&&!shown.length)return '';let total=all.reduce((sum,g)=>sum+Number(g.price),0),budget=Number(p.budget),over=total>budget;
 return `<section class="person"><div class="person-head"><div class="avatar">${esc(p.name.trim().slice(0,1).toUpperCase())}</div><div class="grow"><div class="person-name">${esc(p.name)}</div><div class="sub">${all.length} Geschenke · ${all.filter(g=>g.wrapped).length} fertig</div></div><div style="text-align:right"><div class="money ${over?'over':''}">${money(total)} / ${money(budget)}</div><div class="sub">${over?'Budget um '+money(total-budget)+' überschritten':money(budget-total)+' übrig'}</div></div><button class="more" data-action="editPerson" data-id="${p.id}" aria-label="${esc(p.name)} bearbeiten">⋯</button></div><div class="bar"><div class="${over?'over':''}" style="width:${budget?Math.min(100,total/budget*100):0}%"></div></div><div class="gifts">${shown.length?shown.map(g=>`<div class="gift ${g.wrapped?'done':''}"><div class="gift-main"><div class="gift-title">${esc(g.name)}</div><div class="gift-price">${money(g.price)}</div></div><div class="checks"><button class="check ${g.bought?'active':''}" data-action="bought" data-id="${g.id}" aria-label="${esc(g.name)} besorgt: ${g.bought?'ja':'nein'}"><span>${g.bought?'✓':'○'}</span>Besorgt</button><button class="check ${g.wrapped?'active':''}" data-action="wrapped" data-id="${g.id}" ${!g.bought?'disabled':''} aria-label="${esc(g.name)} eingepackt: ${g.wrapped?'ja':'nein'}"><span>${g.wrapped?'✓':'○'}</span>Verpackt</button><button class="more" data-action="editGift" data-id="${g.id}" aria-label="${esc(g.name)} bearbeiten">⋯</button></div></div>`).join(''):'<div class="empty">Noch keine Geschenke erfasst</div>'}</div><div class="person-bottom"><span class="sub">${all.filter(g=>!g.bought).length} offen · ${all.filter(g=>g.bought&&!g.wrapped).length} zu verpacken</span><button class="btn ghost" data-action="addFor" data-id="${p.id}">＋ Geschenk</button></div></section>`}).join('')||'<div class="empty">Noch nichts vorhanden. Starte mit „+ Person“.</div>';
}
function open(type,id){const p=people.find(x=>x.id===id),g=gifts.find(x=>x.id===id),isPerson=type.includes('Person'),editing=type.startsWith('edit');if(!isPerson&&!people.length){notify('Bitte zuerst eine Person anlegen.');return}dialog={type,id};$('modalTitle').textContent=isPerson?(editing?'Person bearbeiten':'Person hinzufügen'):(editing?'Geschenk bearbeiten':'Geschenk hinzufügen');$('modalDesc').textContent=isPerson?'Lege ein Budget pro Person fest.':'Erfasse die Geschenkidee und ihren Preis.';$('remove').classList.toggle('hidden',!editing);
 $('fields').innerHTML=isPerson?`<label>Name<input name="name" required maxlength="80" placeholder="z. B. Oma" value="${esc(p?.name||'')}"></label><label>Budget in Euro<input name="budget" type="number" inputmode="decimal" min="0" max="999999" step="0.01" required value="${p?p.budget:''}"></label>`:
 `<label>Empfänger<select name="person_id" required>${people.map(x=>`<option value="${x.id}" ${x.id===(type==='addFor'?id:g?.person_id)?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label><label>Was ist das Geschenk?<input name="name" required maxlength="160" placeholder="z. B. Buch, Spielzeug, Gutschein" value="${esc(g?.name||'')}"></label><label>Kosten in Euro<input name="price" type="number" inputmode="decimal" min="0" max="999999" step="0.01" required value="${g?g.price:''}"></label>`;
 $('veil').classList.remove('hidden');$('fields').querySelector('input')?.focus();}
function close(){$('veil').classList.add('hidden');dialog=null}
$('editForm').addEventListener('submit',e=>{e.preventDefault();run(async()=>{const f=new FormData(e.target),d=dialog;if(!d)return;let name=String(f.get('name')||'').trim();if(!name)throw Error('Bitte einen Namen eingeben');let person=d.type.includes('Person'),edit=d.type.startsWith('edit');let table=person?'people':'gifts';let values=person?{name,budget:Number(f.get('budget'))}:{name,price:Number(f.get('price')),person_id:f.get('person_id')};if(person&&!edit)values.household_id=household.id;
 const {error}=edit?await db.from(table).update(values).eq('id',d.id):await db.from(table).insert(values);if(error)throw error;close();await refresh();notify('Änderung gespeichert.',true)})});
$('remove').onclick=()=>run(async()=>{let d=dialog;if(!d)return;let person=d.type==='editPerson';if(!confirm(person?'Person und alle Geschenke wirklich löschen?':'Geschenk wirklich löschen?'))return;const {error}=await db.from(person?'people':'gifts').delete().eq('id',d.id);if(error)throw error;close();await refresh();notify('Gelöscht.',true)});
$('cancel').onclick=close;$('veil').onclick=e=>{if(e.target===$('veil'))close()};$('addPerson').onclick=()=>open('addPerson');$('addGift').onclick=()=>open('addGift');$('search').oninput=render;
$('people').addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b)return;let {action,id}=b.dataset;if(['editPerson','editGift','addFor'].includes(action)){open(action,id);return}
 run(async()=>{const g=gifts.find(x=>x.id===id);if(!g)return;let values=action==='bought'?{bought:!g.bought,wrapped:g.bought?false:g.wrapped}:action==='wrapped'&&g.bought?{wrapped:!g.wrapped}:null;if(!values)return;b.disabled=true;const {error}=await db.from('gifts').update(values).eq('id',id);if(error)throw error;await refresh()});});
function openInvite(){$('inviteCode').value=household.invite_code;$('inviteVeil').classList.remove('hidden')}
$('invite').onclick=openInvite;$('closeInvite').onclick=()=>$('inviteVeil').classList.add('hidden');
$('inviteVeil').onclick=e=>{if(e.target===$('inviteVeil'))$('inviteVeil').classList.add('hidden')};
$('copyCode').onclick=()=>run(async()=>{try{await navigator.clipboard.writeText($('inviteCode').value)}catch{ $('inviteCode').select();document.execCommand('copy')}notify('Einladungscode kopiert.',true)});
$('rotateCode').onclick=()=>run(async()=>{if(!confirm('Den bisherigen Einladungscode ungültig machen?'))return;const {data,error}=await db.rpc('rotate_invite_code');if(error)throw error;household.invite_code=data;$('inviteCode').value=data;notify('Neuer Einladungscode erstellt.',true)});
$('import').onclick=()=>$('importFile').click();
$('importFile').onchange=e=>run(async()=>{
 const file=e.target.files?.[0];e.target.value='';if(!file)return;
 const data=JSON.parse(await file.text());
 if(!Array.isArray(data.people)||!Array.isArray(data.gifts)||data.people.length>250||data.gifts.length>3000)throw Error('Ungültige oder zu große Sicherungsdatei');
 if(!data.people.every(p=>typeof p.id==='string'&&typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=80&&Number.isFinite(Number(p.budget))&&Number(p.budget)>=0))throw Error('Die Personendaten sind ungültig');
 if(!data.gifts.every(g=>typeof g.name==='string'&&g.name.trim().length>0&&g.name.length<=160&&Number.isFinite(Number(g.price))&&Number(g.price)>=0&&typeof (g.personId??g.person_id)==='string'))throw Error('Die Geschenkdaten sind ungültig');
 if(!confirm('Sicherung zur gemeinsamen Liste hinzufügen? Bereits vorhandene Einträge bleiben erhalten. Die Einträge aus der Datei werden neu angelegt.'))return;
 const ids=new Map();
 // Durch Einzelimporte ist das keine atomare Gesamttransaktion.
 for(const p of data.people){const {data:created,error}=await db.from('people').insert({household_id:household.id,name:p.name.trim(),budget:Number(p.budget)}).select('id').single();if(error)throw Error('Import teilweise abgeschlossen: '+error.message);ids.set(p.id,created.id)}
 for(const g of data.gifts){const pid=ids.get(g.personId??g.person_id);if(!pid)throw Error('Import teilweise abgeschlossen: Geschenk ohne zugehörige Person');const bought=Boolean(g.bought),wrapped=bought&&Boolean(g.wrapped);const {error}=await db.from('gifts').insert({person_id:pid,name:g.name.trim(),price:Number(g.price),bought,wrapped});if(error)throw Error('Import teilweise abgeschlossen: '+error.message)}
 await refresh();notify('Sicherung in die gemeinsame Liste importiert.',true)
});
$('backup').onclick=()=>{let backup={version:2,exported:new Date().toISOString(),people:people.map(p=>({id:p.id,name:p.name,budget:p.budget})),gifts:gifts.map(g=>({personId:g.person_id,name:g.name,price:g.price,bought:g.bought,wrapped:g.wrapped}))};let blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});let url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='geschenke-sicherung-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();$('inviteVeil').classList.add('hidden')}});
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
