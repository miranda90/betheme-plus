<?php
declare(strict_types=1);

namespace Base\BeThemeGsap;

defined('ABSPATH') || exit;

require_once BASE_BGSAP_PATH . 'includes/integrations/class-betheme-options.php';
require_once BASE_BGSAP_PATH . 'includes/frontend/class-assets.php';
require_once BASE_BGSAP_PATH . 'includes/frontend/class-dynamic-css.php';

final class Plugin
{
    public static function boot(): void
    {
        add_action('plugins_loaded', [self::class, 'loadTextdomain']);
        add_action('admin_notices', [self::class, 'renderDependencyNotice']);

        if (!self::isBeThemeAvailable()) {
            return;
        }

        (new Integrations\BeThemeOptions())->register();
        (new Frontend\Assets())->register();
        (new Frontend\DynamicCss())->register();
    }

    public static function loadTextdomain(): void
    {
        load_plugin_textdomain('base', false, dirname(plugin_basename(BASE_BGSAP_FILE)) . '/languages');
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
        echo esc_html__('Base BeTheme GSAP requires BeTheme to be active. Plugin features are currently disabled.', 'base');
        echo '</p></div>';
    }
}
