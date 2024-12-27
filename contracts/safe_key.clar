;; SafeKey Contract
;; A decentralized key management system

;; Constants
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-KEY-NOT-FOUND (err u101))
(define-constant ERR-ALREADY-SHARED (err u102))

;; Data Variables
(define-map keys 
    { key-id: uint }
    { 
        owner: principal,
        encrypted-data: (string-utf8 1024),
        created-at: uint
    }
)

(define-map key-access 
    { key-id: uint, user: principal }
    { 
        can-access: bool,
        shared-at: uint
    }
)

(define-data-var key-counter uint u0)

;; Private Functions
(define-private (is-key-owner (key-id uint) (caller principal))
    (match (map-get? keys {key-id: key-id})
        key-data (is-eq (get owner key-data) caller)
        false
    )
)

;; Public Functions
(define-public (store-key (encrypted-data (string-utf8 1024)))
    (let 
        (
            (new-key-id (+ (var-get key-counter) u1))
        )
        (map-set keys 
            {key-id: new-key-id}
            {
                owner: tx-sender,
                encrypted-data: encrypted-data,
                created-at: block-height
            }
        )
        (var-set key-counter new-key-id)
        (ok new-key-id)
    )
)

(define-public (share-key (key-id uint) (with-user principal))
    (if (is-key-owner key-id tx-sender)
        (begin
            (map-set key-access 
                {key-id: key-id, user: with-user}
                {
                    can-access: true,
                    shared-at: block-height
                }
            )
            (ok true)
        )
        ERR-NOT-AUTHORIZED
    )
)

(define-public (revoke-access (key-id uint) (from-user principal))
    (if (is-key-owner key-id tx-sender)
        (begin
            (map-set key-access 
                {key-id: key-id, user: from-user}
                {
                    can-access: false,
                    shared-at: block-height
                }
            )
            (ok true)
        )
        ERR-NOT-AUTHORIZED
    )
)

;; Read-only functions
(define-read-only (get-key (key-id uint))
    (match (map-get? keys {key-id: key-id})
        key-data (
            if (or
                (is-eq (get owner key-data) tx-sender)
                (default-to 
                    false
                    (get can-access (default-to 
                        {can-access: false, shared-at: u0}
                        (map-get? key-access {key-id: key-id, user: tx-sender})
                    ))
                )
            )
            (ok key-data)
            ERR-NOT-AUTHORIZED
        )
        ERR-KEY-NOT-FOUND
    )
)

(define-read-only (check-access (key-id uint) (user principal))
    (match (map-get? key-access {key-id: key-id, user: user})
        access-data (ok (get can-access access-data))
        (ok false)
    )
)