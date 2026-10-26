import { useQuery } from '@tanstack/react-query';
import { siteImageQueries } from '../../api/queries/site-images';
import { siteImagesApi } from '../../api/cs-client/site-images';
import { disscoCSConfig } from '../../dissco-cs-config';
import { useSiteName } from '../../hooks/use-site-name';

// The site's logo in the navbar: the one set in site management, else the platform's default. An
// empty box while the list loads, so a site with its own logo never flashes the default first. The
// list is remembered per browser (siteImageQueries.list), so only a browser's first visit waits
// for it. The logo fits inside a maximum height and width instead of a fixed height: a tall logo
// (DiSSCo Flanders) reaches the height, a wide flat one (DoeDat) the width, so both look about as
// large. The box keeps a fixed height, so the navbar does not shift when the logo arrives.
export function SiteLogo() {
  const { data, isPending } = useQuery(siteImageQueries.list());
  const siteName = useSiteName();

  const logo = data?.find(candidate => candidate.key === 'logo');
  const src = logo ? siteImagesApi.fileUrl('logo', logo.updatedAt) : disscoCSConfig.logoUrl;
  return (
    <span className="h-11 flex items-center">
      {!isPending && <img src={src} alt={`${siteName} Logo`} className="max-h-11 max-w-[200px] w-auto h-auto object-contain block" />}
    </span>
  );
}
