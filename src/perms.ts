/** owner of a plugin or a moderator may act on it; everyone else may not */
export function canManage(userId: number, ownerId: number, admin: boolean): { allowed: boolean; owner: boolean } {
  const owner = userId === ownerId
  return { allowed: owner || admin, owner }
}
