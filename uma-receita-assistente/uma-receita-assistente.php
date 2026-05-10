<?php
/**
 * Plugin Name: Uma Receita — Assistente de Receitas
 * Description: Assistente de receitas baseado nas receitas WPRM publicadas no site Uma Receita.
 * Version: 1.1.0
 * Author: Uma Receita
 * Text Domain: uma-receita-assistente
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit;
}

define('URA_ASSISTENTE_VERSION', '1.1.0');
define('URA_ASSISTENTE_FILE', __FILE__);
define('URA_ASSISTENTE_DIR', plugin_dir_path(__FILE__));
define('URA_ASSISTENTE_URL', plugin_dir_url(__FILE__));
define('URA_ASSISTENTE_CACHE_KEY', 'ura_assistente_receitas_v1');

require_once URA_ASSISTENTE_DIR . 'includes/class-ura-assets.php';
require_once URA_ASSISTENTE_DIR . 'includes/class-ura-shortcode.php';
require_once URA_ASSISTENTE_DIR . 'includes/class-ura-rest.php';
require_once URA_ASSISTENTE_DIR . 'includes/class-ura-admin.php';

function ura_assistente_bootstrap() {
    if ('Tenho ingredientes. O que faço?' === get_option('ura_assistente_floating_text')) {
        update_option('ura_assistente_floating_text', 'Precisa de uma ideia?');
    }

    $assets = new URA_Assets();
    new URA_Shortcode($assets);
    new URA_Rest();
    new URA_Admin();
}
add_action('plugins_loaded', 'ura_assistente_bootstrap');

register_activation_hook(__FILE__, function () {
    add_option('ura_assistente_floating_mode', 'disabled');
    add_option('ura_assistente_floating_text', 'Precisa de uma ideia?');
});

register_deactivation_hook(__FILE__, function () {
    delete_transient(URA_ASSISTENTE_CACHE_KEY);
});
