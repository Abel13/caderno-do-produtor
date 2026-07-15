# Roadmap de implementação por módulos

## 1. Diretriz

O produto será implementado de forma incremental, mas não terá um MVP. Cada módulo deve ser entregue com o nível necessário de qualidade, segurança, responsividade, testes, auditoria e documentação para permanecer em produção.

Uma entrega incremental não significa uma entrega descartável. As primeiras etapas formam a base definitiva do produto e os módulos seguintes ampliam a solução sem substituir sua arquitetura central.

O eixo principal do produto é digitalizar o Caderno do Produtor. A ordem de implementação pode agrupar fichas relacionadas por contexto, mas cada funcionalidade exposta ao produtor deve corresponder a uma ficha real do caderno ou apoiar diretamente seu preenchimento, consulta, correção, comprovação ou exportação.

## 2. Princípios de execução

- Implementar módulos completos, respeitando suas dependências.
- Evitar funcionalidades temporárias que precisem ser reescritas nas etapas seguintes.
- Manter experiência equivalente em celular e computador.
- Aplicar segurança por conta e propriedade desde a primeira tabela.
- Incluir testes, acessibilidade, auditoria e documentação em todos os módulos.
- Tratar importações como dados em revisão até a confirmação do usuário.
- Preservar histórico e rastreabilidade desde o início.
- Entregar os 21 controles como partes conectadas de uma única plataforma.
- Manter registros operacionais como backbone técnico interno, sem substituir a experiência principal de preenchimento das fichas.
- Evitar agenda, recomendação automática, BI ou automação quando a ficha correspondente ainda não exigir esse comportamento.

## 3. Visão das etapas

| Etapa | Módulos | Resultado |
|---|---|---|
| 0 | Fundação técnica | Base de desenvolvimento, qualidade, segurança e entrega contínua. |
| 1 | Identidade e organizações | Usuários, contas, vínculos, papéis e permissões. |
| 2 | Estrutura rural | Propriedades, talhões, lavouras, culturas e safras. |
| 3 | Plataforma operacional | Backbone interno para fichas, anexos, histórico, busca, atividades e notificações. |
| 4 | Dashboard e navegação | Orientação para preencher fichas, contexto selecionado e preenchimento sob demanda. |
| 5 | Clima e água | Pluviometria e irrigação. |
| 6 | Solo e nutrição | Análises, correção e adubações. |
| 7 | Fitossanidade | Monitoramento e manejo de pragas, doenças e plantas daninhas. |
| 8 | Manejo da lavoura | Formação, produção e podas. |
| 9 | Colheita e pós-colheita | Colheita, lotes, processamento, rendimento e rastreabilidade. |
| 10 | Máquinas e manutenção | Ativos, manutenções e hora-máquina. |
| 11 | Gestão financeira | Despesas, receitas e fluxo de caixa. |
| 12 | Assistência técnica | Recomendações e acompanhamento. |
| 13 | Documentos e PDF | Upload, extração, revisão e criação assistida de registros. |
| 14 | Offline e sincronização | Trabalho em campo com conexão limitada. |
| 15 | Relatórios e inteligência | Indicadores, comparações, exportações e visão consolidada. |
| 16 | Consolidação do produto | Validação integrada dos 21 controles e prontidão operacional. |

## 3.1 Status atual do roadmap

Este status registra o que já existe no repositório para evitar replanejar módulos já entregues. Ele deve ser atualizado a cada módulo implementado.

Data da última revisão: 15/07/2026.

Legenda:

- **Pronto no repositório:** possui telas, migrations, regras principais, ações/repositórios e testes relacionados.
- **Parcial:** existe base funcional, mas ainda falta parte relevante do escopo previsto no roadmap.
- **Pendente:** ainda não possui implementação dedicada.
- **Não validado nesta revisão:** o status foi conferido por inspeção do repositório; a suíte completa de validação ainda deve ser executada.

