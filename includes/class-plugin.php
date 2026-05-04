<?php
declare(strict_types=1);

namespace Base\BethemePlus;

defined('ABSPATH') || exit;

require_once BETHEME_PLUS_PATH . 'includes/integrations/class-betheme-options.php';
require_once BETHEME_PLUS_PATH . 'includes/integrations/class-builder-overrides.php';
require_once BETHEME_PLUS_PATH . 'includes/integrations/class-bebuilder-conditions-fix.php';
require_once BETHEME_PLUS_PATH . 'includes/integrations/class-bebuilder-field-bundle.php';
require_once BETHEME_PLUS_PATH . 'includes/frontend/class-assets.php';
require_once BETHEME_PLUS_PATH . 'includes/frontend/class-dynamic-css.php';

final class Plugin
{
    public static function boot(): void
    {
        add_action('plugins_loaded', [self::class, 'loadTextdomain']);
        // Must be registered as early as possible so BeTheme loads the overridden builder fields file.
        (new Integrations\BuilderOverrides())->register();
        /*
         * Theme options: Betheme builds $sections inside mfn_opts_setup() during functions.php load,
         * BEFORE after_setup_theme. The filter must therefore be registered on plugins_loaded.
         */
        add_action('plugins_loaded', [self::class, 'registerThemeOptionsSections'], 1);
        add_action('after_setup_theme', [self::class, 'registerModules'], 20);
        add_action('admin_notices', [self::class, 'renderDependencyNotice']);
    }

    public static function registerModules(): void
    {
        if (!self::isBeThemeAvailable()) {
            return;
        }

        (new Integrations\BebuilderConditionsFix())->register();
        (new Integrations\BebuilderFieldBundle())->register();
        (new Frontend\Assets())->register();
        (new Frontend\DynamicCss())->register();
    }

    public static function loadTextdomain(): void
    {
        load_plugin_textdomain('base', false, dirname(plugin_basename(BETHEME_PLUS_FILE)) . '/languages');
    }

    public static function registerThemeOptionsSections(): void
    {
        if (!self::isBethemeActiveTemplate()) {
            return;
        }

        (new Integrations\BeThemeOptions())->register();
    }

    /** Parent template slug (handles child themes of Betheme). */
    private static function isBethemeActiveTemplate(): bool
    {
        return function_exists('wp_get_theme') && wp_get_theme()->get_template() === 'betheme';
    }

    public static function isBeThemeAvailable(): bool
    {
        return function_exists('mfn_opts_get');
    }

    public static function renderDependencyNotice(): void
    {
        if (!is_admin() || self::isBeThemeAvailable()) {
            return;
        }

        echo '<div class="notice notice-warning"><p>';
        echo esc_html__('Betheme Plus requires BeTheme to be active. Plugin features are currently disabled.', 'base');
        echo '</p></div>';
    }
}
