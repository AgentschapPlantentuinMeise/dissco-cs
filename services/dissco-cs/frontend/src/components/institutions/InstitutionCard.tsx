import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { InstitutionDto } from '@dissco-cs/shared-types';
import { siteLangText } from '../../utility/site-lang-text';

interface InstitutionCardProps {
  institution: InstitutionDto;
}

export const InstitutionCard: React.FC<InstitutionCardProps> = ({ institution }) => {
  const { i18n } = useTranslation('dissco-cs');
  const name = siteLangText(institution.name, i18n.language, institution.slug);

  return (
    <Link
      to={`/institutions/${institution.slug}`}
      className="flex flex-col items-center bg-white rounded-lg overflow-hidden shadow-md transition-[transform,box-shadow] duration-200 cursor-pointer h-full no-underline text-inherit p-6 hover:-translate-y-1 hover:shadow-lg"
    >
      <div
        className="h-[100px] w-full bg-contain bg-center bg-no-repeat mb-4"
        style={{ backgroundImage: institution.logo ? `url(${institution.logo})` : undefined }}
      />
      <h3 className="text-lg text-center text-[var(--cs-primary)] m-0">{name}</h3>
    </Link>
  );
};
