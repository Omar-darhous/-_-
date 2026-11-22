const cities = {
  'القاهرة': [30.0444, 31.2357],
  'الزقازيق': [30.5877, 31.502],
  'الإسكندرية': [31.2001, 29.9187],
  'المنصورة': [31.0409, 31.3785],
  'الجيزة': [30.0131, 31.2089],
  'أسيوط': [27.1783, 31.1859],
  'الأقصر': [25.6872, 32.6396],
  'أسوان': [24.0889, 32.8998]
};
const radians = Math.PI / 180;
const degrees = 1 / radians;
const kaaba = [21.4225, 39.8262];
export function bearing(lat, lon) {
  const delta = (kaaba[1] - lon) * radians;
  const phi = lat * radians;
  return (Math.atan2(Math.sin(delta), Math.cos(phi) * Math.tan(kaaba[0] * radians)
    - Math.sin(phi) * Math.cos(delta)) * degrees + 360) % 360;
}
export function prayerTimes(date, lat, lon) {
  // Solar declination and equation of time at local mean noon (NOAA).
  const century = (date / 86400000 + 2440587.5 + 0.5 - lon / 360 - 2451545) / 36525;
  const mean = (280.46646 + century * (36000.76983 + 0.0003032 * century)) % 360 * radians;
  const anomaly = (357.52911 + century * (35999.05029 - 0.0001537 * century)) * radians;
  const eccentricity = 0.016708634 - century * (0.000042037 + 0.0000001267 * century);
  const center = Math.sin(anomaly) * (1.914602 - century * 0.004817)
    + Math.sin(2 * anomaly) * (0.019993 - century * 0.000101) + 0.000289 * Math.sin(3 * anomaly);
  const omega = (125.04 - 1934.136 * century) * radians;
  const longitude = mean + (center - 0.00569 - 0.00478 * Math.sin(omega)) * radians;
  const tilt = (23.439291 - 0.0130042 * century + 0.00256 * Math.cos(omega)) * radians;
  const declination = Math.asin(Math.sin(tilt) * Math.sin(longitude));
  const y = Math.tan(tilt / 2) ** 2;
  const equation = 4 * degrees * (y * Math.sin(2 * mean) - 2 * eccentricity * Math.sin(anomaly)
    + 4 * eccentricity * y * Math.sin(anomaly) * Math.cos(2 * mean) - y*y/2 * Math.sin(4*mean)
    - 1.25 * eccentricity**2 * Math.sin(2*anomaly));
  const noon = 720 - 4 * lon - equation;
  const phi = lat * radians;
  const arc = altitude => 4 * degrees * Math.acos((Math.sin(altitude * radians)
    - Math.sin(phi) * Math.sin(declination)) / (Math.cos(phi) * Math.cos(declination)));
  const asrAltitude = Math.atan(1 / (1 + Math.tan(Math.abs(phi - declination)))) * degrees;
  return [noon - arc(-19.5), noon - arc(-0.833), noon, noon + arc(asrAltitude), noon + arc(-0.833), noon + arc(-17.5)];
}
let place = 'القاهرة';
let devicePosition;
let request = 0;
export function prayerView() {
  return `<section class="prayers"><div class="page-heading"><h1>مواقيت الصلاة</h1></div>
    <div class="place-controls"><label>المدينة <select id="city">${Object.keys(cities).map(name => '<option>'+name+'</option>').join('')}<option value="device" hidden>موقعي الحالي</option></select></label>
    <button class="secondary" id="locate">استخدام موقعي الحالي</button></div>
    <p id="geo-status" role="status"></p><div id="schedule"></div></section>`;
}
export function bindPrayer() {
  const city = document.querySelector('#city');
  const status = document.querySelector('#geo-status');
  city.value = place;
  function draw() {
    const device = place === 'device';
    const [lat, lon] = device ? devicePosition : cities[place];
    const zone = device ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Africa/Cairo';
    const now = new Date();
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone:zone,year:'numeric',month:'numeric',day:'numeric'}).formatToParts(now).map(p=>[p.type,p.value]));
    const midnight = Date.UTC(+parts.year, +parts.month-1, +parts.day);
    const clock = new Intl.DateTimeFormat('ar-EG',{timeZone:zone,hour:'numeric',minute:'2-digit'});
    const day = new Intl.DateTimeFormat('ar-EG',{timeZone:zone,dateStyle:'full'}).format(now);
    const times = prayerTimes(midnight,lat,lon);

    const labels = ['الفجر','الشروق','الظهر','العصر','المغرب','العشاء'];
    document.querySelector('#schedule').innerHTML = `<article class="content-card"><h2>${day}</h2><p>${device?'موقعي الحالي':place} · التوقيت المحلي (${zone})</p><div class="time-grid">${times.map((t,i)=>'<div><span>'+labels[i]+'</span><strong>'+(Number.isFinite(t)?clock.format(midnight+Math.round(t)*60000):'غير متاح')+'</strong></div>').join('')}</div><small>مواقيت محسوبة بالطريقة المصرية، والعصر بظلّ المثل. قد تختلف دقائق عن تقويم المسجد المحلي.</small></article>`;
  }
  draw();
  const timer = setInterval(() => { if (city.isConnected) draw(); else clearInterval(timer); },60000);
  city.onchange = () => { request++; place=city.value; status.textContent=''; draw(); };
  document.querySelector('#locate').onclick = () => {
    if (!navigator.geolocation) { status.textContent='تحديد الموقع غير متاح. اختر مدينتك من القائمة.'; return; }
    const id = ++request;
    status.textContent='جارٍ تحديد موقعك…';
    navigator.geolocation.getCurrentPosition(({coords}) => {
      if (!city.isConnected || id !== request) return;
      devicePosition=[coords.latitude,coords.longitude]; place='device'; city.value=place;
      status.textContent='تُعرض المواقيت بالمنطقة الزمنية المضبوطة على جهازك.'; draw();
    }, () => { if(city.isConnected && id===request) status.textContent='تعذّر تحديد موقعك. يمكنك اختيار المدينة يدويًا.'; }, {timeout:12000,maximumAge:300000});
  };
}

