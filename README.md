# Widget Assistente de Receitas (UmaReceita.pt)

Este repositório inclui um widget front-end pronto para incorporar no **umareceita.pt**.

## O que o widget faz

- Recebe ingredientes que o utilizador já tem.
- Recebe número de pessoas.
- Recebe tipo de prato opcional (Entradas, Saladas, Petiscos, Pão, Do Mundo, Peixe, Carne, Bolos, Sobremesas, Biscoitos, Muffins, Surpreende-me).
- Busca receitas **apenas de endpoints WPRM** (WordPress Recipe Maker).
- Mostra as 3 melhores sugestões com:
  - fotografia (hero),
  - link da receita,
  - ingredientes em falta para comprar.
- Se existir contradição divertida entre ingredientes e tipo escolhido (ex.: natas + chocolate para prato de carne), mostra um aviso divertido.

## Estrutura

- `src/recipe-assistant.js`: lógica principal do widget.
- `src/recipe-assistant.css`: estilos.
- `demo/index.html`: página de demonstração.

## Como usar

1. Copie os ficheiros `src/recipe-assistant.js` e `src/recipe-assistant.css` para o seu tema/plugin.
2. Inclua no site:

```html
<link rel="stylesheet" href="/caminho/recipe-assistant.css" />
<div id="uma-receita-assistant"></div>
<script src="/caminho/recipe-assistant.js"></script>
<script>
  new UmaReceitaAssistantWidget({
    mount: '#uma-receita-assistant',
    siteUrl: 'https://umareceita.pt',
    wprmEndpoint: 'https://umareceita.pt/wp-json/wp/v2/wprm_recipe?per_page=100&_embed',
  }).init();
</script>
```

> Nota: em instalações WPRM diferentes, o endpoint pode variar. O widget aceita `wprmEndpoint` customizado.

## Mapeamento de dados WPRM

O widget tenta extrair ingredientes de campos comuns de receitas WPRM:

- `recipe.ingredients`
- `ingredients`
- `meta._wprm_ingredients` (JSON string ou array)
- `wprm_ingredients`

Se o seu payload tiver outro formato, pode passar `mapRecipe` na configuração para personalizar.

## Desenvolvimento local

Abra `demo/index.html` num servidor local simples.
