from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Tenant, UserTenant, UserRole, AppRole
from schemas import UserCreate, UserLogin, Token
from auth import verify_password, get_password_hash, create_access_token
import uuid

router = APIRouter()

@router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password)
    )
    db.add(user)
    db.flush()
    
    # Create tenant
    tenant_name = user_data.tenant_name or f"{user_data.email.split('@')[0]}-workspace"
    tenant_id = f"{tenant_name.lower().replace(' ', '-')}-{str(uuid.uuid4())[:8]}"
    
    tenant = Tenant(id=tenant_id, name=tenant_name)
    db.add(tenant)
    
    # Link user to tenant
    user_tenant = UserTenant(user_id=user.id, tenant_id=tenant.id)
    db.add(user_tenant)
    
    # Assign admin role
    user_role = UserRole(user_id=user.id, tenant_id=tenant.id, role=AppRole.ADMIN)
    db.add(user_role)
    
    db.commit()
    
    # Create access token
    access_token = create_access_token(data={
        "sub": str(user.id),
        "email": user.email,
        "tenant_id": tenant.id,
        "role": AppRole.ADMIN.value
    })
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    # Find user
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Get user's first tenant and role
    user_tenant = db.query(UserTenant).filter(UserTenant.user_id == user.id).first()
    if not user_tenant:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User has no tenant"
        )
    
    user_role = db.query(UserRole).filter(
        UserRole.user_id == user.id,
        UserRole.tenant_id == user_tenant.tenant_id
    ).first()
    
    role = user_role.role.value if user_role else AppRole.USER.value
    
    # Create access token
    access_token = create_access_token(data={
        "sub": str(user.id),
        "email": user.email,
        "tenant_id": user_tenant.tenant_id,
        "role": role
    })
    
    return {"access_token": access_token, "token_type": "bearer"}
