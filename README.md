# NessPay — Dashboard

Painel **preto e branco** do **NessPay**, bot de vendas pagas no Discord.
React + TypeScript + Vite + Tailwind + Recharts. Fontes: **Unbounded** (títulos), Space Grotesk (interface), JetBrains Mono (números).

> **Sem dados falsos.** Nada de "100 vendas no mês" inventado: todo número vem dos pedidos da API ou do que você mesmo cadastra. Sem API, os campos ficam vazios (`—`) com estado vazio explicando o porquê.

## Rodando

```bash
npm install
cp .env.example .env     # preencha VITE_DISCORD_CLIENT_ID
npm run dev              # http://localhost:5173
npm run build            # build de produção em dist/
```

## Fluxo de acesso (3 etapas, obrigatórias)

1. **`/entrar`** — login **obrigatório** pelo Discord (OAuth2, escopos `identify guilds`). Lê sua conta e a lista de servidores.
2. **`/chave`** — tela da **Key de licença** (formato `XXXX-XXXX-XXXX-XXXX`), a que você recebe ao comprar o bot.
   - A validação real ainda não existe no backend, então o botão **Verificar Key libera o acesso mesmo sem Key** — como você pediu. Quando o endpoint `POST /api/license/verify` existir, é só trocar a função `submit()` em `src/pages/auth/KeyGate.tsx`.
3. **`/servidores`** — lista **apenas** servidores onde você é dono, administrador ou tem "Gerenciar servidor". Cada card tem o botão **Gerenciar**.

Depois disso você cai em **`/app/:guildId/...`**, com o painel escopado naquele servidor (seletor de servidor na sidebar).

## Telas do painel

| Rota | Tela |
| --- | --- |
| `/app/:id` | Visão geral: KPIs reais, receita 30d, métodos/categorias, últimas vendas, checklist de ativação |
| `/app/:id/vendas` | Pedidos da API com busca, filtros, export CSV e detalhe |
| `/app/:id/produtos` | Cadastro/edição/remoção de produtos (nome, descrição, categoria, preço, estoque, entrega automática) |
| `/app/:id/clientes` | Clientes derivados dos pedidos pagos com tier e histórico |
| `/app/:id/cupons` | Criação e gestão de cupons (% ou valor fixo, limite de usos, validade) |
| `/app/:id/tickets` | Tickets vindos da API |
| `/app/:id/integracoes` | Estado **real** das conexões (OAuth, Key, API) e o que é "não verificável" |
| `/app/:id/configuracoes` | Prefixo, canais, moeda, automações — salvos por servidor |

## Onde os dados ficam hoje

| Dado | Origem |
| --- | --- |
| Produtos, cupons, configurações | `localStorage`, por servidor (`nesspay:db:<guildId>`) |
| Servidores e usuário | Discord OAuth2 (real) |
| Vendas, clientes, tickets | `GET {VITE_API_URL}/orders` e `/tickets` — **vazio** até o backend existir |

## O que falta para ficar 100% real

1. **Discord OAuth2**: crie a aplicação em [Developer Portal](https://discord.com/developers/applications), adicione o redirect `https://SEU-DOMINIO/auth/callback` e coloque o Client ID em `VITE_DISCORD_CLIENT_ID`.
2. **Backend da API** com: `GET /orders`, `GET /tickets`, `POST /license/verify`, `POST /webhooks/pagamento`, CRUD de produtos/cupons no banco.
3. **Banco** para sair do localStorage (produtos/cupons/configurações).
4. **Gateway de pagamento** + webhook público HTTPS.
5. **Bot no servidor** com intents `GUILDS`, `GUILD_MESSAGES`, `MESSAGE_CONTENT`.

Inventário de variáveis: [`.env.example`](.env.example) · detalhamento na tela **Integrações**.

## Estrutura

```
src/
├── components/   Layout (sidebar + seletor de servidor), ui.tsx, charts.tsx
├── lib/
│   ├── discord.ts   OAuth implicit grant, permissões, avatares
│   ├── session.tsx  sessão (usuário, servidores, Key) em localStorage
│   ├── store.ts     produtos/cupons/configurações + client da API
│   ├── metrics.ts   métricas calculadas apenas com pedidos reais
│   └── useGuild.ts  contexto do servidor selecionado
└── pages/        auth/ (Login, Key, Servidores) + as 8 telas do painel
```
