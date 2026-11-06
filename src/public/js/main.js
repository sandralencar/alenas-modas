const cart = new Map();
const cartDialog = document.querySelector('[data-cart-dialog]');
const cartItems = document.querySelector('[data-cart-items]');
const cartPricingSummary = document.querySelector('[data-cart-pricing]');
const cartCount = document.querySelector('[data-cart-count]');
const cartEmpty = document.querySelector('[data-cart-empty]');
const checkoutButton = document.querySelector('[data-checkout]');
const cartStatus = document.querySelector('[data-cart-status]');
const liveStatus = document.querySelector('[data-live-status]');
const cartTotal = document.querySelector('[data-cart-total]');
const imageViewer = document.querySelector('[data-image-viewer]');
const imageViewerImage = imageViewer.querySelector('[data-image-viewer-image]');
const imageViewerTitle = imageViewer.querySelector('[data-image-viewer-title]');
const imageViewerCategory = imageViewer.querySelector('[data-image-viewer-category]');
const paymentMethod = document.querySelector('[data-payment-method]');
const cepInput = document.querySelector('[data-cep]');
const cepStatus = document.querySelector('[data-cep-status]');
const cepRetry = document.querySelector('[data-cep-retry]');
const addressFields = document.querySelector('[data-address-fields]');
const addressNumber = document.querySelector('[data-address-number]');
const addressComplement = document.querySelector('[data-address-complement]');
const addressNoNumber = document.querySelector('[data-address-no-number]');
const whatsAppNumber = document.body.dataset.whatsappNumber;
const basePath = document.body.dataset.basePath || '';
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const pricesByCard = new WeakMap();
let address = null;
let cepErrorMessage = '';
let lookupRequest = 0;
let requestedCep = '';
let isLookingUp = false;
let isCartClosing = false;
let cartCloseTimer;
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

function getLocalImageUrl(imagePath) {
  return `${basePath}${imagePath}`;
}

function openCart() {
  if (cartDialog.open) return;
  isCartClosing = false;
  cartDialog.classList.remove('is-closing');

  if (typeof cartDialog.showModal === 'function') {
    cartDialog.showModal();
    return;
  }

  cartDialog.setAttribute('open', '');
  document.body.classList.add('cart-dialog-fallback-open');
}

function closeCart() {
  if (!cartDialog.open || isCartClosing) return;
  isCartClosing = true;

  const finishClose = (event) => {
    if (event && (event.target !== cartDialog || event.animationName !== 'cart-dialog-exit')) return;
    if (!isCartClosing) return;
    cartDialog.removeEventListener('animationend', finishClose);
    window.clearTimeout(cartCloseTimer);
    cartDialog.classList.remove('is-closing');
    isCartClosing = false;

    if (typeof cartDialog.close === 'function' && cartDialog.open) {
      cartDialog.close();
      return;
    }

    cartDialog.removeAttribute('open');
    document.body.classList.remove('cart-dialog-fallback-open');
  };

  cartDialog.addEventListener('animationend', finishClose);
  cartDialog.classList.add('is-closing');
  cartCloseTimer = window.setTimeout(() => finishClose(), 240);
}

function openImageViewer(button) {
  const image = button.querySelector('img');
  imageViewerImage.src = image.currentSrc || image.src;
  imageViewerImage.alt = button.dataset.imageTitle || image.alt;
  imageViewerTitle.textContent = button.dataset.imageTitle || image.alt;
  imageViewerCategory.textContent = button.dataset.imageCategory || '';

  if (typeof imageViewer.showModal === 'function') {
    imageViewer.showModal();
    return;
  }

  imageViewer.setAttribute('open', '');
  document.body.classList.add('image-viewer-fallback-open');
}

