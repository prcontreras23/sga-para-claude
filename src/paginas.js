// Páginas que se abren en el navegador para iniciar sesión en SDA+.

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const LOGO = 'https://sga.adventistassureste.org/logo-siga-encabezado.png';

function marco(cuerpo) {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SDA+ — Conectar con Claude</title>
<style>
  :root{--marino:#02365E;--turquesa:#408491;--fondo:#f4f6f8;--texto:#1d2733;--suave:#5b6878;--error:#a3271f}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--fondo);color:var(--texto);
       font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:16px}
  .caja{width:100%;max-width:380px;background:#fff;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,.08);
        border-top:4px solid var(--turquesa);padding:28px}
  img{display:block;height:44px;margin:0 auto 18px}
  h1{font-size:18px;margin:0 0 6px;color:var(--marino);text-align:center}
  p{margin:0 0 18px;color:var(--suave);font-size:14px;text-align:center}
  label{display:block;font-size:14px;font-weight:600;margin:12px 0 4px}
  input{width:100%;padding:10px 12px;border:1px solid #c8d0da;border-radius:6px;font:inherit}
  input:focus{outline:2px solid var(--turquesa);border-color:transparent}
  button{width:100%;margin-top:20px;padding:11px;border:0;border-radius:6px;background:var(--marino);color:#fff;
         font:inherit;font-weight:600;cursor:pointer}
  .error{background:#fbeae8;color:var(--error);border-radius:6px;padding:10px 12px;font-size:14px;margin-bottom:6px}
  .nota{margin-top:18px;font-size:12px;color:var(--suave);text-align:center}
</style></head><body><main class="caja">${cuerpo}</main></body></html>`;
}

export function paginaEntrada({ error = '', email = '' } = {}) {
  return marco(`
  <img src="${LOGO}" alt="SDA+">
  <h1>Conectar Claude con SDA+</h1>
  <p>Use el mismo correo y la misma contraseña con los que entra a SDA+.</p>
  ${error ? `<div class="error">${esc(error)}</div>` : ''}
  <form method="post">
    <label for="email">Correo</label>
    <input id="email" name="email" type="email" autocomplete="username" required value="${esc(email)}" ${email ? '' : 'autofocus'}>
    <label for="password">Contraseña</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required ${email ? 'autofocus' : ''}>
    <button type="submit">Entrar</button>
  </form>
  <p class="nota">Claude solo podrá consultar, nunca modificar, y verá lo mismo que usted ve en SDA+.</p>`);
}

export function paginaListo(email) {
  return marco(`
  <img src="${LOGO}" alt="SDA+">
  <h1>Listo</h1>
  <p>Claude quedó conectado a SDA+ con el usuario <strong>${esc(email)}</strong>.<br>Puede cerrar esta ventana y volver a Claude.</p>`);
}
