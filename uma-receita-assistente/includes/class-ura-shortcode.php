<?php
if (!defined('ABSPATH')) {
    exit;
}

class URA_Shortcode {
    private $assets;

    public function __construct(URA_Assets $assets) {
        $this->assets = $assets;
        add_shortcode('uma_receita_assistente', array($this, 'render'));
    }

    public function render($atts = array()) {
        $atts = shortcode_atts(array(), $atts, 'uma_receita_assistente');
        $this->assets->require_shortcode_assets();

        return '<div id="uma-receita-assistant" class="ura-assistente-mount"></div>';
    }
}

