/**
 * API endpoint to sign consolidation messages (server-side signing)
 * This keeps the seed phrase secure on the server - it never goes over the network
 * POST /api/wallet/sign
 */

import { NextRequest, NextResponse } from 'next/server';
import { WalletManager } from '@/lib/wallet/manager';

export async function POST(request: NextRequest) {
  try {
    const { password, sourceAddressIndex, sourceAddress, destinationAddress } = await request.json();

    if (!password || sourceAddressIndex === undefined || !sourceAddress || !destinationAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: password, sourceAddressIndex, sourceAddress, destinationAddress' },
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

    // Load wallet with password (validates password)
    try {
      await walletManager.loadWallet(password);
    } catch (err) {
      return NextResponse.json(
        { error: 'Failed to decrypt wallet. Incorrect password?' },
        { status: 401 }
      );
    }

    // Sign the consolidation message server-side
    const signature = await walletManager.makeDonationSignature(
      sourceAddressIndex,
      sourceAddress,
      destinationAddress
    );

    return NextResponse.json({
      success: true,
      signature,
    });
  } catch (error: any) {
    console.error('[API] Wallet sign error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sign message' },
      { status: 500 }
    );
  }
}
