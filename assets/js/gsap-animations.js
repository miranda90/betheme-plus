
(function () {
  'use strict';

  const config = {
    animationClass: 'gsap-animate'
  };

  function hideTextAnimationElements() {
    const textAnimations = ['splitText', 'animateLetters', 'animateWords', 'animateLines'];
    textAnimations.forEach(function (animationType) {
      const elements = document.querySelectorAll('.' + config.animationClass + '[data-animation-type="' + animationType + '"]');
      elements.forEach(function (element) {
        if (!element.dataset.gsapProcessed) {
          element.style.visibility = 'hidden';
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideTextAnimationElements);
  } else {
    hideTextAnimationElements();
  }

  function waitForGSAP(callback, maxAttempts = 50, attempt = 0) {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      callback();
    } else if (attempt < maxAttempts) {
      setTimeout(function () {
        waitForGSAP(callback, maxAttempts, attempt + 1);
      }, 100);
    }
  }

  function waitForScrollSmoother(callback, maxAttempts = 50, attempt = 0) {
    if (typeof ScrollSmoother !== 'undefined') {
      callback();
    } else if (attempt < maxAttempts) {
      setTimeout(function () {
        waitForScrollSmoother(callback, maxAttempts, attempt + 1);
      }, 100);
    }
  }

  function getSplitTargetElement(element) {
    const semanticTextSelector = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,span,strong,em,a';
    const semanticTextElement = element.querySelector(semanticTextSelector);
    return semanticTextElement || element;
  }

  function parseTimeToSeconds(value, fallback) {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (trimmed.endsWith('ms')) {
        const ms = parseFloat(trimmed.replace('ms', ''));
        return Number.isNaN(ms) ? fallback : ms / 1000;
      }

      if (trimmed.endsWith('s')) {
        const sec = parseFloat(trimmed.replace('s', ''));
        return Number.isNaN(sec) ? fallback : sec;
      }

      const raw = parseFloat(trimmed);
      if (Number.isNaN(raw)) {
        return fallback;
      }

      return raw > 20 ? raw / 1000 : raw;
    }

    if (typeof value === 'number') {
      return value > 20 ? value / 1000 : value;
    }

    return fallback;
  }

  function resolveStaggerValue(targetElement) {
    if (!targetElement) {
      return 0.05;
    }

    const localStagger = parseFloat(targetElement.dataset.stagger || '');
    if (!Number.isNaN(localStagger)) {
      return localStagger;
    }

    const parentWithStagger = targetElement.closest('[data-stagger]');
    if (parentWithStagger) {
      const parentStagger = parseFloat(parentWithStagger.dataset.stagger || '');
      if (!Number.isNaN(parentStagger)) {
        return parentStagger;
      }
    }

    return 0.05;
  }

  function splitByRenderedLines(targetElement) {
    const originalText = targetElement.textContent || '';
    const words = originalText.trim().split(/\s+/).filter(Boolean);

    if (!words.length) {
      return [];
    }

    const measureSpans = [];
    targetElement.innerHTML = '';

    words.forEach(function (word, index) {
      const span = document.createElement('span');
      span.textContent = word;
      span.style.display = 'inline-block';
      targetElement.appendChild(span);
      measureSpans.push(span);

      if (index < words.length - 1) {
        targetElement.appendChild(document.createTextNode(' '));
      }
    });

    const lines = [];
    let currentLine = [];
    let currentTop = null;

    measureSpans.forEach(function (span) {
      const top = span.offsetTop;
      if (currentTop === null) {
        currentTop = top;
      }

      if (top !== currentTop) {
        lines.push(currentLine);
        currentLine = [];
        currentTop = top;
      }

      currentLine.push(span.textContent || '');
    });

    if (currentLine.length) {
      lines.push(currentLine);
    }

    targetElement.innerHTML = '';

    const lineElements = [];
    lines.forEach(function (lineWords) {
      const lineDiv = document.createElement('div');
      lineDiv.style.display = 'block';
      lineDiv.textContent = lineWords.join(' ');
      targetElement.appendChild(lineDiv);
      lineElements.push(lineDiv);
    });

    return lineElements;
  }

  waitForGSAP(function () {
    initAnimations();
  });

  function initAnimations() {
    gsap.registerPlugin(ScrollTrigger);

    if (typeof ScrollSmoother !== 'undefined') {
      gsap.registerPlugin(ScrollSmoother);
    }

    if (typeof SplitText !== 'undefined') {
      gsap.registerPlugin(SplitText);
    }

    const config = {
      offset: 80,
      defaultDuration: 1,
      defaultEase: 'power2.out',
      animationClass: 'gsap-animate',
      scrollLinkedClass: 'gsap-scroll-linked'
    };

    const AnimationManager = {
      animations: [],
      scrollLinkedAnimations: [],
      smoother: null,

      init: function () {
        this.initScrollSmoother();
        this.initScrollTriggered();
        this.initScrollLinked();
        this.refreshOnResize();
      },

      initScrollSmoother: function () {
        const scrollSmootherEnabled = (typeof gsapAnimationsConfig !== 'undefined' &&
          (gsapAnimationsConfig.scrollSmoother === '1' || gsapAnimationsConfig.scrollSmoother === 1));

        if (!scrollSmootherEnabled || typeof ScrollSmoother === 'undefined') {
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

          this.initScrollSmootherEffects();
        } catch (e) {
          console.warn('Error al inicializar ScrollSmoother:', e);
        }
      },

      initScrollSmootherEffects: function () {
        if (!this.smoother) {
          return;
        }

        setTimeout(function () {
          const smootherElements = document.querySelectorAll('[data-speed][data-lag]');
          smootherElements.forEach(function (element) {
            const speed = parseFloat(element.getAttribute('data-speed')) || 1;
            const lag = parseFloat(element.getAttribute('data-lag')) || 0;

            element.style.transition = 'none';
            element.style.setProperty('transition', 'none', 'important');
            gsap.set(element, { willChange: 'transform' });

            AnimationManager.smoother.effects(element, { speed: speed, lag: lag });
          });

          const parallaxImages = document.querySelectorAll('img[data-speed][data-lag]');
          parallaxImages.forEach(function (img) {
            const speed = parseFloat(img.getAttribute('data-speed')) || 1;
            const lag = parseFloat(img.getAttribute('data-lag')) || 0;

            img.style.transition = 'none';
            img.style.setProperty('transition', 'none', 'important');
            gsap.set(img, { willChange: 'transform' });

            gsap.set(img, { scale: 1.06 });

            AnimationManager.smoother.effects(img, { speed: speed, lag: lag });
          });

          if (AnimationManager.smoother) {
            AnimationManager.smoother.refresh();
          }
        }, 100);
      },

      initScrollTriggered: function () {
        const elements = document.querySelectorAll(
          '.' + config.animationClass + ', .animate[data-anim-type], [data-animation-type], [data-anim-type]'
        );

        if (elements.length === 0) {
          return;
        }

        elements.forEach((element, index) => {
          const animation = this.createScrollTriggeredAnimation(element, index);
          if (animation) {
            this.animations.push(animation);
          }
        });
      },

      createScrollTriggeredAnimation: function (element, index) {
        const animationType = element.dataset.animationType || element.dataset.animType || 'fadeInUp';
        const duration = parseTimeToSeconds(element.dataset.duration, config.defaultDuration);
        const delay = parseTimeToSeconds(element.dataset.delay, 0);
        const offset = parseInt(element.dataset.offset) || config.offset;
        const ease = element.dataset.ease || config.defaultEase;
        const once = element.dataset.once !== 'false';

        const animationFn = AnimationTypes[animationType];

        if (!animationFn) {
          return null;
        }

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: element,
            start: `top ${offset}%`,
            end: 'bottom top',
            toggleActions: once ? 'play none none none' : 'play none reverse none',
            markers: false,
            id: `animation-${index}`,
            invalidateOnRefresh: true
          }
        });

        animationFn(timeline, element, { duration, delay, ease });

        return {
          element: element,
          timeline: timeline,
          type: animationType
        };
      },

      initScrollLinked: function () {
        const elements = document.querySelectorAll('.' + config.scrollLinkedClass);

        if (elements.length === 0) {
          return;
        }

        elements.forEach((element, index) => {
          const animation = this.createScrollLinkedAnimation(element, index);
          if (animation) {
            this.scrollLinkedAnimations.push(animation);
          }
        });
      },

      createScrollLinkedAnimation: function (element, index) {
        const animationType = element.dataset.scrollAnimation || 'progress';
        const startOffset = parseInt(element.dataset.startOffset) || 0;
        const endOffset = parseInt(element.dataset.endOffset) || 100;
        const pin = element.dataset.pin === 'true';
        const pinSpacing = element.dataset.pinSpacing !== 'false';

        const animationFn = ScrollLinkedTypes[animationType];

        if (!animationFn) {
          return null;
        }

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: element,
            start: `top ${startOffset}%`,
            end: `top ${endOffset}%`,
            scrub: true,
            pin: pin ? element : false,
            pinSpacing: pinSpacing,
            markers: false,
            id: `scroll-linked-${index}`
          }
        });

        animationFn(timeline, element);

        return {
          element: element,
          timeline: timeline,
          type: animationType
        };
      },

      refreshOnResize: function () {
        let resizeTimer;
        const self = this;
        window.addEventListener('resize', function () {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(function () {
            ScrollTrigger.refresh();
            if (self.smoother) {
              self.smoother.refresh();
            }
          }, 250);
        });
      },

      destroy: function () {
        this.animations.forEach(anim => {
          if (anim.timeline) {
            anim.timeline.kill();
          }
        });
        this.scrollLinkedAnimations.forEach(anim => {
          if (anim.timeline) {
            anim.timeline.kill();
          }
        });
        ScrollTrigger.getAll().forEach(trigger => trigger.kill());
        if (this.smoother) {
          this.smoother.kill();
          this.smoother = null;
        }
        this.animations = [];
        this.scrollLinkedAnimations = [];
      }
    };

    const AnimationTypes = {
      fadeInUp: function (timeline, element, options) {
        gsap.set(element, { opacity: 0, y: 50 });
        timeline.to(element, {
          opacity: 1,
          y: 0,
          duration: options.duration,
          delay: options.delay,
          ease: options.ease
        });
      },

      fadeInDown: function (timeline, element, options) {
        gsap.set(element, { opacity: 0, y: -50 });
        timeline.to(element, {
          opacity: 1,
          y: 0,
          duration: options.duration,
          delay: options.delay,
          ease: options.ease
        });
      },

      fadeInLeft: function (timeline, element, options) {
        gsap.set(element, { opacity: 0, x: -50 });
        timeline.to(element, {
          opacity: 1,
          x: 0,
          duration: options.duration,
          delay: options.delay,
          ease: options.ease
        });
      },

      fadeInRight: function (timeline, element, options) {
        gsap.set(element, { opacity: 0, x: 50 });
        timeline.to(element, {
          opacity: 1,
          x: 0,
          duration: options.duration,
          delay: options.delay,
          ease: options.ease
        });
      },

      fadeIn: function (timeline, element, options) {
        gsap.set(element, { opacity: 0 });
        timeline.to(element, {
          opacity: 1,
          duration: options.duration,
          delay: options.delay,
          ease: options.ease
        });
      },

      scaleIn: function (timeline, element, options) {
        gsap.set(element, { opacity: 0, scale: 0.8 });
        timeline.to(element, {
          opacity: 1,
          scale: 1,
          duration: options.duration,
          delay: options.delay,
          ease: options.ease
        });
      },

      rotateIn: function (timeline, element, options) {
        gsap.set(element, { opacity: 0, rotation: -180, scale: 0.5 });
        timeline.to(element, {
          opacity: 1,
          rotation: 0,
          scale: 1,
          duration: options.duration,
          delay: options.delay,
          ease: options.ease
        });
      },

      slideInLeft: function (timeline, element, options) {
        gsap.set(element, { opacity: 0, x: '-100%' });
        timeline.to(element, {
          opacity: 1,
          x: 0,
          duration: options.duration,
          delay: options.delay,
          ease: options.ease
        });
      },

      slideInRight: function (timeline, element, options) {
        gsap.set(element, { opacity: 0, x: '100%' });
        timeline.to(element, {
          opacity: 1,
          x: 0,
          duration: options.duration,
          delay: options.delay,
          ease: options.ease
        });
      },

      /**
       * clip-path inset(...) como strings casi no se interpola entre navegadores: la animación salta al final.
       * Aquí tween de números (%) + onUpdate aplicando inset explícito.
       */
      _setInsetPercentClip: function (el, top, right, bottom, left) {
        var v =
          'inset(' +
          top +
          '% ' +
          right +
          '% ' +
          bottom +
          '% ' +
          left +
          '%)';
        el.style.clipPath = v;
        el.style.webkitClipPath = v;
      },

      _tweenInsetMask: function (timeline, element, options, from, to) {
        gsap.set(element, { overflow: 'hidden', opacity: 1, x: 0, y: 0, clearProps: 'clipPath' });
        AnimationTypes._setInsetPercentClip(element, from.top, from.right, from.bottom, from.left);
        var state = {
          top: from.top,
          right: from.right,
          bottom: from.bottom,
          left: from.left
        };
        timeline.to(state, {
          top: to.top,
          right: to.right,
          bottom: to.bottom,
          left: to.left,
          duration: options.duration,
          delay: options.delay,
          ease: options.ease,
          onUpdate: function () {
            AnimationTypes._setInsetPercentClip(
              element,
              state.top,
              state.right,
              state.bottom,
              state.left
            );
          }
        });
      },

      maskRevealLeft: function (timeline, element, options) {
        AnimationTypes._tweenInsetMask(
          timeline,
          element,
          options,
          { top: 0, right: 100, bottom: 0, left: 0 },
          { top: 0, right: 0, bottom: 0, left: 0 }
        );
      },

      maskRevealRight: function (timeline, element, options) {
        AnimationTypes._tweenInsetMask(
          timeline,
          element,
          options,
          { top: 0, right: 0, bottom: 0, left: 100 },
          { top: 0, right: 0, bottom: 0, left: 0 }
        );
      },

      maskRevealTop: function (timeline, element, options) {
        AnimationTypes._tweenInsetMask(
          timeline,
          element,
          options,
          { top: 100, right: 0, bottom: 0, left: 0 },
          { top: 0, right: 0, bottom: 0, left: 0 }
        );
      },

      maskRevealBottom: function (timeline, element, options) {
        AnimationTypes._tweenInsetMask(
          timeline,
          element,
          options,
          { top: 0, right: 0, bottom: 100, left: 0 },
          { top: 0, right: 0, bottom: 0, left: 0 }
        );
      },

      maskRevealCenter: function (timeline, element, options) {
        AnimationTypes._tweenInsetMask(
          timeline,
          element,
          options,
          { top: 40, right: 40, bottom: 40, left: 40 },
          { top: 0, right: 0, bottom: 0, left: 0 }
        );
      },

      splitText: function (timeline, element, options) {
        element.dataset.gsapProcessed = 'true';
        const splitTarget = getSplitTargetElement(element);

        const splitType = splitTarget.dataset.splitType || element.dataset.splitType || 'words';
        const splitAnimation = splitTarget.dataset.splitAnimation || element.dataset.splitAnimation || 'fadeInUp';

        if (typeof SplitText !== 'undefined') {
          let splitConfig = {};
          let elementsToAnimate = [];

          if (splitType === 'lines') {
            splitConfig = {
              type: 'lines',
              linesClass: 'split-line'
            };
          } else if (splitType === 'chars') {
            splitConfig = {
              type: 'chars',
              charsClass: 'split-char'
            };
          } else {
            splitConfig = {
              type: 'words',
              wordsClass: 'split-word'
            };
          }

          const split = new SplitText(splitTarget, splitConfig);

          if (splitType === 'lines' && split.lines) {
            elementsToAnimate = split.lines;
          } else if (splitType === 'chars' && split.chars) {
            elementsToAnimate = split.chars;
          } else if (split.words) {
            elementsToAnimate = split.words;
          }

          gsap.set(element, { visibility: 'visible' });
          gsap.set(splitTarget, { visibility: 'visible' });

          AnimationTypes.applySplitAnimation(timeline, elementsToAnimate, splitAnimation, options, splitTarget);
        } else {
          const text = splitTarget.textContent;
          const html = splitTarget.innerHTML;
          let elementsToAnimate = [];

          if (splitType === 'lines') {
            let lines = html.split(/<br\s*\/?>/i).map(function (line) {
              return line.replace(/&nbsp;/g, ' ').trim();
            });

            if (lines.length <= 1) {
              lines = text.split(/\n/).map(function (line) {
                return line.trim();
              });
            }

            lines = lines.filter(function (line) {
              return line !== '';
            });

            if (lines.length > 1) {
              splitTarget.innerHTML = '';
              lines.forEach(function (line, index) {
                if (line.trim() === '' && index === lines.length - 1) {
                  return;
                }
                const lineDiv = document.createElement('div');
                lineDiv.innerHTML = line;
                lineDiv.style.display = 'block';
                splitTarget.appendChild(lineDiv);
                elementsToAnimate.push(lineDiv);
              });
            } else {
              elementsToAnimate = splitByRenderedLines(splitTarget);
            }
          } else if (splitType === 'chars') {
            const chars = text.split('');
            splitTarget.innerHTML = '';
            chars.forEach(function (char) {
              if (char === ' ') {
                splitTarget.appendChild(document.createTextNode(' '));
              } else {
                const span = document.createElement('span');
                span.textContent = char;
                span.style.display = 'inline-block';
                splitTarget.appendChild(span);
                elementsToAnimate.push(span);
              }
            });
          } else {
            const words = text.split(/(\s+)/);
            splitTarget.innerHTML = '';
            words.forEach(function (word) {
              if (word.trim() === '') {
                splitTarget.appendChild(document.createTextNode(word));
              } else {
                const span = document.createElement('span');
                span.textContent = word;
                span.style.display = 'inline-block';
                splitTarget.appendChild(span);
                elementsToAnimate.push(span);
              }
            });
          }

          gsap.set(element, { visibility: 'visible' });
          gsap.set(splitTarget, { visibility: 'visible' });

          AnimationTypes.applySplitAnimation(timeline, elementsToAnimate, splitAnimation, options, splitTarget);
        }
      },

      applySplitAnimation: function (timeline, elements, animationType, options, originalElement) {
        if (!elements || !elements.length) {
          elements = [originalElement];
        }

        const stagger = resolveStaggerValue(originalElement);
        const duration = options.duration || 0.8;
        const delay = options.delay || 0;
        const ease = options.ease || 'power2.out';
        const blur = options.blur || 20;

        AnimationTypes.setSplitInitialState(elements, animationType);

        switch (animationType) {
          case 'fadeIn':
            gsap.set(elements, { opacity: 0 });
            timeline.to(elements, {
              opacity: 1,
              duration: duration,
              delay: delay,
              stagger: stagger,
              ease: ease
            });
            break;

          case 'fadeInUp':
            gsap.set(elements, { opacity: 0, y: 50 });
            timeline.to(elements, {
              opacity: 1,
              y: 0,
              duration: duration,
              delay: delay,
              stagger: stagger,
              ease: ease
            });
            break;

          case 'fadeInLeft':
            gsap.set(elements, { opacity: 0, x: -50 });
            timeline.to(elements, {
              opacity: 1,
              x: 0,
              duration: duration,
              delay: delay,
              stagger: stagger,
              ease: ease
            });
            break;

          case 'fadeInRight':
            gsap.set(elements, { opacity: 0, x: 50 });
            timeline.to(elements, {
              opacity: 1,
              x: 0,
              duration: duration,
              delay: delay,
              stagger: stagger,
              ease: ease
            });
            break;

          case 'perspectiveDown':
            gsap.set(elements, { opacity: 0, y: 50, z: -100, rotationX: -90, force3D: true });
            timeline.to(elements, {
              opacity: 1,
              y: 0,
              z: 0,
              rotationX: 0,
              force3D: true,
              duration: duration,
              delay: delay,
              stagger: stagger,
              ease: ease
            });
            break;

          case 'blurText':
            timeline.fromTo(
              elements,
              { opacity: 0, filter: `blur(${blur}px)`, y: 20 },
              {
                opacity: 1,
                filter: 'blur(0px)',
                y: 0,
                duration: duration,
                delay: delay,
                stagger: stagger,
                ease: ease
              }
            );
            break;

          case 'blurScaleFromBig':
            timeline.fromTo(
              elements,
              { opacity: 0, filter: `blur(${blur}px)`, scale: 1.25, transformOrigin: '50% 50%' },
              {
                opacity: 1,
                filter: 'blur(0px)',
                scale: 1,
                duration: duration,
                delay: delay,
                stagger: stagger,
                ease: ease
              }
            );
            break;

          case 'blurScaleFromSmall':
            timeline.fromTo(
              elements,
              { opacity: 0, filter: `blur(${blur}px)`, scale: 0.75, transformOrigin: '50% 50%' },
              {
                opacity: 1,
                filter: 'blur(0px)',
                scale: 1,
                duration: duration,
                delay: delay,
                stagger: stagger,
                ease: ease
              }
            );
            break;

          case 'blurFromBottom':
            timeline.fromTo(
              elements,
              { opacity: 0, filter: `blur(${blur}px)`, y: 40 },
              {
                opacity: 1,
                filter: 'blur(0px)',
                y: 0,
                duration: duration,
                delay: delay,
                stagger: stagger,
                ease: ease
              }
            );
            break;

          case 'blurFromTop':
            timeline.fromTo(
              elements,
              { opacity: 0, filter: `blur(${blur}px)`, y: -40 },
              {
                opacity: 1,
                filter: 'blur(0px)',
                y: 0,
                duration: duration,
                delay: delay,
                stagger: stagger,
                ease: ease
              }
            );
            break;

          default:
            gsap.set(elements, { opacity: 0, y: 50 });
            timeline.to(elements, {
              opacity: 1,
              y: 0,
              duration: duration,
              delay: delay,
              stagger: stagger,
              ease: ease
            });
        }
      },

      setSplitInitialState: function (elements, animationType) {
        switch (animationType) {
          case 'blurText':
            gsap.set(elements, { opacity: 0, filter: `blur(${blur}px)`, y: 20 });
            break;
          case 'blurScaleFromBig':
            gsap.set(elements, { opacity: 0, filter: `blur(${blur}px)`, scale: 1.25, transformOrigin: '50% 50%' });
            break;
          case 'blurScaleFromSmall':
            gsap.set(elements, { opacity: 0, filter: `blur(${blur}px)`, scale: 0.75, transformOrigin: '50% 50%' });
            break;
          case 'blurFromBottom':
            gsap.set(elements, { opacity: 0, filter: `blur(${blur}px)`, y: 40 });
            break;
          case 'blurFromTop':
            gsap.set(elements, { opacity: 0, filter: `blur(${blur}px)`, y: -40 });
            break;
          case 'fadeIn':
            gsap.set(elements, { opacity: 0 });
            break;
          case 'fadeInLeft':
            gsap.set(elements, { opacity: 0, x: -50 });
            break;
          case 'fadeInRight':
            gsap.set(elements, { opacity: 0, x: 50 });
            break;
          case 'perspectiveDown':
            gsap.set(elements, { opacity: 0, y: 50, z: -100, rotationX: -90, force3D: true });
            break;
          case 'fadeInUp':
          default:
            gsap.set(elements, { opacity: 0, y: 50 });
            break;
        }
      },

      animateLetters: function (timeline, element, options) {
        element.dataset.gsapProcessed = 'true';
        const splitTarget = getSplitTargetElement(element);

        const text = splitTarget.textContent;
        splitTarget.innerHTML = '';

        const chars = text.split('');
        chars.forEach(function (char) {
          if (char === ' ') {
            splitTarget.appendChild(document.createTextNode(' '));
          } else {
            const span = document.createElement('span');
            span.textContent = char;
            span.style.display = 'inline-block';
            splitTarget.appendChild(span);
          }
        });

        const charSpans = splitTarget.querySelectorAll('span');
        gsap.set(element, { visibility: 'visible' });
        gsap.set(splitTarget, { visibility: 'visible' });
        gsap.set(charSpans, { opacity: 0, y: 50 });
        timeline.to(charSpans, {
          opacity: 1,
          y: 0,
          duration: options.duration || 0.6,
          delay: options.delay || 0,
          stagger: parseFloat(element.dataset.stagger) || 0.03,
          ease: options.ease
        });
      },

      animateWords: function (timeline, element, options) {
        element.dataset.gsapProcessed = 'true';
        const splitTarget = getSplitTargetElement(element);

        const text = splitTarget.textContent;
        const words = text.split(/(\s+)/);
        splitTarget.innerHTML = '';

        words.forEach(function (word) {
          if (word.trim() === '') {
            splitTarget.appendChild(document.createTextNode(word));
          } else {
            const span = document.createElement('span');
            span.textContent = word;
            span.style.display = 'inline-block';
            splitTarget.appendChild(span);
          }
        });

        const wordSpans = splitTarget.querySelectorAll('span');
        gsap.set(element, { visibility: 'visible' });
        gsap.set(splitTarget, { visibility: 'visible' });
        gsap.set(wordSpans, { opacity: 0, y: 50 });
        timeline.to(wordSpans, {
          opacity: 1,
          y: 0,
          duration: options.duration || 0.8,
          delay: options.delay || 0,
          stagger: parseFloat(element.dataset.stagger) || 0.1,
          ease: options.ease
        });
      },

      animateLines: function (timeline, element, options) {
        element.dataset.gsapProcessed = 'true';
        const splitTarget = getSplitTargetElement(element);

        const html = splitTarget.innerHTML;

        const blockElements = splitTarget.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6, li');

        if (blockElements.length > 0) {
          gsap.set(element, { visibility: 'visible' });
          gsap.set(splitTarget, { visibility: 'visible' });
          gsap.set(blockElements, { opacity: 0, y: 50 });
          timeline.to(blockElements, {
            opacity: 1,
            y: 0,
            duration: options.duration || 0.8,
            delay: options.delay || 0,
            stagger: parseFloat(element.dataset.stagger) || 0.15,
            ease: options.ease
          });
        } else {
          const lines = html.split(/<br\s*\/?>/i);

          if (lines.length === 1) {
            const text = splitTarget.textContent;
            const textLines = text.split(/\n/);

            if (textLines.length > 1) {
              splitTarget.innerHTML = '';
              textLines.forEach(function (line) {
                if (line.trim()) {
                  const lineDiv = document.createElement('div');
                  lineDiv.textContent = line.trim();
                  lineDiv.style.display = 'block';
                  splitTarget.appendChild(lineDiv);
                }
              });
            } else {
              const textSingle = splitTarget.textContent.trim();
              splitTarget.innerHTML = '';
              if (textSingle) {
                const lineDiv = document.createElement('div');
                lineDiv.textContent = textSingle;
                lineDiv.style.display = 'block';
                splitTarget.appendChild(lineDiv);
              }
            }
          } else {
            splitTarget.innerHTML = '';
            lines.forEach(function (line) {
              if (line.trim()) {
                const lineDiv = document.createElement('div');
                lineDiv.innerHTML = line.trim();
                lineDiv.style.display = 'block';
                splitTarget.appendChild(lineDiv);
              }
            });
          }

          const lineDivs = splitTarget.querySelectorAll('div');
          gsap.set(element, { visibility: 'visible' });
          gsap.set(splitTarget, { visibility: 'visible' });
          gsap.set(lineDivs, { opacity: 0, y: 50 });
          timeline.to(lineDivs, {
            opacity: 1,
            y: 0,
            duration: options.duration || 0.8,
            delay: options.delay || 0,
            stagger: parseFloat(element.dataset.stagger) || 0.15,
            ease: options.ease
          });
        }
      }
    };

    const ScrollLinkedTypes = {
      progress: function (timeline, element) {
        timeline.fromTo(element,
          { opacity: 0, y: 100 },
          { opacity: 1, y: 0 }
        );
      },

      parallaxY: function (timeline, element) {
        const distance = parseInt(element.dataset.parallaxDistance) || 100;
        timeline.fromTo(element,
          { y: -distance },
          { y: distance }
        );
      },

      parallaxX: function (timeline, element) {
        const distance = parseInt(element.dataset.parallaxDistance) || 100;
        timeline.fromTo(element,
          { x: -distance },
          { x: distance }
        );
      },

      rotate: function (timeline, element) {
        const rotation = parseInt(element.dataset.rotation) || 360;
        timeline.fromTo(element,
          { rotation: 0 },
          { rotation: rotation }
        );
      },

      scale: function (timeline, element) {
        const startScale = parseFloat(element.dataset.startScale) || 0.5;
        const endScale = parseFloat(element.dataset.endScale) || 1;
        timeline.fromTo(element,
          { scale: startScale },
          { scale: endScale }
        );
      },

      fade: function (timeline, element) {
        timeline.fromTo(element,
          { opacity: 0 },
          { opacity: 1 }
        );
      },

      color: function (timeline, element) {
        const startColor = element.dataset.startColor || '#000000';
        const endColor = element.dataset.endColor || '#ffffff';
        timeline.fromTo(element,
          { color: startColor },
          { color: endColor }
        );
      }
    };

    function init() {
      const scrollSmootherEnabled = (typeof gsapAnimationsConfig !== 'undefined' &&
        (gsapAnimationsConfig.scrollSmoother === '1' || gsapAnimationsConfig.scrollSmoother === 1));

      const initFunction = function () {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function () {
            setTimeout(function () {
              AnimationManager.init();
              setTimeout(function () {
                ScrollTrigger.refresh();
                if (AnimationManager.smoother) {
                  AnimationManager.smoother.refresh();
                }
              }, 100);
            }, 100);
          });
        } else {
          setTimeout(function () {
            AnimationManager.init();
            setTimeout(function () {
              ScrollTrigger.refresh();
              if (AnimationManager.smoother) {
                AnimationManager.smoother.refresh();
              }
            }, 100);
          }, 100);
        }
      };

      if (scrollSmootherEnabled && typeof ScrollSmoother === 'undefined') {
        waitForScrollSmoother(initFunction);
      } else {
        initFunction();
      }
    }

    init();

    window.GSAPAnimations = {
      manager: AnimationManager,
      config: config,
      addAnimationType: function (name, fn) {
        AnimationTypes[name] = fn;
      },
      addScrollLinkedType: function (name, fn) {
        ScrollLinkedTypes[name] = fn;
      },
      refresh: function () {
        ScrollTrigger.refresh();
      },
      debug: function () {
        return {
          scrollTriggered: AnimationManager.animations.length,
          scrollLinked: AnimationManager.scrollLinkedAnimations.length,
          totalTriggers: ScrollTrigger.getAll().length,
          triggers: ScrollTrigger.getAll().map(function (trigger) {
            return trigger.vars.id || 'sin id';
          })
        };
      }
    };
  }
})();
