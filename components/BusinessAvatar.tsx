/**
 * BusinessAvatar — a business's logo where it has one, and the clean
 * initials block where it doesn't (owner order 2026-11-20: the logo
 * is OPTIONAL — blank must look intentional, never a broken image).
 * Shared by the nearby list and the shop profile page so the two
 * surfaces always agree.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = (words[0]?.[0] ?? "") + (words[1]?.[0] ?? "");
  return letters.toUpperCase() || "M";
}

export function BusinessAvatar({
  name,
  logoUrl,
  sizeClass = "h-14 w-14 text-lg rounded-2xl",
}: {
  name: string;
  logoUrl: string | null;
  sizeClass?: string;
}) {
  if (logoUrl) {
    return (
      // Logos are owner-uploaded files served from our own API; a
      // plain img keeps the surface free of image-pipeline config.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className={`${sizeClass} shrink-0 object-cover`}
        loading="lazy"
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${sizeClass} flex shrink-0 items-center justify-center bg-accent-soft font-display font-semibold text-accent`}
    >
      {initialsOf(name)}
    </span>
  );
}
