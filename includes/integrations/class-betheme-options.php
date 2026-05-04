<?php
declare(strict_types=1);

namespace Base\BethemePlus\Integrations;

defined('ABSPATH') || exit;

final class BeThemeOptions
{
    public function register(): void
    {
        add_filter('mfn-theme-options-sections', [$this, 'extendSections']);
    }

    /**
     * @param array<string, mixed> $sections
     * @return array<string, mixed>
     */
    public function extendSections(array $sections): array
    {
        if (isset($sections['advanced']['fields']) && is_array($sections['advanced']['fields'])) {
            $sections['advanced']['fields'][] = [
                'type' => 'header',
                'title' => __('Animations', 'mfn-opts'),
                'join' => true,
            ];

            $sections['advanced']['fields'][] = [
                'id' => 'gsap-animation-speed',
                'type' => 'sliderbar',
                'title' => __('Animation speed', 'mfn-opts'),
                'desc' => __('Default animation speed for GSAP animations. This value will be used when an element does not have a specific animation speed configured.', 'mfn-opts'),
                'param' => [
                    'min' => 50,
                    'max' => 2000,
                    'step' => 50,
                ],
                'after' => 'ms',
                'std' => 300,
            ];

            $sections['advanced']['fields'][] = [
                'type' => 'header',
                'title' => __('Scroll Smoother', 'mfn-opts'),
                'join' => true,
            ];

            $sections['advanced']['fields'][] = [
                'id' => 'scroll-smoother',
                'type' => 'switch',
                'title' => __('Scroll Smoother', 'mfn-opts'),
                'desc' => __('Enable scroll smoother for the website.', 'mfn-opts'),
                'options' => [
                    '1' => __('Enable', 'mfn-opts'),
                    '0' => __('Disable', 'mfn-opts'),
                ],
            ];
        }

        if (isset($sections['general']['fields']) && is_array($sections['general']['fields'])) {
            $sections['general']['fields'][] = [
                'type' => 'header',
                'title' => __('Scrollbar', 'mfn-opts'),
                'join' => true,
            ];

            $sections['general']['fields'][] = [
                'id' => 'scrollbar-track-color',
                'type' => 'color',
                'title' => __('Track color', 'mfn-opts'),
                'desc' => __('Background color of the scrollbar track', 'mfn-opts'),
                'alpha' => true,
                'std' => '#f1f1f1',
            ];

            $sections['general']['fields'][] = [
                'id' => 'scrollbar-thumb-color',
                'type' => 'color',
                'title' => __('Thumb color', 'mfn-opts'),
                'desc' => __('Color of the scrollbar thumb', 'mfn-opts'),
                'alpha' => true,
                'std' => '#888888',
            ];
        }

        return $sections;
    }
}
