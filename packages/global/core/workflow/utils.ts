import {
  chatHistoryValueDesc,
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  FlowNodeTypeEnum
} from './node/constant';
import {
  WorkflowIOValueTypeEnum,
  NodeInputKeyEnum,
  VariableInputEnum,
  variableMap,
  VARIABLE_NODE_ID,
  NodeOutputKeyEnum
} from './constants';
import { FlowNodeInputItemType, FlowNodeOutputItemType, ReferenceValueProps } from './type/io.d';
import { StoreNodeItemType } from './type/node';
import type {
  VariableItemType,
  AppTTSConfigType,
  AppWhisperConfigType,
  AppScheduledTriggerConfigType,
  ChatInputGuideConfigType,
  AppChatConfigType
} from '../app/type';
import { EditorVariablePickerType } from '../../../web/components/common/Textarea/PromptEditor/type';
import {
  defaultChatInputGuideConfig,
  defaultTTSConfig,
  defaultWhisperConfig
} from '../app/constants';
import { IfElseResultEnum } from './template/system/ifElse/constant';
import { RuntimeNodeItemType } from './runtime/type';
import { getReferenceVariableValue } from './runtime/utils';
import { Input_Template_History, Input_Template_UserChatInput } from './template/input';
import { i18nT } from '../../../web/i18n/utils';

export const getHandleId = (nodeId: string, type: 'source' | 'target', key: string) => {
  return `${nodeId}-${type}-${key}`;
};

export const checkInputIsReference = (input: FlowNodeInputItemType) => {
  if (input.renderTypeList?.[input?.selectedTypeIndex || 0] === FlowNodeInputTypeEnum.reference)
    return true;

  return false;
};

/* node  */
export const getGuideModule = (modules: StoreNodeItemType[]) =>
  modules.find(
    (item) =>
      item.flowNodeType === FlowNodeTypeEnum.systemConfig ||
      // @ts-ignore (adapt v1)
      item.flowType === FlowNodeTypeEnum.systemConfig
  );
export const splitGuideModule = (guideModules?: StoreNodeItemType) => {
  const welcomeText: string =
    guideModules?.inputs?.find((item) => item.key === NodeInputKeyEnum.welcomeText)?.value || '';

  const variables: VariableItemType[] =
    guideModules?.inputs.find((item) => item.key === NodeInputKeyEnum.variables)?.value || [];

  const questionGuide: boolean =
    !!guideModules?.inputs?.find((item) => item.key === NodeInputKeyEnum.questionGuide)?.value ||
    false;

  const ttsConfig: AppTTSConfigType =
    guideModules?.inputs?.find((item) => item.key === NodeInputKeyEnum.tts)?.value ||
    defaultTTSConfig;

  const whisperConfig: AppWhisperConfigType =
    guideModules?.inputs?.find((item) => item.key === NodeInputKeyEnum.whisper)?.value ||
    defaultWhisperConfig;

  const scheduledTriggerConfig: AppScheduledTriggerConfigType = guideModules?.inputs?.find(
    (item) => item.key === NodeInputKeyEnum.scheduleTrigger
  )?.value;

  const chatInputGuide: ChatInputGuideConfigType =
    guideModules?.inputs?.find((item) => item.key === NodeInputKeyEnum.chatInputGuide)?.value ||
    defaultChatInputGuideConfig;

  // plugin
  const instruction: string =
    guideModules?.inputs?.find((item) => item.key === NodeInputKeyEnum.instruction)?.value || '';

  return {
    welcomeText,
    variables,
    questionGuide,
    ttsConfig,
    whisperConfig,
    scheduledTriggerConfig,
    chatInputGuide,
    instruction
  };
};

