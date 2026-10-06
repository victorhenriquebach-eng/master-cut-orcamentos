# Master Cut Orçamentos

Aplicação web para orçamento de cortes e fita de borda de móveis planejados. Interface em português, responsiva, com foto de referência e cadastro manual de peças.

## Executar

Requer Node.js 20.19+ ou 22.12+ (validado com Node.js 24).

```sh
npm ci
npm run dev
```

```sh
npm test       # testes dos cálculos
npm run build # saída de produção em dist/
npm run preview
```

## Usar

1. Informe o nome do projeto e carregue uma foto JPG, PNG ou WEBP de até 10 MB.
2. Adicione laterais, bases, tampos, divisórias, prateleiras, portas, frentes ou travessas. A foto serve como referência; esta versão não identifica peças automaticamente.
3. Informe largura e altura em **milímetros**, quantidade inteira e lados com fita. Superior/inferior usam a largura; esquerda/direita usam a altura.
4. Configure os preços por peça cortada e por metro de fita. Ambos começam em **R$ 4,50**.
5. Confira o total e use **Imprimir orçamento** para imprimir ou salvar como PDF pelo navegador.

Fita (m) = soma dos lados selecionados em mm × quantidade ÷ 1.000.
Total = quantidade de peças × preço do corte + metros de fita × preço da fita.

Os totais atualizam enquanto os campos são editados. Peças sem medidas completas exibem um aviso; os valores são estimativas. O cálculo não inclui chapas, ferragens, instalação, perdas ou otimização do plano de corte.

O nome, as peças e os preços são salvos em `localStorage` neste navegador. A foto fica em memória e precisa ser carregada novamente após atualizar a página. Não há backend, envio de imagens, login ou sincronização entre dispositivos. Fontes do Google são opcionais, com alternativas locais caso não carreguem.

## Estrutura

- `src/main.js`: interface e estado local.
- `src/budget.js`: regras de cálculo, separadas para futuras evoluções.
- `src/style.css`: visual, layout responsivo e impressão.
- `test/budget.test.js`: testes de quantidades, unidades, lados e preços.
