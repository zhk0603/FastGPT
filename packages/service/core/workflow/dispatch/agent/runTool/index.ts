import { NodeOutputKeyEnum } from '@fastgpt/global/core/workflow/constants';
import { DispatchNodeResponseKeyEnum } from '@fastgpt/global/core/workflow/runtime/constants';
import type {
  DispatchNodeResultType,
  RuntimeNodeItemType
} from '@fastgpt/global/core/workflow/runtime/type';
import { ModelTypeEnum, getLLMModel } from '../../../../ai/model';
import { filterToolNodeIdByEdges, getHistories } from '../../utils';
import { runToolWithToolChoice } from './toolChoice';
import { DispatchToolModuleProps, ToolNodeItemType } from './type.d';
import { ChatItemType, UserChatItemValueItemType } from '@fastgpt/global/core/chat/type';
import { ChatItemValueTypeEnum, ChatRoleEnum } from '@fastgpt/global/core/chat/constants';
import {
  GPTMessages2Chats,
  chatValue2RuntimePrompt,
  chats2GPTMessages,
  getSystemPrompt_ChatItemType,
  runtimePrompt2ChatsValue
} from '@fastgpt/global/core/chat/adapt';
import { formatModelChars2Points } from '../../../../../support/wallet/usage/utils';
import { getHistoryPreview } from '@fastgpt/global/core/chat/utils';
import { runToolWithFunctionCall } from './functionCall';
import { runToolWithPromptCall } from './promptCall';
import { replaceVariable } from '@fastgpt/global/common/string/tools';
import { getMultiplePrompt, Prompt_Tool_Call } from './constants';
import { filterToolResponseToPreview } from './utils';
import { InteractiveNodeResponseType } from '@fastgpt/global/core/workflow/template/system/interactive/type';

type Response = DispatchNodeResultType<{
  [NodeOutputKeyEnum.answerText]: string;
  [DispatchNodeResponseKeyEnum.interactive]?: InteractiveNodeResponseType;
}>;

/* 
  Tool call， auth add file prompt to question。
  Guide the LLM to call tool.
*/
export const toolCallMessagesAdapt = ({
  userInput
}: {
  userInput: UserChatItemValueItemType[];
}) => {
  const files = userInput.filter((item) => item.type === 'file');

  if (files.length > 0) {
    return userInput.map((item) => {
      if (item.type === 'text') {
        const filesCount = files.filter((file) => file.file?.type === 'file').length;
        const imgCount = files.filter((file) => file.file?.type === 'image').length;
        const text = item.text?.content || '';

        return {
          ...item,
          text: {
            content: getMultiplePrompt({ fileCount: filesCount, imgCount, question: text })
          }
        };
      }

      return item;
    });
  }

  return userInput;
};

