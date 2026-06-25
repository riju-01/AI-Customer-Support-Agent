"""Seed the CRM database with 15 customer profiles designed to exercise all 26 policy sections."""

from datetime import datetime, timedelta
from .db import SessionLocal, init_db
from .models import Customer, Order, Refund, AccountStatus, OrderStatus, RefundStatus

NOW = datetime.now()


def days_ago(n: int) -> datetime:
    return NOW - timedelta(days=n)


CUSTOMERS = [
    # --- ELIGIBLE: Defective / Damaged (Section 3) ---
    {
        "customer": {
            "name": "Alice Johnson",
            "email": "alice.johnson@email.com",
            "phone": "555-0101",
            "account_status": AccountStatus.ACTIVE,
            "notes": "Loyal customer, 2-year account."
        },
        "orders": [{
            "order_number": "ORD-1001",
            "product_name": "Wireless Bluetooth Headphones",
            "product_category": "electronics",
            "price": 79.99,
            "shipping_cost": 5.99,
            "order_date": days_ago(10),
            "ship_date": days_ago(8),
            "delivery_date": days_ago(5),
            "status": OrderStatus.DELIVERED,
            "payment_method": "credit_card",
            "tracking_number": "TRK-8821001",
            "product_serial": "SN-BT-44201",
        }],
        "refunds": [],
    },
    {
        "customer": {
            "name": "Brian Martinez",
            "email": "brian.martinez@email.com",
            "phone": "555-0102",
            "account_status": AccountStatus.ACTIVE,
            "notes": None
        },
        "orders": [{
            "order_number": "ORD-1002",
            "product_name": "Ceramic Coffee Mug Set (4-pack)",
            "product_category": "home_garden",
            "price": 34.99,
            "shipping_cost": 4.99,
            "order_date": days_ago(9),
            "ship_date": days_ago(7),
            "delivery_date": days_ago(4),
            "status": OrderStatus.DELIVERED,
            "payment_method": "debit_card",
            "tracking_number": "TRK-8821002",
            "product_serial": None,
        }],
        "refunds": [],
    },

    # --- ELIGIBLE: Incorrect Product (Section 3) ---
    {
        "customer": {
            "name": "Clara Chen",
            "email": "clara.chen@email.com",
            "phone": "555-0103",
            "account_status": AccountStatus.ACTIVE,
            "notes": None
        },
        "orders": [{
            "order_number": "ORD-1003",
            "product_name": "Women's Running Shoes Size 8",
            "product_category": "clothing",
            "price": 119.99,
            "shipping_cost": 0.0,
            "order_date": days_ago(8),
            "ship_date": days_ago(6),
            "delivery_date": days_ago(3),
            "status": OrderStatus.DELIVERED,
            "payment_method": "credit_card",
            "tracking_number": "TRK-8821003",
            "product_serial": None,
        }],
        "refunds": [],
    },

    # --- ELIGIBLE: Lost in Shipment (Section 3) ---
    {
        "customer": {
            "name": "David Okafor",
            "email": "david.okafor@email.com",
            "phone": "555-0104",
            "account_status": AccountStatus.ACTIVE,
            "notes": None
        },
        "orders": [{
            "order_number": "ORD-1004",
            "product_name": "Portable Bluetooth Speaker",
            "product_category": "electronics",
            "price": 49.99,
            "shipping_cost": 5.99,
            "order_date": days_ago(15),
            "ship_date": days_ago(13),
            "delivery_date": None,
            "status": OrderStatus.IN_TRANSIT,
            "payment_method": "paypal",
            "tracking_number": "TRK-8821004",
            "product_serial": "SN-SPK-77104",
        }],
        "refunds": [],
    },

    # --- ELIGIBLE: Missing Components (Section 3) ---
    {
        "customer": {
            "name": "Emily Watson",
            "email": "emily.watson@email.com",
            "phone": "555-0105",
            "account_status": AccountStatus.ACTIVE,
            "notes": None
        },
        "orders": [{
            "order_number": "ORD-1005",
            "product_name": "Home Security Camera Kit (3-camera)",
            "product_category": "electronics",
            "price": 199.99,
            "shipping_cost": 0.0,
            "order_date": days_ago(10),
            "ship_date": days_ago(8),
            "delivery_date": days_ago(5),
            "status": OrderStatus.DELIVERED,
            "payment_method": "credit_card",
            "tracking_number": "TRK-8821005",
            "product_serial": "SN-CAM-99305",
        }],
        "refunds": [],
    },

    # --- DENY: Outside 7-Day Window (Section 5) ---
    {
        "customer": {
            "name": "Frank Liu",
            "email": "frank.liu@email.com",
            "phone": "555-0106",
            "account_status": AccountStatus.ACTIVE,
            "notes": None
        },
        "orders": [{
            "order_number": "ORD-1006",
            "product_name": "Stainless Steel Water Bottle",
            "product_category": "home_garden",
            "price": 24.99,
            "shipping_cost": 3.99,
            "order_date": days_ago(20),
            "ship_date": days_ago(18),
            "delivery_date": days_ago(14),
            "status": OrderStatus.DELIVERED,
            "payment_method": "credit_card",
            "tracking_number": "TRK-8821006",
            "product_serial": None,
        }],
        "refunds": [],
    },
    {
        "customer": {
            "name": "Grace Kim",
            "email": "grace.kim@email.com",
            "phone": "555-0107",
            "account_status": AccountStatus.ACTIVE,
            "notes": None
        },
        "orders": [{
            "order_number": "ORD-1007",
            "product_name": "Yoga Mat Premium",
            "product_category": "clothing",
            "price": 45.99,
            "shipping_cost": 5.99,
            "order_date": days_ago(25),
            "ship_date": days_ago(23),
            "delivery_date": days_ago(18),
            "status": OrderStatus.DELIVERED,
            "payment_method": "debit_card",
            "tracking_number": "TRK-8821007",
            "product_serial": None,
        }],
        "refunds": [],
    },

    # --- DENY: Non-Refundable - Digital Product (Section 4) ---
    {
        "customer": {
            "name": "Henry Patel",
            "email": "henry.patel@email.com",
            "phone": "555-0108",
            "account_status": AccountStatus.ACTIVE,
            "notes": None
        },
        "orders": [{
            "order_number": "ORD-1008",
            "product_name": "Professional Photo Editing Software License",
            "product_category": "software",
            "price": 149.99,
            "shipping_cost": 0.0,
            "order_date": days_ago(3),
            "ship_date": None,
            "delivery_date": days_ago(3),
            "status": OrderStatus.DELIVERED,
            "payment_method": "credit_card",
            "tracking_number": None,
            "product_serial": "LIC-PHOTO-2026-0108",
            "is_digital": True,
        }],
        "refunds": [],
    },

    # --- DENY: Non-Refundable - Clearance / Final Sale (Section 4) ---
    {
        "customer": {
            "name": "Isabella Rossi",
            "email": "isabella.rossi@email.com",
            "phone": "555-0109",
            "account_status": AccountStatus.ACTIVE,
            "notes": None
        },
        "orders": [{
            "order_number": "ORD-1009",
            "product_name": "Winter Jacket (Clearance)",
            "product_category": "clearance",
            "price": 39.99,
            "shipping_cost": 4.99,
            "order_date": days_ago(8),
            "ship_date": days_ago(6),
            "delivery_date": days_ago(3),
            "status": OrderStatus.DELIVERED,
            "payment_method": "credit_card",
            "tracking_number": "TRK-8821009",
            "product_serial": None,
            "is_final_sale": True,
            "is_clearance": True,
        }],
        "refunds": [],
    },

    # --- DENY: Used / Altered Product (Section 4 + 8) ---
    {
        "customer": {
            "name": "James Cooper",
            "email": "james.cooper@email.com",
            "phone": "555-0110",
            "account_status": AccountStatus.ACTIVE,
            "notes": "Previous return: product showed signs of heavy use."
        },
        "orders": [{
            "order_number": "ORD-1010",
            "product_name": "Mechanical Gaming Keyboard",
            "product_category": "electronics",
            "price": 89.99,
            "shipping_cost": 5.99,
            "order_date": days_ago(9),
            "ship_date": days_ago(7),
            "delivery_date": days_ago(4),
            "status": OrderStatus.DELIVERED,
            "payment_method": "debit_card",
            "tracking_number": "TRK-8821010",
            "product_serial": "SN-KB-66210",
        }],
        "refunds": [{
            "refund_number": "REF-5001",
            "reason": "Product not as expected",
            "status": RefundStatus.DENIED,
            "amount": None,
            "policy_sections_cited": "4, 8",
            "denial_reasons": "Returned keyboard showed signs of extended use, keycaps worn, missing original packaging.",
            "created_at": days_ago(30),
            "resolved_at": days_ago(28),
        }],
    },

    # --- EDGE CASE: Suspected Counterfeit (Section 21) ---
    {
        "customer": {
            "name": "Karen Wright",
            "email": "karen.wright@email.com",
            "phone": "555-0111",
            "account_status": AccountStatus.ACTIVE,
            "notes": None
        },
        "orders": [{
            "order_number": "ORD-1011",
            "product_name": "Designer Leather Handbag",
            "product_category": "clothing",
            "price": 299.99,
            "shipping_cost": 0.0,
            "order_date": days_ago(8),
            "ship_date": days_ago(6),
            "delivery_date": days_ago(3),
            "status": OrderStatus.DELIVERED,
            "payment_method": "credit_card",
            "tracking_number": "TRK-8821011",
            "product_serial": "SN-BAG-00211",
            "seller_name": "LuxGoods Marketplace",
        }],
        "refunds": [],
    },

    # --- EDGE CASE: Return Fraud / Flagged Account (Section 15 + 24) ---
    {
        "customer": {
            "name": "Leo Mendez",
            "email": "leo.mendez@email.com",
            "phone": "555-0112",
            "account_status": AccountStatus.FLAGGED,
            "notes": "FRAUD ALERT: 3 of last 5 returns contained different items than originally shipped. Under investigation."
        },
        "orders": [{
            "order_number": "ORD-1012",
            "product_name": "Noise-Cancelling Earbuds Pro",
            "product_category": "electronics",
            "price": 159.99,
            "shipping_cost": 0.0,
            "order_date": days_ago(7),
            "ship_date": days_ago(5),
            "delivery_date": days_ago(2),
            "status": OrderStatus.DELIVERED,
            "payment_method": "credit_card",
            "tracking_number": "TRK-8821012",
            "product_serial": "SN-EAR-33112",
        }],
        "refunds": [
            {
                "refund_number": "REF-5002",
                "reason": "Defective product",
                "status": RefundStatus.DENIED,
                "amount": None,
                "policy_sections_cited": "15, 24",
                "denial_reasons": "Return inspection: item returned was different from item shipped. Fraud flag raised.",
                "created_at": days_ago(60),
                "resolved_at": days_ago(58),
            },
            {
                "refund_number": "REF-5003",
                "reason": "Damaged product",
                "status": RefundStatus.DENIED,
                "amount": None,
                "policy_sections_cited": "15, 24",
                "denial_reasons": "Return inspection: empty box returned. Account flagged for fraud.",
                "created_at": days_ago(40),
                "resolved_at": days_ago(38),
            },
            {
                "refund_number": "REF-5004",
                "reason": "Product not as described",
                "status": RefundStatus.APPROVED,
                "amount": 45.00,
                "policy_sections_cited": "3",
                "denial_reasons": None,
                "created_at": days_ago(90),
                "resolved_at": days_ago(85),
            },
        ],
    },

    # --- EDGE CASE: Package Tampering (Section 25) ---
    {
        "customer": {
            "name": "Mia Thompson",
            "email": "mia.thompson@email.com",
            "phone": "555-0113",
            "account_status": AccountStatus.ACTIVE,
            "notes": None
        },
        "orders": [{
            "order_number": "ORD-1013",
            "product_name": "Smart Watch Series X",
            "product_category": "electronics",
            "price": 249.99,
            "shipping_cost": 0.0,
            "order_date": days_ago(7),
            "ship_date": days_ago(5),
            "delivery_date": days_ago(2),
            "status": OrderStatus.DELIVERED,
            "payment_method": "credit_card",
            "tracking_number": "TRK-8821013",
            "product_serial": "SN-WATCH-55113",
        }],
        "refunds": [],
    },

    # --- EDGE CASE: Pre-Shipment Cancellation (Section 13) ---
    {
        "customer": {
            "name": "Nathan Brooks",
            "email": "nathan.brooks@email.com",
            "phone": "555-0114",
            "account_status": AccountStatus.ACTIVE,
            "notes": None
        },
        "orders": [{
            "order_number": "ORD-1014",
            "product_name": "Ergonomic Office Chair",
            "product_category": "home_garden",
            "price": 349.99,
            "shipping_cost": 0.0,
            "order_date": days_ago(1),
            "ship_date": None,
            "delivery_date": None,
            "status": OrderStatus.PROCESSING,
            "payment_method": "credit_card",
            "tracking_number": None,
            "product_serial": None,
        }],
        "refunds": [],
    },

    # --- EDGE CASE: In-Transit, Not Yet Delivered (Section 13) ---
    {
        "customer": {
            "name": "Olivia Singh",
            "email": "olivia.singh@email.com",
            "phone": "555-0115",
            "account_status": AccountStatus.ACTIVE,
            "notes": None
        },
        "orders": [{
            "order_number": "ORD-1015",
            "product_name": "Standing Desk Converter",
            "product_category": "home_garden",
            "price": 189.99,
            "shipping_cost": 9.99,
            "order_date": days_ago(5),
            "ship_date": days_ago(3),
            "delivery_date": None,
            "status": OrderStatus.IN_TRANSIT,
            "payment_method": "debit_card",
            "tracking_number": "TRK-8821015",
            "product_serial": None,
        }],
        "refunds": [],
    },
]


def seed_database():
    """Seed the database with 15 test customers and their orders/refunds."""
    init_db()
    db = SessionLocal()

    if db.query(Customer).count() > 0:
        print("Database already seeded. Skipping.")
        db.close()
        return

    try:
        for entry in CUSTOMERS:
            customer = Customer(**entry["customer"])
            db.add(customer)
            db.flush()

            for order_data in entry["orders"]:
                order = Order(customer_id=customer.id, **order_data)
                db.add(order)
                db.flush()

                for refund_data in entry.get("refunds", []):
                    refund = Refund(
                        order_id=order.id,
                        customer_id=customer.id,
                        **refund_data,
                    )
                    db.add(refund)

        db.commit()
        print(f"Seeded {len(CUSTOMERS)} customers with orders and refund history.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
