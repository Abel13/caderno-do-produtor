# Levantamento de requisitos — Caderno do Produtor

## 1. Visão do produto

Digitalizar os 21 controles operacionais do Caderno do Produtor em uma solução capaz de registrar, consultar e relacionar informações técnicas, produtivas e financeiras da propriedade rural ao longo de cada safra.

O sistema deve substituir as fichas em papel sem perder sua simplicidade, mantendo histórico, rastreabilidade por área e apoio à tomada de decisão do produtor e do técnico de campo.

## 2. Perfis de usuário

| Perfil | Responsabilidade |
|---|---|
| Produtor | Registrar atividades, ocorrências, custos, receitas e observações da propriedade. |
| Técnico de campo | Cadastrar recomendações, acompanhar sua execução e analisar indicadores. |
| Gestor da propriedade | Consultar resultados produtivos, operacionais e financeiros consolidados. |
| Administrador | Manter usuários, propriedades, unidades, culturas e parâmetros do sistema. |

## 3. Premissas

- Uma propriedade pode possuir várias áreas, glebas ou talhões.
- Todo registro operacional deve estar associado a uma propriedade, safra, data e, quando aplicável, área ou talhão.
- Quantidades devem armazenar valor e unidade de medida.
- Registros podem conter anexos, observações e identificação do responsável.
- Dados históricos não devem ser apagados ao iniciar uma nova safra.
- O sistema deve funcionar em celular, inclusive em condições de conectividade limitada.

## 4. Requisitos funcionais por tópico

### RF-01 — Controle pluviométrico

O sistema deve permitir registrar precipitações por data, propriedade e ponto de medição.

- Dados: data, volume em milímetros, pluviômetro ou local, responsável e observações.
- Regras: não aceitar volume negativo; permitir no máximo um registro por ponto e período de medição, salvo correção justificada.
- Saídas: acumulado diário, mensal e por safra; comparação entre períodos; gráfico de chuvas.

### RF-02 — Formação de lavouras e cadastro de áreas

O sistema deve manter o cadastro agronômico e geográfico das áreas produtivas.

- Dados: propriedade, gleba ou talhão, área, cultura, cultivar, espaçamento, população de plantas, data de plantio, origem das mudas e situação da lavoura.
- Regras: cada área deve possuir identificador único dentro da propriedade; alterações estruturais devem manter histórico.
- Saídas: ficha da área, mapa ou listagem de talhões e área total por cultura ou cultivar.

### RF-03 — Controle de produção

O sistema deve registrar a produção obtida por área e safra.

- Dados: área, safra, quantidade produzida, unidade, tipo ou qualidade do produto, perdas e observações.
- Regras: converter unidades para um padrão configurável; impedir associação a área inativa na data informada.
- Saídas: produção total, produtividade por hectare, comparação entre áreas e safras.

### RF-04 — Análises de solo

O sistema deve cadastrar coletas e resultados de análises de solo.

- Dados: área, data da coleta, profundidade, laboratório, número do laudo e resultados de cada parâmetro analisado.
- Regras: preservar o laudo original como anexo; identificar unidade e método quando informados.
- Saídas: histórico por área, comparação temporal e parâmetros fora da faixa de referência.

### RF-05 — Correção do solo

O sistema deve registrar recomendações e aplicações de corretivos.

- Dados: análise de referência, área, produto, dose recomendada, dose aplicada, data, quantidade, método e responsável.
- Regras: diferenciar recomendação de execução; calcular quantidade prevista a partir da área e da dose.
- Saídas: aplicações por área, diferença entre recomendado e realizado e custo da correção.

### RF-06 — Adubação via solo

O sistema deve planejar e registrar aplicações de fertilizantes no solo.

- Dados: área, produto ou formulação, nutrientes, dose, parcelamento, data prevista, data realizada, quantidade e custo.
- Regras: permitir várias parcelas para uma recomendação; sinalizar aplicação atrasada ou quantidade divergente.
- Saídas: calendário de adubação, nutrientes aplicados por área e custo por hectare.

