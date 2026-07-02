from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from jose import jwt
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from models import (
    User, UserCreate, UserLogin, UserRole,
    Product, ProductCreate,
    Order, OrderCreate, OrderStatus, OrderItem,
    Category, Review, ReviewCreate,
    VetPointsTransaction, BlogPost
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, get_current_admin, get_current_seller, SECRET_KEY, ALGORITHM
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix='/api')

DEFAULT_CATEGORIES = [
    {'name': 'Вакцины', 'name_uz': 'Vaktsinalar', 'slug': 'vaccines'},
    {'name': 'Антибиотики', 'name_uz': 'Antibiotiklar', 'slug': 'antibiotics'},
    {'name': 'Витамины', 'name_uz': 'Vitaminlar', 'slug': 'vitamins'},
    {'name': 'Дезинфектанты', 'name_uz': 'Dezinfeksiyalash vositalari', 'slug': 'disinfectants'},
    {'name': 'Кормовые добавки', 'name_uz': 'Ozuqa qo\'shimchalari', 'slug': 'feed_additives'},
    {'name': 'Диагностика', 'name_uz': 'Diagnostika', 'slug': 'diagnostics'},
    {'name': 'Прочее', 'name_uz': 'Boshqalar', 'slug': 'other'}
]

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event('startup')
async def startup_db():
    categories_count = await db.categories.count_documents({})
    if categories_count == 0:
        for cat in DEFAULT_CATEGORIES:
            category = Category(
                id=str(uuid.uuid4()),
                name=cat['name'],
                name_uz=cat['name_uz'],
                slug=cat['slug']
            )
            await db.categories.insert_one(category.model_dump())
    
    admin_exists = await db.users.find_one({'role': 'admin'})
    if not admin_exists:
        admin_user = User(
            id=str(uuid.uuid4()),
            email='admin@vetglobal.com',
            full_name='Administrator',
            phone='+998901234567',
            role=UserRole.ADMIN,
            is_verified=True
        )
        admin_doc = admin_user.model_dump()
        admin_doc['password_hash'] = get_password_hash('admin123')
        admin_doc['created_at'] = admin_doc['created_at'].isoformat()
        await db.users.insert_one(admin_doc)
        logger.info('Admin user created: admin@vetglobal.com / admin123')

@api_router.post('/auth/register')
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({'email': user_data.email}, {'_id': 0})
    if existing_user:
        raise HTTPException(status_code=400, detail='Email already registered')
    
    user = User(
        id=str(uuid.uuid4()),
        email=user_data.email,
        full_name=user_data.full_name,
        phone=user_data.phone,
        company=user_data.company,
        inn=user_data.inn,
        role=user_data.role,
        is_verified=user_data.role == UserRole.BUYER
    )
    
    user_doc = user.model_dump()
    user_doc['password_hash'] = get_password_hash(user_data.password)
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    
    await db.users.insert_one(user_doc)
    
    token = create_access_token(data={'sub': user.id, 'role': user.role})
    
    return {
        'token': token,
        'user': {
            'id': user.id,
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role,
            'vet_points_balance': user.vet_points_balance
        }
    }

@api_router.post('/auth/login')
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({'email': credentials.email}, {'_id': 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail='Invalid credentials')
    
    if not verify_password(credentials.password, user_doc.get('password_hash', '')):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    
    user = User(**user_doc)
    token = create_access_token(data={'sub': user.id, 'role': user.role})
    
    return {
        'token': token,
        'user': {
            'id': user.id,
            'email': user.email,
            'full_name': user.full_name,
            'role': user.role,
            'vet_points_balance': user.vet_points_balance
        }
    }

@api_router.get('/auth/me')
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        'id': current_user.id,
        'email': current_user.email,
        'full_name': current_user.full_name,
        'phone': current_user.phone,
        'company': current_user.company,
        'role': current_user.role,
        'vet_points_balance': current_user.vet_points_balance,
        'is_verified': current_user.is_verified
    }

