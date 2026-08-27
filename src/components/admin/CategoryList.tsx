import { useMemo, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, EyeOff } from "lucide-react";
import { actions } from "astro:actions";

type Category = {
  id: string;
  name: string;
  slug: string;
  headerImage: string;
  isPublished: boolean;
  order: number;
  _count: { gallery: number };
};

function SortableRow({
  category,
  onDelete,
  deleting,
}: {
  category: Category;
  onDelete: (category: Category) => void;
  deleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-4 rounded-lg border border-line bg-surface p-4 ${
        isDragging ? "opacity-60 shadow-lg" : ""
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded-md p-2 text-ink-soft hover:bg-cream active:cursor-grabbing"
        aria-label={`Premjesti kategoriju ${category.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{category.name}</p>
        <p className="truncate text-ink-soft">
          /{category.slug} · {category._count.gallery} slika u galeriji
        </p>
      </div>

      {!category.isPublished && (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cream px-3 py-1 text-ink-soft">
          <EyeOff className="size-4" aria-hidden="true" />
          Skriveno
        </span>
      )}

      <a
        href={`/admin/kategorije/${category.id}`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-4 py-2 hover:bg-cream"
      >
        <Pencil className="size-4" aria-hidden="true" />
        Uredi
      </a>

      <button
        type="button"
        onClick={() => onDelete(category)}
        disabled={deleting}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-4 py-2 text-ink-soft hover:border-gold-dark hover:text-gold-dark disabled:opacity-50"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Obriši
      </button>
    </li>
  );
}

function List({ initialData }: { initialData: Category[] }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await actions.categories.list({});
      if (error) throw new Error(error.message);
      return data as Category[];
    },
    initialData,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reorder = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await actions.categories.reorder({ ids });
      if (error) throw new Error(error.message);
    },
    onError: () => {
      setError("Redoslijed nije sačuvan. Osvježi stranicu i pokušaj ponovo.");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await actions.categories.remove({ id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
    onError: () => setError("Brisanje nije uspjelo."),
  });

  const ids = useMemo(() => categories.map((category) => category.id), [categories]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    const reordered = arrayMove(categories, oldIndex, newIndex);

    // Optimistično: lista se pomjeri odmah, a snimanje ide u pozadini.
    // Ako snimanje padne, onError vraća stanje sa servera.
    setError(null);
    queryClient.setQueryData(["categories"], reordered);
    reorder.mutate(reordered.map((category) => category.id));
  }

  function handleDelete(category: Category) {
    // Brisanje je nepovratno (galerija ide kaskadno) — tražimo potvrdu.
    const confirmed = window.confirm(
      `Obrisati kategoriju "${category.name}"? Slike u galeriji se brišu iz baze, ali ostaju na Cloudinaryju.`,
    );
    if (confirmed) {
      setError(null);
      remove.mutate(category.id);
    }
  }

  if (categories.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line p-10 text-center text-ink-soft">
        Još nema kategorija. Dodaj prvu.
      </p>
    );
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-gold-dark/40 bg-gold/10 px-4 py-3">
          {error}
        </p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="space-y-3">
            {categories.map((category) => (
              <SortableRow
                key={category.id}
                category={category}
                onDelete={handleDelete}
                deleting={remove.isPending}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <p className="mt-4 text-ink-soft">
        Redoslijed se snima automatski čim pustiš kategoriju.
      </p>
    </div>
  );
}

export default function CategoryList({ initialData }: { initialData: Category[] }) {
  // QueryClient se pravi jednom po islandu — bez useState bi se resetovao pri svakom renderu.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <List initialData={initialData} />
    </QueryClientProvider>
  );
}
