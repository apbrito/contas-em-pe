# Histórico de versões

Todas as alterações visíveis ao utilizador da app.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/),
versionamento semântico ([SemVer](https://semver.org/)).

## [1.1.0] — 2026-05-08

### Novidades
- **Modo Contra-relógio**: 10 minutos para fazer o máximo de pontos.
  Os exercícios sobem de dificuldade automaticamente à medida que acertas.
- **Mural dos Campeões**: melhores pontuações guardadas no tablet, com
  pódio para os 3 primeiros. Visível pelo menu inicial e dentro do
  contra-relógio.
- **Vários jogadores no mesmo tablet**: cada um cria o seu cartão
  (nome + animal). Cada cartão tem o seu progresso de níveis.

### Melhorias
- O painel da engrenagem ⚙ deixa trocar de jogador sem perder progresso
  e eliminar perfis que já não usas.
- Banner discreto avisa quando há nova versão da app, com 1 clique para
  atualizar — sem perder nada do que já tinhas.
- Botão "Procurar atualizações" no painel da engrenagem para verificar
  manualmente.

### Para devs
- Schema do localStorage migra automaticamente de v2 para v3 (multi-perfil).
  Backup do v2 guardado em `contas_em_pe_backup_v2`.
- Pontos do contra-relógio escalam por nível: `pontos = 5 + 5 × nível`,
  metade quando há erros.
- Modo Aprender: nova via de subida de nível por acumulação de 50 pontos
  desde o último level-up (alternativa à streak de 5 acertos).
- Painel parental: slider limitado a `[1 .. maxLevelReached]`.
- Sistema de updates: listener `updatefound` + check periódico horário.

## [1.0.1] — 2026-05-02

### Correcções
- Script de release agora cobre ficheiros não rastreados, exige tree
  limpa, e protege a directoria de destino.

## [1.0.0] — 2026-05-02

### Primeira versão pública
- Jogo de somas com transporte para crianças do 2.º ano.
- 12 níveis, dificuldade crescente (2-4 dígitos, 2-4 parcelas).
- Modo coluna (validação imediata) e modo "fim" (verifica tudo no fim).
- Mascote coruja com 5 estados (idle, happy, thinking, worried, celebrating).
- Funciona offline como PWA depois da primeira abertura.
- Persistência local em `localStorage`.
