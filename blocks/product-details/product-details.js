import {
  InLineAlert,
  Icon,
  Button,
  provider as UI,
} from '@dropins/tools/components.js';
import { h } from '@dropins/tools/preact.js';
import { events } from '@dropins/tools/event-bus.js';
import { tryRenderAemAssetsImage } from '@dropins/tools/lib/aem/assets.js';
import * as pdpApi from '@dropins/storefront-pdp/api.js';
import { render as pdpRendered } from '@dropins/storefront-pdp/render.js';
import { render as wishlistRender } from '@dropins/storefront-wishlist/render.js';

import { WishlistToggle } from '@dropins/storefront-wishlist/containers/WishlistToggle.js';
import { WishlistAlert } from '@dropins/storefront-wishlist/containers/WishlistAlert.js';

// Containers
import ProductHeader from '@dropins/storefront-pdp/containers/ProductHeader.js';
import ProductPrice from '@dropins/storefront-pdp/containers/ProductPrice.js';
import ProductShortDescription from '@dropins/storefront-pdp/containers/ProductShortDescription.js';
import ProductOptions from '@dropins/storefront-pdp/containers/ProductOptions.js';
import ProductQuantity from '@dropins/storefront-pdp/containers/ProductQuantity.js';
import ProductDescription from '@dropins/storefront-pdp/containers/ProductDescription.js';
import ProductAttributes from '@dropins/storefront-pdp/containers/ProductAttributes.js';
import ProductGallery from '@dropins/storefront-pdp/containers/ProductGallery.js';
import ProductGiftCardOptions from '@dropins/storefront-pdp/containers/ProductGiftCardOptions.js';

// Libs
import {
  rootLink,
  setJsonLd,
  fetchPlaceholders,
  getProductLink,
} from '../../scripts/commerce.js';

// Initializers
import { IMAGES_SIZES } from '../../scripts/initializers/pdp.js';
import '../../scripts/initializers/cart.js';
import '../../scripts/initializers/wishlist.js';

/**
 * Checks if the page has prerendered product JSON-LD data
 * @returns {boolean} True if product JSON-LD exists and contains @type=Product
 */
function isProductPrerendered() {
  const jsonLdScript = document.querySelector('script[type="application/ld+json"]');

  if (!jsonLdScript?.textContent) {
    return false;
  }

  try {
    const jsonLd = JSON.parse(jsonLdScript.textContent);
    return jsonLd?.['@type'] === 'Product';
  } catch (error) {
    console.debug('Failed to parse JSON-LD:', error);
    return false;
  }
}

// Function to update the Add to Cart button text
function updateAddToCartButtonText(addToCartInstance, inCart, labels) {
  const buttonText = inCart
    ? labels.Global?.UpdateProductInCart
    : labels.Global?.AddProductToCart;
  if (addToCartInstance) {
    addToCartInstance.setProps((prev) => ({
      ...prev,
      children: buttonText,
    }));
  }
}

/**
 * Formats numeric attribute values for display (e.g., "10.000000" → "10").
 * Non-numeric values are returned as-is.
 */
function formatNumericAttributeValue(value) {
  const trimmed = value.trim();
  if (!/^[+-]?\d+(\.\d+)?$/.test(trimmed)) return value;
  return new Intl.NumberFormat(document.documentElement.lang).format(Number(trimmed));
}

// LG PDP buy box (.lg-pdp-details only) — reads real catalog attributes
// (energy_grade, member_price, installment_text, product_tag, size_options)
// the same way the PLP card does. Only decorative/non-functional pieces
// (star rating, "Share your thoughts", suggestion pills) are hardcoded,
// since there's no real rating or content-recommendation data for them.
function getAttr(product, name) {
  return product?.attributes?.find((a) => a.name === name)?.value;
}

function formatMoney(value, currency) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'USD',
  }).format(value);
}

