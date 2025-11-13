/**
 * API endpoint to sign multiple consolidation messages in one call (batch signing)
 * This is much more efficient for consolidating many addresses
 * POST /api/wallet/sign-batch
 */

import { NextRequest, NextResponse } from 'next/server';
import { WalletManager } from '@/lib/wallet/manager';

interface SignRequest {
  sourceAddressIndex: number;
  sourceAddress: string;
  destinationAddress: string;
}

export async function POST(request: NextRequest) {
  try {
    const { password, addresses } = await request.json();

    if (!password || !addresses || !Array.isArray(addresses)) {
      return NextResponse.json(
        { error: 'Missing required fields: password, addresses (array)' },
        { status: 400 }
      );
    }

    const walletManager = new WalletManager();

    if (!walletManager.walletExists()) {
      return NextResponse.json(
        { error: 'No wallet found. Please create a new wallet first.' },
        { status: 404 }
      );
    }

    // Load wallet with password once (validates password)
    try {
      await walletManager.loadWallet(password);
    } catch (err) {
      return NextResponse.json(
        { error: 'Failed to decrypt wallet. Incorrect password?' },
        { status: 401 }
      );
    }

    // Sign all addresses in batch
    const signatures: Array<{
      sourceAddressIndex: number;
      sourceAddress: string;
      destinationAddress: string;
      signature: string;
    }> = [];

    for (const addr of addresses as SignRequest[]) {
      try {
        const signature = await walletManager.makeDonationSignature(
          addr.sourceAddressIndex,
          addr.sourceAddress,
          addr.destinationAddress
        );

        signatures.push({
          sourceAddressIndex: addr.sourceAddressIndex,
          sourceAddress: addr.sourceAddress,
          destinationAddress: addr.destinationAddress,
          signature,
        });
      } catch (err: any) {
        console.error(`[Batch Sign] Failed to sign address ${addr.sourceAddressIndex}:`, err.message);
        // Continue with other addresses even if one fails
        signatures.push({
          sourceAddressIndex: addr.sourceAddressIndex,
          sourceAddress: addr.sourceAddress,
          destinationAddress: addr.destinationAddress,
          signature: '', // Empty signature indicates failure
        });
      }
    }

    console.log(`[Batch Sign] Successfully signed ${signatures.filter(s => s.signature).length}/${signatures.length} addresses`);

    return NextResponse.json({
      success: true,
      signatures,
    });
  } catch (error: any) {
    console.error('[API] Batch sign error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sign messages' },
      { status: 500 }
    );
  }
}
