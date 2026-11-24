# Orbe Arte

Skill `/arte` para criar artes de redes sociais com acabamento de estúdio, sem cara de IA. Ela faz o brainstorm antes de gerar, propõe três direções, entrega o prompt final em inglês para o GPT Image e confere o resultado contra o arquivo original. Logo e pessoa saem idênticas ao que você enviou.

Funciona de dois jeitos: como plugin do Claude Code (comando `/arte`) e como texto para colar no ChatGPT.

## Instalação no Claude Code

```
claude plugin marketplace add orbecmc-art/orbe-arte
claude plugin install orbe-arte@orbe-arte
```

Abra uma sessão nova para carregar.

## Como ativar

Digite `/arte`. Ela também é lembrada sozinha quando você pede arte, post, criativo, carrossel, reels, stories ou prompt para o GPT Image: o hook avisa o Claude e a skill começa pelas perguntas.

```
/arte post de autoridade para a Dra. Ana, 4:5, logo anexada
```

## Como ela trabalha

1. Brainstorm: uma mensagem com até 9 perguntas (objetivo, formato, público, texto exato, anexos e o que não pode mudar, marca, setor regulado, modo da logo, o que a marca nunca faria). Nada é gerado antes das respostas.
2. Três direções: A premium minimalista, B editorial lifestyle, C performance. Cada uma com composição, paleta em hex, fontes e risco de cara de IA. Termina com "Quer a versão A, B ou C?".
3. Prompt final: em inglês, em 12 seções, com os anexos numerados, o que muda e o que permanece idêntico.
4. Conferência: logo letra por letra, rosto e mãos, texto, contagem de elementos, respiro e cor. Os ajustes mudam uma variável por vez.

As regras anti-slop são medidas: no mínimo 40% da área vazia, margem de 8%, texto em até 25% da área, 1 herói, 1 título, 1 linha de apoio, 1 assinatura, no máximo 1 recurso gráfico, até 2 famílias de fonte e nenhum ícone.

## O que ela garante e o que não garante

Logo, marca, rótulo, QR code e texto legal têm dois modos:

- Seguro (padrão): o gerador não desenha esses itens. A imagem sai com uma zona limpa reservada, e o PNG original entra por cima no Canva, Figma ou Photoshop. É a única forma de garantir pixel idêntico.
- Fidelidade máxima: o PNG vai anexado e o prompt exige cópia exata. O GPT Image recria pixels, então ainda pode trocar uma letra, um ponto ou a proporção. Por isso a Etapa 4 confere e, se divergir, regenera uma vez e volta ao modo seguro.

Pessoa e produto da foto não são retocados, afinados, suavizados nem embelezados. O que muda é só o que você listou.

## Uso no ChatGPT

- GPT personalizado: cole `chatgpt/nucleo.md` no campo de instruções (7.931 caracteres, o limite é 8.000) e suba `chatgpt/linguagens-visuais.md` como arquivo de conhecimento.
- Chat comum: cole `chatgpt/skill-completa.md` na primeira mensagem e depois anexe logo, foto e referências.

## Hooks

- `SessionStart` (startup, clear e compact): lembra que o `/arte` existe e das quatro regras fixas, em poucas linhas.
- `UserPromptSubmit`: se a mensagem fala de arte, post, criativo, carrossel, reels, stories, banner, logo e afins, lembra de usar a skill. Nas outras mensagens não escreve nada, e quem já digitou `/arte` também não recebe aviso.

Os scripts são bash puro, sem comando externo, e rodam no bash 3.2 do macOS e no Git Bash do Windows (pelo `run-hook.cmd`). A estrutura segue a do DevOrb.

## Estrutura

```
.claude-plugin/        plugin.json e marketplace.json
skills/arte/           SKILL.md e references/ (gerados)
chatgpt/               nucleo.md e linguagens-visuais.md (fontes), skill-completa.md (gerado)
hooks/                 hooks.json, run-hook.cmd, session-start, user-prompt
scripts/sync-skill.mjs gera os arquivos derivados
tests/                 testes dos manifestos, da skill e dos hooks
```

## Mantendo a skill

Edite só `chatgpt/nucleo.md` e `chatgpt/linguagens-visuais.md`. Depois:

```
node scripts/sync-skill.mjs
node --test
```

O primeiro regenera `SKILL.md`, `references/` e `skill-completa.md`. Os testes conferem o limite de 8.000 caracteres, as travas de fidelidade, os hooks e a ausência de travessão no texto. Depois de uma mudança, suba a `version` no `.claude-plugin/plugin.json`, senão o Claude Code não puxa a atualização.
