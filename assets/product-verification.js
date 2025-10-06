class ProductVerification extends HTMLElement {
  constructor() {
    super();
    this.form = this.querySelector('.verification__form-block');
    this.input = this.querySelector('.verification__input');
    this.resultBlock = this.querySelector('.verification__result');
    this.introBlock = this.querySelector('.verification__intro');
    this.resultTitle = this.querySelector('.verification__result-title');
    this.resultBody = this.querySelector('.verification__result .verification__wrapper');
    this.galleryContainer = this.querySelector('[data-gallery]');
    this.galleryContainer.innerHTML = '';
    this.dataMap = {
      details: this.querySelector('.verification__details'),
      serial: this.querySelector('[data-key="serial"]'),
      about: this.querySelector('[data-key="about"]'),
      autograph: this.querySelector('[data-key="autograph"]'),
      date: this.querySelector('[data-key="date"]'),
      image: this.querySelector('.verification__main-img'),
    };

    this.labels = {
      serial: this.dataMap.details.dataset.labelSerial,
      about: this.dataMap.details.dataset.labelAbout,
      autograph: this.dataMap.details.dataset.labelAutograph,
      date: this.dataMap.details.dataset.labelDate,
    };

    this.errors = JSON.parse(document.getElementById('verification-errors').textContent);

    this.loader = this.querySelector('.verification__loader');

    // Events
    this.input.addEventListener('input', this._onInputMask.bind(this));
    this.form.addEventListener('submit', this._onSubmit.bind(this));
    this.verifyProductUrl = 'https://europe-west1-oktagon-466107.cloudfunctions.net/verifyProductSerialNumberFunction';
  }

  _onInputMask(e) {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let output = '';

    for (let i = 0; i < value.length && i < 11; i++) {
      if (i === 3 || i === 6) output += '-';
      output += value[i];
    }

    e.target.value = output;
  }

  async _onSubmit(e) {
    e.preventDefault();
    const inputVal = this.input.value.trim().toUpperCase();
    this._clearErrors();

    const formatRegex = /^[A-Z0-9]{3}-[A-Z0-9]{3}-\d{5}$/;

    if (!inputVal) {
      this._showError(`<span>${this.errors.empty}</span>`);
      return;
    }

    if (!formatRegex.test(inputVal)) {
      this._showError(`<span>${this.errors.format}</span>`);
      return;
    }

    try {
      // Fetch product data from your new endpoint
      const response = await fetch(`${this.verifyProductUrl}?serialNumber=${encodeURIComponent(inputVal)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          this._showError(`<span>${this.errors.not_found}</span>`);
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.loader.hidden = true;
        return;
      }

      let responseData;
      try {
        responseData = await response.json();

        if (typeof responseData === 'string') {
          responseData = JSON.parse(responseData);
        }
        
      } catch (parseError) {
        this._showError(`<span>${this.errors.not_found}</span>`);
        this.loader.hidden = true;
        return;
      }
      
      if (!responseData || !responseData.verifiedProduct) {
        this._showError(`<span>${this.errors.not_found}</span>`);
        this.loader.hidden = true;
        return;
      }

      const data = responseData.verifiedProduct;
      
      if (data.serial && typeof data.serial === 'string') {
        try {
          const serialArray = JSON.parse(data.serial);
          data.serial = Array.isArray(serialArray) ? serialArray[0] : serialArray;
        } catch (e) {
          console.warn('Failed to parse serial field:', e);
        }
      }

      this.loader.hidden = false;
      this.introBlock.classList.add('is-hidden');

      setTimeout(() => {
        this.loader.hidden = true;
        this._render(data);
      }, 600);

    } catch (err) {
      console.error('Error fetching verification data:', err);
      this._showError(`<span>${this.errors.not_found}</span>`);
      this.loader.hidden = true;
    }
  }

  _showError(message) {
    let errorEl = this.querySelector('.verification__error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'verification__error';
      this.form.appendChild(errorEl);
    }
    errorEl.innerHTML = message;
    this.input.classList.add('has-error');
  }

  _clearErrors() {
    const errorEl = this.querySelector('.verification__error');
    if (errorEl) errorEl.remove();
    this.input.classList.remove('has-error');
  }

  _setDataField(el, value) {
    el.textContent = value;
    el.classList.add('loaded');
  }

  _render(data) {   
    this.resultBody.classList.add('is-loading');
    this.resultBlock.classList.remove('is-hidden');

    this.resultTitle.textContent = data.title || 'Untitled';

    this.dataMap.details.innerHTML = '';

    this._setTextWithLabel(this.dataMap.details, 'serial', this.labels.serial, data.serial);
    this._setTextWithLabel(this.dataMap.details, 'about', this.labels.about, data.about);
    this._setTextWithLabel(this.dataMap.details, 'autograph', this.labels.autograph, data.autograph);
    this._setTextWithLabel(this.dataMap.details, 'date', this.labels.date, data.date);

    if (data.image) {
      this.dataMap.image.src = data.image;
      this.dataMap.image.alt = data.title || 'Verified product';
    } else {
      this.dataMap.image.src = '';
      this.dataMap.image.alt = '';
    }

    this.galleryContainer.innerHTML = '';
    this._setGallery(this.galleryContainer, data.gallery);

    this.resultBody.classList.remove('is-loading');
    this.resultBlock.classList.add('is-visible');

    const revealItemsInOrder = [
      this.dataMap.image,
      this.dataMap.serial,
      this.dataMap.about,
      this.dataMap.autograph,
      this.dataMap.date,
      this.galleryContainer,
    ];

    revealItemsInOrder.forEach((el, i) => {
      if (!el) return;

      setTimeout(() => {
        el.style.visibility = 'visible';
        el.classList.add('loaded');
      }, 250 * i);
    });

    this.dataMap.image.onload = () => {
      this.dataMap.image.parentElement.classList.add('loaded');
    };
  }

  _setGallery(container, galleryArray) {
    if (!Array.isArray(galleryArray) || galleryArray.length === 0) return;

    galleryArray.forEach((src) => {
      const slideImg = document.createElement('div');
      const wrapImg = document.createElement('div');

      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton skeleton--image';

      const img = document.createElement('img');
      img.src = src;
      img.alt = 'Gallery image';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.className = 'verification__gallery-img';
      img.style.visibility = 'hidden';

      img.onload = () => {
        skeleton.remove();
        setTimeout(() => {
          img.style.visibility = 'visible';
          img.classList.add('loaded');
        }, 450);
      };

      wrapImg.className = 'verification__gallery-slide-wrap';
      slideImg.className = 'verification__gallery-slide';

      wrapImg.appendChild(skeleton);
      wrapImg.appendChild(img);
      slideImg.appendChild(wrapImg);
      container.appendChild(slideImg);
    });

    this.dataMap.details.appendChild(container);
    setTimeout(() => {
      this._initGallerySlider(container);
    }, 250);
  }

  _initGallerySlider(container) {
    if (!window.jQuery || !$.fn.slick) {
      console.warn('Slick not found');
      return;
    }

    const $gallery = $(container);
    const slideCount = $gallery.children().length;

    const desktopSlidesToShow = 4;
    const shouldShowDots = slideCount > desktopSlidesToShow;

    if ($gallery.hasClass('slick-initialized')) {
      $gallery.slick('unslick');
    }

    $gallery.slick({
      slidesToShow: desktopSlidesToShow,
      slidesToScroll: 1,
      dots: shouldShowDots,
      arrows: false,
      infinite: false,
      responsive: [
        {
          breakpoint: 1024,
          settings: {
            slidesToShow: desktopSlidesToShow,
            dots: slideCount > desktopSlidesToShow,
          },
        },
        {
          breakpoint: 768,
          settings: {
            slidesToShow: 2,
            dots: true,
          },
        },
      ],
    });
  }


  _setTextWithLabel(container, key, label, value) {
    if (!value || value.trim() === '') {
      return;
    }

    const p = document.createElement('p');

    const strong = document.createElement('strong');
    strong.textContent = label + ':';

    const span = document.createElement('span');
    span.classList.add('skeleton', 'skeleton--text');
    span.dataset.key = key;
    span.textContent = value;

    p.appendChild(strong);
    p.appendChild(span);
    container.appendChild(p);

    this.dataMap[key] = span;
  }
}

customElements.define('product-verification', ProductVerification);
