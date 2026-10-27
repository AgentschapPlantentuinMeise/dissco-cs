import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SITE_IMAGE_MIME_TYPES, SiteImageDto, SiteImageKey, siteImageFileSchema } from '@dissco-cs/shared-types';
import { siteImagesApi } from '../../../api/cs-client/site-images';
import { siteImageKeys, siteImageQueries } from '../../../api/queries/site-images';
import { siteThemeQueries } from '../../../api/queries/site-theme';
import { Button } from '../../../components/ui/Button';
import { DeleteIconButton } from '../../../components/ui/DeleteIconButton';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { SaveButton } from '../../../components/ui/SaveButton';
import { SavedNotice } from '../../../components/ui/SavedNotice';
import { CsPage } from '../../../components/layout/CsPage';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PageBody } from '../../../components/layout/PageBody';
import { ManageLoadError } from '../ManageLoadError';
import { failedToLoad } from '../../../api/query-state';
import { rowHoverClass } from '../../../components/ui/list-styles';
import { inputClass } from '../../../components/ui/input-styles';
import { SiteNameRow } from './SiteNameRow';

const LABEL_KEY: Record<SiteImageKey, string> = {
  logo: 'sm_site_images_logo',
  home: 'sm_site_images_page_home',
  institutions: 'nav_institutions',
  about: 'sm_pages_page_about',
};

const HEADER_PHOTO_KEYS: SiteImageKey[] = ['home', 'institutions', 'about'];

// The site's name, its logo (navbar and footer) and the photo in the header of Home, Institutions
// and About: choose, replace or remove each image, and the credit of a photo.
export function SiteImages() {
  const { t } = useTranslation('dissco-cs');
  const imagesQuery = useQuery(siteImageQueries.list());
  const images = imagesQuery.data;
  // The same query SiteNameRow reads: without it the name field would be empty.
  const themeQuery = useQuery(siteThemeQueries.get());
  const imageFor = (key: SiteImageKey) => images?.find(image => image.key === key);

  if (failedToLoad(imagesQuery) || failedToLoad(themeQuery)) {
    return <ManageLoadError />;
  }

  return (
    <CsPage>
      <PageBody>
        <PageHeader
          variant="plain"
          back={{ href: '/manage', label: t('sm_back_to_hub') }}
          title={t('sm_site_images_title')}
          lead={t('sm_site_images_intro')}
        />

      <ul className="list-none m-0 p-0 bg-white border-t border-gray-200 divide-y divide-gray-100">
        <SiteNameRow />
        <SiteImageRow imageKey="logo" image={imageFor('logo')} hint={t('sm_site_images_logo_hint')} />
      </ul>

      <h3 className="text-base font-semibold text-gray-800 mt-6 mb-1">{t('sm_site_images_photos_title')}</h3>
      <p className="text-sm text-gray-600 mt-0 mb-3 max-w-[70ch]">{t('sm_site_images_photos_hint')}</p>
      <ul className="list-none m-0 p-0 bg-white border-t border-gray-200 divide-y divide-gray-100">
        {HEADER_PHOTO_KEYS.map(key => (
          <SiteImageRow key={key} imageKey={key} image={imageFor(key)} />
        ))}
      </ul>
      </PageBody>
    </CsPage>
  );
}

function SiteImageRow({ imageKey, image, hint }: { imageKey: SiteImageKey; image: SiteImageDto | undefined; hint?: string }) {
  const { t } = useTranslation('dissco-cs');
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draftCredit, setDraftCredit] = useState(image?.credit ?? '');
  const [invalidFile, setInvalidFile] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const onWritten = () => queryClient.invalidateQueries({ queryKey: siteImageKeys.all });
  const isLogo = imageKey === 'logo';

  // Follows the saved credit (after a save, or a delete that clears it), not every keystroke.
  useEffect(() => setDraftCredit(image?.credit ?? ''), [image?.credit]);

  const { mutate: upload, isPending: uploading } = useMutation({
    mutationFn: (file: File) => siteImagesApi.uploadFile(imageKey, file),
    onSuccess: onWritten,
    meta: { errorMessage: 'error_upload_failed' },
  });

  const { mutate: saveCredit, isPending: savingCredit, isSuccess: creditSaved } = useMutation({
    mutationFn: () => siteImagesApi.setCredit(imageKey, draftCredit),
    onSuccess: onWritten,
  });

  const { mutate: deleteFile } = useMutation({
    mutationFn: () => siteImagesApi.deleteFile(imageKey),
    onSuccess: onWritten,
    meta: { errorMessage: 'error_delete_failed' },
  });

  const onPickFile = (file: File) => {
    const valid = siteImageFileSchema.safeParse(file).success;
    setInvalidFile(!valid);
    if (valid) {
      upload(file);
    }
  };

  const label = t(LABEL_KEY[imageKey]);
  // A logo is shown whole on white, like in the navbar; a photo fills its box, like in the header.
  const previewClass = isLogo
    ? 'w-40 h-[60px] bg-white border border-gray-200 bg-contain bg-no-repeat bg-center bg-origin-content p-2'
    : 'w-40 h-[90px] bg-cs-primary/10 bg-cover bg-center';

  return (
    <li className={`flex flex-wrap items-center gap-4 px-4 py-4 ${rowHoverClass}`}>
      <span className="w-28 font-semibold">{label}</span>

      <div
        className={`flex-shrink-0 rounded grid place-items-center text-xs text-gray-500 ${previewClass}`}
        style={image ? { backgroundImage: `url(${siteImagesApi.fileUrl(imageKey, image.updatedAt)})` } : undefined}
      >
        {!image && t('sm_site_images_none')}
      </div>

      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <Button variant="secondary" size="sm" loading={uploading} onClick={() => fileInputRef.current?.click()}>
            {image ? t('sm_site_images_replace') : t('sm_site_images_choose')}
          </Button>
          {image && <DeleteIconButton onClick={() => setConfirmingDelete(true)} />}
        </span>
        {hint && <span className="text-sm text-gray-500">{hint}</span>}
        {invalidFile && <span className="text-sm text-red-600">{t('sm_site_images_invalid_file')}</span>}

        {image && !isLogo && (
          <span className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={draftCredit}
              onChange={e => setDraftCredit(e.target.value)}
              aria-label={t('sm_site_images_credit_label')}
              placeholder={t('sm_site_images_credit_placeholder')}
              className={`${inputClass} w-72 max-w-full`}
            />
            <SaveButton onClick={() => saveCredit()} loading={savingCredit} disabled={draftCredit === (image.credit ?? '')} />
            {creditSaved && draftCredit === (image.credit ?? '') && <SavedNotice />}
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={SITE_IMAGE_MIME_TYPES.join(',')}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            onPickFile(file);
          }
          e.target.value = '';
        }}
      />

      {confirmingDelete && (
        <ConfirmDialog
          title={t('sm_site_images_delete_title', { image: label })}
          message={t('sm_site_images_delete_message')}
          confirmLabel={t('common_delete')}
          cancelLabel={t('common_cancel')}
          onConfirm={() => {
            setConfirmingDelete(false);
            deleteFile();
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </li>
  );
}
