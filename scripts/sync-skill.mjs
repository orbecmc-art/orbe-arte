#!/usr/bin/env node
// Gera os arquivos derivados a partir das duas fontes em chatgpt/:
//   chatgpt/nucleo.md               -> skills/arte/SKILL.md (corpo)
//   chatgpt/linguagens-visuais.md   -> skills/arte/references/linguagens-visuais.md
//   as duas juntas                  -> chatgpt/skill-completa.md (texto único para colar no chat)
//
// Uso:
//   node scripts/sync-skill.mjs           grava os arquivos
//   node scripts/sync-skill.mjs --check   falha (exit 1) se algum arquivo estiver desatualizado

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

export const DESCRIPTION =
  "Comando /arte: diretor de arte premium e anti-slop para redes sociais. Faz o brainstorm de perguntas, " +
  "propõe 3 direções (A, B, C) e entrega o prompt final em inglês para o GPT Image, com logo, marca e pessoa " +
  "idênticas ao arquivo enviado, muito respiro e sem ícone nem excesso de IA. Use quando o usuário digitar /arte " +
  "ou pedir arte, post, criativo, capa de reels, carrossel, stories, anúncio visual, 'arte sem cara de IA', " +
  "anti-slop ou prompt para GPT Image.";

const read = (rel) => readFileSync(join(root, rel), 'utf8').replace(/\s+$/, '');

// Remove a primeira linha (o título H1) e as linhas em branco logo depois dela.
const semTitulo = (texto) => texto.replace(/^[^\n]*\n+/, '');

export function build() {
  const nucleo = read('chatgpt/nucleo.md');
  const linguagens = read('chatgpt/linguagens-visuais.md');

  const skill = [
    '---',
    'name: arte',
    `description: ${JSON.stringify(DESCRIPTION)}`,
    '---',
    '',
    '# Arte: diretor de arte premium anti-slop',
    '',
    'Comando `/arte`. Você é o diretor de arte desta conversa e segue as etapas abaixo, na ordem.',
    '',
    '## Como rodar no Claude Code',
    '- O gerador de imagem é o GPT Image (ChatGPT) ou o que a pessoa indicar. Você entrega as direções e o prompt final em inglês para colar lá, e nunca diz que gerou a imagem.',
    '- Se o projeto tiver Brandkit, ficha de marca ou arquivo de logo, leia antes da Etapa 1 e pule as perguntas que eles já respondem.',
    '- Quando a pessoa trouxer a arte gerada e o arquivo original, faça a Etapa 4 olhando as duas imagens lado a lado.',
    '- Na Etapa 2, use `references/linguagens-visuais.md` como vocabulário das direções A, B e C.',
    '',
    semTitulo(nucleo),
    '',
  ].join('\n');

  const completa = [
    '=== PARTE 1: NÚCLEO (instruções do GPT ou início do chat) ===',
    '',
    nucleo,
    '',
    '',
    '=== PARTE 2 (OPCIONAL): LINGUAGENS VISUAIS VALIDADAS ===',
    semTitulo(linguagens),
    '',
  ].join('\n');

  return {
    'skills/arte/SKILL.md': skill,
    'skills/arte/references/linguagens-visuais.md': linguagens + '\n',
    'chatgpt/skill-completa.md': completa,
  };
}

function main() {
  const check = process.argv.includes('--check');
  let stale = 0;
  for (const [rel, content] of Object.entries(build())) {
    const path = join(root, rel);
    const atual = existsSync(path) ? readFileSync(path, 'utf8') : null;
    if (atual === content) continue;
    if (check) {
      console.error(`desatualizado: ${rel}`);
      stale += 1;
    } else {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
      console.log(`gravado: ${rel}`);
    }
  }
  if (check && stale > 0) {
    console.error('Rode: node scripts/sync-skill.mjs');
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
