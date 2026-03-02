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
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    source_type ENUM(
        'youtube_video', 'podcast', 'blog_post', 'website',
        'academic_paper', 'book', 'book_chapter', 'conference_talk',
        'newsletter', 'social_media', 'report', 'research', 'documentation', 'other'
    ) NOT NULL,
    url VARCHAR(1024),
    publication_date DATE,
    date_collected TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    evaluation_results JSON             COMMENT 'Flexible evaluation data: credibility, bias, relevance, etc.',
    content_md LONGTEXT NOT NULL        COMMENT 'Full markdown of source material',
    distillation LONGTEXT               COMMENT 'Distilled content in editorial voice',
    word_count INT GENERATED ALWAYS AS (
        LENGTH(content_md) - LENGTH(REPLACE(content_md, ' ', '')) + 1
    ) STORED,
    status ENUM('collected', 'distilling', 'distilled', 'decomposing', 'decomposed')
        NOT NULL DEFAULT 'collected',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_sources_status (status),
    INDEX idx_sources_type (source_type),
    FULLTEXT INDEX ft_sources_content (content_md),
    FULLTEXT INDEX ft_sources_distillation (distillation)
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
-- STAGE 2: COMPOSITION
-- ============================================================================

CREATE TABLE compositions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content_md LONGTEXT NOT NULL         COMMENT 'Composed content from multiple sources',
    word_count INT GENERATED ALWAYS AS (
        LENGTH(content_md) - LENGTH(REPLACE(content_md, ' ', '')) + 1
    ) STORED,
    source_strategy ENUM('single_source', 'multi_source') NOT NULL DEFAULT 'single_source',
    evaluation_results JSON              COMMENT 'Quality scores, coverage assessment, etc.',
    status ENUM('draft', 'reviewed', 'published') NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_compositions_status (status),
    FULLTEXT INDEX ft_compositions_content (content_md)
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
    sort_order INT DEFAULT 0,
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

CREATE TABLE claim_clusters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    summary TEXT,
    reviewer_notes TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    statement TEXT NOT NULL,
    claim_type ENUM(
        'assertion', 'principle', 'framework', 'recommendation',
        'prediction', 'definition', 'observation', 'other'
    ) NOT NULL DEFAULT 'assertion',
    cluster_id INT,
    reviewer_notes TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (cluster_id) REFERENCES claim_clusters(id) ON DELETE SET NULL,
    INDEX idx_claims_type (claim_type),
    INDEX idx_claims_cluster (cluster_id),
    FULLTEXT INDEX ft_claims (statement)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE claim_relationships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id_a INT NOT NULL,
    claim_id_b INT NOT NULL,
    relationship ENUM(
        'contradicts', 'refines', 'generalizes', 'depends_on',
        'enables', 'tensions_with', 'other'
    ) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (claim_id_a) REFERENCES claims(id) ON DELETE CASCADE,
    FOREIGN KEY (claim_id_b) REFERENCES claims(id) ON DELETE CASCADE,
    UNIQUE INDEX idx_claim_rel_pair (claim_id_a, claim_id_b, relationship)
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
    notes TEXT,
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
    stance ENUM('supports', 'contradicts', 'qualifies') NOT NULL DEFAULT 'supports',
    strength ENUM('strong', 'moderate', 'weak') NOT NULL DEFAULT 'moderate',
    reasoning TEXT,
    notes TEXT,

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
    notes TEXT,
    FOREIGN KEY (source_id) REFERENCES sources(id),
    INDEX idx_pipeline_runs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE pipeline_stages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    run_id INT NOT NULL,
    stage ENUM('collect', 'distill', 'decompose', 'cluster', 'categorize', 'evaluate', 'status') NOT NULL,
    status ENUM('running', 'success', 'error', 'skipped') NOT NULL DEFAULT 'running',
    duration_s INT,
    total_tokens INT,
    tool_uses INT,
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
    c.id AS claim_id, c.statement, c.claim_type, c.cluster_id,
    COUNT(DISTINCT CASE WHEN ce.stance = 'supports' THEN ce.evidence_id END) AS supporting_evidence,
    COUNT(DISTINCT CASE WHEN ce.stance = 'contradicts' THEN ce.evidence_id END) AS contradicting_evidence,
    COUNT(DISTINCT CASE WHEN ce.stance = 'qualifies' THEN ce.evidence_id END) AS qualifying_evidence,
    COUNT(DISTINCT CASE WHEN ce.stance = 'supports' THEN e.source_id END) AS supporting_sources,
    COUNT(DISTINCT CASE WHEN ce.stance = 'contradicts' THEN e.source_id END) AS contradicting_sources,
    MIN(CASE WHEN ce.stance = 'supports'
        THEN COALESCE(JSON_EXTRACT(e.evaluation_results, '$.credibility'), 2) END) AS best_support_credibility,
    SUM(CASE WHEN ce.stance = 'supports' AND ce.strength = 'strong' THEN 1 ELSE 0 END) AS strong_support_count,
    SUM(CASE WHEN ce.stance = 'supports' AND ce.strength = 'moderate' THEN 1 ELSE 0 END) AS moderate_support_count,
    SUM(CASE WHEN ce.stance = 'supports' AND ce.strength = 'weak' THEN 1 ELSE 0 END) AS weak_support_count,
    SUM(CASE WHEN ce.reasoning IS NOT NULL AND ce.reasoning != '' THEN 1 ELSE 0 END) AS reasoning_count,
    COUNT(DISTINCT CASE WHEN e.derived_from_evidence_id IS NOT NULL THEN e.id END) AS derived_evidence_count
