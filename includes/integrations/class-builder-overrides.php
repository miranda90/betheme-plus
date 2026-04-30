<?php
declare(strict_types=1);

namespace Base\BethemePlus\Integrations;

defined('ABSPATH') || exit;

final class BuilderOverrides
{
    public function register(): void
    {
        add_filter('theme_file_path', [$this, 'overrideThemeFilePath'], 20, 2);
    }

    public function overrideThemeFilePath(string $path, string $file): string
    {
        $normalized = ltrim($file, '/');
        $overrides = [
            'functions/builder/class-mfn-builder-fields.php' => BETHEME_PLUS_PATH . 'includes/overrides/functions/builder/class-mfn-builder-fields.php',
            'functions/builder/class-mfn-builder-front.php' => BETHEME_PLUS_PATH . 'includes/overrides/functions/builder/class-mfn-builder-front.php',
        ];

        if (!isset($overrides[$normalized])) {
            return $path;
        }

        $overridePath = $overrides[$normalized];

        if (!file_exists($overridePath)) {
            return $path;
        }

        return $overridePath;
    }
}
