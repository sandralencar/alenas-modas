const fs = require('node:fs');
const path = require('node:path');

const imageGroups = [
  { directory: 'dupla', type: 'dupla' },
  { directory: 'sutiãs vitrine unidade e trio', type: 'unidade' }
];
const pricesByType = {
  unidade: { P: 4500, M: 4500, G: 4500 },
  dupla: { P: 7490, M: 7490, G: 7490, G1: 7490, G2: 9990, G3: 9990, G4: 9990 },
  trio: { P: 9990, M: 9990, G: 9990, G1: 13490, G2: 13490, G3: 13490, G4: 13490 }
};

function getProducts() {
  const imageRoot = path.join(__dirname, '..', 'public', 'img');

  return imageGroups.flatMap(({ directory, type }) => {
    const files = fs.readdirSync(path.join(imageRoot, directory), { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((first, second) => first.localeCompare(second, 'pt-BR'));

    return files.map((filename) => {
      const name = path.parse(filename).name;
      const productType = /\btrio\b/i.test(name) ? 'trio' : type;

      return {
        id: `${directory}/${filename}`,
        name,
        type: productType,
        prices: pricesByType[productType],
        category: productType === 'trio' ? 'Trio · 3 sutiãs' : productType === 'dupla' ? 'Dupla · 2 sutiãs' : 'Sutiã unitário',
        image: `/img/${[directory, filename].map(encodeURIComponent).join('/')}`
      };
    });
  });
}

function getHomeData() {
  const configuredNumber = process.env.WHATSAPP_SELLER_NUMBER || '5588988573785';
  const whatsAppNumber = /^\d{10,15}$/.test(configuredNumber) ? configuredNumber : '';
  const products = getProducts();
  const productImages = (type, limit) => products
    .filter((product) => product.type === type)
    .slice(0, limit);

  return {
    pageTitle: 'Coleção de Primavera',
    products,
    promoImages: {
      combo: productImages('unidade', 3),
      dupla: productImages('dupla', 2),
      frete: productImages('unidade', 1)
    },
    sizes: Object.fromEntries(Object.entries(pricesByType).map(([type, prices]) => [type, Object.keys(prices)])),
    whatsAppNumber
  };
}

function home(req, res) {
  res.render('store/home', { ...getHomeData(), basePath: '' });
}

module.exports = { getHomeData, home };
