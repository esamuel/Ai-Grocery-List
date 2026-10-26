/**
 * Legacy Firestore migration (ownerId/members fields).
 * On Supabase, owner_id and members are real columns enforced by RLS, so nothing to migrate.
 */
export const migrateListOwnershipFields = async (_listId: string, _userId: string): Promise<boolean> => true;
export const checkListNeedsMigration = async (_listId: string): Promise<boolean> => false;
