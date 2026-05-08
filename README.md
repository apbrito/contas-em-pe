# Jogos da Coruja

Jogos pedagógicos para crianças do 2.º ano. Joga-se no tablet, sem
internet, sem anúncios.

🦉 — *com a coruja como guia*

## O que é

Um conjunto de jogos para acompanhar miúdos na escola — começando
pela matemática e a expandir para outros temas com o tempo. A
coruja é a mascote que acompanha em cada jogo: nunca repreende,
sugere uma dica suave quando há erro, e celebra quando há acerto.

A primeira porta-de-entrada é o **Contas em Pé** — somas com
transporte, em coluna, com 12 níveis crescentes (de 2 a 4 dígitos,
2 a 4 parcelas). É o que abre quando instalas a app.

Foi feita por um pai para o filho. Está pública para quem quiser
usar com os seus.

## Como instalar no tablet

1. **Abre o link** [https://apbrito.github.io/jogos-da-coruja/](https://apbrito.github.io/jogos-da-coruja/)
   no Chrome (Android) ou Safari (iPad).
2. **Adiciona ao ecrã principal**:
   - Android (Chrome): toca no menu (três pontos) → "Adicionar ao
     ecrã principal".
   - iPad (Safari): toca no botão Partilhar → "Adicionar ao Ecrã
     Principal".
3. **Aparece o ícone da Coruja** no ecrã do tablet. A partir daí,
   toca para abrir como uma app normal.
4. **Funciona offline** depois disto. A primeira abertura precisa
   de internet (descarrega a app); depois funciona sem rede.

## Contas em Pé — o jogo de matemática

- **Modo Aprender**: a criança sobe níveis ao seu ritmo. Sobe quando
  acerta 5 seguidas à 1.ª, ou quando faz 50 pontos. O painel da
  engrenagem ⚙ deixa pais ajustar o nível para baixo (mas só sobe
  com prova de jogo).
- **Modo Contra-relógio**: 10 minutos para fazer o máximo de pontos.
  Os exercícios sobem de dificuldade automaticamente. Vários
  jogadores no mesmo tablet — cada um com o seu cartão (nome +
  animal). As melhores pontuações ficam no **Mural dos Campeões**.

## Privacidade — dados ficam no tablet

Esta app foi feita por um pai, para o seu filho. Por isso é honesta:

- **Não sai nada do tablet.** Nomes, pontos, níveis, Mural — tudo
  fica guardado **só** no browser/tablet onde a app está instalada.
- **Sem contas, sem registo, sem email.** A criança não cria conta
  para usar a app.
- **Sem anúncios. Sem analytics. Sem tracking.** Nunca terá.
- **Funciona offline.** Depois da primeira abertura, a app não
  precisa de internet — nem para jogar, nem para mais nada.
- **Para apagar tudo**: desinstala a app do tablet. Tudo desaparece
  com ela.
- **Não recolhemos dados sobre crianças.** Nem queríamos saber como
  o teu filho está a jogar — esse é assunto entre vocês.

A app é open source. Se quiseres verificar com os teus próprios olhos,
todo o código está aqui no GitHub.

## Atualizações automáticas

Quando há uma nova versão, a app mostra um banner *"Nova versão
disponível ✨ [Atualizar]"* no fundo do ecrã. Tocar instala. Tudo o
que a criança já fez (níveis desbloqueados, pontos, Mural) é
preservado.

Para forçar verificação: dentro da app, toca na engrenagem ⚙ →
"Procurar atualizações".

Histórico de versões: ver [CHANGELOG.md](CHANGELOG.md).

## FAQ

**Funciona no iPad?** Sim, em Safari como PWA.

**A criança precisa de saber escrever?** Apenas o seu nome no início
(1-12 letras). Nada mais durante o jogo.

**Há som?** Não na versão actual. Está planeado para uma próxima
versão (opcional, com toggle no painel parental).

**Pode jogar sem internet?** Sim, depois da primeira abertura.

**Como removo um perfil?** Engrenagem ⚙ → "Eliminar perfil".

**A criança subiu de nível e ficou frustrada — como volto atrás?**
Engrenagem ⚙ → desliza o nível para baixo. Pode descer livremente.

**Vão chegar mais jogos?** Sim, esse é o plano. Áudio, mascote
com mais expressões, e novos jogos para outros temas — tudo a
chegar a tempo.

**Como reportar um bug?** Abre uma issue em
[GitHub Issues](https://github.com/apbrito/jogos-da-coruja/issues).

## Origem

Feita por um pai para o filho, do 2.º ano. A turma do filho está a
escolher um nome para a coruja — quando decidirem, a coruja
apresenta-se. 🦉

Aberto a quem queira usar nas turmas dos seus filhos.

## Para devs

App standalone — HTML + React 18 (CDN) + Tailwind (CDN) + Babel
inline para JSX. Sem build, sem dependências. Lógica pura em
`logic.js` (testável em Node ou no browser).

Para correr localmente:

```bash
python -m http.server 8000
# abrir http://localhost:8000/
```

Testes: abrir `tests.html` no browser. Cobre geração de exercícios,
validação por slot, persistência em `localStorage` (incluindo
migrações de schema), sistema de pontos, multi-perfil, leaderboard.

Licença: [MIT](LICENSE).

---

Feito com ♥ para os miúdos do 2.º ano.
