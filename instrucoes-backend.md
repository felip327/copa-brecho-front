# Instruções para o Backend (Atualização Completa da Loja)

Olá! Eu sou o assistente do Front-end. Nós fizemos uma série de atualizações na loja e precisamos que o Backend seja ajustado para acompanhar as novas regras de negócio e a nova tela de pagamento.

Aqui está o checklist completo do que você precisa fazer no Backend e no Banco de Dados:

### 1. Permitir Estoque Infinito (Remover Status)
O dono do projeto decidiu sair do modelo de "Brechó" (onde itens únicos somem após a compra) para um modelo de estoque infinito.
- **No Banco (Supabase):** Rode o comando para excluir a coluna `status` da tabela `produtos1`:
  ```sql
  ALTER TABLE public.produtos1 DROP COLUMN status;
  ```
- **No Código Node.js:** Remova da rota `/api/comprar` qualquer linha que faça um `UPDATE` mudando o status do produto para 'vendido'. A rota deve apenas registrar a compra sem desativar a exibição do produto.

### 2. Permitir Compras Anônimas (Remover Foreign Key)
O sistema atual estava exigindo que os compradores tivessem uma conta no sistema (`auth.users`), mas a nossa loja não exige login. Isso estava causando um erro no banco ao salvar a transação.
- **No Banco (Supabase):** Rode o comando para remover a exigência de que o `comprador_id` precise existir na tabela de usuários:
  ```sql
  ALTER TABLE public.transacoes DROP CONSTRAINT transacoes_comprador_id_fkey;
  ```

### 3. Receber Novos Dados do Checkout (Quantidades e Dados de Entrega)
Eu criei um novo Modal de Checkout no Front-end onde o cliente preenche os dados de entrega e escolhe a quantidade do produto. Agora, quando o cliente clica em comprar, o `POST /api/comprar` envia o seguinte payload (JSON):

```json
{
  "produto_id": "uuid-do-produto",
  "comprador_id": "uuid-gerado-aleatoriamente-pelo-front",
  "quantidade": 2,
  "cliente": {
    "nome": "João da Silva",
    "email": "joao@email.com",
    "endereco": "Rua X, 123"
  }
}
```

- **No Banco (Supabase):** Você precisará adicionar colunas na tabela `transacoes` para salvar essas novas informações, por exemplo: `quantidade` (integer), `nome_cliente` (text), `email_cliente` (text) e `endereco_entrega` (text).
- **No Código Node.js:** 
  - Altere a rota de compra para capturar os dados `quantidade` e `cliente` enviados no body.
  - Multiplique o preço do produto pela `quantidade` na hora de salvar o `valor_total` da transação.
  - Insira os dados do cliente e a quantidade na tabela `transacoes`.

Após fazer todas essas adaptações no código, lembre-se de fazer um novo **Deploy para a Vercel** para que o Front-end possa finalizar as compras com sucesso!
