import { json, type LinksFunction, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/cloudflare';
import { useLoaderData } from '@remix-run/react';
import { CategoryPage } from '~/components/platform/CategoryPage';
import { PlatformLayout, platformLinks } from '~/components/platform/PlatformLayout';
import { ToolShell } from '~/components/platform/ToolShell';
import { platformConfig } from '~/config/platform';
import { categoryBySlug, toolBySlug } from '~/lib/tools/registry';
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

  const title = `${subject.name} | ${platformConfig.name}`;
  const description = subject.description;
  const canonical = `${platformConfig.url}/${subject.id}`;

  return [
    { title },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: canonical },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { name: 'twitter:card', content: 'summary' },
    ...(data?.tool?.engine === 'planned' ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
  ];
};
export default function SlugRoute() {
  const { tool, category } = useLoaderData<typeof loader>();
  const schema = tool
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: tool.name,
        description: tool.description,
        url: `${platformConfig.url}/${tool.slug}`,
        applicationCategory: tool.category,
        operatingSystem: 'Any modern web browser',
      }
    : undefined;

  return (
    <PlatformLayout>
      {schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />}
      {tool ? <ToolShell tool={tool} /> : category ? <CategoryPage category={category} /> : null}
    </PlatformLayout>
  );
}
