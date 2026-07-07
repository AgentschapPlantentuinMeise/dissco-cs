import React from 'react';
import { useTranslation } from 'react-i18next';
import { ManagementPlaceholder } from './ManagementPlaceholder';

export const ProjectManagement: React.FC = () => {
  const { t } = useTranslation('dissco-cs');
  return <ManagementPlaceholder title={t('sm_tile_projects_title')} />;
};
