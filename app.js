function duaCards(items) {
  return `<div class="dua-grid">${items.map(d=>`<article class="content-card"><span class="eyebrow">${d.label}</span><p class="arabic">${d.text}</p><small>${d.source}</small>${d.surah?`<a class="text-link" href="#quran/${d.surah}/${d.ayah}">قراءة الآية في المصحف</a>`:''}</article>`).join('')}</div>`;
}
import {prayerView, bindPrayer, qiblaView, bindQibla} from './prayer.js';
import {names,duas,azkar,normalize,validateQuran} from './data.js';
const $=s=>document.querySelector(s),num=n=>Number(n).toLocaleString('ar-EG'),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d;}catch{return d;}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{return false;}};
let quran=null,loading=null,page='home',category='بعد الصلاة',counts={},font=Number(read('font',30))||30,playing=null;
let bookmark=read('bookmark',null),tasbih=Number(read('tasbih',0))||0;
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const label = theme === 'dark' ? 'التبديل إلى المظهر الأبيض' : 'التبديل إلى المظهر الأخضر';
  $('#theme').setAttribute('aria-label', label);
  $('#theme').title = label;
}
applyTheme(read('theme', 'dark') === 'light' ? 'light' : 'dark');
$('#theme').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';applyTheme(t);save('theme',t);};
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),3000);}
const icons={book:'▤',azkar:'☼',dua:'♡',tasbih:'◉'};
const familyReadings = [
  {surah: 2, first: 1, last: 28, title: 'سورة الفاتحة ثم سورة البقرة', description: 'الفاتحة ثم سورة البقرة من الآية ١ إلى الآية ٢٨', file: 'grandfather-recitation.mp3'},
  {surah: 27, first: 61, last: 66, title: 'سورة النمل', description: 'من الآية ٦١ إلى الآية ٦٦', file: 'grandfather-naml.mp3'}
];

function familyPlayer(reading) {
  return `<p>${reading.description}</p><audio controls preload="none" style="width:100%" aria-label="تلاوة جدي من ${reading.title}" src="./${reading.file}"></audio>`;
}

function familyReadingsPage() {
  return heading('تلاوات جدي', 'من صلاته بالناس، رحمه الله.') + familyReadings.map(reading =>
    `<section class="content-card"><h2>${reading.title}</h2>${familyPlayer(reading)}${reading.surah === 2 ? '<a class="text-link" href="#quran/1/1">اقرأ سورة الفاتحة</a> · ' : ''}<a class="text-link" href="#quran/${reading.surah}/${reading.first}">اقرأ المقطع في المصحف</a></section>`
  ).join('');
}

