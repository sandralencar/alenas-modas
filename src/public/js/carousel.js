(() => {
  const carousel = document.querySelector('[data-hero-carousel]');
  if (!carousel) return;

  const track = carousel.querySelector('[data-carousel-track]');
  const slides = [...carousel.querySelectorAll('[data-carousel-slide]')];
  const controls = carousel.querySelector('[data-carousel-controls]');
  const previous = carousel.querySelector('[data-carousel-previous]');
  const next = carousel.querySelector('[data-carousel-next]');
  const indicators = [...carousel.querySelectorAll('[data-carousel-indicator]')];

  if (!track || !controls || !previous || !next || slides.length !== 3 || indicators.length !== slides.length) {
    return;
  }

  let activeIndex = 0;
  let autoplayTimer;
  let paused = false;
  let pointerStartX = null;

  const stopAutoplay = () => {
    window.clearTimeout(autoplayTimer);
    autoplayTimer = undefined;
  };

  const scheduleAutoplay = () => {
    stopAutoplay();
    if (paused) return;
    autoplayTimer = window.setTimeout(() => {
      showSlide(activeIndex + 1);
      scheduleAutoplay();
    }, 5000);
  };

  const pause = () => {
    paused = true;
    stopAutoplay();
  };

  const resume = () => {
    paused = false;
    scheduleAutoplay();
  };

  function showSlide(index) {
    activeIndex = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${activeIndex * (100 / slides.length)}%)`;

    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === activeIndex;
      slide.setAttribute('aria-hidden', String(!isActive));
      slide.inert = !isActive;
    });

    indicators.forEach((indicator, indicatorIndex) => {
      indicator.setAttribute('aria-current', String(indicatorIndex === activeIndex));
    });
  }

  slides.forEach((slide) => {
    slide.hidden = false;
  });
  showSlide(0);
  carousel.classList.add('is-ready');
  controls.hidden = false;

  previous.addEventListener('click', () => {
    showSlide(activeIndex - 1);
    resume();
  });
  next.addEventListener('click', () => {
    showSlide(activeIndex + 1);
    resume();
  });
  indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => {
      showSlide(index);
      resume();
    });
  });

  carousel.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') pause();
  });
  carousel.addEventListener('pointerleave', (event) => {
    if (event.pointerType === 'mouse' && !carousel.contains(document.activeElement)) resume();
  });
  carousel.addEventListener('focusin', pause);
  carousel.addEventListener('focusout', (event) => {
    if (!carousel.contains(event.relatedTarget) && !carousel.matches(':hover')) resume();
  });
  carousel.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showSlide(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
      resume();
    }
  });

  carousel.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    pointerStartX = event.clientX;
    pause();
  });
  carousel.addEventListener('pointerup', (event) => {
    if (pointerStartX === null) return;
    const distance = event.clientX - pointerStartX;
    pointerStartX = null;
    if (Math.abs(distance) > 48) {
      showSlide(activeIndex + (distance < 0 ? 1 : -1));
    }
    resume();
  });
  carousel.addEventListener('pointercancel', () => {
    pointerStartX = null;
    resume();
  });

  scheduleAutoplay();
})();
