import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export type PulseFigure = {
  Icon: React.ComponentType<{ size?: number }>;
  value: string;
  label: string;
};

/**
 * Tarjeta de cifras con el paisaje asomando por detrás.
 *
 * El territorio entra como fondo enmascarado en lugar de como recuadro: la
 * fotografía se disuelve hacia el texto, así que nunca compite con los números.
 */
export function TerritoryPulse({
  title,
  lead,
  href,
  action,
  figures,
  scene = "/brand/territorio.webp",
}: {
  title: string;
  lead: string;
  href: string;
  action: string;
  figures: PulseFigure[];
  scene?: string;
}) {
  return (
    <section className="panel community-pulse">
      <div className="pulse-head">
        <div>
          <h2>{title}</h2>
          <p>{lead}</p>
        </div>
        <Link href={href} className="text-link">
          {action} <ArrowRight size={15} />
        </Link>
      </div>
      <dl className="pulse-figures">
        {figures.map(({ Icon, value, label }) => (
          <div key={label}>
            <Icon size={17} />
            <dd>{value}</dd>
            <dt>{label}</dt>
          </div>
        ))}
      </dl>
      <Image
        src={scene}
        alt=""
        aria-hidden="true"
        fill
        sizes="(max-width: 800px) 60vw, 380px"
        className="pulse-scene"
      />
    </section>
  );
}
