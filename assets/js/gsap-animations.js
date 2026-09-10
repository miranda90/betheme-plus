
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

  function whenFontsReady(callback) {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(callback).catch(callback);
      return;
    }

    callback();
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

  const TEXT_BLOCK_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption';
  const CONTENT_ROOT_SELECTOR = '.column_attr, .desc, .title, .heading, .heading_tag, .the_content_wrapper';
  const SPLIT_IGNORE_SELECTOR = 'img,svg,iframe,video,canvas,button,.button,.action_button,script,style,noscript';

  function filterOutNested(elements) {
    return elements.filter(function (el) {
      return !elements.some(function (other) {
        return other !== el && other.contains(el);
      });
    });
  }

  function isLayoutShell(el) {
    if (!el || el.nodeType !== 1) {
      return true;
    }

    const cls = el.classList;
    return cls.contains('mcb-section') ||
      cls.contains('mcb-wrap') ||
      cls.contains('mcb-item') ||
      cls.contains('mcb-section-inner') ||
      cls.contains('mcb-wrap-inner') ||
      cls.contains('mcb-column-inner') ||
      cls.contains('mcb-item-inner') ||
      cls.contains('section_wrapper');
  }

  /**
   * Nodos de texto reales (h1, p, .desc, .column_attr, .title).
   * Nunca el wrap/item de BeBuilder: vaciar ese innerHTML destruía el tag y la tipografía.
   */
  function getSplitTargets(element) {
    if (!element || element.nodeType !== 1) {
      return [];
    }

    if (element.matches(TEXT_BLOCK_SELECTOR) || element.classList.contains('title')) {
      return [element];
    }

    const contentRoots = filterOutNested(Array.from(element.querySelectorAll(CONTENT_ROOT_SELECTOR)));
    const searchIn = contentRoots.length ? contentRoots : [element];
    const targets = [];

    searchIn.forEach(function (root) {
      const blocks = filterOutNested(Array.from(root.querySelectorAll(TEXT_BLOCK_SELECTOR)));
      if (blocks.length) {
        blocks.forEach(function (block) {
          targets.push(block);
        });
        return;
      }

      if (!isLayoutShell(root)) {
        targets.push(root);
      }
    });

    if (!targets.length) {
      const blocks = filterOutNested(Array.from(element.querySelectorAll(TEXT_BLOCK_SELECTOR)));
      if (blocks.length) {
        return blocks;
      }

      const titles = filterOutNested(Array.from(element.querySelectorAll('.title, .heading')));
      if (titles.length) {
        return titles;
      }
    }

    return filterOutNested(targets);
  }

  function collectTextNodes(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue || !node.nodeValue.replace(/\s+/g, '')) {
          return NodeFilter.FILTER_REJECT;
        }

        const parent = node.parentElement;
        if (!parent) {
          return NodeFilter.FILTER_REJECT;
        }

        if (parent.closest(SPLIT_IGNORE_SELECTOR + ',.split-word,.split-char,.split-line')) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    });

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    return nodes;
  }

  function wrapTextNodeParts(textNode, mode) {
    const value = textNode.nodeValue;
    const parts = mode === 'chars' ? Array.from(value) : value.split(/(\s+)/);
    const fragment = document.createDocumentFragment();
    const wrapped = [];

    parts.forEach(function (part) {
      if (part === '') {
        return;
      }

      if (/^\s+$/.test(part)) {
        fragment.appendChild(document.createTextNode(part));
        return;
      }

      const span = document.createElement('span');
      span.className = mode === 'chars' ? 'split-char' : 'split-word';
      span.textContent = part;
      fragment.appendChild(span);
      wrapped.push(span);
    });

    if (textNode.parentNode) {
      textNode.parentNode.replaceChild(fragment, textNode);
    }

    return wrapped;
  }

  function wrapWordsInPlace(root) {
    const pieces = [];
    collectTextNodes(root).forEach(function (node) {
      wrapTextNodeParts(node, 'words').forEach(function (el) {
        pieces.push(el);
      });
    });
    return pieces;
  }

  function wrapCharsInPlace(root) {
    const pieces = [];
    collectTextNodes(root).forEach(function (node) {
      wrapTextNodeParts(node, 'chars').forEach(function (el) {
        pieces.push(el);
      });
    });
    return pieces;
  }

  function groupWordsIntoLines(wordSpans) {
    if (!wordSpans.length) {
      return [];
    }

    const lines = [];
    let current = [];
    let currentTop = null;

    wordSpans.forEach(function (span) {
      const top = span.offsetTop;
      if (currentTop === null) {
        currentTop = top;
      }

      if (Math.abs(top - currentTop) > 1) {
        lines.push(current);
        current = [];
        currentTop = top;
      }

      current.push(span);
    });

    if (current.length) {
      lines.push(current);
    }

    return lines.map(function (words) {
      const line = document.createElement('span');
      line.className = 'split-line';
      const first = words[0];
      const parent = first.parentNode;

      if (!parent) {
        return first;
      }

      parent.insertBefore(line, first);

      words.forEach(function (word, index) {
        if (index > 0) {
          let cursor = word.previousSibling;
          while (cursor && cursor !== line && cursor.nodeType === 3) {
            const space = cursor;
            cursor = cursor.previousSibling;
            line.appendChild(space);
          }
        }
        line.appendChild(word);
      });

      return line;
    });
  }

  function splitTargetFallback(target, splitType) {
    if (splitType === 'chars') {
      return wrapCharsInPlace(target);
    }

    const words = wrapWordsInPlace(target);
    if (splitType === 'lines') {
      return groupWordsIntoLines(words);
    }

    return words;
  }

  function buildSplitConfig(splitType, splitAnimation, target) {
    const config = {
      tag: 'span',
      aria: 'auto',
      smartWrap: true,
      wordsClass: 'split-word',
      charsClass: 'split-char',
      linesClass: 'split-line'
    };

    if (target) {
      config.ignore = target.querySelectorAll(SPLIT_IGNORE_SELECTOR);
    }

    if (splitType === 'lines') {
      config.type = 'lines';
    } else if (splitType === 'chars') {
      config.type = 'chars,words';
    } else {
      config.type = 'words';
    }

    if (splitAnimation === 'hiddenFromBottom') {
      config.mask = splitType === 'chars' ? 'chars' : (splitType === 'words' ? 'words' : 'lines');
    }

    return config;
  }

  function collectSplitPieces(split, splitType) {
    if (!split) {
      return [];
    }

    if (splitType === 'lines' && split.lines && split.lines.length) {
      return split.lines;
    }

    if (splitType === 'chars' && split.chars && split.chars.length) {
      return split.chars;
    }

    if (split.words && split.words.length) {
      return split.words;
    }

    return split.chars || split.lines || [];
  }

  function splitTargetsInPlace(targets, splitType, splitAnimation) {
    const pieces = [];

    targets.forEach(function (target) {
      if (typeof SplitText !== 'undefined') {
        const split = new SplitText(target, buildSplitConfig(splitType, splitAnimation, target));
        collectSplitPieces(split, splitType).forEach(function (el) {
          pieces.push(el);
        });
        return;
      }

      splitTargetFallback(target, splitType).forEach(function (el) {
        pieces.push(el);
      });
    });

    return pieces;
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

      /**
       * BeTheme imprime `#Content`, luego (si aplica) hooks y después `<footer>`
       * como hermanos dentro de `#Wrapper`. ScrollSmoother solo animaba `#Content`,
       * así que la altura de scroll ignoraba el pie y parecía "no llegar al footer".
       * Este bundle incluye contenido + pie (y elementos entre medios).
       */
      getScrollSmootherContentRoot: function (wrapperEl, contentEl) {
        if (!wrapperEl || !contentEl || !contentEl.parentElement || contentEl.parentElement !== wrapperEl) {
          return contentEl;
        }

        var next = contentEl.nextElementSibling;
        if (!next) {
          return contentEl;
        }

        var hasFooterAfter = false;
        var scan = next;
        while (scan) {
          var isFoot =
            scan.tagName === 'FOOTER' ||
            scan.id === 'Footer' ||
            scan.id === 'mfn-footer-template';
          if (isFoot) {
            hasFooterAfter = true;
            break;
          }
          scan = scan.nextElementSibling;
        }
        if (!hasFooterAfter) {
          return contentEl;
        }

        var bundle = document.createElement('div');
        bundle.id = 'mfn-ss-scroll-bundle';
        wrapperEl.insertBefore(bundle, contentEl);
        bundle.appendChild(contentEl);

        next = bundle.nextElementSibling;
        while (next) {
          var cur = next;
          next = next.nextElementSibling;
          bundle.appendChild(cur);
          var isFooterNode =
            cur.tagName === 'FOOTER' ||
            cur.id === 'Footer' ||
            cur.id === 'mfn-footer-template';
          if (isFooterNode) {
            break;
          }
        }

        return bundle;
      },

      isGlobalScrollSmootherEnabled: function () {
        return typeof gsapAnimationsConfig !== 'undefined' &&
          (gsapAnimationsConfig.scrollSmoother === '1' || gsapAnimationsConfig.scrollSmoother === 1);
      },

      hasScrollSmootherEffects: function () {
        return !!document.querySelector('.gsap-smoother-fx');
      },

      initScrollSmoother: function () {
        const shouldCreate = this.isGlobalScrollSmootherEnabled() || this.hasScrollSmootherEffects();

        if (!shouldCreate || typeof ScrollSmoother === 'undefined') {
          return;
        }

        try {
          const wrapperEl = document.querySelector('#Wrapper');
          const contentEl = document.querySelector('#Content');
          var smootherContent = this.getScrollSmootherContentRoot(wrapperEl, contentEl);

          if (!smootherContent) {
            return;
          }

          this.smoother = ScrollSmoother.create({
            wrapper: wrapperEl || '#Wrapper',
            content: smootherContent,
            smooth: 1.5,
            effects: '.gsap-smoother-fx',
            smoothTouch: 0.2
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
          const smootherElements = document.querySelectorAll('.gsap-smoother-fx');
          smootherElements.forEach(function (element) {
            const speedAttr = parseFloat(element.getAttribute('data-speed'));
            const lagAttr = parseFloat(element.getAttribute('data-lag'));
            const speed = Number.isNaN(speedAttr) ? 1 : speedAttr;
            const lag = Number.isNaN(lagAttr) ? 0 : lagAttr;

            element.style.transition = 'none';
            element.style.setProperty('transition', 'none', 'important');
            gsap.set(element, { willChange: 'transform' });

            AnimationManager.smoother.effects(element, { speed: speed, lag: lag });
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
        const fallbackDuration = (typeof gsapAnimationsConfig !== 'undefined' && gsapAnimationsConfig.globalAnimationSpeed)
          ? gsapAnimationsConfig.globalAnimationSpeed
          : config.defaultDuration;
        const duration = parseTimeToSeconds(element.dataset.duration, parseTimeToSeconds(fallbackDuration, config.defaultDuration));
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
        options = options || {};
        element.dataset.gsapProcessed = 'true';

        const targets = getSplitTargets(element);
        const splitType = (options && options.forcedSplitType) || element.dataset.splitType || 'words';
        const splitAnimation = element.dataset.splitAnimation || 'fadeInUp';
        const elementsToAnimate = splitTargetsInPlace(targets, splitType, splitAnimation);

        gsap.set(element, { visibility: 'visible' });
        if (targets.length) {
          gsap.set(targets, { visibility: 'visible' });
        }

        if (splitAnimation === 'perspectiveDown' && targets.length) {
          gsap.set(targets, { perspective: 1000, transformStyle: 'preserve-3d' });
        }

        AnimationTypes.applySplitAnimation(
          timeline,
          elementsToAnimate,
          splitAnimation,
          options,
          element
        );
      },

      applySplitAnimation: function (timeline, elements, animationType, options, originalElement) {
        options = options || {};
        if (!elements || !elements.length) {
          elements = originalElement ? [originalElement] : [];
        }

        if (!elements.length) {
          return;
        }

        const stagger = resolveStaggerValue(originalElement);
        const duration = options.duration || 0.8;
        const delay = options.delay || 0;
        const ease = options.ease || 'power2.out';
        const blur = options.blur || 20;
        const tween = { duration: duration, delay: delay, stagger: stagger, ease: ease };

        AnimationTypes.setSplitInitialState(elements, animationType, blur);

        switch (animationType) {
          case 'fadeIn':
            timeline.to(elements, Object.assign({ opacity: 1 }, tween));
            break;

          case 'fadeInUp':
            timeline.to(elements, Object.assign({ opacity: 1, y: 0 }, tween));
            break;

          case 'fadeInLeft':
            timeline.to(elements, Object.assign({ opacity: 1, x: 0 }, tween));
            break;

          case 'fadeInRight':
            timeline.to(elements, Object.assign({ opacity: 1, x: 0 }, tween));
            break;

          case 'perspectiveDown':
            timeline.to(elements, Object.assign({
              opacity: 1,
              y: 0,
              z: 0,
              rotationX: 0,
              force3D: true
            }, tween));
            break;

          case 'hiddenFromBottom':
            elements.forEach(function (el) {
              const parent = el.parentElement;
              if (!parent) {
                return;
              }

              const alreadyMasked = parent.className.indexOf('-mask') !== -1 || parent.classList.contains('split-line');
              if (alreadyMasked) {
                gsap.set(parent, { overflow: 'clip' });
                return;
              }

              const mask = document.createElement('span');
              mask.className = (el.className || 'split-word') + '-mask';
              parent.insertBefore(mask, el);
              mask.appendChild(el);
              gsap.set(mask, {
                overflow: 'clip',
                display: el.classList.contains('split-line') ? 'block' : 'inline-block'
              });
            });
            timeline.to(elements, Object.assign({ yPercent: 0 }, tween));
            break;

          case 'blurText':
          case 'blurFromBottom':
            timeline.to(elements, Object.assign({
              opacity: 1,
              filter: 'blur(0px)',
              y: 0
            }, tween));
            break;

          case 'blurScaleFromBig':
          case 'blurScaleFromSmall':
            timeline.to(elements, Object.assign({
              opacity: 1,
              filter: 'blur(0px)',
              scale: 1
            }, tween));
            break;

          case 'blurFromTop':
            timeline.to(elements, Object.assign({
              opacity: 1,
              filter: 'blur(0px)',
              y: 0
            }, tween));
            break;

          default:
            timeline.to(elements, Object.assign({ opacity: 1, y: 0 }, tween));
        }
      },

      setSplitInitialState: function (elements, animationType, blur) {
        const blurPx = blur || 20;

        switch (animationType) {
          case 'blurText':
            gsap.set(elements, { opacity: 0, filter: 'blur(' + blurPx + 'px)', y: 20 });
            break;
          case 'blurScaleFromBig':
            gsap.set(elements, { opacity: 0, filter: 'blur(' + blurPx + 'px)', scale: 1.25, transformOrigin: '50% 50%' });
            break;
          case 'blurScaleFromSmall':
            gsap.set(elements, { opacity: 0, filter: 'blur(' + blurPx + 'px)', scale: 0.75, transformOrigin: '50% 50%' });
            break;
          case 'blurFromBottom':
            gsap.set(elements, { opacity: 0, filter: 'blur(' + blurPx + 'px)', y: 40 });
            break;
          case 'blurFromTop':
            gsap.set(elements, { opacity: 0, filter: 'blur(' + blurPx + 'px)', y: -40 });
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
          case 'hiddenFromBottom':
            gsap.set(elements, { yPercent: 110, opacity: 1 });
            break;
          case 'fadeInUp':
          default:
            gsap.set(elements, { opacity: 0, y: 50 });
            break;
        }
      },

      animateLetters: function (timeline, element, options) {
        AnimationTypes.splitText(timeline, element, Object.assign({}, options, { forcedSplitType: 'chars' }));
      },

      animateWords: function (timeline, element, options) {
        AnimationTypes.splitText(timeline, element, Object.assign({}, options, { forcedSplitType: 'words' }));
      },

      animateLines: function (timeline, element, options) {
        AnimationTypes.splitText(timeline, element, Object.assign({}, options, { forcedSplitType: 'lines' }));
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
      const initFunction = function () {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function () {
            whenFontsReady(function () {
              setTimeout(function () {
                AnimationManager.init();
                setTimeout(function () {
                  ScrollTrigger.refresh();
                  if (AnimationManager.smoother) {
                    AnimationManager.smoother.refresh();
                  }
                }, 100);
              }, 50);
            });
          });
        } else {
          whenFontsReady(function () {
            setTimeout(function () {
              AnimationManager.init();
              setTimeout(function () {
                ScrollTrigger.refresh();
                if (AnimationManager.smoother) {
                  AnimationManager.smoother.refresh();
                }
              }, 100);
            }, 50);
          });
        }
      };

      if (typeof ScrollSmoother === 'undefined') {
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
