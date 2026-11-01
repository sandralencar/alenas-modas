const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const { getHomeData } = require('../src/controllers/storeController');

const projectRoot = path.join(__dirname, '..');
const outputDirectory = path.join(projectRoot, 'dist');
const publicDirectory = path.join(projectRoot, 'src', 'public');
const templatePath = path.join(projectRoot, 'src', 'views', 'store', 'home.ejs');
const configuredBasePath = process.env.BASE_PATH || '/alenas-modas';
const basePath = configuredBasePath.replace(/\/+$/, '');

if (!basePath.startsWith('/') || basePath.includes('..') || /[?#]/.test(basePath)) {
  throw new Error('BASE_PATH must be a URL path such as /alenas-modas or /.');
}

async function build() {
  fs.rmSync(outputDirectory, { recursive: true, force: true });
  fs.mkdirSync(outputDirectory, { recursive: true });

  const html = await ejs.renderFile(templatePath, {
    ...getHomeData(),
    basePath: basePath === '/' ? '' : basePath
  });

  fs.writeFileSync(path.join(outputDirectory, 'index.html'), html);
  fs.cpSync(publicDirectory, outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, '.nojekyll'), '');
  console.log(`Static storefront generated at ${outputDirectory} with base path ${basePath || '/'}.`);
}

build().catch((error) => {
  console.error('Could not generate the static storefront:', error);
  process.exitCode = 1;
});
