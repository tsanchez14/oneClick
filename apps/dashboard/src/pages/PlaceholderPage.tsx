interface Props {
  title: string;
}

export default function PlaceholderPage({ title }: Props) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-gray-200">
      <p className="text-lg font-semibold text-gray-400">{title}</p>
    </div>
  );
}
