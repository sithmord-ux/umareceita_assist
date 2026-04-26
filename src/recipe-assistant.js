(function () {
  const CATEGORY_KEYWORDS = {
    carne: [
      'carne',
      'frango',
      'vaca',
      'porco',
      'peru',
      'novilho',
      'bife',
      'entrecosto',
      'chouriço',
      'presunto'
    ],
    peixe: ['peixe', 'salmão', 'atum', 'bacalhau', 'dourada', 'robalo', 'sardinha', 'camarão'],
    vegetariano: ['tofu', 'lentilhas', 'grão', 'feijão', 'cogumelos', 'espinafres', 'courgette'],
    doce: ['chocolate', 'açúcar', 'natas', 'baunilha', 'canela', 'leite condensado'],
    sobremesa: ['chocolate', 'açúcar', 'natas', 'baunilha', 'canela', 'gelatina']
  };

  const SWEET_INGREDIENTS = ['chocolate', 'açúcar', 'natas', 'baunilha', 'caramelo', 'bolacha'];

  function normalizeText(value) {
    return (value || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function unique(items) {
    return [...new Set(items)];
  }

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    return [value];
  }

  function parseIngredientInput(input) {
    return unique(
      input
        .split(',')
        .map((item) => normalizeText(item))
        .filter(Boolean)
    );
  }

  function parseWprmIngredientItem(item) {
    if (!item) return null;
    if (typeof item === 'string') return normalizeText(item);
    const source = item.ingredient || item.name || item.text || item.raw || '';
    return normalizeText(source);
  }

  function flattenWprmIngredients(rawIngredients) {
    const list = [];
    const sections = asArray(rawIngredients);

    sections.forEach((section) => {
      if (!section) return;

      if (Array.isArray(section.ingredients)) {
        section.ingredients.forEach((item) => {
          const parsed = parseWprmIngredientItem(item);
          if (parsed) list.push(parsed);
        });
        return;
      }

      if (Array.isArray(section)) {
        section.forEach((item) => {
          const parsed = parseWprmIngredientItem(item);
          if (parsed) list.push(parsed);
        });
        return;
      }

      const parsed = parseWprmIngredientItem(section);
      if (parsed) list.push(parsed);
    });

    return unique(list);
  }

  function defaultMapRecipe(raw) {
    const title = raw?.title?.rendered || raw?.title || 'Receita';
    const link = raw?.link || raw?.url || '#';

    const image =
      raw?.hero_image ||
      raw?.image ||
      raw?._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
      '';

    let rawIngredients =
      raw?.recipe?.ingredients ||
      raw?.ingredients ||
      raw?.wprm_ingredients ||
      raw?.meta?._wprm_ingredients ||
      [];

    if (typeof rawIngredients === 'string') {
      try {
        rawIngredients = JSON.parse(rawIngredients);
      } catch (e) {
        rawIngredients = rawIngredients.split(',');
      }
    }

    const ingredients = flattenWprmIngredients(rawIngredients);

    const categoryBag = [
      ...(raw?.categories || []),
      ...(raw?.tags || []),
      ...(raw?.wprm_course || []),
      ...(raw?.wprm_cuisine || [])
    ]
      .map((c) => (typeof c === 'string' ? c : c?.name || ''))
      .filter(Boolean)
      .map(normalizeText);

    const servings = Number(raw?.servings || raw?.recipe?.servings || 0);

    return {
      id: raw?.id || Math.random(),
      title,
      link,
      image,
      ingredients,
      categories: unique(categoryBag),
      servings: Number.isFinite(servings) ? servings : 0
    };
  }

  function containsAny(words, candidates) {
    return words.some((word) => candidates.some((c) => c.includes(word) || word.includes(c)));
  }

  function categoryLooksIncompatible(selectedCategory, userIngredients) {
    if (selectedCategory !== 'carne') return false;

    const hasMeatSignals = containsAny(CATEGORY_KEYWORDS.carne, userIngredients);
    const hasSweetSignals = containsAny(SWEET_INGREDIENTS, userIngredients);

    return !hasMeatSignals && hasSweetSignals;
  }

  function funnyCategoryMessage(selectedCategory) {
    if (selectedCategory !== 'carne') return '';
    return 'Hmm… com esses ingredientes estamos mais perto de uma sobremesa romântica do que de um prato de carne 😄';
  }

  function scoreRecipe({ recipe, userIngredients, servings, category }) {
    let score = 0;

    recipe.ingredients.forEach((ingredient) => {
      if (containsAny([ingredient], userIngredients)) score += 3;
    });

    if (category) {
      if (containsAny(CATEGORY_KEYWORDS[category] || [category], recipe.categories.concat(recipe.ingredients))) {
        score += 4;
      } else {
        score -= 2;
      }
    }

    if (servings && recipe.servings) {
      const diff = Math.abs(servings - recipe.servings);
      score += Math.max(0, 3 - diff);
    }

    return score;
  }

  function computeMissingIngredients(recipeIngredients, userIngredients) {
    return recipeIngredients.filter((ingredient) => !containsAny([ingredient], userIngredients));
  }

  class UmaReceitaAssistantWidget {
    constructor(options) {
      this.options = {
        mount: '#uma-receita-assistant',
        siteUrl: '',
        wprmEndpoint: '',
        mapRecipe: defaultMapRecipe,
        ...options
      };

      const defaultEndpoint = `${(this.options.siteUrl || '').replace(/\/$/, '')}/wp-json/wp/v2/wprm_recipe?per_page=100&_embed`;
      this.endpoint = this.options.wprmEndpoint || defaultEndpoint;
    }

    init() {
      const mountEl = document.querySelector(this.options.mount);
      if (!mountEl) throw new Error('Elemento mount do widget não encontrado.');

      mountEl.innerHTML = this.template();
      this.bindEvents(mountEl);
    }

    template() {
      return `
        <section class="ur-assistant">
          <h2>Assistente de Receitas</h2>
          <p class="ur-subtitle">Diz-me o que tens em casa e eu encontro receitas do Uma Receita.</p>

          <form class="ur-form" data-ur-form>
            <label>
              Ingredientes (separados por vírgula)
              <input type="text" name="ingredients" placeholder="ex: natas, chocolate, ovos" required />
            </label>

            <label>
              Para quantas pessoas?
              <input type="number" name="servings" min="1" max="20" value="2" />
            </label>

            <label>
              Tipo de prato (opcional)
              <select name="category">
                <option value="">Sem preferência</option>
                <option value="carne">Carne</option>
                <option value="peixe">Peixe</option>
                <option value="vegetariano">Vegetariano</option>
                <option value="doce">Doce</option>
                <option value="sobremesa">Sobremesa</option>
              </select>
            </label>

            <button type="submit">Sugerir receitas</button>
          </form>

          <p class="ur-warning" data-ur-warning hidden></p>
          <div class="ur-results" data-ur-results></div>
        </section>
      `;
    }

    bindEvents(root) {
      const form = root.querySelector('[data-ur-form]');
      const warning = root.querySelector('[data-ur-warning]');
      const results = root.querySelector('[data-ur-results]');

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        results.innerHTML = '<p>A procurar receitas WPRM…</p>';

        const formData = new FormData(form);
        const userIngredients = parseIngredientInput(formData.get('ingredients') || '');
        const servings = Number(formData.get('servings') || 0);
        const category = normalizeText(formData.get('category') || '');

        const incompatible = categoryLooksIncompatible(category, userIngredients);
        warning.hidden = !incompatible;
        warning.textContent = incompatible ? funnyCategoryMessage(category) : '';

        try {
          const recipes = await this.fetchRecipes();
          const ranked = recipes
            .map((recipe) => {
              const score = scoreRecipe({ recipe, userIngredients, servings, category });
              const missing = computeMissingIngredients(recipe.ingredients, userIngredients);
              return { recipe, score, missing };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

          this.renderResults(results, ranked);
        } catch (error) {
          results.innerHTML = `<p>Não consegui carregar receitas WPRM agora. Tenta novamente. (${error.message})</p>`;
        }
      });
    }

    async fetchRecipes() {
      if (!this.endpoint || !this.endpoint.includes('/wp-json/')) {
        throw new Error('Endpoint WPRM inválido.');
      }

      const response = await fetch(this.endpoint, {
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Falha no endpoint WPRM (${response.status})`);
      }

      const data = await response.json();
      return asArray(data).map((raw) => this.options.mapRecipe(raw)).filter((recipe) => recipe.ingredients.length > 0);
    }

    renderResults(container, ranked) {
      if (!ranked.length) {
        container.innerHTML = '<p>Não encontrei receitas compatíveis no WPRM com esses critérios.</p>';
        return;
      }

      container.innerHTML = ranked
        .map(({ recipe, missing }) => {
          const missingHtml = missing.length
            ? `<ul>${missing.map((item) => `<li>${item}</li>`).join('')}</ul>`
            : '<p>Já tens todos os ingredientes 🎉</p>';

          return `
            <article class="ur-card">
              ${recipe.image ? `<img src="${recipe.image}" alt="${recipe.title}" />` : ''}
              <div class="ur-card-body">
                <h3><a href="${recipe.link}" target="_blank" rel="noopener noreferrer">${recipe.title}</a></h3>
                <p><strong>Ingredientes em falta:</strong></p>
                ${missingHtml}
              </div>
            </article>
          `;
        })
        .join('');
    }
  }

  window.UmaReceitaAssistantWidget = UmaReceitaAssistantWidget;
})();
