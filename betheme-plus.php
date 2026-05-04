<?php
declare(strict_types=1);

/**
 * Plugin Name: Betheme Plus
 * Description: BeTheme options extensions and GSAP animation runtime extracted from child theme.
 * Version: 1.1.8
 * Author: Base
 * Text Domain: base
 */

defined('ABSPATH') || exit;

define('BETHEME_PLUS_VERSION', '1.1.8');
define('BETHEME_PLUS_FILE', __FILE__);
define('BETHEME_PLUS_PATH', plugin_dir_path(__FILE__));
define('BETHEME_PLUS_URL', plugin_dir_url(__FILE__));

require_once BETHEME_PLUS_PATH . 'includes/class-plugin.php';

\Base\BethemePlus\Plugin::boot();
