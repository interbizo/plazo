# VERIFICATION SYSTEM DOCUMENTATION

## Overview
Platform memiliki 2 jenis verifikasi yang berbeda:

---

## 1. KYC VERIFICATION (Identity Verification)
**Purpose**: Verifikasi identitas user untuk kepercayaan dan keamanan

### Requirements:
- Upload KTP/ID Card
- Upload Selfie with KTP
- Personal information (Name, Address, DOB)

### Process:
1. User submit KYC documents
2. Admin review documents
3. Admin approve/reject
4. If approved → `user.kycStatus = APPROVED`
5. If approved → `tenant.isVerified = true` (for seller)

### Badge:
- **Verified Badge** (Blue checkmark)
- Appears on: Store, Products, Services, Profile
- Indicates: Identity verified, trusted seller

### Benefits:
- Verified badge on store
- Increased buyer trust
- Access to premium features
- Required for some subscription plans

---

## 2. PHYSICAL VERIFICATION (Business Verification)
**Purpose**: Verifikasi lokasi fisik bisnis untuk seller premium

### Requirements:
- Premium subscription plan
- Flag: `canRequestPhysicalVerification = true`
- Business address
- Physical location

### Process:
1. Premium seller request verification
2. Admin schedule physical visit
3. Admin conduct on-site verification
4. Admin upload visit photos
5. Admin approve/reject
6. If approved → Certificate issued

### Badge:
- **Physical Verification Badge** (Optional, different from KYC)
- Certificate download available
- Indicates: Physical business location verified

### Benefits:
- Physical verification certificate
- Additional trust signal
- Premium feature showcase
- Business legitimacy proof

---

## KEY DIFFERENCES

| Aspect | KYC Verification | Physical Verification |
|--------|------------------|----------------------|
| **Purpose** | Identity verification | Business location verification |
| **Required For** | All sellers (recommended) | Premium sellers only |
| **Process** | Document upload | Physical visit |
| **Badge** | Verified (Blue checkmark) | Physical Verified (Certificate) |
| **Eligibility** | All users | Premium plan with flag |
| **Impact** | `tenant.isVerified = true` | Certificate only |
| **Display** | Store, Products, Services | Profile, Certificate section |

---

## IMPLEMENTATION DETAILS

### Database Fields:

**User Model**:
```prisma
kycStatus: KycStatus (NOT_SUBMITTED, PENDING, APPROVED, REJECTED)
kycVerifiedAt: DateTime?
```

**Tenant Model**:
```prisma
isVerified: Boolean (true if KYC approved)
verifiedAt: DateTime? (when KYC approved)
```

**PhysicalVerification Model**:
```prisma
status: PhysicalVerificationStatus
certificateUrl: String?
approvedAt: DateTime?
```

### Logic Flow:

**KYC Approval**:
```typescript
// When admin approves KYC
1. Update user.kycStatus = APPROVED
2. Update user.kycVerifiedAt = now
3. Update tenant.isVerified = true (for seller)
4. Update tenant.verifiedAt = now
5. Show verified badge
```

**Physical Verification Approval**:
```typescript
// When admin approves physical verification
1. Update physicalVerification.status = APPROVED
2. Update physicalVerification.approvedAt = now
3. Upload certificate
4. Show certificate download
// Note: Does NOT affect tenant.isVerified
```

---

## UI DISPLAY RULES

### Verified Badge (Blue Checkmark):
**Show when**: `tenant.isVerified === true` (KYC approved)
**Locations**:
- Store header
- Product cards (seller info)
- Service cards (seller info)
- Seller profile
- Search results

### Physical Verification Certificate:
**Show when**: `physicalVerification.status === APPROVED`
**Locations**:
- Seller dashboard (verification page)
- Certificate download section
- Optional: Additional badge on profile

---

## ADMIN ACTIONS

### KYC Review:
```
Path: /admin/kyc
Actions:
- View KYC submissions
- Review documents
- Approve → Sets tenant.isVerified = true
- Reject → User can resubmit
```

### Physical Verification Review:
```
Path: /admin/physical-verifications
Actions:
- View verification requests
- Schedule visit
- Upload photos
- Approve → Issue certificate
- Reject → Provide reason
```

---

## SELLER EXPERIENCE

### KYC Verification:
```
Path: /seller/dashboard/verification
Steps:
1. Upload KTP
2. Upload Selfie
3. Submit for review
4. Wait for approval
5. Get verified badge
```

### Physical Verification:
```
Path: /seller/dashboard/physical-verification
Steps:
1. Check eligibility (premium plan)
2. Submit request with business info
3. Wait for admin to schedule visit
4. Admin conducts visit
5. Get certificate if approved
```

---

## IMPORTANT NOTES

1. **Verified Badge = KYC Approved**
   - The blue checkmark badge is ONLY for KYC verification
   - This is the primary trust signal for buyers

2. **Physical Verification = Premium Feature**
   - Optional additional verification
   - Requires premium subscription
   - Provides certificate, not badge

3. **Separation of Concerns**:
   - KYC: Identity & trust
   - Physical: Business legitimacy
   - Both independent but complementary

4. **Database Consistency**:
   - `tenant.isVerified` ONLY updated by KYC approval
   - Physical verification has separate table
   - No overlap in logic

---

## MIGRATION NOTES

If you need to sync existing data:

```sql
-- Set tenant.isVerified based on user.kycStatus
UPDATE "Tenant" t
SET "isVerified" = true, "verifiedAt" = u."kycVerifiedAt"
FROM "User" u
WHERE t."ownerId" = u.id 
AND u."kycStatus" = 'APPROVED'
AND t."isVerified" = false;
```

---

## TESTING CHECKLIST

- [ ] KYC approval sets tenant.isVerified = true
- [ ] Verified badge appears after KYC approval
- [ ] Physical verification does NOT affect verified badge
- [ ] Certificate download works for physical verification
- [ ] Premium users can request physical verification
- [ ] Non-premium users cannot request physical verification
- [ ] Badge displays correctly on store/products/services
- [ ] Admin can manage both verifications independently

---

**Last Updated**: 2024
**Version**: 1.0
