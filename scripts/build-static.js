const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const sharp = require('sharp');
const { getHomeData } = require('../src/controllers/storeController');

const projectRoot = path.join(__dirname, '..');
const outputDirectory = path.join(projectRoot, 'dist');
const publicDirectory = path.join(projectRoot, 'src', 'public');
const templatePath = path.join(projectRoot, 'src', 'views', 'store', 'home.ejs');
const configuredBasePath = process.env.BASE_PATH || '/';
const basePath = configuredBasePath === '/' ? '' : configuredBasePath.replace(/\/+$/, '');
const sourceImageDirectory = path.join(publicDirectory, 'img');

if ((basePath && !basePath.startsWith('/')) || basePath.includes('..') || /[?#]/.test(basePath)) {
  throw new Error('BASE_PATH must be a URL path such as /alenas-modas or /.');
}

async function build() {
  fs.rmSync(outputDirectory, { recursive: true, force: true });
  fs.mkdirSync(outputDirectory, { recursive: true });

  const homeData = getHomeData();
  const optimizedImages = new Map();
  for (const product of homeData.products) {
    let displayImages = optimizedImages.get(product.image);
    if (!displayImages) {
      displayImages = {
        webp: product.image.replace(/\.[^.]+$/, '.optimized.webp'),
        fallback: product.image.replace(/\.[^.]+$/, '.optimized.jpg')
      };
      const sourceImage = path.join(sourceImageDirectory, decodeURIComponent(product.image.slice('/img/'.length)));
      const webpImage = path.join(outputDirectory, decodeURIComponent(displayImages.webp.slice(1)));
      const fallbackImage = path.join(outputDirectory, decodeURIComponent(displayImages.fallback.slice(1)));
      await fs.promises.mkdir(path.dirname(webpImage), { recursive: true });
      await sharp(sourceImage)
        .rotate()
        .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82, effort: 5 })
        .toFile(webpImage);
      await sharp(sourceImage)
        .rotate()
        .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#fbf8f4' })
        .jpeg({ quality: 80, mozjpeg: true, progressive: false })
        .toFile(fallbackImage);
      optimizedImages.set(product.image, displayImages);
    }

    product.displayImage = displayImages.webp;
    product.fallbackImage = displayImages.fallback;
    const metadata = await sharp(path.join(outputDirectory, decodeURIComponent(displayImages.webp.slice(1)))).metadata();
    product.imageWidth = metadata.width;
    product.imageHeight = metadata.height;
  }

  const html = await ejs.renderFile(templatePath, {
    ...homeData,
    basePath: basePath === '/' ? '' : basePath
  });

  fs.writeFileSync(path.join(outputDirectory, 'index.html'), html);
  fs.cpSync(path.join(publicDirectory, 'css'), path.join(outputDirectory, 'css'), { recursive: true });
  fs.cpSync(path.join(publicDirectory, 'js'), path.join(outputDirectory, 'js'), { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, '.nojekyll'), '');

  const originalBytes = homeData.products.reduce((sum, product) => {
    const sourceImage = path.join(sourceImageDirectory, decodeURIComponent(product.image.slice('/img/'.length)));
    return sum + fs.statSync(sourceImage).size;
  }, 0);
  const webpBytes = [...optimizedImages.values()].reduce((sum, images) => {
    return sum + fs.statSync(path.join(outputDirectory, decodeURIComponent(images.webp.slice(1)))).size;
  }, 0);
  const fallbackBytes = [...optimizedImages.values()].reduce((sum, images) => {
    return sum + fs.statSync(path.join(outputDirectory, decodeURIComponent(images.fallback.slice(1)))).size;
  }, 0);
  const reduction = Math.round((1 - webpBytes / originalBytes) * 100);
  console.log(`Static storefront generated at ${outputDirectory} with base path ${basePath || '/'}; WebP images reduced by ${reduction}%, JPEG fallbacks total ${Math.ceil(fallbackBytes / 1_000_000)} MB.`);
}

build().catch((error) => {
  console.error('Could not generate the static storefront:', error);
  process.exitCode = 1;
});
