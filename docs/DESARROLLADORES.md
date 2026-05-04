# Betheme Plus — Referencia para desarrolladores

**Versión del plugin:** ver cabecera de `betheme-plus.php` (`BETHEME_PLUS_VERSION`).

Este documento describe todo lo implementado por **Betheme Plus**: dependencias, hooks, overrides del tema, frontend GSAP y herramientas de administración. Sirve como fuente única para el equipo técnico y puede **reutilizarse** para generar una página interna del plugin en WordPress (por ejemplo renderizando este Markdown o sincronizando una vista HTML administrativa).

---

## Requisitos

| Requisito | Detalle |
|-----------|---------|
| WordPress | Instalación estándar. |
| Tema activo | Plantilla padre **Betheme** (`wp_get_theme()->get_template() === 'betheme'`). Los child themes sobre Betheme cuentan. |
| Funciones del tema | Si no existe `mfn_opts_get()`, la mayor parte del plugin no se registra (solo overrides de archivos y aviso en admin). |

---

## Arquitectura general

1. **Overrides de archivos del tema** mediante el filtro `theme_file_path`: BeTheme carga `class-mfn-builder-fields.php` y `class-mfn-builder-front.php` desde el directorio del plugin cuando la ruta solicitada coincide.
2. **Opciones de tema**: filtro `mfn-theme-options-sections` (registrado en `plugins_loaded`, prioridad **1**, porque BeTheme construye las secciones dentro de `mfn_opts_setup()` antes de `after_setup_theme`).
3. **Frontend**: estilos/CSS dinámico en `wp_head`, scripts en `wp_enqueue_scripts` (prioridad **101**).
4. **BeBuilder (admin)**: parche JS de condiciones cuando está encolado `mfn-vbscripts`; página de herramientas bajo **Herramientas** para regenerar el bundle JS de campos.

**Namespace PHP:** `Base\BethemePlus\`

**Constantes:** `BETHEME_PLUS_VERSION`, `BETHEME_PLUS_FILE`, `BETHEME_PLUS_PATH`, `BETHEME_PLUS_URL`

---

## Ficheros principales

| Ruta | Rol |
|------|-----|
| `betheme-plus.php` | Bootstrap del plugin. |
| `includes/class-plugin.php` | Registro de todos los módulos y condiciones de tema. |
| `includes/integrations/class-builder-overrides.php` | Redirect de rutas de builder al plugin. |
| `includes/integrations/class-betheme-options.php` | Campos extra en Theme Options. |
| `includes/integrations/class-bebuilder-conditions-fix.php` | Encolado del parche BeBuilder. |
| `includes/integrations/class-bebuilder-field-bundle.php` | Admin: regenerar `bebuilder-{versión}.js`. |
| `includes/frontend/class-assets.php` | Colas GSAP + ScrollTrigger + ScrollSmoother + script propio. |
| `includes/frontend/class-dynamic-css.php` | Scrollbar (colores track/thumb) como CSS inline. |
| `assets/js/gsap-animations.js` | Motor de animaciones GSAP en el front. |
| `assets/css/gsap-animations.css` | Anti-FOUC y reglas de máscaras / texto. |
| `assets/js/bebuilder-conditions-fix.js` | Override de `mfnoptsinputs.showhidefields`. |
| `includes/overrides/functions/builder/class-mfn-builder-fields.php` | Definición de campos del builder (copia extendida del tema). |
| `includes/overrides/functions/builder/class-mfn-builder-front.php` | Salida HTML/front del builder (attrs `data-*`, clases GSAP, helper PHP). |

---

## Extensiones de Theme Options (Betheme)

Se insertan en **`mfn-theme-options-sections`**:

### Sección **Advanced**

| ID | Tipo | Descripción |
|----|------|-------------|
| `gsap-animation-speed` | `sliderbar` | Velocidad por defecto de animaciones GSAP (ms) cuando un elemento no define la suya. Rango orientativo 50–2000. |
| `scroll-smoother` | `switch` | Activa **GSAP ScrollSmoother** global (`1` / `0`). El valor se expone a JS como `gsapAnimationsConfig.scrollSmoother`. |

### Sección **General** — bloque **Scrollbar**

| ID | Tipo | Descripción |
|----|------|-------------|
| `scrollbar-track-color` | `color` | Color de la pista (`html::-webkit-scrollbar-track` + segundo color en `scrollbar-color` de Firefox). |
| `scrollbar-thumb-color` | `color` | Color del thumb (`html::-webkit-scrollbar-thumb` + primer color en Firefox). |

La hoja dinámica usa prefijo **`html::`** para igualar la especificidad del child theme. **No** se gestionan desde el plugin borde redondeado ni hover del thumb (reservado a CSS del tema).

---

## Frontend: scripts y configuración JS

**Enqueue** (`class-assets.php`):

- `gsap` 3.14.1 (jsDelivr)
- `ScrollTrigger` 3.14.1
- `ScrollSmoother` 3.14.1
- Estilo `betheme-plus-animations` → `assets/css/gsap-animations.css`
- Script `betheme-plus-animations` → `assets/js/gsap-animations.js`

**Objeto global** (localizado como `gsapAnimationsConfig` en `betheme-plus-animations`):

```js
{
  globalAnimationSpeed: number,  // desde mfn_opts_get('gsap-animation-speed')
  scrollSmoother: number         // desde mfn_opts_get('scroll-smoother')
}
```

Los flags `defer` de los tres scripts GSAP CDN se desactivan explícitamente (`wp_script_add_data(..., 'defer', false)`) para un orden de ejecución predecible frente al bundle del tema.

---

## ScrollSmoother (GSAP)

- Solo se inicializa si `scrollSmoother` es `1` y existe `ScrollSmoother`.
- **Wrapper:** `#Wrapper` (elemento típico de BeTheme).
- **Content:** por defecto se construye un contenedor que agrupa **`#Content` + nodos intermedios + `<footer>`** (IDs habituales `#Footer` o `#mfn-footer-template`), en un nodo `#mfn-ss-scroll-bundle`, porque en BeTheme el pie **no** está dentro de `#Content` y de lo contrario el scroll máximo no incluiría el footer.

