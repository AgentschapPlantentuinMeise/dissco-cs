import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Institution } from '../../api/cs-api';

interface InstitutionCardProps {
  institution: Institution;
}

export const InstitutionCard: React.FC<InstitutionCardProps> = ({ institution }) => {
  const { i18n } = useTranslation('dissco-cs');
  const name = institution.name[i18n.language as keyof Institution['name']] || institution.name.nl || institution.slug;

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
