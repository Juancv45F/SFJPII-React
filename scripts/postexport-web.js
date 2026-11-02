// Ajusta dist/ tras `expo export -p web` para desplegar en Vercel:
// 1) Vercel no sube carpetas node_modules, así que las fuentes de iconos y
//    tipografías de dist/assets/node_modules se mueven a dist/assets/vendor.
// 2) Copia vercel.json (rewrites/headers) y un .vercelignore a dist/.
const fs = require('fs');
const path = require('path');

const dist = path.resolve(__dirname, '..', 'dist');
const from = path.join(dist, 'assets', 'node_modules');
const to = path.join(dist, 'assets', 'vendor');

if (fs.existsSync(from)) {
  fs.rmSync(to, { recursive: true, force: true });
  fs.renameSync(from, to);
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
  let changed = 0;
  for (const file of walk(dist).filter(f => /\.(js|html|css|json)$/.test(f))) {
    const src = fs.readFileSync(file, 'utf8');
    const out = src.split('/assets/node_modules/').join('/assets/vendor/');
    if (out !== src) { fs.writeFileSync(file, out); changed++; }
  }
  console.log(`assets/node_modules -> assets/vendor (${changed} archivos actualizados)`);
}

const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'vercel.json'), 'utf8'));
const deployConfig = { cleanUrls: config.cleanUrls, rewrites: config.rewrites, headers: config.headers };
fs.writeFileSync(path.join(dist, 'vercel.json'), JSON.stringify(deployConfig, null, 2));
fs.writeFileSync(path.join(dist, '.vercelignore'), '.env*\n.vercel\n.gitignore\n');
