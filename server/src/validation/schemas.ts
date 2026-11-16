import { z } from 'zod';

export const categorieSchema = z.enum(['dechets', 'eau_stagnante', 'eclairage', 'voirie']);
export const statutSchema = z.enum(['recu', 'a_verifier', 'transmis', 'en_cours', 'resolu']);
export const graviteSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const contactSchema = z
  .object({
    type: z.enum(['whatsapp', 'telephone']),
    valeur: z.string().trim().min(6).max(40),
  })
  .nullable()
  .optional();

export const createReportSchema = z.object({
  id: z.string().uuid().optional(),
  code: z
    .string()
    .trim()
    .regex(/^NF-[A-Z0-9]{5}$/i)
    .optional(),
  categorie: categorieSchema,
  description: z.string().max(1000).optional().default(''),
  secteur: z.string().trim().min(2).max(80),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  gravite: z.number().int().min(1).max(3).optional().default(2),
  photo: z.string().max(2_500_000).nullable().optional(),
  audio: z.string().max(3_500_000).nullable().optional(),
  contact: contactSchema,
  enAttenteEnvoi: z.boolean().optional().default(false),
  dateCreation: z.string().datetime().optional(),
  langueIndice: z.enum(['fr', 'wo', 'inconnue']).optional().default('fr'),
});

export const confirmReportSchema = z.object({
  deviceId: z.string().trim().min(4).max(160).optional(),
});

export const resolutionFeedbackSchema = z
  .object({
    regle: z.boolean().optional(),
    verdict: z.enum(['regle', 'toujours_la']).optional(),
    commentaire: z.string().trim().max(300).optional(),
  })
  .refine((d) => typeof d.regle === 'boolean' || typeof d.verdict === 'string', {
    message: 'Indiquez si le problème est « regle » ou « toujours_la ».',
  });

export const loginSchema = z.object({
  email: z.string().trim().min(3).max(160),
  password: z.string().min(4).max(160),
});

export const adminStatusPatchSchema = z.object({
  statut: statutSchema.optional(),
  note: z.string().trim().max(500).optional(),
  acteurCompetent: z.string().trim().max(160).nullable().optional(),
  verifieParRelais: z.boolean().optional(),
  photoApres: z.string().max(2_500_000).nullable().optional(),
  confirmationHabitant: z.boolean().nullable().optional(),
  transcriptionSuggeree: z.string().max(1500).optional(),
  categorie: categorieSchema.optional(),
  validerSuggestion: z.boolean().optional(),
});

export const adminDuplicatePatchSchema = z.object({
  estDoublon: z.boolean(),
  doublonDeId: z.string().uuid().nullable().optional(),
  note: z.string().trim().max(400).optional(),
});
