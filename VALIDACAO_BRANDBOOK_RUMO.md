# Validação da identidade visual — Marca Rumo

Resumo do que foi aplicado do brand book da Rumo neste projeto.

## Cores institucionais
Definidas como variáveis CSS em `css/rumo.css` e reaproveitadas em todo o site (e no PDF):

| Uso | Cor | Hex |
|-----|-----|-----|
| Azul âncora (institucional) | Azul Rumo | `#003865` |
| Azul de apoio / destaques | Azul claro | `#32A6E6` |
| Aprovação / homologado | Verde | `#1E9F7F` |
| Acento verde | Verde claro | `#7FE06C` |
| Erro / reprovado | Vermelho | `#D84545` |
| Texto e cinzas neutros | — | escala de cinzas |

## Tipografia
- Família: **"Cera Pro", Verdana, Geneva, Tahoma, sans-serif**.
- A fonte **Cera Pro não foi embutida** no projeto por ser **licenciada** — o sistema usa
  Cera Pro quando ela estiver instalada no dispositivo e cai para Verdana/Tahoma caso contrário.
  Para embutir a fonte oficial, é preciso ter a licença e adicionar os arquivos `@font-face`.

## Logotipos
- `assets/rumo-logo-branco.png` — usado sobre o azul (tela de login e cabeçalho).
- `assets/rumo-logo-azul.png` — usado em fundo claro (certificado em PDF) e como favicon.
- Origem: pacote oficial de logos da marca.

## Assinatura visual
- **Trilho duplo**: o elemento `<hr class="trilho">` representa dois trilhos paralelos e é usado
  como divisor e como barra de progresso da prova — referência direta ao contexto ferroviário.
- **Chanfro sutil**: cartões de destaque (`.card--chanfro`) e os KPIs trazem um corte diagonal
  discreto no canto, ecoando o recorte da marca, com raio de borda padronizado.

## Componentes alinhados à marca
- Botões primário (azul), sucesso (verde), fantasma e perigo.
- Cabeçalho com logo, navegação por papel e selo de perfil.
- Tabelas, badges de aprovação/reprovação, alertas e cartões.
- Tela de login com gradiente azul institucional e padrão diagonal sutil.
- Gráficos do painel usando a paleta institucional (`js/dashboard.js`).
- Certificado em PDF com as cores e o logo da Rumo (`js/certificado.js`).

## Acessibilidade
- Foco visível em azul claro para navegação por teclado.
- `prefers-reduced-motion` respeitado (animações suavizadas).
- Layout responsivo (cartões e grades colapsam em telas estreitas).
