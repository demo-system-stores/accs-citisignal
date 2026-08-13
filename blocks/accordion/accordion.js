/*
 * Accordion Block
 * Recreate an accordion
 * https://www.hlx.live/developer/block-collection/accordion
 */

export default function decorate(block) {
  // LG OLED FAQ variant: answers always open + uniform "Q."/"A." markers (CSS)
  const isLgFaq = block.closest('.section')?.classList.contains('lg-oled-faq');

  // Remove an authored leading "Q."/"A." so the CSS markers don't duplicate.
  const stripPrefix = (el, re) => {
    if (!el) return;
    let node = el.firstChild;
    if (node && node.nodeType !== Node.TEXT_NODE && node.firstChild) {
      node = node.firstChild;
    }
    if (node && node.nodeType === Node.TEXT_NODE) {
      node.textContent = node.textContent.replace(re, '');
    }
  };

  [...block.children].forEach((row) => {
    // decorate accordion item label
    const label = row.children[0];
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);
    // decorate accordion item body
    const body = row.children[1];
    body.className = 'accordion-item-body';
    // decorate accordion item
    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary, body);

    if (isLgFaq) {
      details.open = true;
      // keep it open — clicking the question should not collapse it
      summary.addEventListener('click', (e) => e.preventDefault());
      stripPrefix(summary, /^\s*Q\.?\s*/i);
      stripPrefix(body, /^\s*A\.?\s*/i);
    }

    row.replaceWith(details);
  });
}
