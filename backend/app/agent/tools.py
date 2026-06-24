"""10 agent tools for the customer support refund agent."""

from datetime import datetime, timezone, timedelta
from langchain_core.tools import tool
from sqlalchemy import or_

from ..database.db import SessionLocal
from ..database.models import Customer, Order, Refund, RefundStatus, OrderStatus
from ..config import settings

REFUND_WINDOW_DAYS = 7


def _get_db():
    return SessionLocal()


@tool
def lookup_customer(identifier: str) -> dict:
    """Search for a customer by name, email, or phone number.
    Returns customer profile including account status, order count, and refund history."""
    db = _get_db()
    try:
        q = identifier.strip().lower()
        customer = db.query(Customer).filter(
            or_(
                Customer.email.ilike(f"%{q}%"),
                Customer.name.ilike(f"%{q}%"),
                Customer.phone.ilike(f"%{q}%"),
            )
        ).first()

        if not customer:
            return {"found": False, "message": f"No customer found matching '{identifier}'."}

        order_count = db.query(Order).filter(Order.customer_id == customer.id).count()
        refund_count = db.query(Refund).filter(Refund.customer_id == customer.id).count()
        denied_count = db.query(Refund).filter(
            Refund.customer_id == customer.id,
            Refund.status == RefundStatus.DENIED,
        ).count()

        return {
            "found": True,
            "customer_id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
            "account_status": customer.account_status,
            "account_notes": customer.notes,
            "member_since": customer.created_at.isoformat() if customer.created_at else None,
            "total_orders": order_count,
            "total_refund_requests": refund_count,
            "denied_refunds": denied_count,
        }
    finally:
        db.close()


