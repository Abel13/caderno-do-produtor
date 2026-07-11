# Análise dos dados estruturantes

## 1. Objetivo

A página inicial será um dashboard com informações rápidas. Os formulários dos controles serão acessados sob demanda, por atalhos, alertas ou navegação pelos módulos.

Para isso, a solução precisa de uma estrutura comum que permita responder sempre às mesmas perguntas:

- De qual produtor e propriedade é o dado?
- Em qual talhão ou área ocorreu?
- A qual cultura, lavoura e safra ele pertence?
- Quando aconteceu?
- Quem registrou ou recomendou?
- Qual foi a atividade, produto, quantidade, custo ou resultado?

O cadastro inicial deve ser progressivo. O produtor informa apenas o necessário para começar e complementa os dados quando utilizar funcionalidades que dependam deles.

## 2. Organização conceitual

```text
Conta/organização
├── Pessoas e acessos
│   ├── Produtores
│   ├── Técnicos
│   └── Colaboradores
├── Propriedades
│   ├── Talhões
│   │   └── Lavouras
│   │       └── Ciclos ou safras
│   ├── Pontos de medição
│   ├── Benfeitorias
│   └── Máquinas e equipamentos
├── Catálogos
│   ├── Culturas e cultivares
│   ├── Insumos
│   ├── Pragas e doenças
│   ├── Atividades
│   └── Categorias financeiras
└── Registros operacionais
    ├── Monitoramentos
    ├── Aplicações e manejos
    ├── Produção e lotes
    ├── Receitas e despesas
    └── Recomendações
```

## 3. Cadastros fundamentais

### 3.1 Conta ou organização

Representa o espaço isolado de dados. Pode corresponder a um produtor individual, família, empresa rural ou grupo gestor.

| Campo | Obrigatório | Observação |
|---|---:|---|
| Nome | Sim | Nome usado no sistema. |
| Tipo | Sim | Produtor individual, família, empresa ou organização. |
| Documento | Não | CPF ou CNPJ, protegido conforme a LGPD. |
| Fuso horário | Sim | Importante para datas dos registros. |
| Moeda | Sim | BRL como padrão inicial. |
| Unidades preferenciais | Sim | Hectare, milímetro, quilograma, saca etc. |

Uma conta pode administrar uma ou mais propriedades. Todo dado de negócio deve pertencer a uma conta para viabilizar segurança no Supabase por meio de RLS.

### 3.2 Pessoas, usuários e vínculos

Uma pessoa não deve ser confundida com uma conta de autenticação. Isso permite cadastrar um produtor ou trabalhador mesmo que ele ainda não acesse o aplicativo.

| Entidade | Dados principais |
|---|---|
| Pessoa | Nome, documento opcional, telefone, e-mail e observações. |
| Usuário | Identidade autenticada no Supabase Auth. |
| Vínculo | Conta, pessoa, papel, situação e período de acesso. |

Papéis iniciais:

- Proprietário da conta.
- Produtor.
- Gestor.
- Técnico de campo.
- Colaborador com preenchimento.
- Consulta.

Um usuário pode participar de mais de uma conta ou propriedade com permissões diferentes.

### 3.3 Propriedade rural

Representa a unidade administrativa e geográfica onde estão os talhões.

#### Cadastro mínimo

- Nome da propriedade.
- Município e estado.
- Área total, se conhecida.
- Pessoa responsável.

#### Cadastro complementar

- Código interno.
- Endereço e coordenadas da sede.
- Área produtiva, preservada e de infraestrutura.
- Inscrição ou identificação rural.
- Altitude média.
- Fonte principal de água.
- Observações e documentos.
- Limite geográfico da propriedade.

### 3.4 Talhão

O talhão é a principal unidade de organização agronômica. Monitoramentos, análises, aplicações, recomendações, custos e produção devem poder ser vinculados a ele.

#### Cadastro mínimo

| Campo | Obrigatório | Regra |
|---|---:|---|
| Propriedade | Sim | Determina a qual propriedade pertence. |
| Nome ou código | Sim | Deve ser único dentro da propriedade. |
| Área em hectares | Sim | Deve ser maior que zero. |
| Situação | Sim | Ativo, em formação, inativo ou encerrado. |

Com esses quatro campos o produtor já consegue começar a registrar atividades.

#### Cadastro agronômico complementar

| Grupo | Campos sugeridos |
|---|---|
| Localização | Polígono, ponto central, altitude mínima, média e máxima. |
| Relevo | Plano, suave ondulado, ondulado, forte ondulado ou outro. |
| Solo | Tipo ou classe, textura predominante e observações. |
| Água | Irrigado, sistema de irrigação e fonte de água. |
| Gestão | Responsável, centro de custo, data de início e encerramento. |

#### Regras do talhão

- O histórico do talhão deve ser preservado mesmo quando ele for desativado.
- Alteração de área ou limites deve manter vigência ou histórico.
- Um talhão pode receber diferentes lavouras ao longo do tempo.
- O cultivo atual não deve ser armazenado diretamente como atributo permanente do talhão.
- Divisão ou união de talhões deve manter referência aos talhões de origem.
- Registros antigos permanecem associados à configuração válida na época.

