from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .db import Base


class AccountStatus(str, enum.Enum):
    ACTIVE = "active"
    FLAGGED = "flagged"
    SUSPENDED = "suspended"


class OrderStatus(str, enum.Enum):
    PROCESSING = "processing"
    SHIPPED = "shipped"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class ProductCategory(str, enum.Enum):
    ELECTRONICS = "electronics"
    CLOTHING = "clothing"
    HOME_GARDEN = "home_garden"
    DIGITAL = "digital"
    PERSONALIZED = "personalized"
    CLEARANCE = "clearance"
    SOFTWARE = "software"
    GIFT_CARD = "gift_card"


class RefundStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ESCALATED = "escalated"


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    phone = Column(String, nullable=True)
    account_status = Column(String, default=AccountStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)

    orders = relationship("Order", back_populates="customer")
    refunds = relationship("Refund", back_populates="customer")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    product_name = Column(String, nullable=False)
    product_category = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    shipping_cost = Column(Float, default=0.0)
    order_date = Column(DateTime, nullable=False)
    ship_date = Column(DateTime, nullable=True)
    delivery_date = Column(DateTime, nullable=True)
    status = Column(String, default=OrderStatus.PROCESSING)
    payment_method = Column(String, default="credit_card")
    seller_name = Column(String, default="Direct")
    is_final_sale = Column(Boolean, default=False)
    is_digital = Column(Boolean, default=False)
    is_personalized = Column(Boolean, default=False)
    is_clearance = Column(Boolean, default=False)
    tracking_number = Column(String, nullable=True)
    product_serial = Column(String, nullable=True)

    customer = relationship("Customer", back_populates="orders")
    refunds = relationship("Refund", back_populates="order")


class Refund(Base):
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True, index=True)
    refund_number = Column(String, unique=True, nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    reason = Column(String, nullable=False)
    status = Column(String, default=RefundStatus.PENDING)
    amount = Column(Float, nullable=True)
    policy_sections_cited = Column(String, nullable=True)
    denial_reasons = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    order = relationship("Order", back_populates="refunds")
    customer = relationship("Customer", back_populates="refunds")
