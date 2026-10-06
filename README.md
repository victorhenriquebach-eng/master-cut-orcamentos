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

## Conferência visual

Esta versão não possui modelo de visão nem identificação automática. Nenhuma foto gera peças, medidas ou materiais por conta própria. Marque manualmente apenas partes suficientemente visíveis; partes ocultas ou dúvidas devem ser pendências.

1. Carregue uma foto JPG, PNG ou WEBP de até 10 MB.
2. Escolha o tipo e clique em **Marcar peça visível**. Arraste na foto para delimitar a região. Também é possível adicionar uma peça no painel e usar **Vincular à foto**. Clique na região para selecionar a peça no painel. Para corrigir a área, use **Remarcar região**.
3. Informe largura e altura em **milímetros**, quantidade inteira, construção e material. Sugestões de MDF Branco TX para estrutura interna e MDF madeirado para partes externas ou interior visível por vidro só são aplicadas quando você clica em **Usar sugestão**.
4. Clique nos quatro lados do retângulo para alterar a fita. Portas e tamponamentos externos iniciam com fita em todos os lados. Mudanças de tipo ou construção reaplicam essa regra; os lados continuam editáveis.
5. Marque a confirmação de identificação, medidas, quantidade e material. Só peças confirmadas, completas e consideradas entram no orçamento. Alterações em medidas, material ou construção exigem nova confirmação.
6. Use **Marcar pendência** para delimitar uma região incerta. Edite a pergunta e preencha **Explique esta região**. **Aplicar explicação** registra o texto como informação para conferência: não interpreta texto nem inventa peças. **Adicionar peça nesta região** cria um cadastro manual com a explicação anexada, ainda fora do cálculo até ser preenchido e confirmado.
7. **Editar** leva ao campo de medidas; **Não considerar** retira a peça do orçamento sem apagar sua região. É possível reconsiderar, duplicar ou remover peças.

Tipos: tamponamento, lateral, divisória, base, tampo, ripa, prateleira, porta, frente e travessa. Porta de vidro pode ser registrada como contexto na construção do interior; o sistema não presume corte de vidro.

Fita (m) = soma dos lados selecionados em mm × quantidade ÷ 1.000. Superior/inferior usam largura; esquerda/direita usam altura.
Total = quantidade de peças elegíveis × preço de corte + metros de fita × preço de fita.
Ambos os preços começam em R$ 4,50 e são configuráveis. Materiais, ferragens, montagem, perdas e plano de corte não estão incluídos.

Nome, peças, explicações e preços ficam em `localStorage`; a foto fica no IndexedDB do mesmo navegador. Se o armazenamento falhar, um aviso informa a limitação. Não há backend, envio de fotos, login ou sincronização. Trocar/remover a foto limpa regiões e pendências e exige nova confirmação das peças. Orçamentos antigos são preservados, mas precisam confirmar material e identificação para voltar ao cálculo. Use **Imprimir orçamento** para imprimir ou salvar PDF.

## Evolução para visão automática

`src/review.js` contém o contrato inicial de um provedor de análise: candidatos e dúvidas separados do orçamento. O provedor manual retorna listas vazias e não é apresentado como análise por IA. Uma futura integração deverá associar candidatos à foto, registrar incertezas como pendências e manter o bloqueio de orçamento até conferência dos dados. A função `readyForBudget` centraliza esse bloqueio.

## Estrutura

- `src/main.js`: interface e estado local.
- `src/budget.js`: regras de cálculo, separadas para futuras evoluções.
- `src/review.js`: elegibilidade, regiões e regras iniciais de conferência.
- `src/style.css`: visual, layout responsivo e impressão.
- `test/budget.test.js`: testes de quantidades, unidades, lados e preços.
