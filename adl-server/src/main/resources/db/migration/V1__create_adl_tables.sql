-- SPDX-FileCopyrightText: 2025 Deutsche Telekom AG and others
--
-- SPDX-License-Identifier: Apache-2.0

CREATE TABLE adls (
    owner           VARCHAR(255) NOT NULL DEFAULT 'public',
    id              VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    tags            JSONB NOT NULL DEFAULT '[]',
    examples        JSONB NOT NULL DEFAULT '[]',
    output          TEXT,
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (owner, id)
);

CREATE TABLE adl_versions (
    id              BIGSERIAL PRIMARY KEY,
    owner           VARCHAR(255) NOT NULL DEFAULT 'public',
    adl_id          VARCHAR(255) NOT NULL,
    version         INTEGER NOT NULL,
    content         TEXT NOT NULL,
    tags            JSONB NOT NULL DEFAULT '[]',
    examples        JSONB NOT NULL DEFAULT '[]',
    output          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(owner, adl_id, version),
    FOREIGN KEY (owner, adl_id) REFERENCES adls(owner, id) ON DELETE CASCADE
);

CREATE INDEX idx_adl_versions_owner_adl_id ON adl_versions(owner, adl_id);
