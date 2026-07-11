import { z } from "zod";

const brazilianStates = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"] as const;

export const onboardingSchema = z.object({
  accountName: z.string().trim().min(2, "Informe o nome da conta.").max(120),
  propertyName: z.string().trim().min(2, "Informe o nome da propriedade.").max(120),
  city: z.string().trim().min(2, "Informe o município.").max(120),
  state: z.enum(brazilianStates, { message: "Selecione uma UF válida." }),
  totalAreaHa: z.preprocess(
    (value) => value === "" || value == null ? undefined : Number(String(value).replace(",", ".")),
    z.number().positive("A área deve ser maior que zero.").max(10_000_000).optional()
  )
});

export const invitationSchema = z.object({
  accountId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  role: z.enum(["manager", "technician"]),
  propertyIds: z.array(z.string().uuid()).default([])
}).superRefine((value, context) => {
  if (value.role === "technician" && value.propertyIds.length === 0) {
    context.addIssue({ code: "custom", path: ["propertyIds"], message: "Selecione ao menos uma propriedade para o técnico." });
  }
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome.").max(120),
  timezone: z.enum(["America/Sao_Paulo", "America/Manaus", "America/Cuiaba", "America/Rio_Branco", "America/Noronha"], {
    message: "Selecione um fuso horário válido."
  }),
  internalNotificationsEnabled: z.boolean()
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type InvitationInput = z.infer<typeof invitationSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