### 3.5 Lavoura ou plantio

Talhão é a área física; lavoura é o cultivo implantado nessa área. Essa separação evita perder o histórico quando a cultura ou cultivar for substituída.

| Campo | Obrigatório | Observação |
|---|---:|---|
| Talhão | Sim | Área física ocupada. |
| Cultura | Sim | Café inicialmente, extensível a outras culturas. |
| Cultivar | Não | Pode ser desconhecida no cadastro inicial. |
| Data ou ano de plantio | Não | Pode aceitar precisão aproximada. |
| Área ocupada | Sim | Pode ser igual ou menor que a área do talhão. |
| Situação | Sim | Formação, produção, renovação ou encerrada. |
| Espaçamento | Não | Entre linhas e entre plantas. |
| População | Não | Número estimado de plantas. |
| Sistema de cultivo | Não | Sequeiro, irrigado, consorciado etc. |
| Origem das mudas | Não | Viveiro, lote ou fornecedor. |

Um talhão poderá ter mais de uma lavoura simultânea apenas se a soma das áreas ocupadas não ultrapassar sua área, salvo consórcio explicitamente registrado.

### 3.6 Safra e ciclo produtivo

A safra organiza os dados no tempo e serve como filtro padrão do dashboard.

| Campo | Obrigatório | Observação |
|---|---:|---|
| Nome | Sim | Exemplo: 2026/2027. |
| Cultura | Sim | Permite calendários diferentes por cultura. |
| Data inicial e final | Sim | Não precisam coincidir com o ano civil. |
| Situação | Sim | Planejamento, aberta ou encerrada. |
| Safra atual | Não | Uma por cultura e conta. |

Os registros operacionais podem pertencer a uma safra, mas devem conservar sua data real. O encerramento bloqueia alterações comuns sem apagar ou mover os registros.

### 3.7 Vínculo entre lavoura e safra

Uma lavoura pode participar de várias safras. O vínculo permite armazenar dados que mudam a cada ciclo:

- Situação produtiva no ciclo.
- Área efetivamente conduzida.
- Meta de produção.
- Estimativa de produção.
- Produção realizada.
- Responsável técnico.
- Observações específicas da safra.

## 4. Cadastros operacionais compartilhados

Esses cadastros não precisam ser exigidos no primeiro acesso, mas evitam texto livre e duplicidade nos controles.

### 4.1 Insumos e produtos

- Nome comercial.
- Tipo: fertilizante, corretivo, defensivo, adjuvante, herbicida, semente, muda ou outro.
- Fabricante.
- Princípio ativo ou composição.
- Unidade padrão.
- Registro e período de carência, quando aplicável.
- Situação ativa ou inativa.

No MVP, estoque e lote podem ser opcionais. O registro de aplicação, entretanto, deve guardar uma cópia dos dados relevantes para preservar o histórico caso o produto seja alterado no catálogo.

### 4.2 Máquinas e equipamentos

- Identificação ou nome.
- Tipo.
- Marca e modelo.
- Ano.
- Horímetro ou quilometragem inicial.
- Propriedade ou terceiro.
- Situação.
- Parâmetros para cálculo da hora-máquina.

### 4.3 Pragas, doenças e plantas daninhas

Manter um catálogo comum com:

- Nome comum e científico.
- Tipo.
- Cultura relacionada.
- Unidade ou escala de monitoramento.
- Nível de atenção ou ação, quando definido.

O sistema deve permitir “outro” com descrição, evitando bloquear o trabalho de campo.

### 4.4 Atividades e operações

Catálogo para padronizar atividades como plantio, aplicação, capina, poda, irrigação, colheita e manutenção.

- Nome.
- Grupo operacional.
- Unidade de medição.
- Exige talhão, máquina, insumo ou equipe.
- Gera custo automaticamente ou não.

### 4.5 Pessoas e organizações externas

Um cadastro comum pode representar:

- Fornecedores.
- Compradores.
- Laboratórios.
- Prestadores de serviço.
- Instituições financeiras.
- Viveiros.

Não é necessário obrigar CPF ou CNPJ para permitir um registro rápido.

### 4.6 Categorias financeiras

As categorias do caderno devem existir inicialmente como catálogo padrão:

- Entradas.
- Saídas de custeio.
- Investimentos.
- Empréstimos e financiamentos.

O produtor pode criar categorias próprias, mas toda categoria deve pertencer a um grupo contábil estável para alimentar corretamente o fluxo de caixa.

## 5. Registro operacional unificado

Os controles possuem campos específicos, mas devem compartilhar um cabeçalho conceitual:

