const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { after, before, test } = require('node:test');

const originalWhatsAppNumber = process.env.WHATSAPP_SELLER_NUMBER;
process.env.WHATSAPP_SELLER_NUMBER = '5588988573785';

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
  assert.match(html, /Mais de 25 anos entregando <em>qualidade\.<\/em>/);
  assert.match(html, /http-equiv="Content-Security-Policy"/);
  assert.match(html, /connect-src 'self' https:\/\/viacep\.com\.br/);
  assert.match(html, /Concluir pedido no WhatsApp/);
  assert.match(html, /data-whatsapp-number="5588988573785"/);
  assert.match(html, /data-add-to-cart/);
  assert.match(html, /data-product-type="dupla"/);
  assert.match(html, /data-product-type="trio"/);
  assert.match(html, /<select data-product-size required>/);
  assert.match(html, /data-quantity-action="decrease"/);
  assert.match(html, /data-quantity-action="increase"/);
  assert.match(html, /<option value="G4">G4<\/option>/);
  assert.match(html, /<option value="Cartão de crédito">Cartão de crédito<\/option>/);
  assert.match(html, /<option value="Cartão de débito">Cartão de débito<\/option>/);
  assert.match(html, /data-cart-total/);
  assert.match(html, /3 sutiãs por <strong>R\$ 99,90<\/strong>/);
  assert.match(html, /Frete grátis para Itapevi\/SP/);
  assert.match(html, /Mais de 25 anos entregando/);
  assert.match(html, /uma história feita à mão, com cuidado em cada costura/i);
  assert.match(html, /texturas de alta qualidade/i);
  assert.match(html, /spring-promo__images/);
  assert.match(html, /data-product-image=/);
  assert.match(html, /data-promo-summary/);
  assert.match(html, /data-cep/);
  assert.match(html, /data-cep-retry/);
  assert.match(html, /data-address-no-number/);
  assert.match(html, /https:\/\/wa\.me\/5588988573785/);
  assert.doesNotMatch(html, /preços? ilustrativos|tamanhos demonstrativos|Acesso administrativo/i);

  const prices = [...html.matchAll(/data-prices="([^"]+)"/g)]
    .map(([, value]) => JSON.parse(value.replace(/&#34;/g, '"')));
  assert.ok(prices.some((price) => price.P === 4500 && price.G === 4500 && Object.keys(price).length === 3));
  assert.ok(prices.some((price) => price.P === 7490 && price.G1 === 7490 && price.G2 === 9990));
  assert.ok(prices.some((price) => price.P === 9990 && price.G1 === 13490 && price.G4 === 13490));

  const imagePaths = [...html.matchAll(/<img src="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(imagePaths.length, 32);
  assert.match(html, /loading="lazy" decoding="async"/);

  const imageResponses = await Promise.all(imagePaths.map((imagePath) => fetch(new URL(imagePath, baseUrl))));
  assert.ok(imageResponses.every((imageResponse) => imageResponse.status === 200));
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

test('links de imagens do pedido apontam para os arquivos públicos do repositório', () => {
  const storefrontScript = fs.readFileSync(path.join(__dirname, '..', 'src', 'public', 'js', 'main.js'), 'utf8');
  assert.match(storefrontScript, /raw\.githubusercontent\.com\/sandralencar\/alenas-modas\/main\/src\/public/);
  assert.match(storefrontScript, /shareImage/);
});

test('build estático preserva catálogo, regras e caminhos para GitHub Pages', () => {
  const projectRoot = path.join(__dirname, '..');
  execFileSync(process.execPath, [path.join(projectRoot, 'scripts', 'build-static.js')], {
    cwd: projectRoot,
    env: { ...process.env, BASE_PATH: '/alenas-modas' },
    stdio: 'pipe'
  });

  const outputDirectory = path.join(projectRoot, 'dist');
  const html = fs.readFileSync(path.join(outputDirectory, 'index.html'), 'utf8');

  assert.match(html, /href="\/alenas-modas\/css\/styles\.css"/);
  assert.match(html, /src="\/alenas-modas\/js\/main\.js"/);
  assert.match(html, /data-base-path="\/alenas-modas"/);
  assert.match(html, /http-equiv="Content-Security-Policy"/);
  assert.match(html, /COMBO PARA FLORESCER/);
  assert.match(html, /3 sutiãs por <strong>R\$ 99,90<\/strong>/);
  assert.match(html, /data-prices="[^"]*7490/);
  assert.doesNotMatch(html, /<%[\s\S]*?%>/);

  const imagePaths = [...html.matchAll(/<img src="([^"]+)"/g)].map(([, imagePath]) => imagePath);
  assert.equal(imagePaths.length, 32);
  assert.ok(imagePaths.every((imagePath) => imagePath.startsWith('/alenas-modas/img/')));
  assert.ok(imagePaths.every((imagePath) => imagePath.endsWith('.optimized.jpg')));
  assert.ok(imagePaths.every((imagePath) => fs.existsSync(
    path.join(outputDirectory, decodeURIComponent(imagePath.slice('/alenas-modas/'.length)))
  )));
  const webpPaths = [...html.matchAll(/<source srcset="([^"]+)" type="image\/webp">/g)]
    .map(([, imagePath]) => imagePath);
  assert.equal(webpPaths.length, imagePaths.length);
  assert.ok(webpPaths.every((imagePath) => imagePath.endsWith('.optimized.webp')));
  assert.ok(webpPaths.every((imagePath) => fs.existsSync(
    path.join(outputDirectory, decodeURIComponent(imagePath.slice('/alenas-modas/'.length)))
  )));

  const jpegImageBytes = [...new Set(imagePaths)].reduce((sum, imagePath) => {
    const imagePathOnDisk = path.join(outputDirectory, decodeURIComponent(imagePath.slice('/alenas-modas/'.length)));
    const imageBytes = fs.statSync(imagePathOnDisk).size;
    assert.ok(imageBytes < 500_000, `${imagePath} JPEG fallback should be optimized for older mobile browsers`);
    return sum + imageBytes;
  }, 0);
  const webpImageBytes = [...new Set(webpPaths)].reduce((sum, imagePath) => {
    const imagePathOnDisk = path.join(outputDirectory, decodeURIComponent(imagePath.slice('/alenas-modas/'.length)));
    const imageBytes = fs.statSync(imagePathOnDisk).size;
    assert.ok(imageBytes < 500_000, `${imagePath} WebP should be optimized for mobile`);
    return sum + imageBytes;
  }, 0);
  assert.ok(jpegImageBytes + webpImageBytes < 15_000_000, 'the generated image catalog should remain lightweight');
  const styles = fs.readFileSync(path.join(outputDirectory, 'css', 'styles.css'), 'utf8');
  assert.match(styles, /@supports not \(aspect-ratio: 1 \/ 1\)/);
  assert.match(styles, /\.has-motion \.product-card,[\s\S]*?opacity: 1/);
  assert.ok(fs.existsSync(path.join(outputDirectory, 'css', 'styles.css')));
  assert.ok(fs.existsSync(path.join(outputDirectory, 'js', 'main.js')));
  assert.ok(fs.existsSync(path.join(outputDirectory, '.nojekyll')));
});
