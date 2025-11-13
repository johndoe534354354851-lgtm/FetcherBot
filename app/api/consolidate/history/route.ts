/**
 * API endpoint to get consolidation history
 * GET /api/consolidate/history
 */

import { NextRequest, NextResponse } from 'next/server';
import { consolidationLogger } from '@/lib/storage/consolidation-logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const limit = searchParams.get('limit');

    let records;

    if (address) {
      // Get consolidations for specific address
      records = consolidationLogger.getConsolidationsForAddress(address);
    } else if (limit) {
      // Get recent N consolidations
      records = consolidationLogger.getRecentConsolidations(parseInt(limit, 10));
    } else {
      // Get all consolidations
      records = consolidationLogger.readConsolidations();
    }

    // Calculate summary statistics
    const summary = {
      totalConsolidations: records.length,
      successfulConsolidations: records.filter(r => r.status === 'success').length,
      failedConsolidations: records.filter(r => r.status === 'failed').length,
      totalSolutionsConsolidated: records
        .filter(r => r.status === 'success')
        .reduce((sum, r) => sum + r.solutionsConsolidated, 0),
    };

    return NextResponse.json({
      success: true,
      records,
      summary,
    });
  } catch (error: any) {
    console.error('[API] Consolidate history error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch consolidation history' },
      { status: 500 }
    );
  }
}
