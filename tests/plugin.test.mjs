import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { accessSync, constants, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, DESCRIPTION } from '../scripts/sync-skill.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));

const bashPath = spawnSync('sh', ['-c', 'command -v bash'], { encoding: 'utf8' }).stdout.trim();
const needsBash = { skip: bashPath ? false : 'bash não encontrado nesta máquina' };

function hook(script, stdin = '') {
  return spawnSync(bashPath, [join(root, 'hooks', script)], { input: stdin, encoding: 'utf8' });
}
const promptInput = (prompt) =>
  JSON.stringify({
    session_id: 's',
    cwd: '/Users/gabriel/Documents/Projetos Code/Orbe Assessoria',
    hook_event_name: 'UserPromptSubmit',
    prompt,
  });

// ---------- manifestos ----------

test('manifestos batem entre si e com a skill', () => {
  const plugin = json('.claude-plugin/plugin.json');
  const market = json('.claude-plugin/marketplace.json');
  assert.equal(plugin.name, 'orbe-arte');
  assert.match(plugin.version, /^\d+\.\d+\.\d+$/);
  assert.equal(market.plugins[0].name, plugin.name);
  assert.equal(market.plugins[0].source, './');
  assert.ok(existsSync(join(root, 'skills', 'arte', 'SKILL.md')));
});

test('SKILL.md tem frontmatter válido e descrição que ativa pelo /arte', () => {
  const skill = read('skills/arte/SKILL.md');
  const m = skill.match(/^---\nname: arte\ndescription: (".*")\n---\n/);
  assert.ok(m, 'frontmatter fora do formato esperado');
  const description = JSON.parse(m[1]);
  assert.equal(description, DESCRIPTION);
  assert.ok(description.length <= 1024);
  assert.match(description, /Use quando o usuário digitar \/arte/);
});

// ---------- a skill e os arquivos derivados ----------

test('arquivos derivados estão em dia com as fontes (rode node scripts/sync-skill.mjs)', () => {
  for (const [rel, content] of Object.entries(build())) {
    assert.equal(read(rel), content, `${rel} está desatualizado`);
  }
});

test('o núcleo cabe nas instruções do GPT (limite de 8.000 caracteres)', () => {
  assert.ok([...read('chatgpt/nucleo.md')].length <= 8000);
});

test('as travas de fidelidade continuam no texto', () => {
  const nucleo = read('chatgpt/nucleo.md');
  for (const trecho of [
    'Nível 1, pixel a pixel',
    'Modo seguro (padrão)',
    'Modo fidelidade máxima',
    'Leave the reserved logo zone completely empty.',
    'exact pixel-faithful copy',
    'Do not retouch, slim, smooth, age or beautify.',
    'Quer a versão A, B ou C?',
    'Regra 0: não gere imagem nem prompt antes de concluir as Etapas 1 e 2.',
  ]) {
    assert.ok(nucleo.includes(trecho), `faltando: ${trecho}`);
  }
  assert.ok(read('skills/arte/SKILL.md').includes('Nível 1, pixel a pixel'));
});

test('nenhum texto do pacote usa travessão (em dash ou en dash)', () => {
  const achados = [];
  const visitar = (dir) => {
    for (const nome of readdirSync(dir)) {
      if (nome === '.git' || nome === 'node_modules') continue;
      const caminho = join(dir, nome);
      if (statSync(caminho).isDirectory()) visitar(caminho);
      else if (/\.(md|json|mjs)$|^(session-start|user-prompt)$/.test(nome)) {
        const texto = readFileSync(caminho, 'utf8');
        // Este próprio teste cita os caracteres; todo o resto do pacote não pode.
        if (nome !== 'plugin.test.mjs' && /[—–]/.test(texto)) achados.push(relative(root, caminho));
      }
    }
  };
  visitar(root);
  assert.deepEqual(achados, []);
});

// ---------- hooks ----------

test('hooks.json aponta para scripts que existem e são executáveis', () => {
  const hooks = json('hooks/hooks.json').hooks;
  assert.deepEqual(Object.keys(hooks).sort(), ['SessionStart', 'UserPromptSubmit']);
  assert.equal(hooks.SessionStart[0].matcher, 'startup|clear|compact');
  for (const evento of Object.values(hooks)) {
    for (const h of evento[0].hooks) {
      const nome = h.command.match(/run-hook\.cmd"? (\S+)$/)?.[1];
      assert.ok(nome, `comando inesperado: ${h.command}`);
      const arquivo = join(root, 'hooks', nome);
      assert.ok(existsSync(arquivo), `não existe: hooks/${nome}`);
      accessSync(arquivo, constants.X_OK);
    }
  }
  accessSync(join(root, 'hooks', 'run-hook.cmd'), constants.X_OK);
});

test('session-start emite JSON válido e curto', needsBash, () => {
  const r = hook('session-start');
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout).hookSpecificOutput;
  assert.equal(out.hookEventName, 'SessionStart');
  assert.match(out.additionalContext, /\/arte/);
  assert.match(out.additionalContext, /40 por cento/);
  assert.ok(out.additionalContext.length < 1500);
});

test('run-hook.cmd chama o session-start', needsBash, () => {
  const r = spawnSync(bashPath, [join(root, 'hooks', 'run-hook.cmd'), 'session-start'], { encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).hookSpecificOutput.hookEventName, 'SessionStart');
});

test('user-prompt avisa nos pedidos de arte', needsBash, () => {
  for (const prompt of [
    'faz uma arte para o instagram da clínica',
    'Preciso de um carrossel de 5 slides',
    'monta os Stories da semana',
    'usa minha logo no post de lançamento',
    'faz um post para a clínica',
    'gera um criativo para anúncio',
    'cria o prompt para o GPT Image',
    'quero algo sem slop',
    'capa do reels, em 9:16',
  ]) {
    const r = hook('user-prompt', promptInput(prompt));
    assert.equal(r.status, 0, prompt);
    const out = JSON.parse(r.stdout).hookSpecificOutput;
    assert.equal(out.hookEventName, 'UserPromptSubmit', prompt);
    assert.match(out.additionalContext, /\/arte/, prompt);
  }
});

test('user-prompt fica em silêncio nos outros pedidos', needsBash, () => {
  for (const prompt of [
    'corrige o bug na parte do login',
    'o departamento pediu um relatório',
    'me explica o que é um commit',
    'particular ou público?',
    'adiciona um git post-commit hook',
    '/arte quero um criativo para a clínica',
    '/orbe-arte:arte novo post',
  ]) {
    const r = hook('user-prompt', promptInput(prompt));
    assert.equal(r.status, 0, prompt);
    assert.equal(r.stdout, '', prompt);
  }
});

test('user-prompt ignora o caminho da pasta e entradas sem prompt', needsBash, () => {
  const comArteNoCaminho = JSON.stringify({ cwd: '/Users/g/Projetos/arte', prompt: 'roda os testes' });
  assert.equal(hook('user-prompt', comArteNoCaminho).stdout, '');
  assert.equal(hook('user-prompt', '{"cwd":"/x"}').stdout, '');
  assert.equal(hook('user-prompt', '').status, 0);
});
