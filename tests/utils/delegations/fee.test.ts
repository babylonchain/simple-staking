import { Transaction } from "bitcoinjs-lib";

import { txFeeSafetyCheck } from "@/utils/delegations/fee";

// Helper function to create a mock transaction with a specific byte length
const createMockTransaction = (byteLength: number) => {
  const tx = new Transaction();
  // Mock the byteLength method to return the specified length
  tx.virtualSize = () => byteLength;
  return tx;
};

describe("txFeeSafetyCheck", () => {
  const feeRate = 50; // Example fee rate in satoshis per byte

  test("should not throw an error if the estimated fee is within the acceptable range", () => {
    const tx = createMockTransaction(100); // Mock transaction of 100 bytes
    const estimatedFee = 5000; // Estimated fee in satoshis

    expect(() => {
      txFeeSafetyCheck(tx, feeRate, estimatedFee);
    }).not.toThrow();
  });

  test("should throw an error if the estimated fee is too high", () => {
    const tx = createMockTransaction(100); // Mock transaction of 100 bytes
    const estimatedFee = 11000; // Estimated fee in satoshis, too high

    expect(() => {
      txFeeSafetyCheck(tx, feeRate, estimatedFee);
    }).toThrow("Estimated fee is too high");
  });

  test("should throw an error if the estimated fee is too low", () => {
    const tx = createMockTransaction(100); // Mock transaction of 100 bytes
    const estimatedFee = 1000; // Estimated fee in satoshis, too low

    expect(() => {
      txFeeSafetyCheck(tx, feeRate, estimatedFee);
    }).toThrow("Estimated fee is too low");
  });

  test("should not throw an error if the estimated fee is exactly at the lower bound", () => {
    const tx = createMockTransaction(100); // Mock transaction of 100 bytes
    const estimatedFee = 2500; // Estimated fee in satoshis, exactly at lower bound

    expect(() => {
      txFeeSafetyCheck(tx, feeRate, estimatedFee);
    }).not.toThrow();
  });

  test("should not throw an error if the estimated fee is exactly at the upper bound", () => {
    const tx = createMockTransaction(100); // Mock transaction of 100 bytes
    const estimatedFee = 10000; // Estimated fee in satoshis, exactly at upper bound

    expect(() => {
      txFeeSafetyCheck(tx, feeRate, estimatedFee);
    }).not.toThrow();
  });
});
