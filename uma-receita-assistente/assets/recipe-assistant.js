(function () {
  const TYPE_KEYWORDS = {
    'jantar-rapido': ['rapido', 'facil', 'simples', 'minutos'],
    almoco: ['almoco', 'almoço'],
    carne: ['carne', 'frango', 'porco', 'vaca', 'novilho', 'peru'],
    peixe: ['peixe', 'bacalhau', 'atum', 'salmao', 'salmão', 'marisco', 'camarao', 'camarão'],
    sobremesa: ['sobremesa', 'doce', 'mousse', 'pudim', 'chocolate', 'natas'],
    bolo: ['bolo', 'bolos', 'cake'],
    entrada: ['entrada', 'entradas', 'petisco', 'aperitivo'],
    vegetariano: ['vegetariano', 'legumes', 'tofu', 'lentilhas'],
    'air-fryer': ['air fryer', 'airfryer'],
    economica: ['economica', 'económica', 'barato', 'poupanca', 'poupança']
  };

  const BASICS = ['agua', 'sal', 'pimenta', 'azeite', 'oleo'];
  const UNIT_WORDS = ['g', 'gr', 'gramas', 'kg', 'ml', 'l', 'lt', 'dl', 'cl', 'colher', 'colheres', 'sopa', 'sobremesa', 'cha', 'xicara', 'chavena', 'q b', 'qb', 'pitada'];
  const MEAT_PROTEINS = ['frango', 'porco', 'vaca', 'peru', 'novilho', 'carne', 'bife', 'vitela'];
  const FISH_PROTEINS = ['bacalhau', 'atum', 'salmao', 'peixe', 'dourada', 'robalo', 'marisco', 'camarao', 'pescada', 'polvo'];
  const SWEET_SIGNALS = ['chocolate', 'nata', 'natas', 'acucar', 'baunilha', 'caramelo', 'mousse', 'bolo'];

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, (match) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[match]));
  }

  function safeUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    try {
      const url = new URL(raw, window.location.origin);
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      return url.href;
    } catch (error) {
      return '';
    }
  }

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function normalizeIngredientForMatch(value) {
    let normalized = normalizeText(value)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\b\d+[\d\/.,]*\b/g, ' ')
      .replace(/[()\[\]{}]/g, ' ')
      .replace(/[.,;:!?]+/g, ' ')
      .replace(/\b(ovo|ovos)\s+(s|m|l|xl)\b/g, 'ovo')
      .replace(/\b(clara|claras|gema|gemas)\s+de\s+ovo\b/g, 'ovo')
      .replace(/\b(uma|um|uns|umas|o|a|os|as|de|da|do|das|dos|para|com)\b/g, ' ')
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    UNIT_WORDS.forEach((unit) => {
      normalized = normalized.replace(new RegExp(`\\b${unit}\\b`, 'g'), ' ');
    });

    const replacements = {
      extracto: 'extrato',
      extrato: 'extrato',
      ovos: 'ovo',
      natas: 'nata',
      acucar: 'acucar',
      manteigas: 'manteiga',
      farinhas: 'farinha',
      massas: 'massa',
      legumes: 'legume'
    };

    Object.entries(replacements).forEach(([from, to]) => {
      normalized = normalized.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
    });

    return normalized.replace(/\s+/g, ' ').trim();
  }

  function cleanIngredientForDisplay(value) {
    let cleaned = normalizeIngredientForMatch(value);
    if (!cleaned) return '';

    const accents = {
      acucar: 'açúcar',
      po: 'pó',
      agua: 'água',
      oleo: 'óleo',
      cha: 'chá',
      economica: 'económica',
      extrato: 'extracto',
      camarao: 'camarão',
      salmao: 'salmão',
      chavena: 'chávena'
    };

    Object.entries(accents).forEach(([from, to]) => {
      cleaned = cleaned.replace(new RegExp(`\\b${from}\\b`, 'g'), to);
    });

    cleaned = cleaned
      .replace(/\bextracto baunilha\b/g, 'extracto de baunilha')
      .replace(/\bacucar po\b/g, 'açúcar em pó')
      .replace(/\bchocolate po\b/g, 'chocolate em pó')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  function unique(items) {
    return [...new Set(items.filter(Boolean))];
  }

  function containsAny(words, candidates) {
    const normalizedWords = words.map(normalizeIngredientForMatch).filter(Boolean);
    const normalizedCandidates = candidates.map(normalizeIngredientForMatch).filter(Boolean);
    return normalizedWords.some((word) => normalizedCandidates.some((candidate) => candidate === word || candidate.includes(word) || word.includes(candidate)));
  }

  function parseIngredientInput(input) {
    return unique(String(input || '').split(',').map(normalizeIngredientForMatch).filter(Boolean));
  }

  function parseWprmIngredientItem(item) {
    if (!item) return null;
    const source = typeof item === 'string' ? item : item.ingredient || item.name || item.text || item.raw || '';
    return cleanIngredientForDisplay(source);
  }

  function flattenWprmIngredients(rawIngredients) {
    const sections = Array.isArray(rawIngredients) ? rawIngredients : [rawIngredients];
    const out = [];

    sections.forEach((section) => {
      if (!section) return;

      if (Array.isArray(section.ingredients)) {
        section.ingredients.forEach((ingredient) => out.push(parseWprmIngredientItem(ingredient)));
      } else if (Array.isArray(section)) {
        section.forEach((ingredient) => out.push(parseWprmIngredientItem(ingredient)));
      } else {
        out.push(parseWprmIngredientItem(section));
      }
    });

    return unique(out);
  }

  function defaultMapRecipe(raw) {
    const ingredients = flattenWprmIngredients(raw && raw.ingredients ? raw.ingredients : []);
    const title = raw && raw.title ? raw.title : 'Receita';
    const categories = (raw && Array.isArray(raw.categories) ? raw.categories : [])
      .map(normalizeText)
      .filter(Boolean);

    return {
      id: raw && raw.id ? raw.id : 0,
      title,
      titleNorm: normalizeText(title),
      link: raw && raw.link ? raw.link : '#',
      image: raw && raw.image ? raw.image : '',
      ingredients,
      ingredientsNorm: ingredients.map(normalizeIngredientForMatch),
      categories,
      servings: Number(raw && raw.servings ? raw.servings : 0)
    };
  }

  function isIncoherent(type, ingredients) {
    if (!ingredients.length) {
      return 'Indique pelo menos um ingrediente para continuar.';
    }

    if (ingredients.every((ingredient) => BASICS.includes(ingredient))) {
      return 'Com esses ingredientes básicos ainda não é possível sugerir receitas úteis. Acrescente pelo menos um ingrediente principal.';
    }

    const hasSweet = containsAny(SWEET_SIGNALS, ingredients);
    const hasMeat = containsAny(MEAT_PROTEINS, ingredients);
    if (type === 'carne' && hasSweet && !hasMeat) {
      return 'Natas e chocolate estão claramente a pedir sobremesa, não um prato de carne. Para uma sugestão de carne, acrescente pelo menos uma proteína — frango, porco, vaca ou peru — e o assistente procura receitas do Uma Receita que façam sentido.';
    }

    return null;
  }

  function recipeTypeHaystack(recipe) {
    return recipe.categories.concat(recipe.ingredientsNorm).concat(recipe.titleNorm);
  }

  function recipeMatchesType(recipe, selectedType) {
    if (!selectedType || selectedType === 'tanto-faz') return true;

    const haystack = recipeTypeHaystack(recipe);
    const typeWords = TYPE_KEYWORDS[selectedType] || [selectedType];
    if (!containsAny(typeWords, haystack)) return false;
    if (selectedType === 'carne') return containsAny(MEAT_PROTEINS, haystack);
    if (selectedType === 'peixe') return containsAny(FISH_PROTEINS, haystack);
    if (selectedType === 'sobremesa' || selectedType === 'bolo') return containsAny(SWEET_SIGNALS, haystack);
    if (selectedType === 'air-fryer') return containsAny(['air fryer', 'airfryer'], haystack);

    return true;
  }

  function ingredientMatches(recipeIngredient, userIngredient) {
    if (!recipeIngredient || !userIngredient) return false;
    if (recipeIngredient === userIngredient) return true;
    if (recipeIngredient.includes(userIngredient)) return true;
    if (userIngredient.includes(recipeIngredient) && recipeIngredient.length > 3) return true;
    return false;
  }

  function computeMatches(recipe, userIngredients) {
    const have = [];
    const missing = [];

    recipe.ingredients.forEach((display, index) => {
      const normalized = recipe.ingredientsNorm[index];
      const matched = userIngredients.some((ingredient) => ingredientMatches(normalized, ingredient));
      if (matched) {
        have.push(display);
      } else if (!BASICS.includes(normalized)) {
        missing.push(display);
      }
    });

    return { have: unique(have), missing: unique(missing) };
  }

  function scoreRecipe({ recipe, userIngredients, keyIngredient, selectedType }) {
    const haystack = recipeTypeHaystack(recipe);
    let score = 0;

    const matchedIngredients = userIngredients.filter((ingredient) => recipe.ingredientsNorm.some((recipeIngredient) => ingredientMatches(recipeIngredient, ingredient)));
    matchedIngredients.forEach((ingredient) => {
      score += BASICS.includes(ingredient) ? 1 : 5;
      if (recipe.titleNorm.includes(ingredient)) score += 4;
    });

    if (keyIngredient) {
      if (recipe.ingredientsNorm.some((ingredient) => ingredientMatches(ingredient, keyIngredient))) score += 14;
      else score -= 12;
      if (recipe.titleNorm.includes(keyIngredient)) score += 6;
    }

    if (selectedType && selectedType !== 'tanto-faz') {
      if (recipeMatchesType(recipe, selectedType)) score += 8;
      else score -= 30;
    }

    if (!matchedIngredients.some((ingredient) => !BASICS.includes(ingredient))) {
      score -= 18;
    }

    return score;
  }

  function emitGAEvent(eventName, payload) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, payload || {});
  }

  class UmaReceitaAssistantWidget {
    constructor(options) {
      const config = window.URA_ASSISTENTE_CONFIG || {};
      this.options = {
        mount: config.mount || '#uma-receita-assistant',
        endpoint: config.endpoint || '',
        nonce: config.nonce || '',
        siteUrl: config.siteUrl || '',
        mode: config.mode || 'inline',
        source: config.source || 'shortcode',
        postId: config.postId || 0,
        floatingButtonText: config.floatingButtonText || 'Tenho ingredientes. O que faço?',
        mapRecipe: defaultMapRecipe,
        ...options
      };
      this.endpoint = this.options.endpoint;
      this.isOpen = false;
    }

    pushEvent(name, payload) {
      const events = {
        search: 'assistente_pesquisa',
        results: 'assistente_resultado',
        click: 'assistente_clique_receita',
        error: 'assistente_erro'
      };
      const eventName = events[name];
      if (!eventName) return;

      emitGAEvent(eventName, {
        source: this.options.source,
        post_id: this.options.postId,
        ...payload
      });
    }

    init() {
      const mountEl = document.querySelector(this.options.mount);
      if (!mountEl) return;

      if (this.options.mode === 'floating') {
        this.renderFloating(mountEl);
      } else {
        this.renderInline(mountEl);
      }
    }

    formTemplate() {
      return `
        <h2>Assistente de Receitas</h2>
        <p class="ur-subtitle">Diga o que tem em casa e o Uma Receita sugere receitas possíveis a partir do que já existe no site.</p>
        <p class="ur-small">Escreva os ingredientes, diga para quantas pessoas quer cozinhar e veja sugestões reais do site — com a lista do que ainda precisa comprar.</p>
        <form class="ur-form" data-ur-form>
          <label>Que ingredientes tem em casa?
            <input type="text" name="ingredients" placeholder="Ex.: ovos, queijo, courgette, natas, chocolate" required />
          </label>
          <label class="ur-secondary">Ingrediente principal, se houver
            <input type="text" name="key_ingredient" placeholder="Ex.: chocolate" />
          </label>
          <label>Para quantas pessoas?
            <input type="number" name="servings" min="1" value="2" />
          </label>
          <label>Procura algum tipo de receita?
            <select name="recipe_type">
              <option value="tanto-faz">Tanto faz</option>
              <option value="jantar-rapido">Jantar rápido</option>
              <option value="almoco">Almoço</option>
              <option value="carne">Carne</option>
              <option value="peixe">Peixe</option>
              <option value="sobremesa">Sobremesa</option>
              <option value="bolo">Bolo</option>
              <option value="entrada">Entrada</option>
              <option value="vegetariano">Vegetariano</option>
              <option value="air-fryer">Air fryer</option>
              <option value="economica">Receita económica</option>
            </select>
          </label>
          <button type="submit">Encontrar receitas</button>
        </form>
        <p class="ur-warning" data-ur-warning hidden></p>
        <div class="ur-results" data-ur-results></div>
      `;
    }

    renderInline(mountEl) {
      mountEl.innerHTML = `<section class="ur-assistant ur-inline">${this.formTemplate()}</section>`;
      this.bindEvents(mountEl, 'shortcode');
    }

    renderFloating(mountEl) {
      const buttonText = escapeHtml(this.options.floatingButtonText);
      mountEl.innerHTML = `
        <button class="ur-fab" aria-label="Abrir assistente de receitas" data-ur-open>${buttonText}</button>
        <div class="ur-overlay" data-ur-overlay hidden></div>
        <aside class="ur-panel" role="dialog" aria-modal="true" aria-hidden="true" data-ur-panel>
          <button class="ur-close" aria-label="Fechar assistente" data-ur-close>×</button>
          <section class="ur-assistant">${this.formTemplate()}</section>
        </aside>
      `;

      const openBtn = mountEl.querySelector('[data-ur-open]');
      const panel = mountEl.querySelector('[data-ur-panel]');
      const overlay = mountEl.querySelector('[data-ur-overlay]');
      const closeBtn = mountEl.querySelector('[data-ur-close]');

      const open = () => {
        this.isOpen = true;
        panel.setAttribute('aria-hidden', 'false');
        panel.classList.add('is-open');
        overlay.hidden = false;
        document.body.classList.add('ur-no-scroll');
        const firstInput = panel.querySelector('input[name="ingredients"]');
        if (firstInput) firstInput.focus();
      };

      const close = () => {
        this.isOpen = false;
        panel.setAttribute('aria-hidden', 'true');
        panel.classList.remove('is-open');
        overlay.hidden = true;
        document.body.classList.remove('ur-no-scroll');
      };

      openBtn.addEventListener('click', open);
      closeBtn.addEventListener('click', close);
      overlay.addEventListener('click', close);
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this.isOpen) close();
      });

      this.bindEvents(mountEl, 'floating_button');
    }

    bindEvents(root, source) {
      const form = root.querySelector('[data-ur-form]');
      const warning = root.querySelector('[data-ur-warning]');
      const results = root.querySelector('[data-ur-results]');
      if (!form) return;

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        results.innerHTML = '';

        const formData = new FormData(form);
        const userIngredients = parseIngredientInput(formData.get('ingredients') || '');
        const keyIngredient = normalizeIngredientForMatch(formData.get('key_ingredient') || '');
        const selectedType = normalizeText(formData.get('recipe_type') || 'tanto-faz');
        const servings = Math.max(1, Number(formData.get('servings') || 2));

        this.pushEvent('search', { selected_type: selectedType });

        const incoherent = isIncoherent(selectedType, userIngredients);
        if (incoherent) {
          warning.hidden = false;
          warning.textContent = incoherent;
          return;
        }

        warning.hidden = true;
        results.innerHTML = '<p>A procurar receitas que façam sentido...</p>';

        try {
          const recipes = await this.fetchRecipes();
          const ranked = recipes
            .filter((recipe) => recipeMatchesType(recipe, selectedType))
            .map((recipe) => {
              const match = computeMatches(recipe, userIngredients);
              return {
                recipe,
                score: scoreRecipe({ recipe, userIngredients, keyIngredient, selectedType, servings }),
                have: match.have,
                missing: match.missing
              };
            })
            .filter((result) => result.score > 0 && result.have.length > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

          if (!ranked.length) {
            results.innerHTML = '<p>Não encontrei uma boa correspondência nas receitas do Uma Receita com esses ingredientes. Tente acrescentar mais um ingrediente principal, como frango, bacalhau, ovos, arroz, massa ou legumes.</p>';
            this.pushEvent('results', { selected_type: selectedType, recipe_count: 0 });
            return;
          }

          this.renderResults(results, ranked, selectedType, source);
          this.pushEvent('results', { selected_type: selectedType, recipe_count: ranked.length });
        } catch (error) {
          results.innerHTML = '<p>Não foi possível carregar receitas neste momento.</p>';
          this.pushEvent('error', { selected_type: selectedType });
        }
      });
    }

    async fetchRecipes() {
      if (!this.endpoint) {
        throw new Error('missing_endpoint');
      }

      const headers = { Accept: 'application/json' };
      if (this.options.nonce) {
        headers['X-WP-Nonce'] = this.options.nonce;
      }

      const response = await fetch(this.endpoint, { headers });
      if (!response.ok) throw new Error('endpoint_error');
      const data = await response.json();
      return (Array.isArray(data) ? data : [data]).map((raw) => this.options.mapRecipe(raw)).filter((recipe) => recipe.ingredients.length);
    }

    renderResults(container, ranked, selectedType, source) {
      container.innerHTML = ranked.map(({ recipe, have, missing }) => {
        const recipeUrl = safeUrl(recipe.link);
        const imageUrl = safeUrl(recipe.image);
        const compactMissing = missing.slice(0, 6);
        const extra = missing.length > 6 ? `<li>+ ${escapeHtml(missing.length - 6)} ingredientes</li>` : '';
        const reason = have.length ? `Sugestão com base em ${have.slice(0, 2).join(' e ')}.` : 'Sugestão por proximidade de tipo e ingredientes.';

        return `
          <article class="ur-card">
            ${imageUrl ? `<img loading="lazy" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(recipe.title)}" />` : ''}
            <div class="ur-card-body">
              <h3><a href="${escapeHtml(recipeUrl)}" data-ur-result-link>${escapeHtml(recipe.title)}</a></h3>
              <p class="ur-reason">${escapeHtml(reason)}</p>
              <p><strong>Já tem:</strong> ${escapeHtml(have.slice(0, 6).join(', ') || '—')}</p>
              <p><strong>Em falta:</strong></p>
              <ul>${compactMissing.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}${extra}</ul>
              <p><a class="ur-btn-link" href="${escapeHtml(recipeUrl)}" data-ur-result-link>Ver receita</a></p>
            </div>
          </article>`;
      }).join('');

      container.querySelectorAll('[data-ur-result-link]').forEach((element) => {
        element.addEventListener('click', () => {
          this.pushEvent('click', {
            selected_type: selectedType,
            recipe_count: ranked.length,
            result_title: element.closest('.ur-card')?.querySelector('h3')?.innerText || '',
            result_url: element.getAttribute('href') || '',
            source
          });
        });
      });
    }
  }

  window.UmaReceitaAssistantWidget = UmaReceitaAssistantWidget;
  window.UmaReceitaAssistantDebug = {
    normalizeIngredientForMatch,
    cleanIngredientForDisplay,
    escapeHtml,
    safeUrl
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.URA_ASSISTENTE_CONFIG) return;
    new UmaReceitaAssistantWidget().init();
  });
})();
