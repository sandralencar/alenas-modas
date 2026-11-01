const cart = new Map();
const cartDialog = document.querySelector('[data-cart-dialog]');
const cartItems = document.querySelector('[data-cart-items]');
const cartPromotions = document.querySelector('[data-promo-summary]');
const cartCount = document.querySelector('[data-cart-count]');
const cartEmpty = document.querySelector('[data-cart-empty]');
const checkoutButton = document.querySelector('[data-checkout]');
const cartStatus = document.querySelector('[data-cart-status]');
const liveStatus = document.querySelector('[data-live-status]');
const cartTotal = document.querySelector('[data-cart-total]');
const cartSavings = document.querySelector('[data-cart-savings]');
const paymentMethod = document.querySelector('[data-payment-method]');
const cepInput = document.querySelector('[data-cep]');
const cepStatus = document.querySelector('[data-cep-status]');
const cepRetry = document.querySelector('[data-cep-retry]');
const addressFields = document.querySelector('[data-address-fields]');
const addressNumber = document.querySelector('[data-address-number]');
const addressComplement = document.querySelector('[data-address-complement]');
const addressNoNumber = document.querySelector('[data-address-no-number]');
const whatsAppNumber = document.body.dataset.whatsappNumber;
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const pricesByCard = new WeakMap();
let address = null;
let cepErrorMessage = '';
let lookupRequest = 0;
let requestedCep = '';
let isLookingUp = false;
let toastTimer;

function getPrice(card, size) {
  let prices = pricesByCard.get(card);
  if (!prices) {
    prices = JSON.parse(card.dataset.prices);
    pricesByCard.set(card, prices);
  }

  const price = prices[size];
  if (!Number.isSafeInteger(price)) throw new Error(`Preço indisponível para o tamanho ${size}.`);
  return price;
}

function updateProductPrice(card) {
  const size = card.querySelector('[data-product-size]').value;
  card.querySelector('[data-product-price]').textContent = currency.format(getPrice(card, size) / 100);
}

function getPublicImageUrl(imagePath) {
  const assetPath = imagePath.replace(/^\/+/, '');
  return new URL(assetPath, 'https://raw.githubusercontent.com/sandralencar/alenas-modas/main/src/public/').href;
}

function createPromoBundles() {
  const models = new Map();

  for (const item of cart.values()) {
    if (item.type !== 'unidade' || !['P', 'M', 'G'].includes(item.size)) continue;
    let model = models.get(item.id);
    if (!model) {
      model = { id: item.id, name: item.name, sizes: new Map() };
      models.set(item.id, model);
    }
    model.sizes.set(item.size, item.quantity);
  }

  const bundles = [];
  while (true) {
    const available = [...models.values()]
      .map((model) => ({
        ...model,
        quantity: [...model.sizes.values()].reduce((sum, quantity) => sum + quantity, 0)
      }))
      .filter((model) => model.quantity > 0)
      .sort((first, second) => second.quantity - first.quantity || first.id.localeCompare(second.id));

    if (available.length < 3) break;

    bundles.push(available.slice(0, 3).map((model) => {
      const size = [...model.sizes.entries()]
        .filter(([, quantity]) => quantity > 0)
        .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))[0][0];
      model.sizes.set(size, model.sizes.get(size) - 1);
      return { name: model.name, size };
    }));
  }

  return bundles;
}

function isItapeviAddress() {
  return address
    && address.uf === 'SP'
    && address.localidade.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'itapevi';
}

function updateShippingStatus() {
  if (isLookingUp) {
    cepStatus.textContent = 'Consultando CEP…';
    cepStatus.dataset.state = '';
    return;
  }

  if (cepErrorMessage) {
    cepStatus.textContent = cepErrorMessage;
    cepStatus.dataset.state = 'error';
    return;
  }

  if (!address) {
    cepStatus.textContent = 'Informe seu CEP para consultar o endereço e verificar o frete grátis para Itapevi/SP.';
    cepStatus.dataset.state = '';
    return;
  }

  if (isItapeviAddress()) {
    cepStatus.textContent = 'Frete grátis confirmado para Itapevi/SP.';
    cepStatus.dataset.state = 'success';
    return;
  }

  cepStatus.textContent = `Endereço localizado em ${address.localidade}/${address.uf}. Frete a combinar pelo WhatsApp.`;
  cepStatus.dataset.state = 'success';
}

