const button = document.querySelector('#install-app');
const help = document.querySelector('#install-help');
const installed = matchMedia('(display-mode: standalone)');
let promptEvent;
const appleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const android = /Android/i.test(navigator.userAgent);
const steps = help.querySelectorAll('p');
steps[0].hidden = !appleMobile;
steps[1].hidden = appleMobile;
steps[0].textContent = 'افتح الرابط في Safari، واضغط مشاركة (مربع بسهم لأعلى). لو شريط الأدوات مختصر، افتح قائمة المزيد أولًا. اختر «إضافة إلى الشاشة الرئيسية»، ثم «إضافة».';
steps[1].textContent = android
  ? 'افتح الرابط في Chrome. من قائمة ⋮ اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»، ثم أكّد التثبيت.'
  : 'افتح قائمة المتصفح واختر تثبيت الصفحة كتطبيق إن توفر الخيار.';
if (appleMobile) button.textContent = 'طريقة الإضافة للشاشة الرئيسية';
function updateButton() { button.hidden = installed.matches || navigator.standalone === true; }
updateButton();
installed.addEventListener('change', updateButton);
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  promptEvent = event;
  button.textContent = 'تثبيت التطبيق';
  if (help.open) help.close();
});
window.addEventListener('appinstalled', () => { promptEvent = null; button.hidden = true; help.close(); });
button.onclick = async () => {
  if (!promptEvent) { help.showModal(); return; }
  const pending = promptEvent;
  promptEvent = null;
  try { await pending.prompt(); await pending.userChoice; }
  catch { help.showModal(); }
};
document.querySelector('#close-install').onclick = () => help.close();
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').catch(() => {
    document.querySelector('#offline-note').textContent = 'تعذّر تجهيز القراءة دون اتصال في هذا المتصفح.';
  });
}
