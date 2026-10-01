/**
 * Esquemas de entrada del checkout (compartidos cliente/servidor).
 *
 * El cliente solo envía QUÉ quiere comprar (producto, variante, cantidad) y
 * sus datos de contacto/entrega. Precios, descuentos, envío y stock se
 * calculan siempre en servidor: por eso no aparecen aquí.
 */
import { z } from "astro/zod";
import { STORE_CONFIG } from "./store-config";

const trimmed = (min: number, max: number, message: string) =>
  z.string({ required_error: message, invalid_type_error: message }).trim().min(min, message).max(max, message);

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));

export const checkoutItemSchema = z.object({
  productId: z.string().min(1).max(64),
  sku: z.string().max(64).nullable(),
  color: z.string().max(60).nullable(),
  size: z.string().max(20).nullable(),
  quantity: z.number().int().min(1).max(STORE_CONFIG.maxQuantityPerLine),
});
export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;

export const itemsSchema = z
  .array(checkoutItemSchema)
  .min(1, "Tu carrito está vacío.")
  .max(50, "Demasiados productos en un mismo pedido.");

export const customerSchema = z.object({
  name: trimmed(2, 120, "Indica tu nombre y apellidos."),
  email: z.string().trim().toLowerCase().max(254).email("Introduce un email válido."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{9,20}$/, "Introduce un teléfono válido.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});
export type CustomerInput = z.infer<typeof customerSchema>;

const POSTAL_CODE: Record<string, RegExp> = {
  ES: /^(0[1-9]|[1-4]\d|5[0-2])\d{3}$/,
  PT: /^\d{4}-?\d{3}$/,
};

export const addressSchema = z
  .object({
    line1: trimmed(3, 120, "Indica la dirección."),
    line2: optionalText(120),
    city: trimmed(2, 80, "Indica la ciudad."),
    postalCode: trimmed(3, 10, "Indica el código postal."),
    province: trimmed(2, 80, "Indica la provincia."),
    country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Selecciona un país."),
  })
  .superRefine((a, ctx) => {
    const re = POSTAL_CODE[a.country];
    if (re && !re.test(a.postalCode)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["postalCode"], message: "El código postal no es válido." });
    }
  });
export type AddressInput = z.infer<typeof addressSchema>;

export const checkoutRequestSchema = z
  .object({
    idempotencyKey: z.string().regex(/^[A-Za-z0-9-]{16,64}$/),
    items: itemsSchema,
    customer: customerSchema,
    deliveryMethod: z.enum(["shipping", "pickup"], { errorMap: () => ({ message: "Elige un método de entrega." }) }),
    address: addressSchema.nullable().optional(),
    notes: optionalText(500),
    acceptTerms: z.boolean(),
  })
  // Reglas cruzadas en superRefine para que el formulario muestre todos los errores a la vez.
  .superRefine((body, ctx) => {
    if (body.acceptTerms !== true) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["acceptTerms"], message: "Debes aceptar las condiciones de venta." });
    }
    if (body.deliveryMethod === "shipping" && !body.address) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["address"], message: "Indica la dirección de envío." });
    }
  });
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const quoteRequestSchema = z.object({
  items: itemsSchema,
  deliveryMethod: z.enum(["shipping", "pickup"]).nullable().optional(),
});

export const orderAccessSchema = z.object({
  order: z.string().uuid(),
  token: z.string().regex(/^[a-f0-9]{64}$/),
});

/** Primer error por campo ("customer.email" → mensaje), para el formulario. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
