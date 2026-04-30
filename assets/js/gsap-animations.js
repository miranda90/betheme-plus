/**
 * GSAP Animations System
 * Sistema modular de animaciones con GSAP para WordPress
 *
 * Soporta dos tipos de animaciones:
 * 1. Scroll-triggered: Se ejecutan cuando el scroll llega al elemento
 * 2. Scroll-linked: Avanzan progresivamente con el scroll
 */

(function () {
  'use strict';

  const config = {
    // Clase CSS para elementos que deben animarse
    animationClass: 'gsap-animate'
  };

  /**
   * Ocultar elementos de animación de texto inmediatamente para evitar FOUC
   * Se ejecuta inmediatamente, antes de esperar a GSAP
   */
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

  // Ocultar elementos de animación de texto inmediatamente
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideTextAnimationElements);
  } else {
    hideTextAnimationElements();
  }

  /**
   * Esperar a que GSAP y ScrollTrigger estén disponibles
   */
  function waitForGSAP(callback, maxAttempts = 50, attempt = 0) {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      callback();
    } else if (attempt < maxAttempts) {
      setTimeout(function () {
        waitForGSAP(callback, maxAttempts, attempt + 1);
      }, 100);
    }
  }

  /**
   * Esperar a que ScrollSmoother esté disponible (si está habilitado)
   */
  function waitForScrollSmoother(callback, maxAttempts = 50, attempt = 0) {
    if (typeof ScrollSmoother !== 'undefined') {
      callback();
    } else if (attempt < maxAttempts) {
      setTimeout(function () {
        waitForScrollSmoother(callback, maxAttempts, attempt + 1);
      }, 100);
    }
  }

  // Inicializar cuando GSAP esté listo
  waitForGSAP(function () {
    initAnimations();
  });

  function initAnimations() {
    // Registrar el plugin ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);

    // Registrar ScrollSmoother si está disponible
    if (typeof ScrollSmoother !== 'undefined') {
      gsap.registerPlugin(ScrollSmoother);
    }

    // Registrar SplitText si está disponible (plugin premium)
    if (typeof SplitText !== 'undefined') {
      gsap.registerPlugin(SplitText);
    }

    /**
     * Configuración global de animaciones
     */
    const config = {
      // Offset para activar animaciones antes de que el elemento sea visible
      offset: 80,
      // Duración por defecto de las animaciones
      defaultDuration: 1,
      // Ease por defecto
      defaultEase: 'power2.out',
      // Clase CSS para elementos que deben animarse
      animationClass: 'gsap-animate',
      // Clase CSS para elementos con scroll-linked
      scrollLinkedClass: 'gsap-scroll-linked'
    };

    /**
     * Gestor principal de animaciones
     */
    const AnimationManager = {
      // Almacenar todas las animaciones activas
      animations: [],
      scrollLinkedAnimations: [],
      smoother: null, // Instancia de ScrollSmoother

      /**
       * Inicializar el sistema de animaciones
       */
      init: function () {
        // Inicializar ScrollSmoother si está habilitado
        this.initScrollSmoother();
        this.initScrollTriggered();
        this.initScrollLinked();
        this.refreshOnResize();
      },

      /**
       * Inicializar ScrollSmoother si está habilitado
       */
      initScrollSmoother: function () {
        // Verificar si ScrollSmoother está habilitado en las opciones del tema
        const scrollSmootherEnabled = (typeof gsapAnimationsConfig !== 'undefined' &&
          (gsapAnimationsConfig.scrollSmoother === '1' || gsapAnimationsConfig.scrollSmoother === 1));

        if (!scrollSmootherEnabled || typeof ScrollSmoother === 'undefined') {
          return;
        }

        // Inicializar ScrollSmoother
        try {
          this.smoother = ScrollSmoother.create({
            wrapper: '#Wrapper',
            content: '#Content',
            smooth: 1,
            effects: true,
            smoothTouch: 0.1
          });

          // Aplicar efectos a elementos con data-speed y data-lag
          this.initScrollSmootherEffects();
        } catch (e) {
          console.warn('Error al inicializar ScrollSmoother:', e);
        }
      },

      /**
       * Aplicar efectos de ScrollSmoother a elementos con data-speed y data-lag
       */
      initScrollSmootherEffects: function () {
        if (!this.smoother) {
          return;
        }

        setTimeout(function () {
          // Elementos con Scroll Smoother general
          const smootherElements = document.querySelectorAll('[data-speed][data-lag]');
          smootherElements.forEach(function (element) {
            const speed = parseFloat(element.getAttribute('data-speed')) || 1;
            const lag = parseFloat(element.getAttribute('data-lag')) || 0;

            element.style.transition = 'none';
            element.style.setProperty('transition', 'none', 'important');
            gsap.set(element, { willChange: 'transform' });

            AnimationManager.smoother.effects(element, { speed: speed, lag: lag });
          });

          // Imágenes con parallax (también aplican scale 1.06)
          const parallaxImages = document.querySelectorAll('img[data-speed][data-lag]');
          parallaxImages.forEach(function (img) {
            const speed = parseFloat(img.getAttribute('data-speed')) || 1;
            const lag = parseFloat(img.getAttribute('data-lag')) || 0;

            img.style.transition = 'none';
            img.style.setProperty('transition', 'none', 'important');
            gsap.set(img, { willChange: 'transform' });

            // Aplicar scale para imágenes con parallax
            gsap.set(img, { scale: 1.06 });

            AnimationManager.smoother.effects(img, { speed: speed, lag: lag });
          });

          if (AnimationManager.smoother) {
            AnimationManager.smoother.refresh();
          }
        }, 100);
      },

      /**
       * Inicializar animaciones scroll-triggered
       */
      initScrollTriggered: function () {
        const elements = document.querySelectorAll('.' + config.animationClass);

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

      /**
       * Crear una animación scroll-triggered
       * @param {HTMLElement} element - Elemento a animar
       * @param {number} index - Índice del elemento
       * @returns {Object|null} - Objeto de animación o null
       */
      createScrollTriggeredAnimation: function (element, index) {
        // Obtener configuración del elemento (data attributes)
        const animationType = element.dataset.animationType || 'fadeInUp';
        const duration = parseFloat(element.dataset.duration) || config.defaultDuration;
        const delay = parseFloat(element.dataset.delay) || 0;
        const offset = parseInt(element.dataset.offset) || config.offset;
        const ease = element.dataset.ease || config.defaultEase;
        const once = element.dataset.once !== 'false'; // Por defecto solo se ejecuta una vez

        // Obtener la animación específica
        const animationFn = AnimationTypes[animationType];

        if (!animationFn) {
          return null;
        }

        // Crear la animación
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: element,
            start: `top ${offset}%`,
            end: 'bottom top',
            toggleActions: once ? 'play none none none' : 'play none reverse none',
            markers: false, // Cambiar a true para debug
            id: `animation-${index}`,
            invalidateOnRefresh: true
          }
        });

        // Aplicar la animación específica
        animationFn(timeline, element, { duration, delay, ease });

        return {
          element: element,
          timeline: timeline,
          type: animationType
        };
      },

      /**
       * Inicializar animaciones scroll-linked
       */
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

      /**
       * Crear una animación scroll-linked
       * @param {HTMLElement} element - Elemento a animar
       * @param {number} index - Índice del elemento
       * @returns {Object|null} - Objeto de animación o null
       */
      createScrollLinkedAnimation: function (element, index) {
        // Obtener configuración del elemento
        const animationType = element.dataset.scrollAnimation || 'progress';
        const startOffset = parseInt(element.dataset.startOffset) || 0;
        const endOffset = parseInt(element.dataset.endOffset) || 100;
        const pin = element.dataset.pin === 'true';
        const pinSpacing = element.dataset.pinSpacing !== 'false';

        // Obtener la animación específica
        const animationFn = ScrollLinkedTypes[animationType];

        if (!animationFn) {
          return null;
        }

        // Crear la animación
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: element,
            start: `top ${startOffset}%`,
            end: `top ${endOffset}%`,
            scrub: true, // Vincula la animación al scroll
            pin: pin ? element : false,
            pinSpacing: pinSpacing,
            markers: false, // Cambiar a true para debug
            id: `scroll-linked-${index}`
          }
        });

        // Aplicar la animación específica
        animationFn(timeline, element);

        return {
          element: element,
          timeline: timeline,
          type: animationType
        };
      },

      /**
       * Refrescar animaciones en resize
       */
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

      /**
       * Destruir todas las animaciones
       */
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

    /**
     * Tipos de animaciones scroll-triggered
     * Añade aquí nuevos tipos de animaciones
     */
    const AnimationTypes = {
      /**
       * Fade in desde abajo
       */
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

      /**
       * Fade in desde arriba
       */
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

      /**
       * Fade in desde la izquierda
       */
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

      /**
       * Fade in desde la derecha
       */
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

      /**
       * Solo fade in
       */
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
       * Scale in
       */
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

      /**
       * Rotate in
       */
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

      /**
       * Slide in desde la izquierda con fade
       */
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

      /**
       * Slide in desde la derecha con fade
       */
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
       * Split text según el tipo especificado (lines, words, chars)
       * Si SplitText está disponible (plugin premium), lo usa. Si no, usa una alternativa vanilla JS
       */
      splitText: function (timeline, element, options) {
        // Marcar como procesado
        element.dataset.gsapProcessed = 'true';

        // Obtener el tipo de split desde el atributo data-split-type (por defecto: words)
        const splitType = element.dataset.splitType || 'words';
        // Obtener el tipo de animación desde el atributo data-split-animation (por defecto: fadeInUp)
        const splitAnimation = element.dataset.splitAnimation || 'fadeInUp';

        if (typeof SplitText !== 'undefined') {
          // Usar SplitText si está disponible (plugin premium)
          let splitConfig = {};
          let elementsToAnimate = [];

          // Configurar SplitText según el tipo
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
            // Por defecto: words
            splitConfig = {
              type: 'words',
              wordsClass: 'split-word'
            };
          }

          const split = new SplitText(element, splitConfig);

          // Determinar qué elementos animar según el tipo
          if (splitType === 'lines' && split.lines) {
            elementsToAnimate = split.lines;
          } else if (splitType === 'chars' && split.chars) {
            elementsToAnimate = split.chars;
          } else if (split.words) {
            elementsToAnimate = split.words;
          }

          gsap.set(element, { visibility: 'visible' });

          // Aplicar la animación específica según data-split-animation
          this.applySplitAnimation(timeline, elementsToAnimate, splitAnimation, options, element);
        } else {
          // Alternativa vanilla JS sin SplitText
          const text = element.textContent;
          let elementsToAnimate = [];

          if (splitType === 'lines') {
            // Dividir por líneas (usando <br> o saltos de línea)
            const lines = text.split(/\n|<br\s*\/?>/i);
            element.innerHTML = '';
            lines.forEach(function (line, index) {
              if (line.trim() === '' && index === lines.length - 1) {
                return;
              }
              const lineDiv = document.createElement('div');
              lineDiv.textContent = line.trim();
              lineDiv.style.display = 'block';
              element.appendChild(lineDiv);
              elementsToAnimate.push(lineDiv);
            });
          } else if (splitType === 'chars') {
            // Dividir por caracteres
            const chars = text.split('');
            element.innerHTML = '';
            chars.forEach(function (char) {
              if (char === ' ') {
                element.appendChild(document.createTextNode(' '));
              } else {
                const span = document.createElement('span');
                span.textContent = char;
                span.style.display = 'inline-block';
                element.appendChild(span);
                elementsToAnimate.push(span);
              }
            });
          } else {
            // Por defecto: words
            const words = text.split(/(\s+)/);
            element.innerHTML = '';
            words.forEach(function (word) {
              if (word.trim() === '') {
                element.appendChild(document.createTextNode(word));
              } else {
                const span = document.createElement('span');
                span.textContent = word;
                span.style.display = 'inline-block';
                element.appendChild(span);
                elementsToAnimate.push(span);
              }
            });
          }

          gsap.set(element, { visibility: 'visible' });

          // Aplicar la animación específica según data-split-animation
          this.applySplitAnimation(timeline, elementsToAnimate, splitAnimation, options, element);
        }
      },

      /**
       * Aplicar animación específica a elementos split
       */
      applySplitAnimation: function (timeline, elements, animationType, options, originalElement) {
        const stagger = parseFloat(originalElement.dataset.stagger) || 0.05;
        const duration = options.duration || 0.8;
        const delay = options.delay || 0;
        const ease = options.ease || 'power2.out';

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

          default:
            // Por defecto: fadeInUp
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

      /**
       * Anima letras (carácter por carácter)
       */
      animateLetters: function (timeline, element, options) {
        // Marcar como procesado
        element.dataset.gsapProcessed = 'true';

        const text = element.textContent;
        element.innerHTML = '';

        // Dividir en caracteres preservando espacios
        const chars = text.split('');
        chars.forEach(function (char) {
          if (char === ' ') {
            // Espacio, añadirlo como nodo de texto
            element.appendChild(document.createTextNode(' '));
          } else {
            // Carácter, crear span
            const span = document.createElement('span');
            span.textContent = char;
            span.style.display = 'inline-block';
            element.appendChild(span);
          }
        });

        const charSpans = element.querySelectorAll('span');
        gsap.set(element, { visibility: 'visible' });
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

      /**
       * Anima palabras (palabra por palabra)
       */
      animateWords: function (timeline, element, options) {
        // Marcar como procesado
        element.dataset.gsapProcessed = 'true';

        const text = element.textContent;
        const words = text.split(/(\s+)/); // Dividir preservando espacios
        element.innerHTML = '';

        words.forEach(function (word) {
          if (word.trim() === '') {
            // Es un espacio, añadirlo como nodo de texto
            element.appendChild(document.createTextNode(word));
          } else {
            // Es una palabra, crear span
            const span = document.createElement('span');
            span.textContent = word;
            span.style.display = 'inline-block';
            element.appendChild(span);
          }
        });

        const wordSpans = element.querySelectorAll('span');
        gsap.set(element, { visibility: 'visible' });
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

      /**
       * Anima líneas (línea por línea)
       * Divide el texto por <br> o por elementos de bloque existentes
       */
      animateLines: function (timeline, element, options) {
        // Marcar como procesado
        element.dataset.gsapProcessed = 'true';

        const html = element.innerHTML;

        // Verificar si ya tiene elementos de bloque (div, p, etc.)
        const blockElements = element.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6, li');

        if (blockElements.length > 0) {
          // Ya tiene elementos de bloque, usarlos como líneas
          gsap.set(element, { visibility: 'visible' });
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
          // Dividir por <br> o saltos de línea
          const lines = html.split(/<br\s*\/?>/i);

          if (lines.length === 1) {
            // No hay <br>, dividir por saltos de línea en el texto
            const text = element.textContent;
            const textLines = text.split(/\n/);

            if (textLines.length > 1) {
              element.innerHTML = '';
              textLines.forEach(function (line) {
                if (line.trim()) {
                  const lineDiv = document.createElement('div');
                  lineDiv.textContent = line.trim();
                  lineDiv.style.display = 'block';
                  element.appendChild(lineDiv);
                }
              });
            } else {
              // Una sola línea, envolver todo
              const textSingle = element.textContent.trim();
              element.innerHTML = '';
              if (textSingle) {
                const lineDiv = document.createElement('div');
                lineDiv.textContent = textSingle;
                lineDiv.style.display = 'block';
                element.appendChild(lineDiv);
              }
            }
          } else {
            // Hay <br>, dividir por ellos
            element.innerHTML = '';
            lines.forEach(function (line) {
              if (line.trim()) {
                const lineDiv = document.createElement('div');
                lineDiv.innerHTML = line.trim();
                lineDiv.style.display = 'block';
                element.appendChild(lineDiv);
              }
            });
          }

          const lineDivs = element.querySelectorAll('div');
          gsap.set(element, { visibility: 'visible' });
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

    /**
     * Tipos de animaciones scroll-linked
     * Añade aquí nuevos tipos de animaciones vinculadas al scroll
     */
    const ScrollLinkedTypes = {
      /**
       * Animación de progreso genérica
       * Anima opacity y y según el progreso del scroll
       */
      progress: function (timeline, element) {
        timeline.fromTo(element,
          { opacity: 0, y: 100 },
          { opacity: 1, y: 0 }
        );
      },

      /**
       * Parallax vertical
       */
      parallaxY: function (timeline, element) {
        const distance = parseInt(element.dataset.parallaxDistance) || 100;
        timeline.fromTo(element,
          { y: -distance },
          { y: distance }
        );
      },

      /**
       * Parallax horizontal
       */
      parallaxX: function (timeline, element) {
        const distance = parseInt(element.dataset.parallaxDistance) || 100;
        timeline.fromTo(element,
          { x: -distance },
          { x: distance }
        );
      },

      /**
       * Rotación progresiva
       */
      rotate: function (timeline, element) {
        const rotation = parseInt(element.dataset.rotation) || 360;
        timeline.fromTo(element,
          { rotation: 0 },
          { rotation: rotation }
        );
      },

      /**
       * Scale progresivo
       */
      scale: function (timeline, element) {
        const startScale = parseFloat(element.dataset.startScale) || 0.5;
        const endScale = parseFloat(element.dataset.endScale) || 1;
        timeline.fromTo(element,
          { scale: startScale },
          { scale: endScale }
        );
      },

      /**
       * Fade progresivo
       */
      fade: function (timeline, element) {
        timeline.fromTo(element,
          { opacity: 0 },
          { opacity: 1 }
        );
      },

      /**
       * Color progresivo
       */
      color: function (timeline, element) {
        const startColor = element.dataset.startColor || '#000000';
        const endColor = element.dataset.endColor || '#ffffff';
        timeline.fromTo(element,
          { color: startColor },
          { color: endColor }
        );
      }
    };

    /**
     * Inicializar cuando el DOM esté listo
     */
    function init() {
      // Verificar si ScrollSmoother está habilitado y esperar a que esté disponible
      const scrollSmootherEnabled = (typeof gsapAnimationsConfig !== 'undefined' &&
        (gsapAnimationsConfig.scrollSmoother === '1' || gsapAnimationsConfig.scrollSmoother === 1));

      const initFunction = function () {
        // Esperar a que el DOM esté completamente cargado
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function () {
            setTimeout(function () {
              AnimationManager.init();
              // Refrescar ScrollTrigger después de un breve delay para asegurar que todo está renderizado
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

      // Si ScrollSmoother está habilitado, esperar a que esté disponible
      if (scrollSmootherEnabled && typeof ScrollSmoother === 'undefined') {
        waitForScrollSmoother(initFunction);
      } else {
        initFunction();
      }
    }

    // Inicializar
    init();

    // Exponer el AnimationManager globalmente para uso avanzado
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
