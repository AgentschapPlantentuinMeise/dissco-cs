import { useTranslation } from 'react-i18next';
import {
  LuAward,
  LuBookOpen,
  LuBuilding2,
  LuClipboardList,
  LuFileText,
  LuFolder,
  LuImage,
  LuListOrdered,
  LuMegaphone,
  LuPalette,
  LuSettings,
  LuShieldCheck,
  LuUserCog,
} from 'react-icons/lu';
import { getSiteSlug } from '../../api/slug';
import { PageHeader } from '../../components/layout/PageHeader';
import { PageBody } from '../../components/layout/PageBody';
import { ManageGroup, ManageList } from './ManageList';

export function SiteManagement() {
  const { t } = useTranslation('dissco-cs');
  const siteSlug = getSiteSlug();
  const groups: ManageGroup[] = [
    {
      titleKey: 'sm_group_content',
      links: [
        { href: '/manage/announcements', icon: LuMegaphone, titleKey: 'sm_tile_announcements_title', descKey: 'sm_tile_announcements_desc' },
        { href: '/manage/pages', icon: LuFileText, titleKey: 'sm_tile_pages_title', descKey: 'sm_tile_pages_desc' },
        { href: '/manage/home-steps', icon: LuListOrdered, titleKey: 'sm_home_steps_title', descKey: 'sm_tile_home_steps_desc' },
        { href: '/manage/honour-board', icon: LuAward, titleKey: 'sm_honour_board_title', descKey: 'sm_tile_honour_board_desc' },
      ],
    },
    {
      titleKey: 'sm_group_projects',
      links: [
        { href: '/manage/projects', icon: LuFolder, titleKey: 'sm_tile_projects_title', descKey: 'sm_tile_projects_desc' },
        { href: '/manage/forms', icon: LuClipboardList, titleKey: 'sm_tile_forms_title', descKey: 'sm_tile_forms_desc' },
        { href: '/manage/manuals', icon: LuBookOpen, titleKey: 'sm_tile_manuals_title', descKey: 'sm_tile_manuals_desc' },
        { href: '/manage/institutions', icon: LuBuilding2, titleKey: 'sm_tile_institutions_title', descKey: 'sm_tile_institutions_desc' },
      ],
    },
    {
      titleKey: 'sm_group_appearance',
      links: [
        { href: '/manage/images', icon: LuImage, titleKey: 'sm_site_images_title', descKey: 'sm_tile_images_desc' },
        { href: '/manage/colors', icon: LuPalette, titleKey: 'sm_tile_colors_title', descKey: 'sm_tile_colors_desc' },
      ],
    },
    {
      titleKey: 'sm_group_access',
      links: [
        {
          href: `/s/${siteSlug}/admin/site/permissions`,
          icon: LuShieldCheck,
          titleKey: 'sm_tile_site_permissions_title',
          descKey: 'sm_tile_site_permissions_desc',
          external: true,
        },
        {
          href: `/s/${siteSlug}/admin/global/users`,
          icon: LuUserCog,
          titleKey: 'sm_tile_user_accounts_title',
          descKey: 'sm_tile_user_accounts_desc',
          external: true,
        },
        { href: `/s/${siteSlug}/admin`, icon: LuSettings, titleKey: 'sm_tile_madoc_title', descKey: 'sm_tile_madoc_desc', external: true },
      ],
    },
  ];

  return (
    <PageBody>
      <PageHeader variant="plain" title={t('sm_title')} lead={t('sm_intro')} />
      <ManageList groups={groups} />
    </PageBody>
  );
}
