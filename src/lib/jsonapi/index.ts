import { z } from "zod";
import { ApiError } from "../api/errors";

const identifierSchema = z.object({ type: z.string(), id: z.string() });
const linksSchema = z.record(z.string(), z.union([
  z.string(), z.null(), z.object({ href: z.string(), meta: z.record(z.string(), z.unknown()).optional() }).passthrough(),
]));
const metaSchema = z.record(z.string(), z.unknown());
const relationshipSchema = z.object({
  data: z.union([identifierSchema, z.array(identifierSchema), z.null()]).optional(),
  links: linksSchema.optional(), meta: metaSchema.optional(),
});
export const resourceSchema = identifierSchema.extend({
  attributes: z.record(z.string(), z.unknown()).optional(),
  relationships: z.record(z.string(), relationshipSchema).optional(),
  links: linksSchema.optional(), meta: metaSchema.optional(),
});
const documentSchema = z.object({
  data: z.union([resourceSchema, z.array(resourceSchema), z.null()]),
  included: z.array(resourceSchema).optional(),
  links: linksSchema.optional(), meta: metaSchema.optional(), jsonapi: metaSchema.optional(),
});
export type ResourceIdentifier = z.infer<typeof identifierSchema>;
export type JsonApiResource = z.infer<typeof resourceSchema>;
export type JsonApiDocument = z.infer<typeof documentSchema>;

export function parseJsonApi(input: unknown): JsonApiDocument {
  const result = documentSchema.safeParse(input);
  if (!result.success) throw new ApiError("Invalid JSON:API document.", "contract");
  return result.data;
}
export function resourceKey(resource: ResourceIdentifier): string {
  return JSON.stringify([resource.type, resource.id]);
}
export function indexIncluded(document: JsonApiDocument): ReadonlyMap<string, JsonApiResource> {
  return new Map((document.included ?? []).map((item) => [resourceKey(item), item]));
}
/** Absent linkage => undefined; empty to-one => null; unresolved identifier stays undefined. */
export function resolveRelationship(
  resource: JsonApiResource, name: string, included: ReadonlyMap<string, JsonApiResource>,
): JsonApiResource | null | undefined | (JsonApiResource | undefined)[] {
  const linkage = resource.relationships?.[name]?.data;
  if (linkage === null || linkage === undefined) return linkage;
  if (Array.isArray(linkage)) return linkage.map((item) => included.get(resourceKey(item)));
  return included.get(resourceKey(linkage));
}
