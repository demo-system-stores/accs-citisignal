// LG PDP: sticky tab bar that scroll-spies the sections below and
// smooth-scrolls (accounting for the fixed header + sticky bar) on click.
function initPdpScrollSpy(block) {
  const links = [...block.querySelectorAll('a[href^="#"]')];
  if (!links.length) return;

  const barOffset = () => 64 + block.getBoundingClientRect().height + 8;

  const entries = links
    .map((a) => {
      const cell = a.closest('div');
      const id = decodeURIComponent((a.getAttribute('href') || '').slice(1));
      const target = id && document.getElementById(id);
      if (target) {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          const y = target.getBoundingClientRect().top + window.scrollY - barOffset();
          window.scrollTo({ top: y, behavior: 'smooth' });
        });
      }
      return { cell, target };
    })
    .filter((entry) => entry.target);

  if (!entries.length) return;

  const onScroll = () => {
    const line = barOffset() + 4;
    let active = entries[0];
    entries.forEach((entry) => {
      if (entry.target.getBoundingClientRect().top <= line) active = entry;
    });
    entries.forEach((entry) => entry.cell.classList.toggle('active', entry === active));
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
}

export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }
    });
  });

  // LG PDP scroll-spy tab bar
  if (block.closest('.section')?.classList.contains('lg-pdp-tabs')) {
    initPdpScrollSpy(block);
  }
}
