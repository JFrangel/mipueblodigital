import { ChevronRight } from "lucide-react";
import { type Case, shortDate } from "@/data/catalog";
import { deliveryOf, deliveryLabel } from "@/domain/delivery";
import { Badge, CategoryIcon, Empty } from "./ui";
export function CaseList({
  items,
  onSelect,
}: {
  items: Case[];
  onSelect: (item: Case) => void;
}) {
  if (!items.length) return <Empty />;
  return (
    <div className="case-list">
      {items.map((item) => {
        const delivery = deliveryOf(item);
        return (
          <button
            className="case-row"
            key={item.id}
            onClick={() => onSelect(item)}
          >
            <span className={`case-art ${item.category}`}>
              <CategoryIcon category={item.category} size={25} />
            </span>
            <span className="case-copy">
              <strong>{item.title}</strong>
              <small>
                {item.vereda} <span>·</span> {shortDate(item.date)}
              </small>
            </span>
            {/* El estado de la gestión o el del envío, nunca los dos: mientras
                el reporte no llegue al Consejo, no hay gestión que mostrar. */}
            {delivery === "enviado" ? (
              <Badge status={item.status} />
            ) : (
              <span className={`tag delivery-${delivery}`}>
                {deliveryLabel[delivery]}
              </span>
            )}
            <ChevronRight size={16} className="muted" />
          </button>
        );
      })}
    </div>
  );
}
