(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-CAMPAIGN-ENDED u101)
(define-constant ERR-GOAL-NOT-MET u102)
(define-constant ERR-INVALID-AMOUNT u103)
(define-constant ERR-INVALID-GOAL u104)
(define-constant ERR-INVALID-DEADLINE u105)
(define-constant ERR-ALREADY-INITIALIZED u106)
(define-constant ERR-NOT-ORGANIZER u107)
(define-constant ERR-INVALID-TITLE u108)
(define-constant ERR-CAMPAIGN-NOT-FOUND u109)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u110)
(define-data-var next-campaign-id uint u0)
(define-data-var creation-fee uint u1000)
(define-data-var authority-contract (optional principal) none)
(define-map campaigns
  uint
  {
    title: (string-utf8 100),
    goal-amount: uint,
    total-raised: uint,
    deadline: uint,
    is-active: bool,
    organizer: principal
  }
)
(define-map donations
  { campaign-id: uint, donor: principal }
  uint
)
(define-map campaigns-by-title
  (string-utf8 100)
  uint
)
(define-read-only (get-campaign (id uint))
  (map-get? campaigns id)
)
(define-read-only (get-donation (id uint) (donor principal))
  (map-get? donations { campaign-id: id, donor: donor })
)
(define-read-only (is-campaign-registered (title (string-utf8 100)))
  (is-some (map-get? campaigns-by-title title))
)
(define-private (validate-title (title (string-utf8 100)))
  (if (and (> (len title) u0) (<= (len title) u100))
      (ok true)
      (err ERR-INVALID-TITLE))
)
(define-private (validate-goal-amount (goal uint))
  (if (> goal u0)
      (ok true)
      (err ERR-INVALID-GOAL))
)
(define-private (validate-deadline (dl uint))
  (if (> dl block-height)
      (ok true)
      (err ERR-INVALID-DEADLINE))
)
(define-private (validate-amount (amt uint))
  (if (> amt u0)
      (ok true)
      (err ERR-INVALID-AMOUNT))
)
(define-public (set-authority-contract (contract-principal principal))
  (begin
    (asserts! (not (is-eq contract-principal 'SP000000000000000000002Q6VF78)) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)
(define-public (create-campaign (title (string-utf8 100)) (goal uint) (duration uint))
  (let (
        (next-id (var-get next-campaign-id))
        (authority (var-get authority-contract))
      )
    (try! (validate-title title))
    (try! (validate-goal-amount goal))
    (try! (validate-deadline (+ block-height duration)))
    (asserts! (is-none (map-get? campaigns-by-title title)) (err ERR-ALREADY-INITIALIZED))
    (asserts! (is-some authority) (err ERR-AUTHORITY-NOT-VERIFIED))
    (try! (stx-transfer? (var-get creation-fee) tx-sender (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
    (map-set campaigns next-id
      {
        title: title,
        goal-amount: goal,
        total-raised: u0,
        deadline: (+ block-height duration),
        is-active: true,
        organizer: tx-sender
      }
    )
    (map-set campaigns-by-title title next-id)
    (var-set next-campaign-id (+ next-id u1))
    (print { event: "campaign-created", id: next-id })
    (ok next-id)
  )
)
(define-public (donate (id uint) (amount uint))
  (let ((campaign (map-get? campaigns id)))
    (match campaign
      c
        (begin
          (asserts! (get is-active c) (err ERR-CAMPAIGN-ENDED))
          (try! (validate-amount amount))
          (asserts! (<= block-height (get deadline c)) (err ERR-CAMPAIGN-ENDED))
          (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
          (map-set donations { campaign-id: id, donor: tx-sender }
            (+ (default-to u0 (map-get? donations { campaign-id: id, donor: tx-sender })) amount)
          )
          (map-set campaigns id
            (merge c { total-raised: (+ (get total-raised c) amount) })
          )
          (print { event: "donation-received", id: id, amount: amount })
          (ok true)
        )
      (err ERR-CAMPAIGN-NOT-FOUND)
    )
  )
)
(define-public (withdraw-funds (id uint) (amount uint))
  (let ((campaign (map-get? campaigns id)))
    (match campaign
      c
        (begin
          (asserts! (is-eq (get organizer c) tx-sender) (err ERR-NOT-ORGANIZER))
          (asserts! (>= (get total-raised c) (get goal-amount c)) (err ERR-GOAL-NOT-MET))
          (try! (validate-amount amount))
          (try! (as-contract (stx-transfer? amount tx-sender (get organizer c))))
          (map-set campaigns id
            (merge c { total-raised: (- (get total-raised c) amount) })
          )
          (print { event: "funds-withdrawn", id: id, amount: amount })
          (ok true)
        )
      (err ERR-CAMPAIGN-NOT-FOUND)
    )
  )
)
(define-public (get-campaign-count)
  (ok (var-get next-campaign-id))
)