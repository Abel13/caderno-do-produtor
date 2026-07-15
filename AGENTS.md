# AGENTS.md — Caderno do Produtor

## 1. Objetivo

Este repositório contém o **Caderno do Produtor**, um PWA para gestão da lavoura cafeeira, desenvolvido com Next.js, TypeScript e Supabase.

Toda contribuição deve priorizar clareza, segurança, rastreabilidade, facilidade de uso no campo e manutenção de longo prazo. Não criar soluções provisórias destinadas a descarte posterior.

## 2. Contexto obrigatório

Antes de implementar uma funcionalidade, consulte:

- `docs/levantamento-de-requisitos.md` para requisitos funcionais e regras de negócio.
- `docs/analise-dados-estruturantes.md` para o modelo conceitual.
- `docs/roadmap-de-implementacao.md` para ordem e dependências dos módulos.
- `docs/desenvolvimento-local.md` para portas e ambiente local.

Ao concluir qualquer funcionalidade, correção ou refatoração que altere o status de um módulo, etapa ou requisito funcional, atualize a seção **Status atual do roadmap** em `docs/roadmap-de-implementacao.md`. O roadmap deve refletir o estado real do repositório, distinguindo claramente o que está pronto no código, parcial, pendente e o que ainda não foi validado pela suíte completa.

Em caso de divergência entre código, documentação e regra agronômica, não assuma silenciosamente. Registre a inconsistência e solicite validação.

## 3. Princípios de desenvolvimento

- Escreva código simples, legível e orientado ao domínio.
- Prefira funções pequenas, nomes explícitos e baixo acoplamento.
- Evite duplicação, abstrações prematuras e generalizações sem uso real.
- Não esconda regras de negócio em componentes visuais, callbacks ou SQL incidental.
- Não introduza dependências quando a plataforma ou uma função pequena resolver o problema adequadamente.
- Trate warnings, erros de tipo e falhas de teste como problemas a corrigir, não como ruído a silenciar.
- Não use `@ts-ignore`, `@ts-nocheck`, `eslint-disable` amplo ou casts inseguros sem justificativa documentada e escopo mínimo.
- Preserve compatibilidade com celular, computador e PWA instalado.
- Use português do Brasil nos textos da interface e inglês técnico consistente em código e banco de dados.

## 4. Arquitetura do backend — SOLID

O backend compreende regras de domínio, casos de uso, acesso ao Supabase, Route Handlers, Server Actions, funções SQL e serviços assíncronos.

### Responsabilidades

- **Domínio:** entidades, valores, invariantes e regras sem dependência de UI ou Supabase.
- **Aplicação:** casos de uso e coordenação de operações.
- **Infraestrutura:** Supabase, Storage, OCR, notificações e integrações externas.
- **Apresentação:** Route Handlers, Server Actions e adaptação de entrada e saída.

### Regras SOLID

- Cada módulo ou serviço deve possuir uma responsabilidade clara.
- Novas variações devem ser adicionadas por composição ou contratos, sem alterar regras estáveis desnecessariamente.
- Implementações devem respeitar integralmente os contratos que substituem.
- Interfaces devem ser pequenas e específicas ao consumidor.
- Casos de uso dependem de contratos do domínio ou aplicação, não diretamente de SDKs externos.

### Regras adicionais

- Não acesse o Supabase diretamente dentro de componentes visuais.
- Encapsule queries em repositórios ou funções de acesso tipadas por domínio.
- Valide toda entrada externa no limite da aplicação, usando schemas compartilháveis.
- Não confie apenas na validação do cliente.
- Operações com múltiplas alterações dependentes devem ser atômicas, usando função SQL ou transação apropriada.
- Processos reexecutáveis devem ser idempotentes.
- Erros de domínio devem ser distinguíveis de falhas técnicas.

## 5. Arquitetura do frontend — MVVM

As funcionalidades do frontend devem seguir MVVM sem transformar a estrutura em cerimônia excessiva.

### Model

- Tipos de domínio e DTOs validados.
- Estado persistido ou recebido do backend.
- Não contém dependência de componentes React.

### ViewModel

