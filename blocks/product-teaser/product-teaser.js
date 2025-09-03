import { readBlockConfig } from '../../scripts/aem.js';
import { renderPrice, performCatalogServiceQuery, mapProductAcdl } from './product-teaser-utils.js';
import {
  rootLink,
} from '../../scripts/commerce.js';

const productTeaserQuery = `query productTeaser($sku: String!) {
  products(skus: [$sku]) {
    sku
    urlKey
    name
    externalId
    addToCartAllowed
    __typename
    images(roles: []) {
      label
      url
    }
    ... on SimpleProductView {
      price {
        ...priceFields
      }
    }
    ... on ComplexProductView {
      priceRange {
        minimum {
          ...priceFields
        }
        maximum {
          ...priceFields
        }
      }
    }
  }
}
fragment priceFields on ProductViewPrice {
  regular {
    amount {
      currency
      value
    }
  }
  final {
    amount {
      currency
      value
    }
  }
}`;

// Helper to normalize config values to booleans for show/hide
function parseBoolean(val) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const v = val.trim().toLowerCase();
    // Accept "show", "true", "yes", "1" as true, "hide", "false", "no", "0" as false
    if (['true', 'show', 'yes', '1'].includes(v)) return true;
    if (['false', 'hide', 'no', '0'].includes(v)) return false;
  }
  return false;
}

function renderPlaceholder(config, block) {
  block.textContent = '';
  block.appendChild(document.createRange().createContextualFragment(`
    <div class="image">
      <div class="placeholder"></div>
    </div>
    <div class="details">
      <h1></h1>
      <div class="price"></div>
      <div class="actions">
        ${config['details-button'] === true ? '<a href="#" class="button primary disabled details-btn">Details</a>' : ''}
        ${config['cart-button'] === true ? '<button class="secondary disabled cart-btn">Add to Cart</button>' : ''}
      </div>
    </div>
  `));
}

/**
 * Returns a picture element specifically using AEM Assets format as documented:
 * https://adobe-aem-assets-delivery-experimental.redoc.ly/
 */
function renderImage(product, size = 250) {
  const { name } = product;
  const { url: imageUrl, label } = product.images[0];

  // Extract assetId from the URL
  const urlParts = imageUrl.split('/');
  const assetId = urlParts[urlParts.length - 1];

  // Create base URL with proper structure
  const baseUrl = imageUrl.replace(`/${assetId}`, '');

  const createUrlForWidth = (url, w, format) => {
    const newUrl = new URL(url, window.location);

    // replace spaces with dashes
    const seoName = name.replace(/ /g, '-');
    newUrl.pathname = `${newUrl.pathname}/${assetId}/as/${seoName}.${format}`;
    newUrl.searchParams.set('width', w);
    newUrl.searchParams.delete('quality');
    newUrl.searchParams.delete('dpr');
    newUrl.searchParams.delete('bg-color');
    return newUrl.toString();
  };

  const createUrlForDpi = (url, w, format) => `${createUrlForWidth(url, w, format)} 1x, ${createUrlForWidth(url, w * 2, format)} 2x, ${createUrlForWidth(url, w * 3, format)} 3x`;

  // Use valid formats from the API
  const webpUrl = createUrlForDpi(baseUrl, size, 'webp');
  const jpgUrl = createUrlForDpi(baseUrl, size, 'jpg');

  return document.createRange().createContextualFragment(`<picture>
      <source srcset="${webpUrl}" />
      <source srcset="${jpgUrl}" />
      <img height="${size}" width="${size}" src="${createUrlForWidth(baseUrl, size, 'jpg')}" loading="eager" alt="${label}" />
    </picture>
  `);
}

function renderProduct(product, config, block) {
  const {
    name, urlKey, sku, price, priceRange, addToCartAllowed, __typename,
  } = product;

  const currency = price?.final?.amount?.currency || priceRange?.minimum?.final?.amount?.currency;
  const priceFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  });

  block.textContent = '';
  // Create a unique id for this teaser instance to avoid event handler confusion
  const uniqueId = `teaser-${sku}-${Math.random().toString(36).substr(2, 9)}`;
  const fragment = document.createRange().createContextualFragment(`
    <div class="image">
    </div>
    <div class="details">
      <h1>${name}</h1>
      <div class="price">${renderPrice(product, priceFormatter.format)}</div>
      <div class="actions">
        ${config['details-button'] === true ? `<a href="${rootLink(`/products/${urlKey}/${sku}`)}" class="button primary details-btn" data-teaser-id="${uniqueId}">Details</a>` : ''}
        ${config['cart-button'] === true && addToCartAllowed && __typename === 'SimpleProductView' ? `<button class="add-to-cart secondary cart-btn" data-teaser-id="${uniqueId}">Add to Cart</button>` : ''}
      </div>
    </div>
  `);

  fragment.querySelector('.image').appendChild(renderImage(product, 250));

  // Only operate on the buttons inside this fragment (not globally)
  const detailsBtn = fragment.querySelector(`.details-btn[data-teaser-id="${uniqueId}"]`);
  const cartBtn = fragment.querySelector(`.cart-btn[data-teaser-id="${uniqueId}"]`);

  if (detailsBtn && cartBtn) {
    detailsBtn.addEventListener('click', (e) => {
      // Prevent navigation if it's an anchor
      if (detailsBtn.tagName === 'A' && detailsBtn.getAttribute('href') === '#') {
        e.preventDefault();
      }
      detailsBtn.style.display = 'none';
      cartBtn.style.display = '';
    });
    cartBtn.addEventListener('click', async (e) => {
      // If this is the add-to-cart button, do the cart logic, then toggle
      if (cartBtn.classList.contains('add-to-cart')) {
        const values = [{
          optionsUIDs: [],
          quantity: 1,
          sku: product.sku,
        }];
        const { addProductsToCart } = await import('@dropins/storefront-cart/api.js');
        window.adobeDataLayer.push({ productContext: mapProductAcdl(product) });
        console.debug('onAddToCart', values);
        addProductsToCart(values);
      }
      cartBtn.style.display = 'none';
      detailsBtn.style.display = '';
    });
  } else if (fragment.querySelector('.add-to-cart')) {
    // If only add-to-cart exists, keep original logic
    const addToCartButton = fragment.querySelector('.add-to-cart');
    addToCartButton.addEventListener('click', async () => {
      const values = [{
        optionsUIDs: [],
        quantity: 1,
        sku: product.sku,
      }];
      const { addProductsToCart } = await import('@dropins/storefront-cart/api.js');
      window.adobeDataLayer.push({ productContext: mapProductAcdl(product) });
      console.debug('onAddToCart', values);
      addProductsToCart(values);
    });
  }

  block.appendChild(fragment);
}

export default async function decorate(block) {
  const config = readBlockConfig(block);

  // Normalize config values for show/hide logic, always strictly boolean
  config['details-button'] = parseBoolean(config['details-button']) === true;
  config['cart-button'] = parseBoolean(config['cart-button']) === true;

  renderPlaceholder(config, block);

  const { products } = await performCatalogServiceQuery(productTeaserQuery, {
    sku: config.sku,
  });
  if (!products || !products.length > 0 || !products[0].sku) {
    return;
  }
  const [product] = products;
  product.images = product.images.map((image) => ({ ...image, url: image.url.replace(/^https?:/, '') }));

  renderProduct(product, config, block);
}
