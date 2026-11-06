const fs = require('node:fs');
const path = require('node:path');

const imageGroups = [
  { directory: 'dupla', type: 'dupla' },
  { directory: 'sutiãs vitrine unidade e trio', type: 'unidade' }
];
const pricesByType = {
  unidade: { P: 3500, M: 3500, G: 3500, G1: 4500, G2: 4500, G3: 4500, G4: 4500 },
  dupla: { P: 7490, M: 7490, G: 7490, G1: 9990, G2: 9990, G3: 9990, G4: 9990 },
  trio: { P: 9990, M: 9990, G: 9990, G1: 13490, G2: 13490, G3: 13490, G4: 13490 }
};
const productDetails = {
  'Lingerie preta sobre cetim marfim.png': { name: 'Dupla de sutiãs pretos em microfibra', type: 'dupla' },
  'Sutiã Azul sobre Seda Luxuosa.png': { name: 'Sutiã azul em microfibra' },
  'Sutiã Azul-Marinho em Cetim e Renda.png': { name: 'Sutiã azul-marinho em microfibra e renda' },
  'Sutiã de Noiva em Cetim e Renda.png': { name: 'Sutiã branco de noiva em microfibra e renda' },
  'Sutiã Dourado em Cetim e Renda.png': { name: 'Dupla de sutiãs amarelos em microfibra e renda' },
  'Sutiã Nude em Cenário Romântico Pela Satin.png': { name: 'Sutiã nude em microfibra' },
  'Sutiã Romântico em Cetim Rosé.png': { name: 'Sutiã rosé romântico em microfibra' },
  'Sutiã Rosa em Cetim e Renda.png': { name: 'Sutiã rosa em microfibra e renda' },
  'Sutiã Rosa Romântico em Cetim e Renda.png': { name: 'Sutiã rosa romântico em microfibra e renda' },
  'Sutiã Tricolor em Cetim Romântico.png': { name: 'Trio de sutiãs vermelho, branco e preto em microfibra', type: 'trio' },
  'Sutiã Vermelho em Cetim e Renda.png': { name: 'Sutiã vermelho em microfibra e renda' },
  'Sutiãs Luxuosos em Cetim e Flores.png': { name: 'Dupla de sutiãs nude e preto em microfibra', type: 'dupla' },
  'Trio de sutiãs em tons suaves.png': { name: 'Trio de sutiãs marrom, rosé e nude', type: 'trio' },
  'Trio de Sutiãs em Cetim Bege.png': { name: 'Trio de sutiãs branco, preto e bege em microfibra', type: 'trio' },
  'Sutiã amarelo sobre seda branca.png': { name: 'Sutiã amarelo em microfibra' },
  'Sutiã azul real em cetim elegante.png': { name: 'Sutiã azul real em microfibra' },
  'Sutiã Azul-Marinho em Cetim e Rosas.png': { name: 'Sutiã azul-marinho em microfibra com rosas' },
  'Sutiã Borgonha em Cetim Romântico.png': { name: 'Sutiã vermelho romântico em microfibra' },
  'Sutiã Branco em Cetim Cremoso.png': { name: 'Sutiã branco em microfibra' },
  'Sutiã Nude em Cetim com Flores e Pétalas.png': { name: 'Sutiã nude em microfibra com flores e pétalas' },
  'Sutiã Nude em Cetim com Pétalas.png': { name: 'Sutiã rosé em microfibra com pétalas' },
  'Sutiã Preto em Cetim Luxuoso.png': { name: 'Sutiã preto em microfibra' },
  'Sutiã Verde Oliva sobre Cetim Luxuoso.png': { name: 'Sutiã cor de castanha em microfibra' }
};

function getProducts() {
  const imageRoot = path.join(__dirname, '..', 'public', 'img');
  const products = imageGroups.flatMap(({ directory, type }) => {
    const files = fs.readdirSync(path.join(imageRoot, directory), { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((first, second) => first.localeCompare(second, 'pt-BR'));

    return files.map((filename) => {
      const details = productDetails[filename] || {};
      const name = details.name || path.parse(filename).name;
      const productType = details.type || (/\btrio\b/i.test(name) ? 'trio' : type);
      return {
        id: `${directory}/${filename}`,
        name,
        type: productType,
        prices: pricesByType[productType],
        category: productType === 'trio' ? 'Kit com 3 sutiãs' : productType === 'dupla' ? 'Kit com 2 sutiãs' : 'Sutiã unitário',
        image: `/img/${[directory, filename].map(encodeURIComponent).join('/')}`
      };
    });
  });

  const typeOrder = { trio: 0, dupla: 1, unidade: 2 };
  return products.sort((first, second) => typeOrder[first.type] - typeOrder[second.type]);
}

function getHomeData({ sellerNumber = process.env.WHATSAPP_SELLER_NUMBER || '5511987460976' } = {}) {
  const configuredNumber = sellerNumber;
  const whatsAppNumber = /^\d{10,15}$/.test(configuredNumber) ? configuredNumber : '';
  const products = getProducts();
  const featuredProduct = (filename) => {
    const product = products.find(({ id }) => id.endsWith(`/${filename}`));
    if (!product) throw new Error(`Fotografia do carrossel não encontrada: ${filename}.`);
    return product;
  };
  const productImages = (type, limit) => products
    .filter((product) => product.type === type)
    .slice(0, limit);

  return {
    pageTitle: 'Coleção de Primavera',
    products,
    productGroups: [
      { type: 'trio', id: 'catalogo-trio', title: 'Kits com 3 sutiãs' },
      { type: 'dupla', id: 'catalogo-dupla', title: 'Kits com 2 sutiãs' },
      { type: 'unidade', id: 'catalogo-individual', title: 'Sutiãs individuais' }
    ].map((group) => ({
      ...group,
      products: products.filter((product) => product.type === group.type)
    })),
    heroSlides: [
      {
        eyebrow: 'KIT COM 3 SUTIÃS',
        title: 'Seu trio favorito',
        offer: '3 sutiãs por R$ 99,90',
        sizes: 'Tamanhos P ao G',
        extendedSizes: 'G1 ao G4 por R$ 134,90',
        action: 'Escolher meu trio',
        href: '#catalogo-trio',
        product: featuredProduct('Trio de sutiãs em tons suaves.png')
      },
      {
        eyebrow: 'KIT COM 2 SUTIÃS',
        title: 'Dupla especial',
        offer: '2 sutiãs por R$ 74,90',
        sizes: 'Tamanhos P ao G',
        extendedSizes: 'G1 ao G4 por R$ 99,90',
        action: 'Escolher minha dupla',
        href: '#catalogo-dupla',
        product: featuredProduct('Sutiã Dourado em Cetim e Renda.png')
      },
      {
        eyebrow: 'SUTIÃ INDIVIDUAL',
        title: 'Escolha seu favorito',
        offer: '1 sutiã por R$ 35,00',
        sizes: 'Tamanhos P ao G',
        extendedSizes: 'G1 ao G4 por R$ 45,00',
        action: 'Ver modelos',
        href: '#catalogo-individual',
        product: featuredProduct('Sutiã azul real em cetim elegante.png')
      }
    ],
    promoImages: {
      combo: productImages('unidade', 3),
      dupla: productImages('dupla', 2),
      trio: productImages('trio', 1),
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
