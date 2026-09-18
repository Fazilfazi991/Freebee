import { json, type LinksFunction, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { CategoryPage } from '~/components/platform/CategoryPage';
import { PlatformLayout, platformLinks } from '~/components/platform/PlatformLayout';
import { ToolShell } from '~/components/platform/ToolShell';
import { platformConfig } from '~/config/platform';
import { categoryBySlug, toolBySlug } from '~/lib/tools/registry';
import { absoluteUrl, breadcrumbSchema, getToolSeo } from '~/lib/seo';
export const links: LinksFunction = platformLinks;
export async function loader({ params }: LoaderFunctionArgs) {
  const slug = params.slug ?? '';
  const tool = toolBySlug(slug);
  const category = categoryBySlug(slug);

  if (!tool && !category) {
    throw new Response('Not found', { status: 404 });
  }

  return json({ tool, category });
}
export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const subject = data?.tool ?? data?.category;

  if (!subject) {
    return [{ title: `Not found | ${platformConfig.name}` }];
  }

  const seo = data?.tool ? getToolSeo(data.tool) : undefined;
  const title = seo?.title ?? `${subject.name} | ${platformConfig.name}`;
  const description = seo?.description ?? subject.description;

  return [
    { title },
    { name: 'description', content: description },
    ...(absoluteUrl(seo?.canonicalPath ?? `/${subject.id}`)
      ? [{ tagName: 'link', rel: 'canonical', href: absoluteUrl(seo?.canonicalPath ?? `/${subject.id}`) }]
      : []),
    { property: 'og:site_name', content: platformConfig.name },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { name: 'twitter:card', content: 'summary' },
    ...(data?.tool && !seo?.indexable ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
  ];
};
export default function SlugRoute() {
  const { tool, category } = useLoaderData<typeof loader>();
  const schema = tool
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: tool.name,
          description: tool.description,
          ...(absoluteUrl(`/${tool.slug}`) ? { url: absoluteUrl(`/${tool.slug}`) } : {}),
          applicationCategory: tool.category,
          operatingSystem: 'Any modern web browser',
        },
        breadcrumbSchema([
          { name: 'Tools', path: '/tools' },
          { name: tool.category, path: `/${tool.category}` },
          { name: tool.name, path: `/${tool.slug}` },
        ]),
      ]
    : undefined;

  return (
    <PlatformLayout>
      {schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />}
      {category && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema([{ name: 'Tools', path: '/tools' }, { name: category.name, path: `/${category.id}` }])),
          }}
        />
      )}
      {tool ? <ToolShell tool={tool} /> : category ? <CategoryPage category={category} /> : null}
    </PlatformLayout>
  );
}