| Etapa | Módulo | Status | Evidência principal | Próximo ponto aberto |
|---|---|---|---|---|
| 0 | Fundação técnica | Parcial | Next.js, TypeScript, Tailwind, Supabase local, scripts de portas, testes e padrões em `AGENTS.md`. | Confirmar suíte completa, CI/observabilidade e ambientes finais. |
| 1 | Identidade e organizações | Pronto no repositório | Login Google, onboarding, convites, papéis, RLS e página de acessos. | Validar fluxo autenticado e testes de RLS em ambiente local. |
| 2 | Estrutura rural | Pronto no repositório | Migrations e telas para propriedades, talhões, lavouras, safras e vínculo lavoura-safra. | Validar casos de histórico e permissões com banco local. |
| 3 | Plataforma operacional | Parcial | Backbone de registros operacionais, filtros, auditoria, estados e páginas operacionais. | Anexos/Storage, busca global, lembretes e catálogos completos. |
| 4 | Dashboard e navegação | Pronto no repositório | Dashboard contextual com propriedade ativa, resumos e atalhos por ficha implementada. | Evoluir indicadores conforme novos módulos. |
| 5 | Clima e água | Pronto no repositório | RF-01, RF-12 e RF-13 implementados em clima/chuva/irrigação. | Gráficos avançados, alertas e exportação final. |
| 6 | Solo e nutrição | Parcial | RF-04, RF-05, RF-06 e RF-07 implementados. | Importação PDF/OCR de laudos, recomendações e indicadores avançados. |
| 7 | Fitossanidade | Pendente | Sem módulo dedicado encontrado. | Implementar RF-08, RF-09 e RF-10. |
| 8 | Formação, produção e podas | Parcial | RF-02 coberto pela estrutura rural; RF-03 produção implementada. | RF-11 podas e complementos de formação de lavoura. |
| 9 | Colheita e pós-colheita | Pendente | Sem módulo dedicado encontrado. | Implementar RF-14 e RF-15. |
| 10 | Máquinas e manutenção | Pendente | Sem módulo dedicado encontrado. | Implementar RF-16. |
| 11 | Gestão financeira | Pendente | Sem módulo dedicado encontrado. | Implementar RF-17, RF-18 e RF-19. |
| 12 | Assistência técnica | Pendente | Sem módulo dedicado encontrado. | Implementar RF-20 e RF-21. |
| 13 | Documentos e PDF | Pendente | Sem pipeline de upload/OCR/revisão encontrado. | Começar por laudos de análise de solo. |
| 14 | Offline e sincronização | Pendente | Sem fila offline dedicada encontrada. | Definir rascunhos locais, idempotência e conflitos. |
| 15 | Relatórios e inteligência | Pendente | Sem módulo dedicado encontrado. | Implementar relatórios após amadurecimento dos módulos de dados. |
| 16 | Consolidação do produto | Pendente | Depende da cobertura integral. | Validar os 21 controles e jornadas integradas. |

### Cobertura atual dos requisitos funcionais

| Requisito | Controle | Status |
|---|---|---|
| RF-01 | Controle pluviométrico | Pronto no repositório |
| RF-02 | Formação de lavouras e cadastro de áreas | Parcial, coberto pela estrutura rural |
| RF-03 | Controle de produção | Pronto no repositório |
| RF-04 | Análises de solo | Pronto no repositório |
| RF-05 | Correção do solo | Pronto no repositório |
| RF-06 | Adubação via solo | Pronto no repositório |
| RF-07 | Adubação via folha | Pronto no repositório |
| RF-08 | Monitoramento de pragas e doenças | Pendente |
| RF-09 | Manejo de pragas e doenças | Pendente |
| RF-10 | Manejo de plantas daninhas | Pendente |
| RF-11 | Monitoramento de podas | Pendente |
| RF-12 | Controle climático diário | Pronto no repositório |
| RF-13 | Controle da irrigação | Pronto no repositório |
| RF-14 | Controle da colheita | Pendente |
| RF-15 | Controle pós-colheita | Pendente |
| RF-16 | Controle de manutenções | Pendente |
| RF-17 | Controle de despesas | Pendente |
| RF-18 | Controle de receitas | Pendente |
| RF-19 | Fluxo de caixa | Pendente |
| RF-20 | Recomendações técnicas e gerenciais | Pendente |
| RF-21 | Acompanhamento das recomendações e produção | Pendente |

Próxima implementação recomendada pelo status atual: **Etapa 7 — Fitossanidade**, começando por RF-08 Monitoramento de pragas e doenças.

## 4. Etapa 0 — Fundação técnica

### Objetivo

Criar a base definitiva do PWA e do processo de desenvolvimento.

