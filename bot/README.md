# NessPay Bot

Bot de vendas completo em Python (discord.py 2.x) com API HTTP embutida, banco SQLite, entregas automáticas e manuais, cupons, pedidos, tickets e licenças por tempo.

## Rodando

```bash
cd bot
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python main.py
```

O processo sobe duas coisas ao mesmo tempo: o bot no Discord e a API em `http://0.0.0.0:8000`.
Com `DISCORD_TOKEN` vazio, apenas a API sobe (útil para testar o painel).

## Variáveis

| Variável | Descrição |
| --- | --- |
| `DISCORD_TOKEN` | Token do bot no Developer Portal |
| `DISCORD_GUILD_ID` | Servidor principal (sincroniza os slash commands na hora) |
| `OWNER_IDS` | IDs que podem gerar Keys (vazio = qualquer admin do servidor) |
| `DATABASE_PATH` | Arquivo SQLite (padrão `data/nesspay.db`) |
| `API_HOST` / `API_PORT` | Endereço da API (padrão `0.0.0.0:8000`) |
| `API_KEY` | Chave exigida no header `X-API-Key` pelo painel |
| `DASHBOARD_ORIGIN` | Origem liberada no CORS (ex: `https://nesspay.vercel.app`) |
| `MP_ACCESS_TOKEN` | Token do Mercado Pago para Pix automático |
| `PUBLIC_WEBHOOK_URL` | URL pública que o gateway chama (`/webhooks/pagamento`) |
| `PIX_MANUAL_APPROVAL` | `true` mantém aprovação manual mesmo com gateway |
| `ORDER_EXPIRATION_MINUTES` | Tempo até um pedido pendente expirar |
| `LICENSE_CHECK_SECONDS` | Intervalo da checagem de licenças vencidas |

## Comandos

### Loja e cliente

| Comando | O que faz |
| --- | --- |
| `/loja` | Abre o catálogo com seleção de produto e checkout |
| `/pedidos` | Lista os pedidos do usuário |
| `/licenca` | Mostra a Key do usuário, validade e tempo restante |
| `/ajuda` | Lista os comandos e o modo de pagamento ativo |
| `/ticket` | Abre atendimento com a equipe |

### Equipe

| Comando | O que faz |
| --- | --- |
| `/produto adicionar` | Cria produto com preço, categoria e modo de entrega |
| `/produto editar` | Altera nome, preço, categoria, descrição, modo e status |
| `/produto remover` | Apaga o produto e o estoque dele |
| `/produto listar` | Lista o catálogo com estoque |
| `/estoque abastecer` | Modal para colar vários itens, um por linha |
| `/estoque adicionar` | Adiciona um item único |
| `/estoque listar` | Mostra disponível e total por produto |
| `/cupom criar` | Cria cupom percentual ou de valor fixo, com limite de usos |
| `/cupom remover` / `/cupom listar` | Gerencia cupons |
| `/pedido listar` | Pedidos recentes, com filtro de status |
| `/pedido info` | Detalhe do pedido e botões de aprovação |
| `/pedido aprovar` | Confirma o pagamento e dispara a entrega |
| `/pedido entregar` | Registra entrega manual e envia no DM |
| `/pedido reembolsar` | Reembolsa, devolve o item ao estoque e avisa o cliente |
| `/pedido pendentes` | Fila de entregas manuais |
| `/config canal_vendas` / `canal_logs` / `cargo_equipe` / `categoria` / `moeda` / `manutencao` / `ver` | Configuração do servidor |
| `/painel loja` / `/painel tickets` | Publica os painéis fixos com botões |
| `/resumo` | Receita, pedidos, tickets e licenças |
| `/tickets` / `/fechar` / `/controle` | Gestão dos atendimentos |

### Licenças

| Comando | O que faz |
| --- | --- |
| `/key gerar usuario dias nota` | Gera Key no formato `XXXX-XXXX-XXXX-XXXX` presa ao ID do usuário e envia no DM |
| `/key listar` | Lista Keys, com filtro de ativas |
| `/key info` | Dados completos de uma Key |
| `/key revogar` | Revoga na hora, usuário perde o acesso |
| `/key estender` | Adiciona dias |
| `/acesso` | Verifica se um usuário tem licença ativa |

Toda licença vencida é **apagada do banco** pela tarefa de checagem; o usuário recebe DM avisando e os comandos da loja passam a responder com aviso de acesso restrito.

## Como a venda funciona

1. Cliente escolhe o produto em `/loja` e a forma de pagamento.
2. O pedido nasce `pendente`.
3. Pix com gateway: cobrança criada, confirmação pelo webhook ou pelo botão "Verificar pagamento".
4. Sem gateway: o pedido vai para o canal de logs com botões de aprovação da equipe.
5. Pagamento confirmado → o bot entrega:
   - **automática**: retira um item do estoque, envia no DM e baixa o item
   - **manual**: cria canal privado com a equipe e o botão "Registrar entrega"
6. Sem estoque sobrando, a entrega automática cai para manual automaticamente.

## API (consumida pelo painel)

Todas as rotas aceitam `X-API-Key` quando `API_KEY` está definida.

| Método | Rota | Uso |
| --- | --- | --- |
| GET | `/health` | Estado do bot, gateway e uptime |
| GET | `/stats?guild=` | Receita, pedidos, tickets, licenças |
| GET | `/orders?guild=` | Pedidos para a tabela do painel |
| POST | `/orders/{id}/confirm` | Aprova pagamento pelo painel |
| POST | `/orders/{id}/refund` | Reembolsa e devolve estoque |
| GET | `/tickets?guild=` | Atendimentos |
| GET | `/customers?guild=` | Clientes agregados por pedidos pagos |
| GET/POST/PATCH/DELETE | `/products` | Catálogo e estoque (`/products/{id}/stock`) |
| GET/POST/PATCH/DELETE | `/coupons` | Cupons |
| GET/PATCH | `/settings?guild=` | Prefixo, canais, automações |
| GET/POST | `/licenses` | Gerar e listar Keys |
| POST | `/licenses/{key}/revoke` · `/licenses/{key}/extend` | Revogar e estender |
| POST | `/license/verify` | Valida a Key e o vínculo com o ID do Discord |
| POST | `/webhooks/pagamento` | Confirmação do gateway |

## Teste rápido

```bash
cd bot
python tests/smoke.py
```

Cobre estoque, cupom, entrega automática, entrega manual, reembolso, licença por usuário, expiração com remoção e os principais endpoints da API.
