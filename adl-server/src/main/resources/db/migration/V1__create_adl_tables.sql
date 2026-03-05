-- SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
--
-- SPDX-License-Identifier: Apache-2.0

CREATE TABLE adls (
    id              VARCHAR(255) PRIMARY KEY,
    content         TEXT NOT NULL,
    tags            JSONB NOT NULL DEFAULT '[]',
    examples        JSONB NOT NULL DEFAULT '[]',
    output          TEXT,
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE adl_versions (
    id              BIGSERIAL PRIMARY KEY,
    adl_id          VARCHAR(255) NOT NULL REFERENCES adls(id) ON DELETE CASCADE,
    version         INTEGER NOT NULL,
    content         TEXT NOT NULL,
    tags            JSONB NOT NULL DEFAULT '[]',
    examples        JSONB NOT NULL DEFAULT '[]',
    output          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(adl_id, version)
);

CREATE INDEX idx_adl_versions_adl_id ON adl_versions(adl_id);
