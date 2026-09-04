import { json, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { PhoneChrome, phoneLinks } from '~/components/phones/PhoneChrome';
import { PhoneDirectory } from '~/components/phones/PhoneDirectory';
import { platformConfig } from '~/config/platform';
import { phoneRepository } from '~/lib/phones/repository';
import type { PhoneBrand } from '~/lib/phones/schema';

const labels = { apple: 'Apple Phones', samsung: 'Samsung Phones', google: 'Google Pixel Phones' } as const;
export const links = phoneLinks;
export function loader({ params }: LoaderFunctionArgs) {
  if (!(params.brand && params.brand in labels)) {
    throw new Response('Not found', { status: 404 });
  }

  const brand = params.brand as PhoneBrand;

  return json({ brand, label: labels[brand], phones: phoneRepository.getPhonesByBrand(brand) });
}
export const meta: MetaFunction<typeof loader> = ({ data }) =>
  data
    ? [
        { title: `${data.label} | ${platformConfig.name}` },
        { name: 'description', content: `Official-source specifications for current ${data.label}.` },
        { tagName: 'link', rel: 'canonical', href: `${platformConfig.url}/phones/${data.brand}` },
      ]
    : [{ title: 'Phone brand not found' }];
export default function Brand() {
  const d = useLoaderData<typeof loader>();
  return (
    <PhoneChrome>
      <main className="ph-main ph-brand-page">
        <div className="ph-section-head">
          <h1>{d.label}</h1>
          <p>Current models with manufacturer-source provenance.</p>
        </div>
        <PhoneDirectory phones={d.phones} lockedBrand={d.brand} />
      </main>
    </PhoneChrome>
  );
}
