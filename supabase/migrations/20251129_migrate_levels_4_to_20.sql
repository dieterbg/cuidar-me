-- =====================================
-- MIGRAÇÃO: Sistema de Níveis 4→20
-- =====================================
-- Data: 29/11/2025
-- Descrição: Converte níveis antigos (strings) para novos (números 1-20)
--            baseado nos pontos totais dos pacientes
-- =====================================

-- IMPORTANTE: Este script é OPCIONAL
-- O sistema já lida com migração automática quando o paciente ganha pontos
-- Use este script apenas se quiser converter TODOS os pacientes de uma vez

-- =====================================
-- BACKUP ANTES DE EXECUTAR
-- =====================================
-- CREATE TABLE patients_backup AS SELECT * FROM patients;

-- =====================================
-- CONVERSÃO DE NÍVEIS
-- =====================================

UPDATE patients 
SET level = CASE
    -- Níveis 16-20: Mestre (3000+ pts)
    WHEN COALESCE((gamification->>'totalPoints')::int, total_points, 0) >= 5400 THEN 20
    WHEN COALESCE((gamification->>'totalPoints')::int, total_points, 0) >= 4800 THEN 19
    WHEN COALESCE((gamification->>'totalPoints')::int, total_points, 0) >= 4200 THEN 18
    WHEN COALESCE((gamification->>'totalPoints')::int, total_points, 0) >= 3600 THEN 17
    WHEN COALESCE((gamification->>'totalPoints')::int, total_points, 0) >= 3000 THEN 16
    
    -- Níveis 11-15: Veterano (1500-3000 pts)
    WHEN COALESCE((gamification->>'totalPoints')::int, total_points, 0) >= 2700 THEN 15
    WHEN COALESCE((gamification->>'totalPoints')::int, total_points, 0) >= 2400 THEN 14
    WHEN COALESCE((gamification->>'totalPoints')::int, total_points, 0) >= 2100 THEN 13
    WHEN COALESCE((gamification->>'totalPoints')::int, total_points, 0) >= 1800 THEN 12
    WHEN COALESCE((gamification->>'totalPoints')::int, total_points, 0) >= 1500 THEN 11
    
    -- Níveis 6-10: Praticante (500-1500 pts)
    WHEN COALESCE((gamification->>'totalPoints')::int, total_points, 0) >= 1300 THEN 10
    WHEN COALESCE((gamification->>'totalPoints')::int, total_points, 0) >= 1100 THEN 9
    WHEN COALESCE((gamification->>'totalPoints')::int, total_points, 0) >= 900 THEN 8
    WHEN COALESCE((gamification->>'totalPoints')::int, total_points, 0) >= 700 THEN 7
    WHEN COALESCE((gamification->>'totalPoints')::int, total_points, 0) >= 500 THEN 6
    
    -- Níveis 1-5: Iniciante (0-500 pts)
    WHEN COALESCE((gamification->>'totalPoints')::int, total_points, 0) >= 400 THEN 5
    WHEN COALESCE((gamification->>'totalPoints')::int, total_points, 0) >= 300 THEN 4
    WHEN COALESCE((gamification->>'totalPoints')::int, total_points, 0) >= 200 THEN 3
    WHEN COALESCE((gamification->>'totalPoints')::int, total_points, 0) >= 100 THEN 2
    
    -- Padrão: Nível 1
    ELSE 1
END::text
WHERE 
    -- Apenas para níveis que ainda são strings antigas
    level IS NULL 
    OR level ~ '^[A-Za-z]'  -- Level começa com letra (string)
    OR level IN ('Iniciante', 'Praticante', 'Veterano', 'Mestre');

-- =====================================
-- ATUALIZAR COLUNA gamification JSONB
-- (Se você usar gamification JSON em vez de colunas soltas)
-- =====================================

UPDATE patients
SET gamification = jsonb_set(
    COALESCE(gamification, '{}'::jsonb),
    '{level}',
    to_jsonb(level::int)
)
WHERE 
    level ~ '^\d+$'  -- Level é número em formato texto
    AND (gamification IS NULL OR gamification->>'level' != level);

-- =====================================
-- VERIFICAÇÃO PÓS-MIGRAÇÃO
-- =====================================

-- Ver distribuição de níveis após migração
SELECT 
    level,
    COUNT(*) as total_pacientes,
    AVG(COALESCE((gamification->>'totalPoints')::int, total_points, 0)) as media_pontos
FROM patients
WHERE level IS NOT NULL
GROUP BY level
ORDER BY level::int;

-- Ver exemplos de pacientes migrados
SELECT 
    full_name,
    COALESCE((gamification->>'totalPoints')::int, total_points, 0) as pontos,
    level as nivel_atual,
    CASE
        WHEN level::int <= 5 THEN 'Iniciante ' || 
            CASE level::int
                WHEN 1 THEN 'I'
                WHEN 2 THEN 'II'
                WHEN 3 THEN 'III'
                WHEN 4 THEN 'IV'
                WHEN 5 THEN 'V'
            END
        WHEN level::int <= 10 THEN 'Praticante ' || 
            CASE level::int
                WHEN 6 THEN 'I'
                WHEN 7 THEN 'II'
                WHEN 8 THEN 'III'
                WHEN 9 THEN 'IV'
                WHEN 10 THEN 'V'
            END
        WHEN level::int <= 15 THEN 'Veterano ' || 
            CASE level::int
                WHEN 11 THEN 'I'
                WHEN 12 THEN 'II'
                WHEN 13 THEN 'III'
                WHEN 14 THEN 'IV'
                WHEN 15 THEN 'V'
            END
        ELSE 'Mestre ' || 
            CASE level::int
                WHEN 16 THEN 'I'
                WHEN 17 THEN 'II'
                WHEN 18 THEN 'III'
                WHEN 19 THEN 'IV'
                WHEN 20 THEN 'V'
            END
    END as nome_nivel
FROM patients
WHERE level IS NOT NULL
ORDER BY level::int DESC
LIMIT 20;

-- =====================================
-- ROLLBACK (SE NECESSÁRIO)
-- =====================================

-- Se algo der errado, restaurar do backup:
-- DELETE FROM patients;
-- INSERT INTO patients SELECT * FROM patients_backup;
-- DROP TABLE patients_backup;
