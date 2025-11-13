/**
 * API endpoint to consolidate rewards from one address to another
 * POST /api/consolidate/donate
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { consolidationLogger } from '@/lib/storage/consolidation-logger';

const API_BASE = 'https://scavenger.prod.gd.midnighttge.io';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceAddress, destinationAddress, signature, sourceIndex, destinationIndex, destinationMode } = body;

    if (!sourceAddress || !destinationAddress || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: sourceAddress, destinationAddress, signature' },
        { status: 400 }
      );
    }

    // Skip if source and destination are the same
    if (sourceAddress === destinationAddress) {
      return NextResponse.json(
        { error: 'Source and destination cannot be the same' },
        { status: 400 }
      );
    }

    // POST /donate_to/{destination}/{source}/{signature}
    const url = `${API_BASE}/donate_to/${destinationAddress}/${sourceAddress}/${signature}`;

    console.log('[Consolidate API] Making donation request:', {
      url,
      sourceAddress,
      destinationAddress,
    });

    try {
      const response = await axios.post(url, {}, {
        timeout: 30000,
        validateStatus: (status) => status < 500,
      });

      console.log('[Consolidate API] Server response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });

      if (response.status >= 200 && response.status < 300) {
        console.log('[Consolidate API] ✓ Success:', response.data);

        // Log successful consolidation
        consolidationLogger.logConsolidation({
          ts: new Date().toISOString(),
          sourceAddress,
          sourceIndex,
          destinationAddress,
          destinationIndex,
          destinationMode: destinationMode || 'wallet',
          solutionsConsolidated: response.data.solutions_consolidated || 0,
          message: response.data.message || 'Rewards consolidated successfully',
          status: 'success',
        });

        return NextResponse.json({
          success: true,
          message: response.data.message || 'Rewards consolidated successfully',
          solutionsConsolidated: response.data.solutions_consolidated || 0,
          sourceAddress,
          destinationAddress,
        });
      } else {
        console.error('[Consolidate API] ✗ Server rejected consolidation:', {
          status: response.status,
          statusText: response.statusText,
          responseData: response.data,
          message: response.data.message,
          fullResponse: JSON.stringify(response.data, null, 2),
        });

        // Log failed consolidation
        consolidationLogger.logConsolidation({
          ts: new Date().toISOString(),
          sourceAddress,
          sourceIndex,
          destinationAddress,
          destinationIndex,
          destinationMode: destinationMode || 'wallet',
          solutionsConsolidated: 0,
          message: response.data.message,
          status: 'failed',
          error: response.data.message || 'Server rejected consolidation request',
        });

        return NextResponse.json(
          {
            success: false,
            error: response.data.message || 'Server rejected consolidation request',
            status: response.status,
            details: response.data, // Include full response for debugging
          },
          { status: response.status }
        );
      }
    } catch (axiosError: any) {
      const errorMsg = axiosError.response?.data?.message || axiosError.message;
      const statusCode = axiosError.response?.status || 500;

      console.error('[Consolidate API] ✗ Request failed:', {
        error: axiosError.message,
        status: statusCode,
        responseData: axiosError.response?.data,
        responseText: axiosError.response?.statusText,
        fullError: JSON.stringify({
          message: axiosError.message,
          code: axiosError.code,
          response: axiosError.response?.data,
        }, null, 2),
      });

      // Log failed consolidation
      consolidationLogger.logConsolidation({
        ts: new Date().toISOString(),
        sourceAddress,
        sourceIndex,
        destinationAddress,
        destinationIndex,
        destinationMode: destinationMode || 'wallet',
        solutionsConsolidated: 0,
        status: 'failed',
        error: errorMsg,
      });

      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
          status: statusCode,
          details: axiosError.response?.data, // Include full response for debugging
        },
        { status: statusCode }
      );
    }
  } catch (error: any) {
    console.error('[API] Consolidate donate error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to consolidate rewards' },
      { status: 500 }
    );
  }
}
