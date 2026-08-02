// Configuration
const CONTACT_WHATSAPP_NUMBER = '33749795786';
const frameCount = 240;
const imageFolder = 'ezgif-27c1ccb2fc865bfa-jpg';
const frameNamePrefix = 'ezgif-frame-';
const frameExtension = '.jpg';

// Ponto focal para o enquadramento (0.0 = esquerda/topo, 0.5 = centro, 1.0 = direita/base)
const imageAlignX = 0.35; // Foca no rosto (esquerda) em telas verticais (mobile)
const imageAlignY = 0.0; // Alinha o topo da imagem para nunca cortar a cabeça do personagem em telas largas


// State
const images = [];
let loadedCount = 0;
let targetFrame = 0;
let currentFrame = 0;
let storyController;
const lerpFactor = 0.08; // Easing intensity (lower is smoother/slower)

// DOM Elements
const canvas = document.getElementById('scroll-canvas');
const ctx = canvas.getContext('2d');
const loaderOverlay = document.getElementById('loader-overlay');
const circle = document.querySelector('.progress-ring-circle');
const percentageText = document.getElementById('loader-percentage');
const scrollIndicator = document.getElementById('scroll-indicator');

// Circle properties
const radius = parseFloat(circle.getAttribute('r')) || 80;
const circumference = 2 * Math.PI * radius;
circle.style.strokeDasharray = `${circumference} ${circumference}`;
circle.style.strokeDashoffset = circumference;

// Function to update progress circle and text
function setProgress(percent) {
  const offset = circumference - (percent / 100) * circumference;
  circle.style.strokeDashoffset = offset;
  percentageText.textContent = `${percent}%`;
}

// Generate file path for frame
function getFramePath(index) {
  const paddedIndex = index.toString().padStart(3, '0');
  return `${imageFolder}/${frameNamePrefix}${paddedIndex}${frameExtension}`;
}

// Resize canvas to match display size
function resizeCanvas() {
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  renderFrame();
}

// Draw image cover-style inside the canvas
function drawImageCover(img) {
  if (!img || !img.complete) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const imgWidth = img.naturalWidth || img.width;
  const imgHeight = img.naturalHeight || img.height;
  
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  
  const imgRatio = imgWidth / imgHeight;
  const canvasRatio = canvasWidth / canvasHeight;
  
  let drawWidth, drawHeight, drawX, drawY;
  
  if (canvasRatio > imgRatio) {
    // Canvas is wider than image aspect ratio (crop top/bottom)
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / imgRatio;
    drawX = 0;
    drawY = (canvasHeight - drawHeight) * imageAlignY;
  } else {
    // Canvas is taller than image aspect ratio (crop sides)
    drawWidth = canvasHeight * imgRatio;
    drawHeight = canvasHeight;
    drawX = (canvasWidth - drawWidth) * imageAlignX;
    drawY = 0;
  }
  
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
}

// Render the frame onto canvas
function renderFrame() {
  const activeIndex = Math.round(currentFrame);
  const activeImage = images[activeIndex];
  if (activeImage) {
    drawImageCover(activeImage);
  }
}

// Update scroll target based on page position
function updateScrollProgress() {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  
  if (maxScroll <= 0) return;
  
  const scrollFraction = scrollTop / maxScroll;
  targetFrame = Math.min(frameCount - 1, Math.floor(scrollFraction * frameCount));
  
  // Hide the scroll indicator once the user scrolls a bit
  if (scrollTop > 50) {
    scrollIndicator.classList.add('hidden');
  } else {
    scrollIndicator.classList.remove('hidden');
  }

  // Fade out hero section on scroll with a smooth transition
  const heroSection = document.getElementById('hero-section');
  if (heroSection) {
    const fadeProgress = Math.max(0, 1 - (scrollTop / (window.innerHeight * 0.7)));
    heroSection.style.opacity = fadeProgress;
    heroSection.style.transform = `translateY(${-scrollTop * 0.25}px)`; // Parallax shift
    heroSection.style.pointerEvents = fadeProgress < 0.15 ? 'none' : 'auto';
  }

  // Update scroll narrative chapters
  if (storyController) {
    storyController.update(scrollFraction);
  }
}

// The core animation loop (lerping currentFrame towards targetFrame)
function animationLoop() {
  const difference = targetFrame - currentFrame;
  
  // If difference is small enough, snap to target
  if (Math.abs(difference) < 0.001) {
    currentFrame = targetFrame;
  } else {
    currentFrame += difference * lerpFactor;
  }
  
  renderFrame();
  requestAnimationFrame(animationLoop);
}

// Initialize application
function init() {
  // Setup listeners
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('scroll', updateScrollProgress);
  
  // Start animation loop
  requestAnimationFrame(animationLoop);
  
  // Trigger initial resize & render
  resizeCanvas();
  
  // Initialize new premium glass bubbles navigation
  new BubbleMenu();
  setupMobileMenu();
  setupServicesPanel();
  setupSelectPanel();
  setupPortfolioPanel();
  setupBlogPanel();
  setupSmoothScroll();
  setupAboutPanel();
  setupContactPanel();
  connectAllCTAs();
  handleInitialPanelRequest();
  storyController = new StoryController();
  
  // Smoothly fade out the loader overlay
  setTimeout(() => {
    loaderOverlay.classList.add('fade-out');
  }, 300);
}

// Preload Images
function startPreloading() {
  for (let i = 1; i <= frameCount; i++) {
    const img = new Image();
    img.src = getFramePath(i);
    
    img.onload = () => {
      loadedCount++;
      const progress = Math.round((loadedCount / frameCount) * 100);
      setProgress(progress);
      
      if (loadedCount === frameCount) {
        init();
      }
    };
    
    img.onerror = () => {
      // In case of error (e.g. file missing), still count and proceed
      loadedCount++;
      const progress = Math.round((loadedCount / frameCount) * 100);
      setProgress(progress);
      
      if (loadedCount === frameCount) {
        init();
      }
    };
    
    images.push(img);
  }
}

