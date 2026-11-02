const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const sharp = require('sharp');
const { getHomeData } = require('../src/controllers/storeController');

const projectRoot = path.join(__dirname, '..');
const outputDirectory = path.join(projectRoot, 'dist');
const publicDirectory = path.join(projectRoot, 'src', 'public');
const templatePath = path.join(projectRoot, 'src', 'views', 'store', 'home.ejs');
const configuredBasePath = process.env.BASE_PATH || '/alenas-modas';
const basePath = configuredBasePath.replace(/\/+$/, '');
const sourceImageDirectory = path.join(publicDirectory, 'img');

if (!basePath.startsWith('/') || basePath.includes('..') || /[?#]/.test(basePath)) {
  throw new Error('BASE_PATH must be a URL path such as /alenas-modas or /.');
}

async function build() {
  fs.rmSync(outputDirectory, { recursive: true, force: true });
  fs.mkdirSync(outputDirectory, { recursive: true });

  const homeData = getHomeData();
  const optimizedImages = new Map();
  for (const product of homeData.products) {
    let displayImage = optimizedImages.get(product.image);
    if (!displayImage) {
      displayImage = product.image.replace(/\.[^.]+$/, '.optimized.webp');
      const sourceImage = path.join(sourceImageDirectory, decodeURIComponent(product.image.slice('/img/'.length)));
      const outputImage = path.join(outputDirectory, decodeURIComponent(displayImage.slice(1)));
      await fs.promises.mkdir(path.dirname(outputImage), { recursive: true });
      await sharp(sourceImage).rotate().webp({ quality: 82, effort: 5 }).toFile(outputImage);
      optimizedImages.set(product.image, displayImage);
    }

    product.displayImage = displayImage;
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
  const optimizedBytes = [...optimizedImages.values()].reduce((sum, imagePath) => {
    const outputImage = path.join(outputDirectory, decodeURIComponent(imagePath.slice(1)));
    return sum + fs.statSync(outputImage).size;
  }, 0);
  const reduction = Math.round((1 - optimizedBytes / originalBytes) * 100);
  console.log(`Static storefront generated at ${outputDirectory} with base path ${basePath || '/'}; images reduced by ${reduction}%.`);
}

build().catch((error) => {
  console.error('Could not generate the static storefront:', error);
  process.exitCode = 1;
});