FROM claims c
LEFT JOIN claim_evidence ce ON c.id = ce.claim_id
LEFT JOIN evidence e ON ce.evidence_id = e.id
GROUP BY c.id, c.statement, c.claim_type, c.cluster_id;

-- Standalone claim scores
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
FROM v_claim_scoring_inputs WHERE cluster_id IS NULL;

-- Cluster scores
CREATE OR REPLACE VIEW v_cluster_scores AS
SELECT
    cc.id AS cluster_id, cc.summary, cc.reviewer_notes,
    COUNT(DISTINCT csi.claim_id) AS claim_count,
    SUM(csi.supporting_evidence) AS total_supporting_evidence,
    SUM(csi.contradicting_evidence) AS total_contradicting_evidence,
    SUM(csi.qualifying_evidence) AS total_qualifying_evidence,
    COUNT(DISTINCT CASE WHEN ce.stance = 'supports' THEN e.source_id END) AS supporting_sources,
    COUNT(DISTINCT CASE WHEN ce.stance = 'contradicts' THEN e.source_id END) AS contradicting_sources,
    MIN(CASE WHEN ce.stance = 'supports'
        THEN COALESCE(JSON_EXTRACT(e.evaluation_results, '$.credibility'), 2) END) AS best_support_credibility,
    SUM(csi.reasoning_count) AS total_reasoning_count,
    CASE
        WHEN COUNT(DISTINCT CASE WHEN ce.stance = 'contradicts' THEN e.source_id END) >= 2
             AND COUNT(DISTINCT CASE WHEN ce.stance = 'supports' THEN e.source_id END) >= 2 THEN 'contested'
        WHEN COUNT(DISTINCT CASE WHEN ce.stance = 'supports' THEN e.source_id END) >= 3
             AND MIN(CASE WHEN ce.stance = 'supports'
                 THEN COALESCE(JSON_EXTRACT(e.evaluation_results, '$.credibility'), 2) END) = 1 THEN 'strong'
        WHEN COUNT(DISTINCT CASE WHEN ce.stance = 'supports' THEN e.source_id END) >= 3 THEN 'strong'
        WHEN COUNT(DISTINCT CASE WHEN ce.stance = 'supports' THEN e.source_id END) >= 2 THEN 'moderate'
        WHEN COUNT(DISTINCT CASE WHEN ce.stance = 'supports' THEN e.source_id END) >= 1 THEN 'developing'
        ELSE 'unsupported'
    END AS computed_confidence,
    ROUND(
        (COUNT(DISTINCT CASE WHEN ce.stance = 'supports' THEN e.source_id END) * 3.0)
        + (SUM(CASE WHEN ce.stance = 'supports' AND ce.strength = 'strong' THEN 1 ELSE 0 END) * 1.0)
        + (SUM(CASE WHEN ce.stance = 'supports' AND ce.strength = 'moderate' THEN 1 ELSE 0 END) * 0.5)
        + (SUM(CASE WHEN ce.stance = 'supports' AND ce.strength = 'weak' THEN 1 ELSE 0 END) * 0.25)
        - (SUM(csi.derived_evidence_count) * 0.5)
        + (LEAST(SUM(csi.reasoning_count), 5) * 0.5)
        - (COUNT(DISTINCT CASE WHEN ce.stance = 'contradicts' THEN e.source_id END) * 2.0)
    , 2) AS score