- Hooks e controladores responsáveis por estado de tela, validação, transformação e ações.
- Expõe à View dados já preparados para exibição.
- Não retorna elementos JSX.
- Deve ser testável sem renderizar a página inteira.

### View

- Componentes React focados em apresentação e interação.
- Não contém regra agronômica, financeira ou de permissão.
- Delega operações e decisões ao ViewModel.
- Trata explicitamente estados de carregamento, vazio, erro, offline e ausência de permissão.

Use Server Components para leitura e composição quando apropriado. Use Client Components apenas quando houver interatividade, APIs do navegador ou estado local necessário.

## 6. Componentes — Atomic Design

Organize componentes reutilizáveis nas seguintes camadas:

- `atoms`: elementos indivisíveis, como botão, campo, ícone e badge.
- `molecules`: combinações pequenas, como campo com rótulo, seletor de propriedade e card de métrica.
- `organisms`: blocos funcionais, como formulário de talhão, navegação e painel de produção.
- `templates`: composição estrutural de páginas sem regra específica de uma instância.
- `pages`: rotas que conectam dados, ViewModels e templates.

Regras:

- Não crie um átomo para cada tag HTML.
- Componentes específicos de um domínio permanecem dentro do módulo correspondente.
- Promova um componente para a biblioteca compartilhada apenas quando houver reutilização real.
- Variantes visuais devem usar APIs tipadas, preferencialmente com `class-variance-authority`.
- Componentes interativos devem possuir nome acessível, foco visível e operação por teclado.

## 7. Estrutura recomendada por módulo

```text
src/modules/<module>/
├── domain/
│   ├── entities.ts
│   ├── schemas.ts
│   └── rules.ts
├── application/
│   ├── use-cases/
│   └── ports.ts
├── infrastructure/
│   └── supabase/
├── presentation/
│   ├── view-models/
│   └── components/
└── tests/
```

Adapte a estrutura à complexidade real. Não crie arquivos vazios ou camadas sem comportamento apenas para seguir o desenho.

## 8. TypeScript e contratos

- O modo estrito deve permanecer ativo.
- Não use `any`; prefira `unknown` com narrowing quando o tipo não for conhecido.
- Derive tipos de schemas ou contratos sempre que possível.
- Não duplique manualmente tipos de banco, domínio e formulário sem necessidade.
- Datas, moedas, áreas, doses e unidades devem ter significado explícito no nome ou tipo.
- Não represente dinheiro com ponto flutuante em regras críticas; use valores inteiros na menor unidade ou decimal do PostgreSQL.
- Diferencie identificadores com tipos ou nomes específicos, evitando parâmetros genéricos como `id` quando houver ambiguidade.
- Alterações de contratos públicos exigem atualização dos consumidores e testes.

## 9. Supabase e banco de dados

- Toda mudança estrutural deve ser feita por migration versionada.
- Não altere manualmente o schema de produção.
- Toda tabela com dados do usuário deve possuir RLS habilitado e políticas testadas.
- Políticas devem considerar conta, propriedade, papel e vínculo ativo.
- O produtor é proprietário dos dados; o acesso técnico é concedido por propriedade.
- Dados criados pelo técnico permanecem com a propriedade após revogação do acesso.
- Exclusões relevantes devem ser lógicas quando houver auditoria ou rastreabilidade.
- Recomendações publicadas são versionadas, não sobrescritas silenciosamente.
- Registros importados devem manter vínculo com arquivo, extração e revisão.
- Nenhum dado extraído de PDF pode se tornar definitivo sem confirmação humana.
- Storage deve ser privado por padrão e acessado por políticas ou URLs assinadas.
- Queries devem selecionar somente colunas necessárias e evitar N+1.
- Índices devem acompanhar filtros, chaves estrangeiras e políticas frequentes.

## 10. Portas e ambiente local

Portas reservadas:

- Next.js: `3020`.
- Supabase: `57320–57329`.

Antes de iniciar Next.js ou Supabase, execute a checagem de portas correspondente.