// Get app chat config: db > nodes
export const getAppChatConfig = ({
  chatConfig,
  systemConfigNode,
  storeVariables,
  storeWelcomeText,
  isPublicFetch = false
}: {
  chatConfig?: AppChatConfigType;
  systemConfigNode?: StoreNodeItemType;
  storeVariables?: VariableItemType[];
  storeWelcomeText?: string;
  isPublicFetch: boolean;
}): AppChatConfigType => {
  const {
    welcomeText,
    variables,
    questionGuide,
    ttsConfig,
    whisperConfig,
    scheduledTriggerConfig,
    chatInputGuide,
    instruction
  } = splitGuideModule(systemConfigNode);

  const config: AppChatConfigType = {
    questionGuide,
    ttsConfig,
    whisperConfig,
    scheduledTriggerConfig,
    chatInputGuide,
    instruction,
    ...chatConfig,
    variables: storeVariables ?? chatConfig?.variables ?? variables,
    welcomeText: storeWelcomeText ?? chatConfig?.welcomeText ?? welcomeText
  };

  if (!isPublicFetch) {
    config.scheduledTriggerConfig = undefined;
  }

  return config;
};

export const getOrInitModuleInputValue = (input: FlowNodeInputItemType) => {
  if (input.value !== undefined || !input.valueType) return input.value;
  if (input.defaultValue !== undefined) return input.defaultValue;

  const map: Record<string, any> = {
    [WorkflowIOValueTypeEnum.boolean]: false,
    [WorkflowIOValueTypeEnum.number]: 0,
    [WorkflowIOValueTypeEnum.string]: ''
  };

  return map[input.valueType];
};

export const getModuleInputUiField = (input: FlowNodeInputItemType) => {
  // if (input.renderTypeList === FlowNodeInputTypeEnum.input || input.type === FlowNodeInputTypeEnum.textarea) {
  //   return {
  //     placeholder: input.placeholder || input.description
  //   };
  // }
  return {};
};

export const pluginData2FlowNodeIO = ({
  nodes
}: {
  nodes: StoreNodeItemType[];
}): {
  inputs: FlowNodeInputItemType[];
  outputs: FlowNodeOutputItemType[];
} => {
  const pluginInput = nodes.find((node) => node.flowNodeType === FlowNodeTypeEnum.pluginInput);
  const pluginOutput = nodes.find((node) => node.flowNodeType === FlowNodeTypeEnum.pluginOutput);

  return {
    inputs:
      pluginInput?.inputs.map((item) => ({
        ...item,
        ...getModuleInputUiField(item),
        value: getOrInitModuleInputValue(item),
        canEdit: false,
        renderTypeList:
          item.renderTypeList[0] === FlowNodeInputTypeEnum.customVariable
            ? [FlowNodeInputTypeEnum.reference, FlowNodeInputTypeEnum.input]
            : item.renderTypeList
      })) || [],
    outputs: pluginOutput
      ? [
          ...pluginOutput.inputs.map((item) => ({
            id: item.key,
            type: FlowNodeOutputTypeEnum.static,
            key: item.key,
            valueType: item.valueType,
            label: item.label || item.key,
            description: item.description
          }))
        ]
      : []
  };
};

export const appData2FlowNodeIO = ({
  chatConfig
}: {
  chatConfig?: AppChatConfigType;
}): {
  inputs: FlowNodeInputItemType[];
  outputs: FlowNodeOutputItemType[];
} => {
  const variableInput = !chatConfig?.variables
    ? []
    : chatConfig.variables.map((item) => {
        const renderTypeMap = {
          [VariableInputEnum.input]: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          [VariableInputEnum.textarea]: [
            FlowNodeInputTypeEnum.textarea,
            FlowNodeInputTypeEnum.reference
          ],
          [VariableInputEnum.select]: [FlowNodeInputTypeEnum.select],
          [VariableInputEnum.custom]: [
            FlowNodeInputTypeEnum.input,
            FlowNodeInputTypeEnum.reference
          ],
          default: [FlowNodeInputTypeEnum.reference]
        };

        return {
          key: item.key,
          renderTypeList: renderTypeMap[item.type] || renderTypeMap.default,
          label: item.label,
          debugLabel: item.label,
          description: '',
          valueType: WorkflowIOValueTypeEnum.any,
          required: item.required,
          list: item.enums.map((enumItem) => ({
            label: enumItem.value,
            value: enumItem.value
          }))
        };
      });

  // const showFileLink =
  //   chatConfig?.fileSelectConfig?.canSelectFile || chatConfig?.fileSelectConfig?.canSelectImg;

  return {
    inputs: [
      Input_Template_History,
      Input_Template_UserChatInput,
      // ...(showFileLink ? [Input_Template_File_Link] : []),
      ...variableInput
    ],
    outputs: [
      {
        id: NodeOutputKeyEnum.history,
        key: NodeOutputKeyEnum.history,
        required: true,
        label: i18nT('common:core.module.output.label.New context'),
        description: i18nT('common:core.module.output.description.New context'),
        valueType: WorkflowIOValueTypeEnum.chatHistory,
        valueDesc: chatHistoryValueDesc,
        type: FlowNodeOutputTypeEnum.static
      },
      {
        id: NodeOutputKeyEnum.answerText,
        key: NodeOutputKeyEnum.answerText,
        required: false,
        label: i18nT('common:core.module.output.label.Ai response content'),
        description: i18nT('common:core.module.output.description.Ai response content'),
        valueType: WorkflowIOValueTypeEnum.string,
        type: FlowNodeOutputTypeEnum.static
      }
    ]
  };
};