function heading(title,sub){return `<div class="page-heading"><span class="eyebrow">وَاذْكُر رَّبَّكَ كَثِيرًا</span><h1>${title}</h1><p>${sub}</p></div>`;}
function home(){return `<section class="hero"><div class="hero-copy"><span class="eyebrow">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span><h1>نورٌ لقلوبنا<br><em>وأجرٌ لمن نحب</em></h1><p>مساحة للقرآن والذكر والدعاء، نهدي أجرها لأحبتنا<br>الذين رحلوا، وبقي حبهم ودعاؤنا لهم.</p><div class="hero-actions"><button class="primary" data-page="quran">ابدأ قراءة القرآن <span>▤</span></button><button class="secondary" data-page="dua">ادعُ لمن تحب</button></div><div class="hero-caption">١١٤ سورة <span>✦</span> تلاوة وذكر <span>✦</span> أثرٌ باقٍ بإذن الله</div></div><div class="arch" aria-hidden="true"><div class="arch-inner"><span class="ornament">۞</span><div class="calligraphy">القرآن<br>الكريم</div><span class="arch-line"></span><p>هُدًى وَرَحْمَةٌ لِّلْمُؤْمِنِينَ</p><small>من سورة يونس · الآية ٥٧</small></div></div></section>
<section class="dedication"><span class="dedication-symbol">♡</span><div><span class="eyebrow">اللهم ارحم من اشتاقت لهم أرواحنا</span><h2>صدقة جارية على أرواح</h2><div class="names">${names.map(n=>`<span>${n}</span>`).join('')}</div><p>اللهم اغفر لهم وارحمهم، واجعل قبورهم روضةً من رياض الجنة.</p></div></section>
<section class="content-card" style="margin-top:20px"><h2>تلاوات جدي</h2><a class="secondary" href="#recitations">استمع إلى الفاتحة والبقرة والنمل</a></section><section class="section"><div class="section-title"><div><span class="eyebrow">لحظات تقرّبك إلى الله</span><h2>رفيقك في رحلة الطمأنينة</h2></div><span class="muted">خيرٌ يتجدد كل يوم</span></div><div class="feature-grid">${[['quran','book','القرآن الكريم','اقرأ سور القرآن، واستمع وتابع وردك.'],['azkar','azkar','أذكارك اليومية','أذكار مأثورة ترافق يومك وليلتك.'],['dua','dua','الدعاء حياة','أدعية من القرآن ولمن سكنوا قلوبنا.'],['tasbih','tasbih','المسبحة الإلكترونية','لحظة هدوء، وذكرٌ يطمئن به قلبك.']].map(([p,i,t,d])=>`<button class="feature" data-page="${p}"><span class="feature-icon">${icons[i]}</span><h3>${t}</h3><p>${d}</p><span class="feature-link">${p==='quran'?'تصفح المصحف':'ابدأ الآن'}</span></button>`).join('')}</div></section>
<section class="quote"><span>✦</span><p>رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ</p><small>سورة إبراهيم · الآية ٤١</small></section>`;}
const textCacheName = 'quran-uthmani-text-v1';
const textKey = new URL('./offline-quran.json', document.baseURI).href;
function offlineStatus(message) {
  document.querySelector('#quran-offline').textContent = message;
}
async function prepareQuran() {
  let cache;
  try {
    cache = await caches.open(textCacheName);
    const stored = await cache.match(textKey);
    if (stored) {
      const chapters = await stored.json();
      if (validateQuran(chapters)) {
        quran = chapters;
        reportSaved();
        return chapters;
      }
    }
  } catch { /* Reading online remains available when device storage is restricted. */ }
  let chapters = read('quran-uthmani-v1', null);
  if (!validateQuran(chapters)) {
    offlineStatus('جارٍ تنزيل المصحف كاملًا للقراءة دون إنترنت…');
    for (const host of ['https://api.alquran.cloud','https://alquran.api.islamic.network']) {
      try {
        const response = await fetch(host + '/v1/quran/quran-uthmani', {signal:AbortSignal.timeout(30000)});
        if (!response.ok) continue;
        const candidate = (await response.json()).data?.surahs;
        if (validateQuran(candidate)) { chapters = candidate; break; }
      } catch { /* Try the second Quran endpoint. */ }
    }
    if (!validateQuran(chapters)) {
      const message = 'لم يكتمل تنزيل المصحف. اتصل بالإنترنت ثم افتح فهرس السور لإعادة المحاولة.';
      offlineStatus(message);
      throw Error(message);
    }
  }
  quran = chapters;
  try {
    if (!cache) throw Error();
    await cache.put(textKey, new Response(JSON.stringify(chapters), {headers:{'Content-Type':'application/json'}}));
    reportSaved();
  } catch {
    if (save('quran-uthmani-v1', chapters)) reportSaved();
    else offlineStatus('المصحف مفتوح الآن، لكن تعذّر حفظه على الجهاز. تحقق من مساحة التخزين ثم أعد فتح التطبيق.');
  }
  return chapters;
}
function reportSaved() {
  offlineStatus('تم حفظ نص المصحف كاملًا على هذا الجهاز.');
  if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(() => {
    offlineStatus('المصحف كاملًا جاهز للقراءة دون إنترنت.');
  });
}
async function loadQuran() {
  if (quran) return quran;
  if (!loading) loading = prepareQuran().finally(() => { loading = null; });
  return loading;
}