function closeImageViewer() {
  if (!imageViewer.hasAttribute('open')) return;

  if (typeof imageViewer.close === 'function') {
    imageViewer.close();
    return;
  }

  imageViewer.removeAttribute('open');
  document.body.classList.remove('image-viewer-fallback-open');
  imageViewerImage.removeAttribute('src');
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
  const pricing = StorePricing.calculateCart([...cart.values()]);

  cartCount.textContent = String(quantity);
  cartItems.replaceChildren();
  cartPricingSummary.replaceChildren();
  cartEmpty.hidden = quantity > 0;
  cartTotal.textContent = currency.format(pricing.total / 100);
  checkoutButton.disabled = quantity === 0 || !/^\d{10,15}$/.test(whatsAppNumber || '');

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
    image.decoding = 'async';
    const picture = document.createElement('picture');
    if (item.webpImage && item.webpImage !== item.image) {
      const source = document.createElement('source');
      source.type = 'image/webp';
      source.srcset = item.webpImage;
      picture.append(source);
    }
    picture.append(image);
    imageLink.append(picture);

    const details = document.createElement('div');
    details.className = 'cart-item__details';
    const name = document.createElement('strong');
    name.textContent = `${item.name} · ${item.size}`;
    details.append(name);

    const price = document.createElement('span');
    const piecesPerProduct = item.type === 'dupla' ? 2 : item.type === 'trio' ? 3 : 1;
    const pieces = item.quantity * piecesPerProduct;
    price.textContent = `${item.quantity} ${item.type === 'unidade' ? 'unidade' : 'kit'}${item.quantity === 1 ? '' : 's'} · ${pieces} ${pieces === 1 ? 'sutiã' : 'sutiãs'} na faixa`;
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

  pricing.groups.forEach((group) => {
    const row = document.createElement('li');
    row.className = 'cart-promo';
    const heading = document.createElement('strong');
    heading.textContent = `${group.quantity} ${group.quantity === 1 ? 'sutiã' : 'sutiãs'} nos tamanhos ${group.label}`;
    const detail = document.createElement('span');
    const breakdown = [
      group.trios && `${group.trios} kit${group.trios === 1 ? '' : 's'} de 3`,
      group.pairs && `${group.pairs} kit de 2`,
      group.singles && `${group.singles} unidade${group.singles === 1 ? '' : 's'}`
    ].filter(Boolean);
    detail.textContent = breakdown.join(' + ');
    const total = document.createElement('em');
    total.textContent = currency.format(group.total / 100);
    row.append(heading, detail, total);
    cartPricingSummary.append(row);
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

  cartStatus.textContent = '';
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
  button.addEventListener('click', openCart);
});

document.querySelector('[data-close-cart]').addEventListener('click', closeCart);

document.querySelectorAll('[data-image-viewer-trigger]').forEach((button) => {
  button.addEventListener('click', () => openImageViewer(button));
});

imageViewer.querySelector('[data-close-image-viewer]').addEventListener('click', closeImageViewer);
imageViewer.addEventListener('click', (event) => {
  if (event.target === imageViewer) closeImageViewer();
});
imageViewer.addEventListener('close', () => {
  if (!imageViewer.open) imageViewerImage.removeAttribute('src');
});

cepRetry.addEventListener('click', lookupAddress);

paymentMethod.addEventListener('change', updateCart);

cartDialog.addEventListener('click', (event) => {
  if (event.target === cartDialog) closeCart();
});

cartDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeCart();
});

