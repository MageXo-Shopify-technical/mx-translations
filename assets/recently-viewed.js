class RecentlyViewed extends HTMLElement {
  constructor() {
    super();

    this.sectionId = this.getAttribute('data-section-id');
    this.head = this.querySelector('.recently-viewed__head');

    this.initWhenVisible({
      element: this,
      callback: this.recentlyViewed.bind(this),
      threshold: 600,
    });
  }

  initWhenVisible(options) {
    const threshold = options.threshold ? options.threshold : 0;

    let observer = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (typeof options.callback === 'function') {
              options.callback();
              observer.unobserve(entry.target);
            }
          }
        });
      },
      { rootMargin: '0px 0px ' + threshold + 'px 0px' }
    );

    observer.observe(options.element);
  }

  recentlyViewed() {
    // let init = false
    const maxProducts = 24;
    let products = '';
    let i = 0;
    let url = window.routes.search + '?view=recently-viewed&type=product&q=';

    if (!window.recentlyViewedIds.length) {
      this.classList.add('hidden');
      return;
    }

    this.outputContainer = document.getElementById('RecentlyViewed-' + this.sectionId);

    window.recentlyViewedIds.forEach(function (val) {
      // Stop at max
      if (i >= maxProducts) return;
      products += 'id:' + val + ' OR ';
      i++;
    });

    url = url + encodeURIComponent(products);

    fetch(url)
      .then(function (response) {
        return response.text();
      })
      .then(
        function (html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          var count = doc.querySelectorAll('.recently-viewed__slide').length;

          if (count > 0) {
            if (this.head !== null) this.head.classList.remove('hidden');

            var results = doc.querySelector('.recently-viewed__carousel');
            this.outputContainer.append(results);

            const $carousel = $('.recently-viewed__carousel:not(.slick-initialized)');
            if ($carousel.length) {
              $carousel.slick($carousel.data('slick'));
            }
          } else {
            this.classList.add('hidden');
          }
        }.bind(this)
      );
  }
}

customElements.define('recently-viewed', RecentlyViewed);
