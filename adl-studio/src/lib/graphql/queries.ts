const TestRunResultFields = `
  id
  adlId
  owner
  createdAt
  requestedTestCaseId
  overallScore
  results {
    score
    status
    failureReason
    executedVariantIndex
    executedConversation {
      content
      role
    }
    actualConversation {
      content
      role
    }
    testCase {
      id
      adlId
      useCaseId
      name
      description
      contract
      expectedConversation {
        content
        role
      }
    }
    details {
      evidence {
        mapsTo
        quote
      }
      missingRequirements
      reasons
      score
      verdict
      violations
    }
    testCaseId
    testCaseName
    useCases
  }
`;

export const TestsQuery = `
  query TestsQuery($useCaseId: String!) {
    testCases(useCaseId: $useCaseId) {
      description
      expectedConversation {
        content
        role
      }
      id
      name
      useCaseId
      contract
    }
  }
`;

export const ListPromptsQuery = `
  query ListPrompts($term: String!) {
    list(searchTerm: { term: $term, limit: 50, threshold: 0.5 }) {
      id
      createdAt
      tags
      relevance
    }
  }
`;

export const SearchByIdQuery = `
  query SearchByIdQuery($id: String!) {
    searchById(id: $id) {
      id
      createdAt
      tags
      content
      examples
      output
    }
  }
`;

export const TestRunsQuery = `
  query TestRuns($adlId: String!, $limit: Int!) {
    testRuns(adlId: $adlId, limit: $limit) {
      ${TestRunResultFields}
    }
  }
`;

export const TestRunQuery = `
  query TestRun($id: String!) {
    testRun(id: $id) {
      ${TestRunResultFields}
    }
  }
`;

export const GetMcpToolsQuery = `
  query getMcpTools {
    getMcpTools {
      description
      name
      parameters
    }
  }
`;

export const GetMcpServerUrlsQuery = `
    query getMcpServerUrls {
        mcpServerUrls {
            url
            reachable
            toolCount 
       }
    }
`;

export const GetUserSettingsQuery = `
  query GetUserSettings {
    userSettings {
      apiKey
      modelName
      modelUrl
      embeddingModel
      embeddingUrl
      embeddingKey
    }
  }
`;

export const ListWidgetsQuery = `
  query ListWidgets {
    widgets {
      id
      name
      description
      html
    }
  }
`;

export const GetWidgetQuery = `
  query GetWidget($id: String!) {
    widget(id: $id) {
      id
      name
      html
      jsonSchema
    }
  }
`;

export const RolePromptsQuery = `
  query RolePrompts {
    rolePrompts {
      id
      name
      tags
      role
      tone
    }
  }
`;

export const DashboardQuery = `
  query Dashboard {
    dashboard {
      numberOfAdls
      averageResponseTime
      mostUsedUseCase {
        useCaseId
        count
        minComplianceScore
        maxComplianceScore
      }
    }
  }
`;

export const TagsQuery = `
  query GetTags {
    tags
  }
`;

export const VersionHistoryQuery = `
  query VersionHistory($id: String!) {
    versionHistory(id: $id) {
      adlId
      version
      content
      tags
      examples
      output
      createdAt
    }
  }
`;

export const DiffVersionsQuery = `
  query DiffVersions($id: String!, $fromVersion: Int!, $toVersion: Int!) {
    diffVersions(id: $id, fromVersion: $fromVersion, toVersion: $toVersion) {
      adlId
      fromVersion
      toVersion
      contentDiff
    }
  }
`;

export const ListAgentsQuery = `
  query ListAgents {
    agents {
      id
      name
      description
      models
      tags
      mcpServers
      role
      corePrompt
      active
    }
  }
`;

export const GetAgentQuery = `
  query GetAgent($id: String!) {
    agent(id: $id) {
      id
      name
      description
      models
      tags
      mcpServers
      role
      corePrompt
      active
    }
  }
`;

export const OrganizationsQuery = `
  query Organizations {
    organizations {
      id
      name
      descriptions
      apiKeys {
        id
        label
        maskedKey
        createdAt
        revoked
      }
    }
  }
`;

export const OrganizationQuery = `
  query Organization($id: String!) {
    organization(id: $id) {
      id
      name
      descriptions
      apiKeys {
        id
        label
        maskedKey
        createdAt
        revoked
      }
    }
  }
`;