FROM claim_clusters cc
JOIN v_claim_scoring_inputs csi ON cc.id = csi.cluster_id
LEFT JOIN claim_evidence ce ON csi.claim_id = ce.claim_id
LEFT JOIN evidence e ON ce.evidence_id = e.id
GROUP BY cc.id, cc.summary, cc.reviewer_notes;

-- Unified scored view
CREATE OR REPLACE VIEW v_all_scored AS
SELECT CONCAT('claim:', claim_id) AS ref_id, 'standalone' AS ref_type,
    claim_id, NULL AS cluster_id, statement AS display_text, NULL AS reviewer_notes,
    claim_type, computed_confidence, score,
    supporting_sources, contradicting_sources, supporting_evidence, contradicting_evidence
FROM v_standalone_claim_scores
UNION ALL
SELECT CONCAT('cluster:', cluster_id) AS ref_id, 'cluster' AS ref_type,
    NULL AS claim_id, cluster_id,
    COALESCE(summary, '(cluster not yet summarized)') AS display_text, reviewer_notes,
    NULL AS claim_type, computed_confidence, score,
    supporting_sources, contradicting_sources,
    total_supporting_evidence, total_contradicting_evidence
FROM v_cluster_scores;

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
LEFT JOIN v_claim_scoring_inputs sc ON c.id = sc.claim_id
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
LEFT JOIN v_claim_scoring_inputs sc ON c.id = sc.claim_id
LEFT JOIN claim_topics ct ON c.id = ct.claim_id
LEFT JOIN topics t ON ct.topic_id = t.id
GROUP BY th.id, th.name, th.thesis;

-- Source contributions
CREATE OR REPLACE VIEW v_source_contributions AS
SELECT s.id AS source_id, s.title, s.source_type, s.status,
    CASE WHEN s.distillation IS NOT NULL THEN 1 ELSE 0 END AS has_distillation,
    COUNT(DISTINCT e.id) AS evidence_count
FROM sources s
LEFT JOIN evidence e ON s.id = e.source_id
GROUP BY s.id, s.title, s.source_type, s.status;

-- Full evidence for composition
CREATE OR REPLACE VIEW v_claim_evidence AS
SELECT c.id AS claim_id, c.statement, c.cluster_id,
    cc.summary AS cluster_summary,
    COALESCE(cc.reviewer_notes, c.reviewer_notes) AS reviewer_notes,
    ce.stance, ce.strength, ce.reasoning,
    e.content AS evidence_content, e.evidence_type, e.verbatim_quote,
    e.evaluation_results AS evidence_evaluation, e.derived_from_evidence_id,
    s.title AS source_title, s.source_type, s.evaluation_results AS source_evaluation,
    GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR ', ') AS contributors
FROM claims c
LEFT JOIN claim_clusters cc ON c.cluster_id = cc.id
JOIN claim_evidence ce ON c.id = ce.claim_id
JOIN evidence e ON ce.evidence_id = e.id
JOIN sources s ON e.source_id = s.id
LEFT JOIN source_contributors sc ON s.id = sc.source_id
LEFT JOIN contributors p ON sc.contributor_id = p.id
GROUP BY c.id, c.statement, c.cluster_id, cc.summary,
         ce.stance, ce.strength, ce.reasoning,
         e.id, e.content, e.evidence_type,
         e.verbatim_quote, e.evaluation_results, e.derived_from_evidence_id,
         s.title, s.source_type, s.evaluation_results;

-- Thin coverage
CREATE OR REPLACE VIEW v_thin_claims AS
SELECT ref_id, ref_type, display_text, computed_confidence, score,
    supporting_sources, contradicting_sources
FROM v_all_scored WHERE supporting_sources < 2
ORDER BY supporting_sources ASC, score ASC;

-- Expert positions
CREATE OR REPLACE VIEW v_expert_positions AS
SELECT p.id AS contributor_id, p.name, p.affiliation,
    c.id AS claim_id, c.statement, c.cluster_id,
    ce.stance, ce.strength, e.content AS evidence_content, s.title AS source_title
FROM contributors p
JOIN source_contributors sc ON p.id = sc.contributor_id
JOIN sources s ON sc.source_id = s.id
JOIN evidence e ON s.id = e.source_id
JOIN claim_evidence ce ON e.id = ce.evidence_id
JOIN claims c ON ce.claim_id = c.id
ORDER BY p.name, c.id;
