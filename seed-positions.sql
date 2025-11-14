-- Script para popular tabela de cargos (positions) no D1
-- Execute: npx wrangler d1 execute emausvota-db --remote --file=seed-positions.sql

-- Verificar se já existem cargos
SELECT 'Cargos existentes:' as info, COUNT(*) as total FROM positions;

-- Inserir cargos padrão da UMP Emaús (se não existirem)
INSERT OR IGNORE INTO positions (id, name, description, display_order, max_candidates)
VALUES 
  (1, 'Presidente', 'Coordenador geral da comunidade', 1, 5),
  (2, 'Vice-Presidente', 'Vice-coordenador da comunidade', 2, 5),
  (3, 'Secretário', 'Responsável por documentação e atas', 3, 5),
  (4, 'Tesoureiro', 'Responsável pelas finanças', 4, 5),
  (5, 'Conselheiro', 'Membro do conselho consultivo', 5, 10);

-- Verificar inserção
SELECT 'Cargos após inserção:' as info, * FROM positions ORDER BY display_order;