### RF-07 — Adubação via folha

O sistema deve planejar e registrar aplicações foliares.

- Dados: área, produto, concentração ou dose, volume de calda, finalidade, data, condições climáticas e responsável.
- Regras: registrar os componentes de misturas separadamente; vincular a recomendação técnica quando existente.
- Saídas: histórico de aplicações, produtos utilizados e custo por aplicação.

### RF-08 — Monitoramento de pragas e doenças

O sistema deve registrar inspeções fitossanitárias e seus resultados.

- Dados: área, data, praga ou doença, método e pontos de amostragem, incidência, severidade, nível de infestação e evidências.
- Regras: permitir inspeção sem ocorrência; usar escalas configuráveis e identificar o responsável pela amostragem.
- Saídas: evolução da ocorrência, áreas críticas, alertas por nível de ação e mapa de incidência quando houver coordenadas.

### RF-09 — Manejo de pragas e doenças

O sistema deve registrar as medidas de controle adotadas após o monitoramento.

- Dados: ocorrência relacionada, método de controle, produto, dose, quantidade, data, equipamento, aplicador, período de carência e custo.
- Regras: exigir justificativa ou ocorrência associada; registrar lote do produto e receituário quando aplicável.
- Saídas: tratamentos realizados, eficácia observada, calendário de carência e custo fitossanitário.

### RF-10 — Manejo de plantas daninhas

O sistema deve registrar monitoramentos e intervenções para controle de plantas daninhas.

- Dados: área, espécies ou nível de infestação, método de controle, produto ou operação, dose, data, faixa tratada e custo.
- Regras: distinguir controle químico, mecânico, manual e cultural; permitir avaliação posterior da eficácia.
- Saídas: histórico por área, frequência de intervenção e custo do manejo.

### RF-11 — Monitoramento de podas das lavouras

O sistema deve planejar e acompanhar podas.

- Dados: área, data, tipo de poda, quantidade ou percentual de plantas, motivo, equipe, equipamento e previsão de retorno produtivo.
- Regras: manter situação planejada, realizada ou cancelada; registrar alterações relevantes na população de plantas.
- Saídas: áreas podadas por período, calendário de acompanhamento e histórico por talhão.

### RF-12 — Segundo controle pluviométrico

O sumário fotografado apresenta um segundo tópico denominado “Controle pluviométrico”. Na implementação, ele será tratado como controle climático diário, separado do RF-01.

- Dados: data, chuva em milímetros, temperatura mínima/média/máxima, umidade relativa e ocorrências prejudiciais.
- Saídas: série histórica e consolidação de chuva por fase da cultura.
- Decisão: manter separado do controle pluviométrico simples na interface e no tipo de registro operacional.

### RF-13 — Controle da irrigação

O sistema deve planejar e registrar eventos de irrigação.

- Dados: área, data, sistema de irrigação, duração, lâmina aplicada, vazão, fonte de água, consumo de energia e responsável.
- Regras: calcular volume quando houver dados suficientes; impedir duração ou lâmina negativa.
- Saídas: água aplicada por área e período, custo estimado e comparação com precipitação.

### RF-14 — Controle da colheita

O sistema deve registrar as operações e os volumes colhidos.

- Dados: área, data, método de colheita, equipe ou máquina, quantidade, unidade, estágio de maturação, perdas e custo.
- Regras: permitir várias operações na mesma área; vincular o volume colhido ao lote de pós-colheita.
- Saídas: avanço da colheita, volume por área, rendimento operacional e custo por unidade produzida.

### RF-15 — Controle pós-colheita

O sistema deve acompanhar lotes desde a recepção até a armazenagem.

- Dados: origem, lote, processo, datas de início e fim, volumes de entrada e saída, umidade, local de secagem ou armazenamento, classificação e perdas.
- Regras: cada lote deve possuir identificação rastreável; transformações não podem gerar saída superior à entrada sem justificativa.
- Saídas: rendimento do café, perdas, estoque por lote e histórico de processamento.

