import React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { CsPage } from '../../components/CsPage';
import { HrefLink } from '../../utility/href-link';
import { ArrowLeftIcon } from '../../icons/ArrowLeftIcon';
import { institutionsApi, Institution } from '../../api/cs-api';

export const InstitutionDetail: React.FC = () => {
  const { t, i18n } = useTranslation('dissco-cs');
  const { slug } = useParams<{ slug: string }>();
  const { data: institution, isLoading } = useQuery(
    ['institution', slug],
    () => institutionsApi.getActive(slug!),
    { enabled: !!slug }
  );

  const text = (field: Institution['name']) => field[i18n.language as keyof Institution['name']] || field.nl || '';

  return (
    <CsPage>
      <div className="cs-main-wrapper pt-10 pb-16">
        <div className="cs-container max-w-2xl">
          <HrefLink href="/institutions" className="inline-flex items-center gap-1 text-[var(--cs-primary)] no-underline font-medium hover:underline">
            <ArrowLeftIcon aria-hidden="true" /> {t('institution_back_to_list')}
          </HrefLink>

          {isLoading && <p className="text-center py-10">{t('loading_projects')}</p>}

          {!isLoading && !institution && (
            <p className="text-center py-10 text-gray-600">{t('institution_not_found')}</p>
          )}

          {institution && (
            <>
              <header className="flex items-center gap-5 mt-4 mb-4">
                {institution.logo && (
                  <div
                    className="h-[80px] w-[80px] flex-shrink-0 bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${institution.logo})` }}
                  />
                )}
                <h1 className="text-3xl text-[var(--cs-primary)] m-0">{text(institution.name)}</h1>
              </header>

              <hr className="mb-8" />

              {text(institution.description) && (
                <p className="text-base leading-relaxed text-gray-800 mb-8 whitespace-pre-line">
                  {text(institution.description)}
                </p>
              )}

              {(institution.email || institution.phone || institution.website) && (
                <ul className="list-none m-0 p-0 flex flex-col gap-2 text-base text-gray-800">
                  {institution.email && (
                    <li>
                      {t('institution_field_email')}: <a className="text-[var(--cs-primary)]" href={`mailto:${institution.email}`}>{institution.email}</a>
                    </li>
                  )}
                  {institution.phone && <li>{t('institution_field_phone')}: {institution.phone}</li>}
                  {institution.website && (
                    <li>
                      {t('institution_field_website')}: <a className="text-[var(--cs-primary)]" href={institution.website} target="_blank" rel="noreferrer">{institution.website}</a>
                    </li>
                  )}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </CsPage>
  );
};
