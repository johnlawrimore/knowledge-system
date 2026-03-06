-- ============================================================================
-- Knowledge Management System Schema
-- MySQL 8.0+
-- ============================================================================

-- ============================================================================
-- STAGE 1: COLLECTION
-- ============================================================================

CREATE TABLE contributors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sort_name VARCHAR(255),
    affiliation VARCHAR(255),
    role VARCHAR(255),
    bio TEXT,
    avatar VARCHAR(512),
    website VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE publications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('blog', 'podcast', 'newsletter', 'journal', 'platform', 'conference', 'other')
        NOT NULL DEFAULT 'other',
    url VARCHAR(1024),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE INDEX idx_publications_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    source_type ENUM(
        'interview', 'lecture', 'panel', 'essay', 'research',
        'tutorial', 'news', 'review', 'documentation', 'report', 'other'
    ) NOT NULL,
    format ENUM('transcript', 'text') NOT NULL,
    url VARCHAR(1024),
    publication_id INT                    COMMENT 'FK to publications table',
    published_date DATE,
    date_collected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    evaluation_results JSON             COMMENT 'Flexible evaluation data: credibility, bias, relevance, etc.',
    content LONGTEXT NOT NULL             COMMENT 'Full markdown of source material',
    distillation LONGTEXT               COMMENT 'Distilled content in editorial voice',
    word_count INT GENERATED ALWAYS AS (
        LENGTH(content) - LENGTH(REPLACE(content, ' ', '')) + 1
    ) STORED,
    status ENUM('collected', 'distilling', 'distilled', 'decomposing', 'decomposed')
        NOT NULL DEFAULT 'collected',
    summary TEXT,
    distillation_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_sources_status (status),
    INDEX idx_sources_type (source_type),
    INDEX idx_sources_format (format),
    FULLTEXT INDEX ft_sources_content (content),
    FULLTEXT INDEX ft_sources_distillation (distillation),
    FOREIGN KEY (publication_id) REFERENCES publications(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE source_contributors (
    source_id INT NOT NULL,
    contributor_id INT NOT NULL,
    role ENUM('author', 'speaker', 'interviewer', 'interviewee', 'host', 'panelist', 'editor', 'other')
        NOT NULL DEFAULT 'author',

    PRIMARY KEY (source_id, contributor_id, role),
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE,
    FOREIGN KEY (contributor_id) REFERENCES contributors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================================
-- CURATION RULES
-- ============================================================================

CREATE TABLE curation_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE curation_rule_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filter_id INT NOT NULL,
    version INT NOT NULL,
    content_filter TEXT NOT NULL,
    preferred_terminology TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE INDEX idx_rule_version (filter_id, version),
    FOREIGN KEY (filter_id) REFERENCES curation_rules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE sources ADD COLUMN curation_rule_version_id INT,
    ADD FOREIGN KEY (curation_rule_version_id) REFERENCES curation_rule_versions(id) ON DELETE SET NULL;


-- ============================================================================
-- STAGE 2: COMPOSITION
-- ============================================================================

CREATE TABLE compositions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content LONGTEXT NOT NULL              COMMENT 'Composed content from multiple sources',
    word_count INT GENERATED ALWAYS AS (
        LENGTH(content) - LENGTH(REPLACE(content, ' ', '')) + 1
    ) STORED,
    evaluation_results JSON              COMMENT 'Quality scores, coverage assessment, etc.',
    status ENUM('draft', 'reviewed', 'published', 'archived') NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_compositions_status (status),
    FULLTEXT INDEX ft_compositions_content (content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE composition_sources (
    composition_id INT NOT NULL,
    source_id INT NOT NULL,
    contribution_note TEXT,

    PRIMARY KEY (composition_id, source_id),
    FOREIGN KEY (composition_id) REFERENCES compositions(id) ON DELETE CASCADE,
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================================
-- STAGE 3: DECOMPOSITION
-- ============================================================================

CREATE TABLE topics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_topic_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE INDEX idx_topics_name (name),
    FOREIGN KEY (parent_topic_id) REFERENCES topics(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE themes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    thesis TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE INDEX idx_themes_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    statement TEXT NOT NULL,
    claim_type ENUM(
        'assertion', 'recommendation', 'prediction', 'definition',
        'observation', 'mechanism', 'distinction', 'other'
    ) NOT NULL DEFAULT 'assertion',
    parent_claim_id INT NULL,
    reviewer_notes TEXT,
    decomposition_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_claims_type (claim_type),
    INDEX idx_claims_parent (parent_claim_id),
    FULLTEXT INDEX ft_claims (statement),
    FOREIGN KEY (parent_claim_id) REFERENCES claims(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE claim_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id_a INT NOT NULL,
    claim_id_b INT NOT NULL,
    link_type ENUM(
        'contradicts', 'refines', 'generalizes', 'depends_on',
        'enables', 'tensions_with', 'other'
    ) NOT NULL,
    decomposition_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (claim_id_a) REFERENCES claims(id) ON DELETE CASCADE,
    FOREIGN KEY (claim_id_b) REFERENCES claims(id) ON DELETE CASCADE,
    UNIQUE INDEX idx_claim_link_pair (claim_id_a, claim_id_b, link_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE claim_topics (
    claim_id INT NOT NULL,
    topic_id INT NOT NULL,

    PRIMARY KEY (claim_id, topic_id),
    FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE claim_themes (
    claim_id INT NOT NULL,
    theme_id INT NOT NULL,

    PRIMARY KEY (claim_id, theme_id),
    FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE claim_tags (
    claim_id INT NOT NULL,
    tag VARCHAR(100) NOT NULL,

    PRIMARY KEY (claim_id, tag),
    FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    INDEX idx_tag (tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================================
-- CLAIM SOURCES (direct assertion link)
-- ============================================================================

CREATE TABLE claim_sources (
    claim_id INT NOT NULL,
    source_id INT NOT NULL,
    is_key BOOLEAN NOT NULL DEFAULT FALSE,

    PRIMARY KEY (claim_id, source_id),
    FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE RESTRICT,
    INDEX idx_claim_sources_source (source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================================
-- DECOMPOSITION ENTITIES
-- ============================================================================

CREATE TABLE devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    source_id INT NOT NULL,
    device_type ENUM('analogy', 'metaphor', 'narrative', 'example', 'thought_experiment', 'visual'),
    effectiveness_note TEXT,
    decomposition_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE RESTRICT,
    INDEX idx_devices_source (source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE claim_devices (
    device_id INT NOT NULL,
    claim_id INT NOT NULL,

    PRIMARY KEY (device_id, claim_id),
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE contexts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    source_id INT NOT NULL,
    context_type ENUM('historical', 'industry', 'technical', 'organizational', 'regulatory', 'cultural', 'scope'),
    decomposition_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE RESTRICT,
    INDEX idx_contexts_source (source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE claim_contexts (
    context_id INT NOT NULL,
    claim_id INT NOT NULL,

    PRIMARY KEY (context_id, claim_id),
    FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE CASCADE,
    FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE methods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    source_id INT NOT NULL,
    method_type ENUM('process', 'framework', 'technique', 'tool', 'practice', 'metric'),
    decomposition_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE RESTRICT,
    INDEX idx_methods_source (source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE claim_methods (
    method_id INT NOT NULL,
    claim_id INT NOT NULL,

    PRIMARY KEY (method_id, claim_id),
    FOREIGN KEY (method_id) REFERENCES methods(id) ON DELETE CASCADE,
    FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reasonings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    source_id INT NOT NULL,
    evidence_id INT NOT NULL,
    claim_id INT NOT NULL,
    reasoning_type ENUM('deductive', 'inductive', 'analogical', 'causal', 'abductive'),
    decomposition_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE RESTRICT,
    FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
    FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    INDEX idx_reasonings_source (source_id),
    INDEX idx_reasonings_evidence (evidence_id),
    INDEX idx_reasonings_claim (claim_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================================
-- EVIDENCE
-- ============================================================================

CREATE TABLE evidence (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    source_id INT NOT NULL,
    evidence_type ENUM(
        'empirical', 'case_study', 'expert_opinion', 'anecdotal',
        'theoretical', 'statistical', 'other'
    ) NOT NULL DEFAULT 'expert_opinion',
    verbatim_quote TEXT,
    evaluation_results JSON,
    derived_from_evidence_id INT,
    decomposition_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE RESTRICT,
    FOREIGN KEY (derived_from_evidence_id) REFERENCES evidence(id) ON DELETE SET NULL,
    INDEX idx_evidence_source (source_id),
    INDEX idx_evidence_type (evidence_type),
    INDEX idx_evidence_derived (derived_from_evidence_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE claim_evidence (
    claim_id INT NOT NULL,
    evidence_id INT NOT NULL,
    stance ENUM('supporting', 'contradicting', 'qualifying') NOT NULL DEFAULT 'supporting',
    evaluation_results JSON NULL     COMMENT 'strength (1–5 numeric), strength_notes (justification), evaluated_at',

    PRIMARY KEY (claim_id, evidence_id),
    FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
    FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
    INDEX idx_ce_stance (claim_id, stance)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================================
-- PIPELINE LOGGING
-- ============================================================================

CREATE TABLE pipeline_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_id INT,
    url VARCHAR(1024) NOT NULL,
    status ENUM('running', 'completed', 'failed', 'paused') NOT NULL DEFAULT 'running',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    total_duration_s INT,
    FOREIGN KEY (source_id) REFERENCES sources(id),
    INDEX idx_pipeline_runs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE pipeline_stages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    run_id INT NOT NULL,
    stage ENUM('collect', 'distill', 'decompose', 'categorize', 'evaluate', 'status') NOT NULL,
    status ENUM('running', 'success', 'error', 'skipped') NOT NULL DEFAULT 'running',
    duration_s INT,
    total_tokens INT,
    tool_uses INT,
    tool_call_log JSON,
    result_json JSON,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (run_id) REFERENCES pipeline_runs(id),
    INDEX idx_pipeline_stages_run (run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================================
-- VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW v_pipeline_status AS
SELECT status, COUNT(*) AS source_count, ROUND(AVG(word_count)) AS avg_words
FROM sources GROUP BY status;

-- Per-claim scoring inputs
CREATE OR REPLACE VIEW v_claim_scoring_inputs AS
SELECT
    c.id AS claim_id, c.statement, c.claim_type,
    COUNT(DISTINCT CASE WHEN ce.stance = 'supporting' THEN ce.evidence_id END) AS supporting_evidence,
    COUNT(DISTINCT CASE WHEN ce.stance = 'contradicting' THEN ce.evidence_id END) AS contradicting_evidence,
    COUNT(DISTINCT CASE WHEN ce.stance = 'qualifying' THEN ce.evidence_id END) AS qualifying_evidence,
    COUNT(DISTINCT CASE WHEN ce.stance = 'supporting' THEN e.source_id END) AS supporting_sources,
    COUNT(DISTINCT CASE WHEN ce.stance = 'contradicting' THEN e.source_id END) AS contradicting_sources,
    MIN(CASE WHEN ce.stance = 'supporting'
        THEN COALESCE(JSON_EXTRACT(e.evaluation_results, '$.credibility'), 2) END) AS best_support_credibility,
    -- Tiers 1-2 → strong bucket
    SUM(CASE WHEN ce.stance = 'supporting'
        AND COALESCE(JSON_EXTRACT(ce.evaluation_results, '$.strength'), 3) <= 2 THEN 1 ELSE 0 END) AS strong_support_count,
    -- Tier 3 → moderate bucket
    SUM(CASE WHEN ce.stance = 'supporting'
        AND COALESCE(JSON_EXTRACT(ce.evaluation_results, '$.strength'), 3) = 3 THEN 1 ELSE 0 END) AS moderate_support_count,
    -- Tiers 4-5 → weak bucket
    SUM(CASE WHEN ce.stance = 'supporting'
        AND COALESCE(JSON_EXTRACT(ce.evaluation_results, '$.strength'), 3) >= 4 THEN 1 ELSE 0 END) AS weak_support_count,
    (SELECT COUNT(*) FROM reasonings r2 WHERE r2.claim_id = c.id) AS reasoning_count,
    COUNT(DISTINCT CASE WHEN e.derived_from_evidence_id IS NOT NULL THEN e.id END) AS derived_evidence_count
FROM claims c
LEFT JOIN claim_evidence ce ON c.id = ce.claim_id
LEFT JOIN evidence e ON ce.evidence_id = e.id
GROUP BY c.id, c.statement, c.claim_type;

-- Claim scores
CREATE OR REPLACE VIEW v_standalone_claim_scores AS
SELECT
    claim_id, statement, claim_type,
    supporting_sources, contradicting_sources,
    supporting_evidence, contradicting_evidence, qualifying_evidence, reasoning_count,
    CASE
        WHEN contradicting_sources >= 2 AND supporting_sources >= 2 THEN 'contested'
        WHEN supporting_sources >= 3 AND best_support_credibility = 1 AND reasoning_count >= 1 THEN 'strong'
        WHEN supporting_sources >= 3 THEN 'strong'
        WHEN supporting_sources >= 2 OR (supporting_sources >= 1 AND best_support_credibility = 1) THEN 'moderate'
        WHEN supporting_sources >= 1 THEN 'developing'
        ELSE 'unsupported'
    END AS computed_confidence,
    ROUND(
        (supporting_sources * 3.0) + (strong_support_count * 1.0) + (moderate_support_count * 0.5)
        + (weak_support_count * 0.25) - (derived_evidence_count * 0.5)
        + (LEAST(reasoning_count, 3) * 0.5) - (contradicting_sources * 2.0)
    , 2) AS score
FROM v_claim_scoring_inputs;

-- Unified scored view
CREATE OR REPLACE VIEW v_all_scored AS
SELECT CONCAT('claim:', claim_id) AS ref_id, 'standalone' AS ref_type,
    claim_id, statement AS display_text, NULL AS reviewer_notes,
    claim_type, computed_confidence, score,
    supporting_sources, contradicting_sources, supporting_evidence, contradicting_evidence
FROM v_standalone_claim_scores;

-- Topic coverage
CREATE OR REPLACE VIEW v_topic_coverage AS
SELECT t.id AS topic_id, t.name AS topic_name,
    COUNT(DISTINCT ct.claim_id) AS claim_count,
    COUNT(DISTINCT e.id) AS evidence_count,
    COUNT(DISTINCT e.source_id) AS source_count,
    ROUND(AVG(sc.score), 2) AS avg_claim_score
FROM topics t
LEFT JOIN claim_topics ct ON t.id = ct.topic_id
LEFT JOIN claims c ON ct.claim_id = c.id
LEFT JOIN v_standalone_claim_scores sc ON c.id = sc.claim_id
LEFT JOIN claim_evidence ce ON c.id = ce.claim_id
LEFT JOIN evidence e ON ce.evidence_id = e.id
GROUP BY t.id, t.name;

-- Theme strength
CREATE OR REPLACE VIEW v_theme_strength AS
SELECT th.id AS theme_id, th.name AS theme_name, th.thesis,
    COUNT(DISTINCT cth.claim_id) AS claim_count,
    COUNT(DISTINCT t.id) AS topics_spanned,
    ROUND(AVG(sc.score), 2) AS avg_claim_score,
    SUM(CASE WHEN sc.supporting_sources >= 3 THEN 1 ELSE 0 END) AS well_supported_claims,
    SUM(CASE WHEN sc.contradicting_sources >= 2 THEN 1 ELSE 0 END) AS contested_claims
FROM themes th
LEFT JOIN claim_themes cth ON th.id = cth.theme_id
LEFT JOIN claims c ON cth.claim_id = c.id
LEFT JOIN v_standalone_claim_scores sc ON c.id = sc.claim_id
LEFT JOIN claim_topics ct ON c.id = ct.claim_id
LEFT JOIN topics t ON ct.topic_id = t.id
GROUP BY th.id, th.name, th.thesis;

-- Source contributions
CREATE OR REPLACE VIEW v_source_contributions AS
SELECT s.id AS source_id, s.title, s.source_type, s.status,
    CASE WHEN s.distillation IS NOT NULL THEN 1 ELSE 0 END AS has_distillation,
    COUNT(DISTINCT cs.claim_id) AS claims_count,
    COUNT(DISTINCT e.id) AS evidence_count,
    COUNT(DISTINCT d.id) AS devices_count,
    COUNT(DISTINCT ctx.id) AS contexts_count,
    COUNT(DISTINCT m.id) AS methods_count,
    COUNT(DISTINCT r.id) AS reasonings_count
FROM sources s
LEFT JOIN claim_sources cs ON s.id = cs.source_id
LEFT JOIN evidence e ON s.id = e.source_id
LEFT JOIN devices d ON s.id = d.source_id
LEFT JOIN contexts ctx ON s.id = ctx.source_id
LEFT JOIN methods m ON s.id = m.source_id
LEFT JOIN reasonings r ON s.id = r.source_id
GROUP BY s.id, s.title, s.source_type, s.status;

-- Full evidence for composition
CREATE OR REPLACE VIEW v_claim_evidence AS
SELECT c.id AS claim_id, c.statement,
    c.reviewer_notes,
    ce.stance, ce.evaluation_results AS ce_evaluation,
    e.id AS evidence_id, e.content AS evidence_content, e.evidence_type, e.verbatim_quote,
    e.evaluation_results AS evidence_evaluation, e.derived_from_evidence_id,
    s.title AS source_title, s.source_type, s.evaluation_results AS source_evaluation,
    GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR ', ') AS contributors
FROM claims c
JOIN claim_evidence ce ON c.id = ce.claim_id
JOIN evidence e ON ce.evidence_id = e.id
JOIN sources s ON e.source_id = s.id
LEFT JOIN source_contributors sc ON s.id = sc.source_id
LEFT JOIN contributors p ON sc.contributor_id = p.id
GROUP BY c.id, c.statement,
         ce.stance, ce.evaluation_results,
         e.id, e.content, e.evidence_type,
         e.verbatim_quote, e.evaluation_results, e.derived_from_evidence_id,
         s.title, s.source_type, s.evaluation_results;

-- Thin coverage
CREATE OR REPLACE VIEW v_thin_claims AS
SELECT ref_id, ref_type, display_text, computed_confidence, score,
    supporting_sources, contradicting_sources
FROM v_all_scored WHERE supporting_sources < 2
ORDER BY supporting_sources ASC, score ASC;

-- Expert positions (via evidence chain + direct claim_sources)
CREATE OR REPLACE VIEW v_expert_positions AS
SELECT p.id AS contributor_id, p.name, p.affiliation,
    c.id AS claim_id, c.statement,
    ce.stance,
    CAST(JSON_EXTRACT(ce.evaluation_results, '$.strength') AS UNSIGNED) AS strength,
    e.content AS evidence_content, s.title AS source_title
FROM contributors p
JOIN source_contributors sc ON p.id = sc.contributor_id
JOIN sources s ON sc.source_id = s.id
JOIN evidence e ON s.id = e.source_id
JOIN claim_evidence ce ON e.id = ce.evidence_id
JOIN claims c ON ce.claim_id = c.id
UNION
SELECT p.id AS contributor_id, p.name, p.affiliation,
    c.id AS claim_id, c.statement,
    NULL AS stance, NULL AS strength, NULL AS evidence_content, s.title AS source_title
FROM contributors p
JOIN source_contributors sc ON p.id = sc.contributor_id
JOIN sources s ON sc.source_id = s.id
JOIN claim_sources csrc ON s.id = csrc.source_id
JOIN claims c ON csrc.claim_id = c.id
WHERE NOT EXISTS (
    SELECT 1 FROM evidence e2
    JOIN claim_evidence ce2 ON e2.id = ce2.evidence_id
    WHERE e2.source_id = s.id AND ce2.claim_id = c.id
)
ORDER BY contributor_id, claim_id;
