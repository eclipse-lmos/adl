-- SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
--
-- SPDX-License-Identifier: Apache-2.0

CREATE TABLE test_runs (
    owner                    VARCHAR(255) NOT NULL DEFAULT 'public',
    id                       VARCHAR(255) NOT NULL,
    adl_id                   VARCHAR(255) NOT NULL,
    requested_test_case_id   VARCHAR(255),
    overall_score            DOUBLE PRECISION NOT NULL,
    results                  JSONB NOT NULL DEFAULT '[]',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (owner, id),
    FOREIGN KEY (owner, adl_id) REFERENCES adls(owner, id) ON DELETE CASCADE
);

CREATE INDEX idx_test_runs_owner_adl_created_at ON test_runs(owner, adl_id, created_at DESC);