| Campo | Finalidade |
|---|---|
| Conta | Isolamento e segurança dos dados. |
| Propriedade | Contexto administrativo. |
| Talhão | Contexto espacial, quando aplicável. |
| Lavoura | Cultura e plantio relacionados. |
| Safra | Contexto produtivo. |
| Data e hora | Momento real do evento. |
| Situação | Rascunho, confirmado, cancelado ou importado para revisão. |
| Origem | Manual, PDF, integração ou sistema. |
| Responsável | Pessoa que executou ou informou. |
| Criado por | Usuário que inseriu o registro. |
| Observações | Complemento livre. |
| Anexos | Fotos, laudos, recibos ou PDFs. |

Isso não significa colocar todos os módulos em uma única tabela de banco de dados. Significa adotar campos e comportamentos consistentes em entidades específicas.

## 6. Cadastro progressivo

### Etapa inicial obrigatória

1. Criar ou aceitar convite para uma conta.
2. Informar nome da propriedade, município e estado.
3. Criar ao menos um talhão com nome e área.
4. Informar cultura ou lavoura atual.
5. Criar ou confirmar a safra atual.

### Dados solicitados sob demanda

- Ao registrar análise de solo: laboratório, profundidade e parâmetros.
- Ao registrar aplicação: produto, unidade e dose.
- Ao registrar manutenção: máquina ou equipamento.
- Ao registrar venda: comprador e lote produzido.
- Ao importar PDF: tipo de documento e contexto mínimo necessário.

O usuário deve poder salvar um novo item de catálogo dentro do próprio formulário, sem abandonar o preenchimento atual.

## 7. Dashboard inicial

O dashboard deve ser contextual: primeiro seleciona ou assume conta, propriedade e safra; depois apresenta informações rápidas.

### Informações possíveis desde o início

- Propriedade e safra selecionadas.
- Quantidade de talhões e área cadastrada.
- Atalhos para novo registro.
- Últimos registros.
- Recomendações pendentes.
- Documentos importados aguardando revisão.

### Informações dependentes de uso

| Card | Dados necessários |
|---|---|
| Chuva do mês | Registros pluviométricos. |
| Atividades recentes | Manejos e operações confirmados. |
| Próximas atividades | Planejamento e recomendações com prazo. |
| Alertas fitossanitários | Monitoramentos e níveis de ação. |
| Produção da safra | Colheita e produção registradas. |
| Custos da safra | Despesas e custos operacionais. |
| Saldo financeiro | Receitas, despesas e fluxo de caixa. |
| Talhões que exigem atenção | Recomendações vencidas, ocorrências ou ausência de atualização. |

O dashboard não deve mostrar cartões vazios indefinidamente. Cards sem dados podem ser substituídos por uma chamada curta para iniciar o respectivo controle.

## 8. Preenchimento sob demanda

O acesso aos formulários pode ocorrer por:

- Botão global “Novo registro”.
- Atalhos configuráveis no dashboard.
- Página de um talhão.
- Recomendação ou alerta.
- Módulo temático.
- Importação de PDF.

O botão global deve começar pela intenção do usuário — por exemplo, registrar chuva, aplicação, despesa, colheita ou observação — e solicitar apenas o contexto ainda não inferido.

Se o usuário abrir o formulário a partir de um talhão, propriedade e talhão já devem estar preenchidos. Se abrir a partir de uma recomendação, também devem ser herdados safra, atividade e prazo quando aplicáveis.

## 9. Importação de PDF

O PDF não deve criar entidades estruturantes silenciosamente. A importação deve:

1. Armazenar o arquivo original.
2. Identificar o tipo de documento.
3. Extrair dados e respectivas evidências.
4. Solicitar propriedade, talhão, lavoura ou safra quando não forem identificados com segurança.
5. Sugerir novos itens de catálogo, como produto ou fornecedor.
6. Exigir confirmação antes de criar registros definitivos.
7. Manter ligação entre registro criado, arquivo e dados extraídos.

## 10. Decisões que ainda precisam ser validadas

- O produto será exclusivo para café no início ou aceitará outras culturas desde o MVP?
- Um talhão poderá possuir mais de uma cultivar ou será necessário subdividi-lo em unidades de manejo?
- O sistema precisa armazenar o polígono geográfico no MVP ou apenas nome e área?
- A safra será definida por propriedade, cultura ou lavoura?
- Técnico e produtor compartilharão os mesmos registros ou haverá aprovação entre eles?
- Quais cadastros poderão ser compartilhados entre contas e quais serão privados?
- Estoque de insumos fará parte do escopo inicial?
- Quais cinco informações têm prioridade no primeiro dashboard?
- Quais tipos de PDF serão suportados primeiro?
- Quais módulos precisam funcionar offline desde a primeira versão?

## 11. Proposta de primeiro recorte

Para validar a fundação da solução antes de implementar os 21 controles:

1. Autenticação e conta.
2. Propriedade.
3. Talhão.
4. Lavoura.
5. Safra.
6. Dashboard contextual básico.
7. Registro pluviométrico como primeiro formulário sob demanda.
8. Histórico de registros por propriedade e talhão.

Esse recorte testa cadastro progressivo, segurança, contexto, preenchimento móvel, indicadores e histórico sem exigir a modelagem imediata de todos os módulos.
