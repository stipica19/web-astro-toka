import { useRef, useState } from "react";
import { useFieldArray, useForm, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { actions } from "astro:actions";
import {
  categoryInputSchema,
  type CategoryFormInput,
  type CategoryInput,
} from "../../lib/schemas";
import { slugify } from "../../lib/slugify";
import { cloudinaryUrlFor } from "../../lib/cloudinary";
import { useCloudinaryUpload } from "./useCloudinaryUpload";

type Props = {
  /** Bez id-a je forma za novu kategoriju. */
  categoryId?: string;
  defaultValues: CategoryInput;
  /**
   * Stiže sa servera jer klijentski bundle nema pristup .env-u — vidi
   * komentar uz `getCloudName()` u lib/cloudinary.ts.
   */
  cloudName: string;
};

const inputClass =
  "mt-2 w-full rounded-lg border border-line bg-surface px-4 py-3 outline-none focus:border-gold-dark";

function GalleryItem({
  id,
  index,
  publicId,
  cloudName,
  register,
  errorMessage,
  onRemove,
}: {
  id: string;
  index: number;
  publicId: string;
  cloudName: string;
  register: UseFormRegister<CategoryFormInput>;
  errorMessage?: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-lg border border-line bg-surface p-3 ${isDragging ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="cursor-grab touch-none rounded-md p-1.5 text-ink-soft hover:bg-cream active:cursor-grabbing"
          aria-label={`Premjesti sliku ${index + 1}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-5" aria-hidden="true" />
        </button>

        <img
          src={cloudinaryUrlFor(cloudName, publicId, { width: 160, aspectRatio: "1:1" })}
          alt=""
          width={80}
          height={80}
          className="size-20 shrink-0 rounded-md object-cover"
        />

        <div className="min-w-0 flex-1">
          <label className="block text-ink-soft" htmlFor={`gallery-alt-${index}`}>
            Opis slike (za pretraživače i čitače ekrana) — nije obavezno
          </label>
          <input
            id={`gallery-alt-${index}`}
            {...register(`gallery.${index}.alt`)}
            className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-gold-dark"
          />
          {errorMessage && <p className="mt-1 text-gold-dark">{errorMessage}</p>}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-2 text-ink-soft hover:text-gold-dark"
          aria-label={`Ukloni sliku ${index + 1}`}
        >
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

export default function CategoryForm({ categoryId, defaultValues, cloudName }: Props) {
  const [formError, setFormError] = useState<string | null>(null);
  // Kad admin ručno dira slug, prestajemo ga generisati iz naziva.
  const slugTouched = useRef(Boolean(categoryId));

  const { upload, uploading, error: uploadError } = useCloudinaryUpload();

  // Tri generika jer shema ima `.transform()`: polja drže `CategoryFormInput`
  // (description smije biti i undefined), a `handleSubmit` dobije već
  // transformisani `CategoryInput`. Sa jednim generikom se tipovi resolvera i
  // forme razilaze, pa TS prijavi grešku na `resolver`.
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormInput, unknown, CategoryInput>({
    resolver: zodResolver(categoryInputSchema),
    defaultValues,
  });

  const { fields, append, remove, move } = useFieldArray({ control, name: "gallery" });

  const headerImage = watch("headerImage");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleHeaderUpload(file: File) {
    const publicId = await upload(file, "header");
    if (publicId) setValue("headerImage", publicId, { shouldValidate: true });
  }

  async function handleGalleryUpload(files: FileList) {
    for (const file of Array.from(files)) {
      const publicId = await upload(file, "gallery");
      // Alt nije obavezan; ako ostane prazan, javna stranica koristi naziv kategorije.
      if (publicId) append({ url: publicId, alt: "" });
    }
  }

  function handleGalleryDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = fields.findIndex((field) => field.id === active.id);
    const to = fields.findIndex((field) => field.id === over.id);
    if (from !== -1 && to !== -1) move(from, to);
  }

  async function onSubmit(values: CategoryInput) {
    setFormError(null);

    const result = categoryId
      ? await actions.categories.update({ ...values, id: categoryId })
      : await actions.categories.create(values);

    if (result.error) {
      setFormError(result.error.message ?? "Snimanje nije uspjelo.");
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block font-medium">
            Naziv kategorije
          </label>
          <input
            id="name"
            {...register("name", {
              onChange: (event) => {
                if (!slugTouched.current) {
                  setValue("slug", slugify(event.target.value), { shouldValidate: true });
                }
              },
            })}
            className={inputClass}
          />
          {errors.name && <p className="mt-1.5 text-gold-dark">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="slug" className="block font-medium">
            Slug (dio adrese)
          </label>
          <input
            id="slug"
            {...register("slug", { onChange: () => (slugTouched.current = true) })}
            className={inputClass}
          />
          <p className="mt-1.5 text-ink-soft">/kategorija/{watch("slug") || "..."}</p>
          {errors.slug && <p className="mt-1.5 text-gold-dark">{errors.slug.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block font-medium">
          Opis (nije obavezan)
        </label>
        <textarea id="description" rows={4} {...register("description")} className={inputClass} />
        {errors.description && <p className="mt-1.5 text-gold-dark">{errors.description.message}</p>}
      </div>

      <div>
        <span className="block font-medium">Header slika</span>
        <p className="text-ink-soft">Prikazuje se na kartici kategorije i na vrhu njene stranice.</p>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          {headerImage ? (
            <img
              src={cloudinaryUrlFor(cloudName, headerImage, { width: 320, aspectRatio: "4:3" })}
              alt=""
              width={160}
              height={120}
              className="h-30 w-40 rounded-lg border border-line object-cover"
            />
          ) : (
            <div className="flex h-30 w-40 items-center justify-center rounded-lg border border-dashed border-line text-ink-soft">
              Nema slike
            </div>
          )}

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-5 py-3 hover:bg-cream">
            <ImagePlus className="size-5" aria-hidden="true" />
            {headerImage ? "Zamijeni sliku" : "Dodaj sliku"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleHeaderUpload(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>

        <input type="hidden" {...register("headerImage")} />
        {errors.headerImage && <p className="mt-1.5 text-gold-dark">{errors.headerImage.message}</p>}
      </div>

      <div>
        <span className="block font-medium">Galerija</span>
        <p className="text-ink-soft">Prevuci slike da promijeniš redoslijed prikaza.</p>

        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-5 py-3 hover:bg-cream">
          <ImagePlus className="size-5" aria-hidden="true" />
          Dodaj slike
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(event) => {
              const files = event.target.files;
              if (files?.length) void handleGalleryUpload(files);
              event.target.value = "";
            }}
          />
        </label>

        {fields.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGalleryDragEnd}>
            <SortableContext items={fields.map((field) => field.id)} strategy={rectSortingStrategy}>
              <ul className="mt-4 space-y-3">
                {fields.map((field, index) => (
                  <GalleryItem
                    key={field.id}
                    id={field.id}
                    index={index}
                    publicId={field.url}
                    cloudName={cloudName}
                    register={register}
                    errorMessage={errors.gallery?.[index]?.alt?.message}
                    onRemove={() => remove(index)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <label className="flex items-center gap-3">
        <input type="checkbox" {...register("isPublished")} className="size-5 accent-[#c8a044]" />
        <span>Objavljeno (vidljivo posjetiocima)</span>
      </label>

      {(formError || uploadError) && (
        <p role="alert" className="rounded-lg border border-gold-dark/40 bg-gold/10 px-4 py-3">
          {formError ?? uploadError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting || uploading}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 font-medium text-ink transition-colors hover:bg-gold-dark disabled:opacity-60"
        >
          {isSubmitting || uploading ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-5" aria-hidden="true" />
          )}
          {uploading ? "Upload u toku..." : isSubmitting ? "Snimanje..." : "Sačuvaj"}
        </button>

        <a href="/admin" className="rounded-full border border-line px-6 py-3 hover:bg-cream">
          Odustani
        </a>
      </div>
    </form>
  );
}