// Begin loading assets
startPreloading();

// ==========================================
// BubbleMenu Glass Navigation System
// ==========================================

class BubbleMenu {
  constructor() {
    this.container = document.getElementById('bubbles-nav-container');
    if (!this.container) return;

    this.bubbles = Array.from(this.container.querySelectorAll('.bubble-menu-item')).map((el, index) => {
      const basePctX = parseFloat(el.getAttribute('data-x')) || 0;
      const basePctY = parseFloat(el.getAttribute('data-y')) || 0;
      return {
        element: el,
        wrapper: el.querySelector('.bubble-wrapper'),
        bg: el.querySelector('.bubble-bg'),
        index: index,
        basePctX: basePctX,
        basePctY: basePctY,
        bx: 0,
        by: 0,
        x: 0,
        y: 0,
        ox: 0,
        oy: 0,
        vx: 0,
        vy: 0,
        phase: Math.random() * Math.PI * 2,
        speedX: 0.0008 + Math.random() * 0.0006,
        speedY: 0.0008 + Math.random() * 0.0006,
        ampX: 6 + Math.random() * 4,
        ampY: 8 + Math.random() * 4,
        rotSpeed: 0.0005 + Math.random() * 0.0005,
        rotAmp: 0.7, // degrees
        isHovered: false,
        radius: 0
      };
    });

    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseActive = false;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Mouse events on Hero section
    const hero = document.getElementById('hero-section');
    if (hero) {
      hero.addEventListener('mousemove', (e) => {
        const rect = this.container.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
        this.mouseActive = true;
      });

      hero.addEventListener('mouseleave', () => {
        this.mouseActive = false;
      });

      // Touch events for mobile/tablet compatibility
      hero.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
          const rect = this.container.getBoundingClientRect();
          this.mouseX = e.touches[0].clientX - rect.left;
          this.mouseY = e.touches[0].clientY - rect.top;
          this.mouseActive = true;
        }
      }, { passive: true });

      hero.addEventListener('touchend', () => {
        this.mouseActive = false;
      });
    }

    // Hover listeners
    this.bubbles.forEach(b => {
      b.element.addEventListener('mouseenter', () => {
        b.element.classList.add('hovered');
        b.isHovered = true;
      });
      b.element.addEventListener('mouseleave', () => {
        b.element.classList.remove('hovered');
        b.isHovered = false;
      });
    });

    // Start update loop
    this.update();
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const isMobile = window.innerWidth <= 768;

    this.bubbles.forEach(b => {
      if (isMobile) {
        b.element.style.transform = '';
        b.wrapper.style.transform = '';
        b.bg.style.transform = '';
        return;
      }

      b.bx = (b.basePctX / 100) * width;
      b.by = (b.basePctY / 100) * height;
      b.radius = b.element.offsetWidth / 2;
    });
  }

  update() {
    if (window.innerWidth <= 768) {
      requestAnimationFrame(() => this.update());
      return;
    }

    const time = Date.now();
    const springStiffness = 0.04;
    const springDamping = 0.82; // damping factor for elastic bounce

    this.bubbles.forEach(b => {
      // 1. Continuous slow floating and rotation
      const fx = Math.sin(time * b.speedX + b.phase) * b.ampX;
      const fy = Math.cos(time * b.speedY + b.phase) * b.ampY;
      const rot = Math.sin(time * b.rotSpeed + b.phase) * b.rotAmp;

      // 2. Mouse attraction physics (spring system)
      let tx = 0;
      let ty = 0;

      if (this.mouseActive) {
        const dx = this.mouseX - (b.bx + b.ox);
        const dy = this.mouseY - (b.by + b.oy);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Attraction threshold (magnetic effect when mouse is nearby)
        const attractionThreshold = 240;
        if (dist < attractionThreshold) {
          const factor = (1 - dist / attractionThreshold);
          const maxDisp = 18; // maximum displacement 10-20px (18px)
          tx = (dx / dist) * maxDisp * factor;
          ty = (dy / dist) * maxDisp * factor;

          // Proximity interaction details: scale, glow, and border light up
          const hoverDistanceTrigger = b.radius + 60;
          if (dist < hoverDistanceTrigger && !b.isHovered) {
            b.element.classList.add('hovered');
            b.isHovered = true;
          } else if (dist >= hoverDistanceTrigger && b.isHovered) {
            b.element.classList.remove('hovered');
            b.isHovered = false;
          }
        } else if (b.isHovered) {
          b.element.classList.remove('hovered');
          b.isHovered = false;
        }
      } else if (b.isHovered) {
        b.element.classList.remove('hovered');
        b.isHovered = false;
      }

      // Spring physics calculations
      const ax = (tx - b.ox) * springStiffness;
      const ay = (ty - b.oy) * springStiffness;

      b.vx = (b.vx + ax) * springDamping;
      b.vy = (b.vy + ay) * springDamping;

      b.ox += b.vx;
      b.oy += b.vy;

      b.x = b.bx + b.ox + fx;
      b.y = b.by + b.oy + fy;

      // Apply transforms
      b.element.style.transform = `translate3d(${b.x - b.radius}px, ${b.y - b.radius}px, 0)`;
      b.wrapper.style.transform = `rotate(${rot}deg)`;
    });

    // 3. Discrete Metaballs deformation
    const metaballThreshold = 180;
    for (let i = 0; i < this.bubbles.length; i++) {
      const b1 = this.bubbles[i];
      let closestDist = Infinity;
      let closestAngle = 0;
      let closestBubble = null;

      for (let j = 0; j < this.bubbles.length; j++) {
        if (i === j) continue;
        const b2 = this.bubbles[j];
        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < closestDist) {
          closestDist = dist;
          closestAngle = Math.atan2(dy, dx);
          closestBubble = b2;
        }
      }

      const touchThreshold = b1.radius + (closestBubble ? closestBubble.radius : 0) + 30;
      if (closestDist < touchThreshold && closestDist > 5) {
        const overlapProgress = 1 - (closestDist / touchThreshold);
        const stretchFactor = 0.07 * Math.pow(overlapProgress, 2); // discrete stretch deformation max ~7%
        b1.bg.style.transform = `rotate(${closestAngle}rad) scaleX(${1 + stretchFactor}) rotate(${-closestAngle}rad)`;
      } else {
        b1.bg.style.transform = 'scale(1)';
      }
    }

    requestAnimationFrame(() => this.update());
  }
}

