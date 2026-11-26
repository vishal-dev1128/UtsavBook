# Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Tenant Isolation**: Every shop document (`/shops/{shopId}`) and all subcollections (`members`, `customers`, `products`, `bills`, `payments`, `expenses`, `suppliers`, `auditLogs`) can ONLY be read or written by authenticated, email-verified users who are active members of `{shopId}` (or the shop `ownerUid`).
2. **Role-Based Access Control (RBAC)**:
   - `owner`: Full read/write across shop settings, members, products, customers, bills, expenses, suppliers, and cancellations.
   - `manager`: Can create/edit products, customers, bills, cancel bills, record payments, and log expenses/suppliers, but CANNOT modify shop ownership, billing settings, or manage staff members.
   - `staff`: Can create bills, record customer quick-adds/payments, and view products/customers/bills, but CANNOT cancel bills, edit/delete products, view/edit settings, or manage staff.
3. **Public Receipt Isolation**: `/publicReceipts/{token}` allows unauthenticated `get` ONLY by exact 128-bit token ID (`[a-zA-Z0-9_-]{16,64}`), explicitly denies `list` to prevent scraping, and restricts writes strictly to verified members of the matching `shopId`.
4. **Immutable Audit & Temporal Integrity**: All `createdAt` and `updatedAt` timestamps must match `request.time`. `createdBy` / `ownerUid` / `actorUid` must match `request.auth.uid`. Audit logs cannot be modified or deleted.
5. **No Self-Assigned Escalation**: A user cannot add themselves as `owner` or `manager` to another user's shop, nor overwrite `ownerUid` on an existing shop.

## 2. The "Dirty Dozen" Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. **Cross-Tenant Read**: User B (`uid_b`) attempts `get /shops/shop_a/bills/bill_1` -> DENIED.
2. **Unverified Email Write**: User with `email_verified: false` attempts `create /shops/shop_a/products/prod_1` -> DENIED.
3. **Self-Assigned Role Escalation**: Staff member (`role: 'staff'`) attempts `update /shops/shop_a/members/uid_staff` with `{ role: 'owner' }` -> DENIED.
4. **Ghost Field Shadow Update**: Owner attempts `update /shops/shop_a/bills/bill_1` with `{ status: 'cancelled', isAdminOverride: true }` -> DENIED.
5. **ID Poisoning**: User attempts `create /shops/shop_a/products/<2000-char-id>` -> DENIED by `isValidId()`.
6. **Public Receipt List Scraping**: Unauthenticated visitor attempts `list /publicReceipts` -> DENIED.
7. **Staff Cancelling a Bill**: Staff member attempts `update /shops/shop_a/bills/bill_1` with `{ status: 'cancelled' }` -> DENIED.
8. **Staff Deleting a Product**: Staff member attempts `delete /shops/shop_a/products/prod_1` -> DENIED.
9. **Spoofed Creator UID**: Manager attempts `create /shops/shop_a/bills/bill_2` with `{ createdBy: 'someone_else' }` -> DENIED.
10. **Forged Timestamp**: Owner attempts `create /shops/shop_a/expenses/exp_1` with `{ createdAt: '1999-01-01T00:00:00Z' }` -> DENIED (`request.time` required).
11. **Unbounded Array Bomb**: Owner attempts `create /shops/shop_a/bills/bill_3` with `items` array of length > 100 -> DENIED.
12. **Lead Collection Scraping**: Non-admin authenticated user attempts `list /leads` -> DENIED.
