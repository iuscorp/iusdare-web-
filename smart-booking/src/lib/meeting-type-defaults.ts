/**
 * Definiciones iniciales de los tipos de reunión (usadas por el seed).
 * Después del seed, la fuente de verdad es la tabla `meeting_types` (editable desde el panel).
 */
import type { FormField } from "./forms/schema";

export const LAW_BRANCHES = [
  "Derecho corporativo",
  "Derecho civil",
  "Derecho penal",
  "Derecho administrativo",
  "Derecho laboral",
  "Derecho tributario",
  "Derecho constitucional",
  "Derecho procesal",
  "Derecho comercial",
  "Derecho digital y nuevas tecnologías",
  "Propiedad intelectual",
  "Compliance",
  "Derecho internacional",
  "Otras",
];

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface MeetingTypeSeed {
  slug: string;
  name: string;
  eventTitle: string;
  description: string;
  durationMinutes: number;
  slotIntervalMinutes: number;
  requiresPayment: boolean;
  accentColor: string;
  sortOrder: number;
  formFields: FormField[];
}

export const DEFAULT_MEETING_TYPES: MeetingTypeSeed[] = [
  {
    slug: "vocare-iuris",
    name: "Entrevista – Vocare Iuris",
    eventTitle: "Entrevista Vocare Iuris",
    description:
      "Agenda una entrevista para conversar sobre tu perfil, intereses y posible incorporación a nuestro equipo de Vocare Iuris.",
    durationMinutes: 30,
    slotIntervalMinutes: 30,
    requiresPayment: false,
    accentColor: "#621410",
    sortOrder: 1,
    formFields: [
      {
        key: "lawBranches",
        label: "Ramas del Derecho de interés",
        type: "multiselect",
        required: true,
        helpText: "Puedes seleccionar varias opciones.",
        options: LAW_BRANCHES.map((label) => ({ value: slugify(label), label })),
        allowCustom: true,
        customLabel: "Otra rama (especifica)",
        minSelected: 1,
      },
    ],
  },
  {
    slug: "cafecito-virtual",
    name: "Cafecito virtual | Reunión de sinergias",
    eventTitle: "Cafecito virtual",
    description:
      "Un espacio para conocernos, conversar sobre nuestros proyectos, identificar puntos en común y explorar oportunidades de colaboración y sinergias profesionales.",
    durationMinutes: 30,
    slotIntervalMinutes: 30,
    requiresPayment: false,
    accentColor: "#102438",
    sortOrder: 2,
    formFields: [
      {
        key: "topic",
        label: "Resumen del tema que deseas conversar o intención de la reunión",
        type: "textarea",
        required: true,
        minLength: 10,
        maxLength: 2000,
        placeholder:
          "Cuéntame brevemente sobre tu proyecto, organización o iniciativa y qué temas te gustaría que conversemos durante nuestra reunión.",
      },
    ],
  },
  {
    slug: "asesoria",
    name: "Asesoría profesional",
    eventTitle: "Asesoría profesional",
    description:
      "Agenda una sesión de asesoría profesional para conversar sobre tus necesidades, resolver consultas y recibir orientación especializada.",
    durationMinutes: 45,
    slotIntervalMinutes: 30,
    requiresPayment: true,
    accentColor: "#4A6078",
    sortOrder: 3,
    formFields: [
      {
        key: "topic",
        label: "Resumen del tema, consulta o necesidad que deseas abordar",
        type: "textarea",
        required: true,
        minLength: 10,
        maxLength: 3000,
        placeholder:
          "Cuéntame brevemente cuál es tu situación, qué necesitas resolver y qué resultados esperas obtener de esta sesión.",
      },
    ],
  },
];

/** Disponibilidad semanal inicial (minutos desde medianoche, America/Lima). */
export const DEFAULT_WEEKLY_RULES = [
  ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, startMinute: 9 * 60, endMinute: 21 * 60 })),
  { weekday: 6, startMinute: 11 * 60, endMinute: 19 * 60 },
  { weekday: 7, startMinute: 11 * 60, endMinute: 19 * 60 },
];
