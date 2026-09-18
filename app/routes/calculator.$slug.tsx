import { json, type LinksFunction, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { PlatformLayout, platformLinks } from '~/components/platform/PlatformLayout';
import { ToolShell } from '~/components/platform/ToolShell';
import { platformConfig } from '~/config/platform';
import { toolBySlug } from '~/lib/tools/registry';
import { absoluteUrl, getToolSeo } from '~/lib/seo';

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
        { title: getToolSeo(data.tool).title },
        { name: 'description', content: getToolSeo(data.tool).description },
        ...(absoluteUrl(`/${data.tool.slug}`)
          ? [{ tagName: 'link', rel: 'canonical', href: absoluteUrl(`/${data.tool.slug}`) }]
          : []),
        { property: 'og:site_name', content: platformConfig.name },
        { property: 'og:title', content: getToolSeo(data.tool).title },
        { property: 'og:description', content: getToolSeo(data.tool).description },
        { name: 'robots', content: 'index, follow' },
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
      ...(absoluteUrl(`/${tool.slug}`) ? { url: absoluteUrl(`/${tool.slug}`) } : {}),
      applicationCategory: 'CalculatorApplication',
      operatingSystem: 'Any modern web browser',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Tools', item: absoluteUrl('/tools') },
        { '@type': 'ListItem', position: 2, name: 'Calculators', item: absoluteUrl('/calculator') },
        { '@type': 'ListItem', position: 3, name: tool.name, item: absoluteUrl(`/${tool.slug}`) },
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
