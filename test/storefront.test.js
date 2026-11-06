const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { calculateCart, priceForQuantity } = require('../src/public/js/pricing');

function assertUniqueProductCards(html) {
  const cards = [...html.matchAll(/<article class="product-card"[^>]*data-product-id="([^"]+)"[^>]*data-product-image="([^"]+)"[^>]*data-prices="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)];
  const productIds = cards.map(([, productId]) => productId);
  const productImages = cards.map(([, , imagePath]) => imagePath);
  const productTypes = [...html.matchAll(/<article class="product-card"[^>]*data-product-type="([^"]+)"/g)]
    .map(([, productType]) => productType);

  assert.equal(cards.length, 25);
  assert.equal(new Set(productIds).size, cards.length, 'each product should appear once in the catalog');
  assert.equal(new Set(productImages).size, cards.length, 'each product should map to a distinct image');
  assert.ok(cards.every(([, , , , markup]) => (markup.match(/<img\b/g) || []).length === 1), 'each product card should show one image');
  assert.deepEqual(productTypes, [...productTypes].sort((first, second) => {
    const typeOrder = { trio: 0, dupla: 1, unidade: 2 };
    return typeOrder[first] - typeOrder[second];
  }), 'catalog products should be grouped in trio, dupla, unidade order');
}

const originalWhatsAppNumber = process.env.WHATSAPP_SELLER_NUMBER;
process.env.WHATSAPP_SELLER_NUMBER = '5511987460976';

const app = require('../src/app');
const server = app.listen(0);
let baseUrl;

before(async () => {
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });

  if (originalWhatsAppNumber === undefined) {
    delete process.env.WHATSAPP_SELLER_NUMBER;
  } else {
    process.env.WHATSAPP_SELLER_NUMBER = originalWhatsAppNumber;
  }
});

