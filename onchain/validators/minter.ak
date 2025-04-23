use cardano/assets.{PolicyId}
use cardano/transaction.{Transaction}

validator payment_token {
  mint(_redeemer: Data, _policy_id: PolicyId, _tx: Transaction) {
    True
  }

  else(_) {
    fail
  }
}
