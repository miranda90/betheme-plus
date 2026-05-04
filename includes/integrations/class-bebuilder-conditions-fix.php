<?php

declare(strict_types=1);

namespace Base\BethemePlus\Integrations;

defined('ABSPATH') || exit;

/**
 * Monkey-patch faulty compound condition value reads in Visual Builder scripts.js (mfnoptsinputs).
 *
 * BeBuilder en admin encola scripts con do_action('mfn_footer_enqueue'), no solo wp_enqueue_scripts
 * (ver visual-builder.php → mfnvb_init_vb + visual-builder-footer.php).
 */
final class BebuilderConditionsFix
{
    public function register(): void
    {
        add_action('wp_enqueue_scripts', [$this, 'enqueuePatch'], 1000);
        add_action('mfn_footer_enqueue', [$this, 'enqueuePatch'], 20);
    }

    public function enqueuePatch(): void
    {
        if (wp_script_is('betheme-plus-bebuilder-condition-fix', 'enqueued')) {
            return;
        }

        if (!wp_script_is('mfn-vbscripts', 'enqueued')) {
            return;
        }

        wp_enqueue_script(
            'betheme-plus-bebuilder-condition-fix',
            BETHEME_PLUS_URL . 'assets/js/bebuilder-conditions-fix.js',
            ['jquery', 'mfn-vbscripts'],
            BETHEME_PLUS_VERSION,
            true
        );
    }
}