// Mobile navigation drawer toggle logic
function setupMobileMenu() {
  const hamburgerBtn = document.getElementById('menu-hamburger-btn');
  const drawer = document.getElementById('mobile-menu-drawer');
  const closeBtn = document.getElementById('drawer-close');
  const drawerLinks = document.querySelectorAll('.drawer-link');

  if (!hamburgerBtn || !drawer) return;

  let previousFocus = null;

  function openDrawer() {
    previousFocus = document.activeElement;
    drawer.classList.add('active');
    drawer.setAttribute('aria-hidden', 'false');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      if (closeBtn) closeBtn.focus();
    }, 80);
  }

  function closeDrawer(restoreFocus = true) {
    drawer.classList.remove('active');
    drawer.setAttribute('aria-hidden', 'true');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';

    if (restoreFocus && previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
    }
  }

  hamburgerBtn.addEventListener('click', openDrawer);
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeDrawer(true));
  }

  drawerLinks.forEach(link => {
    link.addEventListener('click', () => closeDrawer(false));
  });

  drawer.addEventListener('keydown', (e) => {
    if (!drawer.classList.contains('active')) return;

    if (e.key === 'Escape') {
      closeDrawer(true);
      return;
    }

    if (e.key !== 'Tab') return;

    const focusableElements = drawer.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (!firstFocusable || !lastFocusable) return;

    if (e.shiftKey && document.activeElement === firstFocusable) {
      lastFocusable.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === lastFocusable) {
      firstFocusable.focus();
      e.preventDefault();
    }
  });
}

// Smooth scroll implementation mapping hashes to scroll depth percentage
function setupSmoothScroll() {
  const scrollAnchors = document.querySelectorAll('a[href^="#"]');
  
  scrollAnchors.forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href').substring(1);
      
      // Skip panel trigger links to avoid click conflicts with modal popups
      if (
        targetId === 'about' || 
        targetId === 'services' || 
        targetId === 'portfolio' ||
        targetId === 'blog' ||
        targetId === 'contact' ||
        this.id === 'about-bubble-trigger' ||
        this.id === 'services-bubble-trigger' ||
        this.id === 'select-bubble-trigger' ||
        this.id === 'portfolio-bubble-trigger' ||
        this.id === 'blog-bubble-trigger' ||
        this.id === 'contact-bubble-trigger' ||
        this.classList.contains('drawer-link') ||
        this.classList.contains('btn') ||
        this.classList.contains('story-cta-btn')
      ) {
        return;
      }
      
      const sectionScrollPositions = {
        'hero-section': 0,
        'about': 0.22,
        'projects': 0.45,
        'gallery': 0.45,
        'services': 0.68,
        'contact': 0.88,
        'blog': 0.98
      };

      if (sectionScrollPositions[targetId] !== undefined) {
        e.preventDefault();
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const targetScrollTop = sectionScrollPositions[targetId] * maxScroll;
        
        window.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
      }
    });
  });
}

// About editorial panel interaction setup
function setupAboutPanel() {
  const overlay = document.getElementById('about-panel-overlay');
  const panel = document.getElementById('about-panel');
  const closeBtn = document.getElementById('about-panel-close');
  const bubbleTrigger = document.getElementById('about-bubble-trigger');
  const drawerTrigger = document.querySelector('.drawer-link[href="#about"]');
  const ctaServices = document.getElementById('about-cta-services');

  if (!overlay || !closeBtn) return;

  let activeTrigger = null;

  function openPanel(triggerEl) {
    activeTrigger = triggerEl;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    if (bubbleTrigger) bubbleTrigger.setAttribute('aria-expanded', 'true');
    
    // Add class to freeze background scroll
    document.body.classList.add('about-open');
    
    // Trap focus inside modal: find all focusable elements
    const focusableElements = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    function handleKeydown(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstFocusable) {
            lastFocusable.focus();
            e.preventDefault();
          }
        } else { // Tab
          if (document.activeElement === lastFocusable) {
            firstFocusable.focus();
            e.preventDefault();
          }
        }
      }
    }

    // Bind focus trap listener
    panel._focusTrapHandler = handleKeydown;
    panel.addEventListener('keydown', handleKeydown);

    // Focus close button initially
    setTimeout(() => {
      closeBtn.focus();
    }, 100);
  }

  function closePanel() {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    if (bubbleTrigger) bubbleTrigger.setAttribute('aria-expanded', 'false');
    
    document.body.classList.remove('about-open');

    // Remove focus trap listener
    if (panel._focusTrapHandler) {
      panel.removeEventListener('keydown', panel._focusTrapHandler);
      panel._focusTrapHandler = null;
    }

    // Restore focus to trigger
    if (activeTrigger) {
      activeTrigger.focus();
    }
  }

  // Event listener for About bubble click
  if (bubbleTrigger) {
    bubbleTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPanel(bubbleTrigger);
    });
  }

  // Event listener for Mobile Drawer link click
  if (drawerTrigger) {
    drawerTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPanel(drawerTrigger);
    });
  }

  // Close X button click
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closePanel();
  });

  // Close when clicking outside on overlay
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closePanel();
    }
  });

  // Close on Escape key press
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closePanel();
    }
  });

  // CTA Services button click
  if (ctaServices) {
    ctaServices.addEventListener('click', (e) => {
      e.preventDefault();
      closePanel();
      if (window.openServicesPanel) {
        window.openServicesPanel(ctaServices);
      }
    });
  }

  // Expose close function globally
  window.closeAboutPanel = closePanel;
}

