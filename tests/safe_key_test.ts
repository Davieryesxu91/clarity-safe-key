import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Can store and retrieve a key",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const encrypted = "encrypted-data-example";
    
    let block = chain.mineBlock([
      Tx.contractCall('safe_key', 'store-key', [
        types.utf8(encrypted)
      ], deployer.address)
    ]);
    
    // Check key storage success
    block.receipts[0].result.expectOk().expectUint(1);
    
    // Retrieve stored key
    let getBlock = chain.mineBlock([
      Tx.contractCall('safe_key', 'get-key', [
        types.uint(1)
      ], deployer.address)
    ]);
    
    const keyData = getBlock.receipts[0].result.expectOk().expectTuple();
    assertEquals(keyData['encrypted-data'], encrypted);
    assertEquals(keyData['owner'], deployer.address);
  },
});

Clarinet.test({
  name: "Can share and revoke key access",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const user1 = accounts.get('wallet_1')!;
    
    // Store a key
    let block = chain.mineBlock([
      Tx.contractCall('safe_key', 'store-key', [
        types.utf8("test-key")
      ], deployer.address)
    ]);
    
    // Share key with user1
    let shareBlock = chain.mineBlock([
      Tx.contractCall('safe_key', 'share-key', [
        types.uint(1),
        types.principal(user1.address)
      ], deployer.address)
    ]);
    
    shareBlock.receipts[0].result.expectOk().expectBool(true);
    
    // Check access
    let checkBlock = chain.mineBlock([
      Tx.contractCall('safe_key', 'check-access', [
        types.uint(1),
        types.principal(user1.address)
      ], deployer.address)
    ]);
    
    checkBlock.receipts[0].result.expectOk().expectBool(true);
    
    // Revoke access
    let revokeBlock = chain.mineBlock([
      Tx.contractCall('safe_key', 'revoke-access', [
        types.uint(1),
        types.principal(user1.address)
      ], deployer.address)
    ]);
    
    revokeBlock.receipts[0].result.expectOk().expectBool(true);
    
    // Verify access revoked
    let finalCheck = chain.mineBlock([
      Tx.contractCall('safe_key', 'check-access', [
        types.uint(1),
        types.principal(user1.address)
      ], deployer.address)
    ]);
    
    finalCheck.receipts[0].result.expectOk().expectBool(false);
  },
});