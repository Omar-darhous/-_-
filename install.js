const button = document.querySelector('#install-app');
const help = document.querySelector('#install-help');
const installed = matchMedia('(display-mode: standalone)');
let promptEvent;
function updateButton() { button.hidden = installed.matches || navigator.standalone === true; }
updateButton();
installed.addEventListener('change', updateButton);
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  promptEvent = event;
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