// Services editorial panel interaction setup
function setupServicesPanel() {
  const overlay = document.getElementById('services-panel-overlay');
  const panel = document.getElementById('services-panel');
  const closeBtn = document.getElementById('services-panel-close');
  const bubbleTrigger = document.getElementById('services-bubble-trigger');
  const drawerTrigger = document.querySelector('.drawer-link[href="#services"]');
  const filterButtons = Array.from(document.querySelectorAll('.services-filter-btn'));
  const serviceCards = Array.from(document.querySelectorAll('.service-card'));
  const serviceGroups = Array.from(document.querySelectorAll('.services-group'));

  if (!overlay || !panel || !closeBtn) return;

  let activeTrigger = null;

  function updateFilter(filter) {
    filterButtons.forEach(btn => {
      const isActive = btn.getAttribute('data-filter') === filter;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    serviceCards.forEach(card => {
      const isVisible = filter === 'all' || card.getAttribute('data-category') === filter;
      card.classList.toggle('is-hidden', !isVisible);
    });

    serviceGroups.forEach(group => {
      const visibleCards = Array.from(group.querySelectorAll('.service-card')).filter(card => !card.classList.contains('is-hidden'));
      group.classList.toggle('is-hidden', visibleCards.length === 0);
    });
  }

  function openPanel(triggerEl) {
    activeTrigger = triggerEl;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    if (bubbleTrigger) bubbleTrigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('services-open');
    updateFilter('all');

    const focusableElements = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    function handleKeydown(e) {
      if (e.key !== 'Tab' || !firstFocusable || !lastFocusable) return;

      if (e.shiftKey && document.activeElement === firstFocusable) {
        lastFocusable.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        firstFocusable.focus();
        e.preventDefault();
      }
    }

    panel._focusTrapHandler = handleKeydown;
    panel.addEventListener('keydown', handleKeydown);

    setTimeout(() => {
      closeBtn.focus();
    }, 100);
  }

  function closePanel() {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    if (bubbleTrigger) bubbleTrigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('services-open');

    if (panel._focusTrapHandler) {
      panel.removeEventListener('keydown', panel._focusTrapHandler);
      panel._focusTrapHandler = null;
    }

    if (activeTrigger) {
      activeTrigger.focus();
    }
  }

  // Expose panel control functions globally
  window.openServicesPanel = openPanel;
  window.closeServicesPanel = closePanel;

  if (bubbleTrigger) {
    bubbleTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      openPanel(bubbleTrigger);
    });
  }

  if (drawerTrigger) {
    drawerTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      openPanel(drawerTrigger);
    });
  }

  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closePanel();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closePanel();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closePanel();
    }
  });

  filterButtons.forEach(btn => {
    btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
    btn.addEventListener('click', () => {
      updateFilter(btn.getAttribute('data-filter') || 'all');
    });
  });
}

// ESY TECH Select affiliate recommendations panel interaction setup
function setupSelectPanel() {
  const overlay = document.getElementById('select-panel-overlay');
  const panel = document.getElementById('select-panel');
  const closeBtn = document.getElementById('select-panel-close');
  const bubbleTrigger = document.getElementById('select-bubble-trigger');
  const drawerTrigger = document.querySelector('.drawer-link[href="#select"]');
  const filterButtons = Array.from(document.querySelectorAll('.select-filter-btn'));
  const productCards = Array.from(document.querySelectorAll('.select-product-card'));
  const productLinks = Array.from(document.querySelectorAll('.select-product-link'));

  if (!overlay || !panel || !closeBtn) return;

  let activeTrigger = null;

  function updateFilter(filter) {
    filterButtons.forEach(btn => {
      const isActive = btn.getAttribute('data-filter') === filter;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    productCards.forEach(card => {
      const isVisible = filter === 'all' || card.getAttribute('data-category') === filter;
      card.classList.toggle('is-hidden', !isVisible);
    });
  }

  function openPanel(triggerEl) {
    activeTrigger = triggerEl;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    if (bubbleTrigger) bubbleTrigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('select-open');
    updateFilter('all');

    const focusableElements = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    function handleKeydown(e) {
      if (e.key !== 'Tab' || !firstFocusable || !lastFocusable) return;

      if (e.shiftKey && document.activeElement === firstFocusable) {
        lastFocusable.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        firstFocusable.focus();
        e.preventDefault();
      }
    }

    panel._focusTrapHandler = handleKeydown;
    panel.addEventListener('keydown', handleKeydown);

    setTimeout(() => {
      closeBtn.focus();
    }, 100);
  }

  function closePanel() {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    if (bubbleTrigger) bubbleTrigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('select-open');

    if (panel._focusTrapHandler) {
      panel.removeEventListener('keydown', panel._focusTrapHandler);
      panel._focusTrapHandler = null;
    }

    if (activeTrigger) {
      activeTrigger.focus();
    }
  }

  // Expose close function globally
  window.closeSelectPanel = closePanel;

  if (bubbleTrigger) {
    bubbleTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      openPanel(bubbleTrigger);
    });
  }

  if (drawerTrigger) {
    drawerTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      openPanel(drawerTrigger);
    });
  }

  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closePanel();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closePanel();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closePanel();
    }
  });

  filterButtons.forEach(btn => {
    btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
    btn.addEventListener('click', () => {
      updateFilter(btn.getAttribute('data-filter') || 'all');
    });
  });

  productLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      if (link.getAttribute('aria-disabled') === 'true' || !link.getAttribute('href')) {
        e.preventDefault();
      }
    });
  });
}