@tool
def get_order_details(order_number: str) -> dict:
    """Retrieve full details for an order by its order number (e.g. ORD-1001).
    Returns product info, dates, delivery status, pricing, and product type flags."""
    db = _get_db()
    try:
        order = db.query(Order).filter(Order.order_number == order_number.strip().upper()).first()
        if not order:
            return {"found": False, "message": f"No order found with number '{order_number}'."}

        customer = db.query(Customer).filter(Customer.id == order.customer_id).first()

        days_since_delivery = None
        if order.delivery_date:
            days_since_delivery = (datetime.now(timezone.utc).replace(tzinfo=None) - order.delivery_date).days

        past_refunds = db.query(Refund).filter(Refund.order_id == order.id).all()

        return {
            "found": True,
            "order_number": order.order_number,
            "customer_name": customer.name if customer else "Unknown",
            "customer_id": order.customer_id,
            "product_name": order.product_name,
            "product_category": order.product_category,
            "price": order.price,
            "shipping_cost": order.shipping_cost,
            "order_date": order.order_date.isoformat() if order.order_date else None,
            "ship_date": order.ship_date.isoformat() if order.ship_date else None,
            "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
            "days_since_delivery": days_since_delivery,
            "status": order.status,
            "payment_method": order.payment_method,
            "seller_name": order.seller_name,
            "tracking_number": order.tracking_number,
            "product_serial": order.product_serial,
            "is_digital": order.is_digital,
            "is_personalized": order.is_personalized,
            "is_clearance": order.is_clearance,
            "is_final_sale": order.is_final_sale,
            "existing_refund_requests": [
                {
                    "refund_number": r.refund_number,
                    "reason": r.reason,
                    "status": r.status,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in past_refunds
            ],
        }
    finally:
        db.close()


@tool
def check_refund_eligibility(order_number: str, reason: str) -> dict:
    """Check if an order is eligible for a refund based on ALL policy rules.
    Validates: 7-day window, eligible reasons, non-refundable categories, product condition, account status.
    Returns a detailed eligibility report with pass/fail for each rule."""
    db = _get_db()
    try:
        order = db.query(Order).filter(Order.order_number == order_number.strip().upper()).first()
        if not order:
            return {"eligible": False, "error": f"Order '{order_number}' not found."}

        customer = db.query(Customer).filter(Customer.id == order.customer_id).first()

        violations = []
        warnings = []
        checks = {}

        # Check 1: Account status (Section 15)
        if customer and customer.account_status == "flagged":
            violations.append("Account is FLAGGED for suspected fraud (Section 15). Requires human review.")
            checks["account_status"] = "FAIL"
        elif customer and customer.account_status == "suspended":
            violations.append("Account is SUSPENDED (Section 15). Refund requests denied.")
            checks["account_status"] = "FAIL"
        else:
            checks["account_status"] = "PASS"

        # Check 2: Order status - must be delivered for refund (Section 13)
        if order.status == OrderStatus.PROCESSING:
            warnings.append("Order has not shipped yet. Eligible for CANCELLATION only (Section 13).")
            checks["order_status"] = "CANCEL_ELIGIBLE"
        elif order.status == OrderStatus.SHIPPED or order.status == OrderStatus.IN_TRANSIT:
            violations.append("Order is in transit and not yet delivered. Cannot process refund until delivery is confirmed (Section 13).")
            checks["order_status"] = "FAIL"
        elif order.status == OrderStatus.CANCELLED:
            violations.append("Order is already cancelled.")
            checks["order_status"] = "FAIL"
        else:
            checks["order_status"] = "PASS"

        # Check 3: 7-day refund window (Section 5)
        if order.delivery_date:
            days_since = (datetime.now(timezone.utc).replace(tzinfo=None) - order.delivery_date).days
            if days_since > REFUND_WINDOW_DAYS:
                violations.append(
                    f"Outside the 7-day refund window. Delivered {days_since} days ago (Section 5)."
                )
                checks["refund_window"] = "FAIL"
            else:
                checks["refund_window"] = f"PASS ({days_since} of {REFUND_WINDOW_DAYS} days used)"
        elif order.status == OrderStatus.DELIVERED:
            warnings.append("Delivery date not recorded but order marked delivered.")
            checks["refund_window"] = "UNKNOWN"
        else:
            checks["refund_window"] = "N/A (not delivered)"

        # Check 4: Non-refundable categories (Section 4)
        if order.is_digital:
            violations.append("Digital products are non-refundable (Section 4).")
            checks["product_type"] = "FAIL"
        elif order.is_personalized:
            violations.append("Personalized/customized products are non-refundable (Section 4).")
            checks["product_type"] = "FAIL"
        elif order.is_clearance or order.is_final_sale:
            violations.append("Clearance/final-sale items are non-refundable (Section 4).")
            checks["product_type"] = "FAIL"
        elif order.product_category in ("software", "gift_card"):
            violations.append(f"{order.product_category.replace('_', ' ').title()} items are non-refundable (Section 4).")
            checks["product_type"] = "FAIL"
        else:
            checks["product_type"] = "PASS"

        # Check 5: Valid refund reason (Section 3)
        valid_reasons = [
            "defective", "damaged", "incorrect", "wrong item",
            "materially different", "not as described",
            "lost in shipment", "lost", "never received",
            "missing components", "missing parts", "incomplete",
        ]
        reason_lower = reason.strip().lower()
        reason_valid = any(vr in reason_lower for vr in valid_reasons)
        if not reason_valid:
            violations.append(
                f"Reason '{reason}' is not among the 6 eligible reasons: defective, damaged, "
                f"incorrect product, materially different, lost in shipment, missing components (Section 3)."
            )
            checks["reason"] = "FAIL"
        else:
            checks["reason"] = "PASS"

        eligible = len(violations) == 0

        return {
            "eligible": eligible,
            "order_number": order.order_number,
            "reason_provided": reason,
            "checks": checks,
            "violations": violations,
            "warnings": warnings,
            "recommendation": "APPROVE" if eligible else "DENY",
            "refund_amount": order.price if eligible else None,
            "note": "Original shipping charges are non-refundable unless company error (Section 9)." if eligible else None,
        }
    finally:
        db.close()


@tool
def check_fraud_risk(customer_id: int) -> dict:
    """Run fraud and abuse detection on a customer account.
    Analyzes refund frequency, return-fraud history, account flags (Sections 15, 24)."""
    db = _get_db()
    try:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return {"error": f"Customer ID {customer_id} not found."}

        all_refunds = db.query(Refund).filter(Refund.customer_id == customer_id).all()
        denied_refunds = [r for r in all_refunds if r.status == RefundStatus.DENIED]

        ninety_days_ago = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=90)
        recent_refunds = [r for r in all_refunds if r.created_at and r.created_at > ninety_days_ago]

        risk_factors = []
        risk_score = 0

        if customer.account_status == "flagged":
            risk_factors.append("Account is FLAGGED for suspected fraud.")
            risk_score += 50
        elif customer.account_status == "suspended":
            risk_factors.append("Account is SUSPENDED.")
            risk_score += 100

        if customer.notes and any(kw in customer.notes.lower() for kw in ["fraud", "suspicious", "investigation"]):
            risk_factors.append(f"Account notes contain fraud indicators: '{customer.notes}'")
            risk_score += 30

        if len(denied_refunds) >= 2:
            risk_factors.append(f"{len(denied_refunds)} previously denied refund requests (Section 24).")
            risk_score += 20 * len(denied_refunds)

        if len(recent_refunds) >= 3:
            risk_factors.append(f"{len(recent_refunds)} refund requests in the last 90 days -- unusually high.")
            risk_score += 25

        fraud_keywords = ["different item", "empty box", "counterfeit", "fraud"]
        for r in denied_refunds:
            if r.denial_reasons and any(kw in r.denial_reasons.lower() for kw in fraud_keywords):
                risk_factors.append(f"Prior denial (REF {r.refund_number}): {r.denial_reasons}")
                risk_score += 30

        risk_level = "low"
        if risk_score >= 70:
            risk_level = "high"
        elif risk_score >= 30:
            risk_level = "medium"

        return {
            "customer_id": customer_id,
            "customer_name": customer.name,
            "account_status": customer.account_status,
            "risk_score": min(risk_score, 100),
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "total_refund_requests": len(all_refunds),
            "denied_refunds": len(denied_refunds),
            "recent_refunds_90d": len(recent_refunds),
            "recommendation": "BLOCK" if risk_level == "high" else "REVIEW" if risk_level == "medium" else "PROCEED",
        }
    finally:
        db.close()


