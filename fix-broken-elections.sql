-- Script para corrigir eleições criadas sem election_positions
-- Execute isso no D1 usando: npx wrangler d1 execute emausvota-db --remote --file=fix-broken-elections.sql

-- 1. Identificar eleições sem election_positions
WITH broken_elections AS (
  SELECT e.id, e.name
  FROM elections e
  WHERE NOT EXISTS (
    SELECT 1 FROM election_positions ep 
    WHERE ep.election_id = e.id
  )
)
SELECT 'Eleições sem election_positions:' as info, * FROM broken_elections;

-- 2. Criar election_positions para eleições quebradas
INSERT INTO election_positions (
  election_id, 
  position_id, 
  order_index, 
  status, 
  current_scrutiny,
  created_at
)
SELECT 
  e.id as election_id,
  p.id as position_id,
  p.display_order - 1 as order_index,
  'pending' as status,
  1 as current_scrutiny,
  datetime('now') as created_at
FROM elections e
CROSS JOIN positions p
WHERE NOT EXISTS (
  SELECT 1 FROM election_positions ep 
  WHERE ep.election_id = e.id
)
ORDER BY e.id, p.display_order;

-- 3. Verificar correção
SELECT 
  e.id as election_id,
  e.name as election_name,
  COUNT(ep.id) as positions_count
FROM elections e
LEFT JOIN election_positions ep ON e.id = ep.election_id
GROUP BY e.id, e.name
ORDER BY e.id;