### Entregáveis

- Aplicação Next.js com TypeScript.
- Estrutura de componentes e sistema visual responsivo.
- Supabase local e ambientes separados de desenvolvimento, homologação e produção.
- Estratégia de migrations, seeds e tipos gerados do banco.
- Validação compartilhada de dados entre interface e servidor.
- Tratamento padronizado de erros e logs.
- Testes unitários, integração e ponta a ponta.
- Pipeline de integração e entrega contínua.
- Monitoramento de erros, desempenho e disponibilidade.
- Manifesto PWA, ícones e instalação básica.
- Padrões de acessibilidade e localização em português do Brasil.
- Convenções de código, documentação técnica e decisões arquiteturais.

### Critério de conclusão

A aplicação pode ser construída, testada, publicada e monitorada de forma reproduzível nos três ambientes.

## 5. Etapa 1 — Identidade, contas e permissões

### Objetivo

Garantir isolamento, acesso controlado e colaboração entre produtores, técnicos e gestores.

### Entregáveis

- Autenticação pelo Supabase Auth.
- Recuperação de acesso e gestão de sessões.
- Conta ou organização rural.
- Cadastro separado de pessoa e usuário autenticado.
- Convites e vínculos com organizações.
- Papéis disponíveis na primeira versão: proprietário, gestor e técnico. Os demais valores permanecem reservados no modelo, sem exposição na aplicação.
- Situação dos vínculos, encerrados somente por revogação explícita e sem expiração automática.
- Políticas RLS para todas as tabelas da etapa.
- Perfil, moeda BRL, sistema métrico, fuso horário brasileiro e notificações internas.
- Auditoria de acessos e alterações administrativas.

### Dependências

- Etapa 0.

### Critério de conclusão

Usuários visualizam e alteram apenas os dados das contas às quais possuem acesso, conforme seu papel.

## 6. Etapa 2 — Estrutura rural

### Objetivo

Modelar a estrutura que contextualiza todos os controles do caderno.

### Entregáveis

- Cadastro de propriedades.
- Cadastro mínimo e complementar de talhões.
- Histórico de área, situação e limites do talhão.
- Encerramento lógico de talhões; divisão e união formais ficam fora desta etapa.
- Cafeicultura como cultura fixa do produto; cultivar permanece opcional.
- Cadastro de lavouras ou plantios separado do talhão.
- Espaçamento, população, sistema de cultivo e origem das mudas.
- Cadastro e encerramento de safras.
- Vínculo entre lavoura e safra.
- Seletores globais de conta, propriedade e safra.
- Cadastro manual; mapas, coordenadas e importação por planilha ficam fora desta etapa.
- Página de visão geral da propriedade e do talhão.

### Dependências

- Etapa 1.

### Critério de conclusão

É possível representar uma propriedade real, suas áreas, lavouras e ciclos produtivos sem perder o histórico de mudanças.

## 7. Etapa 3 — Plataforma operacional compartilhada

### Objetivo

Criar os recursos comuns que serão reutilizados pelas fichas digitais do caderno.

### Entregáveis

- Cabeçalho comum dos registros: contexto, data, situação, origem e responsável.
- Estados de rascunho, confirmado, cancelado e importado para revisão.
- Contrato de anexos com Supabase Storage e políticas de acesso.
- Fotografias, PDFs, laudos, notas e comprovantes como continuação da própria etapa quando a UX de upload for priorizada.
- Observações e comentários.
- Histórico de alterações e trilha de auditoria.
- Exclusão lógica e restauração autorizada.
- Filtros compartilhados por propriedade, safra, talhão, tipo, situação e período.
- Paginação e ordenação; busca global e exportação básica seguem como continuação.
- Catálogo de tipos de ficha e operações internas.
- Cadastro de fornecedores, compradores, laboratórios e prestadores.
- Sistema de lembretes e notificações internas como continuação da etapa.
- Padrão de formulários com salvamento seguro e prevenção de perda de dados.

### Dependências

- Etapas 1 e 2.

### Critério de conclusão

Novas fichas do caderno podem ser adicionadas reutilizando contexto, anexos, auditoria, busca e comportamento de formulários, sem expor complexidade operacional genérica ao produtor.

## 8. Etapa 4 — Dashboard e preenchimento sob demanda

