export async function injectMetaTags(html: string, metaTags: Record<string, string>): Promise<string> {
  let modifiedHtml = html;

  // Remove existing meta tags with the same property names
  Object.keys(metaTags).forEach(property => {
    const metaTagRegex = new RegExp(`<meta\\s+property=["']${property}["']\\s+content=["'][^"']*["']\\s*/>`, 'g');
    modifiedHtml = modifiedHtml.replace(metaTagRegex, '');
  });

  // Create HTML for new meta tags
  const metaTagsHtml = Object.entries(metaTags)
    .map(([property, content]) => {
      return `<meta property="${property}" content="${content}" />`;
    })
    .join('\n    ');

  // Update the page title if og:title is provided
  if (metaTags['og:title']) {
    const titleRegex = /<title>[^<]*<\/title>/;
    modifiedHtml = modifiedHtml.replace(titleRegex, `<title>${metaTags['og:title']}</title>`);
  }

  // Insert meta tags before the closing </head> tag
  return modifiedHtml.replace('</head>', `    ${metaTagsHtml}\n  </head>`);
}
