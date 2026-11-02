import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { getMaskedAiSlipConfig, saveAiSlipConfig } from '@/lib/ai-slip-config';

export async function GET() {
  const [{ data, error }, session] = await Promise.all([
    supabase.from('site_settings').select('*').limit(1).single(),
    getSession(),
  ]);

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const baseData = data || {};
  if (session) {
    const aiSlipConfig = await getMaskedAiSlipConfig();
    return NextResponse.json({
      ...baseData,
      ai_slip_config: aiSlipConfig,
    });
  }

  return NextResponse.json(baseData);
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    // Save AI Slip Verification Config if provided
    let savedAiConfig = undefined;
    if (body.ai_slip_config && typeof body.ai_slip_config === 'object') {
      savedAiConfig = await saveAiSlipConfig(body.ai_slip_config);
    }

    // Only send the fields we want to update (not id or other metadata)
    const updateData: Record<string, any> = {
      site_name: body.site_name || '',
      tagline: body.tagline || '',
      description: body.description || '',
      logo_url: body.logo_url || '',
      og_image_url: body.og_image_url || '',
      favicon_url: body.favicon_url || '',
      line_oa_url: body.line_oa_url || '',
    };

    // First try to get the existing record
    const { data: existing } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1)
      .single();

    if (existing) {
      let { data, error } = await supabase
        .from('site_settings')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error && error.message?.includes('line_oa_url')) {
        delete updateData.line_oa_url;
        const retry = await supabase
          .from('site_settings')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({
        ...data,
        ai_slip_config: savedAiConfig || (await getMaskedAiSlipConfig()),
      });
    } else {
      let { data, error } = await supabase
        .from('site_settings')
        .insert(updateData)
        .select()
        .single();

      if (error && error.message?.includes('line_oa_url')) {
        delete updateData.line_oa_url;
        const retry = await supabase
          .from('site_settings')
          .insert(updateData)
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({
        ...data,
        ai_slip_config: savedAiConfig || (await getMaskedAiSlipConfig()),
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
