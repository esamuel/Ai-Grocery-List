/**
 * Family members + activity feed on Supabase.
 * Tables: gl_family_activities(list_id, user_id, data jsonb{userName,type,itemName,timestamp})
 * RPC:    gl_list_members(list_id) → id, email, display_name, last_active, is_owner
 */
import { getSupabase, nowIso } from './supabaseClient';

export interface FamilyMember {
  id: string;
  name: string;
  email: string;
  isOwner: boolean;
  lastActive: string;
}

export interface FamilyActivity {
  id?: string;
  listId: string;
  userId: string;
  userName: string;
  type: 'added' | 'checked' | 'removed' | 'unchecked';
  itemName: string;
  timestamp: string;
}

/** "samuel.eskenasy@gmail.com" => "Samuel Eskenasy" */
const getFriendlyNameFromEmail = (email: string): string =>
  email.split('@')[0].split(/[._-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');

type MemberRow = { id: string; email: string; display_name: string; last_active: string; is_owner: boolean };

async function fetchMemberRows(listId: string): Promise<MemberRow[]> {
  const { data, error } = await getSupabase().rpc('gl_list_members', { p_list_id: listId });
  if (error) throw error;
  return (data as MemberRow[]) || [];
}

export const getFamilyMembers = async (listId: string): Promise<FamilyMember[]> => {
  try {
    const rows = await fetchMemberRows(listId);
    return rows.map(r => ({
      id: r.id,
      name: r.display_name || (r.email ? getFriendlyNameFromEmail(r.email) : 'User'),
      email: r.email || '',
      isOwner: r.is_owner,
      lastActive: r.last_active || nowIso(),
    }));
  } catch (error) {
    console.error('Error fetching family members:', error);
    return [];
  }
};

/** Recent activities for a list (max 3 per member), newest first. */
export const getFamilyActivities = async (listId: string, maxActivities: number = 50): Promise<FamilyActivity[]> => {
  try {
    const sb = getSupabase();
    const [{ data, error }, members] = await Promise.all([
      sb.from('gl_family_activities')
        .select('id,user_id,data')
        .eq('list_id', listId)
        .order('created_at', { ascending: false })
        .limit(maxActivities),
      fetchMemberRows(listId).catch(() => [] as MemberRow[]),
    ]);
    if (error) throw error;

    const names = new Map<string, string>();
    members.forEach(m => names.set(m.id, m.display_name || (m.email ? getFriendlyNameFromEmail(m.email) : 'User')));

    const all: FamilyActivity[] = (data || []).map((row: any) => ({
      id: row.id,
      listId,
      userId: row.user_id,
      ...(row.data as Omit<FamilyActivity, 'id' | 'listId' | 'userId'>),
      userName: names.get(row.user_id) || row.data?.userName || 'User',
    }));

    const byUser = new Map<string, FamilyActivity[]>();
    for (const a of all) {
      const list = byUser.get(a.userId) || [];
      if (list.length < 3) {
        list.push(a);
        byUser.set(a.userId, list);
      }
    }
    return Array.from(byUser.values()).flat()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error('Error fetching family activities:', error);
    return [];
  }
};

/** Non-blocking activity log. */
export const logFamilyActivity = async (
  listId: string,
  userId: string,
  userName: string,
  type: FamilyActivity['type'],
  itemName: string
): Promise<void> => {
  try {
    const sb = getSupabase();
    const { error } = await sb.from('gl_family_activities').insert({
      list_id: listId,
      user_id: userId,
      data: { userName, type, itemName, timestamp: nowIso() },
    });
    if (error) throw error;

    // Touch lastActive on the user's own row
    const { data: me } = await sb.from('gl_users').select('data').eq('id', userId).maybeSingle();
    if (me) {
      await sb.from('gl_users').update({ data: { ...(me.data as object), lastActive: nowIso() } }).eq('id', userId);
    }
  } catch (error) {
    console.error('Error logging family activity:', error);
  }
};

/** Keep the last 100 activities per list. */
export const cleanupOldActivities = async (listId: string): Promise<void> => {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('gl_family_activities')
      .select('id')
      .eq('list_id', listId)
      .order('created_at', { ascending: false })
      .range(100, 10000);
    if (error) throw error;
    const ids = (data || []).map((r: any) => r.id);
    if (ids.length) await sb.from('gl_family_activities').delete().in('id', ids);
  } catch (error) {
    console.error('Error cleaning up old activities:', error);
  }
};
