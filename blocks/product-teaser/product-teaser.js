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
    return v === 'true' || v === 'show' || v === 'yes' || v === '1';
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
        ${config['details-button'] ? '<a href="#" class="button primary disabled">Details</a>' : ''}
        ${config['cart-button'] ? '<button class="secondary" disabled>Add to Cart</button>' : ''}
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
    const seoName = name.replace(' ', '-');
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
  const fragment = document.createRange().createContextualFragment(`
    <div class="image">
    </div>
    <div class="details">
      <h1>${name}</h1>
      <div class="price">${renderPrice(product, priceFormatter.format)}</div>
      <div class="actions">
        ${config['details-button'] ? `<a href="${rootLink(`/products/${urlKey}/${sku}`)}" class="button primary">Details</a>` : ''}
        ${config['cart-button'] && addToCartAllowed && __typename === 'SimpleProductView' ? '<button class="add-to-cart secondary">Add to Cart</button>' : ''}
      </div>
    </div>
  `);

  fragment.querySelector('.image').appendChild(renderImage(product, 250));

  const addToCartButton = fragment.querySelector('.add-to-cart');
  if (addToCartButton) {
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

  // Fix: Normalize config values for show/hide logic
  config['details-button'] = parseBoolean(config['details-button']);
  config['cart-button'] = parseBoolean(config['cart-button']);

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