### Objetivo

Entregar a experiência central de navegação da solução.

### Entregáveis

- Dashboard contextual por conta, propriedade e safra.
- Resumo de talhões e áreas.
- Atividades e registros recentes.
- Próxima ação recomendada com base em estrutura rural e registros operacionais.
- Documentos aguardando revisão quando a etapa de documentos estiver disponível.
- Cards condicionais que aparecem quando há dados.
- Estados vazios com orientação para iniciar um controle.
- Botão global “Novo registro”.
- Atalhos por ficha ou intenção reconhecida no caderno: chuva, irrigação, aplicação, observação e monitoramento.
- Atalhos configuráveis como evolução posterior.
- Preenchimento iniciado a partir da propriedade, talhão, alerta ou recomendação.
- Layout móvel, tablet e desktop.
- Preferências do usuário para dashboard e atalhos.

### Dependências

- Etapas 2 e 3.

### Critério de conclusão

O usuário encontra informações essenciais na página inicial e inicia os preenchimentos disponíveis sem navegar por estruturas complexas. Indicadores avançados e gráficos ficam vinculados aos módulos específicos a partir da etapa 5.

## 9. Etapa 5 — Clima e água

### Controles contemplados

- RF-01 — Controle pluviométrico.
- RF-12 — Controle climático diário, tratado separadamente do controle pluviométrico simples.
- RF-13 — Controle da irrigação.

### Entregáveis

- Subetapa 5A: cadastro de pontos de medição e registros de chuva.
- Subetapa 5A: controle pluviométrico simples por data, local e volume em milímetros.
- Subetapa 5A: controle climático diário com chuva, temperatura, umidade e ocorrências prejudiciais.
- Subetapa 5A: acumulados do mês e da safra ativa.
- Subetapa 5B: ficha de Controle da Irrigação, sem planejamento ou agenda.
- Subetapa 5B: informações do sistema de irrigação usado na área.
- Subetapa 5B: linhas realizadas com talhão, data, horário, tempo total, lâmina, frequência, volume, responsável e observações.
- Subetapa 5B: relação simples entre chuva e irrigação preenchidas.
- Gráficos e alertas no dashboard como evolução após os registros básicos.
- Exportação das tabelas correspondentes ao caderno.

### Dependências

- Etapas 2 a 4.

### Critério de conclusão

O produtor consegue registrar e analisar a disponibilidade de água por propriedade, talhão e período.

## 10. Etapa 6 — Solo e nutrição

### Controles contemplados

- RF-04 — Análises de solo.
- RF-05 — Correção do solo.
- RF-06 — Adubação via solo.
- RF-07 — Adubação via folha.

### Entregáveis

- Subetapa 6A: ficha digital de Controle de Análises de Solo, com preenchimento manual, laudo original anexado e histórico por talhão/profundidade.
- Subetapa 6A.2: importação assistida de PDF/OCR de laudos, com revisão humana antes de gravar dados definitivos.
- Subetapa 6B: ficha digital de Controle de Correção do Solo, registrando corretivo utilizado, PRNT, dose informada, quantidade total, hh/hm, combustível, responsável e observações, com vínculo opcional à análise de solo.
- Subetapa 6C: ficha digital de Controle de Adubação via Solo, registrando insumo, dose em kg/ha, quantidade em kg/talhão, cobertura/parcela, hh/hm, combustível, responsável e observações.
- Coletas, profundidades, pontos e laboratórios.
- Laudos, parâmetros, unidades e métodos de análise.
- Faixas de referência configuráveis.
- Recomendação agronômica de correção do solo fica para evolução posterior; nesta etapa a correção é apenas o registro da ficha preenchida pelo produtor.
- Cadastro de insumos, formulações e nutrientes.
- Planejamento e recomendações de adubação ficam para evolução posterior; nesta etapa a adubação via solo é apenas o registro realizado da ficha.
- Misturas e componentes de aplicação.
- Dose recomendada, dose aplicada, área e quantidade total.
- Custos e integração financeira controlada.
- Histórico e comparação por talhão.
- Alertas de prazos e divergências entre recomendado e realizado.

### Dependências

- Etapas 2 a 4.
- Catálogo de fornecedores da etapa 3.

### Critério de conclusão

Uma análise pode originar recomendações, aplicações e custos rastreáveis até o talhão e a safra.