function route(p){location.hash=p;}
document.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)route(b.dataset.page);});
async function render(){const parts=location.hash.slice(1).split('/');page=parts[0]||'home';if(!['home','quran','azkar','dua','tasbih','prayer','qibla','recitations'].includes(page))page='home';document.querySelectorAll('nav button').forEach(b=>{b.classList.toggle('active',b.dataset.page===page);b.setAttribute('aria-current',b.dataset.page===page?'page':'false');});$('#main').innerHTML=page==='home'?home():page==='recitations'?familyReadingsPage():page==='quran'?heading('القرآن الكريم','كلام الله، نورٌ يهدي القلوب.')+'<div class="empty" role="status">جارٍ تحميل المصحف الكريم…</div>':page==='dua'?heading('الدعاء حياة','اللهم تقبّل دعاءنا، وارحم أحبتنا.')+`<section class="content-card"><h2>دعاء بصوت جدي</h2><p>من دعائه في الصلاة · ٣:٤٥</p><audio controls preload="none" style="width:100%" aria-label="دعاء جدي في الصلاة" src="./grandfather-dua.mp3"></audio></section><label class="dua-filter">موضوع الدعاء <select id="dua-topic"><option value="">كل الأدعية</option>${[...new Set(duas.map(d=>d.topic))].map(t=>'<option>'+t+'</option>').join('')}</select></label><div id="dua-results">${duaCards(duas)}</div>`:page==='azkar'?azkarView():page==='prayer'?prayerView():page==='qibla'?qiblaView():tasbihView();window.scrollTo({top:0});if(page==='quran'){const currentHash=location.hash;try{await loadQuran();if(location.hash!==currentHash)return;const s=Number(parts[1]);if(s>=1&&s<=114){showSurah(s,Number(parts[2])||0);}else showIndex();}catch(e){if(location.hash===currentHash){$('#main').innerHTML=heading('القرآن الكريم','')+`<div class="empty"><p>${esc(e.message)}</p><button class="primary" id="retry">إعادة المحاولة</button></div>`;$('#retry').onclick=render;}}}if(page==='dua') $('#dua-topic').onchange = event => { const topic = event.target.value; $('#dua-results').innerHTML = duaCards(topic ? duas.filter(d => d.topic === topic) : duas); };if(page==='azkar')bindAzkar();if(page==='tasbih')bindTasbih();if(page==='prayer')bindPrayer();if(page==='qibla')bindQibla();}
function showIndex(){$('#main').innerHTML=heading('القرآن الكريم','١١٤ سورة · بالرسم العثماني')+`${bookmark?`<button class="resume" id="resume">▤ متابعة القراءة من ${esc(bookmark.name)} · الآية ${num(bookmark.ayah)}</button>`:''}<label class="search"><span>⌕</span><input id="search" type="search" placeholder="ابحث باسم السورة أو رقمها…" aria-label="ابحث باسم السورة أو رقمها"></label><div id="surahs" class="surah-grid"></div>`;if(bookmark)$('#resume').onclick=()=>route(`quran/${bookmark.surah}/${bookmark.ayah}`);const draw=()=>{const query=normalize($('#search').value.trim());const filtered=quran.filter(s=>normalize(s.name).includes(query)||String(s.number)===query||num(s.number)===query);$('#surahs').innerHTML=filtered.length?filtered.map(s=>`<a class="surah-card" href="#quran/${s.number}"><span class="surah-number">${num(s.number)}</span><div><h3>${esc(s.name)}</h3><small>${s.revelationType==='Meccan'?'مكية':'مدنية'} · ${num(s.ayahs.length)} آية</small></div><span class="muted">جزء ${num(s.ayahs[0].juz)}</span></a>`).join(''):'<p class="empty">لا توجد سورة بهذا الاسم أو الرقم.</p>';};$('#search').oninput=draw;draw();}
function showSurah(n, target) {
  const surah = quran[n - 1];
  const current = surah.ayahs[target - 1] || surah.ayahs[0];
  const page = current.page;
  const sections = [];
  let previous, next;
  for (const chapter of quran) {
    const verses = chapter.ayahs.filter(verse => verse.page === page);
    if (verses.length) sections.push({chapter, verses});
    for (const verse of chapter.ayahs) {
      if (verse.page === page - 1 && !previous) previous = [chapter.number, verse.numberInSurah];
      if (verse.page === page + 1 && !next) next = [chapter.number, verse.numberInSurah];
    }
  }
  const link = (point, label) => point ? `<a class="secondary" href="#quran/${point.join('/')}">${label}</a>` : '<span></span>';
  $('#main').innerHTML = `<div class="reader-toolbar"><button class="secondary" data-page="quran">فهرس السور</button>
    <label>حجم الخط <input id="font" type="range" min="24" max="48" value="${font}"></label>
    <button class="secondary" id="save-page">حفظ موضع القراءة</button></div>
    <section class="reader" style="--quran-size:${font}px;border:4px double var(--gold)">
    <div class="section-title"><small>الجزء ${num(current.juz)}</small><small>صفحة ${num(page)}</small></div>
    ${sections.map(({chapter, verses}) => `<section><div class="surah-title"><h2>${esc(chapter.name)}</h2>
      <button class="secondary" data-listen="${chapter.number}">استماع للسورة كاملة ▷</button></div>
      ${familyReadings.filter(r => (chapter.number === 1 && r.surah === 2) || r.surah === chapter.number && verses.some(v => v.numberInSurah >= r.first && v.numberInSurah <= r.last)).map(r => `<aside class="content-card"><strong>تلاوة جدي</strong>${familyPlayer(r)}</aside>`).join('')}
      <p style="font:var(--quran-size)/2.15 Amiri,'Traditional Arabic',serif;text-align:justify">
      ${verses.map(a => `<span id="verse-${chapter.number}-${a.numberInSurah}">${esc(a.text)} <span class="verse-number">﴿${num(a.numberInSurah)}﴾</span></span>`).join(' ')}
      </p></section>`).join('')}
    <div style="text-align:center">${num(page)}</div></section>
    <div class="reader-nav">${link(previous,'الصفحة السابقة')}${link(next,'الصفحة التالية')}</div>`;
  $('#font').oninput = event => {
    font = Number(event.target.value);
    $('.reader').style.setProperty('--quran-size', font + 'px');
    save('font', font);
  };
  $('#save-page').onclick = () => {
    bookmark = {surah:n, ayah:current.numberInSurah, name:surah.name};
    toast(save('bookmark', bookmark) ? 'تم حفظ موضع القراءة' : 'تعذّر حفظ الموضع');
  };
  document.querySelectorAll('[data-listen]').forEach(button => {
    button.onclick = () => play(Number(button.dataset.listen));
  });
  if (target > 1) document.getElementById('verse-'+n+'-'+target)?.scrollIntoView({block:'center'});
}
function play(number) {
  const audio = $('#audio');
  $('#player').hidden = false;
  $('#audio-error').textContent = '';
  $('#audio-title').textContent = quran[number - 1].name;
  if (playing !== number) {
    playing = number;
    audio.src = 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/' + number + '.mp3';
  }
  audio.play().catch(error => {
    if (error.name !== 'AbortError' && playing === number) $('#audio-error').textContent = 'تعذّر تشغيل السورة. تحقّق من الاتصال وأعد المحاولة.';
  });
}

