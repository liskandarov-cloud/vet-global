from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from enum import Enum

class UserRole(str, Enum):
    BUYER = 'buyer'
    SELLER = 'seller'
    ADMIN = 'admin'

class OrderStatus(str, Enum):
    PENDING = 'pending'
    CONFIRMED = 'confirmed'
    PROCESSING = 'processing'
    SHIPPED = 'shipped'
    DELIVERED = 'delivered'
    CANCELLED = 'cancelled'

class User(BaseModel):
    model_config = ConfigDict(extra='ignore')
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    full_name: str
    phone: str
    company: Optional[str] = None
    inn: Optional[str] = None
    role: UserRole
    is_verified: bool = False
    vet_points_balance: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    phone: str
    company: Optional[str] = None
    inn: Optional[str] = None
    role: UserRole

class UserLogin(BaseModel):
    email: str
    password: str

class Product(BaseModel):
    model_config = ConfigDict(extra='ignore')
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    name_uz: Optional[str] = None
    description: str
    description_uz: Optional[str] = None
    category: str
    price: float
    active_substance: Optional[str] = None
    manufacturer: Optional[str] = None
    form: Optional[str] = None
    animal_type: Optional[str] = None
    in_stock: bool = True
    min_order: int = 1
    images: List[str] = []
    certificates: List[str] = []
    seller_id: str
    is_promotion: bool = False
    promotion_text: Optional[str] = None
    rating: float = 0.0
    reviews_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    name_uz: Optional[str] = None
    description: str
    description_uz: Optional[str] = None
    category: str
    price: float
    active_substance: Optional[str] = None
    manufacturer: Optional[str] = None
    form: Optional[str] = None
    animal_type: Optional[str] = None
    in_stock: bool = True
    min_order: int = 1
    images: List[str] = []
    certificates: List[str] = []
    is_promotion: bool = False
    promotion_text: Optional[str] = None

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price: float

class Order(BaseModel):
    model_config = ConfigDict(extra='ignore')
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    buyer_id: str
    buyer_name: str
    buyer_phone: str
    buyer_company: Optional[str] = None
    items: List[OrderItem]
    total: float
    status: OrderStatus = OrderStatus.PENDING
    vet_points_earned: float = 0.0
    vet_points_used: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    buyer_name: Optional[str] = None
    buyer_phone: Optional[str] = None
    buyer_company: Optional[str] = None
    items: List[OrderItem]
    vet_points_used: float = 0.0

class Category(BaseModel):
    model_config = ConfigDict(extra='ignore')
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    name_uz: str
    slug: str
    icon: Optional[str] = None

class Review(BaseModel):
    model_config = ConfigDict(extra='ignore')
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    buyer_id: str
    buyer_name: str
    rating: int
    comment: str
    is_approved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator('rating')
    @classmethod
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Rating must be between 1 and 5')
        return v

class ReviewCreate(BaseModel):
    product_id: str
    rating: int
    comment: str

class VetPointsTransaction(BaseModel):
    model_config = ConfigDict(extra='ignore')
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    amount: float
    type: str
    description: str
    order_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BlogPost(BaseModel):
    model_config = ConfigDict(extra='ignore')
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    title_uz: str
    content: str
    content_uz: str
    slug: str
    image: Optional[str] = None
    author_id: str
    author_name: str
    published: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
