import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClass } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="404"
        title="Page not found"
        description="That page doesn't exist or may have been moved. Check the address, or head back to the home page to find what you need."
      />
      <Link href="/" className={buttonClass("primary")}>
        Back to home
      </Link>
    </div>
  );
}