## 11. Etapa 7 — Fitossanidade

### Controles contemplados

- RF-08 — Monitoramento de pragas e doenças.
- RF-09 — Manejo de pragas e doenças.
- RF-10 — Manejo de plantas daninhas.

### Entregáveis

- Catálogo de pragas, doenças e plantas daninhas.
- Métodos, pontos e escalas de amostragem.
- Registro de inspeções com ou sem ocorrência.
- Incidência, severidade, infestação e evidências.
- Níveis de atenção e ação configuráveis.
- Alertas e acompanhamento da evolução.
- Medidas químicas, biológicas, mecânicas, manuais e culturais.
- Produtos, doses, misturas, lotes, receituários e carência.
- Avaliação posterior da eficácia.
- Custos e histórico por talhão.
- Visão fitossanitária no dashboard.

### Dependências

- Etapas 2 a 4.
- Catálogo de insumos iniciado na etapa 6.

### Critério de conclusão

Uma ocorrência pode ser monitorada, tratada e reavaliada com histórico completo e alerta de carência.

## 12. Etapa 8 — Formação, produção e podas

Esta etapa será executada em subetapas guiadas pelas fichas do caderno. O primeiro recorte entregue após clima e água é o controle de produção, porque depende apenas da estrutura rural, da safra e do backbone operacional já existentes.

### Controles contemplados

- RF-02 — Formação de lavouras e cadastro de áreas.
- RF-03 — Controle de produção.
- RF-11 — Monitoramento de podas.

### Entregáveis

- Subetapa 8A: ficha digital de Controle e Acompanhamento de Produção, com talhão, safra, área, produção em sc/ha, produção total em sacas, data da colheita, lote, processo de beneficiamento, bebida, tipo, catação e observações.
- Subetapa 8A: consulta, filtros, edição, exclusão lógica, restauração, auditoria e resumo simples no dashboard.
- Complementação agronômica da implantação da lavoura.
- Origem e qualidade das mudas.
- Operações de preparo e plantio.
- População prevista e realizada.
- Planejamento, realização e cancelamento de podas.
- Tipo, motivo, quantidade de plantas, equipe e equipamentos.
- Previsão de recuperação produtiva.
- Estimativas e metas de produção.
- Registro de produção por área e safra.
- Indicadores avançados, comparações históricas, colheita detalhada e pós-colheita ficam para etapas específicas posteriores.

### Dependências

- Etapa 2.
- Etapas 3 e 4.

### Critério de conclusão

O histórico da lavoura relaciona implantação, intervenções estruturais e resultados produtivos ao longo das safras.

## 13. Etapa 9 — Colheita e pós-colheita

### Controles contemplados

- RF-14 — Controle da colheita.
- RF-15 — Controle pós-colheita.

### Entregáveis

- Planejamento e execução da colheita.
- Método, equipe, máquina, quantidade, maturação, perdas e custos.
- Identificação de lotes desde a origem no talhão.
- Recepção, processamento, secagem, beneficiamento e armazenagem.
- Umidade, volumes de entrada e saída e perdas.
- Rendimentos e conversões de unidades.
- Classificação e qualidade.
- Estoque por lote e local.
- Rastreabilidade do lote até a venda.
- Indicadores de avanço, produtividade, perdas e rendimento.

### Dependências

- Etapas 2, 3, 4 e 8.

### Critério de conclusão

Todo lote armazenado pode ser rastreado até a lavoura, talhão, safra e operações que o originaram.

## 14. Etapa 10 — Máquinas, equipamentos e manutenção

### Controles contemplados

- RF-16 — Controle de manutenções.

### Entregáveis

- Cadastro de máquinas, equipamentos e instalações.
- Propriedade própria, alugada ou de terceiro.
- Horímetro, quilometragem e condição operacional.
- Planos de manutenção preventiva.
- Manutenções corretivas.
- Serviços, peças, fornecedores e tempo de indisponibilidade.
- Alertas de próxima manutenção.
- Cálculo configurável do valor da hora-máquina.
- Apropriação de máquina e custo às atividades.
- Histórico e indicadores de custo por ativo.

### Dependências

- Etapas 2 a 4.
- Prestadores e fornecedores da etapa 3.

### Critério de conclusão