- Não escolha outra porta silenciosamente.
- Não encerre processos externos para liberar portas.
- Não remova containers, imagens ou volumes de outros projetos.
- Se houver conflito, interrompa a inicialização e informe o processo responsável.
- Se o Docker estiver sem espaço, não execute limpeza destrutiva sem autorização explícita.

## 11. Testes obrigatórios

### Testes unitários

Toda regra ou funcionalidade nova deve possuir testes unitários cobrindo:

- Caminho principal.
- Limites e validações.
- Erros de domínio.
- Transformações e cálculos.
- ViewModels e estados derivados.

Priorize regras agronômicas, cálculos financeiros, estimativas de produção, permissões, sincronização e importação de documentos.

### Testes de integração

Crie testes de integração para:

- Repositórios Supabase.
- Migrations, constraints e funções SQL.
- Políticas RLS entre produtor, técnico e usuário sem acesso.
- Storage privado.
- Fluxos envolvendo várias tabelas ou serviços.

Use um banco descartável e dados determinísticos. Testes não podem depender de dados pessoais ou de produção.

### Testes E2E

Fluxos críticos devem possuir testes E2E com Playwright:

- Login e callback Google, usando estratégia segura de teste.
- Criação e alternância de propriedades.
- Cadastro de talhão, lavoura e safra.
- Novo registro iniciado pelo dashboard.
- Técnico publica recomendação, produtor registra execução e técnico valida.
- Importação e revisão de análise de solo.
- Registro offline e sincronização posterior.
- Despesa sugerida por atividade e confirmação financeira.

Não simule internamente a funcionalidade que o teste pretende validar. Use seletores acessíveis por papel, nome ou rótulo; evite seletores acoplados à estrutura do DOM.

### Critério mínimo antes de concluir uma tarefa

Execute:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Execute também os testes E2E relacionados quando o fluxo alterado possuir cobertura E2E.

Não reduza cobertura, remova assertions ou marque testes como ignorados para obter uma execução verde.

## 12. Iconografia Feather

- Use exclusivamente ícones do conjunto Feather para a interface do produto.
- Centralize a exportação dos ícones utilizados para evitar importações inconsistentes.
- Não misture Feather com Material Icons, Font Awesome, emojis ou ilustrações que funcionem como ícones.
- Ícones decorativos devem usar `aria-hidden="true"`.
- Botões apenas com ícone devem possuir `aria-label` descritivo e tooltip quando o significado não for óbvio.
- Mantenha espessura, tamanho e alinhamento consistentes.
- Não use ícones como única forma de comunicar estado crítico.

## 13. Animações e movimento

- Animações devem ser suaves, curtas e funcionais.
- Use movimento para transições de estado, feedback, abertura de painéis e orientação espacial.
- Duração padrão: `150–250ms`; operações maiores podem usar até `400ms` quando justificado.
- Prefira `opacity` e `transform` para evitar reflow.
- Evite animações contínuas, excessivas ou que atrasem ações.
- Respeite `prefers-reduced-motion` e ofereça experiência completa sem movimento.
- Loading deve refletir progresso real; não use animação para esconder operações lentas.
- Não adicione biblioteca de animação sem necessidade demonstrada.

## 14. UX móvel e acessibilidade

- Projete primeiro para celular, sem degradar desktop.
- Alvos de toque devem possuir pelo menos 44 × 44 pixels.
- Formulários de campo devem solicitar apenas informações necessárias ao contexto.
- Preserve dados digitados em falhas de rede ou navegação acidental.
- Informe claramente rascunho, sincronização, offline, sucesso e erro.
- Não deixe cards vazios no dashboard; use orientação contextual.
- Todos os campos devem possuir rótulo, mensagem de erro associada e instrução quando necessária.
- Contraste deve atender WCAG 2.2 AA.
- Fluxos principais devem funcionar por teclado e leitor de tela.
- Não dependa somente de cor para transmitir significado.

## 15. Offline e sincronização

- Somente fluxos definidos como disponíveis offline devem aceitar confirmação sem rede.
- Registros locais precisam de identificador estável e chave de idempotência.
- Sincronização deve suportar repetição sem duplicar dados.
- Conflitos não podem ser resolvidos sobrescrevendo silenciosamente alterações.
- O usuário deve visualizar itens pendentes, falhos e sincronizados.
- Anexos devem possuir fila e progresso separados do registro principal.
- Dados sensíveis armazenados no dispositivo devem ser minimizados.

