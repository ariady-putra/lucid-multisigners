import { applyDoubleCborEncoding, fromText, MintingPolicy, mintingPolicyToId, PolicyId, toUnit, Unit } from "@lucid-evolution/lucid";

export const script = applyDoubleCborEncoding("585401010029800aba2aba1aab9eaab9dab9a4888896600264653001300600198031803800cc0180092225980099b8748000c01cdd500144c9289bae30093008375400516401830060013003375400d149a26cac8009");
export const mintingValidator: MintingPolicy = { type: "PlutusV3", script };
export const policyID: PolicyId = mintingPolicyToId(mintingValidator);

export const tokenName = "Payment Token";
export const assetName = fromText(tokenName);
export const assetUnit: Unit = toUnit(policyID, assetName);
