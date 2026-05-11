# Uma Receita — Assistente de Receitas

Plugin WordPress instalável por ZIP para apresentar a **Pitada**, o assistente de receitas do Uma Receita, através do shortcode `[uma_receita_assistente]` e, opcionalmente, de um botão flutuante nas páginas de receitas.

Esta versão **não usa OpenAI nem IA no frontend**. A Pitada recomenda receitas publicadas no WordPress/WPRM através de um endpoint REST próprio e seguro.

## Estrutura

```text
uma-receita-assistente/
├── uma-receita-assistente.php
├── includes/
│   ├── class-ura-assets.php
│   ├── class-ura-shortcode.php
│   ├── class-ura-rest.php
│   └── class-ura-admin.php
├── assets/
│   ├── pitada-icon.png
│   ├── recipe-assistant.js
│   └── recipe-assistant.css
└── README.md
```

## Ícone da Pitada

O plugin espera encontrar o ficheiro:

```text
assets/pitada-icon.png
```

Este ícone é usado no botão flutuante e no cabeçalho do painel da Pitada. O ficheiro deve ser colocado exactamente nessa localização antes de criar o ZIP final do plugin.

## Instalação

1. Confirme que `assets/pitada-icon.png` existe dentro da pasta do plugin.
2. Crie um ZIP da pasta `uma-receita-assistente`.
3. No WordPress, vá a **Plugins > Adicionar novo > Carregar plugin**.
4. Carregue o ZIP e active o plugin **Uma Receita — Assistente de Receitas**.
5. Teste primeiro numa página com o shortcode:

```text
[uma_receita_assistente]
```

O shortcode renderiza:

```html
<div id="uma-receita-assistant" class="ura-assistente-mount"></div>
```

O CSS e o JavaScript são carregados apenas quando o shortcode é renderizado ou quando o botão flutuante estiver activo nas definições.

## Campos da Pitada

O formulário inclui:

- ingredientes disponíveis;
- ingrediente que a pessoa quer mesmo usar;
- número de pessoas;
- dropdown de **tipo de receita**: entrada/petisco, salada, carne, peixe/marisco, vegetariana, pão, bolo, sobremesa, bebida ou Do Mundo;
- dropdown de **necessidade/intenção**: jantar rápido, almoço leve, económica, verão, air fryer, receber amigos, aproveitar sobras ou algo especial.

A recomendação continua baseada apenas em receitas reais do endpoint do plugin.

## Endpoint REST

O plugin cria o endpoint:

```text
GET /wp-json/uma-receita/v1/receitas
```

O endpoint devolve receitas publicadas do post type `wprm_recipe` no formato:

```json
{
  "id": 123,
  "title": "Nome da receita",
  "link": "https://umareceita.pt/receita/",
  "image": "https://umareceita.pt/imagem.jpg",
  "ingredients": ["ovos", "farinha", "açúcar"],
  "categories": ["Sobremesas", "Bolos"],
  "servings": 4
}
```

As receitas são guardadas em cache com transient durante 6 horas.

## Definições do admin

A página está em:

```text
Definições > Uma Receita Assistente
```

Permite:

- activar/desactivar o botão flutuante;
- mostrar o botão apenas em posts com WPRM;
- mostrar o botão em todos os posts;
- alterar o texto do botão flutuante;
- limpar manualmente a cache de receitas.

O botão flutuante fica **desligado por defeito** e nunca abre automaticamente. O texto por defeito é:

```text
Precisa de uma ideia?
```

## Segurança

- O frontend chama apenas `URA_ASSISTENTE_CONFIG.endpoint`, passado por `wp_localize_script`.
- O script recebe também `mount`, `nonce`, `siteUrl` e `pluginUrl` por `wp_localize_script`.
- O endpoint REST não expõe erros técnicos ao frontend.
- Dados de opções do admin são sanitizados com `sanitize_text_field()` e `sanitize_key()`.
- IDs são tratados com `absint()`.
- Saídas PHP usam `esc_html()`, `esc_attr()` e `esc_url()` conforme o contexto.
- O JavaScript usa `escapeHtml()` e `safeUrl()` antes de renderizar títulos, links, imagens e ingredientes.
- Os links das receitas abrem na mesma janela, sem forçar nova aba.
- Não há chamadas externas desnecessárias nem dependências de React ou bibliotecas externas.

## Analytics GA4

Se `window.gtag` existir, o widget envia eventos GA4:

- `assistente_aberto`
- `assistente_pesquisa`
- `assistente_resultado`
- `assistente_clique_receita`
- `assistente_erro`

O plugin não carrega Google Analytics. Apenas usa `window.gtag` quando já existir no site.

## Criar ZIP instalável

A partir da pasta acima do plugin, execute:

```bash
zip -r uma-receita-assistente.zip uma-receita-assistente
```

Depois carregue `uma-receita-assistente.zip` em **Plugins > Adicionar novo > Carregar plugin**.

## Testes manuais recomendados

- Testar primeiro o shortcode `[uma_receita_assistente]` numa página.
- Pesquisar por `ovos, farinha, açúcar`.
- Pesquisar por `camarão, ananás, wraps`.
- Pesquisar por `bacalhau, batatas, pimentos`.
- Escolher o tipo `Peixe ou marisco`.
- Escolher a intenção `Jantar rápido`.
- Activar temporariamente o botão flutuante e confirmar que mostra o ícone da Pitada e o texto configurado.
- Confirmar em mobile que os cards mostram a imagem por cima do texto e não criam overflow horizontal.

## Notas técnicas

- O plugin procura ler ingredientes de várias meta keys WPRM comuns e, como fallback, meta keys que contenham `ingredient`.
- A qualidade das sugestões depende da qualidade dos ingredientes e categorias guardados no WPRM.
- A integração com IA fica reservada para uma fase posterior e deve ser feita via backend PHP, nunca expondo chaves ou prompts no frontend.