### RF-16 — Controle de manutenções

O sistema deve planejar e registrar manutenções de máquinas, equipamentos e instalações.

- Dados: bem, horímetro ou quilometragem, tipo de manutenção, data, serviço, peças, horas trabalhadas, fornecedor, custo e próxima manutenção.
- Regras: distinguir manutenção preventiva e corretiva; calcular valor da hora-máquina com parâmetros configuráveis.
- Saídas: calendário preventivo, histórico do bem, indisponibilidade e custo por máquina.

### RF-17 — Controle de despesas

O sistema deve registrar despesas da atividade rural.

- Dados: data, competência, categoria, fornecedor, descrição, área ou centro de custo, quantidade, valor, vencimento, pagamento e comprovante.
- Regras: distinguir previsto, realizado, pago e pendente; não aceitar valor negativo sem classificação de estorno.
- Saídas: despesas por categoria, área, mês e safra; contas a pagar; custo de produção.

### RF-18 — Controle de receitas

O sistema deve registrar receitas e vendas.

- Dados: data, comprador, lote ou produto, quantidade, unidade, preço unitário, valor total, vencimento, recebimento, descontos e documento.
- Regras: calcular o total a partir da quantidade e preço; distinguir previsto, faturado e recebido.
- Saídas: receitas por período, comprador, produto e safra; contas a receber; preço médio de venda.

### RF-19 — Fluxo de caixa

O sistema deve controlar o fluxo de caixa mensal da propriedade, permitindo analisar entradas e saídas, identificar os principais custos da produção, avaliar a situação econômica da atividade e utilizar o histórico no planejamento futuro.

Fontes: [orientações do fluxo de caixa](imagens/07-fluxo-de-caixa/IMG_0158.jpg) e [modelo de preenchimento](imagens/07-fluxo-de-caixa/IMG_0159.jpg).

#### RF-19.1 — Período e estrutura

- Apresentar os lançamentos em uma visão anual, com colunas de janeiro a dezembro.
- Permitir selecionar propriedade, ano ou safra e moeda.
- Manter uma linha para cada categoria e os respectivos valores mensais.
- Permitir consultar anos anteriores para apoiar o planejamento futuro.
- Distinguir valores previstos de valores realizados, sem misturá-los no mesmo cálculo.

#### RF-19.2 — Entradas

O sistema deve registrar e totalizar mensalmente as seguintes entradas:

- Venda da produção.
- Venda de subprodutos.
- Outros componentes de renda.
- Venda de máquinas e equipamentos.
- Empréstimos recebidos.

Cada entrada deve possuir, no mínimo: data, competência mensal, categoria, descrição, valor em reais, origem, situação prevista ou realizada e vínculo opcional com receita, venda, lote ou documento.

#### RF-19.3 — Saídas de custeio

O sistema deve registrar e subtotalizar mensalmente as seguintes saídas de custeio:

- Aluguel de terras, máquinas ou equipamentos.
- Combustível.
- Conservação da irrigação.
- Conservação de benfeitorias.
- Conservação de máquinas.
- Defensivos e adjuvantes.
- Energia elétrica.
- Fertilizantes aplicados via solo ou folha.
- Fretes e carregamentos.
- Herbicidas e adjuvantes.
- Impostos e taxas.
- Mão de obra contratada.
- Mão de obra fixa.
- Sementes e mudas.
- Itens de colheita.
- Itens de pós-colheita.

Cada saída deve possuir, no mínimo: data, competência mensal, categoria, descrição, fornecedor ou favorecido, valor em reais, situação prevista ou realizada e vínculo opcional com despesa, área, atividade, máquina ou documento.

#### RF-19.4 — Investimentos e empréstimos

- Registrar separadamente investimentos e pagamentos de empréstimos.
- Permitir detalhar tipo, descrição, instituição ou fornecedor, parcela, vencimento e valor.
- Não classificar investimento ou amortização de empréstimo como saída de custeio.
- Considerar esses valores no total geral de saídas do mês.