**Efectos por elemento (BeBuilder):** atributos `data-speed` y `data-lag` cuando en el builder se activa scroll smoother en wrap/columna/ítem (ver override `class-mfn-builder-front.php`).

---

## Animaciones al scroll (ScrollTrigger)

Elementos detectados (resumen): clases/conjunto con `gsap-animate`, `.animate[data-anim-type]`, `[data-animation-type]`, `[data-anim-type]`.

**Atributos `data-*` frecuentes:** `data-animation-type` / `data-anim-type`, `data-duration`, `data-delay`, `data-offset`, `data-ease`, además de los específicos de split text y scroll-linked (ver abajo).

### Tipos implementados en `AnimationTypes` (entrada / reveal)

Incluye (lista orientativa; la fuente de verdad es el objeto `AnimationTypes` en `gsap-animations.js`):

- Entradas: `fadeIn`, `fadeInUp`, `fadeInDown`, `fadeInLeft`, `fadeInRight`, `scaleIn`, `rotateIn`, `slideInLeft`, `slideInRight`
- Máscaras con `clip-path` animado por porcentajes (evita tween de strings `inset()`): `maskRevealLeft`, `maskRevealRight`, `maskRevealTop`, `maskRevealBottom`, `maskRevealCenter`
- Texto: `splitText` (plugin SplitText si está disponible), `animateLetters`, `animateWords`, `animateLines` — con `data-split-type`, `data-split-animation`, `data-stagger` según corresponda

La duración por defecto en ms puede tomarse de `gsapAnimationsConfig.globalAnimationSpeed` cuando el elemento no define la suya.

### Animaciones ligadas al scroll (`gsap-scroll-linked`)

Clase `gsap-scroll-linked` + `data-scroll-animation` y atributos según tipo. Tipos en `ScrollLinkedTypes`:

| `data-scroll-animation` | Notas |
|-------------------------|--------|
| `progress` | Fade + movimiento vertical. |
| `parallaxY` / `parallaxX` | `data-parallax-distance` (por defecto 100). |
| `rotate` | `data-rotation` (grados). |
| `scale` | `data-start-scale`, `data-end-scale`. |
| `fade` | Opacidad. |
| `color` | `data-start-color`, `data-end-color`. |

---

## API global en navegador (extensión)

Expuesto en **`window.GSAPAnimations`** (final de `gsap-animations.js`):

| Miembro | Uso |
|---------|-----|
| `manager` | Instancia interna (`AnimationManager`). |
| `config` | Opciones runtime (offsets, duración por defecto, clases). |
| `addAnimationType(name, fn)` | Registrar un tipo adicional `(timeline, element, options) => void`. |
| `addScrollLinkedType(name, fn)` | Registrar tipo scroll-linked. |

Útil para temas child o plugins que quieran ampliar animaciones sin editar el core del archivo (con precaución por orden de carga).

---

## CSS de animaciones (`gsap-animations.css`)

