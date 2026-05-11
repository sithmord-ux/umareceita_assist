<?php
if (!defined('ABSPATH')) {
    exit;
}

class URA_Admin {
    public function __construct() {
        add_action('admin_menu', array($this, 'add_menu_page'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('admin_post_ura_assistente_clear_cache', array($this, 'clear_cache'));
    }

    public function add_menu_page() {
        add_options_page(
            __('Uma Receita Assistente', 'uma-receita-assistente'),
            __('Uma Receita Assistente', 'uma-receita-assistente'),
            'manage_options',
            'uma-receita-assistente',
            array($this, 'render_page')
        );
    }

    public function register_settings() {
        register_setting('ura_assistente_settings', 'ura_assistente_floating_mode', array(
            'type' => 'string',
            'sanitize_callback' => array($this, 'sanitize_floating_mode'),
            'default' => 'disabled',
        ));

        register_setting('ura_assistente_settings', 'ura_assistente_floating_text', array(
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => 'Precisa de uma ideia?',
        ));
    }

    public function sanitize_floating_mode($value) {
        $value = sanitize_key($value);
        return in_array($value, array('disabled', 'wprm', 'all'), true) ? $value : 'disabled';
    }

    public function render_page() {
        if (!current_user_can('manage_options')) {
            return;
        }

        $mode = sanitize_key(get_option('ura_assistente_floating_mode', 'disabled'));
        $text = sanitize_text_field(get_option('ura_assistente_floating_text', 'Precisa de uma ideia?'));
        ?>
        <div class="wrap">
            <h1><?php echo esc_html__('Uma Receita — Assistente de Receitas', 'uma-receita-assistente'); ?></h1>
            <form method="post" action="options.php">
                <?php settings_fields('ura_assistente_settings'); ?>
                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="ura_assistente_floating_mode"><?php echo esc_html__('Botão flutuante', 'uma-receita-assistente'); ?></label></th>
                        <td>
                            <select id="ura_assistente_floating_mode" name="ura_assistente_floating_mode">
                                <option value="disabled" <?php selected($mode, 'disabled'); ?>><?php echo esc_html__('Desactivado', 'uma-receita-assistente'); ?></option>
                                <option value="wprm" <?php selected($mode, 'wprm'); ?>><?php echo esc_html__('Apenas posts com WPRM', 'uma-receita-assistente'); ?></option>
                                <option value="all" <?php selected($mode, 'all'); ?>><?php echo esc_html__('Todos os posts', 'uma-receita-assistente'); ?></option>
                            </select>
                            <p class="description"><?php echo esc_html__('Está desligado por defeito e nunca abre automaticamente.', 'uma-receita-assistente'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="ura_assistente_floating_text"><?php echo esc_html__('Texto do botão flutuante', 'uma-receita-assistente'); ?></label></th>
                        <td>
                            <input id="ura_assistente_floating_text" class="regular-text" type="text" name="ura_assistente_floating_text" value="<?php echo esc_attr($text); ?>" />
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>

            <hr />
            <h2><?php echo esc_html__('Cache de receitas', 'uma-receita-assistente'); ?></h2>
            <p><?php echo esc_html__('O endpoint guarda as receitas em cache durante 6 horas para melhorar a performance.', 'uma-receita-assistente'); ?></p>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <input type="hidden" name="action" value="ura_assistente_clear_cache" />
                <?php wp_nonce_field('ura_assistente_clear_cache'); ?>
                <?php submit_button(__('Limpar cache de receitas', 'uma-receita-assistente'), 'secondary'); ?>
            </form>
        </div>
        <?php
    }

    public function clear_cache() {
        if (!current_user_can('manage_options')) {
            wp_die(esc_html__('Sem permissões suficientes.', 'uma-receita-assistente'));
        }

        check_admin_referer('ura_assistente_clear_cache');
        delete_transient(URA_ASSISTENTE_CACHE_KEY);
        wp_safe_redirect(add_query_arg('ura_cache_cleared', '1', wp_get_referer() ? wp_get_referer() : admin_url('options-general.php?page=uma-receita-assistente')));
        exit;
    }
}
