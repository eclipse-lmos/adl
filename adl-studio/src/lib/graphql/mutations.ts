export const AssistantMutation = `
  mutation Assistant($input: AssistantInput!) {
    assistant(input: $input) {
      messages {
        role
        content
        format
      }
      responseTime
      context {
        key
        value
      }
      toolCalls {
        name
        arguments
      }
    }
  }
`;

export const EvalMutation = `
  mutation Eval($input: EvalInput!) {
    eval(input: $input) {
      evidence {
        mapsTo
        quote
      }
      reasons
      score
      verdict
      missingRequirements
    }
  }
`;

export const ExamplesMutation = `
  mutation examples($useCase: String!) {
    examples(useCase: $useCase) {
      useCase
      examples
    }
  }
`;

export const NewTestsMutation = `
  mutation newTests($id: String!) {
    newTests(id: $id) {
      count
    }
  }
`;

export const StoreADLMutation = `
  mutation storeADL($id: String!, $createdAt: String!, $tags: [String!]!, $content: String!, $examples: [String!]!) {
    store(id: $id, createdAt: $createdAt, tags: $tags, content: $content, examples: $examples) {
      message
      storedExamplesCount
    }
  }
`;

export const UpdateTagsMutation = `
  mutation updateTags($id: String!, $tags: [String!]!) {
    updateTags(id: $id, tags: $tags) {
      message
    }
  }
`;

export const DeletePromptMutation = `
  mutation delete($id: String!) {
    delete(id: $id) {
      message
    }
  }
`;

export const ImproveUseCaseMutation = `
  mutation ImproveUseCase($useCase: String!) {
    improveUseCase(useCase: $useCase) {
      improvements {
        improved_use_case
        issue
        suggestion
      }
    }
  }
`;

export const ExecuteTestsMutation = `
  mutation executeTests($id: String!, $testCaseId: String) {
    executeTests(adlId: $id, testCaseId: $testCaseId) {
      overallScore
      results {
        score
        status
        actualConversation {
          content
          role
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
    }
  }
`;

export const DeleteTestCaseMutation = `
  mutation deleteTest($id: String!) {
    deleteTest(id: $id) 
  }
`;

export const UpdateTestCaseMutation = `
  mutation updateTest($input: UpdateTestCaseInput!) {
    updateTest(input: $input) {
      id
    }
  }
`;

export const AddTestCaseMutation = `
  mutation addTest($input: AddTestCaseInput!) {
    addTest(input: $input) {
      id
    }
  }
`;

export const SetMcpServerUrlsMutation = `
  mutation setMcpServerUrls($urls: [String!]!) {
    setMcpServerUrls(urls: $urls) {
    url
    reachable
    toolCount 
    }
  }
`;

export const CorrectSpellingMutation = `
  mutation correctSpelling($text: String!) {
    correctSpelling(text: $text)
  }
`;

export const GenerateWidgetMutation = `
  mutation GenerateWidget($name: String!, $purpose: String!, $interactions: String!) {
    generateWidget(input: {
      name: $name,
      purpose: $purpose,
      interactions: $interactions
    }) {
      html
      jsonSchema
    }
  }
`;

export const SetUserSettingsMutation = `
  mutation SetUserSettings($apiKey: String!, $modelName: String!, $modelUrl: String) {
    setUserSettings(apiKey: $apiKey, modelName: $modelName, modelUrl: $modelUrl) {
      apiKey
      modelName
      modelUrl
    }
  }
`;

export const SaveWidgetMutation = `
  mutation SaveWidget($id: String, $name: String!, $html: String!, $jsonSchema: String!, $preview: String!) {
    saveWidget(input: {
      id: $id,
      name: $name,
      html: $html,
      jsonSchema: $jsonSchema,
      preview: $preview
    }) {
      id
      name
    }
  }
`;

export const DeleteWidgetMutation = `
  mutation DeleteWidget($id: String!) {
    deleteWidget(id: $id)
  }
`;

export const UpdateRolePromptMutation = `
  mutation UpdateRolePrompt($id: String!, $name: String!, $role: String!, $tone: String!) {
    updateRolePrompt(id: $id, name: $name, role: $role, tone: $tone) {
      id
      name
      role
      tone
    }
  }
`;

export const DeleteRolePromptMutation = `
  mutation DeleteRolePrompt($id: String!) {
    deleteRolePrompt(id: $id)
  }
`;

export const UpdateOutputMutation = `
  mutation UpdateOutput($id: String!, $output: String!) {
    updateOutput(id: $id, output: $output) {
      message
    }
  }
`;
