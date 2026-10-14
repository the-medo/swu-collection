import { createFileRoute, redirect } from '@tanstack/react-router';
import SetGallery from '@/components/app/cards/CardHome/SetGallery.tsx';
import {
  resolveSetGallerySelection,
  setGallerySearchSchema,
} from '@/components/app/cards/CardHome/cardHomeLib.ts';

export const Route = createFileRoute('/cards/sets/$setCode')({
  validateSearch: setGallerySearchSchema,
  beforeLoad: ({ params, search }) => {
    const selection = resolveSetGallerySelection(search.csCategory, search.csVariant);
    if (search.csCategory !== selection.category || search.csVariant !== selection.variant) {
      throw redirect({
        to: '/cards/sets/$setCode',
        params,
        search: { ...search, csCategory: selection.category, csVariant: selection.variant },
        replace: true,
      });
    }
  },
  component: SetGalleryRoute,
});
function SetGalleryRoute() {
  const { setCode } = Route.useParams();
  const { csCategory, csVariant } = Route.useSearch();
  const selection = resolveSetGallerySelection(csCategory, csVariant);
  return <SetGallery setCode={setCode} category={selection.category} variant={selection.variant} />;
}
