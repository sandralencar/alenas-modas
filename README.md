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
3. Configure `WHATSAPP_SELLER_NUMBER` com o número comercial no formato internacional, somente dígitos. O número atual é `5588988573785`.
4. Execute `npm install`.
5. Inicie com `npm run dev` ou `npm start`.
6. Abra `http://localhost:3000`.

## Publicar no GitHub Pages

O Express continua disponível para desenvolvimento local, mas o GitHub Pages não executa servidores Node.js. O workflow em `.github/workflows/pages.yml` gera a página EJS e publica o resultado estático da pasta `dist/` a cada push para `main`; o catálogo, as imagens e as regras de compra são preservados.

1. No GitHub, abra **Settings → Pages** e selecione **GitHub Actions** como origem da publicação.
2. Envie as alterações para a branch `main`. O workflow instala as dependências, executa as verificações e os testes, gera o site e publica o Pages.
3. Após o primeiro deploy bem-sucedido, acesse `https://sandralencar.github.io/alenas-modas/`.

Para gerar os arquivos localmente, execute `npm run build`. O resultado fica em `dist/`, configurado por padrão para o caminho do projeto no GitHub Pages. Para outro domínio ou subcaminho, defina `BASE_PATH` antes do build (por exemplo, `/` para domínio próprio).

## Catálogo de imagens

As imagens em `src/public/img/dupla/` são exibidas como duplas de sutiãs. As imagens em `src/public/img/sutiãs vitrine unidade e trio/` são usadas para sutiãs unitários; arquivos cujo nome contém “trio” são classificados como trios. O nome de cada imagem aparece como nome do produto.

Para incluir ou retirar peças da vitrine, adicione ou remova imagens dessas pastas. As imagens das ofertas da página são escolhidas automaticamente a partir dos produtos disponíveis. A sacola também mostra a foto do item selecionado.

Ao abrir o pedido, a mensagem do WhatsApp inclui um link público para a imagem de cada item, hospedada no repositório. O link pré-preenchido do WhatsApp aceita texto e links; anexar os arquivos de imagem diretamente exigiria uma integração com a WhatsApp Business Platform.

## Coleção de primavera e ofertas

| Oferta | Regra |
|---|---|
| Sutiã unitário | R$ 45,00 — tamanhos P, M e G |
| Combo Primavera | 3 modelos diferentes de sutiã unitário, por R$ 99,90; os tamanhos P, M e G podem variar |
| Dupla de sutiãs | 2 sutiãs, mesmo tamanho: R$ 74,90 em P, M, G e G1; R$ 99,90 em G2, G3 e G4 |
| Trio de sutiãs | R$ 99,90 em P, M e G; R$ 134,90 em G1, G2, G3 e G4 |
| Entrega | Frete grátis em Itapevi/SP; outras localidades são combinadas pelo WhatsApp |

Cada grupo de três modelos unitários diferentes nos tamanhos P, M ou G recebe o Combo Primavera. O carrinho identifica e detalha os modelos incluídos, o desconto aplicado e o total. As unidades excedentes permanecem pelo preço individual.

## Checkout pelo WhatsApp

1. Escolha um produto, tamanho e quantidade.
2. Confira fotos, promoções, desconto e total na sacola.
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
