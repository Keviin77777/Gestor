# Deploy Firestore Rules

## Problem
The application is showing a Firestore permissions error because the security rules for the `invoices` collection are not deployed to Firebase.

## Solution
I've added the missing security rules for the `invoices` collection and created the necessary Firebase configuration files.

## Steps to Deploy

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Deploy the Firestore rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

## What was fixed

1. **Added missing security rules** for `/resellers/{resellerId}/invoices/{invoiceId}` collection
2. **Created Firebase configuration files**:
   - `firebase.json` - Firebase project configuration
   - `.firebaserc` - Project alias configuration  
   - `firestore.indexes.json` - Firestore indexes configuration
3. **Cleaned up unused imports** in the payment history component

## Files Modified

- `firestore.rules` - Added invoices collection security rules
- `firebase.json` - Created Firebase configuration
- `.firebaserc` - Created project configuration
- `firestore.indexes.json` - Created indexes configuration
- `src/components/clients/payment-history.tsx` - Cleaned up unused imports

After deploying the rules, the Firestore permissions error should be resolved and the invoice system will work properly.