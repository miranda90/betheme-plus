<?php
declare(strict_types=1);

namespace Base\BeThemeGsap\Frontend;

defined('ABSPATH') || exit;

final class Assets
{
    public function register(): void
    {
        add_action('wp_enqueue_scripts', [$this, 'enqueueFrontendAssets'], 101);
    }

    public function enqueueFrontendAssets(): void
    {
        wp_enqueue_script('base-bgsap-gsap', 'https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist/gsap.min.js', [], '3.14.1', true);
        wp_enqueue_script('base-bgsap-scrolltrigger', 'https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist/ScrollTrigger.min.js', ['base-bgsap-gsap'], '3.14.1', true);
        wp_enqueue_script('base-bgsap-scrollsmoother', 'https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist/ScrollSmoother.min.js', ['base-bgsap-gsap', 'base-bgsap-scrolltrigger'], '3.14.1', true);

        wp_enqueue_script(
            'base-bgsap-animations',
            BASE_BGSAP_URL . 'assets/js/gsap-animations.js',
            ['base-bgsap-gsap', 'base-bgsap-scrolltrigger', 'base-bgsap-scrollsmoother'],
            BASE_BGSAP_VERSION,
            true
        );

        wp_script_add_data('base-bgsap-gsap', 'defer', false);
        wp_script_add_data('base-bgsap-scrolltrigger', 'defer', false);
        wp_script_add_data('base-bgsap-scrollsmoother', 'defer', false);

        $globalAnimationSpeed = (int) mfn_opts_get('gsap-animation-speed', 300);
        $scrollSmoother = (int) mfn_opts_get('scroll-smoother', 0);

        wp_localize_script(
            'base-bgsap-animations',
            'gsapAnimationsConfig',
            [
                'globalAnimationSpeed' => $globalAnimationSpeed,
                'scrollSmoother' => $scrollSmoother,
            ]
        );
    }
}
