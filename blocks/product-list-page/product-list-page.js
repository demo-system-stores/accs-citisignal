// Product Discovery Dropins
import SearchResults from '@dropins/storefront-product-discovery/containers/SearchResults.js';
import Facets from '@dropins/storefront-product-discovery/containers/Facets.js';
import SortBy from '@dropins/storefront-product-discovery/containers/SortBy.js';
import Pagination from '@dropins/storefront-product-discovery/containers/Pagination.js';
import { render as provider } from '@dropins/storefront-product-discovery/render.js';
import { Button, Icon, provider as UI } from '@dropins/tools/components.js';
import { search } from '@dropins/storefront-product-discovery/api.js';
// Wishlist Dropin
import { WishlistToggle } from '@dropins/storefront-wishlist/containers/WishlistToggle.js';
import { render as wishlistRender } from '@dropins/storefront-wishlist/render.js';
// Cart Dropin
import * as cartApi from '@dropins/storefront-cart/api.js';
import { tryRenderAemAssetsImage } from '@dropins/tools/lib/aem/assets.js';
// Event Bus
import { events } from '@dropins/tools/event-bus.js';
// AEM
import { readBlockConfig } from '../../scripts/aem.js';
import { fetchPlaceholders, getProductLink } from '../../scripts/commerce.js';
import { getSearchStateFromUrl, applySearchStateToUrl } from './search-url.js';

// Initializers
import '../../scripts/initializers/search.js';
import '../../scripts/initializers/wishlist.js';

// LG OLED TV category card (.lg-oled-plp only) — reads real catalog attributes
// (energy_grade, member_price, installment_text, product_tag, size_options)
// that aren't part of the dropin's base Product fields. Nothing here is
// invented data: every value comes straight off the GraphQL product record;
// only decorative/non-functional pieces (star rating, Compare checkbox,
// chevron) are hardcoded, since there's no real rating or compare feature.
const getAttr = (product, name) => product.attributes?.find((a) => a.name === name)?.value;

const formatMoney = (value, currency) => new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: currency || 'USD',
}).format(value);

