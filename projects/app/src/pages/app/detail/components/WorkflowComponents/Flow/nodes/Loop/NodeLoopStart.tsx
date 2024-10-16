import { FlowNodeItemType } from '@fastgpt/global/core/workflow/type/node';
import { useTranslation } from 'next-i18next';
import { NodeProps } from 'reactflow';
import NodeCard from '../render/NodeCard';
import EmptyTip from '@fastgpt/web/components/common/EmptyTip';
import { useContextSelector } from 'use-context-selector';
import { WorkflowContext } from '../../../context';
import {
  NodeInputKeyEnum,
  NodeOutputKeyEnum,
  WorkflowIOValueTypeEnum
} from '@fastgpt/global/core/workflow/constants';
import { Box, Flex, Table, TableContainer, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react';
import React, { useEffect, useMemo } from 'react';
import { FlowNodeOutputTypeEnum } from '@fastgpt/global/core/workflow/node/constant';
import MyIcon from '@fastgpt/web/components/common/Icon';

const typeMap = {
  [WorkflowIOValueTypeEnum.arrayString]: WorkflowIOValueTypeEnum.string,
  [WorkflowIOValueTypeEnum.arrayNumber]: WorkflowIOValueTypeEnum.number,
  [WorkflowIOValueTypeEnum.arrayBoolean]: WorkflowIOValueTypeEnum.boolean,
  [WorkflowIOValueTypeEnum.arrayObject]: WorkflowIOValueTypeEnum.object,
  [WorkflowIOValueTypeEnum.arrayAny]: WorkflowIOValueTypeEnum.any
};

const NodeLoopStart = ({ data, selected }: NodeProps<FlowNodeItemType>) => {
  const { t } = useTranslation();
  const { nodeId } = data;
  const { nodeList, onChangeNode } = useContextSelector(WorkflowContext, (v) => v);

  const loopStartNode = useMemo(
    () => nodeList.find((node) => node.nodeId === nodeId),
    [nodeList, nodeId]
  );

  // According to the variable referenced by parentInput, find the output of the corresponding node and take its output valueType
  const loopItemInputType = useMemo(() => {
    const parentNode = nodeList.find((node) => node.nodeId === loopStartNode?.parentNodeId);
    const parentArrayInput = parentNode?.inputs.find(
      (input) => input.key === NodeInputKeyEnum.loopInputArray
    );
    return parentArrayInput?.value
      ? (nodeList
          .find((node) => node.nodeId === parentArrayInput?.value[0])
          ?.outputs.find((output) => output.id === parentArrayInput?.value[1])
          ?.valueType as keyof typeof typeMap)
      : undefined;
  }, [loopStartNode?.parentNodeId, nodeList]);

  // Auth update loopStartInput output
  useEffect(() => {
    const loopArrayOutput = loopStartNode?.outputs.find(
      (output) => output.key === NodeOutputKeyEnum.loopStartInput
    );

    // if loopItemInputType is undefined, delete loopStartInput output
    if (!loopItemInputType && loopArrayOutput) {
      onChangeNode({
        nodeId,
        type: 'delOutput',
        key: NodeOutputKeyEnum.loopStartInput
      });
    }
    // if loopItemInputType is not undefined, and has no loopArrayOutput, add loopStartInput output
    if (loopItemInputType && !loopArrayOutput) {
      onChangeNode({
        nodeId,
        type: 'addOutput',
        value: {
          id: NodeOutputKeyEnum.loopStartInput,
          key: NodeOutputKeyEnum.loopStartInput,
          label: t('workflow:Array_element'),
          type: FlowNodeOutputTypeEnum.static,
          valueType: typeMap[loopItemInputType as keyof typeof typeMap]
        }
      });
    }
    // if loopItemInputType is not undefined, and has loopArrayOutput, update loopStartInput output
    if (loopItemInputType && loopArrayOutput) {
      onChangeNode({
        nodeId,
        type: 'updateOutput',
        key: NodeOutputKeyEnum.loopStartInput,
        value: {
          ...loopArrayOutput,
          valueType: typeMap[loopItemInputType as keyof typeof typeMap]
        }
      });
    }
  }, [loopStartNode?.outputs, nodeId, onChangeNode, loopItemInputType, t]);

  const Render = useMemo(() => {
    return (
      <NodeCard
        selected={selected}
        {...data}
        menuForbid={{
          copy: true,
          delete: true,
          debug: true
        }}
      >
        <Box px={4} w={'420px'} h={'116px'}>
          {!loopItemInputType ? (
            <EmptyTip text={t('workflow:loop_start_tip')} py={0} mt={4} iconSize={'32px'} />
          ) : (
            <Box bg={'white'} borderRadius={'md'} overflow={'hidden'} border={'base'}>
              <TableContainer>
                <Table bg={'white'}>
                  <Thead>
                    <Tr>
                      <Th borderBottomLeftRadius={'none !important'}>
                        {t('workflow:Variable_name')}
                      </Th>
                      <Th>{t('common:core.workflow.Value type')}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <Tr>
                      <Td>
                        <Flex alignItems={'center'}>
                          <MyIcon
                            name={'core/workflow/inputType/array'}
                            w={'14px'}
                            mr={1}
                            color={'primary.600'}
                          />
                          {t('workflow:Array_element')}
                        </Flex>
                      </Td>
                      <Td>{typeMap[loopItemInputType]}</Td>
                    </Tr>
                  </Tbody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      </NodeCard>
    );
  }, [data, loopItemInputType, selected, t]);

  return Render;
};

export default React.memo(NodeLoopStart);
