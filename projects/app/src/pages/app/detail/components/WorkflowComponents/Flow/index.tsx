import React from 'react';
import ReactFlow, { NodeProps, ReactFlowProvider } from 'reactflow';
import { Box, IconButton, useDisclosure } from '@chakra-ui/react';
import { SmallCloseIcon } from '@chakra-ui/icons';
import { EDGE_TYPE, FlowNodeTypeEnum } from '@fastgpt/global/core/workflow/node/constant';

import dynamic from 'next/dynamic';

import ButtonEdge from './components/ButtonEdge';
import NodeTemplatesModal from './NodeTemplatesModal';

import 'reactflow/dist/style.css';
import { FlowNodeItemType } from '@fastgpt/global/core/workflow/type/node.d';
import { connectionLineStyle, defaultEdgeOptions } from '../constants';
import { useContextSelector } from 'use-context-selector';
import { WorkflowContext } from '../context';
import { useWorkflow } from './hooks/useWorkflow';
import HelperLines from './components/HelperLines';
import FlowController from './components/FlowController';

export const minZoom = 0.1;
export const maxZoom = 1.5;

const NodeSimple = dynamic(() => import('./nodes/NodeSimple'));
const nodeTypes: Record<FlowNodeTypeEnum, any> = {
  [FlowNodeTypeEnum.emptyNode]: NodeSimple,
  [FlowNodeTypeEnum.globalVariable]: NodeSimple,
  [FlowNodeTypeEnum.textEditor]: NodeSimple,
  [FlowNodeTypeEnum.customFeedback]: NodeSimple,
  [FlowNodeTypeEnum.systemConfig]: dynamic(() => import('./nodes/NodeSystemConfig')),
  [FlowNodeTypeEnum.pluginConfig]: dynamic(() => import('./nodes/NodePluginIO/NodePluginConfig')),
  [FlowNodeTypeEnum.workflowStart]: dynamic(() => import('./nodes/NodeWorkflowStart')),
  [FlowNodeTypeEnum.chatNode]: NodeSimple,
  [FlowNodeTypeEnum.readFiles]: NodeSimple,
  [FlowNodeTypeEnum.datasetSearchNode]: NodeSimple,
  [FlowNodeTypeEnum.datasetConcatNode]: dynamic(() => import('./nodes/NodeDatasetConcat')),
  [FlowNodeTypeEnum.answerNode]: dynamic(() => import('./nodes/NodeAnswer')),
  [FlowNodeTypeEnum.classifyQuestion]: dynamic(() => import('./nodes/NodeCQNode')),
  [FlowNodeTypeEnum.contentExtract]: dynamic(() => import('./nodes/NodeExtract')),
  [FlowNodeTypeEnum.httpRequest468]: dynamic(() => import('./nodes/NodeHttp')),
  [FlowNodeTypeEnum.runApp]: NodeSimple,
  [FlowNodeTypeEnum.appModule]: NodeSimple,
  [FlowNodeTypeEnum.pluginInput]: dynamic(() => import('./nodes/NodePluginIO/PluginInput')),
  [FlowNodeTypeEnum.pluginOutput]: dynamic(() => import('./nodes/NodePluginIO/PluginOutput')),
  [FlowNodeTypeEnum.pluginModule]: NodeSimple,
  [FlowNodeTypeEnum.queryExtension]: NodeSimple,
  [FlowNodeTypeEnum.tools]: dynamic(() => import('./nodes/NodeTools')),
  [FlowNodeTypeEnum.stopTool]: (data: NodeProps<FlowNodeItemType>) => (
    <NodeSimple {...data} minW={'100px'} maxW={'300px'} />
  ),
  [FlowNodeTypeEnum.lafModule]: dynamic(() => import('./nodes/NodeLaf')),
  [FlowNodeTypeEnum.ifElseNode]: dynamic(() => import('./nodes/NodeIfElse')),
  [FlowNodeTypeEnum.variableUpdate]: dynamic(() => import('./nodes/NodeVariableUpdate')),
  [FlowNodeTypeEnum.code]: dynamic(() => import('./nodes/NodeCode')),
  [FlowNodeTypeEnum.userSelect]: dynamic(() => import('./nodes/NodeUserSelect'))
};
const edgeTypes = {
  [EDGE_TYPE]: ButtonEdge
};

const Workflow = () => {
  const { nodes, edges, reactFlowWrapper } = useContextSelector(WorkflowContext, (v) => v);

  const {
    handleNodesChange,
    handleEdgeChange,
    onConnectStart,
    onConnectEnd,
    customOnConnect,
    onEdgeMouseEnter,
    onEdgeMouseLeave,
    helperLineHorizontal,
    helperLineVertical
  } = useWorkflow();

  const {
    isOpen: isOpenTemplate,
    onOpen: onOpenTemplate,
    onClose: onCloseTemplate
  } = useDisclosure();

  return (
    <>
      <Box
        flex={'1 0 0'}
        h={0}
        w={'100%'}
        position={'relative'}
        onContextMenu={(e) => {
          e.preventDefault();
          return false;
        }}
      >
        {/* open module template */}
        <>
          <IconButton
            position={'absolute'}
            top={5}
            left={5}
            size={'mdSquare'}
            borderRadius={'50%'}
            icon={<SmallCloseIcon fontSize={'26px'} />}
            transform={isOpenTemplate ? '' : 'rotate(135deg)'}
            transition={'0.2s ease'}
            aria-label={''}
            zIndex={1}
            boxShadow={'2px 2px 6px #85b1ff'}
            onClick={() => {
              isOpenTemplate ? onCloseTemplate() : onOpenTemplate();
            }}
          />
          <NodeTemplatesModal isOpen={isOpenTemplate} onClose={onCloseTemplate} />
        </>

        <ReactFlow
          ref={reactFlowWrapper}
          fitView
          nodes={nodes}
          edges={edges}
          minZoom={minZoom}
          maxZoom={maxZoom}
          defaultEdgeOptions={defaultEdgeOptions}
          elevateEdgesOnSelect
          connectionLineStyle={connectionLineStyle}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgeChange}
          onConnect={customOnConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onEdgeMouseEnter={onEdgeMouseEnter}
          onEdgeMouseLeave={onEdgeMouseLeave}
        >
          <FlowController />
          <HelperLines horizontal={helperLineHorizontal} vertical={helperLineVertical} />
        </ReactFlow>
      </Box>
    </>
  );
};

const Render = () => {
  return (
    <ReactFlowProvider>
      <Workflow />
    </ReactFlowProvider>
  );
};

export default React.memo(Render);
