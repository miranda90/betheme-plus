/**
 * GSAP Animations runtime.
 */
(function () {
  'use strict';

  function waitForGSAP(callback, maxAttempts, attempt) {
    var limit = typeof maxAttempts === 'number' ? maxAttempts : 50;
    var currentAttempt = typeof attempt === 'number' ? attempt : 0;

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      callback();
      return;
    }

    if (currentAttempt < limit) {
      setTimeout(function () {
        waitForGSAP(callback, limit, currentAttempt + 1);
      }, 100);
    }
  }

  function hideTextAnimationElements() {
    var textAnimations = ['splitText', 'animateLetters', 'animateWords', 'animateLines'];
    textAnimations.forEach(function (animationType) {
      var selector = '.gsap-animate[data-animation-type="' + animationType + '"]';
      document.querySelectorAll(selector).forEach(function (element) {
        if (!element.dataset.gsapProcessed) {
          element.style.visibility = 'hidden';
        }
      });
    });
  }

  function initAnimations() {
    gsap.registerPlugin(ScrollTrigger);

    if (typeof ScrollSmoother !== 'undefined') {
      gsap.registerPlugin(ScrollSmoother);
    }

    var cfg = {
      offset: 80,
      defaultDuration: 1,
      defaultEase: 'power2.out',
      animationClass: 'gsap-animate',
      scrollLinkedClass: 'gsap-scroll-linked'
    };

    var animationTypes = {
      fadeInUp: function (timeline, element, options) {
        gsap.set(element, { opacity: 0, y: 50 });
        timeline.to(element, { opacity: 1, y: 0, duration: options.duration, delay: options.delay, ease: options.ease });
      },
      fadeIn: function (timeline, element, options) {
        gsap.set(element, { opacity: 0 });
        timeline.to(element, { opacity: 1, duration: options.duration, delay: options.delay, ease: options.ease });
      },
      fadeInLeft: function (timeline, element, options) {
        gsap.set(element, { opacity: 0, x: -50 });
        timeline.to(element, { opacity: 1, x: 0, duration: options.duration, delay: options.delay, ease: options.ease });
      },
      fadeInRight: function (timeline, element, options) {
        gsap.set(element, { opacity: 0, x: 50 });
        timeline.to(element, { opacity: 1, x: 0, duration: options.duration, delay: options.delay, ease: options.ease });
      },
      scaleIn: function (timeline, element, options) {
        gsap.set(element, { opacity: 0, scale: 0.8 });
        timeline.to(element, { opacity: 1, scale: 1, duration: options.duration, delay: options.delay, ease: options.ease });
      },
      splitText: function (timeline, element, options) {
        element.dataset.gsapProcessed = 'true';
        var words = element.textContent.split(/(\s+)/);
        element.innerHTML = '';
        var spans = [];

        words.forEach(function (word) {
          if (word.trim() === '') {
            element.appendChild(document.createTextNode(word));
            return;
          }

          var span = document.createElement('span');
          span.textContent = word;
          span.style.display = 'inline-block';
          element.appendChild(span);
          spans.push(span);
        });

        gsap.set(element, { visibility: 'visible' });
        gsap.set(spans, { opacity: 0, y: 50 });
        timeline.to(spans, {
          opacity: 1,
          y: 0,
          duration: options.duration || 0.8,
          delay: options.delay || 0,
          stagger: parseFloat(element.dataset.stagger || '0.05'),
          ease: options.ease
        });
      },
      animateLetters: function (timeline, element, options) {
        element.dataset.gsapProcessed = 'true';
        var chars = element.textContent.split('');
        element.innerHTML = '';
        var spans = [];

        chars.forEach(function (char) {
          if (char === ' ') {
            element.appendChild(document.createTextNode(' '));
            return;
          }

          var span = document.createElement('span');
          span.textContent = char;
          span.style.display = 'inline-block';
          element.appendChild(span);
          spans.push(span);
        });

        gsap.set(element, { visibility: 'visible' });
        gsap.set(spans, { opacity: 0, y: 50 });
        timeline.to(spans, {
          opacity: 1,
          y: 0,
          duration: options.duration || 0.8,
          delay: options.delay || 0,
          stagger: parseFloat(element.dataset.stagger || '0.03'),
          ease: options.ease
        });
      }
    };

    var scrollLinkedTypes = {
      progress: function (timeline, element) {
        timeline.fromTo(element, { opacity: 0, y: 100 }, { opacity: 1, y: 0 });
      },
      parallaxY: function (timeline, element) {
        var distance = parseInt(element.dataset.parallaxDistance || '100', 10);
        timeline.fromTo(element, { y: -distance }, { y: distance });
      },
      rotate: function (timeline, element) {
        var rotation = parseInt(element.dataset.rotation || '360', 10);
        timeline.fromTo(element, { rotation: 0 }, { rotation: rotation });
      }
    };

    var manager = {
      smoother: null,
      init: function () {
        this.initSmoother();
        this.initScrollTriggered();
        this.initScrollLinked();
      },
      initSmoother: function () {
        var enabled = typeof gsapAnimationsConfig !== 'undefined' && (gsapAnimationsConfig.scrollSmoother === 1 || gsapAnimationsConfig.scrollSmoother === '1');
        if (!enabled || typeof ScrollSmoother === 'undefined') {
          return;
        }

        try {
          this.smoother = ScrollSmoother.create({
            wrapper: '#Wrapper',
            content: '#Content',
            smooth: 1,
            effects: true,
            smoothTouch: 0.1
          });
        } catch (error) {
          window.console.warn('ScrollSmoother init error', error);
        }
      },
      initScrollTriggered: function () {
        document.querySelectorAll('.' + cfg.animationClass).forEach(function (element, index) {
          var animationType = element.dataset.animationType || 'fadeInUp';
          var duration = parseFloat(element.dataset.duration || cfg.defaultDuration);
          var delay = parseFloat(element.dataset.delay || 0);
          var offset = parseInt(element.dataset.offset || cfg.offset, 10);
          var ease = element.dataset.ease || cfg.defaultEase;
          var once = element.dataset.once !== 'false';
          var animationFn = animationTypes[animationType];

          if (!animationFn) {
            return;
          }

          var timeline = gsap.timeline({
            scrollTrigger: {
              trigger: element,
              start: 'top ' + offset + '%',
              end: 'bottom top',
              toggleActions: once ? 'play none none none' : 'play none reverse none',
              id: 'base-bgsap-' + index,
              invalidateOnRefresh: true
            }
          });

          animationFn(timeline, element, { duration: duration, delay: delay, ease: ease });
        });
      },
      initScrollLinked: function () {
        document.querySelectorAll('.' + cfg.scrollLinkedClass).forEach(function (element, index) {
          var animationType = element.dataset.scrollAnimation || 'progress';
          var startOffset = parseInt(element.dataset.startOffset || '0', 10);
          var endOffset = parseInt(element.dataset.endOffset || '100', 10);
          var pin = element.dataset.pin === 'true';
          var pinSpacing = element.dataset.pinSpacing !== 'false';
          var animationFn = scrollLinkedTypes[animationType];

          if (!animationFn) {
            return;
          }

          var timeline = gsap.timeline({
            scrollTrigger: {
              trigger: element,
              start: 'top ' + startOffset + '%',
              end: 'top ' + endOffset + '%',
              scrub: true,
              pin: pin ? element : false,
              pinSpacing: pinSpacing,
              id: 'base-bgsap-linked-' + index
            }
          });

          animationFn(timeline, element);
        });
      }
    };

    manager.init();
    ScrollTrigger.refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideTextAnimationElements);
  } else {
    hideTextAnimationElements();
  }

  waitForGSAP(initAnimations);
})();
