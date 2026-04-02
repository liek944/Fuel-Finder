/* ═══════════════════════════════════════════
   FUEL FINDER LANDING PAGE — INTERACTIONS
   ═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenu();
  initScrollAnimations();
  initDemoCarousel();
  initSmoothScroll();
  initDropdowns();
});

/* ── Download Dropdowns ── */
function initDropdowns() {
  const dropdowns = document.querySelectorAll('.download-dropdown');
  
  dropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector('.dropdown-trigger');
    if (!trigger) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Close other open dropdowns first
      dropdowns.forEach(d => {
        if (d !== dropdown && d.classList.contains('open')) {
          d.classList.remove('open');
          d.querySelector('.dropdown-trigger').setAttribute('aria-expanded', 'false');
        }
      });
      
      // Toggle current
      const isOpen = dropdown.classList.contains('open');
      if (isOpen) {
        dropdown.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      } else {
        dropdown.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    dropdowns.forEach(d => {
      if (d.classList.contains('open')) {
        d.classList.remove('open');
        const trigger = d.querySelector('.dropdown-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }
    });
  });
}


/* ── Navbar Scroll Effect ── */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const onScroll = () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // initial check
}


/* ── Mobile Menu Toggle ── */
function initMobileMenu() {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('mobile-menu');
  const links = document.querySelectorAll('.mobile-link');

  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    menu.classList.toggle('open');
    document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
  });

  // Close on link click
  links.forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('active');
      menu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('open')) {
      toggle.classList.remove('active');
      menu.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
}


/* ── Scroll-triggered Animations ── */
function initScrollAnimations() {
  const elements = document.querySelectorAll('[data-animate]');
  if (!elements.length) return;

  // Respect reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    elements.forEach(el => el.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  elements.forEach(el => observer.observe(el));
}


/* ── Demo Screenshot Carousel ── */
function initDemoCarousel() {
  const tabs = document.querySelectorAll('.demo-tab');
  const slides = document.querySelectorAll('.demo-slide');
  const dots = document.querySelectorAll('.demo-dot');
  const indicator = document.getElementById('tab-indicator');

  if (!tabs.length || !slides.length) return;

  let currentSlide = 0;
  let autoplayTimer = null;

  function goToSlide(index) {
    // Update slides
    slides.forEach(s => s.classList.remove('active'));
    slides[index].classList.add('active');

    // Update tabs
    tabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tabs[index].classList.add('active');
    tabs[index].setAttribute('aria-selected', 'true');

    // Update dots
    dots.forEach(d => d.classList.remove('active'));
    dots[index].classList.add('active');

    // Move tab indicator
    moveIndicator(tabs[index]);

    currentSlide = index;
  }

  function moveIndicator(tab) {
    if (!indicator || !tab) return;
    const tabRect = tab.getBoundingClientRect();
    const parentRect = tab.parentElement.getBoundingClientRect();
    indicator.style.width = tabRect.width + 'px';
    indicator.style.left = (tabRect.left - parentRect.left) + 'px';
  }

  function nextSlide() {
    goToSlide((currentSlide + 1) % slides.length);
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = setInterval(nextSlide, 5000);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  // Tab clicks
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      goToSlide(i);
      stopAutoplay();
      startAutoplay();
    });
  });

  // Dot clicks
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      goToSlide(i);
      stopAutoplay();
      startAutoplay();
    });
  });

  // Initialize
  moveIndicator(tabs[0]);
  startAutoplay();

  // Recalculate indicator on resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      moveIndicator(tabs[currentSlide]);
    }, 100);
  });

  // Pause on hover
  const showcase = document.querySelector('.demo-showcase');
  if (showcase) {
    showcase.addEventListener('mouseenter', stopAutoplay);
    showcase.addEventListener('mouseleave', startAutoplay);
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    const demoSection = document.getElementById('demo');
    if (!demoSection) return;

    const rect = demoSection.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

    if (!isVisible) return;

    if (e.key === 'ArrowLeft') {
      goToSlide((currentSlide - 1 + slides.length) % slides.length);
      stopAutoplay();
      startAutoplay();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
      stopAutoplay();
      startAutoplay();
    }
  });
}


/* ── Smooth Scrolling ── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();

      const navHeight = document.getElementById('navbar')?.offsetHeight || 0;
      const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    });
  });
}
