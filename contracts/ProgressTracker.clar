  
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-MODULE-ID u101)
(define-constant ERR-INVALID-SCORE u102)
(define-constant ERR-INVALID-TIMESTAMP u103)
(define-constant ERR-USER-NOT-FOUND u104)
(define-constant ERR-PROGRESS-NOT-FOUND u105)
(define-constant ERR-INVALID-STATUS u106)
(define-constant ERR-INVALID-ATTEMPTS u107)
(define-constant ERR-INVALID-DURATION u108)
(define-constant ERR-INVALID-PLATFORM u109)
(define-constant ERR-UPDATE-NOT-ALLOWED u110)

(define-data-var contract-owner principal tx-sender)
(define-data-var progress-counter uint u0)
(define-data-var max-progress-entries uint u10000)

(define-map user-progress
  { user: principal, module-id: uint }
  {
    score: uint,
    timestamp: uint,
    status: (string-utf8 20),
    attempts: uint,
    duration: uint,
    platform-id: (string-utf8 50)
  }
)

(define-map user-progress-count
  principal
  uint)

(define-map progress-audit
  { user: principal, module-id: uint }
  {
    last-updated: uint,
    updater: principal,
    previous-score: uint,
    previous-status: (string-utf8 20)
  }
)

(define-read-only (get-progress (user principal) (module-id uint))
  (map-get? user-progress { user: user, module-id: module-id })
)

(define-read-only (get-progress-count (user principal))
  (default-to u0 (map-get? user-progress-count user))
)

(define-read-only (get-progress-audit (user principal) (module-id uint))
  (map-get? progress-audit { user: user, module-id: module-id })
)

(define-private (validate-module-id (module-id uint))
  (if (> module-id u0)
      (ok true)
      (err ERR-INVALID-MODULE-ID))
)

(define-private (validate-score (score uint))
  (if (<= score u100)
      (ok true)
      (err ERR-INVALID-SCORE))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-status (status (string-utf8 20)))
  (if (or (is-eq status u"completed") (is-eq status u"in-progress") (is-eq status u"failed"))
      (ok true)
      (err ERR-INVALID-STATUS))
)

(define-private (validate-attempts (attempts uint))
  (if (<= attempts u10)
      (ok true)
      (err ERR-INVALID-ATTEMPTS))
)

(define-private (validate-duration (duration uint))
  (if (> duration u0)
      (ok true)
      (err ERR-INVALID-DURATION))
)

(define-private (validate-platform-id (platform-id (string-utf8 50)))
  (if (and (> (len platform-id) u0) (<= (len platform-id) u50))
      (ok true)
      (err ERR-INVALID-PLATFORM))
)

(define-public (set-max-progress-entries (new-max uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-NOT-AUTHORIZED))
    (asserts! (> new-max u0) (err ERR-INVALID-MODULE-ID))
    (var-set max-progress-entries new-max)
    (ok true)
  )
)

(define-public (update-progress
  (module-id uint)
  (score uint)
  (status (string-utf8 20))
  (attempts uint)
  (duration uint)
  (platform-id (string-utf8 50))
)
  (let
    (
      (user tx-sender)
      (progress-key { user: user, module-id: module-id })
      (current-count (get-progress-count user))
      (current-progress (map-get? user-progress progress-key))
    )
    (asserts! (< current-count (var-get max-progress-entries)) (err ERR-INVALID-MODULE-ID))
    (try! (validate-module-id module-id))
    (try! (validate-score score))
    (try! (validate-timestamp block-height))
    (try! (validate-status status))
    (try! (validate-attempts attempts))
    (try! (validate-duration duration))
    (try! (validate-platform-id platform-id))
    (map-set user-progress progress-key
      {
        score: score,
        timestamp: block-height,
        status: status,
        attempts: attempts,
        duration: duration,
        platform-id: platform-id
      }
    )
    (map-set progress-audit progress-key
      {
        last-updated: block-height,
        updater: user,
        previous-score: (default-to u0 (match current-progress p (get score p) none)),
        previous-status: (default-to u"none" (match current-progress p (get status p) none))
      }
    )
    (map-set user-progress-count user (+ current-count u1))
    (var-set progress-counter (+ (var-get progress-counter) u1))
    (print { event: "progress-updated", user: user, module-id: module-id, score: score })
    (ok true)
  )
)

(define-public (delete-progress (module-id uint))
  (let
    (
      (user tx-sender)
      (progress-key { user: user, module-id: module-id })
      (current-progress (map-get? user-progress progress-key))
    )
    (asserts! (is-some current-progress) (err ERR-PROGRESS-NOT-FOUND))
    (asserts! (is-eq user tx-sender) (err ERR-NOT-AUTHORIZED))
    (map-delete user-progress progress-key)
    (map-set progress-audit progress-key
      {
        last-updated: block-height,
        updater: user,
        previous-score: (get score (unwrap! current-progress (err ERR-PROGRESS-NOT-FOUND))),
        previous-status: (get status (unwrap! current-progress (err ERR-PROGRESS-NOT-FOUND)))
      }
    )
    (map-set user-progress-count user (- (get-progress-count user) u1))
    (var-set progress-counter (- (var-get progress-counter) u1))
    (print { event: "progress-deleted", user: user, module-id: module-id })
    (ok true)
  )
)

(define-public (transfer-ownership (new-owner principal))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err ERR-NOT-AUTHORIZED))
    (var-set contract-owner new-owner)
    (ok true)
  )
)