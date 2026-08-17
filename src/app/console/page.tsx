import { countryView } from '@/lib/data';
import { ConsoleShell } from '@/components/ConsoleShell';

export const metadata = {
  title: 'District console, MedMesh',
};

/* Next 16 hands searchParams in asynchronously. */
export default async function ConsolePage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const { country: requested } = await searchParams;
  const view = countryView((requested ?? 'IN').toUpperCase());

  return (
    <ConsoleShell
      country={view.country}
      countries={view.countries}
      facilities={view.facilities}
      worst={Object.fromEntries(view.worst)}
      proposals={view.proposals}
      drugs={view.drugs}
      stats={view.stats}
      asOf={view.asOf}
    />
  );
}
