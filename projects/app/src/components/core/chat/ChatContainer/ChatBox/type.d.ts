import { ChatCompletionMessageParam } from '@fastgpt/global/core/ai/type';
import { ChatFileTypeEnum } from '@fastgpt/global/core/chat/constants';
import {
  ChatItemValueItemType,
  ChatSiteItemType,
  ToolModuleResponseItemType
} from '@fastgpt/global/core/chat/type';
import { SseResponseEventEnum } from '@fastgpt/global/core/workflow/runtime/constants';

export type UserInputFileItemType = {
  id: string;
  rawFile?: File;
  type: `${ChatFileTypeEnum}`;
  name: string;
  icon: string; // img is base64
  status: 0 | 1; // 0: uploading, 1: success
  url?: string;
  process?: number;
};

export type ChatBoxInputFormType = {
  input: string;
  files: UserInputFileItemType[];
  chatStarted: boolean;
  [key: string]: any;
};

export type ChatBoxInputType = {
  text?: string;
  files?: UserInputFileItemType[];
  isInteractivePrompt?: boolean;
};

export type SendPromptFnType = (
  e: ChatBoxInputType & {
    autoTTSResponse?: boolean;
    history?: ChatSiteItemType[];
  }
) => void;

export type ComponentRef = {
  restartChat: () => void;
};