export const formatEditorVariablePickerIcon = (
  variables: { key: string; label: string; type?: `${VariableInputEnum}`; required?: boolean }[]
): EditorVariablePickerType[] => {
  return variables.map((item) => ({
    ...item,
    icon: item.type ? variableMap[item.type]?.icon : variableMap['input'].icon
  }));
};

export const isReferenceValue = (value: any): boolean => {
  return Array.isArray(value) && value.length === 2 && typeof value[0] === 'string';
};

export const getElseIFLabel = (i: number) => {
  return i === 0 ? IfElseResultEnum.IF : `${IfElseResultEnum.ELSE_IF} ${i}`;
};

// add value to plugin input node when run plugin
export const updatePluginInputByVariables = (
  nodes: RuntimeNodeItemType[],
  variables: Record<string, any>
) => {
  return nodes.map((node) =>
    node.flowNodeType === FlowNodeTypeEnum.pluginInput
      ? {
          ...node,
          inputs: node.inputs.map((input) => {
            const parseValue = (() => {
              try {
                if (
                  input.valueType === WorkflowIOValueTypeEnum.string ||
                  input.valueType === WorkflowIOValueTypeEnum.number ||
                  input.valueType === WorkflowIOValueTypeEnum.boolean
                )
                  return variables[input.key];

                return JSON.parse(variables[input.key]);
              } catch (e) {
                return variables[input.key];
              }
            })();

            return {
              ...input,
              value: parseValue ?? input.value
            };
          })
        }
      : node
  );
};

// replace {{$xx.xx$}} variables for text
export function replaceEditorVariable({
  text,
  nodes,
  variables,
  runningNode
}: {
  text: any;
  nodes: RuntimeNodeItemType[];
  variables: Record<string, any>; // global variables
  runningNode: RuntimeNodeItemType;
}) {
  if (typeof text !== 'string') return text;

  const globalVariables = Object.keys(variables).map((key) => {
    return {
      nodeId: VARIABLE_NODE_ID,
      id: key,
      value: variables[key]
    };
  });

  // Upstream node outputs
  const nodeVariables = nodes
    .map((node) => {
      return node.outputs.map((output) => {
        return {
          nodeId: node.nodeId,
          id: output.id,
          value: output.value
        };
      });
    })
    .flat();

  // Get runningNode inputs(Will be replaced with reference)
  const customInputs = runningNode.inputs.flatMap((item) => {
    if (Array.isArray(item.value)) {
      return [
        {
          id: item.key,
          value: getReferenceVariableValue({
            value: item.value as ReferenceValueProps,
            nodes,
            variables
          }),
          nodeId: runningNode.nodeId
        }
      ];
    }
    return [];
  });

  const allVariables = [...globalVariables, ...nodeVariables, ...customInputs];

  // Replace {{$xxx.xxx$}} to value
  for (const key in allVariables) {
    const val = allVariables[key];
    const regex = new RegExp(`\\{\\{\\$(${val.nodeId}\\.${val.id})\\$\\}\\}`, 'g');
    if (['string', 'number'].includes(typeof val.value)) {
      text = text.replace(regex, String(val.value));
    } else if (['object'].includes(typeof val.value)) {
      text = text.replace(regex, JSON.stringify(val.value));
    } else {
      continue;
    }
  }
  return text || '';
}
