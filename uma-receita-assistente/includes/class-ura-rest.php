<?php
if (!defined('ABSPATH')) {
    exit;
}

class URA_Rest {
    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
        add_action('save_post_wprm_recipe', array($this, 'clear_cache'));
        add_action('deleted_post', array($this, 'clear_cache'));
    }

    public function register_routes() {
        register_rest_route('uma-receita/v1', '/receitas', array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => array($this, 'get_recipes'),
            'permission_callback' => '__return_true',
        ));
    }

    public function get_recipes(WP_REST_Request $request) {
        $cached = get_transient(URA_ASSISTENTE_CACHE_KEY);
        if (false !== $cached && is_array($cached)) {
            return rest_ensure_response($cached);
        }

        $recipes = array();
        $query = new WP_Query(array(
            'post_type' => 'wprm_recipe',
            'post_status' => 'publish',
            'posts_per_page' => 150,
            'orderby' => 'date',
            'order' => 'DESC',
            'no_found_rows' => true,
            'ignore_sticky_posts' => true,
        ));

        if ($query->have_posts()) {
            foreach ($query->posts as $post) {
                $recipe = $this->format_recipe($post);
                if (!empty($recipe['ingredients'])) {
                    $recipes[] = $recipe;
                }
            }
        }
        wp_reset_postdata();

        set_transient(URA_ASSISTENTE_CACHE_KEY, $recipes, 6 * HOUR_IN_SECONDS);
        return rest_ensure_response($recipes);
    }

    public function clear_cache() {
        delete_transient(URA_ASSISTENTE_CACHE_KEY);
    }

    private function format_recipe(WP_Post $post) {
        $post_id = absint($post->ID);
        $image = get_the_post_thumbnail_url($post_id, 'medium_large');

        return array(
            'id' => $post_id,
            'title' => html_entity_decode(get_the_title($post_id), ENT_QUOTES, get_bloginfo('charset')),
            'link' => get_permalink($post_id),
            'image' => $image ? esc_url_raw($image) : '',
            'ingredients' => $this->get_ingredients($post_id),
            'categories' => $this->get_terms($post_id),
            'servings' => $this->get_servings($post_id),
        );
    }

    private function get_ingredients($post_id) {
        $post_id = absint($post_id);
        $possible_keys = array(
            'wprm_ingredients',
            '_wprm_ingredients',
            'wprm_recipe_ingredients',
            '_wprm_recipe_ingredients',
            'recipe_ingredients',
            '_recipe_ingredients',
        );

        $ingredients = array();
        foreach ($possible_keys as $key) {
            $value = get_post_meta($post_id, $key, true);
            $this->collect_ingredients($value, $ingredients);
        }

        if (empty($ingredients)) {
            $all_meta = get_post_meta($post_id);
            foreach ($all_meta as $key => $values) {
                if (false === stripos($key, 'ingredient')) {
                    continue;
                }
                foreach ((array) $values as $value) {
                    $this->collect_ingredients(maybe_unserialize($value), $ingredients);
                }
            }
        }

        $ingredients = array_map('sanitize_text_field', $ingredients);
        $ingredients = array_values(array_unique(array_filter($ingredients)));

        return $ingredients;
    }

    private function collect_ingredients($value, array &$ingredients) {
        if (empty($value)) {
            return;
        }

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (JSON_ERROR_NONE === json_last_error() && is_array($decoded)) {
                $this->collect_ingredients($decoded, $ingredients);
                return;
            }

            $unserialized = maybe_unserialize($value);
            if (is_array($unserialized)) {
                $this->collect_ingredients($unserialized, $ingredients);
                return;
            }

            $clean = sanitize_text_field(wp_strip_all_tags($value));
            if ('' !== $clean && strlen($clean) < 160) {
                $ingredients[] = $clean;
            }
            return;
        }

        if (!is_array($value)) {
            return;
        }

        foreach ($value as $item) {
            if (is_array($item)) {
                if (isset($item['ingredients'])) {
                    $this->collect_ingredients($item['ingredients'], $ingredients);
                    continue;
                }

                foreach (array('ingredient', 'name', 'text', 'raw') as $field) {
                    if (!empty($item[$field]) && is_string($item[$field])) {
                        $ingredients[] = sanitize_text_field(wp_strip_all_tags($item[$field]));
                        continue 2;
                    }
                }

                $this->collect_ingredients($item, $ingredients);
            } elseif (is_string($item)) {
                $clean = sanitize_text_field(wp_strip_all_tags($item));
                if ('' !== $clean && strlen($clean) < 160) {
                    $ingredients[] = $clean;
                }
            }
        }
    }

    private function get_terms($post_id) {
        $taxonomies = array('category', 'post_tag', 'wprm_course', 'wprm_cuisine', 'wprm_keyword', 'wprm_ingredient');
        $terms = array();

        foreach ($taxonomies as $taxonomy) {
            if (!taxonomy_exists($taxonomy)) {
                continue;
            }

            $recipe_terms = get_the_terms(absint($post_id), $taxonomy);
            if (is_wp_error($recipe_terms) || empty($recipe_terms)) {
                continue;
            }

            foreach ($recipe_terms as $term) {
                $terms[] = sanitize_text_field($term->name);
            }
        }

        return array_values(array_unique(array_filter($terms)));
    }

    private function get_servings($post_id) {
        $keys = array('wprm_servings', '_wprm_servings', 'wprm_recipe_servings', '_wprm_recipe_servings');
        foreach ($keys as $key) {
            $value = absint(get_post_meta(absint($post_id), $key, true));
            if ($value > 0) {
                return $value;
            }
        }
        return 0;
    }
}