export function qiblaView() {
  return `<section class="page-heading"><h1>اتجاه القبلة</h1></section>
    <section class="content-card live-compass">
    <label>الموقع <select id="q-city">${Object.keys(cities).map(name => '<option>'+name+'</option>').join('')}<option value="device" hidden>موقعي الحالي</option></select></label>
    <div class="compass" aria-hidden="true"><i id="needle">↑</i></div>
    <strong id="angle"></strong><p id="guidance"></p>
    <button class="primary" id="start-compass">تشغيل البوصلة الحية</button>
    <p id="sensor-status" role="status"></p><small id="position-status" role="status"></small></section>`;
}

export function bindQibla() {
  const city = document.querySelector('#q-city');
  const needle = document.querySelector('#needle');
  const sensor = document.querySelector('#sensor-status');
  const position = document.querySelector('#position-status');
  const activate = document.querySelector('#start-compass');
  let coords = place === 'device' ? devicePosition : cities[place];
  city.value = place;
  let heading = null;
  let watch = null;
  let generation = 0;
  let timeout;
  let closed = false;

  function draw() {
    const target = bearing(...coords);
    const rotation = (window.screen.orientation?.angle ?? window.orientation ?? 0);
    const offset = heading === null ? target : target - heading - rotation;
    needle.style.transform = 'rotate(' + offset + 'deg)';
    document.querySelector('#angle').textContent = target.toLocaleString('ar-EG',{maximumFractionDigits:1}) + '° من الشمال الحقيقي';
    document.querySelector('#guidance').textContent = heading === null
      ? 'للقراءة اليدوية، وجّه أعلى الشاشة نحو الشمال الحقيقي.'
      : Math.abs(((offset % 360 + 540) % 360) - 180) <= 5
        ? 'أعلى الهاتف يشير إلى القبلة تقريبًا.'
        : 'امسك الهاتف أفقيًا ولفّه حتى يشير السهم إلى أعلى الشاشة.';
  }
  function onDirection(event) {
    const compass = event.webkitCompassHeading;
    const absolute = event.absolute || event.type === 'deviceorientationabsolute';
    const next = Number.isFinite(compass) && compass >= 0 ? compass
      : absolute && Number.isFinite(event.alpha) ? 360 - event.alpha : null;
    if (next === null || !city.isConnected) return;
    heading = next;
    clearTimeout(timeout);
    sensor.textContent = 'البوصلة تعمل · الدقة تعتمد على حساس الهاتف ومعايرته.';
    draw();
  }
  function stopLocation() {
    generation++;
    if (watch !== null) navigator.geolocation.clearWatch(watch);
    watch = null;
  }
  function followLocation() {
    stopLocation();
    if (!navigator.geolocation) return;
    const current = generation;
    position.textContent = 'جارٍ تحديد موقعك…';
    watch = navigator.geolocation.watchPosition(({coords:fix}) => {
      if (current !== generation || !city.isConnected) return;
      coords = [fix.latitude, fix.longitude];
      city.value = 'device';
      position.textContent = 'الاتجاه محسوب من موقع جهازك.';
      draw();
    }, () => {
      if (current === generation && city.isConnected) position.textContent = 'تعذّر تحديث الموقع. الاتجاه محسوب للموقع المعروض.';
    }, {enableHighAccuracy:true, maximumAge:5000, timeout:15000});
  }
  city.onchange = () => {
    stopLocation();
    coords = cities[city.value] || coords;
    position.textContent = '';
    draw();
  };
  activate.onclick = async () => {
    clearTimeout(timeout);
    const orientation = window.DeviceOrientationEvent;
    try {
      const permission = orientation?.requestPermission?.();
      followLocation();
      if (permission && await permission !== 'granted') {
        sensor.textContent = 'لم يُسمح باستخدام البوصلة. يمكنك استخدام الاتجاه بالدرجات.';
        return;
      }
      if (closed) return;
      sensor.textContent = 'في انتظار قراءة البوصلة…';
      window.addEventListener('deviceorientationabsolute', onDirection);
      window.addEventListener('deviceorientation', onDirection);
      timeout = setTimeout(() => {
        if (heading === null) sensor.textContent = 'لم تصل قراءة للبوصلة. جرّب هاتفًا يدعمها وافتح الصفحة عبر HTTPS.';
      }, 4000);
    } catch {
      sensor.textContent = 'تعذّر تشغيل حساس الاتجاه. استخدم القراءة اليدوية.';
    }
  };
  window.addEventListener('hashchange', () => {
    closed = true;
    stopLocation();
    clearTimeout(timeout);
    window.removeEventListener('deviceorientationabsolute', onDirection);
    window.removeEventListener('deviceorientation', onDirection);
  }, {once:true});
  draw();
}