- **`#mfn-ss-scroll-bundle`:** ancho 100 % para el envoltorio de ScrollSmoother.
- **Visibilidad inicial** en tipos de texto fragmentado para evitar FOUC hasta `data-gsap-processed`.
- **Opacidad 1** en wrappers de split/letters/words/lines cuando el movimiento va en subelementos.
- **Opacidad 0 inicial** en fades / slides / scale / rotate de entrada controlados por GSAP.
- **Máscaras:** estados iniciales de `clip-path` / `-webkit-clip-path` alineados con los tipos `maskReveal*`.
- Reglas que **anulan animaciones CSS legacy** del tema en elementos ya gestionados por GSAP (evita doble animación).

---

## Override `class-mfn-builder-front.php` (PHP)

Función pública **`betheme_plus_resolve_split_text_animation( $attr )`**

- Prioriza **`split_text_animation_style`** (select unificado BeTheme Plus).
- Compatibilidad con esquema antiguo por categorías (`fade`, `perspective`, `hidden`, `blur` + campos auxiliares).
- Residual: `split_text_animation` si no hay estilo unificado.

La salida alimenta **`data-split-animation`** en wraps e ítems.

También añade clases/atributos para **GSAP** (p. ej. `gsap-animate`, animación de sección en advanced, `data-speed`/`data-lag` para ScrollSmoother por elemento). El archivo es muy grande; para el detalle exacto de cada wrap/ítem, buscar en el propio PHP términos como `scroll_smoother_enable`, `split_text_`, `section-animate`, `gsap-animate`.

---

## Override `class-mfn-builder-fields.php`

Contiene la definición de campos del BeBuilder/Muffin Builder **sustituyendo** la del tema. Incluye controles extra (animaciones GSAP, split text unificado, scroll smoother por elemento, etc.). Tras **cualquier cambio sustancial** en estos campos, suele ser necesario **regenerar el bundle JS** (siguiente sección).

---

## BeBuilder: parche de condiciones (`bebuilder-conditions-fix.js`)

**Problema que mitiga:** `mfnoptsinputs.showhidefields` leía valores del **primer** campo coincidente en el DOM en lugar del formulario del elemento en edición.

**Solución:** reemplazo de la función con:

- Ámbito acotado al `.mfn-element-fields-wrapper` / formulario BeBuilder.
- Lectura coherente de valores en segmentados, visuales y campos condicionales.

Se encola **después** de `mfn-vbscripts` y también en el hook `mfn_footer_enqueue` (el VB no usa solo `wp_enqueue_scripts`).

---

## Herramienta “Bundle de BeBuilder” (admin)

- **Menú:** `Herramientas → BeBuilder bundle` (slug `betheme-plus-bebuilder`).
- **Acción:** llama a `Mfn_Helper::generate_bebuilder_items()` para volver a generar `visual-builder/assets/js/forms/bebuilder-{MFN_THEME_VERSION}.js`.

**Capacidad WordPress:**

```php
apply_filters('betheme_plus_regenerate_bebuilder_cap', 'manage_options');
```

Tras regenerar, se recomienda **recarga fuerte** del Visual Builder.

---

## Avisos y text domain

- Si BeTheme **no** está activo/se cargan opciones antes de `functions.php`: aviso **`admin_notices`** indicando dependencia del tema (mensaje texto `base`).
- **`load_plugin_textdomain`:** dominio **`base`**, carpeta `languages/` del plugin.

---

## Notas para integrar este Markdown en una página del plugin

1. **Lectura directa:** en un callback de `add_menu_page` / `add_submenu_page`, leer `BETHEME_PLUS_PATH . 'docs/DESARROLLADORES.md'` y convertir Markdown a HTML (librería Composer, Parsedown, o servidor de documentación externo).
2. **Sincronización:** mantener una sola fuente (`docs/DESARROLLADORES.md`) y evitar duplicar bloques grandes en PHP; si WP no tiene parser Markdown, se puede incluir HTML generado en build o un archivo `admin-doc.html` generado desde CI.
3. **Permisos:** alinear la capacidad de la nueva página con `manage_options` o la misma que `betheme_plus_regenerate_bebuilder_cap` si el contenido es solo para administradores.

---

## Cambios futuros recomendados (fuera del alcance actual)

- Registrar una **subpágina oficial** “Documentación” bajo Betheme Plus o Herramientas consumiendo este archivo.
- Versionar este documento en el mismo bump de `Version:` del plugin para trazabilidad.

---

*Última revisión alineada con las capacidades del código en el repositorio del plugin Betheme Plus.*
