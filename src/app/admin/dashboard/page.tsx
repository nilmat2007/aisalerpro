import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { loadAdminDashboardAnalytics } from '@/lib/admin-analytics';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session || session.is_admin !== true) {
    redirect('/admin/login');
  }

  const dashboardData = await loadAdminDashboardAnalytics(supabaseAdmin);

  return <AdminDashboardClient data={dashboardData} />;
}
