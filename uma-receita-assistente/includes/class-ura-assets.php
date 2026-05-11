<?php
if (!defined('ABSPATH')) {
    exit;
}

class URA_Assets {
    const SCRIPT_HANDLE = 'ura-recipe-assistant';
    const STYLE_HANDLE = 'ura-recipe-assistant';

    private $shortcode_required = false;
    private $floating_required = false;

    public function __construct() {
        add_action('wp_enqueue_scripts', array($this, 'maybe_enqueue_for_floating'));
        add_action('wp_footer', array($this, 'render_floating_mount'));
    }

    public function enqueue($source = 'shortcode', $mode = 'inline') {
        if (is_admin() || $this->is_blocked_screen()) {
            return;
        }

        $script_path = URA_ASSISTENTE_DIR . 'assets/recipe-assistant.js';
        $style_path  = URA_ASSISTENTE_DIR . 'assets/recipe-assistant.css';

        wp_enqueue_style(
            self::STYLE_HANDLE,
            URA_ASSISTENTE_URL . 'assets/recipe-assistant.css',
            array(),
            file_exists($style_path) ? filemtime($style_path) : URA_ASSISTENTE_VERSION
        );

        wp_enqueue_script(
            self::SCRIPT_HANDLE,
            URA_ASSISTENTE_URL . 'assets/recipe-assistant.js',
            array(),
            file_exists($script_path) ? filemtime($script_path) : URA_ASSISTENTE_VERSION,
            true
        );

        wp_localize_script(self::SCRIPT_HANDLE, 'URA_ASSISTENTE_CONFIG', array(
            'mount' => 'floating_button' === $source ? '#uma-receita-assistant-floating' : '#uma-receita-assistant',
            'endpoint' => esc_url_raw(rest_url('uma-receita/v1/receitas')),
            'nonce' => wp_create_nonce('wp_rest'),
            'siteUrl' => esc_url_raw(home_url('/')),
            'pluginUrl' => esc_url_raw(URA_ASSISTENTE_URL),
            'mode' => 'floating_button' === $source ? 'floating' : $mode,
            'source' => sanitize_key($source),
            'postId' => is_singular() ? absint(get_queried_object_id()) : 0,
            'floatingButtonText' => sanitize_text_field(get_option('ura_assistente_floating_text', 'Precisa de uma ideia?')),
        ));
    }

    public function require_shortcode_assets() {
        $this->shortcode_required = true;
        $this->enqueue('shortcode', 'inline');
    }

    public function maybe_enqueue_for_floating() {
        if (is_admin() || $this->is_blocked_screen()) {
            return;
        }

        $mode = sanitize_key(get_option('ura_assistente_floating_mode', 'disabled'));
        if ('disabled' === $mode || !is_singular('post')) {
            return;
        }

        if ('wprm' === $mode && !$this->current_post_has_wprm()) {
            return;
        }

        $this->floating_required = true;
        $this->enqueue('floating_button', 'floating');
    }

    public function render_floating_mount() {
        if (!$this->floating_required || is_admin()) {
            return;
        }

        echo '<div id="uma-receita-assistant-floating" class="ura-assistente-mount ura-assistente-floating-mount"></div>';
    }

    private function current_post_has_wprm() {
        $post_id = get_queried_object_id();
        if (!$post_id) {
            return false;
        }

        if ('wprm_recipe' === get_post_type($post_id)) {
            return true;
        }

        $content = (string) get_post_field('post_content', $post_id);
        if (has_shortcode($content, 'wprm-recipe') || false !== strpos($content, 'wprm-recipe')) {
            return true;
        }

        $meta_keys = array('_wprm_recipe_id', 'wprm_recipe_id', '_wprm_parent_post_id');
        foreach ($meta_keys as $meta_key) {
            if (get_post_meta($post_id, $meta_key, true)) {
                return true;
            }
        }

        $related = get_posts(array(
            'post_type' => 'wprm_recipe',
            'post_status' => 'publish',
            'fields' => 'ids',
            'posts_per_page' => 1,
            'meta_query' => array(
                array(
                    'key' => 'wprm_parent_post_id',
                    'value' => absint($post_id),
                    'compare' => '=',
                ),
            ),
        ));

        return !empty($related);
    }

    private function is_blocked_screen() {
        $uri = isset($_SERVER['REQUEST_URI']) ? sanitize_text_field(wp_unslash($_SERVER['REQUEST_URI'])) : '';
        return (false !== stripos($uri, 'checkout') || false !== stripos($uri, 'login'));
    }
}