## 16. Segurança e privacidade

- Nunca exponha `service_role`, secrets OAuth ou credenciais em código cliente.
- Variáveis públicas devem possuir somente valores seguros para o navegador.
- Não registre tokens, documentos pessoais, conteúdo de laudos ou dados financeiros em logs.
- Valide tipo, tamanho e autorização de uploads.
- Use URLs assinadas para documentos privados.
- Dependências devem ser avaliadas e atualizadas conscientemente.
- Não execute correções automáticas destrutivas de auditoria sem entender o impacto.
- Trate dados pessoais segundo a LGPD e colete somente o necessário.

## 17. Observabilidade e erros

- Erros apresentados ao usuário devem ser claros e orientados à recuperação.
- Logs técnicos devem incluir contexto suficiente sem dados sensíveis.
- Eventos críticos devem ser rastreáveis por correlation ID quando atravessarem serviços.
- Registre métricas de falha de sincronização, importação, notificações e ações críticas.
- Não capture exceções sem tratamento ou rethrow apropriado.

## 18. Commits — Conventional Commits

Todo commit deve seguir Conventional Commits:

```text
<type>(<scope>): <description>
```

Tipos aceitos:

- `feat`: nova funcionalidade.
- `fix`: correção de comportamento.
- `refactor`: alteração interna sem mudança funcional.
- `test`: criação ou manutenção de testes.
- `docs`: documentação.
- `chore`: manutenção e ferramentas.
- `perf`: melhoria de desempenho.
- `build`: build ou dependências.
- `ci`: integração e entrega contínua.
- `style`: formatação sem mudança de comportamento.
- `revert`: reversão explícita.

Exemplos:

```text
feat(plots): add plot registration flow
fix(rls): restrict technician access by property
test(recommendations): cover producer execution workflow
docs(local): document reserved Supabase ports
```

Regras:

- Use descrição imperativa, curta e específica.
- Um commit deve representar uma unidade coerente de mudança.
- Não misture refatoração ampla, funcionalidade e formatação sem necessidade.
- Mudanças incompatíveis devem usar `!` e explicar a migração no corpo.
- Não inclua segredos, arquivos de ambiente ou artefatos gerados.

## 19. Pull requests e revisão

Toda entrega deve informar:

- Problema resolvido.
- Decisões e impactos arquiteturais.
- Evidências de teste.
- Alterações de schema ou RLS.
- Capturas ou gravações para mudanças visuais relevantes.
- Riscos, limitações e acompanhamento necessário.

Durante a revisão, priorize correção das regras, segurança dos dados, experiência móvel, acessibilidade e manutenção antes de preferências estéticas.

## 20. Definição de pronto

Uma funcionalidade está pronta apenas quando:

1. Requisitos e regras estão claros e atendidos.
2. Código respeita SOLID, MVVM e a estrutura de componentes aplicável.
3. Validação existe no cliente e no backend.
4. RLS e permissões foram consideradas e testadas.
5. Estados de erro, vazio, carregamento e offline foram tratados.
6. Testes unitários foram adicionados.
7. Testes de integração foram adicionados quando há banco ou serviço externo.
8. Fluxos críticos possuem cobertura E2E.
9. A interface é responsiva e acessível.
10. Lint, tipos, testes e build passam sem supressões indevidas.
11. Documentação foi atualizada, incluindo o **Status atual do roadmap** quando houver mudança de cobertura, módulo, etapa ou RF.
12. O commit segue Conventional Commits.

## 21. Restrições de escopo

- O produto atende somente cafeicultura.
- Não implementar controle de estoque sem revisão explícita do escopo.
- Não confirmar automaticamente conteúdo extraído de PDF.
- Não misturar custos operacionais com despesas financeiras sem confirmação.
- Não adicionar suporte genérico a múltiplas culturas antecipadamente.
- Não modificar fórmulas agronômicas sem fonte documentada, versão e aprovação técnica.
