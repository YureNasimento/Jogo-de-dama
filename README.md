# 👑 Dama

Jogo de **dama brasileiro** feito só com HTML, CSS e JavaScript, sem bibliotecas e sem etapa de build. Jogue contra a máquina, ganhe pontos, converta em **Dcoin** e gaste na **Loja de Natal**.

## Como jogar

Abra o `index.html` no navegador ou publique no GitHub Pages (veja abaixo).

## Recursos

- **Regras completas:** captura obrigatória, lei da maioria, captura para trás, dama voadora e promoção só ao terminar a jogada.
- **Contra a máquina:** três níveis (Fácil, Médio e Difícil), com IA minimax e poda alfa-beta.
- **Pontos:** captura 10, dama 25, vitória 200 e empate 50, multiplicados por ×1, ×2 ou ×4 conforme a dificuldade.
- **Carteira:** 100 pontos = 1 Dcoin, moeda interna do jogo sem valor real.
- **Loja de Natal:** bonecos, temas e estilos de peças, com os itens comprados guardados em Artefatos.
- **Personalização:** seis temas gratuitos, cor das peças e tema de Natal animado, com neve, trenó e cenário.
- **Salvamento:** pontos, Dcoin, compras e preferências ficam no `localStorage` do navegador.

## Estrutura

```
.
├── index.html
├── css/style.css
├── js/script.js
├── README.md
└── LICENSE
```

## Publicar no GitHub Pages

1. Crie um repositório e envie estes arquivos para a raiz.
2. Vá em **Settings > Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**, a branch `main` e a pasta `/ (root)`.
4. Salve e aguarde. O jogo ficará em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

## Licença

MIT. Veja o arquivo `LICENSE`.