export default async function decorate(block) {
  const eventProduct = events.lastPayload('pdp/data') ?? null;
  // bug: the pdp sends an object with event data even if product is not found.
  const product = eventProduct?.sku ? eventProduct : null;
  const isLgPdpDetails = block.closest('.section')?.classList.contains('lg-pdp-details');

  const labels = await fetchPlaceholders();

  // Read itemUid from URL
  const urlParams = new URLSearchParams(window.location.search);
  const itemUidFromUrl = urlParams.get('itemUid');

  // State to track if we are in update mode
  let isUpdateMode = false;

  // State to track if the current product/variant is out of stock
  let isOutOfStock = false;

  // Layout
  const fragment = document.createRange().createContextualFragment(`
    <div class="product-details__alert"></div>
    <div class="product-details__wrapper">
      <div class="product-details__left-column">
        <div class="product-details__gallery"></div>
      </div>
      <div class="product-details__right-column">
        <div class="product-details__header"></div>
        <div class="product-details__price"></div>
        <div class="product-details__gallery"></div>
        <div class="product-details__short-description"></div>
        <div class="product-details__gift-card-options"></div>
        <div class="product-details__configuration">
          <div class="product-details__options"></div>
          <div class="product-details__quantity"></div>
          <div class="product-details__buttons">
            <div class="product-details__buttons__add-to-cart"></div>
            <div class="product-details__buttons__add-to-wishlist"></div>
          </div>
        </div>
        <div class="product-details__description"></div>
        <div class="product-details__attributes"></div>
      </div>
    </div>
  `);

  const $alert = fragment.querySelector('.product-details__alert');
  const $gallery = fragment.querySelector('.product-details__gallery');
  const $header = fragment.querySelector('.product-details__header');
  const $price = fragment.querySelector('.product-details__price');
  const $galleryMobile = fragment.querySelector('.product-details__right-column .product-details__gallery');
  const $shortDescription = fragment.querySelector('.product-details__short-description');
  const $options = fragment.querySelector('.product-details__options');
  const $quantity = fragment.querySelector('.product-details__quantity');
  const $giftCardOptions = fragment.querySelector('.product-details__gift-card-options');
  const $addToCart = fragment.querySelector('.product-details__buttons__add-to-cart');
  const $wishlistToggleBtn = fragment.querySelector('.product-details__buttons__add-to-wishlist');
  const $description = fragment.querySelector('.product-details__description');
  const $attributes = fragment.querySelector('.product-details__attributes');

  block.replaceChildren(fragment);

  if (isLgPdpDetails) {
    // The short description and the full description render the same
    // underlying copy for most products — showing both stacks duplicate
    // text. Hide the short one and present the full description as
    // "Key Features" (always visible). "More" instead reveals the Details
    // attributes list ($attributes, normally way down at the end of the
    // fixed template order) right here next to Key Features, above the
    // quantity/Add to Cart configuration block.
    $shortDescription.remove();

    const featuresBlock = document.createElement('div');
    featuresBlock.className = 'lg-pdp-features-block';

    const featuresHeading = document.createElement('h3');
    featuresHeading.className = 'lg-pdp-features-heading';
    featuresHeading.textContent = 'Key Features';
    featuresBlock.appendChild(featuresHeading);

    // always visible
    $description.classList.add('lg-pdp-features-body');
    featuresBlock.appendChild($description);

    const moreToggle = document.createElement('button');
    moreToggle.type = 'button';
    moreToggle.className = 'lg-pdp-features-toggle';
    moreToggle.textContent = 'More ⌄';
    featuresBlock.appendChild(moreToggle);

    // Details list — hidden until "More" is clicked
    $attributes.classList.add('lg-pdp-details-list');
    featuresBlock.appendChild($attributes);

    moreToggle.addEventListener('click', () => {
      const expanded = $attributes.classList.toggle('lg-pdp-details-list--expanded');
      moreToggle.textContent = expanded ? 'Less ⌃' : 'More ⌄';
    });

    const $configuration = block.querySelector('.product-details__configuration');
    $configuration.before(featuresBlock);
  }

  // `data.attributes` here comes from a direct GraphQL fetch (below) — the
  // 'pdp/data' event payload never carries attributes (confirmed live:
  // price/name render fine off it, but energy_grade/product_tag always came
  // back empty). Idempotent: clears any previously-inserted elements first,
  // though with a one-shot fetch this only ever runs once in practice.
  function renderLgPdpExtras(data) {
    if (!isLgPdpDetails || !data?.sku) return;

    block.closest('.section')
      ?.querySelectorAll('.lg-pdp-badge, .lg-pdp-meta-row, .lg-pdp-sizes, .lg-pdp-suggestions, .lg-pdp-sticky-bar')
      .forEach((el) => el.remove());

    const productLink = getProductLink(data.urlKey, data.sku);
    // this event payload uses `prices` (plural), and `final.amount` is a
    // plain number with `currency` as a sibling field — confirmed via a
    // live dump of events.lastPayload('pdp/data'); a different, flatter
    // shape than the PLP dropin's `price.final.amount.{value,currency}`.
    const currency = data.prices?.final?.currency;
    const finalValue = data.prices?.final?.amount;
    const energyGrade = getAttr(data, 'energy_grade');
    const memberPrice = getAttr(data, 'member_price');
    const installmentText = getAttr(data, 'installment_text');
    const tag = getAttr(data, 'product_tag');
    const sizeOptions = getAttr(data, 'size_options');

    // -- badge, above the title --
    if (tag) {
      const badge = document.createElement('span');
      badge.className = 'lg-pdp-badge';
      badge.textContent = tag;
      $header.before(badge);
    }

    // -- sku (already rendered inside $header by ProductHeader) + rating row --
    const metaRow = document.createElement('div');
    metaRow.className = 'lg-pdp-meta-row';
    // no real rating/review data exists on this product — hardcoded
    // placeholder like lg.com shows for unreviewed products
    metaRow.innerHTML = `
      <span class="lg-pdp-rating"><span class="lg-pdp-stars" aria-hidden="true">★★★★★</span> 0 Reviews</span>
      <button type="button" class="lg-pdp-share-thoughts">Share your thoughts!</button>
    `;
    $header.after(metaRow);

    // -- size chips (only if the catalog attribute exists; real configurable
    // products get real swatches from ProductOptions instead) --
    if (sizeOptions) {
      const sizes = sizeOptions.split('/').map((s) => s.replace(/"/g, '').trim()).filter(Boolean);
      if (sizes.length) {
        const chipRow = document.createElement('div');
        chipRow.className = 'lg-pdp-sizes';
        sizes.forEach((size, i) => {
          const chip = document.createElement('span');
          chip.className = 'lg-pdp-size-chip';
          if (i === 0) chip.classList.add('is-active');
          chip.textContent = `${size}"`;
          chipRow.appendChild(chip);
        });
        metaRow.after(chipRow);
      }
    }

    // -- suggestion pills, after the Key Features toggle — generic/decorative,
    // no real content-recommendation data to back these with.
    // ($shortDescription was already removed above, so insert relative to
    // the features toggle button instead — inserting "after" a detached
    // node is a silent no-op, which is why these weren't appearing.) --
    const suggestions = document.createElement('div');
    suggestions.className = 'lg-pdp-suggestions';
    ['Ask LG anything', 'Why choose this product?', 'Buying tips', 'Best for me'].forEach((text, i) => {
      const pill = document.createElement('span');
      pill.className = 'lg-pdp-suggestion-pill';
      if (i === 0) pill.classList.add('lg-pdp-suggestion-pill--accent');
      pill.textContent = text;
      suggestions.appendChild(pill);
    });
    const featuresBlock = block.querySelector('.lg-pdp-features-block');
    if (featuresBlock) featuresBlock.appendChild(suggestions);
    else $description.after(suggestions);

    // -- sticky summary bar: title, energy grade + info sheet, price,
    // member price, Buy Now — mirrors the main buy box, real data throughout.
    // Outer bar spans the full viewport width (background only); inner wraps
    // the actual row and is centered/width-capped like the rest of the page. --
    const stickyBar = document.createElement('div');
    stickyBar.className = 'lg-pdp-sticky-bar';
    const stickyInner = document.createElement('div');
    stickyInner.className = 'lg-pdp-sticky-bar-inner';
    stickyBar.appendChild(stickyInner);

    const stickyTitle = document.createElement('div');
    stickyTitle.className = 'lg-pdp-sticky-title';
    stickyTitle.textContent = data.name;
    stickyInner.appendChild(stickyTitle);

    if (energyGrade) {
      const energyRow = document.createElement('a');
      energyRow.className = 'lg-pdp-sticky-energy';
      energyRow.href = productLink;
      energyRow.innerHTML = `<span class="lg-pdp-energy lg-pdp-energy--${energyGrade.toLowerCase()}">${energyGrade}</span> Product Information Sheet`;
      stickyInner.appendChild(energyRow);
    }

    if (finalValue != null) {
      const priceBlock = document.createElement('div');
      priceBlock.className = 'lg-pdp-sticky-price-block';
      priceBlock.innerHTML = `
        <span class="lg-pdp-sticky-price">${formatMoney(finalValue, currency)}</span>
        ${memberPrice ? `<span class="lg-pdp-sticky-member-price">Members Only ${formatMoney(parseFloat(memberPrice), currency)}</span>` : ''}
      `;
      stickyInner.appendChild(priceBlock);
    }

    const stickyBuyNow = document.createElement('div');
    stickyBuyNow.className = 'lg-pdp-sticky-buy-now';
    UI.render(Button, {
      children: 'Buy Now',
      onClick: () => $addToCart.querySelector('button')?.click(),
      variant: 'primary',
    })(stickyBuyNow);
    stickyInner.appendChild(stickyBuyNow);

    if (installmentText) {
      const installment = document.createElement('div');
      installment.className = 'lg-pdp-sticky-installment';
      installment.innerHTML = `${installmentText} <strong>PayPal</strong>`;
      stickyInner.appendChild(installment);
    }

    block.closest('.section')?.prepend(stickyBar);
  }

  if (isLgPdpDetails && product) {
    // fetch attributes directly — the 'pdp/data' event never includes them
    pdpApi.fetchGraphQl(`
      query GET_PRODUCT_ATTRIBUTES($skus: [String!]) {
        products(skus: $skus) {
          sku
          attributes { name label value roles }
        }
      }
    `, { method: 'GET', variables: { skus: [product.sku] } })
      .then(({ data }) => data?.products?.[0]?.attributes || [])
      .catch((e) => {
        console.error('Error fetching attributes for lg-pdp-details', e);
        return [];
      })
      .then((attributes) => renderLgPdpExtras({ ...product, attributes }));
  }

  const gallerySlots = {
    CarouselThumbnail: (ctx) => {
      if (ctx.mediaType === 'image') {
        tryRenderAemAssetsImage(ctx, {
          ...imageSlotConfig(ctx),
          wrapper: document.createElement('span'),
        });
      }
    },

    CarouselMainImage: (ctx) => {
      if (ctx.mediaType === 'image') {
        tryRenderAemAssetsImage(ctx, {
          ...imageSlotConfig(ctx),
        });
      }
    },
  };

  // Alert
  let inlineAlert = null;
  const routeToWishlist = rootLink('/wishlist');

  const [
    _galleryMobile,
    _gallery,
    _header,
    _price,
    _shortDescription,
    _options,
    _quantity,
    _giftCardOptions,
    _description,
    _attributes,
    wishlistToggleBtn,
  ] = await Promise.all([
    // Gallery (Mobile)
    pdpRendered.render(ProductGallery, {
      controls: 'dots',
      arrows: true,
      peak: false,
      gap: 'small',
      loop: false,
      videos: true, // Display videos if available
      imageParams: {
        ...IMAGES_SIZES,
      },

      slots: gallerySlots,
    })($galleryMobile),

    // Gallery (Desktop)
    pdpRendered.render(ProductGallery, {
      controls: 'thumbnailsRow',
      arrows: true,
      peak: true,
      gap: 'small',
      loop: false,
      videos: true, // Display videos if available
      imageParams: {
        ...IMAGES_SIZES,
      },

      slots: gallerySlots,
    })($gallery),

    // Header
    pdpRendered.render(ProductHeader, {})($header),

    // Price
    pdpRendered.render(ProductPrice, {})($price),

    // Short Description
    pdpRendered.render(ProductShortDescription, {})($shortDescription),

    // Configuration - Swatches
    pdpRendered.render(ProductOptions, {
      hideSelectedValue: false,
      slots: {
        SwatchImage: (ctx) => {
          tryRenderAemAssetsImage(ctx, {
            ...imageSlotConfig(ctx),
            wrapper: document.createElement('span'),
          });
        },
      },
    })($options),

    // Configuration  Quantity
    pdpRendered.render(ProductQuantity, {})($quantity),

    // Configuration  Gift Card Options
    pdpRendered.render(ProductGiftCardOptions, {})($giftCardOptions),

    // Description
    pdpRendered.render(ProductDescription, {})($description),

    // Attributes
    pdpRendered.render(ProductAttributes, {
      formatValue: formatNumericAttributeValue,
    })($attributes),

    // Wishlist button - WishlistToggle Container
    wishlistRender.render(WishlistToggle, {
      product,
    })($wishlistToggleBtn),
  ]);

  // Configuration – Button - Add to Cart
  const addToCart = await UI.render(Button, {
    children: labels.Global?.AddProductToCart,
    icon: h(Icon, { source: 'Cart' }),
    onClick: async () => {
      const buttonActionText = isUpdateMode
        ? labels.Global?.UpdatingInCart
        : labels.Global?.AddingToCart;
      try {
        addToCart.setProps((prev) => ({
          ...prev,
          children: buttonActionText,
          disabled: true,
        }));

        // get the current selection values
        const values = pdpApi.getProductConfigurationValues();
        const valid = pdpApi.isProductConfigurationValid();

        // add or update the product in the cart
        if (valid) {
          if (isUpdateMode) {
            // --- Update existing item ---
            const { updateProductsFromCart } = await import(
              '@dropins/storefront-cart/api.js'
            );

            await updateProductsFromCart([{ ...values, uid: itemUidFromUrl }]);

            // --- START REDIRECT ON UPDATE ---
            const updatedSku = values?.sku;
            if (updatedSku) {
              const cartRedirectUrl = new URL(
                rootLink('/cart'),
                window.location.origin,
              );
              cartRedirectUrl.searchParams.set('itemUid', itemUidFromUrl);
              window.location.href = cartRedirectUrl.toString();
            } else {
              // Fallback if SKU is somehow missing (shouldn't happen in normal flow)
              console.warn(
                'Could not retrieve SKU for updated item. Redirecting to cart without parameter.',
              );
              window.location.href = rootLink('/cart');
            }
            return;
          }
          // --- Add new item ---
          const { addProductsToCart } = await import(
            '@dropins/storefront-cart/api.js'
          );
          await addProductsToCart([{ ...values }]);
        }

        // reset any previous alerts if successful
        inlineAlert?.remove();
      } catch (error) {
        // add alert message
        inlineAlert = await UI.render(InLineAlert, {
          heading: 'Error',
          description: error.message,
          icon: h(Icon, { source: 'Warning' }),
          'aria-live': 'assertive',
          role: 'alert',
          onDismiss: () => {
            inlineAlert.remove();
          },
        })($alert);

        // Scroll the alertWrapper into view
        $alert.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      } finally {
        // Reset button text using the helper function which respects the current mode
        updateAddToCartButtonText(addToCart, isUpdateMode, labels);
        // Re-enable button, unless the current variant is out of stock
        addToCart.setProps((prev) => ({
          ...prev,
          disabled: isOutOfStock,
        }));
      }
    },
  })($addToCart);

  // Lifecycle Events
  events.on('pdp/data', (data) => {
    isOutOfStock = data?.inStock === false;
    addToCart.setProps((prev) => ({ ...prev, disabled: isOutOfStock }));
  }, { eager: true });

  events.on('pdp/valid', (valid) => {
    // update add to cart button disabled state based on product selection validity and stock status
    addToCart.setProps((prev) => ({ ...prev, disabled: isOutOfStock || !valid }));
  }, { eager: true });

  // Handle option changes
  events.on('pdp/values', () => {
    if (wishlistToggleBtn) {
      const configValues = pdpApi.getProductConfigurationValues();

      // Check URL parameter for empty optionsUIDs
      const urlOptionsUIDs = urlParams.get('optionsUIDs');

      // If URL has empty optionsUIDs parameter, treat as base product (no options)
      const optionUIDs = urlOptionsUIDs === '' ? undefined : (configValues?.optionsUIDs || undefined);

      wishlistToggleBtn.setProps((prev) => ({
        ...prev,
        product: {
          ...product,
          optionUIDs,
        },
      }));
    }
  }, { eager: true });

  events.on('wishlist/alert', ({ action, item }) => {
    wishlistRender.render(WishlistAlert, {
      action,
      item,
      routeToWishlist,
    })($alert);

    setTimeout(() => {
      $alert.innerHTML = '';
    }, 5000);

    setTimeout(() => {
      $alert.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 0);
  });

  // --- Add new event listener for cart/data ---
  events.on(
    'cart/data',
    (cartData) => {
      let itemIsInCart = false;
      if (itemUidFromUrl && cartData?.items) {
        itemIsInCart = cartData.items.some(
          (item) => item.uid === itemUidFromUrl,
        );
      }
      // Set the update mode state
      isUpdateMode = itemIsInCart;

      // Update button text based on whether the item is in the cart
      updateAddToCartButtonText(addToCart, itemIsInCart, labels);
    },
    { eager: true },
  );

  // Set JSON-LD and Meta Tags
  events.on('aem/lcp', () => {
    const isPrerendered = isProductPrerendered();
    if (product && !isPrerendered) {
      setJsonLdProduct(product);
      setMetaTags(product);
      document.title = product.name;
    }
  }, { eager: true });

  return Promise.resolve();
}

async function setJsonLdProduct(product) {
  const {
    name,
    inStock,
    description,
    sku,
    urlKey,
    price,
    priceRange,
    images,
    attributes,
  } = product;
  const amount = priceRange?.minimum?.final?.amount || price?.final?.amount;
  const brand = attributes?.find((attr) => attr.name === 'brand');

  // get variants
  const { data } = await pdpApi.fetchGraphQl(`
    query GET_PRODUCT_VARIANTS($sku: String!) {
      variants(sku: $sku) {
        variants {
          product {
            sku
            name
            inStock
            images(roles: ["image"]) {
              url
            }
            ...on SimpleProductView {
              price {
                final { amount { currency value } }
              }
            }
          }
        }
      }
    }
  `, {
    method: 'GET',
    variables: { sku },
  });

  const variants = data?.variants?.variants || [];

  const ldJson = {
    '@context': 'http://schema.org',
    '@type': 'Product',
    name,
    description,
    image: images[0]?.url,
    offers: [],
    productID: sku,
    brand: {
      '@type': 'Brand',
      name: brand?.value,
    },
    url: new URL(getProductLink(urlKey, sku), window.location),
    sku,
    '@id': new URL(getProductLink(urlKey, sku), window.location),
  };

  if (variants.length > 1) {
    ldJson.offers.push(...variants.map((variant) => ({
      '@type': 'Offer',
      name: variant.product.name,
      image: variant.product.images[0]?.url,
      price: variant.product.price.final.amount.value,
      priceCurrency: variant.product.price.final.amount.currency,
      availability: variant.product.inStock ? 'http://schema.org/InStock' : 'http://schema.org/OutOfStock',
      sku: variant.product.sku,
    })));
  } else {
    ldJson.offers.push({
      '@type': 'Offer',
      price: amount?.value,
      priceCurrency: amount?.currency,
      availability: inStock ? 'http://schema.org/InStock' : 'http://schema.org/OutOfStock',
    });
  }

  setJsonLd(ldJson, 'product');
}

function createMetaTag(property, content, type) {
  if (!property || !type) {
    return;
  }
  let meta = document.head.querySelector(`meta[${type}="${property}"]`);
  if (meta) {
    if (!content) {
      meta.remove();
      return;
    }
    meta.setAttribute(type, property);
    meta.setAttribute('content', content);
    return;
  }
  if (!content) {
    return;
  }
  meta = document.createElement('meta');
  meta.setAttribute(type, property);
  meta.setAttribute('content', content);
  document.head.appendChild(meta);
}

function setMetaTags(product) {
  if (!product?.sku) {
    return;
  }

  const price = product.prices.final.minimumAmount ?? product.prices.final.amount;

  createMetaTag('title', product.metaTitle || product.name, 'name');
  createMetaTag('description', product.metaDescription, 'name');
  createMetaTag('keywords', product.metaKeyword, 'name');

  createMetaTag('og:type', 'product', 'property');
  createMetaTag('og:description', product.shortDescription, 'property');
  createMetaTag('og:title', product.metaTitle || product.name, 'property');
  createMetaTag('og:url', window.location.href, 'property');
  const mainImage = product?.images?.filter((image) => image.roles.includes('thumbnail'))[0];
  const metaImage = mainImage?.url || product?.images[0]?.url;
  createMetaTag('og:image', metaImage, 'property');
  createMetaTag('og:image:secure_url', metaImage, 'property');
  createMetaTag('product:price:amount', price.value, 'property');
  createMetaTag('product:price:currency', price.currency, 'property');
}

/**
 * Returns the configuration for an image slot.
 * @param ctx - The context of the slot.
 * @returns The configuration for the image slot.
 */
function imageSlotConfig(ctx) {
  const { data, defaultImageProps } = ctx;
  return {
    alias: data.sku,
    imageProps: defaultImageProps,

    params: {
      width: defaultImageProps.width,
      height: defaultImageProps.height,
    },
  };
}
