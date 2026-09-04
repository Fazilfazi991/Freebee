import { json, type LinksFunction, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { PlatformLayout, platformLinks } from '~/components/platform/PlatformLayout';
import { ToolShell } from '~/components/platform/ToolShell';
import { platformConfig } from '~/config/platform';
import { toolBySlug } from '~/lib/tools/registry';

export const links: LinksFunction = platformLinks;
export async function loader({ params }: LoaderFunctionArgs) {
  const tool = toolBySlug(`calculator/${params.slug ?? ''}`);

  if (!tool || tool.category !== 'calculator') {
    throw new Response('Not found', { status: 404 });
  }

  return json({ tool });
}
export const meta: MetaFunction<typeof loader> = ({ data }) =>
  data
    ? [
        { title: `${data.tool.name} | ${platformConfig.name}` },
        { name: 'description', content: data.tool.description },
        { tagName: 'link', rel: 'canonical', href: `${platformConfig.url}/${data.tool.slug}` },
        { property: 'og:title', content: `${data.tool.name} | ${platformConfig.name}` },
        { property: 'og:description', content: data.tool.description },
      ]
    : [{ title: `Not found | ${platformConfig.name}` }];
export default function CalculatorRoute() {
  const { tool } = useLoaderData<typeof loader>();
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: tool.name,
      description: tool.description,
      url: `${platformConfig.url}/${tool.slug}`,
      applicationCategory: 'CalculatorApplication',
      operatingSystem: 'Any modern web browser',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Tools', item: `${platformConfig.url}/tools` },
        { '@type': 'ListItem', position: 2, name: 'Calculators', item: `${platformConfig.url}/calculator` },
        { '@type': 'ListItem', position: 3, name: tool.name, item: `${platformConfig.url}/${tool.slug}` },
      ],
    },
  ];

  return (
    <PlatformLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }} />
      <ToolShell tool={tool} />
    </PlatformLayout>
  );
}
