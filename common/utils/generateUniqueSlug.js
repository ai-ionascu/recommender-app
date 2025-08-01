import slugify from 'slugify';

export async function generateUniqueSlug(name, existsFn) {
  const baseSlug = slugify(name, { lower: true, strict: true, trim: true });
  let slug = baseSlug;
  let suffix = 1;

  while (await existsFn(slug)) {
    slug = `${baseSlug}-${suffix++}`;
  }
  return slug;
}