"""Admin REST + SSE endpoints for the reasoning dashboard."""

import asyncio
import json
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from ..logs.logger import reasoning_logger
from ..database.db import SessionLocal
from ..database.models import Customer, Order, Refund

router = APIRouter(prefix="/api/admin")


@router.get("/sessions")
async def get_sessions():
    """Return all chat sessions."""
    return reasoning_logger.get_all_sessions()


@router.get("/sessions/{session_id}/logs")
async def get_session_logs(session_id: str):
    """Return reasoning logs for a specific session."""
    return reasoning_logger.get_session_logs(session_id)


@router.get("/customers")
async def get_customers():
    """Return all customers from the CRM database."""
    db = SessionLocal()
    try:
        customers = db.query(Customer).all()
        return [
            {
                "id": c.id,
                "name": c.name,
                "email": c.email,
                "phone": c.phone,
                "account_status": c.account_status,
                "notes": c.notes,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in customers
        ]
    finally:
        db.close()


@router.get("/customers/{customer_id}")
async def get_customer(customer_id: int):
    """Return a single customer with their orders and refund history."""
    db = SessionLocal()
    try:
        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer:
            return {"error": "Customer not found"}

        orders = db.query(Order).filter(Order.customer_id == customer_id).all()
        refunds = db.query(Refund).filter(Refund.customer_id == customer_id).all()

        return {
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
            "account_status": customer.account_status,
            "notes": customer.notes,
            "orders": [
                {
                    "order_number": o.order_number,
                    "product_name": o.product_name,
                    "product_category": o.product_category,
                    "price": o.price,
                    "status": o.status,
                    "order_date": o.order_date.isoformat() if o.order_date else None,
                    "delivery_date": o.delivery_date.isoformat() if o.delivery_date else None,
                    "is_digital": o.is_digital,
                    "is_final_sale": o.is_final_sale,
                    "is_clearance": o.is_clearance,
                    "is_personalized": o.is_personalized,
                }
                for o in orders
            ],
            "refunds": [
                {
                    "refund_number": r.refund_number,
                    "reason": r.reason,
                    "status": r.status,
                    "amount": r.amount,
                    "policy_sections_cited": r.policy_sections_cited,
                    "denial_reasons": r.denial_reasons,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in refunds
            ],
        }
    finally:
        db.close()


@router.get("/orders")
async def get_orders():
    """Return all orders."""
    db = SessionLocal()
    try:
        orders = db.query(Order).all()
        return [
            {
                "order_number": o.order_number,
                "customer_id": o.customer_id,
                "product_name": o.product_name,
                "price": o.price,
                "status": o.status,
                "order_date": o.order_date.isoformat() if o.order_date else None,
                "delivery_date": o.delivery_date.isoformat() if o.delivery_date else None,
            }
            for o in orders
        ]
    finally:
        db.close()


@router.get("/actions")
async def get_actions():
    """Return all agent actions (refunds, escalations, cancellations, etc.)."""
    return reasoning_logger.get_actions()


@router.get("/stream")
async def admin_stream(request: Request):
    """SSE endpoint that streams reasoning logs to the admin dashboard in real-time."""
    queue = reasoning_logger.register_admin()

    async def event_stream():
        sessions = reasoning_logger.get_all_sessions()
        yield f"event: init\ndata: {json.dumps({'sessions': sessions})}\n\n"

        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=15)
                    yield f"event: {data.get('type', 'update')}\ndata: {json.dumps(data)}\n\n"
                except asyncio.TimeoutError:
                    yield f"event: ping\ndata: {json.dumps({'type': 'ping'})}\n\n"
        finally:
            reasoning_logger.unregister_admin(queue)

    return StreamingResponse(event_stream(), media_type="text/event-stream")
