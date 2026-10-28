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
2. **`/chave`** — tela da **Key de licença** (`XXXX-XXXX-XXXX-XXXX`), a que você recebe ao comprar o bot.
   - Com a API do bot configurada, a Key é validada em `POST /license/verify` e precisa pertencer ao ID do Discord logado. Key de outra pessoa, revogada ou expirada é recusada.
   - Sem `VITE_API_URL` o painel não tem como validar, então qualquer valor libera o acesso.
3. **`/servidores`** — lista **apenas** servidores onde você é dono, administrador ou tem "Gerenciar servidor". Cada card tem o botão **Gerenciar**.

Depois disso você cai em **`/app/:guildId/...`**, com o painel escopado naquele servidor (seletor de servidor na sidebar).

## Telas do painel

| Rota | Tela |
| --- | --- |
| `/app/:id` | Visão geral: KPIs reais, receita 30d, métodos/categorias, últimas vendas, checklist de ativação |
| `/app/:id/vendas` | Pedidos da API com busca, filtros, export CSV e detalhe |
| `/app/:id/produtos` | Catálogo real do bot: criação, edição, pausa, modo de entrega (auto/manual) e abastecimento de estoque |
| `/app/:id/clientes` | Clientes derivados dos pedidos pagos com tier e histórico |
| `/app/:id/cupons` | Criação e gestão de cupons (% ou valor fixo, limite de usos, validade) |
| `/app/:id/tickets` | Tickets vindos da API |
| `/app/:id/integracoes` | Estado **real** das conexões (OAuth, Key, API) e o que é "não verificável" |
| `/app/:id/licencas` | Gerar, revogar e estender Keys por usuário e dias |
| `/app/:id/configuracoes` | Prefixo, canais, moeda, automações — salvos no bot |

## Onde os dados ficam hoje

| Dado | Origem |
| --- | --- |
| Produtos, cupons, configurações | API do bot quando `VITE_API_URL` existe; senão `localStorage` |
| Servidores e usuário | Discord OAuth2 (real) |
| Vendas, clientes, tickets, Keys | API do bot (`/orders`, `/tickets`, `/customers`, `/licenses`) |

## Bot (Python)

O bot de vendas completo está em [`bot/`](bot/README.md): catálogo, estoque, entrega automática e manual, cupons, pedidos, tickets, licenças por tempo e a API que este painel consome.

```bash
cd bot
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python main.py
```

Ele sobe o bot no Discord e a API em `:8000` no mesmo processo. Depois, no painel:

```
VITE_API_URL=https://sua-api.exemplo.com
VITE_API_KEY=mesmo valor de API_KEY no bot
```

Com isso o painel passa a listar produtos, vendas, clientes, tickets e Keys direto do banco do bot, e a tela de Key valida a licença no endpoint `/license/verify` (a Key precisa pertencer ao ID do Discord logado).

Em desenvolvimento o painel usa `/api` e faz proxy para `127.0.0.1:8000`, então basta rodar o bot na mesma máquina.

## Deploy no Vercel (login OAuth)

O projeto já inclui `vercel.json` com rewrite de SPA — sem isso, `/auth/callback` retorna **404** no Vercel e o login "quebra" justamente depois de autorizar.

Checklist para o login funcionar:

1. **Deploy**: importe o repositório no Vercel (framework detectado: Vite → `npm run build`, saída `dist`). O `vercel.json` já cuida das rotas.
2. **Redirect URI no Discord**: abra [Developer Portal](https://discord.com/developers/applications) → sua aplicação → **OAuth2** → *Redirects* e cadastre **exatamente**:
   ```
   https://SEU-PROJETO.vercel.app/auth/callback
   ```
   Sem barra no final, com `https`, domínio idêntico ao que você abre no navegador. Se você usa domínio próprio, cadastre também o do domínio próprio. Se usa as URLs de preview (`*-git-*.vercel.app`), cadastre cada uma.
3. **Client ID**: por padrão o painel usa o Client ID embutido (`1561323387320668193`). Para trocar, defina `VITE_DISCORD_CLIENT_ID` em **Settings → Environment Variables** no Vercel e faça **Redeploy** (variáveis `VITE_*` entram no build, não em runtime).
4. **Deployment Protection**: se estiver ligada (Settings → Deployment Protection), ela intercepta o redirect antes do React. Desligue para o domínio de produção ou use "Only Preview Deployments".

A tela de login tem um bloco **"configuração do login"** que mostra o Client ID ativo e o redirect URI exato que está sendo enviado, com botão de copiar. Se o Discord recusar, a tela de erro mostra o código (`invalid_redirect_uri`, `invalid_client`, `access_denied`…) e o que fazer.

> Se você registrou outro caminho (ex.: a raiz do site), defina `VITE_DISCORD_REDIRECT_URI` com a URL exata — o painel também aceita o token chegando em qualquer rota e redireciona sozinho para o callback.

## O que falta para ficar 100% real

1. **Discord OAuth2**: crie a aplicação em [Developer Portal](https://discord.com/developers/applications), adicione o redirect exato do seu domínio e (opcionalmente) coloque o Client ID em `VITE_DISCORD_CLIENT_ID`.
2. **API do bot** publicada em HTTPS com `API_KEY` configurada e `DASHBOARD_ORIGIN` apontando para o painel.
3. **Gateway de pagamento** (`MP_ACCESS_TOKEN`) + `PUBLIC_WEBHOOK_URL` para o Pix automático. Sem isso, o bot trabalha com aprovação manual da equipe.
4. **Bot no servidor** com intents `GUILDS`, `GUILD_MESSAGES`, `MESSAGE_CONTENT` e `MEMBERS`.

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