function updateCart() {
  const quantity = [...cart.values()].reduce((total, item) => total + item.quantity, 0);
  const originalTotal = [...cart.values()].reduce((sum, item) => sum + item.price * item.quantity, 0);
  const bundles = createPromoBundles();
  const savings = bundles.length * (3 * 4500 - 9990);
  const total = originalTotal - savings;
  const enteredCep = cepInput.value.replace(/\D/g, '');
  const addressReady = address && address.cep === enteredCep && addressNumber.value.trim();

  cartCount.textContent = String(quantity);
  cartItems.replaceChildren();
  cartPromotions.replaceChildren();
  cartEmpty.hidden = quantity > 0;
  cartTotal.textContent = currency.format(total / 100);
  cartSavings.hidden = savings === 0;
  cartSavings.textContent = savings ? `Você economizou ${currency.format(savings / 100)} na promoção de primavera.` : '';
  checkoutButton.disabled = quantity === 0 || !paymentMethod.value || !addressReady;

  for (const [key, item] of cart) {
    const row = document.createElement('li');
    row.className = 'cart-item';

    const imageLink = document.createElement('a');
    imageLink.className = 'cart-item__image';
    imageLink.href = item.image;
    imageLink.target = '_blank';
    imageLink.rel = 'noopener noreferrer';
    imageLink.setAttribute('aria-label', `Ver imagem de ${item.name}`);
    const image = document.createElement('img');
    image.src = item.image;
    image.alt = '';
    image.loading = 'lazy';
    imageLink.append(image);

    const details = document.createElement('div');
    details.className = 'cart-item__details';
    const name = document.createElement('strong');
    name.textContent = `${item.name} · ${item.size}`;
    details.append(name);

    const price = document.createElement('span');
    price.textContent = `${item.quantity} × ${currency.format(item.price / 100)} = ${currency.format(item.price * item.quantity / 100)}`;
    details.append(price);

    const controls = document.createElement('div');
    controls.className = 'cart-item__controls';
    const decrease = document.createElement('button');
    decrease.type = 'button';
    decrease.dataset.cartAction = 'decrease';
    decrease.dataset.cartKey = key;
    decrease.setAttribute('aria-label', `Remover uma unidade de ${item.name}`);
    decrease.textContent = '−';

    const count = document.createElement('span');
    count.textContent = String(item.quantity);
    count.setAttribute('aria-label', `Quantidade: ${item.quantity}`);

    const increase = document.createElement('button');
    increase.type = 'button';
    increase.dataset.cartAction = 'increase';
    increase.dataset.cartKey = key;
    increase.setAttribute('aria-label', `Adicionar uma unidade de ${item.name}`);
    increase.textContent = '+';

    controls.append(decrease, count, increase);
    row.append(imageLink, details, controls);
    cartItems.append(row);
  }

  bundles.forEach((bundle, index) => {
    const row = document.createElement('li');
    row.className = 'cart-promo';
    const heading = document.createElement('strong');
    heading.textContent = `Combo Primavera ${bundles.length > 1 ? `${index + 1} · ` : ''}3 sutiãs por R$ 99,90`;
    const detail = document.createElement('span');
    detail.textContent = bundle.map((item) => `${item.name} (${item.size})`).join(' + ');
    const discount = document.createElement('em');
    discount.textContent = 'Desconto de R$ 35,10 aplicado';
    row.append(heading, detail, discount);
    cartPromotions.append(row);
  });

  updateShippingStatus();
}

function showAddedMessage(message) {
  liveStatus.textContent = message;
  liveStatus.setAttribute('aria-hidden', 'false');
  liveStatus.classList.add('cart-toast--visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    liveStatus.classList.remove('cart-toast--visible');
    liveStatus.setAttribute('aria-hidden', 'true');
  }, 3500);
}

