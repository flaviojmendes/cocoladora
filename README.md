# Frontend


## Pré Requisitos

Para executar esse projeto, você precisa ter instalado em sua máquina:

- [Node.js](https://nodejs.org/en/)
- [Yarn](https://yarnpkg.com/)

## Configurações

Esse boilerplate possui o Google Analytics e Auth0 pré configurados. Basta atualizar as seguintes variáveis do arquivo `.env`:

```
VITE_GOOGLE_ANALYTICS_ID=<GOOGLE_ANALYTICS_TAG_GA4>
VITE_AUTH0_DOMAIN=<SEU_DOMINIO_DO AUTH0>
VITE_AUTH0_CLIENT_ID=<CLIENT_ID>
VITE_AUTH0_AUDIENCE=<AUDIENCE>
```

## Personalização


## Como rodar

Primeiro, instale as dependências:

```bash
yarn
```

Depois, rode o servidor em modo de desenvolvimento:

```bash
yarn dev
```

## Como rodar com Docker

## Pagamentos dos pixels

A porta de pixels usa Stripe Checkout. Configure estas variáveis na Vercel:

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

No Stripe, crie um webhook apontando para:

```text
https://cocoladora.com/api/stripe-webhook
```

Eventos necessários:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

Para testar localmente:

```bash
vercel dev
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

O lance é recebido pela Cocoladora. Ao cobrir uma área, o dono anterior perde os pixels e não
recebe repasse.
