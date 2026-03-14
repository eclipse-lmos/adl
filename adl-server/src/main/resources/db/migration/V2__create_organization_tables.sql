-- SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
--
-- SPDX-License-Identifier: Apache-2.0

CREATE TABLE organizations (
    id              VARCHAR(255) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    descriptions    TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organization_api_keys (
    id              VARCHAR(255) PRIMARY KEY,
    organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    label           VARCHAR(255) NOT NULL,
    hashed_key      VARCHAR(128) NOT NULL,
    masked_key      VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked         BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_organization_api_keys_hashed_key ON organization_api_keys(hashed_key);
CREATE INDEX idx_organization_api_keys_org_id ON organization_api_keys(organization_id);

INSERT INTO organizations (id, name, descriptions)
VALUES ('public', 'Public', 'Default public owner used for backwards-compatible development mode.')
ON CONFLICT (id) DO NOTHING;