async function lookupAddress() {
  const cep = cepInput.value.replace(/\D/g, '');
  if (!/^\d{8}$/.test(cep) || requestedCep === cep || (address && address.cep === cep)) return;

  requestedCep = cep;
  const requestId = ++lookupRequest;
  address = null;
  cepErrorMessage = '';
  isLookingUp = true;
  addressFields.hidden = true;
  cepStatus.textContent = 'Consultando CEP…';
  cepStatus.dataset.state = '';
  updateCart();

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) throw new Error(`Consulta de CEP retornou HTTP ${response.status}.`);
    const result = await response.json();
    if (requestId !== lookupRequest) return;
    isLookingUp = false;
    if (result.erro) {
      cepErrorMessage = 'CEP não encontrado. Confira os números e tente novamente.';
      cepRetry.hidden = false;
      requestedCep = '';
      updateCart();
      return;
    }

    address = {
      cep,
      logradouro: result.logradouro || '',
      bairro: result.bairro || '',
      localidade: result.localidade || '',
      uf: result.uf || ''
    };
    document.querySelector('[data-address-street]').value = address.logradouro;
    document.querySelector('[data-address-neighborhood]').value = address.bairro;
    document.querySelector('[data-address-city]').value = address.localidade;
    document.querySelector('[data-address-state]').value = address.uf;
    addressFields.hidden = false;
    cepRetry.hidden = true;
    addressNoNumber.checked = false;
    addressNumber.disabled = false;
    addressNumber.required = true;
    addressNumber.value = '';
    updateCart();
    addressNumber.focus();
  } catch (error) {
    if (requestId !== lookupRequest) return;
    isLookingUp = false;
    console.error('Não foi possível consultar o CEP no ViaCEP:', error);
    cepErrorMessage = 'Não foi possível consultar o CEP agora. Verifique sua conexão e tente novamente.';
    cepRetry.hidden = false;
    requestedCep = '';
    updateCart();
  }
}

document.querySelectorAll('[data-open-cart]').forEach((button) => {
  button.addEventListener('click', () => cartDialog.showModal());
});

document.querySelector('[data-close-cart]').addEventListener('click', () => cartDialog.close());

cepRetry.addEventListener('click', lookupAddress);

paymentMethod.addEventListener('change', updateCart);

cartDialog.addEventListener('click', (event) => {
  if (event.target === cartDialog) cartDialog.close();
});

document.querySelectorAll('[data-product-id]').forEach((card) => {
  const sizeSelect = card.querySelector('[data-product-size]');
  const quantityDisplay = card.querySelector('[data-unit-count]');
  const quantityButtons = card.querySelectorAll('[data-quantity-action]');
  let selectedQuantity = 1;

  sizeSelect.addEventListener('change', () => updateProductPrice(card));
  updateProductPrice(card);

  quantityButtons.forEach((button) => {
    button.addEventListener('click', () => {
      selectedQuantity = Math.max(1, Math.min(10, selectedQuantity + (button.dataset.quantityAction === 'increase' ? 1 : -1)));
      quantityDisplay.value = String(selectedQuantity);
      quantityDisplay.textContent = String(selectedQuantity);
      card.querySelector('[data-quantity-action="decrease"]').disabled = selectedQuantity === 1;
      card.querySelector('[data-quantity-action="increase"]').disabled = selectedQuantity === 10;
    });
  });

  card.querySelector('[data-add-to-cart]').addEventListener('click', () => {
    const id = card.dataset.productId;
    const size = sizeSelect.value;
    const key = JSON.stringify([id, size]);
    const item = cart.get(key);
    if (item) {
      item.quantity += selectedQuantity;
    } else {
      cart.set(key, {
        id,
        name: card.dataset.productName,
        image: card.dataset.productImage,
        shareImage: getPublicImageUrl(card.dataset.productImage),
        type: card.dataset.productType,
        size,
        price: getPrice(card, size),
        quantity: selectedQuantity
      });
    }

    const addedQuantity = selectedQuantity;
    selectedQuantity = 1;
    quantityDisplay.value = '1';
    quantityDisplay.textContent = '1';
    card.querySelector('[data-quantity-action="decrease"]').disabled = true;
    card.querySelector('[data-quantity-action="increase"]').disabled = false;
    updateCart();
    showAddedMessage(`${addedQuantity} ${addedQuantity === 1 ? 'peça adicionada' : 'peças adicionadas'} à sacola. Combo Primavera: 3 modelos diferentes por R$ 99,90.`);
  });
});