export default async function decorate(block) {
  const labels = await fetchPlaceholders();
  const isLgOledPlp = block.closest('.section')?.classList.contains('lg-oled-plp');

  const config = readBlockConfig(block);
  const pageSize = parseInt(config.pagesize, 10) || 9;

  const fragment = document.createRange().createContextualFragment(`
    <div class="search__wrapper">
      <div class="search__result-info"></div>
      <div class="search__view-facets"></div>
      <div class="search__facets"></div>
      <div class="search__product-sort"></div>
      <div class="search__product-list"></div>
      <div class="search__pagination"></div>
    </div>
  `);

  const $resultInfo = fragment.querySelector('.search__result-info');
  const $viewFacets = fragment.querySelector('.search__view-facets');
  const $facets = fragment.querySelector('.search__facets');
  const $productSort = fragment.querySelector('.search__product-sort');
  const $productList = fragment.querySelector('.search__product-list');
  const $pagination = fragment.querySelector('.search__pagination');

  block.innerHTML = '';
  block.appendChild(fragment);

  // Add url path back to the block for enrichment, incase enrichment block is
  // executed after the plp block and block config is not available
  if (config.urlpath) {
    block.dataset.urlpath = config.urlpath;
  }

  const searchState = getSearchStateFromUrl(new URL(window.location.href));

  // Default visibility filter for all of our requests
  const visibilityFilter = { attribute: 'visibility', in: ['Search', 'Catalog, Search'] };
  const userFilters = searchState.filter.filter((f) => f.attribute !== 'visibility');

  // Normalize URL (e.g. pipe-separated filter values)
  const normalizedUrl = new URL(window.location.href);
  applySearchStateToUrl(normalizedUrl, searchState);
  window.history.replaceState({}, '', normalizedUrl.toString());

  // Request search based on the page type on block load
  if (config.urlpath) {
    // If it's a category page...
    await search({
      phrase: '', // search all products in the category
      currentPage: searchState.currentPage,
      pageSize,
      sort: searchState?.sort?.length ? searchState.sort : [{ attribute: 'position', direction: 'DESC' }],
      filter: [
        { attribute: 'categoryPath', eq: config.urlpath }, // Add category filter
        // Always add visibility filter to the request
        visibilityFilter,
        ...userFilters,
      ],
    }).catch(() => {
      console.error('Error searching for products');
    });
  } else {
    // Search page: dropin uses only the request (no URL parsing).
    await search({
      phrase: searchState.phrase,
      currentPage: searchState.currentPage,
      pageSize,
      sort: searchState.sort,
      // Always add visibility filter to the request
      filter: [visibilityFilter, ...userFilters],
    }).catch((e) => {
      console.error('Error searching for products', e);
    });
  }

  const getAddToCartButton = (product) => {
    if (product.typename === 'ComplexProductView') {
      const button = document.createElement('div');
      UI.render(Button, {
        children: labels.Global?.AddProductToCart,
        icon: Icon({ source: 'Cart' }),
        href: getProductLink(product.urlKey, product.sku),
        variant: 'primary',
      })(button);
      return button;
    }
    const button = document.createElement('div');
    UI.render(Button, {
      children: labels.Global?.AddProductToCart,
      icon: Icon({ source: 'Cart' }),
      onClick: () => cartApi.addProductsToCart([{ sku: product.sku, quantity: 1 }]),
      variant: 'primary',
      disabled: !product.inStock,
    })(button);
    return button;
  };

  // ---- lg-oled-plp rich card slots (real catalog attributes, see getAttr) ----
  const lgOledPlpImageSlot = (ctx) => {
    const { product, defaultImageProps } = ctx;
    const anchorWrapper = document.createElement('a');
    anchorWrapper.className = 'lg-oled-plp-image-link';
    anchorWrapper.href = getProductLink(product.urlKey, product.sku);

    tryRenderAemAssetsImage(ctx, {
      alias: product.sku,
      imageProps: defaultImageProps,
      wrapper: anchorWrapper,
      params: {
        width: defaultImageProps.width,
        height: defaultImageProps.height,
      },
    });
  };

  const lgOledPlpNameSlot = (ctx) => {
    const { product } = ctx;
    const wrapper = document.createElement('div');
    wrapper.className = 'lg-oled-plp-name';

    // Badges row is always rendered, even when there's no tag — CSS reserves
    // a fixed height for it so cards without a tag don't shift their image
    // (and everything below it) up relative to cards that have one.
    const badges = document.createElement('div');
    badges.className = 'lg-oled-plp-badges';
    const tag = getAttr(product, 'product_tag');
    if (tag) {
      (Array.isArray(tag) ? tag : String(tag).split(','))
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((value) => {
          const badge = document.createElement('span');
          badge.className = 'lg-oled-plp-badge';
          badge.textContent = value;
          badges.appendChild(badge);
        });
    }
    wrapper.appendChild(badges);

    const title = document.createElement('a');
    title.className = 'lg-oled-plp-title';
    title.href = getProductLink(product.urlKey, product.sku);
    title.textContent = product.name;
    wrapper.appendChild(title);

    const metaRow = document.createElement('div');
    metaRow.className = 'lg-oled-plp-meta';
    const sku = document.createElement('span');
    sku.className = 'lg-oled-plp-sku';
    sku.textContent = product.sku;
    // no rating field exists on the catalog/GraphQL response — hardcoded
    // placeholder like lg.com shows for unreviewed products (0.0, 0 reviews)
    const rating = document.createElement('span');
    rating.className = 'lg-oled-plp-rating';
    rating.innerHTML = '<span class="lg-oled-plp-stars" aria-hidden="true">★★★★★</span> 0.0 (0)';
    metaRow.append(sku, rating);
    wrapper.appendChild(metaRow);

    // Size-chip row is always rendered, even when there are no size options —
    // CSS reserves a fixed two-row height for it so cards with 0, 1 or 2 rows
    // of chips all still position their image (and everything below it) at
    // the same vertical offset.
    const chipRow = document.createElement('div');
    chipRow.className = 'lg-oled-plp-sizes';
    const sizeOptions = getAttr(product, 'size_options');
    if (sizeOptions) {
      const sizes = sizeOptions.split('/').map((s) => s.replace(/"/g, '').trim()).filter(Boolean);
      sizes.forEach((size, i) => {
        const chip = document.createElement('span');
        chip.className = 'lg-oled-plp-size-chip';
        if (i === 0) chip.classList.add('is-active');
        chip.textContent = `${size}"`;
        chipRow.appendChild(chip);
      });
    }
    wrapper.appendChild(chipRow);

    ctx.replaceWith(wrapper);
  };

  const lgOledPlpPriceSlot = (ctx) => {
    const { product } = ctx;
    const wrapper = document.createElement('div');
    wrapper.className = 'lg-oled-plp-price-block';

    const energyGrade = getAttr(product, 'energy_grade');
    if (energyGrade) {
      const row = document.createElement('div');
      row.className = 'lg-oled-plp-energy-row';
      const chip = document.createElement('span');
      chip.className = `lg-oled-plp-energy lg-oled-plp-energy--${energyGrade.toLowerCase()}`;
      chip.textContent = energyGrade;
      const info = document.createElement('a');
      info.className = 'lg-oled-plp-info-sheet';
      info.href = getProductLink(product.urlKey, product.sku);
      info.textContent = 'Product Information Sheet';
      row.append(chip, info);
      wrapper.appendChild(row);
    }

    const currency = product.price?.final?.amount?.currency;
    const finalValue = product.price?.final?.amount?.value;
    if (finalValue != null) {
      const price = document.createElement('div');
      price.className = 'lg-oled-plp-price';
      price.textContent = formatMoney(finalValue, currency);
      wrapper.appendChild(price);
    }

    const memberPrice = getAttr(product, 'member_price');
    if (memberPrice) {
      const member = document.createElement('div');
      member.className = 'lg-oled-plp-member-price';
      member.innerHTML = `Members Only <strong>${formatMoney(parseFloat(memberPrice), currency)}</strong>`;
      wrapper.appendChild(member);
    }

    const installmentText = getAttr(product, 'installment_text');
    if (installmentText) {
      const installment = document.createElement('div');
      installment.className = 'lg-oled-plp-installment';
      installment.innerHTML = `<span class="lg-oled-plp-installment-text">${installmentText}</span> <strong>PayPal</strong>`;
      wrapper.appendChild(installment);
    }

    ctx.replaceWith(wrapper);
  };

  const lgOledPlpActionsSlot = (ctx) => {
    const { product } = ctx;
    const wrapper = document.createElement('div');
    wrapper.className = 'lg-oled-plp-actions';

    const row = document.createElement('div');
    row.className = 'lg-oled-plp-actions-row';

    const learnMore = document.createElement('a');
    learnMore.className = 'lg-oled-plp-learn-more';
    learnMore.href = getProductLink(product.urlKey, product.sku);
    learnMore.textContent = 'Learn More ›';
    row.appendChild(learnMore);

    const buyNowWrapper = document.createElement('div');
    buyNowWrapper.className = 'lg-oled-plp-buy-now';
    const isComplex = product.typename === 'ComplexProductView';
    UI.render(Button, {
      children: 'Buy Now',
      href: isComplex ? getProductLink(product.urlKey, product.sku) : undefined,
      onClick: isComplex ? undefined : () => cartApi.addProductsToCart([{ sku: product.sku, quantity: 1 }]),
      variant: 'primary',
      disabled: !isComplex && !product.inStock,
    })(buyNowWrapper);
    row.appendChild(buyNowWrapper);

    wrapper.appendChild(row);

    // no real "compare" feature wired up — visual-only checkbox, per request
    // to hardcode generic/non-data-driven pieces
    const compareLabel = document.createElement('label');
    compareLabel.className = 'lg-oled-plp-compare';
    const compareInput = document.createElement('input');
    compareInput.type = 'checkbox';
    const compareText = document.createElement('span');
    compareText.textContent = 'Compare';
    compareLabel.append(compareInput, compareText);
    wrapper.appendChild(compareLabel);

    ctx.replaceWith(wrapper);
  };

  await Promise.all([
    // Sort By
    provider.render(SortBy, {})($productSort),

    // Pagination
    provider.render(Pagination, {
      onPageChange: () => {
        // scroll to the top of the page
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    })($pagination),

    // View Facets Button
    UI.render(Button, {
      children: labels.Global?.Filters,
      icon: Icon({ source: 'Burger' }),
      variant: 'secondary',
      onClick: () => {
        $facets.classList.toggle('search__facets--visible');
      },
    })($viewFacets),

    // Facets
    provider.render(Facets, {})($facets),
    // Product List
    provider.render(SearchResults, {
      routeProduct: (product) => getProductLink(product.urlKey, product.sku),
      slots: isLgOledPlp ? {
        ProductImage: lgOledPlpImageSlot,
        ProductName: lgOledPlpNameSlot,
        ProductPrice: lgOledPlpPriceSlot,
        ProductActions: lgOledPlpActionsSlot,
      } : {
        ProductImage: (ctx) => {
          const { product, defaultImageProps } = ctx;
          const anchorWrapper = document.createElement('a');
          anchorWrapper.href = getProductLink(product.urlKey, product.sku);

          tryRenderAemAssetsImage(ctx, {
            alias: product.sku,
            imageProps: defaultImageProps,
            wrapper: anchorWrapper,
            params: {
              width: defaultImageProps.width,
              height: defaultImageProps.height,
            },
          });
        },
        ProductActions: (ctx) => {
          const actionsWrapper = document.createElement('div');
          actionsWrapper.className = 'product-discovery-product-actions';
          // Add to Cart Button
          const addToCartBtn = getAddToCartButton(ctx.product);
          addToCartBtn.className = 'product-discovery-product-actions__add-to-cart';
          // Wishlist Button
          const $wishlistToggle = document.createElement('div');
          $wishlistToggle.classList.add('product-discovery-product-actions__wishlist-toggle');
          wishlistRender.render(WishlistToggle, {
            product: ctx.product,
            variant: 'tertiary',
          })($wishlistToggle);
          actionsWrapper.appendChild(addToCartBtn);
          actionsWrapper.appendChild($wishlistToggle);
          ctx.replaceWith(actionsWrapper);
        },
      },
    })($productList),
  ]);

  // Listen for search results (event is fired before the block is rendered; eager: true)
  events.on('search/result', (payload) => {
    const totalCount = payload.result?.totalCount || 0;

    block.classList.toggle('product-list-page--empty', totalCount === 0);

    // Results Info
    $resultInfo.innerHTML = payload.request?.phrase
      ? `${totalCount} results found for <strong>"${payload.request.phrase}"</strong>.`
      : `${totalCount} results found.`;

    // Update the view facets button with the number of filters
    if (payload.request.filter.length > 0) {
      $viewFacets.querySelector('button').setAttribute('data-count', payload.request.filter.length);
    } else {
      $viewFacets.querySelector('button').removeAttribute('data-count');
    }
  }, { eager: true });

  // Listen for search results (event is fired after the block is rendered; eager: false)
  // URL is owned by this project; update it when search state changes.
  events.on('search/result', (payload) => {
    const url = new URL(window.location.href);
    applySearchStateToUrl(url, payload.request);
    window.history.pushState({}, '', url.toString());
  }, { eager: false });
}
