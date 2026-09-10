<?php
declare(strict_types=1);

namespace Base\BethemePlus\Integrations;

defined('ABSPATH') || exit;

/**
 * Registers WordPress plugin updates from GitHub Releases.
 */
final class GitHubUpdater
{
    private const REPO_URL = 'https://github.com/miranda90/betheme-plus/';
    private const SLUG = 'betheme-plus';

    /** @var object|null */
    private static $checker = null;

    public function register(): void
    {
        if (null !== self::$checker) {
            return;
        }

        $loader = BETHEME_PLUS_PATH . 'includes/lib/plugin-update-checker/plugin-update-checker.php';

        if (!is_readable($loader)) {
            return;
        }

        require_once $loader;

        // Prefer GitHub Releases/tags over a branch so draft commits are not offered as updates.
        self::$checker = \YahnisElsts\PluginUpdateChecker\v5\PucFactory::buildUpdateChecker(
            self::REPO_URL,
            BETHEME_PLUS_FILE,
            self::SLUG,
        );
    }
}