export const dispatchRunTools = async (props: DispatchToolModuleProps): Promise<Response> => {
  const {
    node: { nodeId, name, isEntry },
    runtimeNodes,
    runtimeEdges,
    histories,
    query,

    params: { model, systemPrompt, userChatInput, history = 6 }
  } = props;

  const toolModel = getLLMModel(model);
  const chatHistories = getHistories(history, histories);

  const toolNodeIds = filterToolNodeIdByEdges({ nodeId, edges: runtimeEdges });

  // Gets the module to which the tool is connected
  const toolNodes = toolNodeIds
    .map((nodeId) => {
      const tool = runtimeNodes.find((item) => item.nodeId === nodeId);
      return tool;
    })
    .filter(Boolean)
    .map<ToolNodeItemType>((tool) => {
      const toolParams = tool?.inputs.filter((input) => !!input.toolDescription) || [];
      return {
        ...(tool as RuntimeNodeItemType),
        toolParams
      };
    });

  // Check interactive entry
  const interactiveResponse = (() => {
    const lastHistory = chatHistories[chatHistories.length - 1];
    if (isEntry && lastHistory?.obj === ChatRoleEnum.AI) {
      const lastValue = lastHistory.value[lastHistory.value.length - 1];
      if (
        lastValue?.type === ChatItemValueTypeEnum.interactive &&
        lastValue.interactive?.toolParams
      ) {
        return lastValue.interactive;
      }
    }
  })();
  props.node.isEntry = false;

  const messages: ChatItemType[] = (() => {
    const value: ChatItemType[] = [
      ...getSystemPrompt_ChatItemType(toolModel.defaultSystemChatPrompt),
      ...getSystemPrompt_ChatItemType(systemPrompt),
      // Add file input prompt to histories
      ...chatHistories.map((item) => {
        if (item.obj === ChatRoleEnum.Human) {
          return {
            ...item,
            value: toolCallMessagesAdapt({
              userInput: item.value
            })
          };
        }
        return item;
      }),
      {
        obj: ChatRoleEnum.Human,
        value: toolCallMessagesAdapt({
          userInput: runtimePrompt2ChatsValue({
            text: userChatInput,
            files: chatValue2RuntimePrompt(query).files
          })
        })
      }
    ];
    if (interactiveResponse) {
      return value.slice(0, -2);
    }
    return value;
  })();

  const {
    toolWorkflowInteractiveResponse,
    dispatchFlowResponse, // tool flow response
    toolNodeTokens,
    completeMessages = [], // The actual message sent to AI(just save text)
    assistantResponses = [], // FastGPT system store assistant.value response
    runTimes
  } = await (async () => {
    const adaptMessages = chats2GPTMessages({
      messages,
      reserveId: false,
      reserveTool: !!toolModel.toolChoice
    });

    if (toolModel.toolChoice) {
      return runToolWithToolChoice({
        ...props,
        toolNodes,
        toolModel,
        maxRunToolTimes: 30,
        messages: adaptMessages,
        interactiveEntryToolParams: interactiveResponse?.toolParams
      });
    }
    if (toolModel.functionCall) {
      return runToolWithFunctionCall({
        ...props,
        toolNodes,
        toolModel,
        messages: adaptMessages,
        interactiveEntryToolParams: interactiveResponse?.toolParams
      });
    }

    const lastMessage = adaptMessages[adaptMessages.length - 1];
    if (typeof lastMessage.content === 'string') {
      lastMessage.content = replaceVariable(Prompt_Tool_Call, {
        question: lastMessage.content
      });
    } else if (Array.isArray(lastMessage.content)) {
      // array, replace last element
      const lastText = lastMessage.content[lastMessage.content.length - 1];
      if (lastText.type === 'text') {
        lastMessage.content = replaceVariable(Prompt_Tool_Call, {
          question: lastText.text
        });
      } else {
        return Promise.reject('Prompt call invalid input');
      }
    } else {
      return Promise.reject('Prompt call invalid input');
    }

    return runToolWithPromptCall({
      ...props,
      toolNodes,
      toolModel,
      messages: adaptMessages,
      interactiveEntryToolParams: interactiveResponse?.toolParams
    });
  })();

  const { totalPoints, modelName } = formatModelChars2Points({
    model,
    tokens: toolNodeTokens,
    modelType: ModelTypeEnum.llm
  });

  // flat child tool response
  let newVariables: Record<string, any> = props.variables;
  const childToolResponse = dispatchFlowResponse
    .map((item) => {
      // Computed new variables
      newVariables = {
        ...newVariables,
        ...item.newVariables
      };

      return item.flowResponses;
    })
    .flat();

  // concat tool usage
  const totalPointsUsage =
    totalPoints +
    dispatchFlowResponse.reduce((sum, item) => {
      const childrenTotal = item.flowUsages.reduce((sum, item) => sum + item.totalPoints, 0);
      return sum + childrenTotal;
    }, 0);
  const flatUsages = dispatchFlowResponse.map((item) => item.flowUsages).flat();

  const previewAssistantResponses = filterToolResponseToPreview(assistantResponses);

  return {
    [DispatchNodeResponseKeyEnum.runTimes]: runTimes,
    [NodeOutputKeyEnum.answerText]: previewAssistantResponses
      .filter((item) => item.text?.content)
      .map((item) => item.text?.content || '')
      .join(''),
    [DispatchNodeResponseKeyEnum.assistantResponses]: previewAssistantResponses,
    [DispatchNodeResponseKeyEnum.nodeResponse]: {
      totalPoints: totalPointsUsage,
      toolCallTokens: toolNodeTokens,
      childTotalPoints: flatUsages.reduce((sum, item) => sum + item.totalPoints, 0),
      model: modelName,
      query: userChatInput,
      historyPreview: getHistoryPreview(GPTMessages2Chats(completeMessages, false), 10000),
      toolDetail: childToolResponse,
      mergeSignId: nodeId
    },
    [DispatchNodeResponseKeyEnum.nodeDispatchUsages]: [
      {
        moduleName: name,
        totalPoints,
        model: modelName,
        tokens: toolNodeTokens
      },
      ...flatUsages
    ],
    [DispatchNodeResponseKeyEnum.newVariables]: newVariables,
    [DispatchNodeResponseKeyEnum.interactive]: toolWorkflowInteractiveResponse
  };
};
