# Alenas Lingerie

Vitrine online da coleção de primavera da Alenas Lingerie, marca com mais de 25 anos de mercado. O projeto foi pensado para valorizar o trabalho artesanal, o cuidado nos acabamentos e as texturas das peças, com uma experiência de compra simples e responsiva. O site pode ser publicado como arquivos estáticos no GitHub Pages; o pedido continua sendo concluído pelo WhatsApp.

## Tecnologias

- Node.js 20+
- Express 4
- EJS para renderizar a página durante o build
- HTML, CSS e JavaScript

## Executar localmente

1. Instale o Node.js 20 ou superior.
2. Copie `.env.example` para `.env`.
3. Configure `WHATSAPP_SELLER_NUMBER` com o número comercial no formato internacional, somente dígitos. O número atual é `5511987460976`.
4. Execute `npm install`.
5. Inicie com `npm run dev` ou `npm start`.
6. Abra `http://localhost:3000`.

## Publicar no GitHub Pages

O Express continua disponível para desenvolvimento local, mas o GitHub Pages não executa servidores Node.js. O workflow em `.github/workflows/pages.yml` gera a página EJS, converte as imagens do catálogo para WebP otimizado com fallback JPEG para navegadores mais antigos e publica o resultado estático da pasta `dist/` a cada push para `main`; o catálogo, as imagens e as regras de compra são preservados.

1. No GitHub, abra **Settings → Pages** e selecione **GitHub Actions** como origem da publicação.
2. Envie as alterações para a branch `main`. O workflow instala as dependências, executa as verificações e os testes, gera o site e publica o Pages.
3. Após o primeiro deploy bem-sucedido, acesse `https://alenasmoda.com.br`.

Para gerar os arquivos localmente, execute `npm run build`. As imagens originais continuam no catálogo; somente as cópias do site são otimizadas. As mensagens do WhatsApp incluem os dados do pedido, sem links para fotografias. As imagens do catálogo usam carregamento adiado, dimensões explícitas e imagens alternativas para compatibilidade; animações de entrada ficam desativadas em telas pequenas para não esconder conteúdo se o navegador não disparar o observador. O site estático também publica uma política CSP por meta tag. O resultado fica em `dist/` e usa a raiz do domínio por padrão, como em `https://alenasmoda.com.br`. Para publicar em um subcaminho, defina `BASE_PATH` antes do build (por exemplo, `/alenas-modas` para `https://sandralencar.github.io/alenas-modas/`).

## Catálogo de imagens

O catálogo agrupa primeiro os kits com 3 sutiãs, depois os kits com 2 sutiãs e, por fim, os sutiãs individuais. As imagens em `src/public/img/dupla/` são exibidas conforme a composição identificada de cada produto. As imagens em `src/public/img/sutiãs vitrine unidade e trio/` são usadas para sutiãs unitários; arquivos cujo nome contém “trio” são classificados como trios. O nome de cada imagem aparece como nome do produto.

Para incluir ou retirar peças da vitrine, adicione ou remova imagens dessas pastas. As imagens das ofertas da página são escolhidas automaticamente a partir dos produtos disponíveis. A sacola também mostra a foto do item selecionado.

Ao abrir o pedido, a mensagem do WhatsApp inclui os nomes das peças, tamanhos, quantidades, totais, pagamento e endereço, sem URLs de fotografias.

## Coleção de primavera e ofertas

| Oferta | Regra |
|---|---|
| Sutiã unitário | R$ 40,00 — tamanhos P, M e G; R$ 50,00 — tamanhos G1 a G4 |
| Combo Primavera | 3 modelos diferentes de sutiã unitário, por R$ 99,90; os tamanhos P, M e G podem variar |
| 2 sutiãs | Total por faixa: R$ 74,90 em P, M e G; R$ 99,90 em G1, G2, G3 e G4 |
| 3 sutiãs | Total por faixa: R$ 99,90 em P, M e G; R$ 134,90 em G1, G2, G3 e G4 |
| Trio de sutiãs | R$ 99,90 em P, M e G; R$ 134,90 em G1, G2, G3 e G4 |
| Entrega | Frete grátis em Itapevi/SP; outras localidades são combinadas pelo WhatsApp |

Os totais são calculados pela quantidade de sutiãs selecionados em cada faixa, mesmo quando os produtos são adicionados separadamente. A sacola e a mensagem do WhatsApp usam o mesmo cálculo; não são exibidas economias ou descontos não previstos na tabela.

## Checkout pelo WhatsApp

1. Escolha um produto, tamanho e quantidade.
2. Confira fotos, preços por faixa de tamanho e total na sacola.
3. Selecione PIX, cartão de crédito, cartão de débito ou dinheiro.
4. Informe o CEP. O endereço é preenchido pela consulta ao ViaCEP; informe o número ou marque “Endereço sem número” e, se necessário, o complemento.
5. O pedido abre no WhatsApp com os produtos, tamanhos, quantidades, links das imagens, pagamento e endereço.

O CEP é consultado diretamente pelo navegador no serviço ViaCEP. O site não salva endereço, pedidos, pagamentos ou cadastro de clientes, e não possui banco de dados nem painel administrativo.

## Validação

```bash
npm run check
npm test
```

O catálogo e a sacola se adaptam a celulares, tablets e desktops. As animações de entrada são sutis, respeitam a preferência do sistema por movimento reduzido e a página continua utilizável sem JavaScript moderno de animação.
