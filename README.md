# Contas Em Pé

Jogo pedagógico de soma com transporte para crianças do 2.º ano (7-8 anos).

A app apresenta a conta "em pé" — em colunas de unidades, dezenas, centenas — e a criança preenche os transportes e o resultado, com feedback positivo a cada passo.

> **Joga online:** [https://apbrito.github.io/contas-em-pe/](https://apbrito.github.io/contas-em-pe/)

## Características

- **12 níveis progressivos** — de somas a dois algarismos sem transporte até quatro algarismos com várias parcelas.
- **Dois modos por nível** — coluna a coluna (com transportes visíveis) ou só o resultado final.
- **Mensagens nunca punitivas** — pistas suaves a cada erro, com revelação ao 3.º para destravar.
- **Pontos acumulativos** — +10 à 1.ª tentativa, +5 com erros. Nunca desconta.
- **Mascote coruja** — reage a acertos e erros sem julgar.
- **Funciona offline** — instalável como PWA no telemóvel ou tablet (Android/iOS) e em PC.
- **Sem login, sem tracking** — todo o progresso fica em `localStorage` no dispositivo.

## Como instalar no tablet ou telemóvel

1. Abrir [https://apbrito.github.io/contas-em-pe/](https://apbrito.github.io/contas-em-pe/) no Chrome (Android) ou Safari (iOS).
2. Esperar a página carregar uma vez (a app fica em cache para uso offline).
3. Menu do browser → **"Adicionar ao ecrã principal"** ou **"Instalar app"**.
4. Abrir o atalho criado — passa a comportar-se como uma app nativa.

## Stack

App standalone sem build:

- HTML + React 18 (via CDN)
- Tailwind CSS (via CDN)
- Babel inline para JSX
- Service Worker para offline-first

## Estrutura

```
index.html              # UI principal
logic.js                # lógica pura (níveis, geração, validação, persistência)
tests.html              # suite de testes no browser
manifest.webmanifest    # manifesto PWA
service-worker.js       # cache offline
icons/                  # ícones PWA (SVG + PNG)
tools/                  # utilitários de desenvolvimento
```

## Correr localmente

Não há dependências. Basta servir os ficheiros estáticos:

```bash
python -m http.server 8000
# abrir http://localhost:8000/
```

Para testar o service worker / instalação PWA é preciso HTTPS. Em rede local podes usar `tools/serve_https.py` (gera certificado self-signed) — depois aceitar o aviso de certificado no dispositivo.

## Testes

Abrir `tests.html` no browser. Mostra pass/fail de todas as funções da lógica.

## Licença

MIT — ver [LICENSE](LICENSE).
