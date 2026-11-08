import Link from "next/link";
import { ADMIN_PAGE_SIZE } from "@/lib/admin/rules";
import { mutedClass, secondaryButtonClass } from "./styles";

export default function Pager({
  path,
  searchParams,
  page,
  total,
}: {
  path: string;
  searchParams: Record<string, string | undefined>;
  page: number;
  total: number;
}) {
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") params.set(key, value);
    }
    params.set("page", String(target));
    return `${path}?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <p className={mutedClass}>
        {total} résultat{total > 1 ? "s" : ""} · page {page} / {pageCount}
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={hrefFor(page - 1)} className={secondaryButtonClass}>
            Précédent
          </Link>
        )}
        {page < pageCount && (
          <Link href={hrefFor(page + 1)} className={secondaryButtonClass}>
            Suivant
          </Link>
        )}
      </div>
    </div>
  );
}
