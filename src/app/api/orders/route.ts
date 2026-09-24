import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { notifyNewOrder } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { toolId, amount, slipUrl } = await request.json();

    // แปลง amount ให้เป็นตัวเลข (อาจมาเป็น "299 บาท" หรือ "499")
    const numericAmount = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;

    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        user_email: user.email || '',
        tool_id: toolId || null,
        amount: numericAmount,
        slip_url: slipUrl || '',
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Order insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ดึงชื่อ tool
    const { data: toolInfo } = await supabase.from('tools').select('name').eq('id', toolId).single()
    
    // แจ้ง Telegram
    notifyNewOrder(
      user.user_metadata?.full_name || user.email || 'ไม่ทราบชื่อ',
      user.email || '',
      toolInfo?.name || 'ไม่ระบุ',
      `${numericAmount} บาท`
    )

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*, tools(name, slug)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
