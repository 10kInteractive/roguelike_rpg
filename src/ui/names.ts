/** `mob.ember_imp` as `Ember Imp`, and `hero.strider` as `Strider`. */
export function nameFromId(id: string): string {
  const rest = id.includes(".") ? id.slice(id.indexOf(".") + 1) : id;
  return rest
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
