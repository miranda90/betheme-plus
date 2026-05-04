<?php
declare(strict_types=1);

namespace Base\BethemePlus\Frontend;

defined('ABSPATH') || exit;

final class DynamicCss
{
    public function register(): void
    {
        add_action('wp_head', [$this, 'renderScrollbarCss'], 99);
    }

    public function renderScrollbarCss(): void
    {
        $visual = isset($_GET['visual']) ? sanitize_text_field(wp_unslash((string) $_GET['visual'])) : '';
        if ($visual === 'iframe') {
            return;
        }

        $trackColor = (string) mfn_opts_get('scrollbar-track-color', '#f1f1f1');
        $thumbColor = (string) mfn_opts_get('scrollbar-thumb-color', '#888888');

        // Prefijo html para igualar la especificidad del child theme (Betheme/Base).
        $css = '/* Betheme Plus Scrollbar Styles */';
        $css .= 'html::-webkit-scrollbar-track{background:' . esc_attr($trackColor) . ';}';
        $css .= 'html::-webkit-scrollbar-thumb{background:' . esc_attr($thumbColor) . ';}';
        $css .= 'html{scrollbar-width:thin;scrollbar-color:' . esc_attr($thumbColor) . ' ' . esc_attr($trackColor) . ';}';

        echo '<style id="betheme-plus-scrollbar-css">' . wp_strip_all_tags($css) . '</style>';
    }
}
