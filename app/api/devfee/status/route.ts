import { NextRequest, NextResponse } from 'next/server';
import { devFeeManager } from '@/lib/devfee/manager';

/**
 * GET /api/devfee/status
 * Get current dev fee status and statistics
 */
export async function GET() {
  try {
    const stats = devFeeManager.getStats();

    return NextResponse.json({
      success: true,
      enabled: stats.enabled,
      ratio: stats.ratio,
      totalDevFeeSolutions: stats.totalDevFeeSolutions,
      addressPoolSize: stats.addressPoolSize,
    });
  } catch (error: any) {
    console.error('[API] Failed to get dev fee status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/devfee/status
 * Enable or disable dev fee
 * Body: { enabled: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Invalid request: enabled must be a boolean' },
        { status: 400 }
      );
    }

    devFeeManager.setEnabled(enabled);

    const stats = devFeeManager.getStats();

    return NextResponse.json({
      success: true,
      enabled: stats.enabled,
      message: enabled ? 'Dev fee enabled' : 'Dev fee disabled',
    });
  } catch (error: any) {
    console.error('[API] Failed to set dev fee status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
