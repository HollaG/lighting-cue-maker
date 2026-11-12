/**
 * Builds an id → effect map from the modules found by `import.meta.glob(..., { eager: true })`.
 * Each module must `export default` one effect. Shared by every kind of effect (pattern now, movement later).
 *
 * Throws at load time if a module has no default export or two effects share an id, so mistakes show up
 * straight away (and in the registry tests) instead of as a silently missing effect.
 */
export const createEffectRegistry = <T extends { id: string }>(
  modules: Record<string, { default?: T }>,
): ReadonlyMap<string, T> => {
  const registry = new Map<string, T>();
  for (const [path, module] of Object.entries(modules)) {
    const effect = module.default;
    if (!effect) throw new Error(`Effect file ${path} has no default export`);
    if (registry.has(effect.id)) throw new Error(`Duplicate effect id "${effect.id}" in ${path}`);
    registry.set(effect.id, effect);
  }
  return registry;
};