cartItems.addEventListener('click', (event) => {
  const button = event.target.closest('[data-cart-action]');
  if (!button) return;

  const item = cart.get(button.dataset.cartKey);
  if (!item) return;

  if (button.dataset.cartAction === 'increase') {
    item.quantity += 1;
  } else if (item.quantity > 1) {
    item.quantity -= 1;
  } else {
    cart.delete(button.dataset.cartKey);
  }

  updateCart();
});

cepInput.addEventListener('input', () => {
  const digits = cepInput.value.replace(/\D/g, '').slice(0, 8);
  cepInput.value = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
  if (digits !== requestedCep) {
    requestedCep = '';
    lookupRequest += 1;
    address = null;
    cepErrorMessage = '';
    isLookingUp = false;
    cepRetry.hidden = true;
    addressFields.hidden = true;
    document.querySelector('[data-address-street]').value = '';
    document.querySelector('[data-address-neighborhood]').value = '';
    document.querySelector('[data-address-city]').value = '';
    document.querySelector('[data-address-state]').value = '';
  }
  updateCart();
  if (digits.length === 8) lookupAddress();
});

addressNumber.addEventListener('input', updateCart);
addressComplement.addEventListener('input', updateCart);

addressNoNumber.addEventListener('change', () => {
  addressNumber.disabled = addressNoNumber.checked;
  addressNumber.required = !addressNoNumber.checked;
  addressNumber.value = addressNoNumber.checked ? 'S/N' : '';
  updateCart();
});

checkoutButton.addEventListener('click', () => {
  if (cart.size === 0) {
    cartStatus.textContent = 'Adicione ao menos uma peça antes de concluir o pedido.';
    return;
  }

  if (!paymentMethod.value) {
    cartStatus.textContent = 'Escolha uma forma de pagamento para continuar.';
    paymentMethod.focus();
    return;
  }

  if (!address || address.cep !== cepInput.value.replace(/\D/g, '') || !addressNumber.value.trim()) {
    cartStatus.textContent = 'Consulte seu CEP e informe o número do endereço para continuar.';
    cepInput.focus();
    return;
  }

  if (!/^\d{10,15}$/.test(whatsAppNumber || '')) {
    cartStatus.textContent = 'O atendimento pelo WhatsApp não está configurado. Fale com a loja para concluir seu pedido.';
    return;
  }

  const orderLines = [...cart.values()].map(({ name, size, price, quantity, shareImage }) => {
    return `• ${quantity}x ${name} — tamanho ${size} — ${currency.format(price / 100)} cada\n  Imagem: ${shareImage}`;
  });
  const bundles = createPromoBundles();
  const originalTotal = [...cart.values()].reduce((sum, item) => sum + item.price * item.quantity, 0);
  const savings = bundles.length * (3 * 4500 - 9990);
  const total = originalTotal - savings;
  const deliveryAddress = [
    address.logradouro,
    addressNumber.value.trim(),
    addressComplement.value.trim(),
    address.bairro,
    `${address.localidade}/${address.uf}`,
    `CEP ${cepInput.value}`
  ].filter(Boolean).join(', ');
  const delivery = isItapeviAddress() ? 'Frete grátis · Itapevi/SP' : `Frete a combinar · ${address.localidade}/${address.uf}`;
  const message = [
    'Olá! Gostaria de concluir este pedido da coleção de primavera Alenas Lingerie:',
    '',
    ...orderLines,
    ...bundles.map((bundle, index) => `🌷 Combo Primavera ${bundles.length > 1 ? index + 1 : ''}: ${bundle.map((item) => `${item.name} (${item.size})`).join(' + ')} — R$ 99,90 (economia de R$ 35,10)`),
    '',
    `Total dos produtos: ${currency.format(total / 100)}`,
    `Forma de pagamento: ${paymentMethod.value}`,
    `Entrega: ${delivery}`,
    `Endereço: ${deliveryAddress}`
  ].join('\n');

  window.location.assign(`https://wa.me/${whatsAppNumber}?text=${encodeURIComponent(message)}`);
});

paymentMethod.addEventListener('change', () => {
  cartStatus.textContent = '';
});

updateCart();

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });

  document.body.classList.add('has-motion');
  document.querySelectorAll('.reveal-on-view, .product-card').forEach((element) => {
    revealObserver.observe(element);
  });
}