@api_router.get('/categories')
async def get_categories():
    categories = await db.categories.find({}, {'_id': 0}).to_list(100)
    return categories

@api_router.get('/products')
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    manufacturer: Optional[str] = None,
    animal_type: Optional[str] = None,
    in_stock: Optional[bool] = None,
    is_promotion: Optional[bool] = None,
    skip: int = 0,
    limit: int = 20
):
    query = {}
    
    if category:
        query['category'] = category
    if manufacturer:
        query['manufacturer'] = manufacturer
    if animal_type:
        query['animal_type'] = animal_type
    if in_stock is not None:
        query['in_stock'] = in_stock
    if is_promotion is not None:
        query['is_promotion'] = is_promotion
    if search:
        query['$or'] = [
            {'name': {'$regex': search, '$options': 'i'}},
            {'description': {'$regex': search, '$options': 'i'}},
            {'active_substance': {'$regex': search, '$options': 'i'}}
        ]
    
    total = await db.products.count_documents(query)
    products = await db.products.find(query, {'_id': 0}).skip(skip).limit(limit).to_list(limit)
    
    return {'total': total, 'products': products, 'skip': skip, 'limit': limit}

@api_router.get('/products/{product_id}')
async def get_product(product_id: str):
    product = await db.products.find_one({'id': product_id}, {'_id': 0})
    if not product:
        raise HTTPException(status_code=404, detail='Product not found')
    
    seller = await db.users.find_one({'id': product['seller_id']}, {'_id': 0})
    if seller:
        product['seller'] = {
            'id': seller['id'],
            'company': seller.get('company', ''),
            'is_verified': seller.get('is_verified', False)
        }
    
    return product

@api_router.post('/products')
async def create_product(
    product_data: ProductCreate,
    current_user: User = Depends(get_current_seller)
):
    product = Product(
        **product_data.model_dump(),
        seller_id=current_user.id
    )
    
    product_doc = product.model_dump()
    product_doc['created_at'] = product_doc['created_at'].isoformat()
    
    await db.products.insert_one(product_doc)
    return product

@api_router.put('/products/{product_id}')
async def update_product(
    product_id: str,
    product_data: ProductCreate,
    current_user: User = Depends(get_current_seller)
):
    existing = await db.products.find_one({'id': product_id}, {'_id': 0})
    if not existing:
        raise HTTPException(status_code=404, detail='Product not found')
    
    if existing['seller_id'] != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail='Not authorized')
    
    update_data = product_data.model_dump()
    await db.products.update_one({'id': product_id}, {'$set': update_data})
    
    updated = await db.products.find_one({'id': product_id}, {'_id': 0})
    return updated

@api_router.delete('/products/{product_id}')
async def delete_product(
    product_id: str,
    current_user: User = Depends(get_current_seller)
):
    existing = await db.products.find_one({'id': product_id}, {'_id': 0})
    if not existing:
        raise HTTPException(status_code=404, detail='Product not found')
    
    if existing['seller_id'] != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail='Not authorized')
    
    await db.products.delete_one({'id': product_id})
    return {'message': 'Product deleted'}

async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))):
    if not credentials:
        return None
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get('sub')
        if user_id is None:
            return None
        user_doc = await db.users.find_one({'id': user_id}, {'_id': 0})
        if user_doc is None:
            return None
        return User(**user_doc)
    except:
        return None