// Story chapters controller class
class StoryController {
  constructor() {
    this.container = document.getElementById('scroll-story-layer');
    if (!this.container) return;

    this.chapters = Array.from(this.container.querySelectorAll('.story-chapter')).map(el => {
      const start = parseFloat(el.getAttribute('data-start'));
      const peakStart = parseFloat(el.getAttribute('data-peak-start'));
      const peakEnd = parseFloat(el.getAttribute('data-peak-end'));
      const end = parseFloat(el.getAttribute('data-end'));
      
      // Get internal elements for sub-animations
      const pillars = Array.from(el.querySelectorAll('.story-pillar'));
      const capsuleRows = Array.from(el.querySelectorAll('.story-capsule-row'));
      const processSteps = Array.from(el.querySelectorAll('.story-process-step'));
      const processProgressLine = el.querySelector('.story-process-line-progress');
      
      return {
        element: el,
        start,
        peakStart,
        peakEnd,
        end,
        pillars,
        capsuleRows,
        processSteps,
        processProgressLine
      };
    });
    
    // Check prefers reduced motion
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  update(progress) {
    this.chapters.forEach(c => {
      let opacity = 0;
      let translateY = 28;
      let blur = 8;
      let scale = 0.985;
      let visibility = 'hidden';
      let pointerEvents = 'none';

      // Normalize helper
      const normalize = (val, min, max) => (val - min) / (max - min);

      if (progress >= c.start && progress < c.peakStart) {
        // Entrance Phase
        const local = normalize(progress, c.start, c.peakStart);
        opacity = local;
        translateY = 28 * (1 - local);
        blur = 8 * (1 - local);
        scale = 0.985 + 0.015 * local;
        visibility = 'visible';
      } else if (progress >= c.peakStart && progress <= c.peakEnd) {
        // Stability Phase
        opacity = 1;
        translateY = 0;
        blur = 0;
        scale = 1;
        visibility = 'visible';
        
        // Active pointer events for the final CTA
        if (c.end === 1.00) {
          pointerEvents = 'auto';
        }
      } else if (progress > c.peakEnd && progress <= c.end) {
        // Exit Phase
        const local = normalize(progress, c.peakEnd, c.end);
        opacity = 1 - local;
        translateY = -20 * local;
        blur = 6 * local;
        scale = 1;
        visibility = 'visible';
      }

      // Reduced motion overrides
      if (this.reducedMotion) {
        translateY = 0;
        blur = 0;
        scale = 1;
      }

      // Apply style transitions
      c.element.style.opacity = opacity;
      c.element.style.setProperty('--story-offset-y', `${translateY}px`);
      c.element.style.setProperty('--story-scale', scale);
      c.element.style.filter = `blur(${blur}px)`;
      c.element.style.visibility = visibility;
      c.element.style.pointerEvents = pointerEvents;
      
      // Update ARIA attribute
      if (visibility === 'visible') {
        c.element.removeAttribute('aria-hidden');
      } else {
        c.element.setAttribute('aria-hidden', 'true');
      }

      // Sub-animations when chapter is visible/active
      if (visibility === 'visible') {
        const localChapterProg = normalize(progress, c.start, c.end);

        // CHAPTER 2: Pillar progressives (three disciplines)
        if (c.pillars.length > 0) {
          c.pillars.forEach((p, idx) => {
            // Technology: active from local progress 0.1 to 0.9
            // Intelligence: active from local progress 0.35 to 0.9
            // Creation: active from local progress 0.65 to 0.9
            const triggerPoints = [0.1, 0.35, 0.65];
            const pStart = triggerPoints[idx];
            if (localChapterProg >= pStart) {
              p.style.opacity = '1';
              p.style.transform = 'translateY(0)';
              p.classList.add('active');
            } else {
              p.style.opacity = '0.25';
              p.style.transform = 'translateY(12px)';
              p.classList.remove('active');
            }
          });
        }

        // CHAPTER 3: Capabilities connected (capsules row)
        if (c.capsuleRows.length > 0) {
          c.capsuleRows.forEach((row, idx) => {
            // Row 1: local progress 0.15
            // Row 2: local progress 0.32
            // Row 3: local progress 0.48
            // Row 4: local progress 0.64
            const triggerPoints = [0.15, 0.32, 0.48, 0.64];
            if (localChapterProg >= triggerPoints[idx]) {
              row.style.opacity = '1';
              row.style.transform = 'translateY(0)';
            } else {
              row.style.opacity = '0';
              row.style.transform = 'translateY(12px)';
            }
          });
        }

        // CHAPTER 4: Process steps (Understand, Design, Build, Deploy)
        if (c.processSteps.length > 0) {
          // Normalize locally in the peak stability phase to run step highlights
          const localPeakProg = normalize(progress, c.peakStart, c.peakEnd);
          
          // Steps:
          // Step 1: active 0.0 - 0.25
          // Step 2: active 0.25 - 0.50
          // Step 3: active 0.50 - 0.75
          // Step 4: active 0.75 - 1.0
          const stepIndex = Math.min(3, Math.floor(localPeakProg * 4));
          
          c.processSteps.forEach((step, idx) => {
            if (idx <= stepIndex) {
              step.classList.add('active');
              step.style.opacity = '1';
            } else {
              step.classList.remove('active');
              step.style.opacity = '0.25';
            }
          });

          if (c.processProgressLine) {
            c.processProgressLine.style.width = `${Math.min(100, localPeakProg * 100)}%`;
          }
        }
      }
    });
  }
}

// ==========================================
// Portfolio Panel Implementation
// ==========================================

function setupPortfolioPanel() {
  const overlay = document.getElementById('portfolio-panel-overlay');
  const panel = document.getElementById('portfolio-panel');
  const closeBtn = document.getElementById('portfolio-panel-close');
  const bubbleTrigger = document.getElementById('portfolio-bubble-trigger');
  const drawerTrigger = document.querySelector('.drawer-link[href="#portfolio"]');
  const mockupButtons = Array.from(document.querySelectorAll('.portfolio-mockup-button'));
  const previewOverlay = document.getElementById('portfolio-preview-overlay');
  const previewFrame = document.getElementById('portfolio-preview-frame');
  const previewTitle = document.getElementById('portfolio-preview-title');
  const previewOpenLink = document.getElementById('portfolio-preview-open-link');
  const previewClose = document.getElementById('portfolio-preview-close');

  if (!overlay || !panel || !closeBtn) return;

  let activeTrigger = null;
  let activePreviewTrigger = null;

  function openPanel(triggerEl) {
    activeTrigger = triggerEl;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    if (bubbleTrigger) bubbleTrigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('portfolio-open');

    const focusableElements = panel.querySelectorAll('button, [href], iframe, [tabindex]:not([tabindex="-1"])');
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    function handleKeydown(e) {
      if (e.key !== 'Tab' || !firstFocusable || !lastFocusable) return;

      if (e.shiftKey && document.activeElement === firstFocusable) {
        lastFocusable.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        firstFocusable.focus();
        e.preventDefault();
      }
    }

    panel._focusTrapHandler = handleKeydown;
    panel.addEventListener('keydown', handleKeydown);

    setTimeout(() => {
      closeBtn.focus();
    }, 100);
  }

  function closePanel() {
    closePreview();
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    if (bubbleTrigger) bubbleTrigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('portfolio-open');

    if (panel._focusTrapHandler) {
      panel.removeEventListener('keydown', panel._focusTrapHandler);
      panel._focusTrapHandler = null;
    }

    if (activeTrigger) {
      activeTrigger.focus();
    }
  }

  function openPreview(button) {
    if (!previewOverlay || !previewFrame || !previewClose || !previewTitle || !previewOpenLink) return;

    const previewUrl = button.getAttribute('data-preview-url') || '';
    const projectUrl = button.getAttribute('data-project-url') || previewUrl;
    const projectTitle = button.getAttribute('data-project-title') || 'Project preview';

    activePreviewTrigger = button;
    previewFrame.src = previewUrl;
    previewTitle.textContent = projectTitle;
    previewOpenLink.href = projectUrl;
    previewOverlay.classList.add('active');
    previewOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('portfolio-preview-open');

    setTimeout(() => {
      previewClose.focus();
    }, 100);
  }

  function closePreview() {
    if (!previewOverlay || !previewFrame) return;
    const wasActive = previewOverlay.classList.contains('active');

    previewOverlay.classList.remove('active');
    previewOverlay.setAttribute('aria-hidden', 'true');
    previewFrame.src = '';
    document.body.classList.remove('portfolio-preview-open');

    if (wasActive && activePreviewTrigger) {
      activePreviewTrigger.focus();
    }
  }

  window.openPortfolioPanel = openPanel;
  window.closePortfolioPanel = closePanel;

  if (bubbleTrigger) {
    bubbleTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      openPanel(bubbleTrigger);
    });
  }

  if (drawerTrigger) {
    drawerTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      openPanel(drawerTrigger);
    });
  }

  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closePanel();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closePanel();
    }
  });

  mockupButtons.forEach(button => {
    button.addEventListener('click', () => {
      openPreview(button);
    });
  });

  if (previewClose) {
    previewClose.addEventListener('click', (e) => {
      e.preventDefault();
      closePreview();
    });
  }

  if (previewOverlay) {
    previewOverlay.addEventListener('click', (e) => {
      if (e.target === previewOverlay) {
        closePreview();
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;

    if (previewOverlay && previewOverlay.classList.contains('active')) {
      closePreview();
    } else if (overlay.classList.contains('active')) {
      closePanel();
    }
  });
}

// ==========================================
// Contact Panel Implementation
// ==========================================

function setupBlogPanel() {
  const overlay = document.getElementById('blog-panel-overlay');
  const panel = document.getElementById('blog-panel');
  const closeBtn = document.getElementById('blog-panel-close');
  const bubbleTrigger = document.getElementById('blog-bubble-trigger');
  const drawerTrigger = document.querySelector('.drawer-link[href="#blog"]');
  const featuredEl = document.getElementById('blog-featured');
  const gridEl = document.getElementById('blog-card-grid');
  const filtersEl = document.getElementById('blog-panel-filters');
  const searchEl = document.getElementById('blog-panel-search');
  const clearBtn = document.getElementById('blog-panel-clear');
  const emptyEl = document.getElementById('blog-empty-state');

  if (!overlay || !panel || !closeBtn) return;

  let activeTrigger = null;
  let blogData = null;
  let activeCategory = 'All';

  function openPanel(triggerEl) {
    activeTrigger = triggerEl;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    if (bubbleTrigger) bubbleTrigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('blog-open');
    loadBlogData();

    const focusableElements = panel.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    function handleKeydown(e) {
      if (e.key !== 'Tab' || !firstFocusable || !lastFocusable) return;
      if (e.shiftKey && document.activeElement === firstFocusable) {
        lastFocusable.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === lastFocusable) {
        firstFocusable.focus();
        e.preventDefault();
      }
    }

    panel._focusTrapHandler = handleKeydown;
    panel.addEventListener('keydown', handleKeydown);
    setTimeout(() => closeBtn.focus(), 100);
  }

  function closePanel() {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    if (bubbleTrigger) bubbleTrigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('blog-open');

    if (panel._focusTrapHandler) {
      panel.removeEventListener('keydown', panel._focusTrapHandler);
      panel._focusTrapHandler = null;
    }

    if (activeTrigger) activeTrigger.focus();
  }

  async function loadBlogData() {
    if (blogData) {
      renderBlog();
      return;
    }

    if (gridEl) gridEl.innerHTML = '<p class="blog-empty-state">Loading articles...</p>';
    try {
      const response = await fetch('data/blog-index.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Blog index not available');
      blogData = await response.json();
      renderBlog();
    } catch (error) {
      if (gridEl) gridEl.innerHTML = '<p class="blog-empty-state">Blog articles are temporarily unavailable.</p>';
    }
  }

  function renderBlog() {
    if (!blogData || !gridEl || !filtersEl) return;
    const categories = blogData.categories || ['All'];
    filtersEl.innerHTML = categories.map(category => `<button class="blog-panel-filter${category === activeCategory ? ' active' : ''}" type="button" data-category="${escapeAttr(category)}">${escapeHtml(category)}</button>`).join('');
    filtersEl.querySelectorAll('.blog-panel-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.category || 'All';
        renderBlog();
      });
    });

    const articles = blogData.articles || [];
    const featured = articles.find(article => article.featured) || articles[0];
    if (featuredEl) {
      featuredEl.innerHTML = featured ? `<article class="blog-featured-card">
        <img src="${featured.cover}" alt="${escapeAttr(featured.coverAlt)}" loading="lazy">
        <div class="blog-featured-copy"><span class="blog-micro-label">FEATURED ARTICLE</span><h3>${escapeHtml(featured.title)}</h3><p>${escapeHtml(featured.description)}</p><a class="blog-card-link" href="${featured.url}">Read article</a></div>
      </article>` : '';
    }

    applyBlogFilters();
  }

  function applyBlogFilters() {
    if (!blogData || !gridEl) return;
    const query = (searchEl && searchEl.value ? searchEl.value : '').trim().toLowerCase();
    const articles = (blogData.articles || []).filter(article => {
      const text = [article.title, article.description, article.category, ...(article.tags || [])].join(' ').toLowerCase();
      const categoryOk = activeCategory === 'All' || article.category === activeCategory;
      const searchOk = !query || text.includes(query);
      return categoryOk && searchOk;
    });

    gridEl.innerHTML = articles.map(article => {
      const updated = article.updatedAt !== article.publishedAt;
      return `<article class="blog-card">
        <a class="blog-card-media" href="${article.url}"><img src="${article.cover}" alt="${escapeAttr(article.coverAlt)}" loading="lazy"></a>
        <div class="blog-card-copy">
          <span class="blog-card-category">${escapeHtml(article.category)}</span>
          <div class="blog-card-badges">${article.featured ? '<span>Featured</span>' : ''}${updated ? '<span>Updated</span>' : ''}</div>
          <h3>${escapeHtml(article.title)}</h3>
          <p>${escapeHtml(article.description)}</p>
          <div class="blog-card-meta">${formatBlogDate(article.publishedAt)} · ${escapeHtml(article.readingTime)}</div>
          <a class="blog-card-link" href="${article.url}">Read article</a>
        </div>
      </article>`;
    }).join('');

    if (emptyEl) emptyEl.hidden = articles.length !== 0;
  }

  window.openBlogPanel = openPanel;
  window.closeBlogPanel = closePanel;

  if (bubbleTrigger) {
    bubbleTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      openPanel(bubbleTrigger);
    });
  }

  if (drawerTrigger) {
    drawerTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      openPanel(drawerTrigger);
    });
  }

  if (searchEl) searchEl.addEventListener('input', applyBlogFilters);
  if (clearBtn && searchEl) {
    clearBtn.addEventListener('click', () => {
      searchEl.value = '';
      searchEl.focus();
      applyBlogFilters();
    });
  }

  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closePanel();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePanel();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closePanel();
  });
}