#### RF-19.5 — Cálculos obrigatórios

Para cada mês, o sistema deve calcular automaticamente:

1. **Total de entradas:** soma de todas as categorias de entrada.
2. **Subtotal de custeio:** soma de todas as saídas de custeio.
3. **Total de investimentos/empréstimos:** soma dos investimentos e pagamentos de empréstimos.
4. **Total de saídas:** subtotal de custeio + investimentos/pagamentos de empréstimos.
5. **Saldo mensal:** total de entradas − total de saídas.
6. **Saldo acumulado:** saldo acumulado do mês anterior + saldo mensal atual.

No primeiro mês do período, o saldo acumulado deve considerar o saldo inicial informado pelo usuário, quando houver.

#### RF-19.6 — Regras de negócio

- Lançamentos integrados aos controles de receitas e despesas não podem ser duplicados no fluxo de caixa.
- O sistema deve preservar a diferença entre data de competência, vencimento e pagamento ou recebimento.
- Valores devem ser positivos; a natureza de entrada ou saída determina o efeito no saldo.
- Estornos e correções devem referenciar o lançamento original e manter histórico de auditoria.
- Categorias adicionais podem ser cadastradas, mas devem pertencer a um dos três grupos: entrada, saída de custeio ou investimento/empréstimo.
- Alterações retroativas devem recalcular os saldos mensais e acumulados dos meses posteriores.
- O fechamento de um mês deve impedir alterações comuns, permitindo reabertura apenas a usuário autorizado.

#### RF-19.7 — Consultas e saídas

- Tabela anual equivalente ao modelo do caderno, com categorias nas linhas e meses nas colunas.
- Fluxo de caixa previsto e fluxo de caixa realizado.
- Comparação entre previsto e realizado por mês e categoria.
- Gráfico mensal de entradas, saídas e saldo.
- Identificação dos itens de maior custo da propriedade.
- Saldo acumulado e projeção de disponibilidade financeira.
- Exportação e impressão da tabela anual.

#### RF-19.8 — Critérios de aceite específicos

1. Ao informar entradas e saídas de um mês, os totais e saldos são recalculados automaticamente.
2. O saldo mensal corresponde ao total de entradas menos o total de saídas.
3. O saldo acumulado de cada mês corresponde ao acumulado anterior somado ao saldo do mês.
4. Uma alteração em mês anterior atualiza todos os saldos acumulados posteriores.
5. Receitas e despesas integradas aparecem uma única vez no fluxo de caixa.
6. O usuário consegue alternar entre valores previstos, realizados e sua comparação.
7. A visão anual apresenta todas as categorias da ficha original e os doze meses.
8. O relatório permite identificar os principais custos e subsidiar decisões de planejamento.

### RF-20 — Recomendações técnicas e gerenciais

O sistema deve permitir que o técnico registre recomendações direcionadas ao produtor.

- Dados: propriedade, área, data, tema, diagnóstico, recomendação, prioridade, prazo, responsável e anexos.
- Regras: toda recomendação deve possuir autor e situação; alterações posteriores devem ser versionadas.
- Saídas: plano de ação, recomendações abertas, vencidas, concluídas ou canceladas.

### RF-21 — Acompanhamento das recomendações e produção

O sistema deve acompanhar a execução das recomendações e relacioná-la aos resultados produtivos.

- Dados: recomendação, atividades executadas, data, responsável, evidência, percentual de conclusão, justificativa e resultado observado.
- Regras: uma recomendação pode gerar várias ações; conclusão deve registrar data e evidência ou justificativa.
- Saídas: taxa de execução, pendências por responsável, evolução por visita técnica e comparação com indicadores de produção.

## 5. Requisitos transversais

