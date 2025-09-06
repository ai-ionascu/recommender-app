export default function ReadonlyShippingCard({ shipping, onEdit }) {
  if (!shipping) return null;
  const rows = [
    shipping.full_name ?? shipping.name,
    shipping.line1 ?? shipping.address1,
    shipping.line2 ?? shipping.address2,
    [shipping.zip, shipping.city].filter(Boolean).join(" "),
    shipping.country,
    shipping.phone ? `Phone: ${shipping.phone}` : null,
  ].filter(Boolean);

  return (
    <div className="bg-gray-50 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">Shipping address</div>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-sm underline"
            title="Edit shipping address"
          >
            Edit shipping address
          </button>
        ) : null}
      </div>
      <div className="text-sm mt-1 whitespace-pre-line leading-6">
        {rows.join("\n")}
      </div>
    </div>
  );
}