$('#audio').onerror=()=>{$('#audio-error').textContent='تعذّر تحميل التلاوة. تحقق من اتصال الإنترنت ثم أعد المحاولة.';};$('#stop-audio').onclick=()=>{$('#audio').pause();$('#audio').removeAttribute('src');$('#audio').load();$('#player').hidden=true;playing=null;};
function azkarView(){return heading('أذكارك اليومية','اذكر الله بقلبٍ حاضر، وعلى مهل.')+`<div class="tabs">${Object.keys(azkar).map(c=>`<button data-category="${c}" class="${category===c?'active':''}">${c}</button>`).join('')}</div>${['أذكار الصباح','أذكار المساء'].includes(category) ? '<p style="text-align:center"><a class="secondary" target="_blank" rel="noopener" href="https://misrquran.gov.eg/audio-details/27d24084-fe27-494d-b294-9cf3f6810088">استمع للأذكار بصوت فوزي عبد المقصود على موقع الإذاعة</a></p>' : ''}<div class="azkar-list">${azkar[category].map((z,i)=>{const count=counts[category+i]||0;return `<article class="content-card dhikr"><div><p class="arabic">${z.text}</p><small>${z.source}</small></div><button class="count ${z.target&&count>=z.target?'complete':''}" data-count="${i}" ${z.target&&count>=z.target?'disabled':''}><strong>${num(count)}</strong><span>${z.target?'من '+num(z.target):'ذكر حر'}</span></button></article>`;}).join('')}</div><button class="secondary" id="reset-azkar">بدء العد من جديد</button>`;}
function bindAzkar(){document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;$('#main').innerHTML=azkarView();bindAzkar();});document.querySelectorAll('[data-count]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.count),key=category+i,z=azkar[category][i];counts[key]=(counts[key]||0)+1;b.querySelector('strong').textContent=num(counts[key]);if(z.target&&counts[key]>=z.target){b.disabled=true;b.classList.add('complete');}});$('#reset-azkar').onclick=()=>{azkar[category].forEach((_,i)=>delete counts[category+i]);$('#main').innerHTML=azkarView();bindAzkar();};}
function tasbihView(){return heading('المسبحة الإلكترونية','أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ — الرعد: ٢٨')+`<section class="tasbih"><span class="eyebrow">ذكرٌ يطمئن به القلب</span><h2>سُبْحَانَ اللَّهِ وَبِحَمْدِهِ</h2><button id="tasbih-count" aria-label="زيادة عداد التسبيح"><strong>${num(tasbih)}</strong><span>اضغط للتسبيح</span></button><p>عداد حر، يُحفظ على هذا الجهاز</p><button class="secondary" id="reset-tasbih">تصفير العداد</button></section>`;}
function bindTasbih(){$('#tasbih-count').onclick=()=>{tasbih++;$('#tasbih-count strong').textContent=num(tasbih);save('tasbih',tasbih);};$('#reset-tasbih').onclick=()=>{$('#reset-dialog').showModal();};}
const resetDialog = $('#reset-dialog');
$('#cancel-reset').onclick = () => resetDialog.close();
$('#accept-reset').onclick = () => {
  tasbih = 0;
  save('tasbih', 0);
  $('#tasbih-count strong').textContent = num(0);
  resetDialog.close();
};
window.addEventListener('hashchange', () => { if (resetDialog.open) resetDialog.close(); });
let pageAnimation;
window.addEventListener('hashchange', () => {
  render();
  pageAnimation?.cancel();
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    pageAnimation = $('#main').animate([
      { opacity: 0.45, transform: 'translateY(7px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 230, easing: 'ease-out' });
  }
});
render();

loadQuran().catch(() => {});
window.addEventListener('online', () => loadQuran().catch(() => {}));

document.addEventListener('play', event => { if (event.target instanceof HTMLAudioElement) document.querySelectorAll('audio').forEach(player => { if (player !== event.target) player.pause(); }); }, true);
