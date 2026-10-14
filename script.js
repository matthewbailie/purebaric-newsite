// Mark the current nav link as active.
(function highlightActiveNavLink() {
  const path = window.location.pathname.replace(/\/$/, '').toLowerCase() || '/';
  document.querySelectorAll('.nav-links a').forEach((a) => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    if (href === path) {
      a.classList.add('is-active');
      a.setAttribute('aria-current', 'page');
    }
  });
})();

// Netlify Identity tokens (invite / recovery / confirmation) arrive in the URL hash.
// They're only useful on /admin where the Identity widget is loaded, so bounce there.
(function bounceIdentityTokensToAdmin() {
  const hash = window.location.hash || '';
  const isToken = /^#(invite_token|recovery_token|confirmation_token|email_change_token)=/.test(hash);
  const onAdmin = /\/admin(\.html)?$/.test(window.location.pathname);
  if (isToken && !onAdmin) {
    window.location.replace('/admin' + hash);
  }
})();

// Hero image → carousel lightbox
const heroImage = document.getElementById('heroImage');
const lightbox = document.getElementById('heroLightbox');
if (heroImage && lightbox) {
  const track = document.getElementById('lightboxTrack');
  const counter = document.getElementById('lightboxCounter');
  const slides = track.querySelectorAll('.lightbox-slide');
  let currentIndex = 0;

  function updateCounter() {
    const slideWidth = track.clientWidth;
    currentIndex = Math.round(track.scrollLeft / slideWidth);
    if (counter) counter.textContent = `${currentIndex + 1} / ${slides.length}`;
  }
  function openLightbox() {
    lightbox.hidden = false;
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    track.scrollLeft = 0;
    currentIndex = 0;
    updateCounter();
    document.getElementById('lightboxClose').focus();
  }
  function closeLightbox() {
    lightbox.hidden = true;
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    heroImage.focus();
  }
  function goToSlide(index) {
    const clamped = Math.max(0, Math.min(slides.length - 1, index));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' });
  }

  heroImage.addEventListener('click', openLightbox);
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightboxPrev').addEventListener('click', () => goToSlide(currentIndex - 1));
  document.getElementById('lightboxNext').addEventListener('click', () => goToSlide(currentIndex + 1));
  track.addEventListener('scroll', () => {
    clearTimeout(track._scrollTimer);
    track._scrollTimer = setTimeout(updateCounter, 60);
  });
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') goToSlide(currentIndex - 1);
    else if (e.key === 'ArrowRight') goToSlide(currentIndex + 1);
  });
}

// Analytics helper, safe no-op if gtag isn't loaded (e.g. local preview, ad-blockers)
function track(event, params) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', event, params || {});
    }
  } catch (_) { /* never let analytics break the page */ }
}