function handleInitialPanelRequest() {
  const panel = new URLSearchParams(window.location.search).get('panel');
  if (!panel) return;
  const trigger = document.body;
  setTimeout(() => {
    if (panel === 'contact' && window.openContactPanel) window.openContactPanel(trigger);
    if (panel === 'services' && window.openServicesPanel) window.openServicesPanel(trigger);
    if (panel === 'blog' && window.openBlogPanel) window.openBlogPanel(trigger);
  }, 250);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function formatBlogDate(date) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T00:00:00Z`));
}

function setupContactPanel() {
  const overlay = document.getElementById('contact-panel-overlay');
  const panel = document.getElementById('contact-panel');
  const closeBtn = document.getElementById('contact-panel-close');
  const bubbleTrigger = document.getElementById('contact-bubble-trigger');
  const drawerTrigger = document.querySelector('.drawer-link[href="#contact"]');
  const form = document.getElementById('contact-project-form');

  if (!overlay || !panel || !closeBtn) return;

  let activeTrigger = null;

  function openPanel(triggerEl) {
    activeTrigger = triggerEl;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    if (bubbleTrigger) bubbleTrigger.setAttribute('aria-expanded', 'true');
    
    document.body.classList.add('contact-open');
    
    // Trap focus inside modal
    const focusableElements = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    function handleKeydown(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstFocusable) {
            lastFocusable.focus();
            e.preventDefault();
          }
        } else { // Tab
          if (document.activeElement === lastFocusable) {
            firstFocusable.focus();
            e.preventDefault();
          }
        }
      }
    }

    panel._focusTrapHandler = handleKeydown;
    panel.addEventListener('keydown', handleKeydown);

    // Focus close button initially
    setTimeout(() => {
      closeBtn.focus();
    }, 100);
  }

  function closePanel() {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    if (bubbleTrigger) bubbleTrigger.setAttribute('aria-expanded', 'false');
    
    document.body.classList.remove('contact-open');

    if (panel._focusTrapHandler) {
      panel.removeEventListener('keydown', panel._focusTrapHandler);
      panel._focusTrapHandler = null;
    }

    if (activeTrigger) {
      activeTrigger.focus();
    }
  }

  // Expose panel control functions globally
  window.openContactPanel = openPanel;
  window.closeContactPanel = closePanel;

  // Event listener for Contact bubble click
  if (bubbleTrigger) {
    bubbleTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPanel(bubbleTrigger);
    });
  }

  // Event listener for Mobile Drawer link click
  if (drawerTrigger) {
    drawerTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPanel(drawerTrigger);
    });
  }

  // Close X button click
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    closePanel();
  });

  // Close when clicking outside on overlay
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closePanel();
    }
  });

  // Close on Escape key press
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closePanel();
    }
  });

  // Form validation and submission
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const nameField = document.getElementById('contact-name');
      const emailField = document.getElementById('contact-email');
      const companyField = document.getElementById('contact-company');
      const projectTypeField = document.getElementById('contact-project-type');
      const budgetField = document.getElementById('contact-budget');
      const messageField = document.getElementById('contact-message');

      let hasError = false;

      // Reset inline errors
      const groups = form.querySelectorAll('.form-group');
      groups.forEach(g => {
        g.classList.remove('has-error');
        const errMsg = g.querySelector('.error-message');
        if (errMsg) errMsg.textContent = '';
      });

      // Helper to set error
      function setError(field, message) {
        const group = field.closest('.form-group');
        if (group) {
          group.classList.add('has-error');
          const errMsg = group.querySelector('.error-message');
          if (errMsg) errMsg.textContent = message;
          field.setAttribute('aria-invalid', 'true');
        }
        hasError = true;
      }

      // Validate Name
      if (!nameField.value.trim()) {
        setError(nameField, 'Please enter your name.');
      } else {
        nameField.setAttribute('aria-invalid', 'false');
      }

      // Validate Email
      const emailVal = emailField.value.trim();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailVal) {
        setError(emailField, 'Please enter a valid email address.');
      } else if (!emailPattern.test(emailVal)) {
        setError(emailField, 'Please enter a valid email address.');
      } else {
        emailField.setAttribute('aria-invalid', 'false');
      }

      // Validate Project Type
      if (!projectTypeField.value) {
        setError(projectTypeField, 'Please select a project type.');
      } else {
        projectTypeField.setAttribute('aria-invalid', 'false');
      }

      // Validate Message
      if (!messageField.value.trim()) {
        setError(messageField, 'Please tell us briefly about your project.');
      } else {
        messageField.setAttribute('aria-invalid', 'false');
      }

      if (hasError) {
        // Focus first field with error
        const firstErrGroup = form.querySelector('.form-group.has-error');
        if (firstErrGroup) {
          const firstErrField = firstErrGroup.querySelector('input, select, textarea');
          if (firstErrField) firstErrField.focus();
        }
        return;
      }

      // Build and encode WhatsApp message
      const name = nameField.value.trim();
      const email = emailField.value.trim();
      const company = companyField.value.trim();
      const projectType = projectTypeField.value;
      const budget = budgetField.value;
      const message = messageField.value.trim();

      let wpText = `Hello ESY TECH CREATIVE,\n\nI would like to discuss a new project.\n\nName: ${name}\nEmail: ${email}`;
      
      if (company) {
        wpText += `\nCompany: ${company}`;
      }
      
      wpText += `\nProject type: ${projectType}`;
      
      if (budget) {
        wpText += `\nEstimated budget: ${budget}`;
      }
      
      wpText += `\n\nProject details:\n${message}`;

      const encodedMsg = encodeURIComponent(wpText);
      const wpUrl = `https://wa.me/${CONTACT_WHATSAPP_NUMBER}?text=${encodedMsg}`;

      // Open WhatsApp in new tab
      window.open(wpUrl, '_blank', 'noopener,noreferrer');
    });
  }
}