@tool
def verify_claim_evidence(order_number: str, claim_type: str) -> dict:
    """Verify customer-submitted evidence for counterfeit claims (Section 21),
    package tampering (Section 25), or delivery disputes.
    In production this would analyze uploaded images/docs -- here it simulates verification."""
    db = _get_db()
    try:
        order = db.query(Order).filter(Order.order_number == order_number.strip().upper()).first()
        if not order:
            return {"verified": False, "error": f"Order '{order_number}' not found."}

        claim_lower = claim_type.strip().lower()

        if "counterfeit" in claim_lower or "fake" in claim_lower or "not authentic" in claim_lower:
            if order.seller_name and order.seller_name != "Direct":
                return {
                    "claim_type": "counterfeit",
                    "order_number": order.order_number,
                    "verification_status": "pending_investigation",
                    "seller": order.seller_name,
                    "serial_number": order.product_serial,
                    "message": (
                        "Counterfeit claim received. Third-party seller investigation initiated (Section 21). "
                        "Customer should provide: product photographs, packaging images, serial numbers, "
                        "and any authentication reports. This may be escalated to human review."
                    ),
                    "required_evidence": ["product_photos", "packaging_images", "serial_numbers", "authentication_reports"],
                    "next_step": "escalate_to_human",
                }
            else:
                return {
                    "claim_type": "counterfeit",
                    "order_number": order.order_number,
                    "verification_status": "requires_evidence",
                    "message": (
                        "Counterfeit claim received for a directly-sold product. "
                        "Customer must provide photographs and authentication documentation (Section 21)."
                    ),
                    "required_evidence": ["product_photos", "packaging_images", "serial_numbers"],
                }

        elif "tamper" in claim_lower or "opened" in claim_lower or "empty" in claim_lower or "missing content" in claim_lower:
            return {
                "claim_type": "package_tampering",
                "order_number": order.order_number,
                "verification_status": "pending_evidence",
                "tracking_number": order.tracking_number,
                "message": (
                    "Package tampering / delivery dispute claim received (Section 25). "
                    "Customer must provide: delivery photographs, unboxing video, packaging images, "
                    "and carrier information for verification."
                ),
                "required_evidence": ["delivery_photos", "unboxing_video", "packaging_images", "carrier_info"],
            }

        else:
            return {
                "claim_type": claim_type,
                "order_number": order.order_number,
                "verification_status": "standard_review",
                "message": "Standard claim verification. Customer should provide photos and description of the issue.",
                "required_evidence": ["product_photos", "issue_description"],
            }
    finally:
        db.close()


