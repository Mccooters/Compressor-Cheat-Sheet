import { ServiceWorkerRegistration } from "@/components/calculators/ServiceWorkerRegistration";

export default function CalculatorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ServiceWorkerRegistration />
      {children}
    </>
  );
}
