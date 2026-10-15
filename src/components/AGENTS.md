# src/components

- `ui/`: componentes shadcn. Atualizam-se via CLI e não se editam à mão, salvo variantes em `cva`.
- `app/`: composição partilhada (navegação, cabeçalhos, tema).
- Os componentes de uma só feature vão para `features/<f>/components`.
- Sem acesso a dados nem a Server Actions importadas diretamente: recebem props ou a action por parâmetro.
- Acessibilidade: rótulo em todos os campos, foco visível, alvos de 44px e `aria-*` nos estados de erro.