@api_router.post('/orders')
async def create_order(
    order_data: OrderCreate,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    if not order_data.items:
        raise HTTPException(status_code=400, detail='Order must have at least one item')
    
    total = sum(item.price * item.quantity for item in order_data.items)
    vet_points_used = 0
    final_total = total
    vet_points_earned = final_total * 0.01
    
    buyer_id = current_user.id if current_user else 'guest'
    buyer_name = order_data.buyer_name or (current_user.full_name if current_user else 'Guest')
    buyer_phone = order_data.buyer_phone or (current_user.phone if current_user else '')
    buyer_company = order_data.buyer_company or (current_user.company if current_user else None)
    
    order = Order(
        buyer_id=buyer_id,
        buyer_name=buyer_name,
        buyer_phone=buyer_phone,
        buyer_company=buyer_company,
        items=[item.model_dump() for item in order_data.items],
        total=final_total,
        vet_points_earned=vet_points_earned,
        vet_points_used=vet_points_used
    )
    
    order_doc = order.model_dump()
    order_doc['created_at'] = order_doc['created_at'].isoformat()
    order_doc['updated_at'] = order_doc['updated_at'].isoformat()
    
    await db.orders.insert_one(order_doc)
    
    return order

@api_router.get('/orders')
async def get_orders(
    status: Optional[OrderStatus] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    
    if current_user.role == UserRole.BUYER:
        query['buyer_id'] = current_user.id
    elif current_user.role == UserRole.SELLER:
        products = await db.products.find({'seller_id': current_user.id}, {'id': 1, '_id': 0}).to_list(1000)
        product_ids = [p['id'] for p in products]
        query['items.product_id'] = {'$in': product_ids}
    
    if status:
        query['status'] = status
    
    orders = await db.orders.find(query, {'_id': 0}).sort('created_at', -1).to_list(100)
    return orders

@api_router.get('/orders/{order_id}')
async def get_order(order_id: str, current_user: User = Depends(get_current_user)):
    order = await db.orders.find_one({'id': order_id}, {'_id': 0})
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    
    if current_user.role == UserRole.BUYER and order['buyer_id'] != current_user.id:
        raise HTTPException(status_code=403, detail='Not authorized')
    
    return order

@api_router.patch('/orders/{order_id}/status')
async def update_order_status(
    order_id: str,
    status: OrderStatus,
    current_user: User = Depends(get_current_seller)
):
    order = await db.orders.find_one({'id': order_id}, {'_id': 0})
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    
    await db.orders.update_one(
        {'id': order_id},
        {
            '$set': {
                'status': status,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if status == OrderStatus.DELIVERED and order['buyer_id'] != 'guest':
        already_earned = await db.vetpoints_transactions.find_one({
            'order_id': order_id,
            'type': 'earned'
        })
        
        if not already_earned:
            vet_points = order.get('vet_points_earned', 0)
            if vet_points > 0:
                await db.users.update_one(
                    {'id': order['buyer_id']},
                    {'$inc': {'vet_points_balance': vet_points}}
                )
                
                transaction = VetPointsTransaction(
                    user_id=order['buyer_id'],
                    amount=vet_points,
                    type='earned',
                    description=f'Начислено за заказ #{order_id[:8]}',
                    order_id=order_id
                )
                trans_doc = transaction.model_dump()
                trans_doc['created_at'] = trans_doc['created_at'].isoformat()
                await db.vetpoints_transactions.insert_one(trans_doc)
    
    updated = await db.orders.find_one({'id': order_id}, {'_id': 0})
    return updated

@api_router.get('/reviews')
async def get_reviews(
    product_id: Optional[str] = None,
    approved: bool = True,
    skip: int = 0,
    limit: int = 20
):
    query = {'is_approved': approved}
    if product_id:
        query['product_id'] = product_id
    
    reviews = await db.reviews.find(query, {'_id': 0}).skip(skip).limit(limit).to_list(limit)
    return reviews

@api_router.post('/reviews')
async def create_review(
    review_data: ReviewCreate,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.BUYER:
        raise HTTPException(status_code=403, detail='Only buyers can leave reviews')
    
    existing = await db.reviews.find_one({
        'product_id': review_data.product_id,
        'buyer_id': current_user.id
    }, {'_id': 0})
    
    if existing:
        raise HTTPException(status_code=400, detail='Review already exists')
    
    review = Review(
        product_id=review_data.product_id,
        buyer_id=current_user.id,
        buyer_name=current_user.full_name,
        rating=review_data.rating,
        comment=review_data.comment
    )
    
    review_doc = review.model_dump()
    review_doc['created_at'] = review_doc['created_at'].isoformat()
    
    await db.reviews.insert_one(review_doc)
    return review

@api_router.patch('/reviews/{review_id}/approve')
async def approve_review(
    review_id: str,
    current_user: User = Depends(get_current_admin)
):
    review = await db.reviews.find_one({'id': review_id}, {'_id': 0})
    if not review:
        raise HTTPException(status_code=404, detail='Review not found')
    
    await db.reviews.update_one({'id': review_id}, {'$set': {'is_approved': True}})
    
    approved_reviews = await db.reviews.find({
        'product_id': review['product_id'],
        'is_approved': True
    }, {'_id': 0}).to_list(1000)
    
    if approved_reviews:
        avg_rating = sum(r['rating'] for r in approved_reviews) / len(approved_reviews)
        await db.products.update_one(
            {'id': review['product_id']},
            {
                '$set': {
                    'rating': round(avg_rating, 1),
                    'reviews_count': len(approved_reviews)
                }
            }
        )
    
    updated = await db.reviews.find_one({'id': review_id}, {'_id': 0})
    return updated

@api_router.get('/vetpoints/balance')
async def get_vetpoints_balance(current_user: User = Depends(get_current_user)):
    return {'balance': current_user.vet_points_balance}

@api_router.get('/vetpoints/transactions')
async def get_vetpoints_transactions(
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50
):
    transactions = await db.vetpoints_transactions.find(
        {'user_id': current_user.id},
        {'_id': 0}
    ).sort('created_at', -1).skip(skip).limit(limit).to_list(limit)
    return transactions

@api_router.get('/sellers')
async def get_sellers(verified_only: bool = False):
    query = {'role': 'seller'}
    if verified_only:
        query['is_verified'] = True
    
    sellers = await db.users.find(
        query,
        {'_id': 0, 'password_hash': 0}
    ).to_list(100)
    
    return sellers

@api_router.get('/sellers/{seller_id}')
async def get_seller(seller_id: str):
    seller = await db.users.find_one(
        {'id': seller_id, 'role': 'seller'},
        {'_id': 0, 'password_hash': 0}
    )
    if not seller:
        raise HTTPException(status_code=404, detail='Seller not found')
    
    products_count = await db.products.count_documents({'seller_id': seller_id})
    seller['products_count'] = products_count
    
    return seller

@api_router.get('/admin/users')
async def admin_get_users(
    current_user: User = Depends(get_current_admin),
    skip: int = 0,
    limit: int = 50
):
    users = await db.users.find(
        {},
        {'_id': 0, 'password_hash': 0}
    ).skip(skip).limit(limit).to_list(limit)
    return users

@api_router.patch('/admin/users/{user_id}/verify')
async def admin_verify_user(
    user_id: str,
    current_user: User = Depends(get_current_admin)
):
    await db.users.update_one({'id': user_id}, {'$set': {'is_verified': True}})
    user = await db.users.find_one({'id': user_id}, {'_id': 0, 'password_hash': 0})
    return user

@api_router.get('/admin/stats')
async def admin_get_stats(current_user: User = Depends(get_current_admin)):
    total_users = await db.users.count_documents({})
    total_products = await db.products.count_documents({})
    total_orders = await db.orders.count_documents({})
    pending_reviews = await db.reviews.count_documents({'is_approved': False})
    
    orders = await db.orders.find({}, {'_id': 0, 'total': 1}).to_list(10000)
    total_revenue = sum(o.get('total', 0) for o in orders)
    
    return {
        'total_users': total_users,
        'total_products': total_products,
        'total_orders': total_orders,
        'pending_reviews': pending_reviews,
        'total_revenue': total_revenue
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=['*'],
    allow_headers=['*']
)

@app.on_event('shutdown')
async def shutdown_db_client():
    client.close()
