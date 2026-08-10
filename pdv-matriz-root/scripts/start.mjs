import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const VITE_URL = 'http://localhost:5173';

console.log('\n============================================================');
console.log('  PDV DE BAR - INICIO SEGURO DO FRONTEND (Vite)');
console.log('------------------------------------------------------------');
console.log(`  URL CORRETA DO FRONTEND: ${VITE_URL}`);
console.log('');
console.log('  ATENCAO:');
console.log('  * NAO abra a aplicacao pela porta 5500 (Live Server).');
console.log('  * NAO abra a raiz do projeto como arquivo estatico.');
console.log('  * Este e um SPA React compilado pelo Vite: so executa');
console.log('    via servidor de desenvolvimento Vite ou build de deploy.');
console.log('============================================================\n');

const frontendDir = fileURLToPath(new URL('../frontend', import.meta.url));

let child;
if (process.platform === 'win32') {
  child = spawn('cmd.exe', ['/d', '/s', '/c', 'npm run dev'], {
    cwd: frontendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} else {
  child = spawn('npm', ['run', 'dev'], {
    cwd: frontendDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr);

child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', (err) => {
  console.error('\n[ERRO] Falha ao iniciar o frontend:', err.message);
  console.error('Execute manualmente:');
  console.error('   cd frontend');
  console.error('   npm install');
  console.error('   npm run dev');
  process.exit(1);
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
