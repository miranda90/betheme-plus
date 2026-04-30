<?php
declare(strict_types=1);

/**
 * Plugin Name: Base BeTheme GSAP
 * Description: BeTheme options extensions and GSAP animation runtime extracted from child theme.
 * Version: 1.0.0
 * Author: Base
 * Text Domain: base
 */

defined('ABSPATH') || exit;

define('BASE_BGSAP_VERSION', '1.0.0');
define('BASE_BGSAP_FILE', __FILE__);
define('BASE_BGSAP_PATH', plugin_dir_path(__FILE__));
define('BASE_BGSAP_URL', plugin_dir_url(__FILE__));

require_once BASE_BGSAP_PATH . 'includes/class-plugin.php';

\Base\BeThemeGsap\Plugin::boot();
