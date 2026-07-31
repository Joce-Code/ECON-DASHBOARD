import { z } from "zod";

// Zod schemas para Automated Data Quality (Silver Layer)

export const FocusDataSchema = z.object({
  Data: z.string(),
  DataReferencia: z.string().optional(),
  Reuniao: z.string().optional(),
  Mediana: z.number().min(-50).max(100), // Proteção contra anomalias (ex: juros/inflação > 100%)
  Indicador: z.string(),
  baseCalculo: z.number().optional()
});

export const SGSDataSchema = z.object({
  data: z.string(),
  valor: z.union([z.string(), z.number()]).transform(v => typeof v === 'string' ? parseFloat(v) : v)
});

export const FocusResponseSchema = z.object({
  value: z.array(FocusDataSchema)
});

export const SGSResponseSchema = z.array(SGSDataSchema);
