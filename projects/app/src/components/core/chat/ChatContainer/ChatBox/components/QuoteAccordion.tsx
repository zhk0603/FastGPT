import React from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Box
} from '@chakra-ui/react';
import ChatBoxDivider from '@/components/core/chat/Divider';

const QuoteAccordion = ({ title, children }: { title: string; children: React.ReactNode }) => {
  return (
    <Accordion allowToggle>
      <AccordionItem sx={{ border: 'none' }}>
        <h2>
          <AccordionButton>
            <Box as="span" flex="1" textAlign="left">
              <ChatBoxDivider icon="core/chat/quoteFill" text={title} />
            </Box>
            <AccordionIcon />
          </AccordionButton>
        </h2>
        <AccordionPanel pb={4}>{children}</AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
};

export default QuoteAccordion;