| ID | Requisito |
|---|---|
| RF-22 | O sistema deve cadastrar produtores, técnicos, propriedades, áreas, safras, culturas, insumos, máquinas, fornecedores e compradores. |
| RF-23 | O sistema deve permitir pesquisa e filtros por propriedade, área, safra, período, categoria e situação. |
| RF-24 | O sistema deve permitir anexar fotografias, laudos, notas fiscais, receituários e outros documentos. |
| RF-25 | O sistema deve gerar relatórios em tela e exportações em formatos adequados para impressão e análise. |
| RF-26 | O sistema deve apresentar painel com clima, atividades, recomendações, produção, custos e fluxo de caixa. |
| RF-27 | O sistema deve emitir lembretes de atividades previstas, recomendações vencendo, carências e manutenções. |
| RF-28 | O sistema deve registrar autor, data de criação e histórico de alterações dos registros. |
| RF-29 | O sistema deve permitir funcionamento offline e sincronização posterior sem duplicar registros. |
| RF-30 | O sistema deve permitir anotações gerais vinculadas à propriedade, safra ou visita técnica. |

## 6. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | A interface deve ser responsiva e priorizar o uso em celular no campo. |
| RNF-02 | Operações frequentes devem exigir poucos passos e usar linguagem familiar ao produtor. |
| RNF-03 | O acesso deve ser protegido por autenticação e autorização conforme o perfil. |
| RNF-04 | Dados devem ser criptografados em trânsito e possuir rotina de cópia de segurança. |
| RNF-05 | O sistema deve manter trilha de auditoria para dados técnicos e financeiros. |
| RNF-06 | Unidades, moedas, escalas agronômicas e categorias devem ser configuráveis. |
| RNF-07 | Datas, números e valores devem seguir o padrão brasileiro por padrão. |
| RNF-08 | A solução deve observar a LGPD, incluindo finalidade, acesso e exclusão de dados pessoais quando aplicável. |
| RNF-09 | A sincronização deve tolerar conexão instável e informar claramente conflitos ou falhas. |
| RNF-10 | Relatórios e formulários devem possuir versão adequada para impressão em A4. |

## 7. Regras de negócio gerais

| ID | Regra |
|---|---|
| RN-01 | Registros de uma safra encerrada devem permanecer disponíveis para consulta e comparação. |
| RN-02 | Exclusões devem ser lógicas quando o registro participar de cálculos ou rastreabilidade. |
| RN-03 | Os dois tópicos identificados como controle pluviométrico devem ser validados com o responsável pelo produto antes da modelagem definitiva. |
| RN-04 | Custos operacionais devem alimentar despesas e fluxo de caixa sem criar lançamentos duplicados. |
| RN-05 | Produção, colheita e pós-colheita devem compartilhar identificadores que permitam rastrear a origem do lote. |
| RN-06 | Recomendações técnicas não podem ser alteradas silenciosamente após sua comunicação ao produtor. |
| RN-07 | Todo cálculo automático deve informar fórmula, unidade e período considerados. |

## 8. Critérios gerais de aceite

1. O usuário consegue cadastrar uma propriedade, suas áreas e uma safra.
2. O usuário consegue registrar e consultar dados dos 21 controles.
3. Os registros podem ser filtrados por área, safra e período.
4. Produção, custos, receitas e caixa são consolidados sem duplicidade.
5. Recomendações possuem situação, prazo, responsável e acompanhamento.
6. Cada alteração relevante informa quem a realizou e quando.
7. O produtor consegue registrar dados no celular sem conexão e sincronizá-los posteriormente.
8. Os principais relatórios podem ser visualizados e impressos.

## 9. Pendências para validação

- Confirmar o nome e a finalidade do tópico 12, repetido como “Controle pluviométrico” no sumário fotografado.
- Validar todos os campos das tabelas a partir de fotos frontais e em maior resolução.
- Definir quais escalas, unidades e indicadores agronômicos serão padronizados.
- Regras de acesso validadas para a primeira versão: proprietário administra gestores e técnicos; gestor administra somente técnicos; técnico acessa apenas propriedades concedidas. Convites e vínculos não expiram automaticamente.
- Confirmar integrações desejadas com clima, mapas, estoque, emissão fiscal ou sistemas contábeis.
- Definir o conjunto mínimo do primeiro lançamento do produto.