// Mobile nav toggle
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
if (toggle && links) {
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = links.classList.toggle('active');
    toggle.classList.toggle('active', isOpen);
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
  
  // Close menu when a link is clicked (so navigating works on mobile)
  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      links.classList.remove('active');
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Close menu when clicking outside of it
  document.addEventListener('click', (e) => {
    if (links.classList.contains('active') && !links.contains(e.target) && !toggle.contains(e.target)) {
      links.classList.remove('active');
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// Form logic (AJAX submission intercept)
// Since you're moving off Netlify, you might need to adapt this to hit your Laravel endpoints.
// For now, I'm keeping the form intercept largely the same but removing explicit Netlify checks
// to allow your custom backend to handle it.
async function submitAjaxForm(form, endpoint) {
  const btn = form.querySelector('button[type="submit"]');
  const originalText = btn ? btn.textContent : '';
  const originalBg = btn ? btn.style.background : '';
  if (btn) {
    btn.textContent = 'Sending…';
    btn.disabled = true;
  }
  try {
    const formData = new FormData(form);
    const resp = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    if (!resp.ok) throw new Error('Form returned ' + resp.status);
    if (btn) {
      btn.textContent = 'Sent ✓, we\'ll be in touch';
      btn.style.background = 'var(--moss-deep)';
    }
    const formName = form.getAttribute('name') || form.id || 'unknown';
    if (formName === 'contact') {
      const topic = (new FormData(form).get('topic') || '').toString();
      track('contact_submit', { topic });
    } else {
      track('form_submit', { form_name: formName });
    }
    setTimeout(() => {
      if (btn) {
        btn.textContent = originalText;
        btn.style.background = originalBg;
        btn.disabled = false;
      }
      form.reset();
    }, 4000);
  } catch (err) {
    console.error('Form submission failed:', err);
    if (btn) {
      btn.textContent = 'Send failed, please email hello@purebaric.com';
      btn.style.background = '';
      btn.disabled = false;
    }
  }
}

// Optional: Wire up forms with an action attribute pointing to your new Laravel endpoints
document.querySelectorAll('form').forEach(form => {
  if (['zipCheckForm', 'waitlistForm'].includes(form.id)) return;
  // Let default submit happen unless it has an action we specifically want to intercept
  // If you want standard page reloads, you can remove this block.
});

// Scroll-reveal for gallery items
if ('IntersectionObserver' in window) {
  const revealTargets = document.querySelectorAll('.gallery-item, .reveal-on-scroll');
  if (revealTargets.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    revealTargets.forEach((el) => observer.observe(el));
  }
} else {
  document.querySelectorAll('.gallery-item, .reveal-on-scroll').forEach((el) => {
    el.classList.add('is-visible');
  });
}

// ZIP code availability checker
const ZIP_TIER_1 = /^(840[0-9]{2}|841[0-9]{2}|843[0-9]{2}|844[0-9]{2})$/; // SLC, Provo, Park City, Ogden core
const ZIP_TIER_2 = /^(842[0-9]{2}|846[0-9]{2}|845[0-9]{2})$/; // broader Northern Utah
const ZIP_UTAH = /^847[0-9]{2}$/; // Southern Utah (St. George area)

const zipForm = document.getElementById('zipCheckForm');
if (zipForm) {
  zipForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('zipInput');
    const result = document.getElementById('zipResult');
    const zip = (input.value || '').trim();

    result.className = 'zip-result';

    if (!/^\d{5}$/.test(zip)) {
      result.textContent = 'Please enter a 5-digit ZIP code.';
      result.classList.add('zip-no');
      return;
    }

    let zipTier = 'outside';
    if (ZIP_TIER_1.test(zip)) {
      result.innerHTML = '✓ We deliver to ' + zip + '. <a href="/book" style="color:inherit;text-decoration:underline;">Reserve a chamber →</a>';
      result.classList.add('zip-yes');
      zipTier = 'tier1';
    } else if (ZIP_TIER_2.test(zip)) {
      result.innerHTML = '✓ ' + zip + ' is in our extended delivery area. <a href="/book" style="color:inherit;text-decoration:underline;">Reserve a chamber →</a>';
      result.classList.add('zip-yes');
      zipTier = 'tier2';
    } else if (ZIP_UTAH.test(zip)) {
      result.innerHTML = 'We may be able to deliver to ' + zip + ', please <a href="/contact?topic=service-area" style="color:inherit;text-decoration:underline;">contact us</a> for a quote.';
      result.classList.add('zip-maybe');
      zipTier = 'tier3-quote';
    } else if (/^8[34]\d{3}$/.test(zip)) {
      result.innerHTML = zip + ' is outside our regular delivery area. <a href="/contact?topic=service-area" style="color:inherit;text-decoration:underline;">Get in touch</a>we may still be able to help.';
      result.classList.add('zip-maybe');
      zipTier = 'utah-outside-area';
    } else {
      result.innerHTML = "We currently serve Utah only. Want to know when we expand? <a href=\"/waitlist?reason=out-of-area\" style=\"color:inherit;text-decoration:underline;\">Join the out-of-area list →</a>";
      result.classList.add('zip-no');
    }
    // Privacy: send only the categorical result, never the ZIP itself.
    var saResult = (zipTier === 'tier1' || zipTier === 'tier2') ? 'eligible' : 'unsupported';
    track('service_area_check', { result: saResult });
  });
}

// Contact form: pre-fill subject/message from URL query string ?topic=
(function prefillContactFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const topic = params.get('topic');
  if (!topic) return;

  const subjectSelect = document.querySelector('#contactForm select');
  const messageTextarea = document.querySelector('#contactForm textarea');
  if (!subjectSelect && !messageTextarea) return;

  const TOPIC_MAP = {
    'post-surgery':   { subject: 'Question about a rental', message: "I'm interested in renting a chamber for post-surgical recovery. Here's a bit about my situation:\n\n" },
    'athletic':       { subject: 'Question about a rental', message: "I'm interested in renting a chamber for athletic recovery and performance. Here's a bit about my goals:\n\n" },
    'inflammation':   { subject: 'Medical / contraindication question', message: "I'm exploring mHBOT for chronic inflammation. Before booking, I have a few questions:\n\n" },
    'cognitive':      { subject: 'Question about a rental', message: "I'm interested in renting a chamber to support sleep, focus, and cognitive recovery. A few questions:\n\n" },
    'wellness':       { subject: 'Question about a rental', message: "I'm interested in renting a chamber for general wellness and longevity. A few questions:\n\n" },
    'hsa':            { subject: 'Other', message: "Could you send me the Letter of Medical Necessity (LMN) template so I can take it to my physician for HSA/FSA reimbursement?" },
    'service-area':   { subject: 'Service area inquiry', message: "I'd like to find out whether you deliver to my area. My ZIP code is:\n\n" },
    'practitioner':   { subject: 'Practitioner referral program', message: "I'm a practitioner interested in your referral partner program.\n\nClinic name:\nPractice type (chiropractic, naturopathic, functional medicine, PT, orthopedic, concussion specialty, sports medicine, etc.):\nCity / service area:\n\nA bit about my practice and patient base:\n\n" },
  };

  const entry = TOPIC_MAP[topic];
  if (!entry) return;

  if (subjectSelect && entry.subject) {
    for (const option of subjectSelect.options) {
      if (option.text.trim() === entry.subject) {
        subjectSelect.value = option.value;
        break;
      }
    }
  }
  if (messageTextarea && entry.message) {
    messageTextarea.value = entry.message;
    messageTextarea.focus();
    // Position cursor at end
    const len = messageTextarea.value.length;
    messageTextarea.setSelectionRange(len, len);
  }
})();


// Live "yes" notice on step 2 safety questions
const safetyYesNotice = document.getElementById('safety-yes-notice');
if (safetyYesNotice) {
  const safetyRadios = document.querySelectorAll('input[type="radio"][name^="safety-"]');
  const updateSafetyNotice = () => {
    const anyYes = Array.from(safetyRadios).some(r => r.checked && r.value === 'yes');
    safetyYesNotice.style.display = anyYes ? 'block' : 'none';
  };
  safetyRadios.forEach(r => r.addEventListener('change', updateSafetyNotice));
}

// Sticky mobile CTA, reveal after user scrolls past hero
const mobileBar = document.getElementById('mobileCtaBar');
if (mobileBar) {
  const onScroll = () => {
    if (window.scrollY > 480) mobileBar.classList.add('is-visible');
    else mobileBar.classList.remove('is-visible');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}


// Booking availability check
const bookingFlow = document.getElementById('booking-flow');
const bookingUnavailable = document.getElementById('booking-unavailable');
if (bookingFlow && bookingUnavailable) {
  fetch('/api/availability')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data) return;
      if (data.available === 0 && data.total > 0) {
        bookingFlow.style.display = 'none';
        bookingUnavailable.style.display = 'block';
        const detail = document.getElementById('booking-unavailable-detail');
        if (detail) {
          detail.textContent = `All ${data.total} chambers are out on rental right now. Join the waitlist, we'll notify you the moment a chamber opens up. Holds are first-come, first-served.`;
        }
      }
    })
    .catch(() => { /* fail open: keep the booking form visible */ });
}
