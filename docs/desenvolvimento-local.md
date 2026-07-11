# Desenvolvimento local

## Portas reservadas

Este projeto não utiliza as portas padrão do Supabase para poder coexistir com outros projetos.

| Serviço | Porta |
|---|---:|
| Next.js | 3020 |
| Shadow database | 57320 |
| API Supabase | 57321 |
| PostgreSQL | 57322 |
| Studio | 57323 |
| Inbucket | 57324 |
| Analytics | 57327 |
| Pooler | 57329 |

As portas `57325`, `57326` e `57328` ficam reservadas. Nenhum script encerra processos externos ou escolhe portas automaticamente.

## Preparação

1. Copie `.env.example` para `.env.local`.
2. Configure as credenciais Google nas variáveis do Supabase local.
3. Instale as dependências com `npm install`.
4. Execute `npm run ports:check`.
5. Inicie o Supabase com `npm run supabase:start`.
6. Copie a chave anônima exibida por `npm run supabase:status` para `.env.local`.
7. Inicie o Next.js com `npm run dev`.

## Comandos

- `npm run ports:check`: valida todo o bloco do projeto.
- `npm run ports:check:web`: valida somente a porta 3020.
- `npm run ports:check:supabase`: valida somente o bloco 57320–57329.
- `npm run supabase:start`: valida as portas e inicia os serviços locais.
- `npm run typecheck`: valida os tipos.
- `npm test`: executa os testes automatizados.
- `npm run build`: produz o build de produção.

Se uma porta estiver ocupada, a inicialização é cancelada. Inspecione o processo e defina conscientemente outro bloco completo; não interrompa processos pertencentes a outros projetos.

O primeiro download das imagens do Supabase exige espaço livre no armazenamento do Docker. Se houver erro `no space left on device`, não execute limpeza automática: verifique os projetos ativos e decida conscientemente quais imagens ou caches podem ser removidos.

## Google OAuth

No Google Cloud, cadastre a URL de callback local:

`http://127.0.0.1:57321/auth/v1/callback`

No Supabase Cloud, use a URL de callback fornecida pelo projeto hospedado e adicione a URL da Vercel às URLs de redirecionamento permitidas.