document.addEventListener('click', (event) => {
  if (document.body.classList.contains('cart-dialog-fallback-open') && event.target === document.body) {
    closeCart();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.body.classList.contains('cart-dialog-fallback-open')) {
    closeCart();
  }

  if (event.key === 'Escape' && document.body.classList.contains('image-viewer-fallback-open')) {
    closeImageViewer();
  }
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
        image: card.dataset.productFallbackImage || getLocalImageUrl(card.dataset.productImage),
        webpImage: card.dataset.productDisplayImage,
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
    showAddedMessage(`${addedQuantity} ${addedQuantity === 1 ? 'peça adicionada' : 'peças adicionadas'} à sacola. O total é calculado pela quantidade e faixa de tamanho.`);
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
  cartStatus.textContent = '';
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

addressNumber.addEventListener('input', () => {
  cartStatus.textContent = '';
  updateCart();
});
addressComplement.addEventListener('input', updateCart);

addressNoNumber.addEventListener('change', () => {
  addressNumber.disabled = addressNoNumber.checked;
  addressNumber.required = !addressNoNumber.checked;
  addressNumber.value = addressNoNumber.checked ? 'S/N' : '';
  cartStatus.textContent = '';
  updateCart();
});

checkoutButton.addEventListener('click', () => {
  if (cart.size === 0) {
    cartStatus.textContent = 'Adicione ao menos uma peça antes de concluir o pedido.';
    return;
  }

  if (!paymentMethod.value) {
    cartStatus.textContent = 'Falta escolher a forma de pagamento.';
    paymentMethod.focus();
    return;
  }

  const enteredCep = cepInput.value.replace(/\D/g, '');
  if (!enteredCep) {
    cartStatus.textContent = 'Falta preencher o campo CEP.';
    cepInput.focus();
    return;
  }

  if (enteredCep.length !== 8) {
    cartStatus.textContent = 'O CEP está incompleto. Preencha os 8 números.';
    cepInput.focus();
    return;
  }

  if (!address || address.cep !== enteredCep) {
    cartStatus.textContent = isLookingUp
      ? 'Aguarde a consulta do CEP para continuar.'
      : cepErrorMessage
        ? 'Confira o campo CEP e consulte novamente para preencher o endereço.'
        : 'Consulte o CEP para preencher o endereço antes de continuar.';
    cepInput.focus();
    return;
  }

  if (!addressNumber.value.trim()) {
    cartStatus.textContent = 'Falta preencher o Número do endereço ou marcar “Endereço sem número”.';
    addressNumber.focus();
    return;
  }

  if (!/^\d{10,15}$/.test(whatsAppNumber || '')) {
    cartStatus.textContent = 'O atendimento pelo WhatsApp não está configurado. Fale com a loja para concluir seu pedido.';
    return;
  }

  const items = [...cart.values()];
  const pricing = StorePricing.calculateCart(items);
  const orderLines = items.map(({ name, size, quantity, type }) => {
    const piecesPerProduct = type === 'dupla' ? 2 : type === 'trio' ? 3 : 1;
    const pieces = quantity * piecesPerProduct;
    return `• ${quantity}x ${name} — tamanho ${size} — ${pieces} ${pieces === 1 ? 'sutiã' : 'sutiãs'}`;
  });
  const sizeBandTotals = pricing.groups.map((group) => {
    return `• Tamanhos ${group.label} (${group.quantity} ${group.quantity === 1 ? 'sutiã' : 'sutiãs'}): ${currency.format(group.total / 100)}`;
  });
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
    '',
    'Totais por faixa de tamanho:',
    ...sizeBandTotals,
    '',
    `Total dos produtos: ${currency.format(pricing.total / 100)}`,
    `Forma de pagamento: ${paymentMethod.value}`,
    `Entrega: ${delivery}`,
    `Endereço: ${deliveryAddress}`
  ].join('\n');

  window.location.assign(`https://wa.me/${whatsAppNumber}?text=${encodeURIComponent(message)}`);
});

paymentMethod.addEventListener('change', () => {
  cartStatus.textContent = '';
});

document.body.classList.add('images-enhanced');
document.querySelectorAll('.product-card__image').forEach((imageContainer) => {
  const image = imageContainer.querySelector('img');
  const updateImageState = () => {
    imageContainer.classList.remove('is-loading');
    imageContainer.classList.toggle('is-loaded', image.naturalWidth > 0);
    imageContainer.classList.toggle('is-error', image.naturalWidth === 0);
  };

  image.addEventListener('load', updateImageState);
  image.addEventListener('error', updateImageState);

  if (image.complete) {
    updateImageState();
  } else {
    imageContainer.classList.add('is-loading');
  }
});

updateCart();

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -32px 0px' });

  document.body.classList.add('has-motion');
  document.querySelectorAll('.reveal-on-view, .product-card').forEach((element) => {
    revealObserver.observe(element);
  });
}
