-- Script para corrigir eleições quebradas e limpar banco de dados

-- 1. Limpar eleições que possam ter sido criadas incorretamente
DELETE FROM votes;
DELETE FROM candidates;
DELETE FROM election_attendance;
DELETE FROM election_positions;
DELETE FROM election_winners;
DELETE FROM elections;

-- 2. Verificar se os cargos padrão existem
-- (Se executar este script e não houver cargos, eles serão criados automaticamente na próxima inicialização)

-- 3. Resetar sequências de IDs (opcional, para começar do zero)
DELETE FROM sqlite_sequence WHERE name IN ('elections', 'candidates', 'votes', 'election_positions', 'election_attendance', 'election_winners');

SELECT 'Banco de dados limpo! Você pode criar uma nova eleição agora.' as message;