test('vitrine mostra as imagens internas e orienta concluir o pedido no WhatsApp', async () => {
  const response = await fetch(baseUrl);
  const html = await response.text();

  assert.equal(response.status, 200);
  assertUniqueProductCards(html);
  assert.equal((html.match(/data-carousel-slide/g) || []).length, 3);
  assert.match(html, /Seu trio favorito/);
  assert.match(html, /3 sutiãs por R\$ 99,90/);
  assert.match(html, /Tamanhos P ao G/);
  assert.match(html, /G1 ao G4 por R\$ 134,90/);
  assert.match(html, /Escolher meu trio/);
  assert.match(html, /2 sutiãs por R\$ 74,90/);
  assert.match(html, /G1 ao G4 por R\$ 99,90/);
  assert.match(html, /Escolher minha dupla/);
  assert.match(html, /1 sutiã por R\$ 35,00/);
  assert.match(html, /G1 ao G4 por R\$ 45,00/);
  assert.match(html, /Ver modelos/);
  assert.match(html, /id="catalogo-trio"/);
  assert.match(html, /id="catalogo-dupla"/);
  assert.match(html, /id="catalogo-individual"/);
  assert.match(html, /href="#catalogo-trio">Escolher meu trio/);
  assert.match(html, /<h3 class="catalog-group__title" id="catalogo-trio-title">Kits com 3 sutiãs<\/h3>/);
  assert.match(html, /<h3 class="catalog-group__title" id="catalogo-dupla-title">Kits com 2 sutiãs<\/h3>/);
  assert.match(html, /<h3 class="catalog-group__title" id="catalogo-individual-title">Sutiãs individuais<\/h3>/);
  assert.ok(
    html.indexOf('id="catalogo-trio"') < html.indexOf('id="catalogo-dupla"')
      && html.indexOf('id="catalogo-dupla"') < html.indexOf('id="catalogo-individual"'),
    'catalog sections should appear in trio, dupla, unidade order'
  );
  const heroSlides = [...html.matchAll(/<article class="hero-carousel__slide"[\s\S]*?<\/article>/g)];
  assert.equal(heroSlides.length, 3);
  assert.ok(heroSlides.every(([markup]) => (markup.match(/<img\b/g) || []).length === 1));
  assert.match(heroSlides[0][0], /Trio de sutiãs marrom, rosé e nude/);
  assert.match(heroSlides[1][0], /Dupla de sutiãs amarelos em microfibra e renda/);
  assert.match(heroSlides[2][0], /Sutiã azul real em microfibra/);
  assert.match(heroSlides[1][0], /hidden/);
  assert.match(heroSlides[2][0], /hidden/);
  assert.match(html, /data-carousel-controls hidden/);
  assert.match(html, /href="\/favicon\.svg"/);
  assert.match(html, /<title>Coleção de Primavera \| Alenas Lingerie<\/title>/);
  assert.match(html, /Há mais de 25 anos, criamos uma relação de carinho com cada cliente/);
  assert.match(html, /http-equiv="Content-Security-Policy"/);
  assert.match(html, /connect-src 'self' https:\/\/viacep\.com\.br/);
  assert.match(html, /Concluir pedido no WhatsApp/);
  assert.match(html, /data-whatsapp-number="5511987460976"/);
  assert.match(html, /data-add-to-cart/);
  assert.match(html, /data-product-type="dupla"/);
  assert.match(html, /data-product-type="trio"/);
  assert.match(html, /data-product-name="Dupla de sutiãs pretos em microfibra" data-product-type="dupla"/);
  assert.match(html, /data-product-name="Trio de sutiãs vermelho, branco e preto em microfibra" data-product-type="trio"/);
  assert.match(html, /data-product-name="Dupla de sutiãs amarelos em microfibra e renda" data-product-type="dupla"/);
  assert.match(html, /data-product-name="Sutiã cor de castanha em microfibra"/);
  assert.match(html, /data-product-name="Sutiã rosé em microfibra com pétalas"/);
  assert.match(html, /data-product-name="Sutiã nude em microfibra com flores e pétalas"/);
  assert.match(html, /data-product-name="Sutiã vermelho romântico em microfibra"/);
  assert.match(html, /data-product-name="Trio de sutiãs branco, preto e bege em microfibra" data-product-type="trio"/);
  assert.match(html, /data-product-name="Trio de sutiãs marrom, rosé e nude" data-product-type="trio"/);
  assert.match(html, /data-product-name="Dupla de sutiãs nude e preto em microfibra" data-product-type="dupla"/);
  const productNames = [...html.matchAll(/data-product-name="([^"]+)"/g)].map(([, name]) => name);
  assert.ok(productNames.every((name) => !/(cetim|seda|satin)/i.test(name)));
  assert.match(html, /<select data-product-size required>/);
  assert.match(html, /data-quantity-action="decrease"/);
  assert.match(html, /data-quantity-action="increase"/);
  assert.match(html, /<option value="G4">G4<\/option>/);
  assert.match(html, /<option value="Cartão de crédito">Cartão de crédito<\/option>/);
  assert.match(html, /<option value="Cartão de débito">Cartão de débito<\/option>/);
  assert.match(html, /data-cart-total/);
  assert.match(html, /data-cart-pricing/);
  assert.doesNotMatch(html, /data-cart-savings|data-promo-summary/);
  assert.match(html, /class="store-announcement__icon"/);
  assert.match(html, /class="header-whatsapp"[^>]*aria-label="Dúvidas\? Fale com a gente pelo WhatsApp">[\s\S]*?class="whatsapp-icon"/);
  assert.match(html, /class="brand-story__values"[^>]*aria-label="Diferenciais Alenas"/);
  assert.match(html, /Feito com cuidado/);
  assert.match(html, /class="brand-story__whatsapp"[\s\S]*?class="whatsapp-icon"/);
  assert.match(html, /3 sutiãs por <strong>R\$ 99,90<\/strong>/);
  assert.doesNotMatch(html, /economize|economia de|desconto aplicado/i);
  assert.match(html, /kit com 2 sutiãs · valor do kit/);
  assert.match(html, /kit com 3 sutiãs · valor do kit/);
  assert.match(html, /Forma de pagamento <span>\(obrigatório\)<\/span>/);
  assert.match(html, /CEP <span>\(obrigatório\)<\/span>/);
  assert.match(html, /Trio por <strong>R\$ 99,90<\/strong>/);
  assert.match(html, /do G1 ao G4, R\$ 134,90/);
  assert.ok(html.indexOf('Trio por <strong>R$ 99,90</strong>') < html.indexOf('COMBO PARA FLORESCER'));
  assert.match(html, /Cada foto mostra um kit com 2 sutiãs · P a G: R\$ 74,90 · G1 a G4: R\$ 99,90/);
  assert.match(html, /1 sutiã: R\$ 35,00 \(P a G\) ou R\$ 45,00 \(G1 a G4\)/);
  assert.match(html, /Frete grátis para Itapevi\/SP/);
  assert.match(html, /MAIS DE 25 ANOS DE HISTÓRIA/);
  assert.match(html, /uma história feita à mão, com cuidado em cada costura/i);
  assert.match(html, /texturas de alta qualidade/i);
  assert.match(html, /spring-promo__images/);
  assert.equal((html.match(/<article class="spring-promo/g) || []).length, 4);
  assert.match(html, /data-product-image=/);
  assert.equal((html.match(/data-image-viewer-trigger/g) || []).length, 32);
  const whatsappNumbers = [...html.matchAll(/href="https:\/\/wa\.me\/(\d+)\?text=/g)]
    .map(([, number]) => number);
  assert.equal(whatsappNumbers.length, 3);
  assert.ok(whatsappNumbers.every((number) => number === '5511987460976'));
  assert.match(html, /<dialog class="image-viewer" data-image-viewer/);
  assert.match(html, /data-close-image-viewer/);
  assert.match(html, /data-cart-pricing/);
  assert.match(html, /data-cep/);
  assert.match(html, /data-cep-retry/);
  assert.match(html, /data-address-no-number/);
  assert.match(html, /https:\/\/wa\.me\/5511987460976/);
  assert.doesNotMatch(html, /preços? ilustrativos|tamanhos demonstrativos|Acesso administrativo/i);

  const prices = [...html.matchAll(/data-prices="([^"]+)"/g)]
    .map(([, value]) => JSON.parse(value.replace(/&#34;/g, '"')));
  assert.ok(prices.some((price) => price.P === 3500 && price.G === 3500 && price.G1 === 4500 && price.G4 === 4500));
  assert.ok(prices.some((price) => price.P === 7490 && price.G1 === 9990 && price.G2 === 9990));
  assert.ok(prices.some((price) => price.P === 9990 && price.G1 === 13490 && price.G4 === 13490));

  const imagePaths = [...html.matchAll(/<img src="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(imagePaths.length, 35);
  assert.match(html, /loading="lazy" decoding="async"/);

  const imageResponses = await Promise.all(imagePaths.map((imagePath) => fetch(new URL(imagePath, baseUrl))));
  assert.ok(imageResponses.every((imageResponse) => imageResponse.status === 200));
  const faviconResponse = await fetch(`${baseUrl}/favicon.svg`);
  assert.equal(faviconResponse.status, 200);
  assert.match(await faviconResponse.text(), /<svg/);
  const carouselScriptResponse = await fetch(`${baseUrl}/js/carousel.js`);
  assert.equal(carouselScriptResponse.status, 200);
});

test('preços por quantidade seguem a tabela em cada faixa de tamanho', () => {
  assert.deepEqual([1, 2, 3].map((quantity) => priceForQuantity(quantity, 'standard').total), [3500, 7490, 9990]);
  assert.deepEqual([1, 2, 3].map((quantity) => priceForQuantity(quantity, 'extended').total), [4500, 9990, 13490]);
  assert.deepEqual([4, 5, 6].map((quantity) => priceForQuantity(quantity, 'standard').total), [13490, 17480, 19980]);
  assert.deepEqual([4, 5, 6].map((quantity) => priceForQuantity(quantity, 'extended').total), [17990, 23480, 26980]);
});

test('sacola agrupa produtos adicionados separadamente e atualiza quantidades e remoções', () => {
  const firstProduct = { type: 'unidade', size: 'P', quantity: 1 };
  const secondProduct = { type: 'unidade', size: 'G', quantity: 1 };
  const extendedProduct = { type: 'unidade', size: 'G1', quantity: 1 };

  assert.equal(calculateCart([firstProduct, secondProduct]).total, 7490);
  assert.equal(calculateCart([extendedProduct, { ...extendedProduct, size: 'G4' }]).total, 9990);
  assert.equal(calculateCart([firstProduct, secondProduct, { ...firstProduct, size: 'M' }]).total, 9990);
  assert.equal(calculateCart([extendedProduct, { ...extendedProduct, size: 'G2' }, { ...extendedProduct, size: 'G3' }]).total, 13490);
  assert.equal(calculateCart([{ ...firstProduct, quantity: 3 }]).total, 9990);
  assert.equal(calculateCart([{ ...firstProduct, quantity: 2 }, secondProduct]).total, 9990);
  assert.equal(calculateCart([secondProduct]).total, 3500);
  assert.equal(calculateCart([]).total, 0);
});

test('kits de duas e três peças entram no mesmo total por faixa', () => {
  assert.equal(calculateCart([{ type: 'dupla', size: 'P', quantity: 1 }]).total, 7490);
  assert.equal(calculateCart([{ type: 'dupla', size: 'G1', quantity: 1 }]).total, 9990);
  assert.equal(calculateCart([{ type: 'trio', size: 'P', quantity: 1 }]).total, 9990);
  assert.equal(calculateCart([{ type: 'trio', size: 'G1', quantity: 1 }]).total, 13490);
  assert.equal(calculateCart([
    { type: 'dupla', size: 'P', quantity: 1 },
    { type: 'unidade', size: 'M', quantity: 1 }
  ]).total, 9990);
});

test('rotas administrativas não estão mais disponíveis', async () => {
  const response = await fetch(`${baseUrl}/admin/login`);
  assert.equal(response.status, 404);
});

test('health check não depende de conexão com banco', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('política de segurança permite consultar ViaCEP para preencher o endereço', async () => {
  const response = await fetch(baseUrl);
  assert.match(response.headers.get('content-security-policy'), /connect-src[^;]*https:\/\/viacep\.com\.br/);
});

test('mensagens do pedido omitem URLs de imagens e preservam o cálculo compartilhado', () => {
  const storefrontScript = fs.readFileSync(path.join(__dirname, '..', 'src', 'public', 'js', 'main.js'), 'utf8');
  assert.doesNotMatch(storefrontScript, /raw\.githubusercontent\.com|shareImage|Imagem:/);
  assert.match(storefrontScript, /Total dos produtos: \$\{currency\.format\(pricing\.total \/ 100\)\}/);
  assert.match(storefrontScript, /Forma de pagamento: \$\{paymentMethod\.value\}/);
  assert.match(storefrontScript, /Endereço: \$\{deliveryAddress\}/);
  assert.match(storefrontScript, /StorePricing\.calculateCart/);
  assert.doesNotMatch(storefrontScript, /economia de R\$ 35,10|createPromoBundles|cartSavings/);
  assert.equal((storefrontScript.match(/document\.body\.classList\.add\('images-enhanced'\)/g) || []).length, 1);
  assert.match(storefrontScript, /imageContainer\.classList\.add\('is-loading'\)/);
  assert.match(storefrontScript, /imageContainer\.classList\.toggle\('is-error'/);
  assert.match(storefrontScript, /threshold: 0, rootMargin: '0px 0px -32px 0px'/);
  assert.match(storefrontScript, /cartDialog\.addEventListener\('cancel'/);
});

test('build estático publica os recursos na raiz do domínio personalizado', () => {
  const projectRoot = path.join(__dirname, '..');
  execFileSync(process.execPath, [path.join(projectRoot, 'scripts', 'build-static.js')], {
    cwd: projectRoot,
    env: { ...process.env, BASE_PATH: '/', WHATSAPP_SELLER_NUMBER: '99999999999' },
    stdio: 'pipe'
  });

  const outputDirectory = path.join(projectRoot, 'dist');
  const html = fs.readFileSync(path.join(outputDirectory, 'index.html'), 'utf8');

  assertUniqueProductCards(html);
  assert.match(html, /href="\/css\/styles\.css"/);
  assert.match(html, /href="\/favicon\.svg"/);
  assert.match(html, /src="\/js\/carousel\.js"/);
  assert.match(html, /src="\/js\/main\.js"/);
  assert.match(html, /src="\/js\/pricing\.js"/);
  assert.match(html, /data-base-path=""/);
  assert.doesNotMatch(html, /\/alenas-modas\//);
  assert.match(html, /http-equiv="Content-Security-Policy"/);
  assert.match(html, /COMBO PARA FLORESCER/);
  assert.match(html, /data-whatsapp-number="5511987460976"/);
  assert.doesNotMatch(html, /99999999999/);
  assert.match(html, /3 sutiãs por <strong>R\$ 99,90<\/strong>/);
  assert.match(html, /data-prices="[^"]*7490/);
  assert.doesNotMatch(html, /<%[\s\S]*?%>/);

  const imagePaths = [...html.matchAll(/<img src="([^"]+)"/g)].map(([, imagePath]) => imagePath);
  assert.equal(imagePaths.length, 35);
  assert.ok(imagePaths.every((imagePath) => imagePath.startsWith('/img/')));
  assert.ok(imagePaths.every((imagePath) => imagePath.endsWith('.optimized.jpg')));
  assert.ok(imagePaths.every((imagePath) => fs.existsSync(
    path.join(outputDirectory, decodeURIComponent(imagePath.slice(1)))
  )));
  const webpPaths = [...html.matchAll(/<source srcset="([^"]+)" type="image\/webp">/g)]
    .map(([, imagePath]) => imagePath);
  assert.equal(webpPaths.length, imagePaths.length);
  assert.ok(webpPaths.every((imagePath) => imagePath.endsWith('.optimized.webp')));
  assert.ok(webpPaths.every((imagePath) => fs.existsSync(
    path.join(outputDirectory, decodeURIComponent(imagePath.slice(1)))
  )));

  const jpegImageBytes = [...new Set(imagePaths)].reduce((sum, imagePath) => {
    const imagePathOnDisk = path.join(outputDirectory, decodeURIComponent(imagePath.slice(1)));
    const imageBytes = fs.statSync(imagePathOnDisk).size;
    assert.ok(imageBytes < 500_000, `${imagePath} JPEG fallback should be optimized for older mobile browsers`);
    return sum + imageBytes;
  }, 0);
  const webpImageBytes = [...new Set(webpPaths)].reduce((sum, imagePath) => {
    const imagePathOnDisk = path.join(outputDirectory, decodeURIComponent(imagePath.slice(1)));
    const imageBytes = fs.statSync(imagePathOnDisk).size;
    assert.ok(imageBytes < 500_000, `${imagePath} WebP should be optimized for mobile`);
    return sum + imageBytes;
  }, 0);
  assert.ok(jpegImageBytes + webpImageBytes < 15_000_000, 'the generated image catalog should remain lightweight');
  const styles = fs.readFileSync(path.join(outputDirectory, 'css', 'styles.css'), 'utf8');
  assert.match(styles, /\.brand-story \{\s*scroll-margin-top: 120px;/);
  assert.match(styles, /@supports not \(aspect-ratio: 1 \/ 1\)/);
  assert.match(styles, /\.has-motion \.reveal-on-view\.is-visible \{\s*transform: translateY\(0\);\s*opacity: 1;/);
  assert.match(styles, /\.product-card__image\.is-loading::after/);
  assert.match(styles, /@keyframes cart-dialog-enter/);
  assert.match(styles, /@keyframes cart-dialog-exit/);
  assert.match(styles, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(styles, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(styles, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(styles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(styles, /@media \(max-width: 1024px\) \{\s*\.product-grid \{\s*grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(styles, /@media \(min-width: 651px\) and \(max-width: 1024px\) \{\s*\.product-card \{\s*flex-direction: row;/);
  assert.match(styles, /\.image-viewer__image \{[\s\S]*?object-fit: contain;/);
  assert.match(styles, /\.spring-promo__images \{[\s\S]*?height: 104px;/);
  assert.match(styles, /\.product-card__image \{[\s\S]*?aspect-ratio: 1\.6;/);
  assert.ok(fs.existsSync(path.join(outputDirectory, 'css', 'styles.css')));
  assert.ok(fs.existsSync(path.join(outputDirectory, 'js', 'main.js')));
  assert.ok(fs.existsSync(path.join(outputDirectory, 'js', 'carousel.js')));
  assert.ok(fs.existsSync(path.join(outputDirectory, 'js', 'pricing.js')));
  assert.ok(fs.existsSync(path.join(outputDirectory, 'favicon.svg')));
  assert.ok(fs.existsSync(path.join(outputDirectory, '.nojekyll')));
  const builtStorefrontScript = fs.readFileSync(path.join(outputDirectory, 'js', 'main.js'), 'utf8');
  assert.doesNotMatch(builtStorefrontScript, /raw\.githubusercontent\.com|shareImage|Imagem:/);
});
