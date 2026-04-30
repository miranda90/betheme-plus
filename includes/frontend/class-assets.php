<?php
declare(strict_types=1);

namespace Base\BethemePlus\Frontend;

defined('ABSPATH') || exit;

final class Assets
{
    public function register(): void
    {
        add_action('wp_enqueue_scripts', [$this, 'enqueueFrontendAssets'], 101);
    }

    public function enqueueFrontendAssets(): void
    {
        wp_enqueue_style(
            'betheme-plus-animations',
            BETHEME_PLUS_URL . 'assets/css/gsap-animations.css',
            [],
            BETHEME_PLUS_VERSION
        );

        wp_enqueue_script('betheme-plus-gsap', 'https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist/gsap.min.js', [], '3.14.1', true);
        wp_enqueue_script('betheme-plus-scrolltrigger', 'https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist/ScrollTrigger.min.js', ['betheme-plus-gsap'], '3.14.1', true);
        wp_enqueue_script('betheme-plus-scrollsmoother', 'https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist/ScrollSmoother.min.js', ['betheme-plus-gsap', 'betheme-plus-scrolltrigger'], '3.14.1', true);

        wp_enqueue_script(
            'betheme-plus-animations',
            BETHEME_PLUS_URL . 'assets/js/gsap-animations.js',
            ['betheme-plus-gsap', 'betheme-plus-scrolltrigger', 'betheme-plus-scrollsmoother'],
            BETHEME_PLUS_VERSION,
            true
        );

        wp_script_add_data('betheme-plus-gsap', 'defer', false);
        wp_script_add_data('betheme-plus-scrolltrigger', 'defer', false);
        wp_script_add_data('betheme-plus-scrollsmoother', 'defer', false);

        $globalAnimationSpeed = (int) mfn_opts_get('gsap-animation-speed', 300);
        $scrollSmoother = (int) mfn_opts_get('scroll-smoother', 0);

        wp_localize_script(
            'betheme-plus-animations',
            'gsapAnimationsConfig',
            [
                'globalAnimationSpeed' => $globalAnimationSpeed,
                'scrollSmoother' => $scrollSmoother,
            ]
        );
    }
}
