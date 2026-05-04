<?php

declare(strict_types=1);

namespace Base\BethemePlus\Integrations;

defined('ABSPATH') || exit;

/**
 * BeBuilder sidebar fields come from a generated JS file (bebuilder-VERSION.js).
 */
final class BebuilderFieldBundle
{
    private const MENU_SLUG = 'betheme-plus-bebuilder';

    public function register(): void
    {
        add_action('admin_menu', [$this, 'registerAdminMenu']);
        add_action('admin_post_betheme_plus_regenerate_bebuilder', [$this, 'handleRegeneratePost']);
    }

    public function registerAdminMenu(): void
    {
        if (! $this->userCanRegenerate()) {
            return;
        }

        add_management_page(
            __('Betheme Plus — BeBuilder', 'base'),
            __('BeBuilder bundle', 'base'),
            $this->requiredCapability(),
            self::MENU_SLUG,
            [$this, 'renderToolsPage']
        );
    }

    /**
     * @psalm-return non-falsy-string
     */
    private function requiredCapability(): string
    {
        return apply_filters('betheme_plus_regenerate_bebuilder_cap', 'manage_options');
    }

    private function userCanRegenerate(): bool
    {
        return current_user_can($this->requiredCapability());
    }

    public function handleRegeneratePost(): void
    {
        if (! $this->userCanRegenerate()) {
            wp_die(esc_html__('Permisos insuficientes.', 'base'), '', ['response' => 403]);
        }

        check_admin_referer('betheme_plus_regenerate_bebuilder');

        $result = $this->regenerate();

        wp_safe_redirect(
            add_query_arg(
                [
                    'page' => self::MENU_SLUG,
                    'betheme_plus_bebuilder' => $result ? 'ok' : 'fail',
                ],
                admin_url('tools.php')
            )
        );
        exit;
    }

    /**
     * Regenera visual-builder/assets/js/forms/bebuilder-{MFN_THEME_VERSION}.js desde PHP.
     */
    public function regenerate(): bool
    {
        if (! class_exists('Mfn_Helper') || ! method_exists('Mfn_Helper', 'generate_bebuilder_items')) {
            return false;
        }

        return (bool) \Mfn_Helper::generate_bebuilder_items();
    }

    public function renderToolsPage(): void
    {
        if (! $this->userCanRegenerate()) {
            wp_die(esc_html__('Permisos insuficientes.', 'base'), '', ['response' => 403]);
        }

        $url = wp_nonce_url(
            admin_url('admin-post.php?action=betheme_plus_regenerate_bebuilder'),
            'betheme_plus_regenerate_bebuilder'
        );

        echo '<div class="wrap">';
        echo '<h1>' . esc_html__('Bundle de campos de BeBuilder', 'base') . '</h1>';

        if (! empty($_GET['betheme_plus_bebuilder'])) {
            if ($_GET['betheme_plus_bebuilder'] === 'ok') {
                echo '<div class="notice notice-success is-dismissible"><p>';
                echo esc_html__('Bundle regenerado correctamente. Abre BeBuilder y recarga con Ctrl+F5 (o Cmd+Shift+R) para ver los campos nuevos.', 'base');
                echo '</p></div>';
            } elseif ($_GET['betheme_plus_bebuilder'] === 'fail') {
                echo '<div class="notice notice-error is-dismissible"><p>';
                echo esc_html__('No se pudo regenerar. Comprueba que Betheme esté activo, que tengas acceso a BeBuilder (opciones de visibilidad del builder) y que el tema esté registrado si el tema lo exige.', 'base');
                echo '</p></div>';
            }
        }

        echo '<p class="description">';
        echo esc_html__(
            'El lateral de BeBuilder no lee el PHP en cada carga: usa un archivo generado (bebuilder-VERSIÓN.js). Después de cambiar campos en el tema o en Betheme Plus, regenera ese archivo. También puedes guardar las opciones de Betheme para forzar la misma acción.',
            'base'
        );
        echo '</p>';
        echo '<p>';
        printf(
            '<a class="button button-primary button-hero" href="%s">%s</a>',
            esc_url($url),
            esc_html__('Regenerar bundle de BeBuilder ahora', 'base')
        );
        echo '</p>';
        echo '</div>';
    }
}