@tool
def process_refund(order_number: str, reason: str, refund_type: str = "full") -> dict:
    """Initiate a return and refund request for an eligible order.
    This schedules a return -- the actual refund is processed AFTER the item is returned and inspected (Sections 8, 9, 12, 22).
    For lost-in-shipment cases, no return is required.
    Refund types: full, partial, replacement, store_credit."""
    db = _get_db()
    try:
        order = db.query(Order).filter(Order.order_number == order_number.strip().upper()).first()
        if not order:
            return {"success": False, "error": f"Order '{order_number}' not found."}

        refund_amount = order.price
        if refund_type == "partial":
            refund_amount = order.price * 0.8

        existing = db.query(Refund).filter(
            Refund.order_id == order.id,
            Refund.status.in_([RefundStatus.APPROVED, RefundStatus.COMPLETED, RefundStatus.PROCESSING, RefundStatus.PENDING]),
        ).first()
        if existing:
            return {
                "success": False,
                "error": f"A return/refund request ({existing.refund_number}) is already {existing.status} for this order.",
            }

        reason_lower = reason.strip().lower()
        is_lost = any(kw in reason_lower for kw in ["lost", "never received", "lost in shipment"])
        is_company_error = any(kw in reason_lower for kw in ["incorrect", "wrong item", "defective", "damaged", "missing component", "missing part"])

        refund_count = db.query(Refund).count() + 1
        refund = Refund(
            refund_number=f"REF-{6000 + refund_count}",
            order_id=order.id,
            customer_id=order.customer_id,
            reason=reason,
            status=RefundStatus.PENDING if not is_lost else RefundStatus.APPROVED,
            amount=refund_amount,
            policy_sections_cited="3, 8, 9, 22",
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        db.add(refund)
        db.commit()

        if is_lost:
            return {
                "success": True,
                "refund_number": refund.refund_number,
                "order_number": order.order_number,
                "status": "APPROVED",
                "return_required": False,
                "refund_type": refund_type,
                "refund_amount": refund_amount,
                "payment_method": order.payment_method,
                "message": (
                    f"Since the package was lost in shipment, no return is required. "
                    f"Refund of ${refund_amount:.2f} has been approved and will be issued to the original "
                    f"{order.payment_method.replace('_', ' ')}. "
                    f"Please allow 7-15 business days for processing (Section 12)."
                ),
            }

        return {
            "success": True,
            "refund_number": refund.refund_number,
            "order_number": order.order_number,
            "status": "RETURN_SCHEDULED",
            "return_required": True,
            "return_shipping_paid_by": "company" if is_company_error else "customer",
            "refund_type": refund_type,
            "refund_amount": refund_amount,
            "original_price": order.price,
            "payment_method": order.payment_method,
            "message": (
                f"Return request initiated. Reference number: {refund.refund_number}. "
                f"Return shipping instructions will be sent to the customer's email. "
                f"{'Return shipping is covered by ShopEase since this is a company error.' if is_company_error else 'The customer is responsible for return shipping costs (Section 9).'} "
                f"The product must be returned in the same condition as received, with original packaging and accessories (Section 8). "
                f"Once received, our inspection team will review the item (Section 22). "
                f"If the return passes inspection, a refund of ${refund_amount:.2f} will be processed to the original "
                f"{order.payment_method.replace('_', ' ')}. Processing takes 7-15 business days after approval (Section 12)."
            ),
            "shipping_note": "Original shipping charges are non-refundable (Section 9)." if order.shipping_cost > 0 else None,
        }
    finally:
        db.close()


@tool
def deny_refund(order_number: str, violation_reasons: str, policy_sections: str) -> dict:
    """Deny a refund request with specific policy section citations.
    violation_reasons: explanation of why the refund is denied.
    policy_sections: comma-separated section numbers (e.g. '4, 5')."""
    db = _get_db()
    try:
        order = db.query(Order).filter(Order.order_number == order_number.strip().upper()).first()
        if not order:
            return {"success": False, "error": f"Order '{order_number}' not found."}

        refund_count = db.query(Refund).count() + 1
        refund = Refund(
            refund_number=f"REF-{6000 + refund_count}",
            order_id=order.id,
            customer_id=order.customer_id,
            reason="Refund request denied",
            status=RefundStatus.DENIED,
            amount=None,
            policy_sections_cited=policy_sections,
            denial_reasons=violation_reasons,
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
            resolved_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        db.add(refund)
        db.commit()

        return {
            "success": True,
            "refund_number": refund.refund_number,
            "order_number": order.order_number,
            "status": "DENIED",
            "violation_reasons": violation_reasons,
            "policy_sections_cited": policy_sections,
            "message": f"Refund request denied per policy sections {policy_sections}.",
        }
    finally:
        db.close()


@tool
def cancel_order(order_number: str) -> dict:
    """Cancel a pre-shipment order (Section 13). Only works if order status is 'processing'.
    Orders that have entered fulfillment, packaging, or shipping cannot be cancelled."""
    db = _get_db()
    try:
        order = db.query(Order).filter(Order.order_number == order_number.strip().upper()).first()
        if not order:
            return {"success": False, "error": f"Order '{order_number}' not found."}

        if order.status != OrderStatus.PROCESSING:
            return {
                "success": False,
                "error": (
                    f"Order cannot be cancelled. Current status: {order.status}. "
                    f"Orders can only be cancelled before processing or shipment (Section 13)."
                ),
            }

        order.status = OrderStatus.CANCELLED
        db.commit()

        return {
            "success": True,
            "order_number": order.order_number,
            "previous_status": "processing",
            "new_status": "cancelled",
            "refund_amount": order.price + order.shipping_cost,
            "message": (
                f"Order {order.order_number} has been successfully cancelled. "
                f"A full refund of ${order.price + order.shipping_cost:.2f} will be issued "
                f"to the original {order.payment_method.replace('_', ' ')}. "
                f"Please allow 7-15 business days for processing."
            ),
        }
    finally:
        db.close()


@tool
def escalate_to_human(order_number: str, reason: str) -> dict:
    """Escalate a complex case to human review (Section 7, 19).
    Used for counterfeit verification, disputed inspections, fraud investigations,
    or cases where automated decision-making is insufficient."""
    db = _get_db()
    try:
        order = db.query(Order).filter(Order.order_number == order_number.strip().upper()).first()
        if not order:
            return {"success": False, "error": f"Order '{order_number}' not found."}

        existing_pending = db.query(Refund).filter(
            Refund.order_id == order.id,
            Refund.status == RefundStatus.ESCALATED,
        ).first()
        if existing_pending:
            return {
                "success": True,
                "already_escalated": True,
                "refund_number": existing_pending.refund_number,
                "message": "This case has already been escalated to a human reviewer.",
            }

        refund_count = db.query(Refund).count() + 1
        refund = Refund(
            refund_number=f"REF-{6000 + refund_count}",
            order_id=order.id,
            customer_id=order.customer_id,
            reason=reason,
            status=RefundStatus.ESCALATED,
            amount=None,
            policy_sections_cited="7, 19",
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        db.add(refund)
        db.commit()

        return {
            "success": True,
            "refund_number": refund.refund_number,
            "order_number": order.order_number,
            "status": "ESCALATED",
            "reason": reason,
            "message": (
                f"Case escalated to a human reviewer (Sections 7, 19). "
                f"Reference number: {refund.refund_number}. "
                f"A specialist will review the case and follow up within 2-3 business days."
            ),
        }
    finally:
        db.close()


@tool
def get_refund_policy() -> str:
    """Retrieve the full 26-section refund policy document for reference."""
    try:
        return settings.policy_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return "Error: Refund policy document not found."


ALL_TOOLS = [
    lookup_customer,
    get_order_details,
    check_refund_eligibility,
    check_fraud_risk,
    verify_claim_evidence,
    process_refund,
    deny_refund,
    cancel_order,
    escalate_to_human,
    get_refund_policy,
]