O sistema calcula e explica o custo da hora-máquina e mantém o histórico completo de cada ativo.

## 15. Etapa 11 — Gestão financeira

### Controles contemplados

- RF-17 — Controle de despesas.
- RF-18 — Controle de receitas.
- RF-19 — Fluxo de caixa.

### Entregáveis

- Plano de categorias financeiras baseado no caderno.
- Centros de custo por propriedade, talhão, lavoura, safra e atividade.
- Despesas previstas, realizadas, vencidas, pagas e estornadas.
- Receitas previstas, faturadas, recebidas e estornadas.
- Parcelas, vencimentos, fornecedores e compradores.
- Anexos e comprovantes.
- Integração explícita dos custos gerados em módulos operacionais.
- Aprovação ou confirmação antes da geração financeira quando configurada.
- Fluxo de caixa mensal de janeiro a dezembro.
- Entradas, custeio, investimentos e empréstimos.
- Saldos mensais e acumulados.
- Previsto versus realizado.
- Fechamento e reabertura autorizada de períodos.
- Indicadores financeiros no dashboard.

### Dependências

- Etapas 1 a 4.
- Dados de custos das etapas 5 a 10.

### Critério de conclusão

Os valores operacionais e financeiros são conciliados sem duplicidade e explicam a composição do saldo e dos custos da propriedade.

## 16. Etapa 12 — Assistência técnica e recomendações

### Controles contemplados

- RF-20 — Recomendações técnicas e gerenciais.
- RF-21 — Acompanhamento das recomendações e produção.

### Entregáveis

- Registro de visitas e atendimentos.
- Diagnóstico, recomendação, prioridade, prazo e responsável.
- Versionamento da recomendação.
- Comunicação e ciência do produtor.
- Plano de ação com uma ou várias atividades.
- Evidências, percentual de conclusão e justificativas.
- Situações aberta, em andamento, vencida, concluída e cancelada.
- Relação com registros dos módulos agronômicos e financeiros.
- Indicadores de execução e resultado produtivo.
- Dashboard do técnico e dashboard do produtor.
- Histórico por propriedade, talhão e safra.

### Dependências

- Etapas 1 a 4.
- Integração progressiva com os módulos 5 a 11.

### Critério de conclusão

Uma recomendação pode ser acompanhada desde o diagnóstico até sua execução e resultado, sem perder versões ou evidências.

## 17. Etapa 13 — Documentos e importação por PDF

### Objetivo

Permitir preenchimento assistido a partir de documentos sem comprometer a confiabilidade dos dados.

### Entregáveis

- Upload seguro de PDF.
- Validação de tamanho, formato, conteúdo e malware.
- Armazenamento privado do original.
- Fila assíncrona de processamento.
- OCR para PDFs digitalizados.
- Extração de texto e tabelas.
- Classificação do tipo de documento.
- Extração estruturada por modelo de documento.
- Evidência visual para cada campo sugerido.
- Nível de confiança e sinalização de incerteza.
- Tela de revisão lado a lado.
- Correção, confirmação e rejeição.
- Sugestão controlada de novos itens de catálogo.
- Prevenção de documentos e registros duplicados.
- Ligação entre arquivo, extração, revisão e registros criados.
- Auditoria e reprocessamento versionado.

### Ordem interna sugerida

1. Laudos de análise de solo.
2. Notas, recibos e documentos financeiros.
3. Fichas padronizadas do próprio caderno.
4. Documentos com tabelas complexas.
5. Documentos manuscritos, apenas quando a qualidade puder ser validada.

### Dependências

- Etapa 3.
- Módulo de destino já implementado para cada tipo de documento.

### Critério de conclusão

Nenhum dado extraído se torna definitivo sem validação, e todo registro importado pode ser rastreado ao trecho do documento que o originou.

## 18. Etapa 14 — Trabalho offline e sincronização

### Objetivo

Permitir uso confiável no campo com conexão ausente ou instável.

### Entregáveis

- Cache seguro da aplicação e dos catálogos necessários.
- Rascunhos locais.
- Fila persistente de operações pendentes.
- Identificadores gerados no cliente sem colisão.
- Indicador de estado online, offline e sincronizando.
- Reenvio automático com idempotência.
- Tratamento de anexos pendentes.
- Detecção e resolução de conflitos.
- Limites claros para operações que exigem conexão.
- Proteção dos dados armazenados no dispositivo.
- Testes de perda de conexão e recuperação.

