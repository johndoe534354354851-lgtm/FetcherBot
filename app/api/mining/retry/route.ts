/**
 * Retry Failed Submission API
 * POST /api/mining/retry
 *
 * Attempts to resubmit a previously failed solution
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { profileManager } from '@/lib/config/profile-manager';
import { receiptsLogger } from '@/lib/storage/receipts-logger';

interface RetryRequest {
  address: string;
  challengeId: string;
  nonce: string;
  hash: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RetryRequest = await request.json();
    const { address, challengeId, nonce, hash } = body;

    if (!address || !challengeId || !nonce) {
      return NextResponse.json(
        { error: 'Missing required fields: address, challengeId, nonce' },
        { status: 400 }
      );
    }

    // Get API base URL from active profile
    const profile = profileManager.getActiveProfile();
    if (!profile) {
      return NextResponse.json(
        { error: 'No active profile configured' },
        { status: 400 }
      );
    }

    const apiBase = profile.api?.baseUrl;
    if (!apiBase) {
      return NextResponse.json(
        { error: 'No API base URL configured for active profile' },
        { status: 400 }
      );
    }

    console.log(`[Retry API] Attempting to resubmit solution for address ${address.slice(0, 20)}...`);
    console.log(`[Retry API] Challenge: ${challengeId}`);
    console.log(`[Retry API] Nonce: ${nonce}`);

    // Submit solution to the API
    // API format: POST /solution/{address}/{challenge_id}/{nonce}
    const url = `${apiBase}/solution/${address}/${challengeId}/${nonce}`;

    const response = await axios.post(url, {}, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`[Retry API] ✓ Solution resubmitted successfully!`);
    console.log(`[Retry API] Response:`, response.data);

    // Log successful receipt
    receiptsLogger.logReceipt({
      ts: new Date().toISOString(),
      address: address,
      challenge_id: challengeId,
      nonce: nonce,
      hash: hash || '',
      crypto_receipt: response.data?.crypto_receipt,
      isDevFee: false,
    });

    // Remove from errors file (mark as resolved)
    receiptsLogger.removeError(address, challengeId, nonce);

    return NextResponse.json({
      success: true,
      message: 'Solution resubmitted successfully',
      crypto_receipt: response.data?.crypto_receipt,
    });

  } catch (error: any) {
    console.error('[Retry API] ✗ Resubmission failed:', error.message);

    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
    const responseData = error.response?.data;

    // Log detailed error
    console.error('[Retry API] Status:', statusCode);
    console.error('[Retry API] Response:', responseData);

    return NextResponse.json({
      success: false,
      error: errorMessage,
      statusCode,
      details: responseData,
    }, { status: statusCode || 500 });
  }
}