// ==========================================
// Connect all CTAs to Panels
// ==========================================

function connectAllCTAs() {
  // 1. Connect all "Start a project" CTA triggers
  const startProjectCTAs = [
    document.querySelector('.hero-cta a[href="#projects"]'), // Hero CTA
    document.querySelector('.story-cta-buttons a[href="#contact"]'), // Final scroll CTA
    document.querySelector('button[data-contact-action="start-project"]'), // Services final CTA
    document.querySelector('button[data-contact-action="talk"]'), // Services Talk CTA
    document.querySelector('button[data-contact-action="suggest-product"]') // Select Suggest CTA
  ];

  startProjectCTAs.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Close other panels if open
        if (window.closeAboutPanel) window.closeAboutPanel();
        if (window.closeServicesPanel) window.closeServicesPanel();
        if (window.closeSelectPanel) window.closeSelectPanel();
        
        if (window.openContactPanel) {
          window.openContactPanel(btn);
        }
      });
    }
  });

  // 2. Connect all "Explore our services" CTA triggers
  const exploreServicesCTAs = [
    document.querySelector('.hero-cta a[href="#services"]'), // Hero primary CTA
    document.querySelector('.story-cta-buttons a[href="#services"]') // Final scroll Services CTA
  ];

  exploreServicesCTAs.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Close other panels if open
        if (window.closeAboutPanel) window.closeAboutPanel();
        if (window.closeContactPanel) window.closeContactPanel();
        if (window.closeSelectPanel) window.closeSelectPanel();
        
        if (window.openServicesPanel) {
          window.openServicesPanel(btn);
        }
      });
    }
  });
}
