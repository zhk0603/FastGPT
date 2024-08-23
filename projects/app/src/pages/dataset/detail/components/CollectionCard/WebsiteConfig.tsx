import React from 'react';
import MyModal from '@fastgpt/web/components/common/MyModal';
import { useTranslation } from 'next-i18next';
import { Box, Button, Input, Link, ModalBody, ModalFooter, Switch } from '@chakra-ui/react';
import { strIsLink } from '@fastgpt/global/common/string/tools';
import { useToast } from '@fastgpt/web/hooks/useToast';
import { useForm } from 'react-hook-form';
import { useConfirm } from '@fastgpt/web/hooks/useConfirm';
import { getDocPath } from '@/web/common/system/doc';
import { useSystemStore } from '@/web/common/system/useSystemStore';

type FormType = {
  url?: string | undefined;
  limit?: number | undefined;
  maxDepth?: number | undefined;
  includes?: string | undefined;
  excludes?: string | undefined;
  ignoreSitemap?: boolean | undefined;
  onlyIncludeTags?: string | undefined;
  removeTags?: string | undefined;
  onlyMainContent?: boolean | undefined;
  waitFor?: number | undefined;
  allowBackwardCrawling?: boolean | undefined;
};

const WebsiteConfigModal = ({
  onClose,
  onSuccess,
  defaultValue = {
    url: '',
    limit: 10000,
    maxDepth: 10,
    includes: '',
    excludes: '',
    ignoreSitemap: true,
    onlyIncludeTags: '',
    removeTags: '',
    onlyMainContent: false,
    waitFor: 1000,
    allowBackwardCrawling: false
  }
}: {
  onClose: () => void;
  onSuccess: (data: FormType) => void;
  defaultValue?: FormType;
}) => {
  const { t } = useTranslation();
  const { feConfigs } = useSystemStore();
  const { toast } = useToast();
  const { register, handleSubmit } = useForm({
    defaultValues: defaultValue
  });
  const isEdit = !!defaultValue.url;
  const confirmTip = isEdit
    ? t('common:core.dataset.website.Confirm Update Tips')
    : t('common:core.dataset.website.Confirm Create Tips');

  const { ConfirmModal, openConfirm } = useConfirm({
    type: 'common'
  });

  return (
    <MyModal
      isOpen
      iconSrc="core/dataset/websiteDataset"
      title={t('common:core.dataset.website.Config')}
      onClose={onClose}
      maxW={'900px'}
    >
      <ModalBody>
        <Box fontSize={'sm'} color={'myGray.600'}>
          {t('common:core.dataset.website.Config Description')}
          {feConfigs?.docUrl && (
            <Link
              href={getDocPath('/docs/course/websync')}
              target="_blank"
              textDecoration={'underline'}
              fontWeight={'bold'}
            >
              {t('common:common.course.Read Course')}
            </Link>
          )}
        </Box>
        <Box mt={2} display="flex" justifyContent="space-between" flexWrap="wrap">
          <Box flexBasis={['100%', '48%']} mb={4}>
            <Box>{t('common:core.dataset.website.Base Url')}</Box>
            <Input
              placeholder={t('common:core.dataset.collection.Website Link')}
              {...register('url', {
                required: true
              })}
            />
          </Box>
          <Box flexBasis={['100%', '48%']} mb={4}>
            <Box>{t('common:core.dataset.website.Limit')}</Box>
            <Input
              type="number"
              {...register('limit', {
                required: true
              })}
              placeholder="最大抓取页面数"
            />
          </Box>
          <Box flexBasis={['100%', '48%']} mb={4}>
            <Box>{t('common:core.dataset.website.MaxDepth')}</Box>
            <Input
              type="number"
              {...register('maxDepth', {
                required: true
              })}
              placeholder="相对于输入的 URL 的最大爬网深度。"
            />
          </Box>
          <Box flexBasis={['100%', '48%']} mb={4}>
            <Box>{t('common:core.dataset.website.IgnoreSitemap')}</Box>
            <Switch {...register('ignoreSitemap')} />
          </Box>
          <Box flexBasis={['100%', '48%']} mb={4}>
            <Box>
              {t('common:core.dataset.website.Includes')}({t('common:common.choosable')})
            </Box>
            <Input {...register('includes')} placeholder="docs/*,articles/*" />
          </Box>
          <Box flexBasis={['100%', '48%']} mb={4}>
            <Box>
              {t('common:core.dataset.website.Excludes')}({t('common:common.choosable')})
            </Box>
            <Input {...register('excludes')} placeholder="blog/*,/about/*" />
          </Box>
          <Box flexBasis={['100%', '48%']} mb={4}>
            <Box>
              {t('common:core.dataset.website.OnlyIncludeTags')}({t('common:common.choosable')})
            </Box>
            <Input
              {...register('onlyIncludeTags')}
              placeholder="使用逗号分隔值。示例：“script, .ad, #footer”"
            />
          </Box>
          <Box flexBasis={['100%', '48%']} mb={4}>
            <Box>
              {t('common:core.dataset.website.RemoveTags')}({t('common:common.choosable')})
            </Box>
            <Input
              {...register('removeTags')}
              placeholder="使用逗号分隔值。示例：“script, .ad, #foote”"
            />
          </Box>
          <Box flexBasis={['100%', '48%']} mb={4}>
            <Box>{t('common:core.dataset.website.OnlyMainContent')}</Box>
            <Switch {...register('onlyMainContent')} />
          </Box>
          <Box flexBasis={['100%', '48%']} mb={4}>
            <Box>{t('common:core.dataset.website.WaitFor')}</Box>
            <Input
              type="number"
              {...register('waitFor', {
                required: true
              })}
              placeholder="等待指定毫秒，页面加载以获取内容"
            />
          </Box>
          <Box flexBasis={['100%', '48%']} mb={4}>
            <Box>{t('common:core.dataset.website.AllowBackwardCrawling')}</Box>
            <Switch {...register('allowBackwardCrawling')} />
          </Box>
        </Box>
      </ModalBody>
      <ModalFooter>
        <Button variant={'whiteBase'} onClick={onClose}>
          {t('common:common.Close')}
        </Button>
        <Button
          ml={2}
          onClick={handleSubmit((data) => {
            if (!data.url) return;
            // check is link
            if (!strIsLink(data.url)) {
              return toast({
                status: 'warning',
                title: t('common:common.link.UnValid')
              });
            }
            openConfirm(
              () => {
                onSuccess(data);
              },
              undefined,
              confirmTip
            )();
          })}
        >
          {t('common:core.dataset.website.Start Sync')}
        </Button>
      </ModalFooter>
      <ConfirmModal />
    </MyModal>
  );
};

export default WebsiteConfigModal;