### Dependências

- Estabilidade dos fluxos e modelos das etapas anteriores.

### Critério de conclusão

O usuário consegue concluir os preenchimentos definidos como offline e sincronizá-los posteriormente sem perda ou duplicidade.

## 19. Etapa 15 — Relatórios, indicadores e inteligência

### Objetivo

Transformar os registros em informações úteis para decisões técnicas e gerenciais.

### Entregáveis

- Relatórios equivalentes às tabelas do caderno.
- Filtros por propriedade, talhão, lavoura, safra e período.
- Comparações entre talhões e safras.
- Indicadores agronômicos, produtivos, operacionais e financeiros.
- Custos por hectare e unidade produzida.
- Histórico de chuva, aplicações, ocorrências e produção.
- Evolução das recomendações.
- Relatórios em PDF e planilha.
- Impressão em A4.
- Dashboard configurável por perfil.
- Definição visível de fórmulas, unidades e fontes de cada indicador.
- Alertas derivados dos dados, com regras explicáveis.

### Dependências

- Dados consistentes dos módulos 5 a 12.

### Critério de conclusão

Todo indicador informa origem, período, unidade e fórmula, podendo ser conferido nos registros que o compõem.

## 20. Etapa 16 — Consolidação integral

### Objetivo

Validar a solução completa como substituta digital do Caderno do Produtor.

### Entregáveis

- Matriz de cobertura dos 21 requisitos funcionais.
- Revisão das divergências entre o caderno fotografado e a solução.
- Validação com produtores, técnicos e gestores.
- Testes de jornadas completas entre módulos.
- Testes de segurança, RLS, permissões e auditoria.
- Testes de desempenho com volumes representativos.
- Testes de acessibilidade e dispositivos móveis.
- Testes de recuperação, backup e continuidade.
- Revisão de LGPD e retenção de documentos.
- Guias de uso, suporte e operação.
- Plano de migração ou importação de dados existentes.
- Observabilidade e indicadores de saúde do produto.

### Critério de conclusão

Os 21 controles, o dashboard, as importações, o uso offline, os relatórios e as jornadas integradas estão validados em produção com segurança e rastreabilidade.

## 21. Dependências entre módulos

```text
Fundação técnica
└── Identidade e organizações
    └── Estrutura rural
        └── Plataforma operacional
            ├── Dashboard e preenchimento
            ├── Clima e água
            ├── Solo e nutrição
            ├── Fitossanidade
            ├── Formação, produção e podas
            │   └── Colheita e pós-colheita
            ├── Máquinas e manutenção
            └── Assistência técnica
                └── Gestão financeira integra custos de todos os módulos

Documentos e PDF dependem do módulo de destino
Offline depende de fluxos estáveis
Relatórios dependem de dados consistentes
Consolidação depende de todos os módulos
```

## 22. Definição de pronto para qualquer módulo

Um módulo somente está concluído quando possuir:

1. Requisitos e regras de negócio validados.
2. Modelo de dados e migrations versionadas.
3. Políticas RLS testadas.
4. Interface responsiva em celular e computador.
5. Estados de carregamento, vazio, erro e ausência de permissão.
6. Validação de campos no cliente e servidor.
7. Auditoria e histórico quando aplicáveis.
8. Integração com anexos, busca e filtros quando aplicáveis.
9. Testes unitários, de integração e ponta a ponta.
10. Acessibilidade por teclado e leitor de tela nos fluxos principais.
11. Monitoramento de erros e eventos relevantes.
12. Documentação funcional e técnica.
13. Critérios de aceite demonstrados em homologação.
14. Dados de exemplo e estratégia de suporte operacional.

## 23. Planejamento de execução

O roadmap define ordem e dependências, não duração. Antes de estimar calendário, cada etapa deve ser refinada em:

- Jornadas de usuário.
- Histórias e critérios de aceite.
- Modelo de dados.
- Protótipos de interface.
- Integrações.
- Riscos técnicos e agronômicos.
- Volume esperado de dados.
- Estratégia de testes.

As etapas podem ter trabalho preparatório paralelo, mas uma funcionalidade não deve ser iniciada sobre entidades ainda instáveis das quais dependa.
